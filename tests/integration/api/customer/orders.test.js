import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { filterConsoleError } from '../../../helpers/index.js';

jest.mock('../../../../lib/auth/customer-auth.js', () => ({
  getAuthenticatedCustomer: jest.fn(),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  getCustomerOrders: jest.fn(),
  getCustomerOrderById: jest.fn(),
}));

jest.mock('../../../../lib/payment/reconcile-orders.js', () => ({
  reconcilePendingOrders: jest.fn(async (orders) => ({ orders, syncedCount: 0 })),
}));

import handler from '../../../../pages/api/customer/orders.js';
import { getAuthenticatedCustomer } from '../../../../lib/auth/customer-auth.js';
import { getCustomerOrderById, getCustomerOrders } from '../../../../lib/domain/orders.js';
import { reconcilePendingOrders } from '../../../../lib/payment/reconcile-orders.js';

describe('API Visitante/Cliente - Meus Pedidos (/api/customer/orders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reconcilePendingOrders.mockImplementation(async (orders) => ({ orders, syncedCount: 0 }));
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

    const errSpy = filterConsoleError(['Erro ao consultar compras do visitante']);
    try {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('deve buscar pedido único por ?orderId=20, reconciliar status pendente e respeitar ?sync=0', async () => {
    getAuthenticatedCustomer.mockReturnValue({ customerId: 1, email: 'cliente@test.com' });
    const pendingOrder = {
      id: 20,
      product_name: 'Livro Teste',
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
    };
    const approvedOrder = {
      ...pendingOrder,
      payment_status: 'approved',
      order_status: 'paid',
    };
    getCustomerOrderById.mockResolvedValueOnce(pendingOrder);
    reconcilePendingOrders.mockResolvedValueOnce({
      orders: [approvedOrder],
      syncedCount: 1,
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { orderId: '20' },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getCustomerOrderById).toHaveBeenCalledWith(20, 1);
    expect(reconcilePendingOrders).toHaveBeenCalledWith([pendingOrder], { maxOrders: 1 });
    expect(JSON.parse(res._getData())).toEqual({ order: approvedOrder });

    reconcilePendingOrders.mockClear();
    getCustomerOrderById.mockResolvedValueOnce(pendingOrder);
    const { req: reqNoSync, res: resNoSync } = createMocks({
      method: 'GET',
      query: { orderId: '20', sync: '0' },
    });
    await handler(reqNoSync, resNoSync);

    expect(resNoSync._getStatusCode()).toBe(200);
    expect(reconcilePendingOrders).not.toHaveBeenCalled();
  });

  it('deve retornar 400 para orderId inválido e 404 para pedido inexistente/de outro cliente', async () => {
    getAuthenticatedCustomer.mockReturnValue({ customerId: 1 });

    const { req: badReq, res: badRes } = createMocks({
      method: 'GET',
      query: { orderId: 'abc' },
    });
    await handler(badReq, badRes);
    expect(badRes._getStatusCode()).toBe(400);

    getCustomerOrderById.mockResolvedValueOnce(null);
    const { req: nfReq, res: nfRes } = createMocks({
      method: 'GET',
      query: { orderId: '999' },
    });
    await handler(nfReq, nfRes);
    expect(nfRes._getStatusCode()).toBe(404);
  });

  it('deve retornar 429 ao exceder o rate limit de consultas de pedidos', async () => {
    getAuthenticatedCustomer.mockReturnValue({ customerId: 5 });
    getCustomerOrders.mockResolvedValue([]);
    const clientIp = '203.0.113.150';

    for (let i = 0; i < 60; i++) {
      const { req, res } = createMocks({
        method: 'GET',
        query: { sync: '0' },
        socket: { remoteAddress: clientIp },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    const { req, res } = createMocks({
      method: 'GET',
      query: { sync: '0' },
      socket: { remoteAddress: clientIp },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
  });
});
