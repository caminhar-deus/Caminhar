import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import handler from '../../../../pages/api/products.js';
import * as db from '../../../../lib/db.js';
import * as auth from '../../../../lib/auth.js';
import * as cache from '../../../../lib/cache.js';

jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  logActivity: jest.fn()
}));

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
  withAuth: jest.fn((h) => h)
}));

jest.mock('../../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
  invalidateCache: jest.fn(),
  getOrSetCache: jest.fn((key, fn) => fn())
}));

describe('API - Products (Edge Cases)', () => {
  let req;
  let res;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = { method: 'GET', query: {}, body: {}, headers: {}, socket: {} };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  it('deve bloquear métodos HTTP não permitidos (405) (linhas 175-176)', async () => {
    req.method = 'PATCH';
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve retornar 500 em caso de erro interno não tratado', async () => {
    req.method = 'GET';
    db.query.mockRejectedValueOnce(new Error('Erro forçado no banco de dados'));
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deve usar fallback de IP e formatar price no POST', async () => {
    req.method = 'POST';
    req.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
    req.body = { title: 'Teste', price: ' 99.90 ' }; // Sem R$ e com espaços
    
    auth.getAuthToken.mockReturnValueOnce('token');
    auth.verifyToken.mockReturnValueOnce({ username: 'admin' });
    db.createRecord.mockResolvedValueOnce({ id: 1, title: 'Teste', price: 'R$ 99.90' });
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.createRecord).toHaveBeenCalledWith('products', expect.objectContaining({ price: 'R$ 99.90' }));
  });

  it('deve lidar com fallbacks no GET quando o banco retorna vazio', async () => {
    req.method = 'GET';
    req.query = { search: 'teste', minPrice: '10', maxPrice: '100' };
    
    db.query.mockResolvedValueOnce({ rows: [] }); // Falha na extração do COUNT
    db.query.mockResolvedValueOnce({ rows: null }); // Falha na extração do SELECT

    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [],
      pagination: expect.objectContaining({ total: 0 })
    }));
  });

  it('deve tratar a falta de token (isAdmin = false) de forma silenciosa no GET', async () => {
    req.method = 'GET';
    auth.getAuthToken.mockImplementationOnce(() => { throw new Error('Erro forçado'); });
    db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); 
    db.query.mockResolvedValueOnce({ rows: [] }); 

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('deve usar ID da query e tratar fallbacks de log e retorno no PUT', async () => {
    req.method = 'PUT';
    req.query = { id: '99' };
    req.body = { price: '50.00' }; // Sem ID no body, sem título
    
    auth.getAuthToken.mockReturnValueOnce('token');
    auth.verifyToken.mockReturnValueOnce({ username: 'admin' });
    db.updateRecords.mockResolvedValueOnce([]); // Retorno vazio
    
    await handler(req, res);
    
    expect(db.updateRecords).toHaveBeenCalledWith('products', expect.anything(), { id: 99 });
    expect(res.json).toHaveBeenCalledWith({});
  });

  it('deve usar ID da query e tratar fallback de título ausente no DELETE', async () => {
    req.method = 'DELETE';
    req.query = { id: '88' };
    req.body = {}; // Sem ID no body
    
    auth.getAuthToken.mockReturnValueOnce('token');
    auth.verifyToken.mockReturnValueOnce({ username: 'admin' });
    db.query.mockResolvedValueOnce({ rows: [] }); // Nome não encontrado no log
    
    await handler(req, res);
    
    expect(db.deleteRecords).toHaveBeenCalledWith('products', { id: 88 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('deve retornar 429 se o Rate Limit for excedido nas rotas de modificação', async () => {
    req.method = 'POST';
    // Força o Rate Limiter a bloquear a requisição
    cache.checkRateLimit.mockResolvedValueOnce(true);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      error: expect.stringContaining('Muitas requisições') 
    }));
  });
});