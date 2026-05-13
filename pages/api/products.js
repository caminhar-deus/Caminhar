import { query } from '../../lib/db';
import { createRecord, updateRecords, deleteRecords } from '../../lib/crud';
import { logActivity } from '../../lib/domain/audit';
import { getAuthToken, verifyToken } from '../../lib/auth';
import { checkRateLimit, invalidateCache, getOrSetCache } from '../../lib/cache';

/**
 * Handler para GET público (sem autenticação)
 */
async function handlePublicGet(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '100', 10);
  const offset = (page - 1) * limit;

  const cacheKey = `products:public:${page}:${limit}`;

  const result = await getOrSetCache(cacheKey, async () => {
    // Rate limiting em endpoint público
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const isRateLimited = await checkRateLimit(ip, 'api:public:products', 60, 60000);
    if (isRateLimited) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

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

    return {
      data: formattedRows,
      pagination: { page, limit, total, totalPages },
    };
  });

  return res.status(200).json(result);
}

/**
 * Handler para GET autenticado (admin)
 */
async function handleAdminGet(req, res) {
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

/**
 * Middleware de autenticação inline para rotas protegidas
 */
function requireAuth(req, res) {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Não autenticado' });
    return null;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token inválido ou expirado' });
    return null;
  }

  req.user = user;
  return user;
}

/**
 * Handler para POST (criação) — autenticado
 */
async function handlePost(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
  if (isRateLimited) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
  }

  const { name, description, price, image_url, category, link } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nome e preço são obrigatórios' });
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
  await logActivity(req.user.username, 'CRIAR PRODUTO', 'PRODUCT', newProduct.id, `Criou o produto: ${name}`, ip);

  return res.status(201).json(newProduct);
}

/**
 * Handler para PUT (atualização) — autenticado
 */
async function handlePut(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
  if (isRateLimited) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
  }

  const updateId = parseInt(req.body.id || req.query.id, 10);
  if (isNaN(updateId)) {
    return res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
  }

  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData.formatted_price;

  // Valida que ao menos um campo foi enviado para atualizar
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nenhum dado enviado para atualização' });
  }

  const updatedProducts = await updateRecords('products', updateData, { id: updateId });

  if (updatedProducts.length === 0) {
    return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
  }

  await invalidateCache('products:*');
  await logActivity(req.user.username, 'ATUALIZAR PRODUTO', 'PRODUCT', updateId, `Atualizou o produto: ${updateData.name || updateId}`, ip);

  return res.status(200).json(updatedProducts[0]);
}

/**
 * Handler para DELETE — autenticado
 */
async function handleDelete(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
  if (isRateLimited) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
  }

  const deleteId = parseInt(req.body.id || req.query.id, 10);
  if (isNaN(deleteId)) {
    return res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
  }

  const deletedProducts = await deleteRecords('products', { id: deleteId });

  if (deletedProducts.length === 0) {
    return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
  }

  await invalidateCache('products:*');
  await logActivity(req.user.username, 'EXCLUIR PRODUTO', 'PRODUCT', deleteId, `Removeu o produto ID: ${deleteId}`, ip);

  return res.status(200).json({ success: true, message: 'Produto removido com sucesso' });
}

/**
 * Handler principal
 */
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const isPublic = req.query.public === 'true';

        if (isPublic) {
          // GET público não exige autenticação
          return handlePublicGet(req, res);
        }

        // GET autenticado (admin)
        if (!requireAuth(req, res)) return;
        return handleAdminGet(req, res);
      }

      case 'POST':
        if (!requireAuth(req, res)) return;
        return handlePost(req, res);

      case 'PUT':
        if (!requireAuth(req, res)) return;
        return handlePut(req, res);

      case 'DELETE':
        if (!requireAuth(req, res)) return;
        return handleDelete(req, res);

      default:
        return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
    }
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    console.error('❌ [API Products] Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor' });
  }
}