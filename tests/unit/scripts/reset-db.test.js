import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();

jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
  requireDatabaseUrl: jest.fn(),
}));

jest.mock('../../../scripts/db/connection.js', () => ({
  query: mockQuery,
  getPool: jest.fn(() => ({ query: mockQuery })),
  closePool: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../scripts/migrate.js', () => ({
  ensureMigrationTable: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
}));

// Extrai o nome da tabela de cada "DROP TABLE IF EXISTS <nome> CASCADE;" —
// por nome exato (regex ancorado), porque 'tags' é substring de 'post_tags'.
function droppedTables() {
  return mockQuery.mock.calls
    .map((call) => call[0])
    .filter((sql) => sql.startsWith('DROP TABLE'))
    .map((sql) => sql.match(/^DROP TABLE IF EXISTS (\w+) CASCADE;$/)[1]);
}

describe('reset-db.js — reset completo das tabelas de conteúdo', () => {
  let resetDb;
  let run;
  let ensureMigrationTable;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
    // Import dinâmico (padrão de migrate.test.js): o módulo tem CLI guard,
    // então o import não dispara o reset
    ({ resetDb } = await import('../../../scripts/reset-db.js'));
    ({ run, ensureMigrationTable } = await import('../../../scripts/migrate.js'));
  });

  it('dropa conteúdo + auxiliares, incluindo as junctions que perdem FKs no CASCADE', async () => {
    await resetDb();

    const dropped = droppedTables();
    expect(dropped).toEqual(expect.arrayContaining([
      'post_tags', 'post_categories', 'tags', 'categories',
      'dicas', 'videos', 'musicas', 'posts',
    ]));
    // NÃO dropa products (sem schema JSON; dados preservados) nem tabelas de infra
    expect(dropped).not.toContain('products');
    expect(dropped).not.toContain('users');
    expect(dropped).not.toContain('settings');
    expect(dropped).not.toContain('roles');
  });

  it('limpa _migrations por inteiro e reaplica todas as migrations via run()', async () => {
    await resetDb();

    expect(ensureMigrationTable).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls.some((call) => call[0] === 'DELETE FROM _migrations;')).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ordem segura: junctions e auxiliares antes das tabelas que elas referenciam', async () => {
    await resetDb();

    const dropped = droppedTables();
    const idx = (name) => dropped.indexOf(name);

    // Junctions (referenciam posts/categories/tags) dropadas ANTES dos pais —
    // com CASCADE na ordem inversa, dropar posts apagaria as junctions de vez
    // e dropar categories/tags destruiria as FKs antes do DELETE das junctions
    expect(idx('post_tags')).toBeLessThan(idx('tags'));
    expect(idx('post_tags')).toBeLessThan(idx('posts'));
    expect(idx('post_categories')).toBeLessThan(idx('categories'));
    expect(idx('post_categories')).toBeLessThan(idx('posts'));
  });
});
