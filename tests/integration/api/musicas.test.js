import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { testPublicGetEndpoint } from '../../helpers/crud-test';
import { musicFactory } from '../../factories';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/musicas.js', () => ({
  getPaginatedMusicas: jest.fn()
}));

jest.mock('../../../lib/cache.js', () => require('../../mocks/cache').mockCacheModule());

// Importa o handler
import handler from '../../../pages/api/musicas.js';

// Importa as funções mockadas para controlá-las
import { getPaginatedMusicas } from '../../../lib/domain/musicas.js';

// Testes padrão via abstração
testPublicGetEndpoint(handler, {
  resourceName: 'musicas',
  path: '/api/musicas',
}, ({ handler: h, createMocks: cm }) => {
  describe('Casos específicos', () => {
    beforeEach(() => {
      musicFactory.resetId();
    });

    it('deve retornar 200, definir Cache-Control e retornar dados paginados', async () => {
      const mockData = musicFactory.list(1);
      getPaginatedMusicas.mockResolvedValueOnce({
        data: mockData,
        pagination: { page: 1, limit: 10, total: 1 }
      });
      const { req, res } = cm({ method: 'GET', query: { page: '1', search: 'Hino' } });
      await h(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Cache-Control')).toContain('s-maxage=300');
      
      const responseData = res._getJSONData();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(1);
      expect(getPaginatedMusicas).toHaveBeenCalledWith(1, 10, 'Hino', true);
    });

    it('deve retornar 500 em caso de erro no servidor', async () => {
      getPaginatedMusicas.mockRejectedValueOnce(new Error('Erro de conexão com o banco'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = cm({ method: 'GET' });
      await h(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = res._getJSONData();
      expect(responseData.error).toBe('Internal Server Error');
      expect(responseData.message).toBe('Erro interno do servidor ao buscar músicas.');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Musicas'), expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('deve retornar 429 se o limite de requisições for excedido (rate limit dentro do cache)', async () => {
      getPaginatedMusicas.mockRejectedValueOnce(new Error('RATE_LIMIT_EXCEEDED'));
      const { req, res } = cm({ method: 'GET' });
      await h(req, res);
      expect(res._getStatusCode()).toBe(429);
    });
  });
});
