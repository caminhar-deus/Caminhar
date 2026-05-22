#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function backupPosts() {
  console.log('📦 Iniciando backup da tabela posts...');

  try {
    // Busca todos os dados da tabela posts
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY id ASC');
    
    if (rows.length === 0) {
      console.log('⚠️  Nenhum post encontrado para backup.');
      return;
    }

    // Define o diretório de backup
    const backupDir = path.resolve(__dirname, '../data/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Cria o arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `posts-backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));

    console.log(`✅ Backup concluído com sucesso!`);
    console.log(`   📄 Arquivo salvo em: ${filePath}`);
    console.log(`   📊 Total de registros salvos: ${rows.length}`);

  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backupPosts();