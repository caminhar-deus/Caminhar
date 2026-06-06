import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { testPublicGetEndpoint } from '../../helpers/crud-test';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/videos.js', () => ({
  getPublicPaginatedVideos: jest.fn()
}));

jest.mock('../../../lib/cache.js', () => require('../../mocks/cache').mockCacheModule());

// Importa o handler
import handler from '../../../pages/api/videos.js';

// Importa as funções mockadas para controlá-las
import { getPublicPaginatedVideos } from '../../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache.js';

// Testes padrão via abstração
testPublicGetEndpoint(handler, {
  resourceName: 'videos',
  path: '/api/videos',
  beforeEach: () => {
    getOrSetCache.mockImplementation(async (key, cb) => await cb());
    checkRateLimit.mockResolvedValue(false);
  },
}, ({ handler: h, createMocks: cm }) => {
  describe('Casos específicos', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      getOrSetCache.mockImplementation(async (key, cb) => await cb());
      checkRateLimit.mockResolvedValue(false);
    });

    it('deve retornar 429 se exceder rate limit', async () => {
      checkRateLimit.mockResolvedValueOnce(true);
      const { req, res } = cm({ method: 'GET' });
      await h(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve retornar 200 com os dados corretos obtidos via domínio e cache', async () => {
      checkRateLimit.mockResolvedValueOnce(false);
      getPublicPaginatedVideos.mockResolvedValueOnce({ data: [{ id: 1 }] });

      const { req, res } = cm({ method: 'GET', query: { search: 'aula' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData().success).toBe(true);
      expect(res._getJSONData().data).toHaveLength(1);
      expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, 'aula');
    });

    it('deve usar page e limit default se receber strings não numéricas e omitir search na cacheKey', async () => {
      checkRateLimit.mockResolvedValueOnce(false);
      getPublicPaginatedVideos.mockResolvedValueOnce({ data: [] });

      const { req, res } = cm({ method: 'GET', query: { page: 'abc', limit: 'xyz' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '');
    });

    it('deve extrair IP de cabeçalhos alternativos (x-forwarded-for) e propagar erro 500', async () => {
      checkRateLimit.mockRejectedValueOnce(new Error('Erro Interno de Rate Limit'));

      const { req, res } = cm({ method: 'GET', headers: { 'x-forwarded-for': '192.168.0.1, 10.0.0.1' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });
});