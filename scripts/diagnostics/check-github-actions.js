#!/usr/bin/env node

/**
 * Script de diagnóstico e auditoria dos logs e execuções do GitHub Actions.
 * Lê o GITHUB_TOKEN de .env.local e consulta a API REST do GitHub com paginação,
 * oferecendo snapshot offline auditável e contingência local de logs/workflows.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import {
  DEFAULT_ACTIONS_SNAPSHOT_REL,
  buildActionsSnapshot,
  evaluateActionsSnapshot,
  extractErrorLinesFromJobLog,
  fetchRecentWorkflowRuns,
  parseDiagnosticsCliArgs,
  partitionFailedRuns,
  summarizeEslintLog,
  summarizeJestLog,
  summarizeRunsByWorkflow,
  summarizeWorkflowRuns,
} from './github-actions-helper.js';

const REPO = 'caminhar-deus/Caminhar';
const REQUEST_TIMEOUT_MS = 10_000;
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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

function formatMetaSummary(meta) {
  const parts = [];
  if (meta?.startedAt) parts.push(`início=${meta.startedAt}`);
  if (meta?.gitSha) parts.push(`sha=${meta.gitSha}`);
  if (meta?.exitCode !== null && meta?.exitCode !== undefined) parts.push(`exit=${meta.exitCode}`);
  return parts.length > 0 ? parts.join(' | ') : 'sem metadados [log-meta]';
}

function printJestSummary(label, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`ℹ️ ${path.relative(process.cwd(), filePath)} não encontrado.`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const summary = summarizeJestLog(content);
    console.log(`📄 ${label} (${path.relative(process.cwd(), filePath)}):`);
    console.log(`   Metadados: ${formatMetaSummary(summary.meta)}`);
    if (summary.suitesLine) console.log(`   ${summary.suitesLine}`);
    if (summary.testsLine) console.log(`   ${summary.testsLine}`);
    if (summary.timeLine) console.log(`   ${summary.timeLine}`);
    if (summary.allFilesCoverageLine) console.log(`   Cobertura: ${summary.allFilesCoverageLine}`);
    if (summary.hasConsoleNoise) {
      console.log(
        `   ⚠️ Ruído de console: console.error=${summary.consoleErrors}, console.warn=${summary.consoleWarns}, act=${summary.actWarnings}, jsdom_nav=${summary.jsdomNavigationErrors}`
      );
    } else {
      console.log('   Ruído de console: ✅ 0 console.error/warn (0 act, 0 jsdom nav)');
    }
    console.log(`   Status Geral: ${summary.failed ? '❌ Falhas detectadas' : '✅ 100% Aprovado'}`);
  } catch (e) {
    console.log(`   Erro ao ler ${path.basename(filePath)}: ${e.message}`);
  }
}

function printLocalLogsAndWorkflows() {
  const logsDir = path.resolve(process.cwd(), 'logs');
  const workflowsDir = path.resolve(process.cwd(), '.github', 'workflows');

  // 1. Inspeciona logs/tests-output.log e logs/coverage-output.log
  printJestSummary('Última Execução Local de Testes', path.join(logsDir, 'tests-output.log'));
  console.log('');
  printJestSummary('Última Execução Local de Cobertura', path.join(logsDir, 'coverage-output.log'));

  // 2. Inspeciona logs/eslint.log
  const eslintLogPath = path.join(logsDir, 'eslint.log');
  if (fs.existsSync(eslintLogPath)) {
    try {
      const stats = fs.statSync(eslintLogPath);
      const content = fs.readFileSync(eslintLogPath, 'utf8');
      const eslintSummary = summarizeEslintLog(content, stats.size);
      console.log(`\n📄 Análise Estática Local (logs/eslint.log):`);
      console.log(`   Metadados: ${formatMetaSummary(eslintSummary.meta)}`);
      if (eslintSummary.clean) {
        console.log('   ✅ 0 erros e 0 avisos (arquivo limpo)');
      } else {
        console.log(
          `   ⚠️ ${eslintSummary.problemLine || `Problemas detectados (tamanho: ${stats.size} bytes)`}`
        );
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
}

function tryReadLocalSnapshot(snapshotPath, maxAgeHours) {
  if (!snapshotPath || !fs.existsSync(snapshotPath)) {
    return { exists: false, valid: false, stale: false, reason: 'Snapshot inexistente', snapshot: null };
  }
  const raw = fs.readFileSync(snapshotPath, 'utf8');
  return {
    exists: true,
    ...evaluateActionsSnapshot(raw, { expectedRepo: REPO, maxAgeHours }),
  };
}

function diagnosticoLocal(motivo, snapshotNotice = null) {
  console.log(`\n======================================================`);
  console.log(`⚠️ MODO DE CONTINGÊNCIA: DIAGNÓSTICO LOCAL DE LOGS E WORKFLOWS`);
  console.log(`GitHub Actions remoto: status: NÃO VERIFICADO (contingência local)`);
  console.log(`Motivo: ${motivo}`);
  if (snapshotNotice) {
    console.log(`Snapshot offline: ${snapshotNotice}`);
  }
  console.log(`Dica: em host com rede, execute \`npm run diag:actions:snapshot\` para gerar ${DEFAULT_ACTIONS_SNAPSHOT_REL}.`);
  console.log(`======================================================\n`);

  printLocalLogsAndWorkflows();

  console.log('\n✅ Diagnóstico local concluído (remoto: NÃO VERIFICADO).');
}

function attachTimeout(req, hostname) {
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    const timeoutErr = new Error(`Timeout após ${REQUEST_TIMEOUT_MS}ms ao consultar ${hostname}`);
    timeoutErr.code = 'ETIMEDOUT';
    req.destroy(timeoutErr);
  });
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
          redirRes.on('data', (chunk) => { redirData += chunk; });
          redirRes.on('end', () => resolve({
            statusCode: redirRes.statusCode,
            data: redirData,
            headers: redirRes.headers,
          }));
        });
        attachTimeout(redirReq, redirectUrl.hostname);
        redirReq.on('error', reject);
        redirReq.end();
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });

    attachTimeout(req, options.hostname);
    req.on('error', reject);
    req.end();
  });
}

async function collectFailedRunDetails(failedRuns) {
  const details = [];
  for (const run of failedRuns) {
    const failedJobs = [];
    const jobsRes = await requestGitHub(`/repos/${REPO}/actions/runs/${run.id}/jobs`);
    if (jobsRes.statusCode === 200) {
      const jobsJson = JSON.parse(jobsRes.data || '{}');
      const jobs = jobsJson.jobs || [];

      for (const job of jobs) {
        const failedSteps = (job.steps || [])
          .filter((step) => step.conclusion === 'failure')
          .map((step) => ({ number: step.number, name: step.name }));

        let tailErrors = [];
        if (job.conclusion === 'failure') {
          const logsRes = await requestGitHub(`/repos/${REPO}/actions/jobs/${job.id}/logs`);
          if (logsRes.statusCode === 200 && logsRes.data) {
            tailErrors = extractErrorLinesFromJobLog(logsRes.data, 15);
          }
        }

        failedJobs.push({
          id: job.id,
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          failedSteps,
          tailErrors,
        });
      }
    }

    details.push({
      runId: run.id,
      jobs: failedJobs,
    });
  }
  return details;
}

function printRunsReport({
  recentRuns,
  latestRunOverall,
  totalCount,
  pagesFetched,
  truncated,
  failedRunDetails = [],
}) {
  console.log(`Total de execuções retornadas pelo filtro na API: ${totalCount}`);
  console.log(`Páginas consultadas: ${pagesFetched}`);
  console.log(`Execuções nos últimos 7 dias: ${recentRuns.length}\n`);

  if (truncated) {
    console.log('⚠️ Aviso: limite de paginação atingido — há mais execuções nos últimos 7 dias além do teto de páginas configurado.\n');
  }

  if (recentRuns.length === 0) {
    console.log('ℹ️ Nenhuma execução encontrada nos últimos 7 dias.');
    if (latestRunOverall) {
      console.log(`A última execução registrada foi em ${latestRunOverall.created_at} (ID: ${latestRunOverall.id}, Workflow: "${latestRunOverall.name}", Conclusão: ${latestRunOverall.conclusion}).`);
    }
    return;
  }

  const { runsByConclusion } = summarizeWorkflowRuns(recentRuns);
  const { activeFailedRuns, resolvedFailedRuns } = partitionFailedRuns(recentRuns);

  console.log('📊 Resumo das execuções nos últimos 7 dias por status:');
  for (const [status, count] of Object.entries(runsByConclusion)) {
    const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
    console.log(`  ${icon} ${status}: ${count}`);
  }
  console.log('');

  const workflowSummaries = summarizeRunsByWorkflow(recentRuns);
  if (workflowSummaries.length > 0) {
    console.log('📌 Resumo por workflow (últimos 7 dias):');
    for (const wf of workflowSummaries) {
      const latestConc = wf.latest?.conclusion || wf.latest?.status || 'unknown';
      const wfIcon = latestConc === 'success' ? '✅' : latestConc === 'failure' ? '❌' : '⚠️';
      const parts = [`${wf.success} OK`, `${wf.failure} falha(s)`];
      if (wf.other > 0) parts.push(`${wf.other} outro(s)`);
      const latestParts = [
        `#${wf.latest?.run_number ?? '?'}`,
        latestConc,
        wf.latest?.sha || null,
        wf.latest?.event || null,
        wf.latest?.created_at || null,
      ].filter(Boolean);
      console.log(`  ${wfIcon} ${wf.name}: ${wf.total} execuções (${parts.join(', ')}) | último: ${latestParts.join(', ')}`);
    }
    console.log('');
  }

  console.log('📋 Lista das execuções dos últimos 7 dias:');
  for (const run of recentRuns) {
    const icon = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⚠️';
    console.log(`  ${icon} Run #${run.run_number} (ID: ${run.id}) — ${run.name}`);
    console.log(`     Evento: ${run.event} | Branch: ${run.head_branch} | Conclusão: ${run.conclusion} | Data: ${run.created_at}`);
  }
  console.log('');

  if (activeFailedRuns.length > 0) {
    const detailsByRunId = new Map(failedRunDetails.map((entry) => [entry.runId, entry.jobs || []]));
    console.log(`======================================================`);
    console.log(`❌ INVESTIGAÇÃO DETALHADA DAS FALHAS ATIVAS (${activeFailedRuns.length} falha(s)):`);
    console.log(`======================================================\n`);

    for (const run of activeFailedRuns) {
      console.log(`------------------------------------------------------`);
      console.log(`🔎 Falha no Run #${run.run_number} (ID: ${run.id}) — Workflow: "${run.name}"`);
      console.log(`Commit: ${run.head_commit?.id?.slice(0, 7)} — "${run.head_commit?.message?.split('\n')[0]}"`);
      console.log(`Data: ${run.created_at} | URL: ${run.html_url}`);

      const jobs = detailsByRunId.get(run.id) || [];
      for (const job of jobs) {
        const jobIcon = job.conclusion === 'success' ? '✅' : job.conclusion === 'failure' ? '❌' : '⚠️';
        console.log(`  ${jobIcon} Job: "${job.name}" (Status: ${job.status}, Conclusão: ${job.conclusion})`);

        if (job.conclusion === 'failure') {
          for (const step of job.failedSteps || []) {
            console.log(`     ↳ Step que falhou: "${step.name}" (Step #${step.number})`);
          }
          if (job.tailErrors && job.tailErrors.length > 0) {
            console.log(`     📄 Amostra de erros no log (últimas linhas relevantes):`);
            for (const line of job.tailErrors) {
              console.log(`        ${line}`);
            }
          }
        }
      }
      console.log('');
    }
    if (resolvedFailedRuns.length > 0) {
      console.log(
        `ℹ️ ${resolvedFailedRuns.length} falha(s) histórica(s) já superada(s) por execução mais recente foram omitidas.`
      );
    }
  } else if (resolvedFailedRuns.length > 0) {
    console.log(
      `✅ Nenhuma falha ativa! Todos os workflows estão verdes na última execução concluída (${resolvedFailedRuns.length} falha(s) histórica(s) nos últimos 7 dias já superada(s) omitida(s)).`
    );
  } else {
    console.log('✅ Nenhuma falha identificada nas execuções dos últimos 7 dias!');
  }
}

function handleContingency(motivo, defaultSnapshotAbsPath, maxAgeHours) {
  const snapEval = tryReadLocalSnapshot(defaultSnapshotAbsPath, maxAgeHours);
  if (snapEval.valid && !snapEval.stale) {
    console.log(`⚠️ API ao vivo indisponível (${motivo}).`);
    console.log(`📦 FONTE REMOTA: SNAPSHOT LOCAL PRÉ-COLETADO (${path.relative(process.cwd(), defaultSnapshotAbsPath)}, capturado em ${snapEval.snapshot.capturedAt}, idade=${snapEval.ageHours.toFixed(1)}h)\n`);
    printRunsReport(snapEval.snapshot);
    console.log('');
    printLocalLogsAndWorkflows();
    return;
  }

  const notice = snapEval.exists ? snapEval.reason : null;
  diagnosticoLocal(motivo, notice);
}

async function main() {
  const cli = parseDiagnosticsCliArgs(process.argv.slice(2));
  const defaultSnapshotAbsPath = path.resolve(process.cwd(), DEFAULT_ACTIONS_SNAPSHOT_REL);

  console.log(`\n======================================================`);
  console.log(`🔍 AUDITORIA DO GITHUB ACTIONS — REPOSITÓRIO: ${REPO}`);
  console.log(`Período analisado: Últimos 7 dias (desde ${SEVEN_DAYS_AGO.toISOString()})`);
  console.log(`======================================================\n`);

  if (cli.fromSnapshotPath) {
    const snapAbsPath = path.resolve(process.cwd(), cli.fromSnapshotPath);
    if (!fs.existsSync(snapAbsPath)) {
      console.error(`❌ Snapshot não encontrado: ${cli.fromSnapshotPath}`);
      process.exit(1);
    }

    const snapEval = evaluateActionsSnapshot(fs.readFileSync(snapAbsPath, 'utf8'), {
      expectedRepo: REPO,
      maxAgeHours: cli.maxAgeHours,
    });
    if (!snapEval.valid) {
      console.error(`❌ Snapshot inválido (${cli.fromSnapshotPath}): ${snapEval.reason}`);
      process.exit(1);
    }

    console.log(`📦 FONTE: SNAPSHOT LOCAL (${path.relative(process.cwd(), snapAbsPath)}, capturado em ${snapEval.snapshot.capturedAt}, idade=${snapEval.ageHours.toFixed(1)}h)`);
    if (snapEval.stale) {
      console.log(`⚠️ Aviso: ${snapEval.reason}`);
    }
    console.log('');
    printRunsReport(snapEval.snapshot);
    console.log('');
    printLocalLogsAndWorkflows();
    return;
  }

  if (!token) {
    handleContingency(
      'GITHUB_TOKEN não encontrado no ambiente nem em .env.local.',
      defaultSnapshotAbsPath,
      cli.maxAgeHours
    );
    return;
  }

  try {
    const runsResult = await fetchRecentWorkflowRuns({
      repo: REPO,
      sevenDaysAgo: SEVEN_DAYS_AGO,
      requestFn: requestGitHub,
    });

    if (!runsResult.ok) {
      handleContingency(
        `Erro ao consultar runs da API (HTTP ${runsResult.statusCode})`,
        defaultSnapshotAbsPath,
        cli.maxAgeHours
      );
      return;
    }

    const { activeFailedRuns } = partitionFailedRuns(runsResult.recentRuns);
    const failedRunDetails = await collectFailedRunDetails(activeFailedRuns);

    if (cli.writeSnapshotPath) {
      const writeAbsPath = path.resolve(process.cwd(), cli.writeSnapshotPath);
      fs.mkdirSync(path.dirname(writeAbsPath), { recursive: true });
      const snapshotPayload = buildActionsSnapshot({
        repo: REPO,
        capturedAt: new Date(),
        sevenDaysAgo: SEVEN_DAYS_AGO,
        runsResult,
        failedRunDetails,
      });
      fs.writeFileSync(writeAbsPath, `${JSON.stringify(snapshotPayload, null, 2)}\n`, 'utf8');
      console.log(`💾 Snapshot salvo em ${path.relative(process.cwd(), writeAbsPath)}\n`);
    }

    printRunsReport({
      ...runsResult,
      failedRunDetails,
    });
  } catch (err) {
    if (
      err.code === 'EAI_AGAIN'
      || err.code === 'ENOTFOUND'
      || err.code === 'ECONNREFUSED'
      || err.code === 'ETIMEDOUT'
      || err.message?.includes('getaddrinfo')
    ) {
      handleContingency(
        `Rede indisponível ou isolamento de sandbox (${err.code || err.message})`,
        defaultSnapshotAbsPath,
        cli.maxAgeHours
      );
      return;
    }
    console.error('❌ Erro inesperado durante a execução:', err);
    process.exit(1);
  }
}

main();
