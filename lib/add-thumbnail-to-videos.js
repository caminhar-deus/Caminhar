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

async function addThumbnailColumn() {
  console.log('🔧 Adicionando coluna "thumbnail" à tabela videos...');

  try {
    // Adiciona a coluna se ela não existir
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255)');
    
    console.log('✅ Sucesso! Coluna "thumbnail" verificada/adicionada.');
    
    // Confirmação visual
    console.log('📋 Estrutura atualizada da tabela videos:');
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'videos'");
    res.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

  } catch (error) {
    console.error('❌ Erro ao alterar tabela:', error);
  } finally {
    await pool.end();
  }
}

addThumbnailColumn();