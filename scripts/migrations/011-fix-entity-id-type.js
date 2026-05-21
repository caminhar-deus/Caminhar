import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '011-fix-entity-id-type';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Alterando entity_id de INTEGER para BIGINT em activity_logs...`);

  // Verifica o tipo atual da coluna entity_id
  const columnCheck = await pool.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'activity_logs' AND column_name = 'entity_id'`
  );

  if (columnCheck.rows.length === 0) {
    console.log('   ⚠️ Coluna entity_id não encontrada. Criando tabela activity_logs com entity_id BIGINT...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    const currentType = columnCheck.rows[0].data_type;
    console.log(`   Tipo atual de entity_id: ${currentType}`);

    if (currentType === 'integer' || currentType === 'int4') {
      console.log('   🔄 Alterando tipo de entity_id de INTEGER para BIGINT...');
      await pool.query('ALTER TABLE activity_logs ALTER COLUMN entity_id TYPE BIGINT USING entity_id::bigint');
    } else if (currentType === 'bigint') {
      console.log('   ✅ entity_id já é BIGINT. Nenhuma alteração necessária.');
    } else {
      console.log(`   ⚠️ Tipo inesperado (${currentType}). Pulando alteração.`);
    }
  }

  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Revertendo entity_id de BIGINT para INTEGER em activity_logs...`);

  const columnCheck = await pool.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'activity_logs' AND column_name = 'entity_id'`
  );

  if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'bigint') {
    await pool.query('ALTER TABLE activity_logs ALTER COLUMN entity_id TYPE INTEGER USING entity_id::integer');
    console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
  } else {
    console.log(`   ⚠️ entity_id não está como BIGINT. Nada a reverter.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('011-fix-entity-id-type.js')) {
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