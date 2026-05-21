#!/usr/bin/env node
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { POST_ALERT_THRESHOLD } from '../utils/constants.js';

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
    
    if (parseInt(count, 10) > POST_ALERT_THRESHOLD) {
        console.log(`ℹ️  O número de posts é maior que ${POST_ALERT_THRESHOLD}. É muito provável que o post que você procure esteja em outra página na área administrativa.`);
    }

  } catch (error) {
    console.error('❌ Erro ao contar posts:', error.message);
  } finally {
    await pool.end();
  }
}

countPosts();
