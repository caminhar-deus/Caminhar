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

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import http from 'http';
import {
  BoundedTailBuffer,
  MAX_CAPTURE_BYTES,
  MAX_DETAILS_PER_GROUP,
  extractFailureDetails,
} from './lib/k6-output-parser.js';

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

/**
 * Verifica se o k6 está instalado e disponível no PATH.
 * Executa 'k6 version' e retorna true se disponível, false caso contrário.
 */
function checkK6Available() {
  try {
    execSync('k6 version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const K6_SCRIPT_TIMEOUT_MS = 600000; // 10 min timeout per script

/**
 * Executa um comando com tee de saída: ecoa stdout/stderr ao vivo para o
 * terminal (o log do CI continua mostrando tudo, como com stdio: 'inherit')
 * e guarda uma cópia limitada em memória (BoundedTailBuffer) para o relatório
 * de erros detalhados.
 *
 * Nunca rejeita a promise: erro de spawn, timeout e sinal são reportados no
 * resultado. `exitCode === 0` equivale ao "não lançou erro" do execSync.
 */
function runWithCapture(command, { timeoutMs = K6_SCRIPT_TIMEOUT_MS } = {}) {
  return new Promise((resolveRun) => {
    const capture = new BoundedTailBuffer();
    let echoedBytes = 0;
    let echoTruncated = false;
    let timedOut = false;
    let spawnError = null;
    let exitCode = null;
    let signal = null;
    let settled = false;
    let timeoutTimer = null;
    let orphanTimer = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (orphanTimer) clearTimeout(orphanTimer);
      resolveRun({
        exitCode,
        signal,
        timedOut,
        spawnError,
        truncated: capture.truncated || echoTruncated,
        output: capture.toString(),
      });
    };

    let child;
    try {
      child = spawn(command, [], { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
    } catch (error) {
      spawnError = error instanceof Error ? error.message : String(error);
      finish();
      return;
    }

    const handleChunk = (chunk, stream) => {
      capture.push(chunk);
      if (echoTruncated) return;
      try {
        const remaining = Math.max(0, MAX_CAPTURE_BYTES - echoedBytes);
        const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
        if (slice.length > 0) {
          stream.write(slice);
          echoedBytes += slice.length;
        }
        if (chunk.length > slice.length) {
          echoTruncated = true;
          stream.write(`\n[⚠️ saída truncada: limite de ${MAX_CAPTURE_BYTES} bytes por script — o restante não é ecoado]\n`);
        }
      } catch {
        // Sem eco (ex.: pipe fechado), mas a captura continua.
        echoTruncated = true;
      }
    };

    child.stdout?.on('data', (chunk) => handleChunk(chunk, process.stdout));
    child.stderr?.on('data', (chunk) => handleChunk(chunk, process.stderr));

    child.on('error', (error) => {
      spawnError = error instanceof Error ? error.message : String(error);
      finish();
    });

    child.on('exit', (code, sig) => {
      exitCode = code;
      signal = sig;
      // Rede de segurança: num timeout o shell morre, mas um processo neto
      // (k6) pode ficar vivo segurando os pipes abertos — sem isto o
      // orquestrador esperaria 'close' para sempre.
      orphanTimer = setTimeout(finish, 3000);
    });

    child.on('close', finish);

    timeoutTimer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // processo já terminou
      }
    }, timeoutMs);
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

// Verifica se o k6 está instalado antes de executar os testes
if (!checkK6Available()) {
  console.error('\n❌ Erro: k6 não encontrado no sistema.');
  console.error('   Instale o k6 para executar os testes de carga:');
  console.error('   https://k6.io/docs/get-started/installation/\n');
  console.error('   Ou use Docker:');
  console.error('   docker run --rm -v $(pwd):/tests grafana/k6 run /tests/load-tests/...\n');
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

  // Antes dos testes de performance, garante que o banco tem dados para paginação
  if (category.name === '🧪 Performance Tests') {
    console.log(`\n════════════════════════════════════════════════════`);
    console.log(`  🌱 Populando banco com posts de teste para paginação`);
    console.log(`════════════════════════════════════════════════════\n`);
    try {
      execSync('node scripts/seed-posts.js', {
        stdio: 'inherit',
        shell: true,
        timeout: 30000, // 30s timeout
      });
      console.log(`     ✅ Seed de posts realizado com sucesso\n`);
    } catch (error) {
      console.error(`     ⚠️  Seed de posts falhou (não crítico): ${error.message}\n`);
    }
  }

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
      const runResult = await runWithCapture(fullCmd);

      if (runResult.exitCode === 0 && !runResult.spawnError) {
        console.log(`     ✅ ${script.name}: PASS\n`);
        catResults.passed++;
        catResults.scripts.push({ name: script.name, status: 'pass' });
      } else {
        const signalSuffix = runResult.signal ? `, signal: ${runResult.signal}` : '';
        console.error(`     ❌ ${script.name}: FAIL (exit code: ${runResult.exitCode ?? 'null'}${signalSuffix})\n`);
        catResults.failed++;
        // O parsing é só para relatório: nunca decide pass/fail e, por ser
        // defensivo, nunca lança por cima do erro original.
        const details = extractFailureDetails(runResult.output, {
          exitCode: runResult.exitCode,
          signal: runResult.signal,
          timedOut: runResult.timedOut,
          truncated: runResult.truncated,
        });
        catResults.scripts.push({ name: script.name, status: 'fail', exitCode: runResult.exitCode, details });
        overallExitCode = 1;
      }
    } catch (error) {
      // runWithCapture não rejeita; este catch é só cintura-e-suspensório.
      console.error(`     ❌ ${script.name}: FAIL (exit code: ${error.status ?? 'null'})\n`);
      catResults.failed++;
      catResults.scripts.push({ name: script.name, status: 'fail', exitCode: error.status ?? null });
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

/**
 * Imprime a seção de erros detalhados no fim do relatório: para cada script
 * que falhou, exit code, checks reprovados (com a contagem `↳`), thresholds
 * violados, mensagens `level=error` do console e avisos de truncamento.
 * Sem scripts falhos, não imprime nada (relatório limpo permanece limpo).
 */
function printFailureDetails(resultsData) {
  const failedScripts = resultsData.categories
    .flatMap((category) => category.scripts)
    .filter((entry) => entry.status === 'fail');

  if (failedScripts.length === 0) return;

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║   ❌ DETALHES DOS ERROS                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  for (const script of failedScripts) {
    const details = script.details ?? {};
    const signalSuffix = details.signal ? `, signal: ${details.signal}` : '';
    console.log(`\n  ❌ ${script.name} — exit code: ${script.exitCode ?? 'null'}${signalSuffix}`);

    if (details.timedOut) {
      console.log('     ⏱️  Timeout de 10 min atingido antes de o script terminar.');
    }
    if (details.truncated) {
      console.log(`     ⚠️  Saída truncada (${MAX_CAPTURE_BYTES / (1024 * 1024)} MB por script): nem todas as falhas podem estar listadas.`);
    }

    const failedChecks = details.failedChecks ?? [];
    const failedThresholds = details.failedThresholds ?? [];
    const consoleErrors = details.consoleErrors ?? [];

    if (failedChecks.length > 0) {
      console.log('     Checks que falharam:');
      for (const entry of failedChecks) {
        console.log(`       • ${entry.text}`);
        if (entry.counts) console.log(`         ${entry.counts}`);
      }
    }

    if (failedThresholds.length > 0) {
      console.log('     Thresholds violados:');
      for (const entry of failedThresholds) {
        console.log(`       • ${entry.text}`);
        if (entry.counts) console.log(`         ${entry.counts}`);
      }
    }

    if (consoleErrors.length > 0) {
      console.log('     Erros de console (level=error):');
      for (const entry of consoleErrors) {
        console.log(`       • ${entry.text}`);
      }
    }

    if (failedChecks.length === 0 && failedThresholds.length === 0 && consoleErrors.length === 0) {
      console.log('     Nenhum erro estruturado extraído da saída — veja o log completo acima.');
    }

    if (details.omittedCount > 0) {
      console.log(`     (+${details.omittedCount} ocorrências omitidas por limite de ${MAX_DETAILS_PER_GROUP} por tipo)`);
    }
  }

  console.log('');
}

printFailureDetails(results);

process.exit(overallExitCode);