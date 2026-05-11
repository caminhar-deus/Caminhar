import { query } from '../../lib/db';
import { createRecord, updateRecords, deleteRecords } from '../../lib/crud';
import { logActivity } from '../../lib/domain/audit';
import { getAuthToken, verifyToken } from '../../lib/auth';
import { checkRateLimit, invalidateCache } from '../../lib/cache';

export default async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  try {
    switch (method) {
      case 'GET': {
        const isPublic = req.query.public === 'true';

        // GET público não exige autenticação
        if (!isPublic) {
          const token = getAuthToken(req);
          if (!token) {
            return res.status(401).json({ error: 'Não autenticado' });
          }

          const user = verifyToken(token);
          if (!user) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
          }
        }

        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '100', 10);
        const offset = (page - 1) * limit;

        const countResult = await query('SELECT COUNT(*) FROM products', []);
        const total = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(total / limit);

        const { rows } = await query(
          'SELECT * FROM products ORDER BY position ASC, id ASC LIMIT $1 OFFSET $2',
          [limit, offset]
        );

        // Formata moeda para Real (R$) antes de enviar para o frontend
        const formattedRows = rows.map(row => ({
          ...row,
          formatted_price: row.price
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.price))
            : 'R$ 0,00',
        }));

        return res.status(200).json({
          data: formattedRows,
          pagination: { page, limit, total, totalPages },
        });
      }

      case 'POST': {
        // Autenticação obrigatória para mutações
        const token = getAuthToken(req);
        if (!token) {
          return res.status(401).json({ error: 'Não autenticado' });
        }

        const user = verifyToken(token);
        if (!user) {
          return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
        if (isRateLimited) {
          return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
        }

        const { name, description, price, image_url, category, link } = req.body;

        if (!name || !price) {
          return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
        }

        // Define posição como último item
        const maxPosResult = await query('SELECT COALESCE(MAX(position), 0) as max_pos FROM products');
        const nextPosition = maxPosResult.rows[0]?.max_pos + 1 || 1;

        const newProduct = await createRecord('products', {
          name,
          description: description || '',
          price,
          image_url: image_url || '',
          category: category || 'geral',
          link: link || '',
          position: nextPosition,
        });

        await invalidateCache('products:*');
        await logActivity(user.username, 'CRIAR PRODUTO', 'PRODUCT', newProduct.id, `Criou o produto: ${name}`, ip);

        return res.status(201).json(newProduct);
      }

      case 'PUT': {
        // Autenticação obrigatória para mutações
        const token = getAuthToken(req);
        if (!token) {
          return res.status(401).json({ error: 'Não autenticado' });
        }

        const user = verifyToken(token);
        if (!user) {
          return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
        if (isRateLimited) {
          return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
        }

        const updateId = parseInt(req.body.id || req.query.id, 10);
        if (isNaN(updateId)) {
          return res.status(400).json({ error: 'ID inválido' });
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.formatted_price;

        // Valida que ao menos um campo foi enviado para atualizar
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: 'Nenhum dado enviado para atualização' });
        }

        const updatedProducts = await updateRecords('products', updateData, { id: updateId });

        if (updatedProducts.length === 0) {
          return res.status(404).json({ error: 'Produto não encontrado' });
        }

        await invalidateCache('products:*');
        await logActivity(user.username, 'ATUALIZAR PRODUTO', 'PRODUCT', updateId, `Atualizou o produto: ${updateData.name || updateId}`, ip);

        return res.status(200).json(updatedProducts[0]);
      }

      case 'DELETE': {
        // Autenticação obrigatória para mutações
        const token = getAuthToken(req);
        if (!token) {
          return res.status(401).json({ error: 'Não autenticado' });
        }

        const user = verifyToken(token);
        if (!user) {
          return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
        if (isRateLimited) {
          return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
        }

        const deleteId = parseInt(req.body.id || req.query.id, 10);
        if (isNaN(deleteId)) {
          return res.status(400).json({ error: 'ID inválido' });
        }

        const deletedProducts = await deleteRecords('products', { id: deleteId });

        if (deletedProducts.length === 0) {
          return res.status(404).json({ error: 'Produto não encontrado' });
        }

        await invalidateCache('products:*');
        await logActivity(user.username, 'EXCLUIR PRODUTO', 'PRODUCT', deleteId, `Removeu o produto ID: ${deleteId}`, ip);

        return res.status(200).json({ success: true, message: 'Produto removido com sucesso' });
      }

      default: {
        return res.status(405).json({ error: 'Método não permitido' });
      }
    }
  } catch (error) {
    console.error('❌ [API Products] Error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}