import { getAuthenticatedCustomer } from '../../../lib/auth/customer-auth.js';
import { getCustomerOrderById, getCustomerOrders } from '../../../lib/domain/orders.js';
import { reconcilePendingOrders } from '../../../lib/payment/reconcile-orders.js';
import { checkRateLimit } from '../../../lib/cache/cache.js';
import { getClientIP } from '../../../lib/api/helpers.js';
import { logger } from '../../../lib/infra/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  const session = getAuthenticatedCustomer(req);
  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Faça login para visualizar suas compras.',
    });
  }

  const ip = getClientIP(req);
  if (await checkRateLimit(ip, 'api:customer:orders', 60, 60000)) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Muitas consultas em sequência. Aguarde um instante e tente novamente.',
    });
  }

  try {
    const shouldSync = req.query?.sync !== '0';

    if (req.query?.orderId !== undefined) {
      const orderId = Number(req.query.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'Bad Request', message: 'Identificador de pedido inválido.' });
      }
      const order = await getCustomerOrderById(orderId, session.customerId);
      if (!order) {
        return res.status(404).json({ error: 'Not Found', message: 'Pedido não encontrado.' });
      }
      if (!shouldSync) {
        return res.status(200).json({ order });
      }
      const { orders: synced } = await reconcilePendingOrders([order], { maxOrders: 1 });
      return res.status(200).json({ order: synced[0] || order });
    }

    const rawOrders = await getCustomerOrders(session.customerId);
    const { orders } = shouldSync
      ? await reconcilePendingOrders(rawOrders)
      : { orders: rawOrders };
    return res.status(200).json({ orders });
  } catch (error) {
    logger.error('CustomerOrders', 'Erro ao consultar compras do visitante:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro ao carregar o histórico de compras.',
    });
  }
}
