import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração de diretórios
const REPORTS_DIR = path.join(process.cwd(), 'reports');
const K6_SUMMARY_DIR = path.join(REPORTS_DIR, 'k6-summaries');

// Garante que os diretórios existem
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);
if (!fs.existsSync(K6_SUMMARY_DIR)) fs.mkdirSync(K6_SUMMARY_DIR);

// Definição dos testes a serem executados
const TESTS = [
  { 
    name: 'Fluxo Autenticado', 
    script: 'load-tests/authenticated-flow.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' } 
  },
  { 
    name: 'Criação de Posts (Escrita)', 
    script: 'load-tests/create-post-flow.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' }, 
    cleanup: 'scripts/clean-load-test-posts.js' 
  },
  { 
    name: 'Carga de Vídeos (Leitura)', 
    script: 'load-tests/videos-load-test.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' } 
  },
  { 
    name: 'CRUD de Vídeos', 
    script: 'load-tests/videos-crud-test.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' } 
  },
  { 
    name: 'CRUD de Músicas', 
    script: 'load-tests/musicas-crud-test.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' } 
  },
  { 
    name: 'Carga de Músicas (Leitura)', 
    script: 'load-tests/musicas-load-test.js', 
    env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '123456' } 
  },
];

function runCommand(command, env = {}) {
  try {
    // Executa o comando herdando o stdio para ver o progresso no terminal
    execSync(command, { stdio: 'inherit', env: { ...process.env, ...env } });
    return true;
  } catch (error) {
    console.error(`❌ Falha na execução: ${command}`);
    return false;
  }
}

async function generateReport() {
  console.log('🚀 Iniciando bateria de testes e geração de relatório...');
  const results = [];

  for (const test of TESTS) {
    console.log(`\n▶️  Executando: ${test.name}`);
    const summaryFile = path.join(K6_SUMMARY_DIR, `${test.name.replace(/\s+/g, '_')}.json`);
    
    // Executa o k6 exportando o sumário para JSON
    const cmd = `k6 run --summary-export="${summaryFile}" "${test.script}"`;
    const success = runCommand(cmd, test.env);

    if (fs.existsSync(summaryFile)) {
      const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
      results.push({ name: test.name, success, summary });
    } else {
      results.push({ name: test.name, success: false, summary: null });
    }

    if (test.cleanup) {
      console.log(`🧹 Executando limpeza para ${test.name}...`);
      runCommand(`node "${test.cleanup}"`);
    }
  }

  generateHTML(results);
}

function generateHTML(results) {
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

  fs.writeFileSync(htmlPath, html);
  console.log(`\n✅ Relatório gerado com sucesso: ${htmlPath}`);
}

generateReport();