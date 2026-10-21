import { logActivity } from '../../lib/domain/audit';
import { getAuthToken, verifyToken } from '../../lib/auth/auth';
import { checkRateLimit, invalidateCache, getOrSetCache } from '../../lib/cache/cache';
import { getPaginatedProducts, getAllProducts, createProduct, updateProduct, deleteProduct } from '../../lib/domain/products.js';
import { updateRecords } from '../../lib/crud/crud.js';
import { paginate } from './helper/pagination.js';
import { getClientIP, INVALID_PAGINATION_MESSAGE, INVALID_PARAMS_MESSAGE } from '../../lib/api/helpers.js';
import { logger } from '../../lib/infra/logger.js';
import { z } from 'zod';

// Ordenações aceitas pelo GET público (spec design-system/pages/home.md §1.3).
// "Posicionados" (positioned) expõe a curadoria manual por `position` feita no
// painel (PLANO_ACAO F4 / ADR-0014) e fica isolado na chave de cache junto com
// os demais valores.
const PUBLIC_SORT_ENUM = ['default', 'positioned', 'oldest', 'price_asc', 'price_desc'];

/**
 * Handler para GET público (sem autenticação)
 */
async function handlePublicGet(req, res) {
  try {
    const { page, limit } = paginate(req.query.page, req.query.limit);

    // Valida o sort com o mesmo rigor dos demais handlers: valor inválido → 400.
    const sortValidation = z.enum(PUBLIC_SORT_ENUM).safeParse(req.query.sort || 'default');
    if (!sortValidation.success) {
      return res.status(400).json({ error: 'Bad Request', message: INVALID_PARAMS_MESSAGE });
    }
    const sort = sortValidation.data;

    // Extrai filtros opcionais da query string
    const filters = {
      search: req.query.search || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
    };

    // Inclui filtros E sort na cache key para evitar resultados incorretos em cache hits
    const cacheKey = `products:public:${page}:${limit}:${sort}:${filters.search}:${filters.minPrice}:${filters.maxPrice}`;

    // Rate limit ANTES do cache — garante proteção mesmo em cache hits
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:public:products', 60, 60000);
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    const result = await getOrSetCache(cacheKey, async () => {
      return await getPaginatedProducts(page, limit, filters, sort);
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'INVALID_PAGINATION_PARAMS') {
      return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
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
      return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
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
  const ip = getClientIP(req);

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
    logger.error('Products', 'Erro ao criar produto:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao criar produto' });
  }
}

/**
 * Schemas da ação customizada de reordenação em massa (Drag & Drop).
 * Posições são 1-based (utils/reorder.js) e precisam ser positivas.
 */
const reorderItemSchema = z.object({
  id: z.number().int('ID do item deve ser um número inteiro').positive('ID do item deve ser positivo'),
  position: z.number().int('Posição deve ser um número inteiro').positive('Posição deve ser positiva'),
});

const reorderSchema = z.object({
  action: z.literal('reorder'),
  items: z.array(reorderItemSchema).min(1, 'Array de itens para reordenar não pode ser vazio'),
});

/**
 * Handler para PUT (atualização) — autenticado
 */
async function handlePut(req, res) {
  const ip = getClientIP(req);

  const isRateLimited = await checkRateLimit(ip, 'api:admin:products', 30, 60000);
  if (isRateLimited) {
    return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
  }

  // Intercepta a ação customizada de reordenação ANTES de validar `id`:
  // o payload de reorder não traz `id` no corpo da requisição.
  if (req.body && req.body.action === 'reorder') {
    const reorderValidation = reorderSchema.safeParse(req.body);
    if (!reorderValidation.success) {
      return res.status(400).json({
        message: 'Dados inválidos para reordenação',
        errors: reorderValidation.error.flatten().fieldErrors,
      });
    }

    const { items } = reorderValidation.data;
    for (const item of items) {
      await updateRecords('products', { position: item.position }, { id: item.id });
    }

    await invalidateCache('products:*');
    await logActivity(
      req.user.username,
      'REORDENAR PRODUTOS',
      'PRODUCT',
      items[0].id,
      `Reordenou ${items.length} produto${items.length > 1 ? 's' : ''}`,
      ip
    );

    return res.status(200).json({ success: true, message: 'Ordem atualizada' });
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
    logger.error('Products', 'Erro ao atualizar produto:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao atualizar produto' });
  }
}

/**
 * Handler para DELETE — autenticado
 */
async function handleDelete(req, res) {
  const ip = getClientIP(req);

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
    logger.error('Products', 'Erro ao remover produto:', error);
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
    logger.error('Products', 'Erro:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor' });
  }
}