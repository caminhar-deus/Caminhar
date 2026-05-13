import { logActivity } from '../../lib/domain/audit';
import { getAuthToken, verifyToken } from '../../lib/auth';
import { checkRateLimit, invalidateCache, getOrSetCache } from '../../lib/cache';
import { getPaginatedProducts, getAllProducts, createProduct, updateProduct, deleteProduct } from '../../lib/domain/products.js';
import { paginate } from './helper/pagination.js';

/**
 * Handler para GET público (sem autenticação)
 */
async function handlePublicGet(req, res) {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit);

    const cacheKey = `products:public:${page}:${limit}`;

    const result = await getOrSetCache(cacheKey, async () => {
      // Rate limiting em endpoint público
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const isRateLimited = await checkRateLimit(ip, 'api:public:products', 60, 60000);
      if (isRateLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      return await getPaginatedProducts(page, limit);
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    if (error.message === 'INVALID_PAGINATION_PARAMS') {
      return res.status(400).json({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
    }
    throw error;
  }
}

/**
 * Handler para GET autenticado (admin)
 */
async function handleAdminGet(req, res) {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit);
    const result = await getAllProducts(page, limit);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'INVALID_PAGINATION_PARAMS') {
      return res.status(400).json({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
    }
    throw error;
  }
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

  try {
    const newProduct = await createProduct({ name, description, price, image_url, category, link });

    await invalidateCache('products:*');
    await logActivity(req.user.username, 'CRIAR PRODUTO', 'PRODUCT', newProduct.id, `Criou o produto: ${name}`, ip);

    return res.status(201).json(newProduct);
  } catch (error) {
    console.error('❌ [API Products] Error creating product:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao criar produto' });
  }
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

  try {
    const updatedProduct = await updateProduct(updateId, req.body);

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
    }

    await invalidateCache('products:*');
    await logActivity(req.user.username, 'ATUALIZAR PRODUTO', 'PRODUCT', updateId, `Atualizou o produto: ${req.body.name || updateId}`, ip);

    return res.status(200).json(updatedProduct);
  } catch (error) {
    if (error.message === 'NO_DATA_TO_UPDATE') {
      return res.status(400).json({ error: 'Bad Request', message: 'Nenhum dado enviado para atualização' });
    }
    console.error('❌ [API Products] Error updating product:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao atualizar produto' });
  }
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

  try {
    const deletedProduct = await deleteProduct(deleteId);

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
    }

    await invalidateCache('products:*');
    await logActivity(req.user.username, 'EXCLUIR PRODUTO', 'PRODUCT', deleteId, `Removeu o produto ID: ${deleteId}`, ip);

    return res.status(200).json({ success: true, message: 'Produto removido com sucesso' });
  } catch (error) {
    console.error('❌ [API Products] Error deleting product:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao remover produto' });
  }
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