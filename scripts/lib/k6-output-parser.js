/**
 * Captura limitada e extração de falhas da saída do k6.
 *
 * Usado pelo orquestrador `scripts/run-all-load-tests-sequentially.js` para
 * montar a seção de erros detalhados do relatório final e o campo `details`
 * de cada script falho no `orchestrator-results.json`.
 *
 * Regras do módulo:
 * - Nenhuma função aqui lança exceção: saída vazia, binária, gigante ou
 *   malformada cai em resultado vazio/parcial. O parsing é APENAS para
 *   relatório e nunca altera a semântica de pass/fail do orquestrador.
 * - `BoundedTailBuffer` guarda no máximo `MAX_CAPTURE_BYTES` por script
 *   (janela deslizante pelo FIM da saída, onde ficam o resumo do k6, os
 *   thresholds cruzados e as mensagens `level=error`).
 */

/** Limite de saída capturada por script (5 MB). */
export const MAX_CAPTURE_BYTES = 5 * 1024 * 1024;

/** Limite de entradas por grupo no relatório (checks/thresholds/console). */
export const MAX_DETAILS_PER_GROUP = 100;

/**
 * Limite de fragmentos internos do buffer. Saída que chega em muitos pedaços
 * minúsculos é coalescida para manter o número de objetos em memória baixo.
 */
const MAX_CHUNKS = 4096;

/**
 * Buffer de saída com janela deslizante pelo fim: mantém os últimos
 * `limit` bytes e marca `truncated` quando algo foi descartado.
 */
export class BoundedTailBuffer {
  #chunks = [];
  #size = 0;
  #droppedBytes = 0;
  #limit;

  constructor(limit = MAX_CAPTURE_BYTES) {
    this.#limit = Number.isFinite(limit) && limit > 0 ? limit : MAX_CAPTURE_BYTES;
  }

  push(chunk) {
    try {
      if (chunk === null || chunk === undefined) return;
      let data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (data.length === 0) return;
      if (data.length > this.#limit) {
        this.#droppedBytes += data.length - this.#limit;
        data = data.subarray(data.length - this.#limit);
      }
      this.#chunks.push(data);
      this.#size += data.length;
      // Descarta do início (mais antigo) até voltar ao limite.
      while (this.#size > this.#limit && this.#chunks.length > 1) {
        const oldest = this.#chunks.shift();
        this.#size -= oldest.length;
        this.#droppedBytes += oldest.length;
      }
      // Saída minúscula e recorrente (ex.: progresso com \r): coalesce para
      // não acumular centenas de milhares de objetos de buffer.
      if (this.#chunks.length > MAX_CHUNKS) {
        const merged = Buffer.concat(this.#chunks, this.#size);
        this.#chunks = [merged];
      }
    } catch {
      // Captura nunca pode quebrar o orquestrador.
    }
  }

  /** true quando pelo menos um byte foi descartado por exceder o limite. */
  get truncated() {
    return this.#droppedBytes > 0;
  }

  get droppedBytes() {
    return this.#droppedBytes;
  }

  toString() {
    try {
      if (this.#chunks.length === 0) return '';
      if (this.#chunks.length === 1) return this.#chunks[0].toString('utf8');
      return Buffer.concat(this.#chunks, this.#size).toString('utf8');
    } catch {
      return '';
    }
  }
}

// ANSI CSI: caractere de controle + `[…` + finalizador (0x40–0x7E).
// Usa `\p{Cc}` (categoria Unicode "control") em vez de `\x1b` literal —
// mesma intenção, sem violar a regra `no-control-regex` do ESLint.
const ANSI_RE = /\p{Cc}\[[0-9;?]*[ -/]*[@-~]/gu;
// Caracteres de controle residuais (ESC solto, BEL, DEL, C1 etc.).
const CONTROL_CHARS_RE = /[\p{Cc}]/gu;
// Resumo de métrica do k6: `http_req_failed................: 49.75%`.
const METRIC_SUMMARY_RE = /^[^\s]+\.{2,}\s*:/;
const CONSOLE_LEVEL_RE = /level=(?:error|fatal)\b/;
const CONSOLE_MSG_RE = /msg="([^"]*)"/;

/**
 * Normaliza uma linha bruta da saída do k6: remove cores ANSI e demais
 * caracteres de controle, depois os espaços das bordas.
 *
 * O k6 redesenha o progresso com `\r` e o chamador separa os segmentos como
 * linhas distintas: o estado dos checks é cumulativo (um check que já falhou
 * não volta a `✓`), as contagens `↳` são sobrescritas pela mais recente e as
 * repetições caem na deduplicação por texto.
 */
function normalizeLine(rawLine) {
  return rawLine.replace(ANSI_RE, '').replace(CONTROL_CHARS_RE, '').trim();
}

/**
 * Extrai os erros estruturados da saída de um script k6 que falhou.
 *
 * Captura:
 * - linhas de check que falharam (iniciadas por `✗`), com a contagem `↳`
 *   quando a linha seguinte existe;
 * - linhas de threshold/métrica violada (também prefixadas por `✗`, incluindo
 *   as dentro da seção `█ THRESHOLDS`);
 * - mensagens `level=error` (e `level=fatal`) do console, pelo conteúdo de
 *   `msg="..."`.
 *
 * Linhas agregadas como `checks.....: 66.66% ✓ 206 ✗ 103` (que contêm `✗`
 * mas não começam com ele) não são listadas: os dados já aparecem nas linhas
 * individuais de check/threshold. Saídas duplicadas (redraws do k6) são
 * deduplicadas por texto.
 *
 * Nunca lança exceção. Retorna um objeto com:
 *   { exitCode, signal, timedOut, failedChecks, failedThresholds,
 *     consoleErrors, truncated, omittedCount }
 * onde os grupos são listas de `{ text, counts }` (`counts` = linha `↳`).
 */
export function extractFailureDetails(output, options = {}) {
  const {
    exitCode = null,
    signal = null,
    timedOut = false,
    truncated = false,
  } = options ?? {};

  const details = {
    exitCode: exitCode ?? null,
    signal: signal ?? null,
    timedOut: Boolean(timedOut),
    failedChecks: [],
    failedThresholds: [],
    consoleErrors: [],
    truncated: Boolean(truncated),
    omittedCount: 0,
  };

  try {
    let text = '';
    if (typeof output === 'string') {
      text = output;
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(output)) {
      text = output.toString('utf8');
    }
    if (text.length === 0) return details;

    const seen = {
      failedChecks: new Map(),
      failedThresholds: new Map(),
      consoleErrors: new Map(),
    };
    let inThresholdsSection = false;
    let lastFailedCheck = null;
    let omitted = 0;

    // Deduplica por texto; devolve a entrada existente para que uma nova
    // contagem `↳` atualize a ocorrência original.
    const add = (group, text_) => {
      const existing = seen[group].get(text_);
      if (existing) return existing;
      if (details[group].length >= MAX_DETAILS_PER_GROUP) {
        omitted += 1;
        return null;
      }
      const entry = { text: text_, counts: null };
      seen[group].set(text_, entry);
      details[group].push(entry);
      return entry;
    };

    // `\r` também é separador: o k6 redesenha progresso com carriage return
    // e queremos todos os segmentos (o último `↳` prevalece por sobrescrita).
    for (const rawLine of text.split(/\r\n|\n|\r/)) {
      const line = normalizeLine(rawLine);
      if (!line) continue;

      // Cabeçalho de seção do resumo k6 (ex.: `█ THRESHOLDS`).
      if (line.includes('█') && !line.startsWith('✗')) {
        inThresholdsSection = /THRESHOLDS/i.test(line);
        lastFailedCheck = null;
        continue;
      }

      // Mensagens de console do k6 (stdout/stderr).
      if (CONSOLE_LEVEL_RE.test(line)) {
        const msg = line.match(CONSOLE_MSG_RE);
        add('consoleErrors', msg ? msg[1] : line);
        lastFailedCheck = null;
        continue;
      }

      // Contagem de um check (`↳ 0% — ✓ 0 / ✗ 103`) pendente da linha anterior.
      if (line.startsWith('↳')) {
        if (lastFailedCheck) lastFailedCheck.counts = line;
        continue;
      }

      if (line.startsWith('✗')) {
        const core = line.replace(/^✗\s*/, '');
        if (!core) continue;
        const group =
          inThresholdsSection || core.startsWith("'") || METRIC_SUMMARY_RE.test(core)
            ? 'failedThresholds'
            : 'failedChecks';
        const entry = add(group, core);
        lastFailedCheck = group === 'failedChecks' ? entry : null;
        continue;
      }

      // Qualquer outra linha (ex.: check ✓) encerra a janela de `↳`.
      lastFailedCheck = null;
    }

    details.omittedCount = omitted;
  } catch {
    // Defensivo: em erro inesperado devolve o que já foi extraído, sem lançar.
  }

  return details;
}
