/**
 * Testes de Integração com Banco Real (PostgreSQL) — Imagens (`images`).
 *
 * Valida `saveImage` (`lib/domain/images.js`), colunas reais (`filename`, `path`,
 * `type`, `size`, `user_id`, `uploaded_at`), vínculo FK opcional com `users(id)` e
 * validação Zod contra PostgreSQL via Testcontainers.
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import { saveImage } from '../../../lib/domain/images.js';

let mockDbQuery = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (text, params, options = {}) => {
    if (options?.client && typeof options.client.query === 'function') {
      return options.client.query(text, params);
    }
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

describeIf('Imagens (images) — Integração com PostgreSQL Real', () => {
  it('saveImage persiste imagem com user_id nulo e com user_id referenciando usuário real', async () => {
    const anonImg = await saveImage('banner.webp', 'banners/banner.webp', 'image/webp', 24500, null);
    expect(anonImg).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        filename: 'banner.webp',
        path: 'banners/banner.webp',
        type: 'image/webp',
        size: 24500,
        user_id: null,
      })
    );
    expect(anonImg.uploaded_at).toBeTruthy();

    const userRes = await tx.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin') RETURNING id`,
      [`img_user_${Date.now()}`, 'hash-placeholder']
    );
    const userId = userRes.rows[0].id;

    const ownedImg = await saveImage('terco.jpg', 'products/terco.jpg', 'image/jpeg', 12000, userId, { client: tx });
    expect(ownedImg.user_id).toBe(userId);
  });

  it('saveImage valida Zod antes do INSERT e banco impõe FK user_id para usuário inexistente', async () => {
    await expect(
      saveImage('', 'products/a.jpg', 'image/jpeg', 100, null)
    ).rejects.toThrow();

    await expect(
      saveImage('a.jpg', 'products/a.jpg', 'image/jpeg', -5, null)
    ).rejects.toThrow();

    await tx.query('SAVEPOINT sp_img_fk');
    try {
      await expect(
        saveImage('a.jpg', 'products/a.jpg', 'image/jpeg', 500, 999999999)
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await tx.query('ROLLBACK TO SAVEPOINT sp_img_fk');
    }
  });
});
