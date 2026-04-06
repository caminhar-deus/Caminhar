import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Moca o módulo de banco de dados para interceptarmos as queries
jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import { raw, createRecord, updateRecords, deleteRecords, upsertRecord } from '../../../lib/crud.js';
import { query } from '../../../lib/db.js';

describe('Utilitários CRUD genéricos (lib/crud.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Função raw() e Inserção com SQL Bruto', () => {
    it('deve marcar um valor para ser usado como raw SQL (sem placeholders)', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      await createRecord('posts', { title: 'Test', created_at: raw('NOW()') });
      
      // Verifica se 'NOW()' foi inserido diretamente na string, e não como um parâmetro $2
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO posts \(title, created_at\)\s+VALUES \(\$1, NOW\(\)\)/),
        ['Test'], // Apenas o título entra na array de parâmetros seguros
        { client: undefined }
      );
    });
  });

  describe('Proteção contra SQL Injection (Validação de Identificadores)', () => {
    it('deve lançar erro se o nome da tabela tentar injetar comandos', async () => {
      await expect(createRecord('users; DROP TABLE users', { name: 'A' }))
        .rejects.toThrow(/Invalid SQL identifier/);
    });

    it('deve lançar erro se o nome da coluna tentar injetar comandos', async () => {
      await expect(updateRecords('users', { 'name = 1;--': 'A' }, { id: 1 }))
        .rejects.toThrow(/Invalid SQL identifier/);
    });
  });

  describe('createRecord()', () => {
    it('deve montar a query de INSERT corretamente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 10, name: 'John' }] });
      
      const result = await createRecord('users', { name: 'John', age: 30 });
      
      expect(result).toEqual({ id: 10, name: 'John' }); // Retorna o primeiro item (rows[0])
      
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO users \(name, age\)\s+VALUES \(\$1, \$2\)\s+RETURNING \*/),
        ['John', 30],
        { client: undefined }
      );
    });
  });

  describe('updateRecords()', () => {
    it('deve montar a query de UPDATE e o array de valores (data + where) corretamente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      await updateRecords('users', { status: 'active', role: 'admin' }, { id: 1, tenant_id: 5 });
      
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET status = \$1, role = \$2\s+WHERE id = \$3 AND tenant_id = \$4\s+RETURNING \*/),
        ['active', 'admin', 1, 5],
        { client: undefined }
      );
    });
  });

  describe('deleteRecords()', () => {
    it('deve montar a query de DELETE com os parâmetros WHERE corretamente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
      
      await deleteRecords('sessions', { user_id: 10, active: false });
      
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM sessions\s+WHERE user_id = \$1 AND active = \$2\s+RETURNING id/),
        [10, false],
        { client: undefined }
      );
    });
  });

  describe('upsertRecord()', () => {
    it('deve montar a query de INSERT ... ON CONFLICT DO UPDATE corretamente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, key: 'theme', value: 'dark' }] });
      
      await upsertRecord('settings', { key: 'theme', value: 'dark' }, 'key', { value: 'dark' });
      
      // A query de upsert é mais complexa, garantimos que ela une as sintaxes de insert e update
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO settings \(key, value\)\s+VALUES \(\$1, \$2\)\s+ON CONFLICT \(key\) DO UPDATE SET value = \$3\s+RETURNING \*/),
        ['theme', 'dark', 'dark'], // Valores inseridos seguidos dos valores atualizados
        { client: undefined }
      );
    });
  });
});