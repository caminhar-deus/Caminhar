/**
 * Testes de Integração com Banco Real (PostgreSQL) — Auditoria (`activity_logs`).
 *
 * Valida `logActivity` (`lib/domain/audit.js`) contra a tabela real `activity_logs`
 * (migrations `006-create-activity-logs` e `011-fix-entity-id-type` BIGINT).
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import { logActivity } from '../../../lib/domain/audit.js';

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

describeIf('Auditoria (activity_logs) — Integração com PostgreSQL Real', () => {
  it('logActivity grava registro em activity_logs com entity_id BIGINT, details, ip_address e created_at', async () => {
    const bigEntityId = 900719925474; // maior que INT32 max (2147483647) — valida migration 011
    await logActivity('admin_audit', 'CREATE', 'PRODUCT', bigEntityId, 'Criou produto teste', '192.0.2.10');

    const res = await tx.query(
      'SELECT * FROM activity_logs WHERE username = $1 AND entity_id = $2',
      ['admin_audit', bigEntityId]
    );
    expect(res.rows).toHaveLength(1);
    const row = res.rows[0];
    expect(row.action).toBe('CREATE');
    expect(row.entity_type).toBe('PRODUCT');
    expect(String(row.entity_id)).toBe(String(bigEntityId));
    expect(row.details).toBe('Criou produto teste');
    expect(row.ip_address).toBe('192.0.2.10');
    expect(row.created_at).toBeTruthy();
  });

  it('logActivity aceita client de transação e entityId nulo, e impõe NOT NULL nas colunas obrigatórias', async () => {
    await logActivity('editor_tx', 'UPDATE', 'SETTINGS', null, 'Atualizou banner', undefined, { client: tx });

    const res = await tx.query('SELECT * FROM activity_logs WHERE username = $1', ['editor_tx']);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].entity_id).toBeNull();
    expect(res.rows[0].ip_address).toBe('');

    await tx.query('SAVEPOINT sp_audit_not_null');
    try {
      await expect(
        logActivity(null, 'CREATE', 'POST', 1, 'Sem username')
      ).rejects.toMatchObject({ code: '23502' });
    } finally {
      await tx.query('ROLLBACK TO SAVEPOINT sp_audit_not_null');
    }
  });
});
