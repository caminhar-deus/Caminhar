import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { getPublishedMusicas } from '../lib/musicas';
import { query } from '../lib/db';

// Mock do banco de dados para interceptar a query SQL
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('Lógica de Músicas (lib/musicas)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPublishedMusicas deve executar query filtrando por publicado = true', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await getPublishedMusicas();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true'),
      expect.any(Array)
    );
  });

  it('getPublishedMusicas deve manter o filtro de publicado mesmo com busca', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const search = 'Hino';

    await getPublishedMusicas(search);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true AND'),
      expect.arrayContaining([`%${search.toLowerCase()}%`])
    );
  });
});