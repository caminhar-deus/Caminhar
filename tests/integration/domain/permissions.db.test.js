/**
 * Testes de Integração com Banco Real (PostgreSQL) — Permissões / roles.
 *
 * Fixa com o banco REAL o contrato da fronteira de permissões:
 * - a migração 000 cria `roles.permissions` como TEXT (não JSONB), então o
 *   driver devolve STRING JSON — nunca array;
 * - `lib/domain/permissions.js` (`getRolePermissions`) é a fronteira que
 *   normaliza esse texto para `string[]` (= `permissionsList` para o cargo admin);
 * - a migração 018 (seed dos cargos padrão) é idempotente: aplicada duas
 *   vezes não duplica linhas de cargo;
 * - `adminCrudHandler` (a fronteira de AUTORIDADE) concede/nega lendo essa
 *   coluna TEXT real — não um mock de array.
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import permissionsList, { getRolePermissions } from '../../../lib/domain/permissions.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

// ── Mocks mínimos para exercitar a fronteira de autoridade ──────────────────
// `adminCrudHandler` busca as permissões via `query` (lib/infra/db) e é
// envolvido por `withAuth`. Apontamos a query para a transação do harness
// (o MESMO banco real) e deixamos `withAuth` ser passthrough — nenhum outro
// teste precisa de infraestrutura além de `tests/helpers/db-test.js`.
let mockDbQuery = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (...args) => {
    if (typeof mockDbQuery !== 'function') {
      return Promise.reject(new Error('mockDbQuery não configurado para este teste'));
    }
    return mockDbQuery(...args);
  },
}));

jest.mock('../../../lib/auth/auth.js', () => ({
  // Função comum (não `jest.fn`): imune a `clearMocks`/`restoreMocks` da
  // configuração do Jest — o wrapper é criado no carregamento do módulo.
  withAuth: (handler) => handler,
}));

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
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  mockDbQuery = null;
  tx = await withTransaction(pool);
});

afterEach(async () => {
  if (tx) {
    await tx.rollback();
  }
});

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

/**
 * Cliente com a mesma assinatura `client.query(text, params)` exigida
 * pelo `up(client)` da migração 018 — reaproveita a transação do harness
 * (sem infraestrutura nova; tudo é revertido no afterEach).
 */
const asMigrationClient = () => ({
  query: (text, params) => tx.query(text, params),
});

/**
 * Contagem dos cargos padrão, para provar idempotência (sem duplicação).
 * @returns {Promise<Object>} ex: { admin: 1, user: 1 }
 */
async function countDefaultRoles() {
  const result = await tx.query(`
    SELECT name, COUNT(*)::int AS count
    FROM roles
    WHERE name IN ('admin', 'user')
    GROUP BY name
    ORDER BY name
  `);
  return Object.fromEntries(result.rows.map((row) => [row.name, row.count]));
}

describeIf('Permissões — Integração com PostgreSQL Real', () => {
  it('roles.permissions é TEXT: o driver devolve a string JSON e o helper normaliza', async () => {
    // Seed DENTRO da transação do teste: o `up()` da 018 é idempotente
    // (upsert `ON CONFLICT (name) DO UPDATE`), então o estado canônico fica
    // garantido antes do assert mesmo num container reutilizado
    // (`withReuse(true)`) com dados de execuções anteriores — o teste deixa
    // de depender do que `applyMigrations()` gravou fora desta transação
    // (que também será revertida no afterEach).
    const { up: seedDefaultRoles } = await import('../../../scripts/migrations/018-seed-default-roles.js');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await seedDefaultRoles(asMigrationClient());

      const result = await tx.query(
        `SELECT permissions FROM roles WHERE name = 'admin'`
      );
      const row = result.rows[0];

      expect(row).toBeTruthy();
      // Fixa o TIPO: a coluna é TEXT — o banco devolve STRING, nunca array.
      expect(typeof row.permissions).toBe('string');
      expect(Array.isArray(row.permissions)).toBe(false);
      expect(row.permissions).toBe(JSON.stringify(permissionsList));

      // A fronteira normaliza para exatamente a lista de permissões do admin
      const normalized = getRolePermissions(row);
      expect(normalized).toEqual(permissionsList);
      // Round-trip: serializar o que a fronteira devolveu reproduz o MESMO
      // texto do banco — prova ligação com o dado real (e não um array à parte).
      expect(JSON.stringify(normalized)).toBe(row.permissions);

      // Seed do cargo `user`: apenas "Visão Geral" (também TEXT, não array)
      const userRow = (await tx.query(`SELECT permissions FROM roles WHERE name = 'user'`)).rows[0];
      expect(userRow).toBeTruthy();
      expect(typeof userRow.permissions).toBe('string');
      expect(userRow.permissions).toBe(JSON.stringify(['Visão Geral']));
      expect(getRolePermissions(userRow)).toEqual(['Visão Geral']);
    } finally {
      // Restaura SEMPRE: se `up()` lançar, um console.log silenciado poluiria
      // os testes seguintes (o restore no fim do teste nunca alcançaria).
      consoleSpy.mockRestore();
    }
  });

  it('migração 018 é idempotente: aplicada duas vezes não duplica os cargos padrão', async () => {
    // Import dinâmico: a migração executa loadEnv() no import — só carrega
    // quando o teste de fato roda (Docker disponível), sem poluir outros workers.
    const { up: seedDefaultRoles } = await import('../../../scripts/migrations/018-seed-default-roles.js');
    const client = asMigrationClient();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await seedDefaultRoles(client);
      const afterFirst = await countDefaultRoles();

      await seedDefaultRoles(client);
      const afterSecond = await countDefaultRoles();

      expect(afterSecond).toEqual(afterFirst);
      expect(afterSecond.admin).toBe(1);
      expect(afterSecond.user).toBe(1);
    } finally {
      // Restaura SEMPRE: se `up()` lançar, o console.log ficaria silenciado
      // nos testes seguintes.
      consoleSpy.mockRestore();
    }
  });

  it('fronteira de autoridade com row REAL: concede com a permissão certa e nega com só ["Visão Geral"]', async () => {
    // Row REAL na coluna TEXT (não um mock de array) — exatamente o formato
    // que o driver devolve para `roles.permissions`.
    await tx.query(
      `INSERT INTO roles (name, permissions) VALUES ('editor_fronteira', $1)
       ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions`,
      [JSON.stringify(['Segurança'])],
    );

    // O handler lê permissões pela MESMA transação do teste (ver mocks no topo)
    mockDbQuery = (text, params) => tx.query(text, params);

    const handler = createAdminHandler({
      name: 'Fronteira',
      permission: ['Segurança'],
      handlers: { GET: (req, res) => res.status(200).json({ concedido: true }) },
    });

    const invoke = async (role) => {
      const { req, res } = createMocks({ method: 'GET' });
      req.user = { userId: 1, username: 'fronteira', role };
      await handler(req, res);
      return res;
    };

    // (a) a row real traz a permissão exigida → CONCEDE
    const allowed = await invoke('editor_fronteira');
    expect(allowed._getStatusCode()).toBe(200);
    expect(allowed._getJSONData()).toEqual({ concedido: true });

    // Prova a origem do dado: TEXT no banco (string), normalizado na fronteira
    const raw = await tx.query(`SELECT permissions FROM roles WHERE name = 'editor_fronteira'`);
    expect(typeof raw.rows[0].permissions).toBe('string');
    expect(raw.rows[0].permissions).toBe('["Segurança"]');

    // (b) a MESMA row com só ["Visão Geral"] → NEGA (fail-closed, 403)
    await tx.query(
      `UPDATE roles SET permissions = $1 WHERE name = 'editor_fronteira'`,
      [JSON.stringify(['Visão Geral'])],
    );
    const denied = await invoke('editor_fronteira');
    expect(denied._getStatusCode()).toBe(403);
    expect(denied._getJSONData()).toEqual({
      error: 'Acesso negado',
      message: 'Acesso negado. Requer permissão: Segurança.',
    });
  });
});
