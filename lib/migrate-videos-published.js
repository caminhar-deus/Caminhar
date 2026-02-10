import 'dotenv/config';
import { query } from './db.js';

async function migrateVideosPublished() {
  console.log('🔄 Atualizando tabela videos (Adicionando campo publicado)...');

  try {
    // 1. Adiciona a coluna publicado (BOOLEAN)
    // Define DEFAULT true para que vídeos antigos continuem aparecendo
    await query(`
      ALTER TABLE videos 
      ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT true;
    `);
    
    console.log('✅ Coluna "publicado" adicionada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  } finally {
    process.exit();
  }
}

migrateVideosPublished();