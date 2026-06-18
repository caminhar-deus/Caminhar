import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { userFactory } from '../../factories';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/products.js', () => ({
  getPaginatedProducts: jest.fn(),
  getAllProducts: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

jest.mock('../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn(),
  invalidateCache: jest.fn(),
  getOrSetCache: jest.fn(async (key, fetchFunction) => await fetchFunction()),
}));

jest.mock('../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../lib/logger.js', () => ({
  logger: { error: jest.fn() },
}));

import handler from '../../../pages/api/products.js';
import { getPaginatedProducts, getAllProducts, createProduct, updateProduct, deleteProduct } from '../../../lib/domain/products.js';
import { getAuthToken, verifyToken } from '../../../lib/auth.js';
import { checkRateLimit, invalidateCache } from '../../../lib/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';

describe('API Pública/Admin - Produtos (/api/products)', () => {
  beforeEach(() => {
    userFactory.resetId();
    checkRateLimit.mockResolvedValue(false);
  });

  describe('GET - Público (sem autenticação)', () => {
    it('deve listar produtos públicos com paginação e cache', async () => {
      getPaginatedProducts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Tênis', formatted_price: 'R$ 100,00' }],
        pagination: { page: 1, limit: 10, total: 1 }
      });

      const { req, res } = createMocks({ method: 'GET', query: { public: 'true' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: '', minPrice: '', maxPrice: '' });
    });
  });

  describe('GET - Admin (autenticado)', () => {
    it('deve listar todos os produtos (incluindo rascunhos) se for um administrador logado', async () => {
      const adminUser = userFactory({ role: 'admin' });
      getAuthToken.mockReturnValue('admin-token');
      verifyToken.mockReturnValue({ userId: adminUser.id, role: adminUser.role });
      getAllProducts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Tênis', published: false }],
        pagination: { page: 1, limit: 10, total: 1 }
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getAllProducts).toHaveBeenCalledWith(1, 10);
    });

    it('deve retornar 401 no GET admin se não enviar token', async () => {
      getAuthToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Segurança — Rate Limit e Autenticação', () => {
    it('deve retornar 429 em mutações (POST) se o limite de taxa for atingido', async () => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
      checkRateLimit.mockResolvedValueOnce(true);
      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve retornar 401 em mutações se não enviar token', async () => {
      getAuthToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'PUT', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 em mutações se o token for inválido', async () => {
      getAuthToken.mockReturnValueOnce('token-malicioso');
      verifyToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('POST - Criação (Autenticada)', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
    });

    it('deve criar o produto e registrar log', async () => {
      createProduct.mockResolvedValueOnce({ id: 10, name: 'Camisa', price: '89.90' });
      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Camisa', price: '89.90' }));
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR PRODUTO', 'PRODUCT', 10, expect.any(String), expect.any(String));
    });

    it('deve retornar 400 se nome e preço estiverem ausentes', async () => {
      const { req, res } = createMocks({ method: 'POST', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('PUT - Atualização (Autenticada)', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
    });

    it('deve atualizar dados do produto', async () => {
      updateProduct.mockResolvedValueOnce([{ id: 1, name: 'Meia' }]);
      const { req, res } = createMocks({ method: 'PUT', body: { id: 1, name: 'Meia', price: '20,00' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateProduct).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Meia' }));
      expect(invalidateCache).toHaveBeenCalledWith('products:*');
    });

    it('deve retornar 404 se o produto não for encontrado', async () => {
      updateProduct.mockResolvedValueOnce(null);
      const { req, res } = createMocks({ method: 'PUT', body: { id: 999 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('DELETE - Exclusão (Autenticada)', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
    });

    it('deve excluir o produto e registrar log de auditoria', async () => {
      deleteProduct.mockResolvedValueOnce({ id: 1, name: 'Produto Deletado' });
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(deleteProduct).toHaveBeenCalledWith(1);
      expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR PRODUTO', 'PRODUCT', 1, expect.any(String), expect.any(String));
    });

    it('deve retornar 404 se o produto não for encontrado', async () => {
      deleteProduct.mockResolvedValueOnce(null);
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 999 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('Casos de Borda', () => {
    it('deve bloquear métodos HTTP não permitidos (405)', async () => {
      const { req, res } = createMocks({ method: 'PATCH' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('deve lidar com fallbacks no GET quando o banco retorna vazio e passar filtros corretamente', async () => {
      getPaginatedProducts.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0 }
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', search: 'teste', minPrice: '10', maxPrice: '100' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: 'teste', minPrice: '10', maxPrice: '100' });
    });

    it('deve tratar a falta de token (isAdmin = false) de forma silenciosa no GET', async () => {
      getAuthToken.mockReturnValueOnce(null);
      getPaginatedProducts.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0 }
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', search: 'teste' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: 'teste', minPrice: '', maxPrice: '' });
    });
  });
});