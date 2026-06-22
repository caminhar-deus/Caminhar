#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

import {
  REPORTS_DIR,
  K6_SUMMARY_DIR,
  LOAD_TESTS_DIR,
} from './utils/constants.js';

const execAsync = promisify(exec);

// Validação de variáveis de ambiente obrigatórias
if (!process.env.ADMIN_PASSWORD) {
  console.error('❌ Erro: Variável ADMIN_PASSWORD não definida.');
  console.error('   Configure via: export ADMIN_PASSWORD=sua_senha');
  process.exit(1);
}

// Verifica se k6 está instalado
async function checkK6Available() {
  try {
    await execAsync('k6 version');
    return true;
  } catch {
    return false;
  }
}

// Definição dos testes a serem executados
const TESTS = [
  { 
    name: 'Fluxo Autenticado', 
    script: `${LOAD_TESTS_DIR}/performance/authenticated-flow-test.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD } 
  },
  { 
    name: 'Criação de Posts (Escrita)', 
    script: `${LOAD_TESTS_DIR}/performance/create-post-flow.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD }, 
    cleanup: 'scripts/clean-load-test-posts.js' 
  },
  { 
    name: 'Carga de Vídeos (Leitura)', 
    script: `${LOAD_TESTS_DIR}/performance/videos-load-test.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD } 
  },
  { 
    name: 'CRUD de Vídeos', 
    script: `${LOAD_TESTS_DIR}/performance/videos-crud-test.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD } 
  },
  { 
    name: 'CRUD de Músicas', 
    script: `${LOAD_TESTS_DIR}/performance/musicas-crud-test.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD } 
  },
  { 
    name: 'Carga de Músicas (Leitura)', 
    script: `${LOAD_TESTS_DIR}/performance/musicas-load-test.js`, 
    env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD } 
  },
];

async function runCommand(command, env = {}) {
  try {
    await execAsync(command, { env: { ...process.env, ...env } });
    return true;
  } catch {
    console.error(`❌ Falha na execução: ${command}`);
    return false;
  }
}

async function generateReport() {
  // Verifica se k6 está disponível
  const k6Available = await checkK6Available();
  if (!k6Available) {
    console.error('❌ Erro: k6 não encontrado. Instale o k6 para executar os testes de carga.');
    console.error('   https://k6.io/docs/get-started/installation/');
    process.exit(1);
  }

  // Garante que os diretórios existem
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.mkdir(K6_SUMMARY_DIR, { recursive: true });

  console.log('🚀 Iniciando bateria de testes e geração de relatório...');
  const results = [];

  for (const test of TESTS) {
    console.log(`\n▶️  Executando: ${test.name}`);
    const summaryFile = path.join(K6_SUMMARY_DIR, `${test.name.replace(/\s+/g, '_')}.json`);
    
    // Executa o k6 exportando o sumário para JSON
    const cmd = `k6 run --summary-export="${summaryFile}" "${test.script}"`;
    const success = await runCommand(cmd, test.env);

    try {
      const summaryContent = await fs.readFile(summaryFile, 'utf-8');
      const summary = JSON.parse(summaryContent);
      results.push({ name: test.name, success, summary });
    } catch {
      results.push({ name: test.name, success: false, summary: null });
    }

    if (test.cleanup) {
      console.log(`🧹 Executando limpeza para ${test.name}...`);
      await runCommand(`node "${test.cleanup}"`);
    }
  }

  await generateHTML(results);
}

async function generateHTML(results) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const htmlPath = path.join(REPORTS_DIR, `load-report-${Date.now()}.html`);
  
  const rows = results.map(r => {
    if (!r.summary) return `<tr><td>${r.name}</td><td class="fail">ERRO (Sem dados)</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
    
    const m = r.summary.metrics;
    const reqDuration = m.http_req_duration?.values || {};
    const reqs = m.http_reqs?.values?.count || 0;
    const fails = m.http_req_failed?.values?.rate ? (m.http_req_failed.values.rate * 100) : 0;
    const rps = m.http_reqs?.values?.rate ? m.http_reqs.values.rate.toFixed(2) : 0;
    
    const statusClass = r.success && fails === 0 ? 'pass' : 'fail';
    const statusText = r.success && fails === 0 ? 'APROVADO' : 'FALHOU';

    return `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td class="${statusClass}">${statusText}</td>
        <td>${reqDuration['p(95)'] !== undefined ? reqDuration['p(95)'].toFixed(2) + 'ms' : '-'}</td>
        <td>${reqDuration.avg !== undefined ? reqDuration.avg.toFixed(2) + 'ms' : '-'}</td>
        <td>${reqs} (${rps}/s)</td>
        <td class="${fails > 0 ? 'fail' : ''}">${fails.toFixed(2)}%</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Performance - Caminhar</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 2rem; background: #f8f9fa; color: #333; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        h1 { color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
        .meta { color: #718096; margin-bottom: 2rem; font-size: 0.9rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #edf2f7; color: #4a5568; font-weight: 600; }
        tr:hover { background: #f7fafc; }
        .pass { color: #38a169; font-weight: bold; }
        .fail { color: #e53e3e; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Relatório de Testes de Carga</h1>
        <div class="meta">Gerado em: ${timestamp}</div>
        <table>
          <thead>
            <tr>
              <th>Cenário de Teste</th>
              <th>Status</th>
              <th>P95 (Latência)</th>
              <th>Média</th>
              <th>Requisições</th>
              <th>Taxa de Erro</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  await fs.writeFile(htmlPath, html);
  console.log(`\n✅ Relatório gerado com sucesso: ${htmlPath}`);
}

generateReport();