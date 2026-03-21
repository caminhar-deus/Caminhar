// Arquivo: scripts/migrations/004-add-published-to-products.js
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const { query } = await import('../../lib/db.js');

async function migrate() {
  console.log('Iniciando migração: Adicionar coluna published na tabela products...');
  try {
    await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;');
    console.log('✅ Coluna "published" adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

migrate();