import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '006-create-activity-logs';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Criando tabela "activity_logs"...`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo tabela "activity_logs"...`);
  await pool.query('DROP TABLE IF EXISTS activity_logs CASCADE;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

if (process.argv[1] && process.argv[1].endsWith('006-create-activity-logs.js')) {
  (async () => {
    const pool = getPool();
    try {
      await up(pool);
    } catch (error) {
      console.error(`❌ Erro em ${MIGRATION_NAME}:`, error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}