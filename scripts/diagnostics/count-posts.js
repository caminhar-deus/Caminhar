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

async function countPosts() {
  console.log('🔍 Contando o número total de posts no banco de dados...');
  
  try {
    const res = await pool.query('SELECT COUNT(*) FROM posts;');
    const count = res.rows[0].count;
    console.log(`✅ Total de posts encontrados: ${count}`);
    
    if (parseInt(count, 10) > 10) { // Assumindo um tamanho de página padrão de 10
        console.log('ℹ️  O número de posts é maior que 10. É muito provável que o post que você procura esteja em outra página na área administrativa.');
    }

  } catch (error) {
    console.error('❌ Erro ao contar posts:', error.message);
  } finally {
    await pool.end();
  }
}

countPosts();