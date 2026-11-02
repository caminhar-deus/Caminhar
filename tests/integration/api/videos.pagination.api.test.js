import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

import { INVALID_PAGINATION_MESSAGE } from '../../../lib/api/helpers.js';

// Mocks declarados ANTES da importação do handler (mesmo padrão de videos.test.js).
// Antes este arquivo mockava '../lib/videos' com { virtual: true } — caminho
// inexistente — e testava um handler FALSO. Agora exercita o handler real.
jest.mock('../../../lib/domain/videos.js', () => ({
  getPublicPaginatedVideos: jest.fn(),
}));

jest.mock('../../../lib/cache/cache.js', () => require('../../mocks/cache').mockCacheModule());

// Importa o handler real
import handler from '../../../pages/api/videos.js';

// Importa as funções mockadas para controlá-las
import { getPublicPaginatedVideos } from '../../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache/cache.js';

describe('API de Vídeos - Paginação (/api/videos)', () => {
  beforeEach(() => {
    getPublicPaginatedVideos.mockClear();
    getOrSetCache.mockImplementation(async (key, cb) => await cb());
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve paginar com page/limit informados e repassar o orderBy default com desempate', async () => {
    getPublicPaginatedVideos.mockResolvedValueOnce({ data: [], pagination: { page: 2, limit: 5 } });

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(2, 5, '', 'created_at DESC, id DESC');
  });

  it('deve usar os defaults (page=1, limit=10, sort=recent) quando não informado', async () => {
    getPublicPaginatedVideos.mockResolvedValueOnce({ data: [], pagination: {} });

    const { req, res } = createMocks({ method: 'GET', query: {} });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '', 'created_at DESC, id DESC');
  });

  it('deve retornar 400 com INVALID_PAGINATION_MESSAGE para limit acima de 100', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { limit: '101' } });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe(INVALID_PAGINATION_MESSAGE);
    expect(getPublicPaginatedVideos).not.toHaveBeenCalled();
  });

  // Cada valor do enum vira UMA cláusula ORDER BY fixa, com desempate por id na
  // mesma direção. `alpha`/`alpha_desc` ordenam por `lower(unaccent(titulo))`
  // para não depender da colação do cluster (item AE; extensão da migration 021).
  // O `alpha` (ASC) e o sort inválido (400) já são cobertos em videos.test.js.
  it.each([
    ['recent', 'created_at DESC, id DESC'],
    ['positioned', 'position ASC, id ASC'],
    ['oldest', 'created_at ASC, id ASC'],
    ['alpha_desc', 'lower(unaccent(titulo)) DESC, id DESC'],
  ])('deve mapear sort=%s para o ORDER BY "%s"', async (sort, orderBy) => {
    getPublicPaginatedVideos.mockResolvedValueOnce({ data: [], pagination: {} });

    const { req, res } = createMocks({ method: 'GET', query: { sort } });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '', orderBy);
  });

  it('deve incluir o sort validado na chave de cache (positioned não colide com recent)', async () => {
    getPublicPaginatedVideos
      .mockResolvedValueOnce({ data: [], pagination: {} })
      .mockResolvedValueOnce({ data: [], pagination: {} });

    for (const sort of ['recent', 'positioned']) {
      const { req, res } = createMocks({ method: 'GET', query: { sort, limit: '12' } });
      await handler(req, res);
    }

    const keys = getOrSetCache.mock.calls.map(([key]) => key);
    expect(keys.slice(-2)).toEqual(['public_videos:1:12:recent', 'public_videos:1:12:positioned']);
  });
});
