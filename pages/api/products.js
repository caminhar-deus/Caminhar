import { logActivity } from '../../lib/domain/audit';
import { getAuthToken, verifyToken } from '../../lib/auth/auth';
import { checkRateLimit, invalidateCache, getOrSetCache } from '../../lib/cache/cache';
import { getPaginatedProducts, getAllProducts, createProduct, updateProduct, deleteProduct, normalizePrice, getProductCategories } from '../../lib/domain/products.js';
import { updateRecords } from '../../lib/crud/crud.js';
import { paginate } from '../../lib/api/pagination.js';
import { getClientIP, INVALID_PAGINATION_MESSAGE, INVALID_PARAMS_MESSAGE } from '../../lib/api/helpers.js';
import { checkRolePermission } from '../../lib/api/permissions.js';
import { logger } from '../../lib/infra/logger.js';
import { z } from 'zod';

// Ordenações aceitas pelo GET público (spec design-system/pages/home.md §1.3).
// "Posicionados" (positioned) expõe a curadoria manual por `position` feita no
// painel (PLANO_ACAO F4 / ADR-0014) e fica isolado na chave de cache junto com
// os demais valores.
const PUBLIC_SORT_ENUM = ['default', 'positioned', 'oldest', 'price_asc', 'price_desc'];

/**
 * Schemas de validação de produto (paridade com o Zod do cliente em
 * components/Admin/AdminProducts.js). O price aceita os formatos que o
 * formulário e o "Puxar Dados" produzem ("R$ 89,90", "89,90", "89.90")
 * e é normalizado para número pelo domínio.
 */
const productFieldSchemas = {
  name: z.string().trim().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()])
    .transform((value) => normalizePrice(value))
    .refine((value) => value !== null, 'Valor inválido — use um preço como 89,90'),
  image_url: z.string().trim().min(1, 'Ao menos uma imagem é obrigatória'),
  category: z.string().trim().min(1).optional(),
  link: z.string().url('URL inválida').optional().or(z.literal('')),
  published: z.boolean().optional(),
};

const productCreateSchema = z.object(productFieldSchemas);
const productUpdateSchema = z.object(productFieldSchemas).partial();

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
      category: req.query.category || '',
    };

    // Inclui filtros E sort na cache key para evitar resultados incorretos em cache hits
    const cacheKey = `products:public:${page}:${limit}:${sort}:${filters.search}:${filters.minPrice}:${filters.maxPrice}:${filters.category}`;

    // Rate limit ANTES do cache — garante proteção mesmo em cache hits
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:public:products', 60, 60000);
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    const result = await getOrSetCache(cacheKey, async () => {
      const [products, categories] = await Promise.all([
        getPaginatedProducts(page, limit, filters, sort),
        getProductCategories(),
      ]);
      // Facet de categorias para o filtro da vitrine (ProductList)
      return { ...products, categories };
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
 * Permissão exigida em TODA operação de painel de produtos (GET sem
 * `?public=true`, POST, PUT e DELETE). O GET público (`?public=true`) NÃO
 * passa por esta guarda — é o que o site público consome.
 */
const PRODUCT_PERMISSION = 'Gestão de Produtos';

/**
 * Guarda de permissão — roda DEPOIS de `requireAuth` (que responde 401 sem
 * token ou com token inválido). Responde 403 quando o token é válido mas o
 * cargo não tem a permissão (ou quando a checagem falha — fail-closed, com a
 * mesma redação das rotas `admin/`). O cargo `admin` passa por desenho
 * (bypass herdado do helper — ADR-0010).
 *
 * @returns {Promise<boolean>} true se permitido; senão respondeu 403 e devolve false.
 */
async function requirePermission(req, res) {
  const permissionCheck = await checkRolePermission(req.user?.role, PRODUCT_PERMISSION);

  if (permissionCheck.allowed) {
    return true;
  }

  // Falha de LEITURA do cargo: nega (fail-closed) com telemetria própria.
  if (permissionCheck.reason === 'error') {
    logger.error(
      'Products',
      `Falha ao verificar permissões (fail-closed; role "${req.user?.role}"; cargo não pôde ser lido):`,
      permissionCheck.error,
    );
    res.status(403).json({
      error: 'Acesso negado',
      message: 'Acesso negado. Não foi possível verificar permissões.',
    });
    return false;
  }

  // Usuário autenticado sem a permissão exigida.
  res.status(403).json({
    error: 'Acesso negado',
    message: `Acesso negado. Requer permissão: ${PRODUCT_PERMISSION}.`,
  });
  return false;
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

  const validation = productCreateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Dados inválidos para o produto',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  try {
    const newProduct = await createProduct(validation.data);

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

  // Validação com paridade ao cliente; `id`/`action` são descartados pelo
  // schema (só campos de produto seguem para o domínio).
  const validation = productUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Dados inválidos para o produto',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  try {
    const updatedProduct = await updateProduct(updateId, validation.data);

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
    }

    await invalidateCache('products:*');
    await logActivity(req.user.username, 'ATUALIZAR PRODUTO', 'PRODUCT', updateId, `Atualizou o produto: ${validation.data.name || updateId}`, ip);

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
          // GET público não exige autenticação nem permissão
          return handlePublicGet(req, res);
        }

        // GET do painel (inclui rascunhos) — exige permissão
        if (!requireAuth(req, res)) return;
        if (!(await requirePermission(req, res))) return;
        return handleAdminGet(req, res);
      }

      case 'POST':
        if (!requireAuth(req, res)) return;
        if (!(await requirePermission(req, res))) return;
        return handlePost(req, res);

      case 'PUT':
        if (!requireAuth(req, res)) return;
        if (!(await requirePermission(req, res))) return;
        return handlePut(req, res);

      case 'DELETE':
        if (!requireAuth(req, res)) return;
        if (!(await requirePermission(req, res))) return;
        return handleDelete(req, res);

      default:
        return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
    }
  } catch (error) {
    logger.error('Products', 'Erro:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor' });
  }
}