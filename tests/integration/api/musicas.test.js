import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/musicas.js';
import { getPaginatedMusicas } from '../../../lib/domain/musicas.js';

jest.mock('../../../lib/domain/musicas.js', () => ({
  getPaginatedMusicas: jest.fn()
}));

describe('API Pública - Músicas (/api/musicas)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toEqual(['GET']);
  });

  it('deve retornar 400 para parâmetros de paginação inválidos', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: -1 } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().success).toBe(false);
  });

  it('deve retornar 200, definir Cache-Control e retornar dados paginados', async () => {
    getPaginatedMusicas.mockResolvedValueOnce({
      data: [{ id: 1, titulo: 'Hino' }],
      pagination: { page: 1, limit: 10, total: 1 }
    });
    const { req, res } = createMocks({ method: 'GET', query: { page: '1', search: 'Hino' } });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Cache-Control')).toContain('s-maxage=60');
    
    const responseData = res._getJSONData();
    expect(responseData.data).toHaveLength(1);
    expect(getPaginatedMusicas).toHaveBeenCalledWith(1, 10, 'Hino', true);
  });

  it('deve retornar 500 em caso de erro no servidor', async () => {
    // Simula uma falha na camada de domínio (ex: banco de dados caiu)
    getPaginatedMusicas.mockRejectedValueOnce(new Error('Erro de conexão com o banco'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const responseData = res._getJSONData();
    expect(responseData.success).toBe(false);
    expect(responseData.message).toBe('Erro interno do servidor ao buscar músicas.');
    expect(consoleSpy).toHaveBeenCalledWith('API Error fetching musicas:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});