// Arquivo: scripts/migrations/007-add-position-to-musicas.js
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const { query } = await import('../../lib/db.js');

async function migrate() {
  console.log('Iniciando migração: Adicionar coluna position na tabela musicas...');
  try {
    await query('ALTER TABLE musicas ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 9999;');
    console.log('✅ Coluna "position" adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

migrate();