#!/usr/bin/env node
/**
 * Prepares an already-existing PostgreSQL database for tests/CI.
 *
 * Idempotent: running it twice must not fail and must not drop anything.
 * It does NOT create roles or databases (the CI service already does that,
 * and this script has no superuser privileges).
 *
 * Steps:
 *   1. Resolve the connection string from TEST_DB_* vars (CI) or DATABASE_URL.
 *   2. Wait for PostgreSQL to become reachable (up to ~60s, with backoff).
 *   3. Create the content tables (posts, videos, musicas, dicas) ONLY if missing.
 *   4. Apply pending migrations (scripts/migrate.js as a subprocess).
 *   5. Optionally run seeds when invoked with --seed.
 *
 * Content tables MUST be created BEFORE migrations (same order as
 * README.md: `npm run db:reset` followed by `npm run migrate`), because:
 *   (a) migrations 012/013/014 create indexes on posts/videos/musicas/dicas
 *       (idx_posts_*, idx_musicas_*, idx_videos_*, idx_*_trgm,
 *       idx_dicas_published_id) and those tables are NOT created by the
 *       migrations — on an empty database the CREATE INDEX would fail with
 *       42P01 (relation does not exist) and abort migrate.js;
 *   (b) migrations 007/008/009 add the `position` column, which is absent
 *       from scripts/schemas/*.json — if the tables were created after the
 *       migrations, 007-009 would already be recorded in _migrations and
 *       never run again, leaving `position` missing (breaks
 *       lib/domain/videos.js ORDER BY position / MAX(position)).
 *
 * Usage:
 *   node scripts/setup-test-db.js [--seed]
 */
import { spawnSync } from 'child_process';
import pg from 'pg';
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';
import {
  loadSchemaFromDir,
  buildCreateTableSQL,
  validateIdentifier,
} from './utils/init-table-utils.js';

const CONTENT_TABLES = ['posts', 'videos', 'musicas', 'dicas'];
const CONNECT_TIMEOUT_MS = 60_000;
const CONNECT_TIMEOUT_PER_ATTEMPT_MS = 5_000;
const MIGRATION_TIMEOUT_MS = 120_000;
const SEED_TIMEOUT_MS = 300_000;
// SQLSTATE codes that never improve with retry: authentication failed and
// "database does not exist". Everything else (ECONNREFUSED, ETIMEDOUT,
// 57P03 database starting up, 08006/08001 connection exceptions — and any
// unknown code) is treated as transient and keeps the backoff loop.
const NON_RETRYABLE_ERROR_CODES = new Set(['28P01', '3D000']);

loadEnv();

/** Masks the password in a connection string so it is never logged. */
function maskPassword(url) {
  if (!url) return '(not set)';
  return url.replace(/:([^:/@]+)@/, ':****@');
}

/** Sleep helper for the retry loop. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves the connection string.
 * Priority: TEST_DB_* variables (set by .github/actions/setup-db) > DATABASE_URL.
 *
 * @returns {string|null} The connection string, or null when neither source exists.
 */
function resolveDatabaseUrl() {
  const { TEST_DB_HOST, TEST_DB_PORT, TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASS } = process.env;
  const testVars = [TEST_DB_HOST, TEST_DB_PORT, TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASS];

  if (testVars.every(Boolean)) {
    const user = encodeURIComponent(TEST_DB_USER);
    const pass = encodeURIComponent(TEST_DB_PASS);
    const name = encodeURIComponent(TEST_DB_NAME);
    return `postgresql://${user}:${pass}@${TEST_DB_HOST}:${TEST_DB_PORT}/${name}`;
  }

  if (testVars.some(Boolean)) {
    console.warn('⚠️  Partial TEST_DB_* configuration detected — falling back to DATABASE_URL.');
  }

  return process.env.DATABASE_URL || null;
}

/** Human-readable target (host:port/db as user), safe for logs. */
function describeTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const port = url.port || '5432';
    const dbName = url.pathname.replace(/^\//, '') || '(default)';
    return `${url.hostname}:${port}/${dbName} as ${url.username || '(unknown)'}`;
  } catch {
    return maskPassword(databaseUrl);
  }
}

/**
 * Waits until PostgreSQL accepts connections.
 * The CI service container can take a while to become healthy, so retry
 * with backoff for up to ~60s before aborting with diagnostics.
 * Non-retryable errors (28P01 auth, 3D000 database does not exist) abort
 * immediately instead of burning the full 60s.
 */
async function waitForConnection(databaseUrl) {
  const target = describeTarget(databaseUrl);
  const deadline = Date.now() + CONNECT_TIMEOUT_MS;
  let attempt = 0;
  let lastError = null;

  console.log(`🔌 Waiting for PostgreSQL at ${target} (up to ${CONNECT_TIMEOUT_MS / 1000}s)...`);

  while (Date.now() < deadline) {
    attempt += 1;
    const client = new pg.Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: CONNECT_TIMEOUT_PER_ATTEMPT_MS,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log(`✅ PostgreSQL is reachable (attempt ${attempt}).`);
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* client never fully opened — nothing to close */
      }

      if (NON_RETRYABLE_ERROR_CODES.has(error.code)) {
        throw new Error(
          `PostgreSQL at ${target} rejected the connection with a non-retryable error ` +
            `(${error.code}: ${error.message}). Retrying would not help — check the credentials and the database name.`,
          { cause: error }
        );
      }

      const remainingSec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const delayMs = Math.min(2_000 * attempt, 10_000);
      console.log(
        `⏳ Not ready yet (${error.code || error.message}) — retrying in ${delayMs}ms (${remainingSec}s left)...`
      );
      if (Date.now() + delayMs < deadline) {
        await sleep(delayMs);
      }
    }
  }

  const detail = lastError
    ? `${lastError.code ? `${lastError.code}: ` : ''}${lastError.message}`
    : 'no attempt completed';
  throw new Error(
    `PostgreSQL at ${target} was not reachable after ${CONNECT_TIMEOUT_MS / 1000}s. ` +
      `Last error: ${detail}. Check that the database exists, is listening on the given host/port, and that the credentials are correct.`
  );
}

/** Runs a Node script as a subprocess with DATABASE_URL injected. */
function runNodeScript(scriptPath, databaseUrl, timeoutMs) {
  console.log(`\n▶️  Running ${scriptPath}...`);
  const result = spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    timeout: timeoutMs,
    cwd: process.cwd(),
  });

  if (result.error) {
    throw new Error(`Could not run ${scriptPath}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed with exit code ${result.status}.`);
  }
}

/**
 * Creates the content tables (posts, videos, musicas, dicas) only when they
 * do not exist yet. Never drops anything — scripts/init-table.js is NOT used
 * here because it honors `dropBeforeCreate` (DROP TABLE ... CASCADE).
 *
 * Must run BEFORE scripts/migrate.js (see the header "Steps" block):
 *   (a) migrations 012/013/014 create indexes on these tables
 *       (idx_posts_*, idx_musicas_*, idx_videos_*, idx_*_trgm,
 *       idx_dicas_published_id) and fail with 42P01 when they are missing;
 *   (b) migrations 007/008/009 add the `position` column, which is not part
 *       of scripts/schemas/*.json — running the migrations first would mark
 *       007-009 as applied and they would never add `position` afterwards.
 */
async function ensureContentTables() {
  console.log('\n🗂️  Checking content tables...');

  const missing = [];
  for (const tableName of CONTENT_TABLES) {
    const safeName = validateIdentifier(tableName, 'table name');
    const result = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [safeName]
    );
    if (result.rowCount === 0) {
      missing.push(safeName);
    }
  }

  if (missing.length === 0) {
    console.log(
      `✅ Content tables already exist (${CONTENT_TABLES.join(', ')}) — nothing to create.`
    );
    return;
  }

  const schemasDir = new URL('./schemas', import.meta.url).pathname;
  for (const tableName of missing) {
    const schema = loadSchemaFromDir(tableName, schemasDir);
    const safeName = validateIdentifier(schema.table, 'table name');
    // buildCreateTableSQL emits CREATE TABLE IF NOT EXISTS — non-destructive.
    await query(buildCreateTableSQL(schema, safeName));
    console.log(`✅ Created content table "${safeName}".`);
  }
  console.log(`🎉 Content tables ready: ${CONTENT_TABLES.join(', ')}.`);
}

async function main() {
  console.log('🧪 Setting up test database...');

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      'No database connection configured. Set the TEST_DB_HOST, TEST_DB_PORT, TEST_DB_NAME, ' +
        'TEST_DB_USER and TEST_DB_PASS variables (CI), or DATABASE_URL (local fallback).'
    );
  }

  // Make the resolved URL visible to this process (pool) and to subprocesses.
  process.env.DATABASE_URL = databaseUrl;
  console.log(`🗄️  Target: ${maskPassword(databaseUrl)}`);

  await waitForConnection(databaseUrl);

  // Content tables first, migrations second (see the header "Steps" block):
  // migrations 012/013/014 index these tables and 007/008/009 add the
  // `position` column they do not define — both need the tables to exist.
  await ensureContentTables();

  runNodeScript('scripts/migrate.js', databaseUrl, MIGRATION_TIMEOUT_MS);

  if (process.argv.includes('--seed')) {
    runNodeScript('scripts/seed-all.js', databaseUrl, SEED_TIMEOUT_MS);
  } else {
    console.log('\nℹ️  Skipping seeds (pass --seed to run scripts/seed-all.js).');
  }
}

let exitCode = 0;
try {
  await main();
  console.log('\n🎉 Test database setup completed successfully.');
} catch (error) {
  console.error(`\n❌ Test database setup failed: ${error.message}`);
  exitCode = 1;
} finally {
  try {
    await closePool();
  } catch (error) {
    console.warn(`⚠️  closePool() failed (ignored): ${error.message}`);
  }
}

// Use exitCode instead of process.exit() so buffered stdout is fully flushed.
process.exitCode = exitCode;
