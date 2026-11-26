import { z } from 'zod';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { paginate } from '../../../lib/api/pagination.js';
import { INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';
import { invalidateCache } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  normalizePrice,
} from '../../../lib/domain/products.js';
import { updateRecords } from '../../../lib/crud/crud.js';

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

async function handleGet(req, res) {
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

async function handlePost(req, res) {
  const { user, ip } = req.adminUtils;
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
    user.username,
    'CRIAR PRODUTO INTERNO',
    'PRODUCT',
    newProduct.id,
    `Criou produto interno: ${validation.data.name}`,
    ip
  );

  return res.status(201).json(newProduct);
}

async function handlePut(req, res) {
  const { user, ip } = req.adminUtils;
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
      await updateRecords(
        'products',
        { position: item.position },
        { id: item.id, modality: 'internal' }
      );
    }

    await invalidateCache('products:*');
    await logActivity(
      user.username,
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

  try {
    const updated = await updateProduct(updateId, validation.data, {
      expectedModality: 'internal',
    });

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
    }

    await invalidateCache('products:*');
    await logActivity(
      user.username,
      'ATUALIZAR PRODUTO INTERNO',
      'PRODUCT',
      updateId,
      `Atualizou produto interno: ${validation.data.name || updateId}`,
      ip
    );

    return res.status(200).json(updated);
  } catch (err) {
    if (err.message === 'NO_DATA_TO_UPDATE') {
      return res.status(400).json({ error: 'Bad Request', message: 'Nenhum dado enviado para atualização' });
    }
    throw err;
  }
}

async function handleDelete(req, res) {
  const { user, ip } = req.adminUtils;
  const deleteId = parseInt(req.body?.id || req.query?.id, 10);
  if (Number.isNaN(deleteId)) {
    return res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
  }

  const deleted = await deleteProduct(deleteId, {
    expectedModality: 'internal',
  });
  if (!deleted) {
    return res.status(404).json({ error: 'Not Found', message: 'Produto não encontrado' });
  }

  await invalidateCache('products:*');
  await logActivity(
    user.username,
    'EXCLUIR PRODUTO INTERNO',
    'PRODUCT',
    deleteId,
    `Removeu produto interno ID: ${deleteId}`,
    ip
  );

  return res.status(200).json({ success: true, message: 'Produto interno removido com sucesso' });
}

export default createAdminHandler({
  name: 'InternalProducts',
  permission: SALES_PERMISSION,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
  rateLimit: { max: 30, window: 60000 },
});
