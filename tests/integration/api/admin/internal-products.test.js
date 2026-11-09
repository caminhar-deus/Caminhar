import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks do banco
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

// Mocks de auditoria, cache e domínio de produtos
jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../lib/domain/products.js', () => ({
  getAllProducts: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  normalizePrice: jest.fn((p) => (typeof p === 'number' ? p : parseFloat(String(p).replace(',', '.')) || 0)),
}));

jest.mock('../../../../lib/crud/crud.js', () => ({
  updateRecords: jest.fn().mockResolvedValue({ rowCount: 1 }),
}));

// Mocks de autenticação
jest.mock('../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/internal-products.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { checkRateLimit } from '../../../../lib/cache/cache.js';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../../../lib/domain/products.js';
import { updateRecords } from '../../../../lib/crud/crud.js';
import { logActivity } from '../../../../lib/domain/audit.js';

describe('API Admin - Produtos Internos (/api/admin/internal-products)', () => {
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
    it('deve retornar 401 quando não autenticado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 se o usuário não tiver permissão Gestão de Vendas', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'operador', role: 'operador' });
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Posts/Artigos'] }] }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 403 com mensagem de erro quando a verificação de permissão falhar com reason error', async () => {
      verifyToken.mockReturnValue({ userId: 3, username: 'com_falha', role: 'operador' });
      query.mockRejectedValueOnce(new Error('Role query failed'));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('deve retornar 429 quando limite de taxa for atingido em mutação', async () => {
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'POST',
        body: { name: 'Teste' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });
  });

  describe('GET - Listagem de produtos internos', () => {
    it('deve chamar getAllProducts filtrando por modality internal', async () => {
      getAllProducts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Bíblia', modality: 'internal', price: 90 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10', search: 'Bíblia' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data[0].modality).toBe('internal');
      expect(getAllProducts).toHaveBeenCalledWith(1, 10, 'Bíblia', 'internal');
    });

    it('deve retornar 400 para parâmetros de paginação inválidos', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '-1' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('POST - Criação de produto interno', () => {
    it('deve criar produto interno com sucesso e registrar auditoria', async () => {
      createProduct.mockResolvedValueOnce({
        id: 15,
        name: 'Vela Sagrada Família',
        price: 25,
        image_url: 'https://exemplo.com/vela.jpg',
        stock: 50,
        shipping_type: 'fixed',
        shipping_cost: 10,
        modality: 'internal',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Vela Sagrada Família',
          price: 25,
          image_url: 'https://exemplo.com/vela.jpg',
          stock: 50,
          shipping_type: 'fixed',
          shipping_cost: 10,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.id).toBe(15);
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Vela Sagrada Família',
          modality: 'internal',
          link: '',
        })
      );
      expect(logActivity).toHaveBeenCalledWith(
        'admin_user',
        'CRIAR PRODUTO INTERNO',
        'PRODUCT',
        15,
        expect.any(String),
        expect.any(String)
      );
    });

    it('deve retornar 400 se o corpo for inválido', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { name: '' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('PUT - Atualização e Reordenação', () => {
    it('deve atualizar produto interno existente', async () => {
      updateProduct.mockResolvedValueOnce({
        id: 15,
        name: 'Vela Sagrada Família Atualizada',
        price: 30,
        modality: 'internal',
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          id: 15,
          name: 'Vela Sagrada Família Atualizada',
          price: 30,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.name).toBe('Vela Sagrada Família Atualizada');
      expect(updateProduct).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          name: 'Vela Sagrada Família Atualizada',
          modality: 'internal',
        })
      );
    });

    it('deve reordenar itens quando action for reorder', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          action: 'reorder',
          items: [
            { id: 1, position: 2 },
            { id: 2, position: 1 },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledTimes(2);
      expect(logActivity).toHaveBeenCalledWith(
        'admin_user',
        'REORDENAR PRODUTOS INTERNOS',
        'PRODUCT',
        1,
        expect.any(String),
        expect.any(String)
      );
    });

    it('deve retornar 400 se a reordenação tiver items vazios', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          action: 'reorder',
          items: [],
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se id para atualização for inválido ou ausente', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { name: 'Sem ID' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se dados de atualização forem inválidos', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { id: 10, price: 'invalido' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se o produto a atualizar não existir', async () => {
      updateProduct.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { id: 999, name: 'Inexistente' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('DELETE - Remoção de produto interno', () => {
    it('deve remover produto interno com sucesso', async () => {
      deleteProduct.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { id: 15 },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(deleteProduct).toHaveBeenCalledWith(15);
      expect(logActivity).toHaveBeenCalledWith(
        'admin_user',
        'EXCLUIR PRODUTO INTERNO',
        'PRODUCT',
        15,
        expect.any(String),
        expect.any(String)
      );
    });

    it('deve retornar 400 se o id para remoção for inválido', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        body: {},
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se o produto a excluir não existir', async () => {
      deleteProduct.mockResolvedValueOnce(false);

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { id: 999 },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('Métodos não permitidos', () => {
    it('deve retornar 405 para PATCH', async () => {
      const { req, res } = createMocks({ method: 'PATCH' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});
