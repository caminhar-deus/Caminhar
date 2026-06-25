/**
 * Helper para Testes com PostgreSQL Real.
 * 
 * Fornece utilitários para gerenciar conexão, transações e migrações
 * em testes de integração com banco de dados real.
 */
import pg from 'pg';
import { execSync } from 'child_process';
import { validateIdentifier } from '../../scripts/utils/init-table-utils.js';

const PROJECT_ROOT = process.cwd();

/**
 * Verifica se o Docker está disponível para os testes com banco real.
 * A string de conexão é definida pelo globalSetup.
 */
export function isDockerAvailable() {
  return process.env.TEST_DATABASE_URL && 
         process.env.TEST_DATABASE_URL !== '__docker_unavailable__';
}

/**
 * Cria uma conexão com o banco de teste.
 * A string de conexão vem de process.env.TEST_DATABASE_URL,
 * definida pelo globalSetup.
 */
export function createTestDb() {
  if (!isDockerAvailable()) {
    throw new Error('Docker não está disponível. Execute testes com --config jest.config.db.js');
  }

  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 5,
  });

  return pool;
}

/**
 * Aplica as migrações no banco de teste.
 * Executa scripts/migrate.js como subprocesso com DATABASE_URL do container.
 */
export async function applyMigrations() {
  try {
    execSync('node scripts/migrate.js', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (error) {
    const stderr = error.stderr?.toString() || error.message;
    // Ignorar erro se todas as migrações já foram aplicadas
    if (stderr.includes('already been applied')) {
      return;
    }
    throw new Error(`Falha ao aplicar migrações: ${stderr}`);
  }
}

/**
 * Inicia uma transação que será revertida ao final do teste.
 * Retorna { query, rollback } onde query é a função de query dentro da transação.
 * 
 * Segurança:
 * - Se pool.connect() ou BEGIN falharem, o cliente é liberado automaticamente
 * - rollback() possui try/catch para evitar que exceção quebre o afterEach
 * - rollback() sempre libera o cliente, mesmo se ROLLBACK falhar
 * 
 * ⚠️ Atenção: Não utilize describe aninhados com tx própria dentro deste describe,
 *    pois a variável tx do escopo superior pode ser sobrescrita.
 */
export async function withTransaction(pool) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
  } catch (error) {
    if (client) {
      try { client.release(); } catch (_) { /* ignorar erro no release após falha */ }
    }
    throw error;
  }

  return {
    query: (text, params) => client.query(text, params),
    rollback: async () => {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Loga o erro mas não propaga — o afterEach não deve quebrar por falha de rollback
        console.warn('⚠️ ROLLBACK falhou (ignorado):', rollbackError.message);
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Limpa todas as tabelas do banco de teste (TRUNCATE).
 * Útil entre suites que não usam transação.
 * Os nomes das tabelas vêm do catálogo do PostgreSQL, e são validados
 * como identificadores seguros antes de interpolar na query.
 */
export async function truncateAll(pool) {
  const result = await pool.query(`
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `);

  for (const row of result.rows) {
    // Valida o nome da tabela como identificador seguro antes de usar
    const safeTableName = validateIdentifier(row.tablename, 'nome da tabela');
    await pool.query(`TRUNCATE TABLE "${safeTableName}" CASCADE`);
  }
}