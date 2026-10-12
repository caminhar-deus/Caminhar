#!/usr/bin/env node

import readline from 'readline';
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

export function askConfirmation() {
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

export async function clearMusicRecords() {
  try {
    console.log('🗑️  Limpando todas as músicas do banco de dados...');
    const result = await query('DELETE FROM musicas');
    console.log(`✅ Tabela de músicas limpa com sucesso! (${result.rowCount} registro(s) removido(s))`);
  } catch (error) {
    console.error('❌ Erro ao limpar músicas:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Execução principal — só quando invocado como CLI (`node scripts/clear-musicas.js`),
// no mesmo estilo de `clear-db.js`. Importar o módulo (ex.: nos testes) não pode
// pedir confirmação nem tocar no banco.
// O corpo mora em `main()` (exportada para os testes fazerem `await main()` de
// forma determinística — a IIFE antiga não devolvia a promise, o que tornaria o
// teste do caminho "cancelado" dependente de poll de microtasks).
// A guarda chama `main()` sem `await` porque o Babel compila o script como
// CommonJS e não há suporte a top-level `await` nessa transformação.
export async function main() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('❌ Operação cancelada pelo usuário.');
    process.exit(0);
  }

  await clearMusicRecords();
}

if (process.argv[1] && process.argv[1].endsWith('clear-musicas.js')) {
  main();
}
