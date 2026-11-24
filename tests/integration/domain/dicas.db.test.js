/**
 * Testes de Integração com Banco Real (PostgreSQL) — Dicas do Dia (`dicas`).
 *
 * Valida `getPaginatedDicas` (`lib/domain/dicas.js`), ordenação determinística por `id ASC`,
 * busca `ILIKE` em `name`/`content` e defaults da tabela `dicas` contra PostgreSQL via Testcontainers.
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import { getPaginatedDicas } from '../../../lib/domain/dicas.js';

let mockDbQuery = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (text, params) => {
    if (typeof mockDbQuery !== 'function') {
      return Promise.reject(new Error('mockDbQuery não configurado para este teste'));
    }
    return mockDbQuery(text, params);
  },
}));

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) return;
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
  if (pool) await pool.end();
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
  mockDbQuery = (text, params) => tx.query(text, params);
});

afterEach(async () => {
  mockDbQuery = null;
  if (tx) await tx.rollback();
});

const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Dicas do Dia (dicas) — Integração com PostgreSQL Real', () => {
  it('persiste registros em dicas com defaults corretos e pagina em orderBy id ASC', async () => {
    const marker = `dica-db-${Date.now()}`;
    const inserted = [];
    for (let i = 1; i <= 3; i++) {
      const r = await tx.query(
        `INSERT INTO dicas (name, content, published) VALUES ($1, $2, $3) RETURNING *`,
        [`${marker}-${i}`, `Conteúdo edificante número ${i}`, i !== 3]
      );
      inserted.push(r.rows[0]);
    }

    expect(inserted[0].created_at).toBeTruthy();
    expect(inserted[0].updated_at).toBeTruthy();
    expect(inserted[2].published).toBe(false);

    const page1 = await getPaginatedDicas(1, 2, marker);
    expect(page1.data).toHaveLength(2);
    expect(page1.pagination.total).toBe(3);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.data[0].id).toBeLessThan(page1.data[1].id);
  });

  it('busca ILIKE em name e content na tabela real dicas', async () => {
    const uniqueWord = `Misericordia${Date.now()}`;
    await tx.query(
      `INSERT INTO dicas (name, content, published) VALUES ($1, $2, true)`,
      [`Título Padrão ${Date.now()}`, `Reflexão sobre ${uniqueWord} hoje.`]
    );

    const foundByContent = await getPaginatedDicas(1, 10, uniqueWord.toLowerCase());
    expect(foundByContent.data).toHaveLength(1);
    expect(foundByContent.data[0].content).toContain(uniqueWord);

    const empty = await getPaginatedDicas(1, 10, `inexistente-${Date.now()}`);
    expect(empty.data).toHaveLength(0);
    expect(empty.pagination.total).toBe(0);
  });
});
