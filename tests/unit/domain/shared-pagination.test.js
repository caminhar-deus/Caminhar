import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mocks para as dependências de banco
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

import { paginate } from '../../../lib/domain/shared-pagination.js';
import { query } from '../../../lib/infra/db.js';

describe('Domain - shared-pagination (lib/domain/shared-pagination.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // dados
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT(*)
  });

  describe('publishedField obrigatório', () => {
    it('publicOnly=true sem publishedField deve falhar explicitamente (colunas divergem entre tabelas)', async () => {
      await expect(
        paginate('posts', { page: 1, limit: 10, publishedOnly: true })
      ).rejects.toThrow(/publishedField é obrigatório/);
    });

    it('publishedOnly=false não exige publishedField (listagem admin não filtra publicação)', async () => {
      const result = await paginate('posts', { page: 1, limit: 10 });
      expect(result.pagination.total).toBe(1);
      const sql = query.mock.calls[0][0];
      expect(sql).not.toContain('published = true');
      expect(sql).not.toContain('publicado = true');
    });
  });

  describe('contrato card × SELECT público (PUBLIC_SELECT_FIELDS)', () => {
    it('listagem pública de vídeos inclui thumbnail (VideoCard/LazyIframe usam a capa personalizada)', async () => {
      await paginate('videos', {
        page: 1,
        limit: 10,
        publishedOnly: true,
        publishedField: 'publicado',
      });

      const sql = query.mock.calls[0][0];
      expect(sql).toContain('SELECT id, titulo, url_youtube, descricao, thumbnail, position, publicado, created_at, updated_at FROM videos');
      expect(sql).toContain('publicado = true');
    });

    it('listagem pública de posts filtra pela coluna published (nomenclatura própria da tabela)', async () => {
      await paginate('posts', {
        page: 1,
        limit: 10,
        publishedOnly: true,
        publishedField: 'published',
      });

      const sql = query.mock.calls[0][0];
      expect(sql).toContain('published = true');
      expect(sql).not.toContain('publicado');
    });

    it('listagem pública usa o mapa de colunas por tabela (sem SELECT *)', async () => {
      await paginate('musicas', {
        page: 1,
        limit: 10,
        publishedOnly: true,
        publishedField: 'publicado',
      });

      const sql = query.mock.calls[0][0];
      expect(sql).not.toContain('SELECT *');
      expect(sql).toContain('SELECT id, titulo, artista, url_spotify, descricao, position, publicado, created_at, updated_at FROM musicas');
    });
  });
});
