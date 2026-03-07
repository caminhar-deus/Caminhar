import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function checkVideosSchema() {
  console.log('🔍 Verificando schema da tabela videos...');
  
  try {
    // Verifica o valor default de created_at na tabela videos
    const res = await pool.query(`
      SELECT column_name, column_default, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'videos' AND column_name = 'created_at';
    `);

    if (res.rows.length === 0) {
      console.log('❌ Coluna created_at não encontrada na tabela videos.');
    } else {
      const col = res.rows[0];
      console.log('✅ Detalhes da coluna created_at:');
      console.table([col]);
      
      if (!col.column_default) {
        console.warn('⚠️  Aviso: Não há valor default configurado no banco (esperado: CURRENT_TIMESTAMP ou similar).');
      } else {
        console.log(`ℹ️  Valor default configurado: ${col.column_default}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkVideosSchema();