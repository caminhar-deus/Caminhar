import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks do banco
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

// Mocks de auditoria e domínio de pedidos
jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  getAdminOrders: jest.fn(),
  updateAdminOrder: jest.fn(),
}));

// Mocks de autenticação
jest.mock('../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/orders.js';
import { query } from '../../../../lib/infra/db.js';
import { checkRateLimit } from '../../../../lib/cache/cache.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { getAdminOrders, updateAdminOrder } from '../../../../lib/domain/orders.js';
import { logActivity } from '../../../../lib/domain/audit.js';

describe('API Admin - Gestão de Vendas / Pedidos (/api/admin/orders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAuthToken.mockReturnValue('valid-admin-token');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin_user', role: 'admin' });

    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Gestão de Vendas'] }] };
      }
      return { rows: [] };
    });
  });

  describe('Autenticação e Permissões', () => {
    it('deve retornar 401 se não houver token ou token for inválido', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);

      getAuthToken.mockReturnValue('invalid-token');
      verifyToken.mockReturnValue(null);
      const { req: req2, res: res2 } = createMocks({ method: 'GET' });
      await handler(req2, res2);
      expect(res2._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão Gestão de Vendas', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'operador', role: 'operador' });
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Posts/Artigos'] }] }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 403 se a verificação de permissão falhar com erro no banco', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'operador', role: 'operador' });
      query.mockRejectedValueOnce(new Error('DB Permission Error'));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve permitir acesso para operador com permissão Gestão de Vendas', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'operador', role: 'operador' });
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Gestão de Vendas'] }] }));

      getAdminOrders.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('deve retornar 429 quando limite de taxa for atingido em mutação (PUT)', async () => {
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { id: 10, order_status: 'paid' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });
  });

  describe('GET - Listagem de pedidos', () => {
    it('deve retornar a lista de pedidos e dados de paginação com sucesso', async () => {
      const mockResult = {
        data: [
          {
            id: 10,
            product_name: 'Bíblia Sagrada',
            total_amount: 150,
            order_status: 'paid',
            customer_name: 'José Silva',
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      getAdminOrders.mockResolvedValueOnce(mockResult);

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          page: '1',
          limit: '10',
          search: 'Bíblia',
          paymentStatus: 'paid',
          orderStatus: 'preparing',
          paymentMethod: 'pix',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(getAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'Bíblia',
          paymentStatus: 'paid',
          orderStatus: 'preparing',
          paymentMethod: 'pix',
        })
      );
    });

    it('deve retornar 400 se os parâmetros de paginação forem inválidos', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '-1' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('PUT - Atualização de pedido', () => {
    it('deve atualizar order_status e tracking_code com sucesso e registrar auditoria', async () => {
      const updatedOrder = {
        id: 10,
        order_status: 'shipped',
        tracking_code: 'BR123456789BR',
      };
      updateAdminOrder.mockResolvedValueOnce(updatedOrder);

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          id: 10,
          order_status: 'shipped',
          tracking_code: 'BR123456789BR',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.order_status).toBe('shipped');
      expect(updateAdminOrder).toHaveBeenCalledWith(10, {
        orderStatus: 'shipped',
        trackingCode: 'BR123456789BR',
      });
      expect(logActivity).toHaveBeenCalledWith(
        'admin_user',
        'ATUALIZAR PEDIDO',
        'ORDER',
        10,
        expect.any(String),
        expect.any(String)
      );
    });

    it('deve retornar 404 se o pedido a atualizar não for encontrado', async () => {
      updateAdminOrder.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { id: 999, order_status: 'delivered' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 400 se o corpo da requisição for inválido', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { id: 'nao-numero', order_status: 'status_inexistente' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('Métodos não permitidos', () => {
    it('deve retornar 405 para POST ou DELETE', async () => {
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);

      const { req: req2, res: res2 } = createMocks({ method: 'DELETE' });
      await handler(req2, res2);
      expect(res2._getStatusCode()).toBe(405);
    });
  });
});
