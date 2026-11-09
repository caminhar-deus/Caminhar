import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/auth/customer-auth.js', () => ({
  getAuthenticatedCustomer: jest.fn(),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  getCustomerOrders: jest.fn(),
}));

import handler from '../../../../pages/api/customer/orders.js';
import { getAuthenticatedCustomer } from '../../../../lib/auth/customer-auth.js';
import { getCustomerOrders } from '../../../../lib/domain/orders.js';

describe('API Visitante/Cliente - Meus Pedidos (/api/customer/orders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 401 se visitante não estiver autenticado', async () => {
    getAuthenticatedCustomer.mockReturnValue(null);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar a lista de pedidos do visitante autenticado com sucesso', async () => {
    getAuthenticatedCustomer.mockReturnValue({ customerId: 5, email: 'joao@test.com' });
    getCustomerOrders.mockResolvedValueOnce([
      {
        id: 101,
        product_name: 'Bíblia Ilustrada',
        total_amount: 120,
        order_status: 'paid',
      },
    ]);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].id).toBe(101);
    expect(getCustomerOrders).toHaveBeenCalledWith(5);
  });

  it('deve retornar 500 em caso de falha no banco de dados', async () => {
    getAuthenticatedCustomer.mockReturnValue({ customerId: 5 });
    getCustomerOrders.mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
