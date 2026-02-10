import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { getPublishedVideos } from '../lib/videos';
import { query } from '../lib/db';

// Mock do banco de dados para interceptar a query SQL
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('Lógica de Vídeos (lib/videos)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPublishedVideos deve executar query filtrando por publicado = true', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await getPublishedVideos();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true'),
      expect.any(Array)
    );
  });

  it('getPublishedVideos deve manter o filtro de publicado mesmo com busca', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const search = 'Culto';

    await getPublishedVideos(search);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true AND'),
      expect.arrayContaining([`%${search.toLowerCase()}%`])
    );
  });
});