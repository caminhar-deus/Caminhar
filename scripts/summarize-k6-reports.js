#!/usr/bin/env node

/**
 * Digest da bateria k6 para o `$GITHUB_STEP_SUMMARY`.
 *
 * O cron semanal "Load Tests (k6)" sobe `reports/k6-summaries/` como artifact
 * (`k6-load-test-reports`), mas baixar o zip exige autenticação — este script
 * publica um resumo legível na própria página do run, sem download.
 *
 * Entradas (somente leitura):
 *   - `orchestrator-results.json` — gerado por `scripts/run-all-load-tests-sequentially.js`
 *     (totais, duração e scripts reprovados com `details`).
 *   - Demais `*.json` do diretório — payload de `handleSummary` do k6
 *     (`load-tests/helpers/report.js:generateReport`). Arquivo sem objeto
 *     `metrics` é IGNORADO (inclui o próprio `orchestrator-results.json`).
 *
 * Uso:
 *   node scripts/summarize-k6-reports.js [dir]
 *
 * `dir` é opcional e padrão para `reports/k6-summaries` (raiz do projeto via
 * `process.cwd()`, mesma decisão de `scripts/clean-k6-reports.js`). O argumento
 * existe para teste manual com fixtures fora do diretório gitignored.
 *
 * CONTRATO DE EXIT CODE: este script NUNCA falha o job. Ele roda num step com
 * `always()` ANTES do `Upload k6 Reports`; o gate real da bateria é o exit code
 * do `Run Tests` (o orquestrador). Qualquer erro vira mensagem e exit 0 —
 * mascarar ou duplicar o gate seria pior que um summary ausente.
 *
 * Saída: append em `$GITHUB_STEP_SUMMARY` quando definido; stdout caso contrário.
 */
import fs from 'fs';
import path from 'path';

/** Diretório padrão dos relatórios (relativo à raiz do projeto). */
const DEFAULT_REPORTS_DIR = path.join(process.cwd(), 'reports', 'k6-summaries');

/** Nome do arquivo de consolidação do orquestrador (não é relatório k6). */
const ORCHESTRATOR_FILE = 'orchestrator-results';

/** Teto de linhas da seção de scripts reprovados (o step summary tem limite). */
const MAX_LINHAS_FALHAS = 20;

/** Teto de linhas da tabela por script (a bateria tem 30 scripts). */
const MAX_LINHAS_TABELA = 30;

/**
 * Lê o diretório de relatórios e separa o consolidação do orquestrador dos
 * payloads de `handleSummary` do k6.
 *
 * Função de efeito colateral mínima e síncrona (mesmo estilo de
 * `clean-k6-reports.js`): diretório ausente devolve estrutura vazia em vez de
 * lançar — quem decide a mensagem é `buildMarkdown`.
 *
 * @param {string} dir diretório com os `.json`
 * @returns {{ results: object|null, reports: Array<{ name: string, metrics: object }> }}
 */
export function readReports(dir) {
  if (!fs.existsSync(dir)) {
    return { results: null, reports: [] };
  }

  let results = null;
  const reports = [];

  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      // JSON corrompido/parcial (ex.: run abortado no meio da escrita):
      // pula o arquivo em vez de derrubar o digest inteiro.
      continue;
    }

    const name = file.slice(0, -'.json'.length);

    if (name === ORCHESTRATOR_FILE || (data && !data.metrics)) {
      // Consolidação do orquestrador (ou qualquer JSON sem `metrics`) não é
      // relatório k6: fora da varredura de thresholds, senão os totais seriam
      // contados em dobro.
      if (name === ORCHESTRATOR_FILE) results = data;
      continue;
    }

    if (data && typeof data.metrics === 'object' && data.metrics !== null) {
      reports.push({ name, metrics: data.metrics });
    }
  }

  return { results, reports };
}

/**
 * Valores de uma métrica do relatório, nos DOIS formatos que o k6 já produziu:
 *
 *   - atual (k6 pinado 2.3.0, o do artifact dos crons): `{ values: {...}, thresholds: { '<regra>': { ok: boolean } } }`;
 *   - legado (relatórios de 09/2026 que ainda estão em `reports/k6-summaries/`):
 *     `{ med, 'p(95)': 22.73, ..., thresholds: { 'p(95)<500': false } }` — valores
 *     no próprio objeto e o resultado do threshold como BOOLEAN.
 *
 * Sem o fallback, todo relatório legado aparece com p(95) `—` e seus thresholds
 * reprovados não entram na contagem. O digest não pode depender da versão do k6.
 */
function valoresDaMetrica(metric) {
  return metric && typeof metric.values === 'object' && metric.values !== null ? metric.values : metric;
}

/** O threshold reprovou? Aceita `{ ok: false }` (atual) e `false` (legado). */
function thresholdReprovado(resultado) {
  if (resultado === false) return true;
  return Boolean(resultado && resultado.ok === false);
}

/** Formata milissegundos como `1234,5 ms` (vírgula decimal, estilo pt-BR). */
function formatMs(value) {
  return `${Number(value).toFixed(1).replace('.', ',')} ms`;
}

/** Formata a duração ISO→ISO em minutos: `17,6 min`. */
function formatDurationMinutes(startTime, endTime) {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const minutes = (end - start) / 60000;
  return `${minutes.toFixed(1).replace('.', ',')} min`;
}

/**
 * Inventário de thresholds agregando TODOS os relatórios k6:
 * total de regras, quantas com `ok: false` e quantos scripts declaram gate de
 * `http_req_failed` (o "gate efetivo" de `docs/PROJECT_load-tests.md`, cron #20).
 */
function inventariarThresholds(reports) {
  let totalRegras = 0;
  let regrasReprovadas = 0;
  const scriptsComGateHttpReqFailed = [];
  const regrasHttpReqFailed = new Set();

  for (const { name, metrics } of reports) {
    for (const [metricName, metric] of Object.entries(metrics)) {
      const thresholds = metric && metric.thresholds;
      if (!thresholds || typeof thresholds !== 'object') continue;

      const regras = Object.entries(thresholds);
      totalRegras += regras.length;
      regrasReprovadas += regras.filter(([, resultado]) => thresholdReprovado(resultado)).length;

      if (metricName === 'http_req_failed' && regras.length > 0) {
        scriptsComGateHttpReqFailed.push(name);
        for (const [regra] of regras) regrasHttpReqFailed.add(regra);
      }
    }
  }

  return {
    totalRegras,
    regrasReprovadas,
    scriptsComGateHttpReqFailed,
    regrasHttpReqFailed: [...regrasHttpReqFailed].sort(),
  };
}

/** Lista plana dos scripts reprovados, a partir das categorias do orquestrador. */
function scriptsReprovados(results) {
  return (results.categories ?? [])
    .flatMap((categoria) => categoria.scripts ?? [])
    .filter((script) => script.status === 'fail');
}

/**
 * Monta o Markdown (pt-BR) para o `$GITHUB_STEP_SUMMARY`. Função PURA: só
 * transforma dados em texto, sem I/O — é o que a torna testável no jest.
 *
 * @param {{ results: object|null, reports: Array<{name: string, metrics: object}> }} entrada
 * @returns {string} Markdown pronto para o summary
 */
export function buildMarkdown({ results, reports }) {
  // Sem orquestrador e sem relatórios: a bateria não chegou a gerar nada
  // (setup falhou antes do Run Tests, ou o step rodou sem os arquivos).
  if (!results && reports.length === 0) {
    return '⚠️ Relatórios k6 não foram gerados nesta execução — nada a resumir.';
  }

  const linhas = ['## Load tests (k6)', ''];

  // 1. Totais e duração (só existem com o consolidação do orquestrador).
  if (results) {
    const duracao = formatDurationMinutes(results.startTime, results.endTime);
    const duracaoTexto = duracao ? ` — duração ${duracao} (${results.startTime} → ${results.endTime})` : '';
    linhas.push(
      `**${results.passed}/${results.totalScripts} scripts passaram** — ${results.failed} reprovado(s), ${results.skipped} ignorado(s)${duracaoTexto}.`,
      ''
    );

    // 2. Scripts reprovados, com exitCode e detalhes extraídos da saída.
    const falhas = scriptsReprovados(results);
    if (falhas.length > 0) {
      linhas.push(`### Scripts reprovados (${falhas.length})`, '');
      let corpo = 0;
      for (const script of falhas) {
        if (corpo >= MAX_LINHAS_FALHAS) {
          linhas.push(`- … lista truncada em ${MAX_LINHAS_FALHAS} linhas — detalhes completos no artifact \`k6-load-test-reports\`.`);
          break;
        }
        linhas.push(`- \`${script.name}\` — exit code ${script.exitCode ?? 'n/d'}`);
        corpo++;
        const details = script.details ?? {};
        const grupos = [
          ['threshold reprovado', details.failedThresholds],
          ['check reprovado', details.failedChecks],
          ['erro de console', details.consoleErrors],
        ];
        for (const [rotulo, entradas] of grupos) {
          for (const entrada of entradas ?? []) {
            if (corpo >= MAX_LINHAS_FALHAS) break;
            const contagem = entrada.counts ? ` (${entrada.counts})` : '';
            linhas.push(`  - ${rotulo}: ${entrada.text}${contagem}`);
            corpo++;
          }
        }
      }
      linhas.push('');
    }
  }

  // 3. Inventário de thresholds (agregado dos relatórios k6).
  const inventario = inventariarThresholds(reports);
  linhas.push('### Inventário de thresholds', '');
  if (reports.length === 0) {
    linhas.push('Nenhum relatório k6 com `metrics` encontrado no artifact.', '');
  } else {
    linhas.push(
      `- ${inventario.totalRegras} regras de threshold em ${reports.length} relatório(s); ${inventario.regrasReprovadas} reprovada(s).`,
      `- ${inventario.scriptsComGateHttpReqFailed.length} de ${reports.length} relatório(s) declaram gate de \`http_req_failed\`` +
        (inventario.regrasHttpReqFailed.length > 0
          ? ` (regras: ${inventario.regrasHttpReqFailed.map((r) => `\`${r}\``).join(', ')}).`
          : '.'),
      ''
    );
  }

  // 4. Tabela compacta por script (p(95) de http_req_duration e thresholds violados).
  linhas.push('| Relatório | p(95) `http_req_duration` | Thresholds violados |', '| --- | --- | --- |');
  for (const { name, metrics } of reports.slice(0, MAX_LINHAS_TABELA)) {
    const p95 = valoresDaMetrica(metrics.http_req_duration)?.['p(95)'];
    const violados = Object.values(metrics).reduce((acc, metric) => {
      const thresholds = metric && metric.thresholds;
      if (!thresholds || typeof thresholds !== 'object') return acc;
      return acc + Object.values(thresholds).filter(thresholdReprovado).length;
    }, 0);
    linhas.push(`| \`${name}\` | ${p95 !== undefined ? formatMs(p95) : '—'} | ${violados} |`);
  }
  if (reports.length > MAX_LINHAS_TABELA) {
    linhas.push(`| … | +${reports.length - MAX_LINHAS_TABELA} relatório(s) não listados | |`);
  }

  return linhas.join('\n');
}

/**
 * Escreve o Markdown: append em `$GITHUB_STEP_SUMMARY` (o GitHub concatena
 * vários steps no mesmo arquivo, por isso `appendFileSync` e não `writeFileSync`)
 * ou stdout quando a env não existe (execução local).
 */
function emitir(markdown, env) {
  const summaryPath = env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, `${markdown}\n`);
    return;
  }
  process.stdout.write(`${markdown}\n`);
}

/**
 * Ponto de entrada. Parâmetros injetáveis para o teste unitário; os defaults
 * cobrem a execução real via CLI.
 *
 * @param {string[]} args argumentos de CLI (sem `node` e sem o script)
 * @param {object} env ambiente (lê só `GITHUB_STEP_SUMMARY`)
 */
export function main(args = process.argv.slice(2), env = process.env) {
  const dir = args[0] ? path.resolve(args[0]) : DEFAULT_REPORTS_DIR;
  try {
    emitir(buildMarkdown(readReports(dir)), env);
  } catch (error) {
    // Cintura-e-suspensório: o contrato é nunca derrubar o job (ver header).
    process.stdout.write(
      `⚠️ Falha ao montar o digest dos relatórios k6 (${error.message}) — o gate real é o exit code do Run Tests.\n`
    );
  }
}

// Executa se chamado diretamente — mesmo padrão de `clean-k6-reports.js` e
// `check-hardcoded-credentials.js`: importar o módulo (ex.: no teste unitário)
// não pode rodar o main nem tocar no stdout do worker do Jest.
if (process.argv[1] && process.argv[1].endsWith('summarize-k6-reports.js')) {
  main();
}
