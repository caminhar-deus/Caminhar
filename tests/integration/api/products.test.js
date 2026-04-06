import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => ({
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn(),
}));

import handler from '../../../pages/api/products.js';
import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../../lib/db.js';
import { getAuthToken, verifyToken } from '../../../lib/auth.js';
import { invalidateCache, checkRateLimit } from '../../../lib/cache.js';

describe('API Pública/Admin - Produtos (/api/products)', () => {
  let consoleLogSpy, consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue(false);
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Retornos padrões de banco de dados para evitar travas nos testes
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '1' }] };
      if (sql.includes('SELECT * FROM products')) return { rows: [{ id: 1, title: 'Tênis', price: 'R$ 100,00' }] };
      if (sql.includes('SELECT title FROM products')) return { rows: [{ title: 'Produto Deletado' }] };
      return { rows: [] };
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Regras de Segurança e Rate Limit', () => {
    it('deve retornar 429 em mutações (POST/PUT/DELETE) se o limite de taxa for atingido', async () => {
      checkRateLimit.mockResolvedValueOnce(true); // Excedeu o limite de acessos por minuto
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve retornar 401 em mutações se não enviar token', async () => {
      getAuthToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'PUT' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 em mutações se o token for inválido', async () => {
      getAuthToken.mockReturnValueOnce('token-malicioso');
      verifyToken.mockReturnValueOnce(null);
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET - Listagem e Filtros', () => {
    it('deve listar produtos públicos, esconder rascunhos de visitantes e configurar Cache-Control', async () => {
      getAuthToken.mockReturnValueOnce(null); // Visitante anônimo
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('published = true'), expect.any(Array));
    });

    it('deve listar todos os produtos (incluindo rascunhos) se for um administrador logado', async () => {
      getAuthToken.mockReturnValue('admin-token');
      verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      // Confirma que a amarra 'published = true' NÃO foi ativada
      expect(query).toHaveBeenCalledWith(expect.not.stringContaining('published = true'), expect.any(Array));
    });

    it('deve forçar a listagem pública mesmo sendo admin se "public=true" for enviado na URL', async () => {
      getAuthToken.mockReturnValue('admin-token');
      verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
      const { req, res } = createMocks({ method: 'GET', query: { public: 'true' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('published = true'), expect.any(Array));
    });

    it('deve aplicar filtros de busca textual e intervalo de preço numérico', async () => {
      const { req, res } = createMocks({ method: 'GET', query: { search: 'Tenis', minPrice: '50', maxPrice: '150' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LOWER(title) LIKE'), expect.any(Array));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('>= $'), expect.any(Array));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('<= $'), expect.any(Array));
    });

    it('deve retornar 500 se o banco falhar no GET', async () => {
      query.mockRejectedValueOnce(new Error('DB Failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('POST/PUT/DELETE - Mutações (Autenticadas)', () => {
    beforeEach(() => {
      getAuthToken.mockReturnValue('valid-token');
      verifyToken.mockReturnValue({ username: 'admin' });
    });

    it('POST: deve formatar o preço ausente de "R$", criar o produto e registrar log', async () => {
      createRecord.mockResolvedValueOnce({ id: 10, title: 'Camisa', price: 'R$ 89.90' });
      const { req, res } = createMocks({ method: 'POST', body: { title: 'Camisa', price: '89.90' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(201);
      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({ price: 'R$ 89.90' }));
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR PRODUTO', 'PRODUCT', 10, expect.any(String), expect.any(String));
    });

    it('PUT: deve processar a reordenação em massa (drag and drop) sem acionar log unitário', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: { action: 'reorder', items: [{ id: 1, position: 2 }] } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledWith('products', { position: 2 }, { id: 1 });
      expect(invalidateCache).toHaveBeenCalledWith('products:public:all');
    });

    it('PUT: deve atualizar dados normais formatando o preço e injetando data de updated_at', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 1, title: 'Meia' }]);
      const { req, res } = createMocks({ method: 'PUT', body: { id: 1, title: 'Meia', price: ' 20,00 ' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledWith('products', expect.objectContaining({ price: 'R$ 20,00' }), { id: 1 });
    });

    it('DELETE: deve tentar pegar o título antes de excluir, para usar no registro de auditoria', async () => {
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(logActivity).toHaveBeenCalledWith(expect.any(String), 'EXCLUIR PRODUTO', 'PRODUCT', 1, expect.stringContaining('Produto Deletado'), expect.any(String));
    });
  });
});