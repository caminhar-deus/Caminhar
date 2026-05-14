// Script para limpar dados de teste do banco PostgreSQL.
// Uso: node scripts/utils/cleanup-test-data.js
// Ou via API: DELETE /api/admin/cleanup-test-data (autenticado como admin)

import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function run() {
  const { query, closeDatabase } = await import('../../lib/db.js');

  try {
    console.log('🧹 Limpando dados de teste do PostgreSQL...');

    // Remove posts com slug padrão de teste (ex: post-carga-*)
    const result = await query("DELETE FROM posts WHERE slug LIKE 'post-carga-%'");
    console.log(`   ✅ ${result.rowCount} posts de teste removidos.`);

    await closeDatabase();
    console.log('✅ Limpeza concluída.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error.message);
    process.exit(1);
  }
}

run();