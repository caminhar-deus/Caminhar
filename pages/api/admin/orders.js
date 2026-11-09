import { z } from 'zod';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';
import { checkRolePermission } from '../../../lib/api/permissions.js';
import { paginate } from '../../../lib/api/pagination.js';
import { getClientIP, INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';
import { checkRateLimit } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { getAdminOrders, updateAdminOrder } from '../../../lib/domain/orders.js';
import { logger } from '../../../lib/infra/logger.js';

const SALES_PERMISSION = 'Gestão de Vendas';

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
    logger.error('AdminOrders', 'Falha ao verificar permissão de Gestão de Vendas:', permissionCheck.error);
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
        return res.status(200).json(result);
      } catch (err) {
        if (err.message === 'INVALID_PAGINATION_PARAMS') {
          return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
        }
        throw err;
      }
    }

    if (req.method === 'PUT') {
      const ip = getClientIP(req);
      const isRateLimited = await checkRateLimit(ip, 'api:admin:orders', 30, 60000);
      if (isRateLimited) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Muitas requisições. Tente novamente mais tarde.',
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

      const { id, order_status, tracking_code } = validation.data;
      const updated = await updateAdminOrder(id, {
        orderStatus: order_status,
        trackingCode: tracking_code,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Not Found', message: 'Pedido não encontrado.' });
      }

      await logActivity(
        req.user.username,
        'ATUALIZAR PEDIDO',
        'ORDER',
        id,
        `Atualizou pedido #${id} (status: ${updated.order_status}, rastreio: ${updated.tracking_code || '-'})`,
        ip
      );

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  } catch (error) {
    logger.error('AdminOrders', 'Erro na rota de gestão de pedidos:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor' });
  }
}
