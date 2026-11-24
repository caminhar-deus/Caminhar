/**
 * Helpers puros para auditoria paginada do GitHub Actions e parsing/metadados de logs locais.
 * Sem side effects no top-level nem `import.meta`, para uso direto em Node ESM e Jest.
 */

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
 * Resume o conteúdo de um log de execução do Jest (`tests-output.log` ou `coverage-output.log`).
 */
export function summarizeJestLog(content) {
  const text = String(content || '');
  const meta = parseLogMeta(text);
  const lines = text.split(/\r?\n/);

  let suitesLine = null;
  let testsLine = null;
  let timeLine = null;
  let allFilesCoverageLine = null;

  for (const line of lines) {
    if (line.includes('Test Suites:')) suitesLine = line.trim();
    if (line.includes('Tests:')) testsLine = line.trim();
    if (line.includes('Time:')) timeLine = line.trim();
    if (/^\s*All files\s*\|/.test(line)) allFilesCoverageLine = line.trim();
  }

  const failed = Boolean(
    (meta.exitCode !== null && meta.exitCode !== 0)
    || /^FAIL\s/m.test(text)
    || (suitesLine && /\bfailed\b/i.test(suitesLine))
  );

  return {
    meta,
    suitesLine,
    testsLine,
    timeLine,
    allFilesCoverageLine,
    failed,
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
