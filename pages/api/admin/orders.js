import { z } from 'zod';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { paginate } from '../../../lib/api/pagination.js';
import { INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';
import { checkRateLimit, invalidateCache } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { getAdminOrders, updateAdminOrder } from '../../../lib/domain/orders.js';
import { reconcilePendingOrders } from '../../../lib/payment/reconcile-orders.js';

const SALES_PERMISSION = 'Gestão de Vendas';
const MAX_SEARCH_LENGTH = 200;

const ORDER_STATUS_VALUES = [
  'awaiting_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

const updateOrderSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((v) => parseInt(v, 10)),
  order_status: z.enum(ORDER_STATUS_VALUES).optional(),
  tracking_code: z.string().trim().max(120, 'Código de rastreio muito longo').optional().or(z.literal('')),
});

async function handleGet(req, res) {
  const { user, ip } = req.adminUtils;

  const isGetRateLimited = await checkRateLimit(ip, 'api:admin:orders:get', 60, 60000);
  if (isGetRateLimited) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas consultas em sequência. Aguarde um instante e tente novamente.',
    });
  }

  try {
    const { page, limit } = paginate(req.query.page, req.query.limit);
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    if (search.length > MAX_SEARCH_LENGTH) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Termo de busca muito longo (máximo 200 caracteres).',
      });
    }

    const paymentStatus = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus : '';
    const orderStatus = typeof req.query.orderStatus === 'string' ? req.query.orderStatus : '';
    const paymentMethod = typeof req.query.paymentMethod === 'string' ? req.query.paymentMethod : '';

    const result = await getAdminOrders({
      page,
      limit,
      search,
      paymentStatus,
      orderStatus,
      paymentMethod,
    });

    const shouldSync = req.query.sync !== '0';
    const explicitSync = req.query.sync === '1';
    const { orders: syncedData, syncedCount } = shouldSync
      ? await reconcilePendingOrders(result.data, { force: explicitSync })
      : { orders: result.data, syncedCount: 0 };

    if (explicitSync && syncedCount > 0) {
      try {
        await logActivity(
          user.username,
          'SINCRONIZAR PEDIDOS MP',
          'ORDER',
          null,
          `Sincronizou ${syncedCount} pedido(s) pendente(s) com o Mercado Pago`,
          ip
        );
      } catch {
        // Falha no log de auditoria não deve impedir retorno dos pedidos sincronizados
      }
    }

    return res.status(200).json({
      ...result,
      data: syncedData,
      ...(explicitSync ? { syncedCount } : {}),
    });
  } catch (err) {
    if (err.message === 'INVALID_PAGINATION_PARAMS') {
      return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
    }
    throw err;
  }
}

async function handlePut(req, res) {
  const { user, ip } = req.adminUtils;

  const validation = updateOrderSchema.safeParse(req.body || {});
  if (!validation.success || Number.isNaN(validation.data.id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Dados inválidos para atualização do pedido.',
      errors: validation.success ? undefined : validation.error.flatten().fieldErrors,
    });
  }

  const { id, order_status, tracking_code } = validation.data;
  let updated;
  try {
    updated = await updateAdminOrder(id, {
      orderStatus: order_status,
      trackingCode: tracking_code,
    });
  } catch (err) {
    if (err.message === 'ORDER_CANCELLED_CANNOT_REOPEN') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Pedidos cancelados com estoque devolvido não podem ser reabertos.',
      });
    }
    throw err;
  }

  if (!updated) {
    return res.status(404).json({ error: 'Not Found', message: 'Pedido não encontrado.' });
  }

  if (updated.order_status === 'cancelled' && updated.stock_restored) {
    await invalidateCache('products:*').catch(() => {});
  }

  await logActivity(
    user.username,
    'ATUALIZAR PEDIDO',
    'ORDER',
    id,
    `Atualizou pedido #${id} (status: ${updated.order_status}, rastreio: ${updated.tracking_code || '-'})`,
    ip
  );

  return res.status(200).json(updated);
}

export default createAdminHandler({
  name: 'Order',
  permission: SALES_PERMISSION,
  allowedMethods: ['GET', 'PUT'],
  handlers: {
    GET: handleGet,
    PUT: handlePut,
  },
  rateLimit: { max: 30, window: 60000 },
});
