// Arquivo: scripts/migrations/005-add-last-login-to-users.js
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const { query } = await import('../../lib/db.js');

async function migrate() {
  console.log('Iniciando migração: Adicionar coluna last_login_at na tabela users...');
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;');
    console.log('✅ Coluna "last_login_at" adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

migrate();