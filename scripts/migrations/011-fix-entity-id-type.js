import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function runMigration() {
  console.log('🚀 Executando migração: 011-fix-entity-id-type');
  console.log('   Objetivo: Alterar entity_id de INTEGER para BIGINT em activity_logs');
  console.log('   Motivo: Date.now() retorna timestamps > 2.1B (limite de INTEGER), causando erro "out of range"');
  console.log('');

  const { query, closeDatabase } = await import('../../lib/db.js');

  try {
    // Verifica o tipo atual da coluna entity_id
    const columnCheck = await query(
      `SELECT data_type FROM information_schema.columns 
       WHERE table_name = 'activity_logs' AND column_name = 'entity_id'`,
      [],
      { log: false }
    );

    if (columnCheck.rows.length === 0) {
      console.log('   ⚠️ Coluna entity_id não encontrada. Criando tabela activity_logs...');
      await query(`
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
      console.log('   ✅ Tabela activity_logs criada com entity_id como BIGINT.');
    } else {
      const currentType = columnCheck.rows[0].data_type;
      console.log(`   Tipo atual de entity_id: ${currentType}`);

      if (currentType === 'integer' || currentType === 'int4') {
        console.log('   🔄 Alterando tipo de entity_id de INTEGER para BIGINT...');
        
        // PostgreSQL não permite ALTER COLUMN TYPE diretamente se houver dados
        // Usamos USING para converter os valores existentes
        await query(`ALTER TABLE activity_logs ALTER COLUMN entity_id TYPE BIGINT USING entity_id::bigint`);
        console.log('   ✅ entity_id alterado para BIGINT com sucesso.');
      } else if (currentType === 'bigint') {
        console.log('   ✅ entity_id já é BIGINT. Nenhuma alteração necessária.');
      } else {
        console.log(`   ⚠️ Tipo inesperado (${currentType}). Pulando alteração.`);
      }
    }

    console.log('');
    console.log('✅ Migração 011 concluída com sucesso!');
    console.log('   entity_id em activity_logs agora aceita valores de timestamp (Date.now()).');

  } catch (error) {
    console.error('❌ Erro ao executar a migração:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigration();