import 'dotenv/config';
import { query } from './db.js';

async function migrateVideos() {
  console.log('🔄 Iniciando atualização do banco de dados (Tabela Videos)...');

  try {
    // 1. Garante que a tabela existe (caso seja uma instalação nova)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        url_youtube TEXT NOT NULL,
        descricao TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await query(createTableQuery);
    console.log('✅ Tabela videos verificada.');

    // 2. Adiciona a coluna descricao caso ela não exista (ALTER TABLE)
    const alterTableQuery = `
      ALTER TABLE videos 
      ADD COLUMN IF NOT EXISTS descricao TEXT;
    `;
    await query(alterTableQuery);
    console.log('✅ Coluna "descricao" adicionada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  } finally {
    process.exit();
  }
}

migrateVideos();