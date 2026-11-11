#!/usr/bin/env node

/**
 * Script de diagnóstico e auditoria dos logs e execuções do GitHub Actions.
 * Lê o GITHUB_TOKEN de .env.local e consulta a API REST do GitHub.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

// 1. Carrega GITHUB_TOKEN de .env.local
let token = process.env.GITHUB_TOKEN;
if (!token) {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const match = content.match(/^GITHUB_TOKEN=["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        token = match[1].trim();
      }
    }
  } catch (err) {
    console.error('Erro ao ler .env.local:', err.message);
  }
}

const REPO = 'caminhar-deus/Caminhar';
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

function diagnosticoLocal(motivo) {
  console.log(`\n======================================================`);
  console.log(`⚠️ MODO DE CONTINGÊNCIA: DIAGNÓSTICO LOCAL DE LOGS E WORKFLOWS`);
  console.log(`Motivo: ${motivo}`);
  console.log(`======================================================\n`);

  const logsDir = path.resolve(process.cwd(), 'logs');
  const workflowsDir = path.resolve(process.cwd(), '.github', 'workflows');

  // 1. Inspeciona logs/tests-output.log
  const testLogPath = path.join(logsDir, 'tests-output.log');
  if (fs.existsSync(testLogPath)) {
    try {
      const content = fs.readFileSync(testLogPath, 'utf8');
      const lines = content.split('\n');
      const suitesLine = lines.find((l) => l.includes('Test Suites:'));
      const testsLine = lines.find((l) => l.includes('Tests:'));
      const timeLine = lines.find((l) => l.includes('Time:'));

      console.log('📄 Última Execução Local de Testes (logs/tests-output.log):');
      if (suitesLine) console.log(`   ${suitesLine.trim()}`);
      if (testsLine) console.log(`   ${testsLine.trim()}`);
      if (timeLine) console.log(`   ${timeLine.trim()}`);

      const failed = content.includes('FAIL ') || (suitesLine && suitesLine.includes('failed'));
      console.log(`   Status Geral: ${failed ? '❌ Falhas detectadas' : '✅ 100% Aprovado'}`);
    } catch (e) {
      console.log(`   Erro ao ler tests-output.log: ${e.message}`);
    }
  } else {
    console.log('ℹ️ logs/tests-output.log não encontrado.');
  }

  // 2. Inspeciona logs/eslint.log
  const eslintLogPath = path.join(logsDir, 'eslint.log');
  if (fs.existsSync(eslintLogPath)) {
    try {
      const stats = fs.statSync(eslintLogPath);
      console.log(`\n📄 Análise Estática Local (logs/eslint.log):`);
      if (stats.size === 0) {
        console.log('   ✅ 0 erros e 0 avisos (arquivo limpo)');
      } else {
        const content = fs.readFileSync(eslintLogPath, 'utf8');
        const problemLine = content.split('\n').find((l) => l.includes('problems') || l.includes('error'));
        console.log(`   ${problemLine ? problemLine.trim() : `Tamanho do log: ${stats.size} bytes`}`);
      }
    } catch (e) {
      console.log(`   Erro ao ler eslint.log: ${e.message}`);
    }
  }

  // 3. Inspeciona .github/workflows/
  if (fs.existsSync(workflowsDir)) {
    try {
      const workflows = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
      console.log(`\n⚙️ Workflows Locais Configurados (.github/workflows/):`);
      for (const wf of workflows) {
        console.log(`   - ${wf}`);
      }
    } catch (e) {
      console.log(`   Erro ao ler diretório de workflows: ${e.message}`);
    }
  }

  console.log('\n✅ Diagnóstico local concluído com sucesso.');
}

function requestGitHub(apiPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Caminhar-Diagnostics-Agent',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    };

    const req = https.request(options, (res) => {
      // Segue redirects (status 302 para logs)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location);
        const redirOptions = {
          hostname: redirectUrl.hostname,
          path: redirectUrl.pathname + redirectUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Caminhar-Diagnostics-Agent',
          },
        };
        const redirReq = https.request(redirOptions, (redirRes) => {
          let redirData = '';
          redirRes.on('data', chunk => redirData += chunk);
          redirRes.on('end', () => resolve({ statusCode: redirRes.statusCode, data: redirData, headers: redirRes.headers }));
        });
        redirReq.on('error', reject);
        redirReq.end();
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🔍 AUDITORIA DO GITHUB ACTIONS — REPOSITÓRIO: ${REPO}`);
  console.log(`Período analisado: Últimos 7 dias (desde ${SEVEN_DAYS_AGO.toISOString()})`);
  console.log(`======================================================\n`);

  if (!token) {
    diagnosticoLocal('GITHUB_TOKEN não encontrado no ambiente nem em .env.local.');
    return;
  }

  try {
    const runsRes = await requestGitHub(`/repos/${REPO}/actions/runs?per_page=50`);
    if (runsRes.statusCode !== 200) {
      diagnosticoLocal(`Erro ao consultar runs da API (HTTP ${runsRes.statusCode})`);
      return;
    }

    const runsJson = JSON.parse(runsRes.data);
    const allRuns = runsJson.workflow_runs || [];

    const recentRuns = allRuns.filter(run => new Date(run.created_at) >= SEVEN_DAYS_AGO);

    console.log(`Total de execuções históricas no repositório: ${runsJson.total_count}`);
    console.log(`Execuções nos últimos 7 dias: ${recentRuns.length}\n`);

    if (recentRuns.length === 0) {
      console.log('ℹ️ Nenhuma execução encontrada nos últimos 7 dias.');
      if (allRuns.length > 0) {
        console.log(`A última execução registrada foi em ${allRuns[0].created_at} (ID: ${allRuns[0].id}, Workflow: "${allRuns[0].name}", Conclusão: ${allRuns[0].conclusion}).`);
      }
      return;
    }

    const runsByConclusion = {};
    const failedRuns = [];

    for (const run of recentRuns) {
      const conc = run.conclusion || run.status;
      runsByConclusion[conc] = (runsByConclusion[conc] || 0) + 1;
      if (run.conclusion === 'failure') {
        failedRuns.push(run);
      }
    }

    console.log('📊 Resumo das execuções nos últimos 7 dias por status:');
    for (const [status, count] of Object.entries(runsByConclusion)) {
      const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
      console.log(`  ${icon} ${status}: ${count}`);
    }
    console.log('');

    // Listagem resumida dos runs recentes
    console.log('📋 Lista das execuções dos últimos 7 dias:');
    for (const run of recentRuns) {
      const icon = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⚠️';
      console.log(`  ${icon} Run #${run.run_number} (ID: ${run.id}) — ${run.name}`);
      console.log(`     Evento: ${run.event} | Branch: ${run.head_branch} | Conclusão: ${run.conclusion} | Data: ${run.created_at}`);
    }
    console.log('');

    // Investigação detalhada dos runs com falha
    if (failedRuns.length > 0) {
      console.log(`======================================================`);
      console.log(`❌ INVESTIGAÇÃO DETALHADA DAS FALHAS (${failedRuns.length} falhas):`);
      console.log(`======================================================\n`);

      for (const run of failedRuns) {
        console.log(`------------------------------------------------------`);
        console.log(`🔎 Falha no Run #${run.run_number} (ID: ${run.id}) — Workflow: "${run.name}"`);
        console.log(`Commit: ${run.head_commit?.id?.slice(0, 7)} — "${run.head_commit?.message?.split('\n')[0]}"`);
        console.log(`Data: ${run.created_at} | URL: ${run.html_url}`);

        // Busca jobs deste run
        const jobsRes = await requestGitHub(`/repos/${REPO}/actions/runs/${run.id}/jobs`);
        if (jobsRes.statusCode === 200) {
          const jobsJson = JSON.parse(jobsRes.data);
          const jobs = jobsJson.jobs || [];

          for (const job of jobs) {
            const jobIcon = job.conclusion === 'success' ? '✅' : job.conclusion === 'failure' ? '❌' : '⚠️';
            console.log(`  ${jobIcon} Job: "${job.name}" (Status: ${job.status}, Conclusão: ${job.conclusion})`);

            if (job.conclusion === 'failure') {
              const failedSteps = (job.steps || []).filter(s => s.conclusion === 'failure');
              for (const step of failedSteps) {
                console.log(`     ↳ Step que falhou: "${step.name}" (Step #${step.number})`);
              }

              // Tenta baixar snippet do log do job com falha
              console.log(`     📥 Buscando trecho do log do job ${job.id}...`);
              const logsRes = await requestGitHub(`/repos/${REPO}/actions/jobs/${job.id}/logs`);
              if (logsRes.statusCode === 200 && logsRes.data) {
                const lines = logsRes.data.split('\n');
                // Procura linhas com erro
                const errorLines = lines.filter(l => /error|fail|exception|fatal|reprov/i.test(l));
                console.log(`     📄 Amostra de erros no log (últimas linhas relevantes):`);
                const tailErrors = errorLines.slice(-15);
                for (const el of tailErrors) {
                  console.log(`        ${el.trim()}`);
                }
              }
            }
          }
        }
        console.log('');
      }
    } else {
      console.log('✅ Nenhuma falha identificada nas execuções dos últimos 7 dias!');
    }

  } catch (err) {
    if (
      err.code === 'EAI_AGAIN'
      || err.code === 'ENOTFOUND'
      || err.code === 'ECONNREFUSED'
      || err.code === 'ETIMEDOUT'
      || err.message?.includes('getaddrinfo')
    ) {
      diagnosticoLocal(`Rede indisponível ou isolamento de sandbox (${err.code || err.message})`);
      return;
    }
    console.error('❌ Erro inesperado durante a execução:', err);
    process.exit(1);
  }
}

main();
