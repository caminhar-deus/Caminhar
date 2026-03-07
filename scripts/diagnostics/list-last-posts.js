import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function listLastPosts() {
  console.log('🔍 Listando os últimos 5 posts do banco de dados (ordenados por data de criação)...');
  
  try {
    const res = await pool.query(`
      SELECT id, title, slug, published, created_at 
      FROM posts 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);

    if (res.rows.length === 0) {
      console.log('❌ Nenhum post encontrado no banco de dados.');
    } else {
      console.log('✅ Últimos posts encontrados:');
      console.table(res.rows);
    }

  } catch (error) {
    console.error('❌ Erro ao listar posts:', error.message);
  } finally {
    await pool.end();
  }
}

listLastPosts();