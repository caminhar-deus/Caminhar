import { describe, it, expect } from '@jest/globals';
import { createPaginationSchema, createSearchSchema } from '../../../../lib/domain/query-schemas.js';

describe('Domain - Query Schemas (lib/domain/query-schemas.js)', () => {
  describe('createPaginationSchema', () => {
      const schema = createPaginationSchema({ defaultLimit: 20, maxLimit: 50 });

      it('deve aplicar valores padrão para inputs vazios ou inválidos', () => {
          const result = schema.parse({});
          expect(result).toEqual({ page: 1, limit: 20 });
      });

      it('deve limitar o valor máximo (maxLimit)', () => {
          const result = schema.parse({ limit: '1000' });
          expect(result.limit).toBe(50);
      });
  });

  describe('createSearchSchema', () => {
      const schema = createSearchSchema({ minLength: 3 });

      it('deve validar tamanho mínimo da busca', () => {
          expect(() => schema.parse({ search: 'oi' })).toThrow();
          expect(schema.parse({ search: 'olá' })).toEqual({ search: 'olá' });
      });

      it('deve validar tamanho máximo da busca', () => {
          const longSearch = 'a'.repeat(101); // maxLength padrão é 100
          expect(() => schema.parse({ search: longSearch })).toThrow();
      });
  });
});
