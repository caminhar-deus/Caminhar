#!/usr/bin/env node

import readline from 'readline';
import { loadEnv } from './utils/load-env.js';
import { query, closeDatabase } from '../lib/db.js';

loadEnv();

function askConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('⚠️  Tem certeza que deseja limpar TODAS as músicas? (s/N) ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 's' || answer.trim().toLowerCase() === 'sim');
    });
  });
}

async function clearMusicRecords() {
  try {
    console.log('🗑️  Limpando todas as músicas do banco de dados...');
    const result = await query('DELETE FROM musicas');
    console.log(`✅ Tabela de músicas limpa com sucesso! (${result.rowCount} registro(s) removido(s))`);
  } catch (error) {
    console.error('❌ Erro ao limpar músicas:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Execução principal
const confirmed = await askConfirmation();
if (!confirmed) {
  console.log('❌ Operação cancelada pelo usuário.');
  process.exit(0);
}

await clearMusicRecords();
