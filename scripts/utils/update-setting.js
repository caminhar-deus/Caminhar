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

async function updateSetting() {
  // Pega os argumentos da linha de comando (ignorando node e o nome do script)
  // Ex: node lib/update-setting.js <chave> <valor> [tipo] [descricao]
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('❌ Uso incorreto.');
    console.log('👉 Uso: node lib/update-setting.js <chave> <valor> [tipo] [descricao]');
    console.log('   Exemplo: node lib/update-setting.js site_title "Meu Novo Título" string "Título do site"');
    process.exit(1);
  }

  const [key, value, type = 'string', description = 'Atualizado via CLI'] = args;

  console.log(`🔄 Atualizando configuração: [${key}]...`);

  try {
    const query = `
      INSERT INTO settings (key, value, type, description, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, type = $3, description = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [key, value, type, description]);
    
    console.log('✅ Configuração salva com sucesso!');
    console.log(`   🔹 ${rows[0].key}: ${rows[0].value}`);

  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
  } finally {
    await pool.end();
  }
}

updateSetting();