/**
 * Testes de Integração com Banco Real (PostgreSQL) — Settings.
 * 
 * Valida queries SQL reais, constraints, transações e comportamento
 * das funções de domínio em um container PostgreSQL via Testcontainers.
 * 
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) {
    return;
  }
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch (_) { /* rollback de segurança */ }
  }
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
});

afterEach(async () => {
  if (tx) {
    await tx.rollback();
  }
});

/**
 * Helper para inserir uma configuração de teste usando query direta.
 */
async function insertTestSetting(overrides = {}) {
  const defaults = {
    key: `setting_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    value: JSON.stringify('valor_teste'),
    type: 'string',
    description: 'Configuração de teste.',
  };
  const data = { ...defaults, ...overrides };

  const result = await tx.query(
    `INSERT INTO settings (key, value, type, description)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING *`,
    [data.key, data.value, data.type, data.description]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Settings — Integração com PostgreSQL Real', () => {
  it('deve criar uma configuração e retornar o registro com chave', async () => {
    const setting = await insertTestSetting({
      key: `site_name_${Date.now()}`,
      value: JSON.stringify('Meu Site'),
    });

    expect(setting).toHaveProperty('key');
    expect(setting.key).toContain('site_name_');
    expect(setting.value).toBe('"Meu Site"');
    expect(setting.created_at).toBeTruthy();
    expect(setting.updated_at).toBeTruthy();
  });

  it('deve ler uma configuração por chave após criar', async () => {
    const key = `theme_${Date.now()}`;
    await insertTestSetting({
      key,
      value: JSON.stringify('dark'),
      type: 'string',
    });

    const result = await tx.query('SELECT * FROM settings WHERE key = $1', [key]);
    const found = result.rows[0];

    expect(found).toBeTruthy();
    expect(found.value).toBe('"dark"');
    expect(found.type).toBe('string');
  });

  it('deve retornar todas as configurações como objeto (json_object_agg)', async () => {
    const key1 = `setting_a_${Date.now()}`;
    const key2 = `setting_b_${Date.now()}`;

    await insertTestSetting({ key: key1, value: JSON.stringify('valor_a') });
    await insertTestSetting({ key: key2, value: JSON.stringify('valor_b') });

    const result = await tx.query(`
      SELECT COALESCE(
        json_object_agg(key, value ORDER BY key),
        '{}'::json
      ) as settings
      FROM settings
      WHERE key IN ($1, $2)
    `, [key1, key2]);

    const settings = result.rows[0]?.settings || {};
    expect(settings[key1]).toBe('"valor_a"');
    expect(settings[key2]).toBe('"valor_b"');
  });

  it('deve atualizar o valor de uma configuração existente (UPSERT)', async () => {
    const key = `dynamic_key_${Date.now()}`;

    // Usa upsert para criar
    await tx.query(
      `INSERT INTO settings (key, value, type, description)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (key)
       DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify('valor_inicial'), 'string', 'Teste upsert']
    );

    // Usa upsert para atualizar
    const upsertResult = await tx.query(
      `INSERT INTO settings (key, value, type, description)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (key)
       DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify('valor_atualizado'), 'string', 'Teste upsert']
    );

    const updated = upsertResult.rows[0];
    expect(updated.value).toBe('"valor_atualizado"');
  });

  it('deve rejeitar inserção sem key (NOT NULL via PRIMARY KEY)', async () => {
    await expect(
      tx.query(
        'INSERT INTO settings (value) VALUES ($1::jsonb) RETURNING *',
        [JSON.stringify('sem_chave')]
      )
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção com chave duplicada (UNIQUE)', async () => {
    const key = `unique_key_${Date.now()}`;

    await insertTestSetting({ key, value: JSON.stringify('primeiro') });

    await expect(
      tx.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) RETURNING *',
        [key, JSON.stringify('segundo')]
      )
    ).rejects.toThrow();
  });

  it('deve retornar lista vazia para chave inexistente', async () => {
    const result = await tx.query(
      'SELECT * FROM settings WHERE key = $1',
      ['chave_inexistente']
    );
    expect(result.rows).toHaveLength(0);
  });

  it('deve retornar objeto vazio quando não há configurações', async () => {
    // Usa uma chave que certamente não existe
    const result = await tx.query(`
      SELECT COALESCE(
        json_object_agg(key, value ORDER BY key),
        '{}'::json
      ) as settings
      FROM settings
      WHERE key LIKE 'zzz_nonexistent_%'
    `);

    expect(result.rows[0]?.settings).toEqual({});
  });

  it('deve listar configurações ordenadas por chave', async () => {
    const keyA = `alpha_${Date.now()}`;
    const keyB = `beta_${Date.now()}`;

    await insertTestSetting({ key: keyB, value: JSON.stringify('beta') });
    await insertTestSetting({ key: keyA, value: JSON.stringify('alpha') });

    const result = await tx.query(
      'SELECT * FROM settings WHERE key IN ($1, $2) ORDER BY key ASC',
      [keyA, keyB]
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].key).toBe(keyA);
    expect(result.rows[1].key).toBe(keyB);
  });

  it('deve deletar uma configuração', async () => {
    const key = `delete_key_${Date.now()}`;
    await insertTestSetting({ key, value: JSON.stringify('para_deletar') });

    await tx.query('DELETE FROM settings WHERE key = $1', [key]);

    const result = await tx.query('SELECT * FROM settings WHERE key = $1', [key]);
    expect(result.rows).toHaveLength(0);
  });

  it('deve contar o total de registros corretamente', async () => {
    const base = `count_${Date.now()}_`;
    await insertTestSetting({ key: `${base}1`, value: JSON.stringify('v1') });
    await insertTestSetting({ key: `${base}2`, value: JSON.stringify('v2') });
    await insertTestSetting({ key: `${base}3`, value: JSON.stringify('v3') });

    const result = await tx.query("SELECT COUNT(*) FROM settings WHERE key LIKE $1", [`${base}%`]);
    expect(parseInt(result.rows[0].count, 10)).toBe(3);
  });
});