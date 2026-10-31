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
  getProductCategories: jest.fn(),
  normalizePrice: jest.fn((v) => (v === null || v === undefined || v === '' ? null : Number(v))),
}));

// O branch de reordenação do PUT usa updateRecords('products', ...)
jest.mock('../../../lib/crud/crud.js', () => ({
  updateRecords: jest.fn(),
}));

// A guarda de permissão consulta a tabela `roles` — default devolve um cargo
// COM a permissão, para que os testes existentes (que mockiam o token sem
// cargo) continuem no mesmo caminho de 200/201. Os casos de RBAC sobrescrevem
// a resposta com mockResolvedValueOnce.
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb({
  query: jest.fn().mockResolvedValue({ rows: [{ permissions: '["Gestão de Produtos"]' }] }),
}));

jest.mock('../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn(),
  invalidateCache: jest.fn(),
  getOrSetCache: jest.fn(async (key, fetchFunction) => await fetchFunction()),
}));

jest.mock('../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../lib/infra/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

import handler from '../../../pages/api/products.js';
import { getPaginatedProducts, getAllProducts, createProduct, updateProduct, deleteProduct, getProductCategories } from '../../../lib/domain/products.js';
import { updateRecords } from '../../../lib/crud/crud.js';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';
import { checkRateLimit, invalidateCache } from '../../../lib/cache/cache.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { query } from '../../../lib/infra/db.js';

describe('API Pública/Admin - Produtos (/api/products)', () => {
  beforeEach(() => {
    userFactory.resetId();
    checkRateLimit.mockResolvedValue(false);
    getProductCategories.mockResolvedValue([]);
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
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: '', minPrice: '', maxPrice: '', category: '' }, 'default');
    });

    it('deve repassar o sort válido ao domínio', async () => {
      getPaginatedProducts.mockResolvedValueOnce({
        data: [{ id: 3, name: 'Terceiro' }],
        pagination: { page: 1, limit: 10, total: 3 }
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', sort: 'price_asc' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: '', minPrice: '', maxPrice: '', category: '' }, 'price_asc');
    });

    it('deve aceitar sort=positioned (curadoria manual) no GET público', async () => {
      getPaginatedProducts.mockResolvedValueOnce({
        data: [{ id: 4, name: 'Terceiro' }],
        pagination: { page: 1, limit: 10, total: 4 }
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', sort: 'positioned' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: '', minPrice: '', maxPrice: '', category: '' }, 'positioned');
    });

    it('deve retornar 400 para sort inválido no GET público', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', sort: 'invalido' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Bad Request', message: 'Parâmetros inválidos.' });
      expect(getPaginatedProducts).not.toHaveBeenCalled();
    });

    it('deve retornar 400 para parâmetros de paginação inválidos', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', page: '-1' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('deve repassar page e limit explícitos para o domínio', async () => {
      getPaginatedProducts.mockResolvedValueOnce({
        data: [{ id: 2, name: 'Boné' }],
        pagination: { page: 2, limit: 5, total: 6 }
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { public: 'true', page: '2', limit: '5' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPaginatedProducts).toHaveBeenCalledWith(2, 5, { search: '', minPrice: '', maxPrice: '', category: '' }, 'default');
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
      expect(getAllProducts).toHaveBeenCalledWith(1, 10, '');
    });

    it('deve repassar o termo de busca do painel para o domínio', async () => {
      const adminUser = userFactory({ role: 'admin' });
      getAuthToken.mockReturnValue('admin-token');
      verifyToken.mockReturnValue({ userId: adminUser.id, role: adminUser.role });
      getAllProducts.mockResolvedValueOnce({
        data: [{ id: 2, name: 'Bíblia' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      const { req, res } = createMocks({ method: 'GET', query: { search: 'Bíblia' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getAllProducts).toHaveBeenCalledWith(1, 10, 'Bíblia');
    });

    it('deve retornar 401 no GET admin se não enviar token', async () => {
      getAuthToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 400 para parâmetros de paginação inválidos', async () => {
      const adminUser = userFactory({ role: 'admin' });
      getAuthToken.mockReturnValue('admin-token');
      verifyToken.mockReturnValue({ userId: adminUser.id, role: adminUser.role });

      const { req, res } = createMocks({ method: 'GET', query: { limit: '101' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('Segurança — Rate Limit e Autenticação', () => {
    it('deve retornar 429 em mutações (POST) se o limite de taxa for atingido', async () => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
      checkRateLimit.mockResolvedValueOnce(true);
      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90', image_url: 'https://img.jpg' } });
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
      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90', image_url: 'https://img.jpg' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Camisa', price: 89.9 }));
      // A descrição do log precisa carregar o NOME do produto. Antes o handler
      // usava a variável livre `name` (inexistente no escopo do Node; no jsdom
      // resolvia para `window.name` = ""), então em produção a linha lançava
      // ReferenceError DEPOIS do INSERT e o operador recebia 500 com o produto
      // já gravado no banco.
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR PRODUTO', 'PRODUCT', 10, 'Criou o produto: Camisa', expect.any(String));
    });

    it('deve retornar 400 se nome e preço estiverem ausentes', async () => {
      const { req, res } = createMocks({ method: 'POST', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve rejeitar preço zero (400) — preço zero não é preço', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { name: 'Brinde', price: 0, image_url: 'https://img.jpg' }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(createProduct).not.toHaveBeenCalled();
      expect(res._getJSONData().errors.price[0]).toContain('maior que zero');
    });

    it('deve aceitar categoria vazia (o formulário sempre envia a chave) e deixar o domínio aplicar "geral"', async () => {
      // Regressão do Bad Request de 29/10/2026: `category: ''` era rejeitado
      // por `min(1)` mesmo com `.optional()` (que só tolera chave ausente).
      createProduct.mockResolvedValueOnce({ id: 11, name: 'Crucifixo' });
      const { req, res } = createMocks({
        method: 'POST',
        body: { name: 'Crucifixo', price: '149,90', image_url: 'https://img.jpg', category: '', published: true }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const arg = createProduct.mock.calls.at(-1)[0];
      expect(arg.category).toBeUndefined();
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

    it('deve ignorar categoria vazia no update (não gravar "" no banco)', async () => {
      updateProduct.mockResolvedValueOnce([{ id: 1, name: 'Meia' }]);
      const { req, res } = createMocks({ method: 'PUT', body: { id: 1, name: 'Meia', category: '' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const arg = updateProduct.mock.calls.at(-1)[1];
      expect(arg.category).toBeUndefined();
    });
  });

  describe('PUT - Reordenação (Autenticada)', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
    });

    const reorderBody = {
      action: 'reorder',
      items: [{ id: 5, position: 1 }, { id: 6, position: 2 }],
    };

    it('deve reordenar, invalidar cache e registrar auditoria com id real', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: reorderBody });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData()).toEqual({ success: true, message: 'Ordem atualizada' });

      // Uma chamada por item, com a posição recebida (1-based)
      expect(updateRecords).toHaveBeenCalledTimes(2);
      expect(updateRecords).toHaveBeenNthCalledWith(1, 'products', { position: 1 }, { id: 5 });
      expect(updateRecords).toHaveBeenNthCalledWith(2, 'products', { position: 2 }, { id: 6 });

      expect(invalidateCache).toHaveBeenCalledWith('products:*');

      // Auditoria (regra §9 do painel): identificador real, nunca undefined
      expect(logActivity).toHaveBeenCalledWith(
        'admin',
        'REORDENAR PRODUTOS',
        'PRODUCT',
        5,
        expect.any(String),
        expect.any(String)
      );
      expect(logActivity.mock.calls[0][3]).not.toBeUndefined();
    });

    it('deve retornar 400 para payload inválido (position 0) sem tocar nos dados', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { action: 'reorder', items: [{ id: 1, position: 0 }] }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      // Zod flatten agrupa os erros do array sob o caminho `items`
      const { errors } = res._getJSONData();
      expect(errors).toHaveProperty('items');
      expect(errors.items[0]).toContain('Posição deve ser positiva');
      expect(updateRecords).not.toHaveBeenCalled();
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('deve retornar 400 para payload inválido (id não numérico)', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { action: 'reorder', items: [{ id: 'abc', position: 1 }] }
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      // Zod flatten agrupa os erros do array sob o caminho `items`
      const idErrors = res._getJSONData().errors;
      expect(idErrors).toHaveProperty('items');
      // O problema é o `id` ("expected number..." / mensagem do schema)
      expect(idErrors.items[0]).toMatch(/number|ID/i);
      expect(updateRecords).not.toHaveBeenCalled();
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

  describe('RBAC — Gestão de Produtos', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      // Token válido, mas o cargo NÃO tem a permissão de gestão de produtos.
      // `mockResolvedValue` (não Once) deixa os testes de lado permitido
      // sobrescreverem com `mockResolvedValueOnce`, que tem precedência.
      verifyToken.mockReturnValue({ username: 'editor', role: 'editor' });
      query.mockResolvedValue({ rows: [{ permissions: '["Visão Geral"]' }] });
    });

    it('POST sem "Gestão de Produtos" deve retornar 403 sem criar o produto', async () => {
      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90', image_url: 'https://img.jpg' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(res._getJSONData()).toEqual({
        error: 'Acesso negado',
        message: 'Acesso negado. Requer permissão: Gestão de Produtos.',
      });
      expect(createProduct).not.toHaveBeenCalled();
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('PUT (atualização normal) sem a permissão deve retornar 403 sem atualizar', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: { id: 1, name: 'Meia', price: '20,00' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(updateProduct).not.toHaveBeenCalled();
      expect(logActivity).not.toHaveBeenCalled();
    });

    it("PUT com action 'reorder' sem a permissão deve retornar 403 sem reordenar", async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { action: 'reorder', items: [{ id: 5, position: 1 }, { id: 6, position: 2 }] },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(updateRecords).not.toHaveBeenCalled();
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('DELETE sem a permissão deve retornar 403 sem excluir', async () => {
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(deleteProduct).not.toHaveBeenCalled();
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('GET sem ?public=true e sem a permissão deve retornar 403', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(getAllProducts).not.toHaveBeenCalled();
    });

    it('GET com ?public=true continua público (sem token, sem consulta de permissão)', async () => {
      // Sem token nenhum: o branch público não passa por requireAuth
      getAuthToken.mockReturnValue(null);
      getPaginatedProducts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Tênis' }],
        pagination: { page: 1, limit: 10, total: 1 },
      });

      const { req, res } = createMocks({ method: 'GET', query: { public: 'true' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getAuthToken).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('POST com cargo que TEM "Gestão de Produtos" deve criar o produto (201)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ permissions: '["Visão Geral", "Gestão de Produtos"]' }],
      });
      createProduct.mockResolvedValueOnce({ id: 10, name: 'Camisa', price: '89.90' });

      const { req, res } = createMocks({ method: 'POST', body: { name: 'Camisa', price: '89.90', image_url: 'https://img.jpg' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Camisa' }));
    });

    it("POST com role 'admin' deve criar o produto mesmo sem a permissão na lista do cargo (bypass ADR-0010)", async () => {
      verifyToken.mockReturnValue({ username: 'admin', role: 'admin' });
      // Cargo admin devolvido pelo banco SEM "Gestão de Produtos": o bypass
      // é por desenho — o admin passa após a consulta, não em vez dela.
      query.mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral"]' }] });
      createProduct.mockResolvedValueOnce({ id: 11, name: 'Boné', price: '29.90' });

      const { req, res } = createMocks({ method: 'POST', body: { name: 'Boné', price: '29.90', image_url: 'https://img.jpg' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Boné' }));
      // A consulta de permissões roda MESMO para o admin (decisão de desenho)
      expect(query).toHaveBeenCalledWith(
        'SELECT permissions FROM roles WHERE name = $1',
        ['admin'],
        { log: false },
      );
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
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: 'teste', minPrice: '10', maxPrice: '100', category: '' }, 'default');
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
      expect(getPaginatedProducts).toHaveBeenCalledWith(1, 10, { search: 'teste', minPrice: '', maxPrice: '', category: '' }, 'default');
    });
  });
});