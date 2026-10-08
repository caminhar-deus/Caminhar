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

export async function clearUploadsDir() {
  // Mesma resolução da aplicação (UPLOADS_DIR ou <cwd>/uploads) + o legado
  // public/uploads. Diretórios inexistentes são ignorados; o caminho duplicado
  // (UPLOADS_DIR apontando para o legado) é considerado uma única vez.
  const uploadDirs = [
    path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')),
    path.join(process.cwd(), 'public', 'uploads'),
  ].filter((dir, index, dirs) => dirs.indexOf(dir) === index);

  const clearedDirs = [];
  const missingDirs = [];

  for (const dir of uploadDirs) {
    try {
      await fs.promises.access(dir);
    } catch {
      missingDirs.push(dir);
      continue;
    }

    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        // Evita apagar o próprio diretório ou arquivos de controle como .gitkeep
        if (file !== '.gitkeep') {
          await fs.promises.unlink(path.join(dir, file));
        }
      }
      clearedDirs.push(dir);
    } catch (err) {
      console.warn(`⚠️  Erro ao limpar '${dir}': ${err.message}`);
    }
  }

  if (clearedDirs.length > 0) {
    console.log(`✅ Diretório(s) de uploads limpo(s): ${clearedDirs.join(', ')}`);
  } else {
    console.log('ℹ️  Diretório de uploads não encontrado, nada a limpar.');
  }
  for (const dir of missingDirs) {
    console.log(`ℹ️  Diretório de uploads não encontrado (ignorado): ${dir}`);
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

// Execução principal — só quando invocado como CLI (`node scripts/clear-db.js`),
// no mesmo estilo de `clean-orphaned-images.js`. Importar o módulo (ex.: nos
// testes de `clearUploadsDir`) não pode pedir confirmação nem tocar o banco.
// O corpo vai dentro de uma IIFE assíncrona porque o Babel compila o script
// como CommonJS e não há suporte a top-level `await` nessa transformação.
if (process.argv[1] && process.argv[1].endsWith('clear-db.js')) {
  (async () => {
    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log('❌ Operação cancelada pelo usuário.');
      process.exit(0);
    }

    await clearDatabase();
  })();
}