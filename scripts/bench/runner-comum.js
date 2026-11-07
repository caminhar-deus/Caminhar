/**
 * Utilidades comuns aos runners de bench (`orchestrator/rodar.js` e `papeis/rodar.js`).
 *
 * Só entra aqui o que é idêntico nos dois e não depende do modo de execução:
 * execução de comando e de sessão (streaming, timeout e `sessionID`), catálogo de
 * modelos, stdin fechado, representação curta dos argumentos e classificação de
 * saídas já existentes. O planejamento de jobs fica em cada runner porque o do
 * orchestrator tem turno/sessão e o de papéis tem agente/tarefa.
 */
import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { constants, createWriteStream } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Projeto de memória das medições. Nunca é o projeto real do repositório. */
const PROJETO_BENCH = { workspace: 'default', project: 'bench' };

/**
 * O bench abre sessões reais do OpenCode e o plugin do ai-memory grava cada uma
 * no projeto do `.ai-memory.toml` mais próximo do cwd. Sem isolamento, dezenas
 * de sessões de medição entram no histórico real do projeto (foi o que
 * aconteceu na bateria 9x5: ~55 sessões em `pessoal/caminhar`).
 *
 * O bench só roda numa cópia cujo marcador declara `default/bench`. Fail-fast
 * antes de qualquer spawn: uma cópia recém-criada, ainda com o marcador do
 * projeto, não pode voltar a poluir o histórico. O marcador precisa estar
 * COMMITADO na cópia — os runners restauram arquivo rastreado com
 * `git checkout --`, e um marcador apenas modificado voltaria ao valor antigo.
 */
export async function exigirMarcadorDeBench(raiz) {
  const arquivo = path.join(raiz, '.ai-memory.toml');
  let texto;
  try {
    texto = await readFile(arquivo, 'utf8');
  } catch {
    throw new Error(
      `Bench sem marcador isolado: ${arquivo} não existe. Rode numa cópia com ` +
      `workspace = "${PROJETO_BENCH.workspace}" e project = "${PROJETO_BENCH.project}" ` +
      '(ver scripts/bench/orchestrator/LEIA-ME.md, "Isolamento da memória").'
    );
  }

  const valor = (chave) => {
    const achado = new RegExp(`^\\s*${chave}\\s*=\\s*"([^"]*)"`, 'm').exec(texto);
    return achado?.[1];
  };
  const workspace = valor('workspace');
  const project = valor('project');
  if (workspace !== PROJETO_BENCH.workspace || project !== PROJETO_BENCH.project) {
    throw new Error(
      `Bench apontando para ${workspace ?? '?'}/${project ?? '?'}: as sessões cairiam no ` +
      'histórico desse projeto. Ajuste ' + `${arquivo} para workspace = "${PROJETO_BENCH.workspace}" ` +
      `e project = "${PROJETO_BENCH.project}", e commite o marcador na cópia. ` +
      'Ver scripts/bench/orchestrator/LEIA-ME.md, "Isolamento da memória".'
    );
  }
}

/**
 * `stdio[0] = 'ignore'` não é detalhe: com 'pipe' o filho herda um stdin que
 * ninguém escreve nem fecha, e o `opencode run` trava lendo stdin antes de abrir
 * a sessão (medido em 19/10/2026: zero bytes, nenhum processo, nenhum erro).
 */
export const STDIO = ['ignore', 'pipe', 'pipe'];

/** Executa um comando e devolve { codigo, stdout, stderr }. */
export function executar(raiz, comando, args, opcoes = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(comando, args, { cwd: raiz, stdio: STDIO, env: process.env, ...opcoes });
    let stdout = '';
    let stderr = '';
    filho.stdout?.on('data', (d) => { stdout += d; });
    filho.stderr?.on('data', (d) => { stderr += d; });
    filho.on('error', reject);
    filho.on('close', (codigo) => resolve({ codigo, stdout, stderr }));
  });
}

/** Extrai o sessionID de uma linha de evento do `opencode run`. */
export function sessionIdDaLinha(linha) {
  try {
    const evento = JSON.parse(linha);
    return evento && typeof evento.sessionID === 'string' ? evento.sessionID : null;
  } catch {
    return null;
  }
}

/**
 * Executa uma sessão do bench, escrevendo a saída em STREAMING.
 *
 * Streaming importa: uma execução morta no meio (ou por timeout) precisa deixar
 * evidência do que deu certo até ali. `excedeu` e `sessionID` sobem no retorno
 * para o `.meta.json` — sem eles, um timeout vira uma execução "normal" e o
 * turno 2 não tem sessão para continuar.
 */
export function executarSessao(raiz, args, arqSaida, timeoutMs) {
  return new Promise((resolve, reject) => {
    const fluxo = createWriteStream(arqSaida, { encoding: 'utf8' });
    const filho = spawn('opencode', args, { cwd: raiz, stdio: STDIO, env: process.env });
    let stderr = '';
    let sessionID = null;
    let stdoutParcial = '';
    let excedeu = false;

    filho.stdout.on('data', (d) => {
      fluxo.write(d);
      if (sessionID) return;
      stdoutParcial += d;
      for (const linha of stdoutParcial.split('\n')) {
        const achado = sessionIdDaLinha(linha);
        if (achado) {
          sessionID = achado;
          stdoutParcial = '';
          break;
        }
      }
      // O sessionID abre a sessão; se não veio nos primeiros 64 KB, não veio.
      if (!sessionID && stdoutParcial.length > 64 * 1024) stdoutParcial = '';
    });
    filho.stderr.on('data', (d) => { stderr += d; });

    const temporizador = setTimeout(() => {
      excedeu = true;
      filho.kill('SIGTERM');
      // Se o processo ignorar o TERM, não deixa o bench pendurado.
      setTimeout(() => filho.kill('SIGKILL'), 5000).unref();
    }, timeoutMs);

    filho.on('error', (erro) => {
      clearTimeout(temporizador);
      fluxo.end();
      reject(erro);
    });
    filho.on('close', (codigo) => {
      clearTimeout(temporizador);
      fluxo.end(() => resolve({ codigo, sessionID, stderr, excedeu }));
    });
  });
}

/** Catálogo de modelos do host: um id fora do catálogo falha em silêncio no spawn. */
export async function catalogo(raiz) {
  const { codigo, stdout } = await executar(raiz, 'opencode', ['models']);
  if (codigo !== 0) return null;
  return new Set(stdout.split('\n').map((l) => l.trim()).filter((l) => l.includes('/')));
}

/** Representação curta dos argumentos (meta e dry-run) sem despejar o prompt inteiro. */
export function resumirArgs(args) {
  return args.map((a) => (a.length > 40 ? `<prompt ${a.length} chars>` : a)).join(' ');
}

/** Marca o que já existe (pulado, como antes) sem tocar no disco. */
export async function classificarExistencia(jobs, sobrescrever) {
  for (const job of jobs) {
    job.existe = await access(job.arqSaida, constants.F_OK).then(() => true, () => false);
    job.pular = job.existe && !sobrescrever;
  }
}
