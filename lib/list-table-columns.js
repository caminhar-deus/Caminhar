import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function listTableColumns() {
  console.log('📋 Listando colunas das tabelas "videos" e "posts"...\n');

  try {
    const query = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('videos', 'posts')
      ORDER BY table_name, ordinal_position;
    `;
    
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      console.log('⚠️  Nenhuma coluna encontrada. Verifique se as tabelas existem.');
    } else {
      let currentTable = '';
      
      rows.forEach((row) => {
        if (row.table_name !== currentTable) {
          currentTable = row.table_name;
          console.log(`\n📦 Tabela: ${currentTable.toUpperCase()}`);
          console.log('   ------------------------------------------------');
        }
        console.log(`   🔹 ${row.column_name.padEnd(20)} | ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Erro ao listar colunas:', error);
  } finally {
    await pool.end();
  }
}

listTableColumns();