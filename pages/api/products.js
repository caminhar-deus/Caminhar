import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../lib/db';
import { getAuthToken, verifyToken } from '../../lib/auth';
import { invalidateCache, checkRateLimit } from '../../lib/cache';

export default async function handler(req, res) {
  const { method } = req;

  console.log(`\n📦 [API Products] Nova requisição recebida: ${method}`);

  let user = null;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  // Protege as rotas de modificação (Criação, Edição e Exclusão)
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    // --- 🛡️ RATE LIMITING DISTRIBUÍDO COM FALLBACK ---
    const isRateLimited = await checkRateLimit(ip, 'api:products', 30, 60000); // 30 requisições / minuto

    if (isRateLimited) {
      console.warn(`🚨 [Rate Limit] IP ${ip} bloqueado por excesso de requisições de alteração.`);
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto e tente novamente.' });
    }

    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    
    user = verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    switch (method) {
      case 'GET':
        // Garante que o navegador/Next.js não faça cache da resposta
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '100', 10);
        const search = req.query.search || '';
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];
        const countParams = [];

        if (search) {
          conditions.push(`LOWER(title) LIKE $${params.length + 1}`);
          const searchPattern = `%${search.toLowerCase()}%`;
          params.push(searchPattern);
          countParams.push(searchPattern);
        }
        
        // SQL seguro para converter "R$ 89,90" em "89.90" ignorando strings inválidas
        const priceColumn = `REPLACE(REPLACE(REPLACE(LOWER(price), 'r$', ''), ' ', ''), ',', '.')`;
        const isNumericSQL = `${priceColumn} ~ '^\\d+(\\.\\d+)?$'`;

        if (!isNaN(minPrice)) {
          conditions.push(`(${isNumericSQL} AND CAST(${priceColumn} AS NUMERIC) >= $${params.length + 1})`);
          params.push(minPrice);
          countParams.push(minPrice);
        }
        if (!isNaN(maxPrice)) {
          conditions.push(`(${isNumericSQL} AND CAST(${priceColumn} AS NUMERIC) <= $${params.length + 1})`);
          params.push(maxPrice);
          countParams.push(maxPrice);
        }
        
        // Oculta rascunhos para visitantes públicos ou quando a requisição é explicitamente da vitrine (frontend)
        let isAdmin = false;
        try {
          const token = getAuthToken(req);
          if (token && verifyToken(token)) isAdmin = true;
        } catch (e) {}
        
        const isPublicRequest = req.query.public === 'true';

        if (!isAdmin || isPublicRequest) {
          conditions.push('published = true');
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        params.push(limit, offset);
        const limitIdx = params.length - 1;
        const offsetIdx = params.length;

        const countRes = await query(`SELECT COUNT(*) FROM products ${whereClause}`, countParams);
        const total = parseInt(countRes?.rows[0]?.count || '0', 10);
        const totalPages = Math.ceil(total / limit) || 1;

        const dataRes = await query(`SELECT * FROM products ${whereClause} ORDER BY position ASC, id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, params);

        console.log(`📦 [API Products] GET - Retornando ${dataRes?.rows?.length || 0} produtos (Total filtrado: ${total}).`);

        return res.status(200).json({
          data: dataRes?.rows || [],
          pagination: { page, limit, total, totalPages }
        });

      case 'POST':
        // Remove campos gerados automaticamente pelo DB para não dar erro no INSERT
        const { id: newId, created_at: newCreated, updated_at: newUpdated, ...newData } = req.body;
        
        // Formatação automática de moeda (R$)
        if (newData.price && !newData.price.trim().toUpperCase().startsWith('R$')) {
          newData.price = `R$ ${newData.price.trim()}`;
        }
        
        console.log(`📦 [API Products] POST - Cadastrando novo produto:`, newData.title);
        
        const newProduct = await createRecord('products', newData);
        
        if (user) await logActivity(user.username, 'CRIAR PRODUTO', 'PRODUCT', newProduct.id, `Criou o produto: ${newData.title}`, ip);
        
        // Limpa o cache global de produtos no Redis
        await invalidateCache('products:public:all');
        
        return res.status(201).json(newProduct);

      case 'PUT':
        // Intercepta ação customizada de reordenação em massa (Drag & Drop)
        if (req.body.action === 'reorder') {
          const { items } = req.body;
          for (const item of items) {
            await updateRecords('products', { position: item.position }, { id: item.id });
          }
          await invalidateCache('products:public:all');
          console.log(`📦 [API Products] PUT - Reordenação de ${items.length} produtos concluída.`);
          return res.status(200).json({ success: true, message: 'Ordem atualizada' });
        }

        // Suporte para edição (AdminCrudBase passa o ID no body ou url, ajustamos pela flexibilidade)
        const updateId = req.body.id || parseInt(req.query.id);
        
        // Retira a primary key do update e ajusta a data de atualização
        const { id: upId, created_at: upCreated, updated_at: upUpdated, ...updateData } = req.body;
        
        // Formatação automática de moeda (R$)
        if (updateData.price && !updateData.price.trim().toUpperCase().startsWith('R$')) {
          updateData.price = `R$ ${updateData.price.trim()}`;
        }
        
        updateData.updated_at = new Date().toISOString();

        console.log(`📦 [API Products] PUT - Atualizando produto ID ${updateId}:`, updateData.title);

        const updatedProducts = await updateRecords('products', updateData, { id: updateId });
        
        if (user) await logActivity(user.username, 'ATUALIZAR PRODUTO', 'PRODUCT', updateId, `Atualizou o produto: ${updateData.title || updateId}`, ip);
        
        // Limpa o cache global de produtos no Redis
        await invalidateCache('products:public:all');
        
        return res.status(200).json(updatedProducts[0] || {});

      case 'DELETE':
        // Deleta um produto
        const deleteId = req.body.id || parseInt(req.query.id);
        console.log(`📦 [API Products] DELETE - Removendo produto ID ${deleteId}`);
        
        const productQueryToDel = await query('SELECT title FROM products WHERE id = $1', [deleteId]);
        const titleProduct = productQueryToDel.rows[0]?.title || deleteId;

        await deleteRecords('products', { id: deleteId });
        
        if (user) await logActivity(user.username, 'EXCLUIR PRODUTO', 'PRODUCT', deleteId, `Removeu o produto: ${titleProduct}`, ip);
        
        // Limpa o cache global de produtos no Redis
        await invalidateCache('products:public:all');
        
        return res.status(200).json({ success: true, message: 'Produto removido com sucesso' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ [API Products] Error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor de produtos' });
  }
}