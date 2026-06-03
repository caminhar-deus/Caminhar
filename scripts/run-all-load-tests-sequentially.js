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
 *   ADMIN_USERNAME - Nome do usuário admin (obrigatório)
 *   ADMIN_PASSWORD - Senha do admin (obrigatório para testes autenticados)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import http from 'http';

const REPORTS_DIR = resolve('./reports/k6-summaries');
const RESULTS_FILE = join(REPORTS_DIR, 'orchestrator-results.json');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SERVER_CHECK_TIMEOUT = 5000; // 5s para verificar o servidor

/**
 * Verifica se o servidor está rodando antes de executar os testes.
 * Faz uma requisição HTTP para a URL base e aguarda resposta.
 * Se o servidor não estiver acessível, exibe mensagem e encerra o processo.
 */
function checkServer() {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Verificando status do servidor em ${BASE_URL}...`);

    const req = http.get(BASE_URL, (res) => {
      console.log(`✅ Servidor online (status: ${res.statusCode}). Iniciando testes...\n`);
      res.resume();
      resolve();
    });

    req.on('error', (err) => {
      console.error(`\n❌ Erro: O servidor não está acessível em ${BASE_URL}`);
      console.error(`   Motivo: ${err.code === 'ECONNREFUSED' ? 'Conexão recusada' : err.message}`);
      console.error(`👉 Solução: Abra um novo terminal e execute 'npm run dev'`);
      console.error(`   Aguarde o servidor iniciar completamente e então execute este script novamente.\n`);
      reject(new Error(`Servidor não acessível em ${BASE_URL}`));
    });

    req.setTimeout(SERVER_CHECK_TIMEOUT, () => {
      req.destroy();
      console.error(`\n❌ Erro: O servidor não respondeu em ${BASE_URL} após ${SERVER_CHECK_TIMEOUT / 1000}s`);
      console.error(`👉 Solução: Abra um novo terminal e execute 'npm run dev'`);
      console.error(`   Aguarde o servidor iniciar completamente e então execute este script novamente.\n`);
      reject(new Error(`Servidor não respondeu em ${BASE_URL}`));
    });
  });
}

// Garante que o diretório de relatórios existe
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

// Configuração das categorias e scripts
const CATEGORIES = [
  {
    name: '🧪 Performance Tests',
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD },
    scripts: [
      { name: 'musicas-load-test',       cmd: 'k6 run load-tests/performance/musicas-load-test.js' },
      { name: 'videos-load-test',        cmd: 'k6 run load-tests/performance/videos-load-test.js' },
      { name: 'musicas-crud-test',       cmd: 'k6 run load-tests/performance/musicas-crud-test.js' },
      { name: 'videos-crud-test',        cmd: 'k6 run load-tests/performance/videos-crud-test.js' },
      { name: 'musicas-filter-test',     cmd: 'k6 run load-tests/performance/musicas-filter-test.js' },
      { name: 'videos-filter-test',      cmd: 'k6 run load-tests/performance/videos-filter-test.js' },
      { name: 'musicas-pagination-test', cmd: 'k6 run load-tests/performance/musicas-pagination-test.js' },
      { name: 'videos-pagination-test',  cmd: 'k6 run load-tests/performance/videos-pagination-test.js' },
      { name: 'musicas-sort-test',       cmd: 'k6 run load-tests/performance/musicas-sort-test.js' },
      { name: 'videos-sort-test',        cmd: 'k6 run load-tests/performance/videos-sort-test.js' },
      { name: 'musicas-search-test',     cmd: 'k6 run load-tests/performance/musicas-search-test.js' },
      { name: 'cache-warmup-test',       cmd: 'k6 run load-tests/performance/cache-warmup-test.js' },
      { name: 'cache-performance-test',  cmd: 'k6 run load-tests/performance/cache-performance-test.js' },
      { name: 'pagination-test',         cmd: 'k6 run load-tests/performance/pagination-test.js' },
      { name: 'authenticated-flow-test', cmd: 'k6 run load-tests/performance/authenticated-flow-test.js' },
      { name: 'create-post-flow',        cmd: 'k6 run load-tests/performance/create-post-flow.js' },
      { name: 'stress-test-combined',    cmd: 'k6 run load-tests/performance/stress-test-combined.js' },
    ],
  },
  {
    name: '🔍 Functional Tests',
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD },
    scripts: [
      { name: 'health-check',                 cmd: 'k6 run load-tests/functional/health-check.js' },
      { name: 'cache-headers-test',           cmd: 'k6 run load-tests/functional/cache-headers-test.js' },
      { name: 'backup-verification-test',     cmd: 'k6 run load-tests/functional/backup-verification-test.js' },
      { name: 'video-validation-test',        cmd: 'k6 run load-tests/functional/video-validation-test.js' },
      { name: 'posts-tags-test',              cmd: 'k6 run load-tests/functional/posts-tags-test.js' },
      { name: 'posts-cursor-pagination-test', cmd: 'k6 run load-tests/functional/posts-cursor-pagination-test.js' },
      { name: 'search-content-test',          cmd: 'k6 run load-tests/functional/search-content-test.js' },
      { name: 'upload-flow-test',             cmd: 'k6 run load-tests/functional/upload-flow-test.js' },
      { name: 'recovery-test',                cmd: 'k6 run load-tests/functional/recovery-test.js' },
    ],
  },
  {
    name: '🔒 Security Tests',
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD },
    scripts: [
      { name: 'rate-limit-test',         cmd: 'k6 run load-tests/security/rate-limit-test.js' },
      { name: 'ip-spoofing-test',        cmd: 'k6 run load-tests/security/ip-spoofing-test.js' },
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

const totalScriptsInCategories = CATEGORIES.reduce((acc, cat) => acc + cat.scripts.length, 0);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║   🚀 ORQUESTRADOR DE TESTES DE CARGA (k6)                                                             ║');
console.log(`║   Executando todos os ${String(totalScriptsInCategories).padStart(2)} scripts sequencialmente         ║`);
console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');

// Verifica se o servidor está rodando antes de iniciar os testes
let overallExitCode = 0;

try {
  await checkServer();
} catch {
  process.exit(1);
}

for (const category of CATEGORIES) {
  console.log(`\n═════════════════════════════════════════════════════`);
  console.log(`  ${category.name} (${category.scripts.length} scripts)`);
  console.log(`═════════════════════════════════════════════════════\n`);

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

  // Após a categoria de performance, executa cleanup dos posts de teste (k6 create-post-flow)
  if (category.name === '🧪 Performance Tests') {
    console.log(`\n════════════════════════════════════════════════════`);
    console.log(`  🧹 Limpando posts de teste criados durante os testes`);
    console.log(`════════════════════════════════════════════════════\n`);
    try {
      execSync('node scripts/clean-load-test-posts.js', {
        stdio: 'inherit',
        shell: true,
        timeout: 30000, // 30s timeout
      });
      console.log(`     ✅ Cleanup de posts de teste realizado com sucesso\n`);
    } catch (error) {
      console.error(`     ⚠️  Cleanup de posts de teste falhou (não crítico): ${error.message}\n`);
    }
  }

  // Após a categoria de segurança, executa cleanup de bloqueios de autenticação
  if (category.name === '🔒 Security Tests') {
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`  🔓 Limpando bloqueios de autenticação dos testes   `);
    console.log(`═══════════════════════════════════════════════════\n`);
    try {
      execSync('node scripts/clear-test-auth-locks.js', {
        stdio: 'inherit',
        shell: true,
        timeout: 30000, // 30s timeout
      });
      console.log(`     ✅ Cleanup de bloqueios realizado com sucesso\n`);
    } catch (error) {
      console.error(`     ⚠️  Cleanup de bloqueios falhou (não crítico): ${error.message}\n`);
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
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   📊 RESUMO FINAL                                                 ║');
console.log('╠═══════════════════════════════════════════════════════════════════╣');
console.log(`║   Total: ${results.totalScripts.toString().padStart(3)} scripts   ║`);
console.log(`║   ✅ Passed: ${results.passed.toString().padStart(3)}             ║`);
console.log(`║   ❌ Failed: ${results.failed.toString().padStart(3)}             ║`);
console.log(`║   ⏭️  Skipped: ${results.skipped.toString().padStart(3)}          ║`);
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

if (results.failed > 0) {
  console.log('❌ Alguns testes falharam. Verifique os logs acima para detalhes.\n');
} else {
  console.log('✅ Todos os testes de carga passaram com sucesso!\n');
}

process.exit(overallExitCode);