import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { testPublicGetEndpoint } from '../../helpers/crud-test';
import { videoFactory } from '../../factories';
import { logger } from '../../../lib/infra/logger.js';
import { INVALID_PAGINATION_MESSAGE, INVALID_PARAMS_MESSAGE } from '../../../lib/api/helpers.js';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/videos.js', () => ({
  getPublicPaginatedVideos: jest.fn()
}));

jest.mock('../../../lib/cache/cache.js', () => require('../../mocks/cache').mockCacheModule());

// Importa o handler
import handler from '../../../pages/api/videos.js';

// Importa as funções mockadas para controlá-las
import { getPublicPaginatedVideos } from '../../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache/cache.js';

// Testes padrão via abstração
testPublicGetEndpoint(handler, {
  resourceName: 'videos',
  path: '/api/videos',
}, ({ handler: h, createMocks: cm }) => {
  describe('Casos específicos', () => {
    beforeEach(() => {
      videoFactory.resetId();
      getPublicPaginatedVideos.mockClear();
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
      const mockData = videoFactory.list(1);
      getPublicPaginatedVideos.mockResolvedValueOnce({ data: mockData });

      const { req, res } = cm({ method: 'GET', query: { search: 'aula' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData().success).toBe(true);
      expect(res._getJSONData().data).toHaveLength(1);
      expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, 'aula', 'created_at DESC, id DESC');
    });

    // Com Zod, `page: 'abc'` coerce para NaN e FALHA a validação — 400 com a
    // MESMA string das demais rotas. Antes da validação Zod (23/10/2026)
    // caía nos defaults silenciosos (parseInt → NaN → 1/10).
    it('deve retornar 400 com INVALID_PAGINATION_MESSAGE para page/limit não numéricos', async () => {
      const { req, res } = cm({ method: 'GET', query: { page: 'abc', limit: 'xyz' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe(INVALID_PAGINATION_MESSAGE);
      expect(getPublicPaginatedVideos).not.toHaveBeenCalled();
    });

    it('deve aceitar parâmetro sort customizado e repassar o orderBy mapeado', async () => {
      checkRateLimit.mockResolvedValueOnce(false);
      getPublicPaginatedVideos.mockResolvedValueOnce({ data: [] });

      const { req, res } = cm({ method: 'GET', query: { sort: 'alpha' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '', 'titulo ASC, id ASC');
    });

    it('deve rejeitar sort fora do enum com 400 e INVALID_PARAMS_MESSAGE (sem fallback)', async () => {
      const { req, res } = cm({ method: 'GET', query: { sort: 'created_at' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe(INVALID_PARAMS_MESSAGE);
      expect(getPublicPaginatedVideos).not.toHaveBeenCalled();
    });

    it('deve rejeitar search com mais de 200 caracteres com 400', async () => {
      const { req, res } = cm({ method: 'GET', query: { search: 'a'.repeat(201) } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe(INVALID_PARAMS_MESSAGE);
      expect(getPublicPaginatedVideos).not.toHaveBeenCalled();
    });

    it('deve rejeitar limit acima de 100 com 400 (fora do coberto pelo helper)', async () => {
      const { req, res } = cm({ method: 'GET', query: { limit: '1000' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe(INVALID_PAGINATION_MESSAGE);
      expect(getPublicPaginatedVideos).not.toHaveBeenCalled();
    });

    it('deve extrair IP de cabeçalhos alternativos (x-forwarded-for) e propagar erro 500', async () => {
      checkRateLimit.mockRejectedValueOnce(new Error('Erro Interno de Rate Limit'));

      // Suprime o console.error do log intencional do handler e captura a chamada para validação
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      const { req, res } = cm({ method: 'GET', headers: { 'x-forwarded-for': '192.168.0.1, 10.0.0.1' } });
      await h(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(loggerErrorSpy).toHaveBeenCalledWith('Videos', 'Erro ao buscar vídeos públicos:', expect.any(Error));
      consoleSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });
  });
});
