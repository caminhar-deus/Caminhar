#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { loadEnv } from './utils/load-env.js';
import { getPool, closePool } from './db/connection.js';

loadEnv();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'scripts/migrations');
const MIGRATION_TABLE = '_migrations';

/**
 * Cria a tabela de controle de migrações, se não existir.
 */
export async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Retorna as migrações já aplicadas (nomes).
 */
export async function getAppliedMigrations(pool) {
  const result = await pool.query(`SELECT name FROM ${MIGRATION_TABLE} ORDER BY id`);
  return new Set(result.rows.map(r => r.name));
}

/**
 * Lista arquivos de migração no diretório, ordenados por prefixo numérico.
 * Retorna apenas arquivos .js com padrão NNN-*.js
 */
export async function listMigrationFiles() {
  let files;
  try {
    files = await fs.promises.readdir(MIGRATIONS_DIR);
  } catch {
    console.error(`❌ Diretório de migrações não encontrado: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  return files
    .filter(f => /^\d{3}-.+\.js$/.test(f))
    .sort();
}

/**
 * Extrai o nome da migração a partir do nome do arquivo (ex: "001-add-views-to-posts").
 */
export function migrationNameFromFile(filename) {
  return filename.replace(/\.js$/, '');
}

/**
 * Aplica uma migração dentro de uma transação.
 */
export async function applyMigration(pool, filename) {
  const name = migrationNameFromFile(filename);
  const filePath = path.join(MIGRATIONS_DIR, filename);

  console.log(`\n▶️  Executando: ${name}`);

  const migration = await import(`file://${filePath}`);

  if (typeof migration.up !== 'function') {
    console.error(`   ❌ Migração ${name} não exporta uma função "up". Pulando.`);
    return false;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await migration.up(client);

    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (name) VALUES ($1)`,
      [name]
    );

    await client.query('COMMIT');
    console.log(`   ✅ ${name} registrada na tabela ${MIGRATION_TABLE}.`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Falha em ${name}: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Chave do advisory lock que serializa execuções CONCORRENTES de migrate.js.
 *
 * 0x63616d69 = ASCII "cami" (prefixo de "caminhar"): valor pequeno, seguro em
 * Number do JS e em bigint do PostgreSQL (função `pg_advisory_lock(bigint)`).
 *
 * Motivo: vários `migrate.js` podem disputar o mesmo banco ao mesmo tempo
 * (ex.: as 6 suítes `*.db.test.js` chamam `applyMigrations()` no próprio
 * `beforeAll`, e o Jest roda vários workers em paralelo). Todos leem
 * `_migrations` antes de qualquer COMMIT, todos veem a migração 000 como
 * pendente e a criação CONCORRENTE da tabela colide no catálogo:
 *   duplicate key value violates unique constraint "pg_type_typname_nsp_index"
 * (não é "already been applied" — é corrida de DDL.)
 *
 * O lock é adquirido em UMA conexão dedicada e mantido durante toda a seção
 * crítica; todo outro processo bloqueia em `pg_advisory_lock` ANTES de ler
 * `_migrations`, então a leitura "o que está pendente" + a aplicação ficam
 * serializadas entre processos.
 */
const MIGRATION_LOCK_KEY = 0x63616d69; // ASCII "cami"

/**
 * Executa `criticalSection` exclusivamente entre todos os processos que
 * rodam migrate.js contra o mesmo banco.
 *
 * Libera o lock mesmo quando a seção lança (finally), e nunca propaga falha
 * do `unlock`: se a conexão já morreu, o PostgreSQL libera o lock sozinho.
 *
 * @param {import('pg').Pool} pool
 * @param {(client: import('pg').PoolClient) => Promise<void>} criticalSection
 */
export async function withMigrationLock(pool, criticalSection) {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await criticalSection(client);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    } catch (error) {
      console.error(`⚠️  Advisory lock de migração não pôde ser liberado: ${error.message}`);
    }
    client.release();
  }
}

/**
 * Reverte a última migração aplicada.
 */
export async function revertLastMigration(pool) {
  const result = await pool.query(
    `SELECT name FROM ${MIGRATION_TABLE} ORDER BY id DESC LIMIT 1`
  );

  if (result.rows.length === 0) {
    console.log('ℹ️  Nenhuma migração para reverter.');
    return;
  }

  const name = result.rows[0].name;
  const filename = `${name}.js`;
  const filePath = path.join(MIGRATIONS_DIR, filename);

  try {
    await fs.promises.access(filePath);
  } catch {
    console.error(`❌ Arquivo de migração não encontrado: ${filename}`);
    process.exit(1);
  }

  console.log(`\n↩️  Revertendo: ${name}`);

  const migration = await import(`file://${filePath}`);

  if (typeof migration.down !== 'function') {
    console.error(`   ❌ Migração ${name} não exporta uma função "down".`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await migration.down(client);

    await client.query(
      `DELETE FROM ${MIGRATION_TABLE} WHERE name = $1`,
      [name]
    );

    await client.query('COMMIT');
    console.log(`   ✅ ${name} revertida e removida da tabela ${MIGRATION_TABLE}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Falha ao reverter ${name}: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Lista o status de todas as migrações (aplicadas vs pendentes).
 */
export async function listStatus(pool) {
  const applied = await getAppliedMigrations(pool);
  const files = await listMigrationFiles();

  console.log('\n📋 Status das Migrações:');
  console.log('─'.repeat(60));

  for (const file of files) {
    const name = migrationNameFromFile(file);
    const status = applied.has(name) ? '✅ Aplicada' : '⏳ Pendente';
    console.log(`  ${status}  ${name}`);
  }

  console.log('─'.repeat(60));
  console.log(`   Total: ${files.length} | Aplicadas: ${applied.size} | Pendentes: ${files.length - applied.size}`);
}

/**
 * Exibe mensagem de ajuda.
 */
export function showHelp() {
  console.log(`
📦 Gerenciador de Migrações

Uso:
  node scripts/migrate.js                    Aplica todas as migrações pendentes
  node scripts/migrate.js --status           Mostra status das migrações
  node scripts/migrate.js --revert           Reverte a última migração aplicada
  node scripts/migrate.js --help             Exibe esta mensagem

Variáveis de ambiente:
  DATABASE_URL    Obrigatória. URL de conexão PostgreSQL.
`);
}

/**
 * Função principal que orquestra a execução da CLI.
 * Só é chamada quando o script é executado diretamente via terminal.
 */
export async function run() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const pool = getPool();

  // Código de saída adiado: um `process.exit()` dentro da seção crítica
  // abortaria o processo antes do `finally` (unlock + closePool).
  let exitCode = 0;

  try {
    // Tudo que lê `_migrations` para decidir o que aplicar (e tudo que
    // muta o esquema) roda dentro do lock — execuções concorrentes aguardam
    // em vez de disputar DDL no mesmo banco.
    await withMigrationLock(pool, async () => {
      await ensureMigrationTable(pool);

      if (args.includes('--status')) {
        await listStatus(pool);
        return;
      }

      if (args.includes('--revert')) {
        await revertLastMigration(pool);
        return;
      }

      // Modo padrão: aplicar pendentes
      const applied = await getAppliedMigrations(pool);
      const files = await listMigrationFiles();

      const pending = files.filter(f => !applied.has(migrationNameFromFile(f)));

      if (pending.length === 0) {
        console.log('✅ Todas as migrações já foram aplicadas.');
        return;
      }

      console.log(`📦 ${pending.length} migração(ões) pendente(s) para aplicar:\n`);

      let appliedCount = 0;
      for (const file of pending) {
        await applyMigration(pool, file);
        appliedCount++;
      }

      console.log(`\n🎉 ${appliedCount} migração(ões) aplicada(s) com sucesso!`);
    });
  } catch (error) {
    console.error(`\n❌ Erro fatal: ${error.message}`);
    exitCode = 1;
  } finally {
    await closePool();
  }

  process.exit(exitCode);
}

// ─── CLI Guard ──────────────────────────────────────────────────────────
// Executa a função main apenas quando chamado diretamente via terminal
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('/scripts/migrate.js') ||
  process.argv[1].endsWith('\\scripts\\migrate.js')
);

if (isMainModule) {
  run().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}