#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

function askConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('⚠️  Tem certeza que deseja limpar TODAS as tabelas do banco? (s/N) ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 's' || answer.trim().toLowerCase() === 'sim');
    });
  });
}

async function clearUploadsDir() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await fs.promises.access(uploadDir);
    const files = await fs.promises.readdir(uploadDir);
    for (const file of files) {
      // Evita apagar o próprio diretório ou arquivos de controle como .gitkeep
      if (file !== '.gitkeep') {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    }
    console.log('✅ Diretório de uploads limpo.');
  } catch {
    console.log('ℹ️  Diretório de uploads não encontrado, nada a limpar.');
  }
}

async function clearDatabase() {
  try {
    console.log('🗑️  Esvaziando todas as tabelas do banco de dados...');

    // TRUNCATE limpa os dados mais rápido que DELETE
    // RESTART IDENTITY reseta os IDs para 1
    // CASCADE limpa tabelas dependentes (ex: images que dependem de users)
    await query(`
      TRUNCATE TABLE 
        posts, videos, musicas, images, settings, users 
      RESTART IDENTITY CASCADE;
    `);

    console.log('✅ Banco de dados limpo com sucesso! (Estrutura mantida, dados removidos)');
    await clearUploadsDir();
  } catch (error) {
    console.error('❌ Erro ao limpar o banco de dados:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Execução principal
const confirmed = await askConfirmation();
if (!confirmed) {
  console.log('❌ Operação cancelada pelo usuário.');
  process.exit(0);
}

await clearDatabase();