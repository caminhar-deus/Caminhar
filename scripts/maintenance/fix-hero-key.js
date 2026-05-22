#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixHeroKey() {
  console.log('🔧 Corrigindo chaves de imagem no banco de dados...');

  try {
    // 1. Buscar a imagem que sabemos que existe (site_image)
    const res = await pool.query("SELECT value FROM settings WHERE key = 'site_image'");
    
    if (res.rows.length === 0) {
      console.log('❌ Nenhuma imagem encontrada na chave "site_image".');
      return;
    }

    const imagePath = res.rows[0].value;
    console.log(`📸 Imagem encontrada em [site_image]: ${imagePath}`);

    // 2. Definir chaves alternativas que o frontend pode estar usando
    const targetKeys = ['hero_image', 'header_image'];

    for (const key of targetKeys) {
      console.log(`   ➡ Atualizando chave: [${key}]`);
      await pool.query(`
        INSERT INTO settings (key, value, type, description, updated_at)
        VALUES ($1, $2, 'image', 'Imagem Principal (Fix)', CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, imagePath]);
    }

    console.log('✅ Correção aplicada! As chaves "hero_image" e "header_image" agora apontam para a imagem correta.');
    console.log('👉 Recarregue a página inicial (http://localhost:3000) para testar.');

  } catch (error) {
    console.error('❌ Erro ao corrigir chaves:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixHeroKey();