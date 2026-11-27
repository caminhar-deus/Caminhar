import { z } from 'zod';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { paginate } from '../../../lib/api/pagination.js';
import { INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';
import { checkRateLimit, invalidateCache } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import {
  expireAbandonedOrders,
  getAdminOrderById,
  getAdminOrders,
  updateAdminOrder,
} from '../../../lib/domain/orders.js';
import {
  fetchMercadoPagoPaymentDetails,
  refundMercadoPagoOrder,
} from '../../../lib/payment/mercadopago.js';
import { reconcilePendingOrders } from '../../../lib/payment/reconcile-orders.js';
import { logger } from '../../../lib/infra/logger.js';

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
  refund_payment: z.boolean().optional(),
});

const expireAbandonedOrdersSchema = z.object({
  action: z.literal('expire_abandoned'),
  dry_run: z.boolean().optional(),
  pix_max_age_minutes: z.coerce.number().int().min(5).max(43200).optional(),
  ticket_max_age_minutes: z.coerce.number().int().min(60).max(43200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
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

  if (req.body?.action === 'expire_abandoned') {
    const expireValidation = expireAbandonedOrdersSchema.safeParse(req.body);
    if (!expireValidation.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Parâmetros inválidos para expiração automática de pedidos.',
        errors: expireValidation.error.flatten().fieldErrors,
      });
    }

    const {
      dry_run: dryRun = false,
      pix_max_age_minutes: pixMaxAgeMinutes,
      ticket_max_age_minutes: ticketMaxAgeMinutes,
      limit,
    } = expireValidation.data;

    const summary = await expireAbandonedOrders({
      dryRun,
      ...(pixMaxAgeMinutes !== undefined ? { pixMaxAgeMinutes } : {}),
      ...(ticketMaxAgeMinutes !== undefined ? { ticketMaxAgeMinutes } : {}),
      ...(limit !== undefined ? { limit } : {}),
      reconcilePayment: process.env.MP_ACCESS_TOKEN ? fetchMercadoPagoPaymentDetails : null,
    });

    if (!summary.dryRun && summary.expiredCount > 0) {
      await invalidateCache('products:*').catch(() => {});
    }

    if (!summary.dryRun && (summary.expiredCount > 0 || summary.reconciledToPaidCount > 0)) {
      await logActivity(
        user.username,
        'EXPIRAR PEDIDOS ABANDONADOS',
        'ORDER',
        null,
        `Expirados: ${summary.expiredCount}; Reconciliados para pago: ${summary.reconciledToPaidCount}`,
        ip
      ).catch(() => {});
    }

    return res.status(200).json({
      action: 'expire_abandoned',
      ...summary,
    });
  }

  const validation = updateOrderSchema.safeParse(req.body || {});
  if (!validation.success || Number.isNaN(validation.data.id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Dados inválidos para atualização do pedido.',
      errors: validation.success ? undefined : validation.error.flatten().fieldErrors,
    });
  }

  const { id, order_status, tracking_code, refund_payment } = validation.data;

  if (refund_payment === true) {
    const existing = await getAdminOrderById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Pedido não encontrado.' });
    }
    if (existing.payment_status === 'refunded') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Este pedido já foi estornado anteriormente.',
      });
    }
    if (existing.payment_status !== 'approved') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Somente pedidos com pagamento aprovado podem ser estornados via Mercado Pago.',
      });
    }
    if (!existing.mp_payment_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message:
          'Pedido sem identificador de transação no Mercado Pago. Realize o estorno manualmente no painel do gateway.',
      });
    }

    let refund;
    try {
      refund = await refundMercadoPagoOrder(existing.mp_payment_id, { orderId: id });
    } catch (err) {
      logger.error('AdminOrders', `Falha ao estornar pedido #${id} no Mercado Pago: ${err.code || err.message}`);
      const status = err.status || err.statusCode || 502;
      return res.status(status).json({
        error: status === 422 ? 'Unprocessable Entity' : status === 503 ? 'Service Unavailable' : 'Bad Gateway',
        message: err.userMessage || 'Não foi possível processar o estorno no Mercado Pago.',
      });
    }

    const updated = await updateAdminOrder(id, {
      orderStatus: 'cancelled',
      trackingCode: tracking_code,
      refundResult: {
        ...refund,
        refundedBy: user.username,
      },
    });

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Pedido não encontrado.' });
    }

    if (updated.order_status === 'cancelled' && updated.stock_restored) {
      await invalidateCache('products:*').catch(() => {});
    }

    await logActivity(
      user.username,
      'ESTORNAR E CANCELAR PEDIDO',
      'ORDER',
      id,
      `Estorno (${refund.refundMode}) e cancelamento do pedido #${id} (MP: ${existing.mp_payment_id})`,
      ip
    );

    return res.status(200).json({
      ...updated,
      refund: {
        mode: refund.refundMode,
        mpOrderStatus: refund.mpOrderStatus,
        refundedAt: refund.refundedAt,
      },
    });
  }

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
