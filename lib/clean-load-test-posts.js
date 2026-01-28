import { loadEnvConfig } from '@next/env';
import pg from 'pg';

// Carrega variáveis de ambiente para scripts standalone
loadEnvConfig(process.cwd());

async function cleanLoadTestPosts() {
  console.log('🧹 Iniciando limpeza dos posts de teste de carga...');

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  try {
    const result = await pool.query("DELETE FROM posts WHERE slug LIKE 'post-carga-%'");
    console.log(`✅ ${result.rowCount} post(s) de teste de carga foram removidos.`);
  } catch (error) {
    console.error('❌ Erro ao limpar posts de teste de carga:', error.message);
    process.exit(1);
  }
}

cleanLoadTestPosts();