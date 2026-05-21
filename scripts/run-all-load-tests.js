#!/usr/bin/env node

/**
 * Script para executar todos os testes de carga (k6) sequencialmente.
 * Substitui o script inline `test:load:all` do package.json.
 * 
 * Uso: node scripts/run-all-load-tests.js
 */

import { execSync } from 'child_process';

const SCRIPTS = [
  'node scripts/check-server.js',
  'npm run clean:reports',
  'npm run test:load',
  'npm run test:load:auth',
  'npm run test:load:write-and-clean',
  'npm run test:load:upload',
  'npm run test:load:videos',
  'npm run test:load:videos-crud',
  'npm run test:load:musicas',
  'npm run test:load:musicas-crud',
  'npm run test:load:stress',
  'npm run test:load:search',
  'npm run test:load:ddos',
  'npm run test:load:ratelimit',
  'npm run test:load:cache',
  'npm run test:load:cache:headers',
  'npm run test:load:recovery',
  'npm run test:load:backup',
  'npm run test:load:login:negative',
  'npm run test:load:ip-spoofing',
  'npm run test:load:posts:pagination',
  'npm run test:load:posts:tags',
  'npm run test:load:posts:cursor',
  'npm run test:load:videos:pagination',
  'npm run test:load:videos:filter',
  'npm run test:load:videos:sort',
  'npm run test:load:videos:validation',
  'npm run test:load:musicas:pagination',
  'npm run test:load:musicas:filter',
  'npm run test:load:musicas:search',
  'npm run test:load:musicas:sort',
  'node scripts/consolidate-k6-reports.js',
];

let exitCode = 0;

for (const script of SCRIPTS) {
  console.log(`\n========================================`);
  console.log(`▶️  Executando: ${script}`);
  console.log(`========================================\n`);

  try {
    execSync(script, {
      stdio: 'inherit',
      shell: true,
    });
    console.log(`✅ Concluído: ${script}`);
  } catch (error) {
    console.error(`❌ Falhou: ${script} (código: ${error.status})`);
    exitCode = error.status || 1;
    break;
  }
}

console.log(`\n========================================`);
if (exitCode === 0) {
  console.log('✅ Todos os testes de carga foram concluídos com sucesso.');
} else {
  console.error(`❌ Testes interrompidos com código de erro ${exitCode}.`);
}
console.log(`========================================\n`);

process.exit(exitCode);