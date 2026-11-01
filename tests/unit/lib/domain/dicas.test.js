import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

import { getPaginatedDicas } from '../../../../lib/domain/dicas.js';
import { query } from '../../../../lib/infra/db.js';

describe('Domínio - Dicas (lib/domain/dicas.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaginatedDicas', () => {
    it('deve paginar com orderBy id ASC e busca em name/content', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dica fé', content: 'Confie em Deus' }] }) // SELECT dados
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT

      const result = await getPaginatedDicas(2, 5, 'fé');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({ page: 2, limit: 5, total: 2, totalPages: 1 });

      // Verifica que a busca cobre name e content com ILIKE
      expect(query).toHaveBeenCalledTimes(2);
      const selectCall = query.mock.calls[0];
      expect(selectCall[0]).toMatch(/FROM dicas/);
      expect(selectCall[0]).toMatch(/ORDER BY id ASC/i);
      expect(selectCall[0]).toMatch(/\(name ILIKE|\$.*name.*ILIKE|content ILIKE/i);
      expect(selectCall[0]).toMatch(/name.*content|content.*name/i);
    });

    it('deve retornar todos os dados sem filtro de publishedOnly para o admin', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await getPaginatedDicas(1, 10, '');

      const selectCall = query.mock.calls[0];
      expect(selectCall[0]).not.toMatch(/published.*=.*true/i);
    });
  });
});
