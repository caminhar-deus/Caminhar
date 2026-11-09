import { getAuthenticatedCustomer } from '../../../lib/auth/customer-auth.js';
import { getCustomerOrders } from '../../../lib/domain/orders.js';
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

  try {
    const orders = await getCustomerOrders(session.customerId);
    return res.status(200).json({ orders });
  } catch (error) {
    logger.error('CustomerOrders', 'Erro ao consultar compras do visitante:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro ao carregar o histórico de compras.',
    });
  }
}
