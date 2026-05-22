#!/usr/bin/env node
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

async function listSettings() {
  console.log('📋 Listando todas as configurações do banco de dados...\n');

  try {
    const query = 'SELECT key, value, description, type, updated_at FROM settings ORDER BY key ASC';
    const { rows, rowCount } = await pool.query(query);

    if (rowCount === 0) {
      console.log('⚠️  Nenhuma configuração encontrada na tabela "settings".');
    } else {
      console.log(`✅ Total de configurações: ${rowCount}\n`);
      
      rows.forEach((row) => {
        console.log(`🔹 [${row.key}] (${row.type || 'string'})`);
        console.log(`   Valor: ${row.value}`);
        if (row.description) {
          console.log(`   Desc:  ${row.description}`);
        }
        console.log('   ------------------------------------------------');
      });
    }

  } catch (error) {
    console.error('❌ Erro ao listar configurações:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listSettings();