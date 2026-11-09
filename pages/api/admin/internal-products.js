import { z } from 'zod';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';
import { checkRolePermission } from '../../../lib/api/permissions.js';
import { paginate } from '../../../lib/api/pagination.js';
import { getClientIP, INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';
import { checkRateLimit, invalidateCache } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  normalizePrice,
} from '../../../lib/domain/products.js';
import { updateRecords } from '../../../lib/crud/crud.js';
import { logger } from '../../../lib/infra/logger.js';

const SALES_PERMISSION = 'Gestão de Vendas';

const internalProductFieldSchemas = {
  name: z.string().trim().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional(),
  price: z
    .union([z.string(), z.number()])
    .transform((value) => normalizePrice(value))
    .refine((value) => value !== null, 'Valor inválido — use um preço como 89,90')
    .refine((value) => value !== 0, 'Valor deve ser maior que zero'),
  image_url: z.string().trim().min(1, 'Ao menos uma imagem é obrigatória'),
  category: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  stock: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => (value === undefined || value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0))),
  shipping_type: z.enum(['free', 'fixed', 'calculated']).optional().default('free'),
  shipping_cost: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === '') return 0;
      return normalizePrice(value) ?? 0;
    }),
  published: z.boolean().optional(),
};

const internalProductCreateSchema = z.object(internalProductFieldSchemas);
const internalProductUpdateSchema = z.object(internalProductFieldSchemas).partial();

const reorderItemSchema = z.object({
  id: z.number().int('ID do item deve ser um número inteiro').positive('ID do item deve ser positivo'),
  position: z.number().int('Posição deve ser um número inteiro').positive('Posição deve ser positiva'),
});

const reorderSchema = z.object({
  action: z.literal('reorder'),
  items: z.array(reorderItemSchema).min(1, 'Array de itens para reordenar não pode ser vazio'),
});

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

async function requireSalesPermission(req, res) {
  const permissionCheck = await checkRolePermission(req.user?.role, SALES_PERMISSION);
  if (permissionCheck.allowed) {
    return true;
  }
  if (permissionCheck.reason === 'error') {
    logger.error('InternalProducts', 'Falha ao verificar permissão de Gestão de Vendas:', permissionCheck.error);
    res.status(403).json({
      error: 'Acesso negado',
      message: 'Acesso negado. Não foi possível verificar permissões.',
    });
    return false;
  }
  res.status(403).json({
    error: 'Acesso negado',
    message: `Acesso negado. Requer permissão: ${SALES_PERMISSION}.`,
  });
  return false;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (!(await requireSalesPermission(req, res))) return;

  try {
    if (req.method === 'GET') {
      try {
        const { page, limit } = paginate(req.query.page, req.query.limit);
        const search = typeof req.query.search === 'string' ? req.query.search : '';
        const result = await getAllProducts(page, limit, search, 'internal');
        return res.status(200).json(result);
      } catch (err) {
        if (err.message === 'INVALID_PAGINATION_PARAMS') {
          return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
        }
        throw err;
      }
    }

    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:admin:internal-products', 30, 60000);
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas requisições. Tente novamente mais tarde.',
      });
    }

    if (req.method === 'POST') {
      const validation = internalProductCreateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Dados inválidos para o produto interno',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const newProduct = await createProduct({
        ...validation.data,
        modality: 'internal',
        link: '',
      });

      await invalidateCache('products:*');
      await logActivity(
        req.user.username,
        'CRIAR PRODUTO INTERNO',
        'PRODUCT',
        newProduct.id,
        `Criou produto interno: ${validation.data.name}`,
        ip
      );

      return res.status(201).json(newProduct);
    }

    if (req.method === 'PUT') {
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
          'REORDENAR PRODUTOS INTERNOS',
          'PRODUCT',
          items[0].id,
          `Reordenou ${items.length} produto${items.length > 1 ? 's' : ''} interno${items.length > 1 ? 's' : ''}`,
          ip
        );

        return res.status(200).json({ success: true, message: 'Ordem atualizada' });
      }

      const updateId = parseInt(req.body?.id || req.query?.id, 10);
      if (Number.isNaN(updateId)) {
        return res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
      }

      const validation = internalProductUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Dados inválidos para o produto interno',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const updated = await updateProduct(updateId, {
        ...validation.data,
        modality: 'internal',
      });

      if (!updated) {
        return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
      }

      await invalidateCache('products:*');
      await logActivity(
        req.user.username,
        'ATUALIZAR PRODUTO INTERNO',
        'PRODUCT',
        updateId,
        `Atualizou produto interno: ${validation.data.name || updateId}`,
        ip
      );

      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const deleteId = parseInt(req.body?.id || req.query?.id, 10);
      if (Number.isNaN(deleteId)) {
        return res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
      }

      const deleted = await deleteProduct(deleteId);
      if (!deleted) {
        return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
      }

      await invalidateCache('products:*');
      await logActivity(
        req.user.username,
        'EXCLUIR PRODUTO INTERNO',
        'PRODUCT',
        deleteId,
        `Removeu produto interno ID: ${deleteId}`,
        ip
      );

      return res.status(200).json({ success: true, message: 'Produto interno removido com sucesso' });
    }

    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  } catch (error) {
    logger.error('InternalProducts', 'Erro na rota de produtos internos:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor' });
  }
}
