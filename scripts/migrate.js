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
async function ensureMigrationTable(pool) {
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
async function getAppliedMigrations(pool) {
  const result = await pool.query(`SELECT name FROM ${MIGRATION_TABLE} ORDER BY id`);
  return new Set(result.rows.map(r => r.name));
}

/**
 * Lista arquivos de migração no diretório, ordenados por prefixo numérico.
 * Retorna apenas arquivos .js com padrão NNN-*.js
 */
function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Diretório de migrações não encontrado: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}-.+\.js$/.test(f))
    .sort();

  return files;
}

/**
 * Extrai o nome da migração a partir do nome do arquivo (ex: "001-add-views-to-posts").
 */
function migrationNameFromFile(filename) {
  return filename.replace(/\.js$/, '');
}

/**
 * Aplica uma migração dentro de uma transação.
 */
async function applyMigration(pool, filename) {
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
 * Reverte a última migração aplicada.
 */
async function revertLastMigration(pool) {
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

  if (!fs.existsSync(filePath)) {
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
async function listStatus(pool) {
  const applied = await getAppliedMigrations(pool);
  const files = listMigrationFiles();

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
function showHelp() {
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

// ─── Main ──────────────────────────────────────────────────────────────
(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const pool = getPool();

  try {
    await ensureMigrationTable(pool);

    if (args.includes('--status')) {
      await listStatus(pool);
      process.exit(0);
    }

    if (args.includes('--revert')) {
      await revertLastMigration(pool);
      process.exit(0);
    }

    // Modo padrão: aplicar pendentes
    const applied = await getAppliedMigrations(pool);
    const files = listMigrationFiles();

    const pending = files.filter(f => !applied.has(migrationNameFromFile(f)));

    if (pending.length === 0) {
      console.log('✅ Todas as migrações já foram aplicadas.');
      process.exit(0);
    }

    console.log(`📦 ${pending.length} migração(ões) pendente(s) para aplicar:\n`);

    let appliedCount = 0;
    for (const file of pending) {
      await applyMigration(pool, file);
      appliedCount++;
    }

    console.log(`\n🎉 ${appliedCount} migração(ões) aplicada(s) com sucesso!`);
  } catch (error) {
    console.error(`\n❌ Erro fatal: ${error.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
})();