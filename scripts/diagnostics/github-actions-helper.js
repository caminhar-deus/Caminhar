/**
 * Helpers puros para auditoria paginada do GitHub Actions, snapshots offline e parsing/metadados de logs locais.
 * Sem side effects no top-level nem `import.meta`, para uso direto em Node ESM e Jest.
 */

export const DEFAULT_ACTIONS_SNAPSHOT_REL = 'logs/github-actions-snapshot.json';
export const DEFAULT_MAX_SNAPSHOT_AGE_HOURS = 24;

const SPEC_RESULT_LINE_RE = /^\s*(?:✓|✔|✕|×|○)\s/;
const GH_LOG_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+/;
const NOISE_SPEC_LINE_RE = /^(?:✓|✔|○)\s/;
const NOISE_NPM_BLANK_RE = /^npm (?:ERR!|error)\s*$/i;
const NOISE_NPM_HELP_RE = /^npm (?:ERR!|error)\s+(?:--\S|\s{2,}|aliases:|Run "npm help|Usage:|See:|For more info)/i;
const NOISE_GH_MARKER_RE = /^##\[(?:end-action|group|endgroup|debug)\]/i;
const CANDIDATE_ERROR_RE = /error|fail|exception|fatal|reprov|eusage|assertion|expected:|received:|^\s*●\s|^\s*(?:✕|×)\s/i;
const HIGH_SIGNAL_ERROR_RE = new RegExp(
  [
    '^npm (?:ERR!|error)\\s+(?:code\\s+|`?npm ci|Invalid:|Missing:|Cannot\\b|ERESOLVE|EUSAGE|.*\\bin sync\\b)',
    '^FAIL\\s',
    '^\\s*●\\s',
    '^\\s*(?:✕|×)\\s',
    '^\\s*(?:Expected|Received):',
    '^##\\[error\\]',
    '^Test Suites:.*failed',
    '^Tests:.*failed',
    'Summary of all failing tests',
    '(?:AssertionError|TypeError|ReferenceError|SyntaxError):',
  ].join('|'),
  'i'
);

/**
 * Monta o caminho da API REST de workflow runs do GitHub filtrado pela data inicial.
 * @param {Object} params
 * @param {string} params.repo - Repositório no formato owner/name
 * @param {string} params.sinceDateIso - Data inicial em formato ISO-8601
 * @param {number} [params.page=1] - Página (1-based)
 * @param {number} [params.perPage=100] - Itens por página
 * @returns {string} Caminho relativo para requestGitHub
 */
export function buildRunsApiPath({ repo, sinceDateIso, page = 1, perPage = 100 }) {
  const createdFilter = encodeURIComponent(`>=${String(sinceDateIso).slice(0, 10)}`);
  return `/repos/${repo}/actions/runs?per_page=${perPage}&created=${createdFilter}&page=${page}`;
}

/**
 * Interpreta argumentos de linha de comando do script `check-github-actions.js`.
 * @param {string[]} [argv=[]]
 * @returns {{writeSnapshotPath: string|null, fromSnapshotPath: string|null, maxAgeHours: number}}
 */
export function parseDiagnosticsCliArgs(argv = []) {
  let writeSnapshotPath = null;
  let fromSnapshotPath = null;
  let maxAgeHours = DEFAULT_MAX_SNAPSHOT_AGE_HOURS;

  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i]);

    if (arg === '--write-snapshot') {
      const next = args[i + 1];
      if (next && !String(next).startsWith('--')) {
        writeSnapshotPath = String(next);
        i += 1;
      } else {
        writeSnapshotPath = DEFAULT_ACTIONS_SNAPSHOT_REL;
      }
      continue;
    }

    if (arg.startsWith('--write-snapshot=')) {
      const value = arg.slice('--write-snapshot='.length).trim();
      writeSnapshotPath = value || DEFAULT_ACTIONS_SNAPSHOT_REL;
      continue;
    }

    if (arg === '--from-snapshot') {
      const next = args[i + 1];
      if (next && !String(next).startsWith('--')) {
        fromSnapshotPath = String(next);
        i += 1;
      } else {
        fromSnapshotPath = DEFAULT_ACTIONS_SNAPSHOT_REL;
      }
      continue;
    }

    if (arg.startsWith('--from-snapshot=')) {
      const value = arg.slice('--from-snapshot='.length).trim();
      fromSnapshotPath = value || DEFAULT_ACTIONS_SNAPSHOT_REL;
      continue;
    }

    if (arg === '--max-snapshot-age-hours') {
      const next = Number(args[i + 1]);
      if (Number.isFinite(next) && next > 0) {
        maxAgeHours = next;
        i += 1;
      }
      continue;
    }

    if (arg.startsWith('--max-snapshot-age-hours=')) {
      const value = Number(arg.slice('--max-snapshot-age-hours='.length));
      if (Number.isFinite(value) && value > 0) {
        maxAgeHours = value;
      }
    }
  }

  return {
    writeSnapshotPath,
    fromSnapshotPath,
    maxAgeHours,
  };
}

/**
 * Busca todas as execuções de workflow nos últimos 7 dias com paginação e detecção de truncamento.
 * @param {Object} params
 * @param {string} params.repo - Repositório owner/name
 * @param {Date} params.sevenDaysAgo - Corte temporal inicial
 * @param {(apiPath: string) => Promise<{statusCode: number, data: string}>} params.requestFn - Cliente HTTP
 * @param {number} [params.perPage=100] - Tamanho da página
 * @param {number} [params.maxPages=10] - Limite máximo de páginas para evitar loop infinito
 * @returns {Promise<Object>} Resultado consolidado da coleta
 */
export async function fetchRecentWorkflowRuns({
  repo,
  sevenDaysAgo,
  requestFn,
  perPage = 100,
  maxPages = 10,
}) {
  const sinceDateIso = sevenDaysAgo.toISOString();
  const seenIds = new Set();
  const collected = [];
  let totalCount = 0;
  let latestRunOverall = null;
  let pagesFetched = 0;
  let truncated = false;

  for (let page = 1; page <= maxPages; page += 1) {
    const apiPath = buildRunsApiPath({ repo, sinceDateIso, page, perPage });
    const res = await requestFn(apiPath);
    if (res.statusCode !== 200) {
      return { ok: false, statusCode: res.statusCode, page };
    }

    pagesFetched += 1;
    const payload = JSON.parse(res.data || '{}');
    if (page === 1) {
      totalCount = Number(payload.total_count ?? 0);
    }

    const pageRuns = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
    if (page === 1 && pageRuns.length > 0) {
      latestRunOverall = pageRuns[0];
    }

    for (const run of pageRuns) {
      if (run && run.id !== undefined && !seenIds.has(run.id)) {
        seenIds.add(run.id);
        collected.push(run);
      } else if (run && run.id === undefined) {
        collected.push(run);
      }
    }

    if (pageRuns.length < perPage) {
      break;
    }

    const lastRun = pageRuns[pageRuns.length - 1];
    const lastCreatedAt = lastRun?.created_at ? new Date(lastRun.created_at) : null;
    if (lastCreatedAt && lastCreatedAt < sevenDaysAgo) {
      break;
    }

    if (page === maxPages) {
      truncated = true;
    }
  }

  const recentRuns = collected.filter((run) => new Date(run.created_at) >= sevenDaysAgo);

  return {
    ok: true,
    recentRuns,
    latestRunOverall,
    totalCount,
    pagesFetched,
    truncated,
  };
}

/**
 * Agrupa runs por conclusão/status e separa as execuções com falha.
 * @param {Array<Object>} [recentRuns=[]]
 * @returns {{runsByConclusion: Record<string, number>, failedRuns: Array<Object>}}
 */
export function summarizeWorkflowRuns(recentRuns = []) {
  const runsByConclusion = {};
  const failedRuns = [];

  for (const run of Array.isArray(recentRuns) ? recentRuns : []) {
    const conc = run?.conclusion || run?.status || 'unknown';
    runsByConclusion[conc] = (runsByConclusion[conc] || 0) + 1;
    if (run?.conclusion === 'failure') {
      failedRuns.push(run);
    }
  }

  return { runsByConclusion, failedRuns };
}

function compareRunRecency(a, b) {
  const createdCmp = String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
  if (createdCmp !== 0) return createdCmp;
  const numDiff = Number(b?.run_number || 0) - Number(a?.run_number || 0);
  if (numDiff !== 0) return numDiff;
  return Number(b?.id || 0) - Number(a?.id || 0);
}

/**
 * Separa execuções com falha entre falhas ativas (quando a execução concluída mais
 * recente de um workflow terminou em `failure`) e falhas históricas já superadas.
 * @param {Array<Object>} [recentRuns=[]]
 * @returns {{activeFailedRuns: Array<Object>, resolvedFailedRuns: Array<Object>}}
 */
export function partitionFailedRuns(recentRuns = []) {
  const runs = Array.isArray(recentRuns) ? recentRuns.filter((r) => r && typeof r === 'object') : [];
  const latestCompletedByWorkflow = new Map();

  for (const run of runs) {
    if (typeof run.conclusion !== 'string' || !run.conclusion.trim()) {
      continue;
    }
    const wfName = run.name || 'unknown';
    const currentBest = latestCompletedByWorkflow.get(wfName);
    if (!currentBest || compareRunRecency(run, currentBest) < 0) {
      latestCompletedByWorkflow.set(wfName, run);
    }
  }

  const activeFailedRuns = [];
  const resolvedFailedRuns = [];

  for (const run of runs) {
    if (run.conclusion !== 'failure') continue;
    const wfName = run.name || 'unknown';
    const latestCompleted = latestCompletedByWorkflow.get(wfName);
    const sameById =
      run.id !== undefined &&
      run.id !== null &&
      latestCompleted?.id !== undefined &&
      latestCompleted?.id !== null &&
      run.id === latestCompleted.id;

    if (latestCompleted?.conclusion === 'failure' && (sameById || run === latestCompleted)) {
      activeFailedRuns.push(run);
    } else {
      resolvedFailedRuns.push(run);
    }
  }

  activeFailedRuns.sort(compareRunRecency);
  resolvedFailedRuns.sort(compareRunRecency);

  return { activeFailedRuns, resolvedFailedRuns };
}

/**
 * Extrai as linhas mais relevantes de erro de um log bruto de job do GitHub Actions,
 * descartando specs aprovados do Jest, ajuda CLI do npm e marcadores internos.
 * @param {string} rawLog
 * @param {number} [limit=15]
 * @returns {string[]}
 */
export function extractErrorLinesFromJobLog(rawLog, limit = 15) {
  const maxLines = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 15;
  if (maxLines === 0) return [];

  const candidates = [];
  const highSignal = [];

  for (const rawLine of String(rawLog || '').split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const body = trimmed.replace(GH_LOG_TIMESTAMP_RE, '').trim();
    if (!body) continue;

    if (
      NOISE_NPM_BLANK_RE.test(body)
      || NOISE_SPEC_LINE_RE.test(body)
      || /^PASS\s/.test(body)
      || NOISE_NPM_HELP_RE.test(body)
      || NOISE_GH_MARKER_RE.test(body)
    ) {
      continue;
    }

    if (!CANDIDATE_ERROR_RE.test(body)) continue;

    candidates.push(trimmed);
    if (HIGH_SIGNAL_ERROR_RE.test(body)) {
      highSignal.push(trimmed);
    }
  }

  const chosen = highSignal.length > 0 ? highSignal : candidates;
  if (chosen.length <= maxLines) {
    return chosen;
  }

  const headCount = Math.ceil(maxLines / 2);
  const tailCount = maxLines - headCount;
  return [
    ...chosen.slice(0, headCount),
    ...(tailCount > 0 ? chosen.slice(-tailCount) : []),
  ];
}

/**
 * Agrega execuções recentes por workflow mantendo totais e metadados do último run.
 * @param {Array<Object>} [recentRuns=[]]
 * @returns {Array<{name: string, total: number, success: number, failure: number, other: number, latest: Object|null}>}
 */
export function summarizeRunsByWorkflow(recentRuns = []) {
  const groups = new Map();

  for (const run of Array.isArray(recentRuns) ? recentRuns : []) {
    if (!run || typeof run !== 'object') continue;
    const name = run.name || 'unknown';
    let entry = groups.get(name);
    if (!entry) {
      entry = { name, total: 0, success: 0, failure: 0, other: 0, latest: null };
      groups.set(name, entry);
    }

    entry.total += 1;
    if (run.conclusion === 'success') entry.success += 1;
    else if (run.conclusion === 'failure') entry.failure += 1;
    else entry.other += 1;

    const runCreatedAt = String(run.created_at || '');
    const latestCreatedAt = String(entry.latest?.created_at || '');
    if (!entry.latest || runCreatedAt > latestCreatedAt) {
      entry.latest = {
        run_number: run.run_number ?? null,
        id: run.id ?? null,
        conclusion: run.conclusion ?? null,
        status: run.status ?? null,
        event: run.event ?? null,
        created_at: run.created_at ?? null,
        sha: run.head_commit?.id ? String(run.head_commit.id).slice(0, 8) : null,
      };
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      String(b.latest?.created_at || '').localeCompare(String(a.latest?.created_at || ''))
      || a.name.localeCompare(b.name)
  );
}

function sanitizeWorkflowRun(run) {
  if (!run || typeof run !== 'object') return null;
  return {
    id: run.id ?? null,
    run_number: run.run_number ?? null,
    name: run.name ?? null,
    event: run.event ?? null,
    head_branch: run.head_branch ?? null,
    conclusion: run.conclusion ?? null,
    status: run.status ?? null,
    created_at: run.created_at ?? null,
    html_url: run.html_url ?? null,
    head_commit: run.head_commit
      ? {
          id: run.head_commit.id ?? null,
          message: typeof run.head_commit.message === 'string'
            ? run.head_commit.message.split('\n')[0]
            : null,
        }
      : null,
  };
}

/**
 * Monta payload sanitizado de snapshot offline das execuções do GitHub Actions (sem tokens ou headers).
 */
export function buildActionsSnapshot({
  repo,
  capturedAt = new Date(),
  sevenDaysAgo,
  runsResult,
  failedRunDetails = [],
}) {
  return {
    schemaVersion: 1,
    repo,
    capturedAt: new Date(capturedAt).toISOString(),
    windowSince: sevenDaysAgo ? new Date(sevenDaysAgo).toISOString() : null,
    totalCount: Number(runsResult?.totalCount ?? 0),
    pagesFetched: Number(runsResult?.pagesFetched ?? 0),
    truncated: Boolean(runsResult?.truncated),
    recentRuns: (Array.isArray(runsResult?.recentRuns) ? runsResult.recentRuns : [])
      .map(sanitizeWorkflowRun)
      .filter(Boolean),
    latestRunOverall: runsResult?.latestRunOverall
      ? sanitizeWorkflowRun(runsResult.latestRunOverall)
      : null,
    failedRunDetails: Array.isArray(failedRunDetails) ? failedRunDetails : [],
  };
}

/**
 * Valida estrutura, repositório de origem e frescor de um snapshot offline do GitHub Actions.
 * @param {string|Object} rawSnapshot
 * @param {Object} options
 * @param {string} options.expectedRepo
 * @param {Date} [options.now]
 * @param {number} [options.maxAgeHours]
 * @returns {{valid: boolean, stale: boolean, ageHours: number|null, reason: string|null, snapshot: Object|null}}
 */
export function evaluateActionsSnapshot(
  rawSnapshot,
  { expectedRepo, now = new Date(), maxAgeHours = DEFAULT_MAX_SNAPSHOT_AGE_HOURS }
) {
  let snapshot = rawSnapshot;
  if (typeof rawSnapshot === 'string') {
    try {
      snapshot = JSON.parse(rawSnapshot);
    } catch {
      return {
        valid: false,
        stale: false,
        ageHours: null,
        reason: 'JSON inválido no snapshot do GitHub Actions.',
        snapshot: null,
      };
    }
  }

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {
      valid: false,
      stale: false,
      ageHours: null,
      reason: 'Estrutura de snapshot inválida.',
      snapshot: null,
    };
  }

  if (snapshot.schemaVersion !== 1) {
    return {
      valid: false,
      stale: false,
      ageHours: null,
      reason: `Versão de schema não suportada (${snapshot.schemaVersion}).`,
      snapshot: null,
    };
  }

  if (snapshot.repo !== expectedRepo) {
    return {
      valid: false,
      stale: false,
      ageHours: null,
      reason: `Repositório divergente no snapshot (esperado: ${expectedRepo}, recebido: ${snapshot.repo}).`,
      snapshot: null,
    };
  }

  if (!Array.isArray(snapshot.recentRuns)) {
    return {
      valid: false,
      stale: false,
      ageHours: null,
      reason: 'Campo recentRuns ausente ou inválido no snapshot.',
      snapshot: null,
    };
  }

  const capturedMs = Date.parse(snapshot.capturedAt);
  if (!snapshot.capturedAt || Number.isNaN(capturedMs)) {
    return {
      valid: false,
      stale: false,
      ageHours: null,
      reason: 'Timestamp capturedAt ausente ou inválido no snapshot.',
      snapshot: null,
    };
  }

  const nowMs = new Date(now).getTime();
  const ageHours = Math.max(0, (nowMs - capturedMs) / (1000 * 60 * 60));
  const stale = ageHours > maxAgeHours;

  return {
    valid: true,
    stale,
    ageHours,
    reason: stale
      ? `Snapshot expirado (${ageHours.toFixed(1)}h > limite de ${maxAgeHours}h).`
      : null,
    snapshot,
  };
}

/**
 * Formata a linha inicial de metadados de execução para arquivos de log locais.
 */
export function formatLogMetaStart({ startedAt, gitSha, command }) {
  return `[log-meta] started_at=${startedAt} git_sha=${gitSha} command=${JSON.stringify(command)}`;
}

/**
 * Formata a linha final de metadados de execução para arquivos de log locais.
 */
export function formatLogMetaEnd({ finishedAt, durationMs, exitCode }) {
  return `[log-meta] finished_at=${finishedAt} duration_ms=${durationMs} exit_code=${exitCode}`;
}

/**
 * Extrai metadados `[log-meta]` gravados no início/fim de um arquivo de log.
 * @param {string} content
 * @returns {{startedAt: string|null, finishedAt: string|null, durationMs: number|null, exitCode: number|null, gitSha: string|null, command: string|null}}
 */
export function parseLogMeta(content) {
  const meta = {
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    exitCode: null,
    gitSha: null,
    command: null,
  };

  if (!content) return meta;

  for (const line of String(content).split(/\r?\n/)) {
    if (!line.startsWith('[log-meta] ')) continue;

    const startMatch = line.match(
      /^\[log-meta\]\s+started_at=(\S+)\s+git_sha=(\S+)\s+command=(.+)$/
    );
    if (startMatch) {
      meta.startedAt = startMatch[1];
      meta.gitSha = startMatch[2];
      try {
        meta.command = JSON.parse(startMatch[3]);
      } catch {
        meta.command = startMatch[3];
      }
      continue;
    }

    const endMatch = line.match(
      /^\[log-meta\]\s+finished_at=(\S+)\s+duration_ms=(\d+)\s+exit_code=(-?\d+)$/
    );
    if (endMatch) {
      meta.finishedAt = endMatch[1];
      meta.durationMs = Number(endMatch[2]);
      meta.exitCode = Number(endMatch[3]);
    }
  }

  return meta;
}

/**
 * Resume o conteúdo de um log de execução do Jest (`tests-output.log` ou `coverage-output.log`)
 * e contabiliza ruídos de console (`console.error`, `console.warn`, `act(...)` e navegação jsdom).
 */
export function summarizeJestLog(content) {
  const text = String(content || '');
  const meta = parseLogMeta(text);
  const lines = text.split(/\r?\n/);

  let suitesLine = null;
  let testsLine = null;
  let timeLine = null;
  let allFilesCoverageLine = null;
  let consoleErrors = 0;
  let consoleWarns = 0;
  let actWarnings = 0;
  let jsdomNavigationErrors = 0;

  for (const line of lines) {
    if (line.includes('Test Suites:')) suitesLine = line.trim();
    if (line.includes('Tests:')) testsLine = line.trim();
    if (line.includes('Time:')) timeLine = line.trim();
    if (/^\s*All files\s*\|/.test(line)) allFilesCoverageLine = line.trim();

    if (/^\s*console\.error\b/.test(line)) consoleErrors += 1;
    if (/^\s*console\.warn\b/.test(line)) consoleWarns += 1;

    if (!SPEC_RESULT_LINE_RE.test(line)) {
      if (line.includes('not wrapped in act(')) actWarnings += 1;
      if (line.includes('Not implemented: navigation')) jsdomNavigationErrors += 1;
    }
  }

  const failed = Boolean(
    (meta.exitCode !== null && meta.exitCode !== 0)
    || /^FAIL\s/m.test(text)
    || (suitesLine && /\bfailed\b/i.test(suitesLine))
  );

  const hasConsoleNoise = Boolean(
    consoleErrors > 0 || consoleWarns > 0 || actWarnings > 0 || jsdomNavigationErrors > 0
  );

  return {
    meta,
    suitesLine,
    testsLine,
    timeLine,
    allFilesCoverageLine,
    failed,
    consoleErrors,
    consoleWarns,
    actWarnings,
    jsdomNavigationErrors,
    hasConsoleNoise,
  };
}

/**
 * Resume o conteúdo de `logs/eslint.log`, tratando corretamente cabeçalhos `[log-meta]`.
 */
export function summarizeEslintLog(content, byteSize = null) {
  const text = String(content || '');
  const size = byteSize === null ? Buffer.byteLength(text, 'utf8') : byteSize;
  const meta = parseLogMeta(text);

  if (size === 0) {
    return { meta, clean: true, problemLine: null, byteSize: size };
  }

  const nonMetaLines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.startsWith('[log-meta]'));

  const clean = nonMetaLines.length === 0 && (meta.exitCode === null || meta.exitCode === 0);
  const problemLine = clean
    ? null
    : (
        nonMetaLines.find((line) => line.includes('problem'))
        || nonMetaLines.find((line) => /\berror\b/i.test(line))
        || nonMetaLines[0]
        || null
      );

  return {
    meta,
    clean,
    problemLine: problemLine ? problemLine.trim() : null,
    byteSize: size,
  };
}
