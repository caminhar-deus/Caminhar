import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/videos.js';
import { getPublicPaginatedVideos } from '../../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache.js';

jest.mock('../../../lib/domain/videos.js', () => ({
  getPublicPaginatedVideos: jest.fn()
}));

jest.mock('../../../lib/cache.js', () => ({
  getOrSetCache: jest.fn((key, cb) => cb()),
  checkRateLimit: jest.fn()
}));

describe('API Pública - Vídeos (/api/videos)', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = () => {};
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => { 
    jest.clearAllMocks(); 
    getOrSetCache.mockImplementation(async (key, cb) => await cb());
  });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 400 para parâmetros de paginação fora dos limites', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: 0 } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve retornar 429 se exceder rate limit', async () => {
    checkRateLimit.mockResolvedValueOnce(true);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
  });

  it('deve retornar 200 com os dados corretos obtidos via domínio e cache', async () => {
    checkRateLimit.mockResolvedValueOnce(false);
    getPublicPaginatedVideos.mockResolvedValueOnce({ data: [{ id: 1 }] });
    
    const { req, res } = createMocks({ method: 'GET', query: { search: 'aula' } });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().success).toBe(true);
    expect(res._getJSONData().data).toHaveLength(1);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, 'aula');
  });

  it('deve usar page e limit default se receber strings não numéricas e omitir search na cacheKey', async () => {
    checkRateLimit.mockResolvedValueOnce(false);
    getPublicPaginatedVideos.mockResolvedValueOnce({ data: [] });
    
    // Envia 'abc' e 'xyz' em vez de números, e omite search
    const { req, res } = createMocks({ method: 'GET', query: { page: 'abc', limit: 'xyz' } });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '');
  });

  it('deve extrair IP de cabeçalhos alternativos (x-forwarded-for) e propagar erro 500', async () => {
    checkRateLimit.mockRejectedValueOnce(new Error('Erro Interno de Rate Limit'));
    
    const { req, res } = createMocks({ method: 'GET', headers: { 'x-forwarded-for': '192.168.0.1, 10.0.0.1' } });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
  });
});