#!/usr/bin/env node

/**
 * Script orquestrador que executa TODOS os scripts de teste de carga (k6) sequencialmente,
 * incluindo thresholds verification e agregação de resultados.
 * 
 * Executa os scripts organizados em 3 categorias: performance, functional e security.
 * 
 * Uso: node scripts/run-all-load-tests-sequentially.js
 * 
 * Variáveis de ambiente necessárias:
 *   ADMIN_USERNAME - Nome do usuário admin (fallback: 'admin')
 *   ADMIN_PASSWORD - Senha do admin (obrigatório para testes autenticados)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const REPORTS_DIR = resolve('./reports/k6-summaries');
const RESULTS_FILE = join(REPORTS_DIR, 'orchestrator-results.json');

// Garante que o diretório de relatórios existe
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// Configuração das categorias e scripts
const CATEGORIES = [
  {
    name: '🧪 Performance Tests',
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin', ADMIN_PASSWORD: process.env.ADMIN_PASSWORD },
    scripts: [
      { name: 'musicas-load-test',     cmd: 'k6 run load-tests/performance/musicas-load-test.js' },
      { name: 'videos-load-test',      cmd: 'k6 run load-tests/performance/videos-load-test.js' },
      { name: 'musicas-crud-test',     cmd: 'k6 run load-tests/performance/musicas-crud-test.js' },
      { name: 'videos-crud-test',      cmd: 'k6 run load-tests/performance/videos-crud-test.js' },
      { name: 'musicas-filter-test',   cmd: 'k6 run load-tests/performance/musicas-filter-test.js' },
      { name: 'videos-filter-test',    cmd: 'k6 run load-tests/performance/videos-filter-test.js' },
      { name: 'musicas-pagination-test', cmd: 'k6 run load-tests/performance/musicas-pagination-test.js' },
      { name: 'videos-pagination-test',  cmd: 'k6 run load-tests/performance/videos-pagination-test.js' },
      { name: 'musicas-sort-test',     cmd: 'k6 run load-tests/performance/musicas-sort-test.js' },
      { name: 'videos-sort-test',      cmd: 'k6 run load-tests/performance/videos-sort-test.js' },
      { name: 'musicas-search-test',   cmd: 'k6 run load-tests/performance/musicas-search-test.js' },
      { name: 'cache-performance-test', cmd: 'k6 run load-tests/performance/cache-performance-test.js' },
      { name: 'pagination-test',       cmd: 'k6 run load-tests/performance/pagination-test.js' },
      { name: 'authenticated-flow-test', cmd: 'k6 run load-tests/performance/authenticated-flow-test.js' },
      { name: 'create-post-flow',      cmd: 'k6 run load-tests/performance/create-post-flow.js' },
      { name: 'stress-test-combined',  cmd: 'k6 run load-tests/performance/stress-test-combined.js' },
    ],
  },
  {
    name: '🔍 Functional Tests',
    env: {}, // testes públicos, sem necessidade de credenciais
    scripts: [
      { name: 'health-check',           cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/health-check.js' },
      { name: 'cache-headers-test',     cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/cache-headers-test.js' },
      { name: 'backup-verification-test', cmd: 'k6 run load-tests/functional/backup-verification-test.js' },
      { name: 'video-validation-test',  cmd: 'k6 run load-tests/functional/video-validation-test.js' },
      { name: 'posts-tags-test',        cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/posts-tags-test.js' },
      { name: 'posts-cursor-pagination-test', cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/posts-cursor-pagination-test.js' },
      { name: 'search-content-test',    cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/search-content-test.js' },
      { name: 'upload-flow-test',       cmd: 'k6 run load-tests/functional/upload-flow-test.js' },
      { name: 'recovery-test',          cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/functional/recovery-test.js' },
    ],
  },
  {
    name: '🔒 Security Tests',
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin', ADMIN_PASSWORD: process.env.ADMIN_PASSWORD },
    scripts: [
      { name: 'rate-limit-test',         cmd: 'k6 run load-tests/security/rate-limit-test.js' },
      { name: 'ip-spoofing-test',        cmd: 'k6 run load-tests/security/ip-spoofing-test.js' },
      { name: 'ip-spoofing-deteccao-test', cmd: 'k6 run load-tests/security/ip-spoofing-deteccao-test.js' },
      { name: 'ddos-search-test',        cmd: 'k6 run load-tests/security/ddos-search-test.js' },
      { name: 'login-negative-test',     cmd: 'k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/security/login-negative-test.js' },
    ],
  },
];

let results = {
  startTime: new Date().toISOString(),
  totalScripts: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  categories: [],
};

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🚀 ORQUESTRADOR DE TESTES DE CARGA (k6)              ║');
console.log('║   Executando todos os 29 scripts sequencialmente       ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let overallExitCode = 0;

for (const category of CATEGORIES) {
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  ${category.name} (${category.scripts.length} scripts)`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const catResults = {
    name: category.name,
    total: category.scripts.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    scripts: [],
  };

  for (const script of category.scripts) {
    const envVars = Object.entries(category.env)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');

    const fullCmd = envVars ? `${envVars} ${script.cmd}` : script.cmd;

    console.log(`  ▶️  [${script.name}]`);
    console.log(`     Comando: ${fullCmd}`);
    console.log('');

    try {
      execSync(fullCmd, {
        stdio: 'inherit',
        shell: true,
        timeout: 600000, // 10 min timeout per script
      });
      console.log(`     ✅ ${script.name}: PASS\n`);
      catResults.passed++;
      catResults.scripts.push({ name: script.name, status: 'pass' });
    } catch (error) {
      console.error(`     ❌ ${script.name}: FAIL (exit code: ${error.status})\n`);
      catResults.failed++;
      catResults.scripts.push({ name: script.name, status: 'fail', exitCode: error.status });
      overallExitCode = 1;
    }
  }

  results.categories.push(catResults);
  results.totalScripts += catResults.total;
  results.passed += catResults.passed;
  results.failed += catResults.failed;
  results.skipped += catResults.skipped;

  // Resumo parcial da categoria
  const catSummary = `     📊 ${catResults.passed}/${catResults.total} passed, ${catResults.failed} failed, ${catResults.skipped} skipped\n`;
  console.log(catSummary);
}

results.endTime = new Date().toISOString();

// Salva resultados consolidados
writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
console.log(`📄 Resultados salvos em: ${RESULTS_FILE}\n`);

// Resumo final
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   📊 RESUMO FINAL                                      ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║   Total: ${results.totalScripts.toString().padStart(3)} scripts                           ║`);
console.log(`║   ✅ Passed: ${results.passed.toString().padStart(3)}                                    ║`);
console.log(`║   ❌ Failed: ${results.failed.toString().padStart(3)}                                    ║`);
console.log(`║   ⏭️  Skipped: ${results.skipped.toString().padStart(3)}                                 ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

if (results.failed > 0) {
  console.log('❌ Alguns testes falharam. Verifique os logs acima para detalhes.\n');
} else {
  console.log('✅ Todos os testes de carga passaram com sucesso!\n');
}

process.exit(overallExitCode);