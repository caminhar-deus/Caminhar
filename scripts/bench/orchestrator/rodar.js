#!/usr/bin/env node
/**
 * Bench do papel do `orchestrator`: roda a MESMA tarefa em um ou mais modelos
 * e guarda a saída crua de cada execução.
 *
 * Por que existe: nenhuma outra bateria deste projeto mede o orchestrator. Ele é o
 * agente primário da sessão, não existe subagente `orchestrator`, e a tool `subagent`
 * não o alcança — toda medição anterior dele foi por proxy (outro agente exercitando o
 * papel), o que o ADR-0008 registra como evidência mais fraca. Aqui a sessão inteira é
 * do modelo sob teste: `opencode run --model` troca só o agente primário, e os
 * subagentes continuam com os modelos do preset, o que isola a variável.
 *
 * Uso:
 *   npm run bench:orch:rodar
 *   npm run bench:orch:rodar -- --modelo opencode/space-bunny-free --repeticoes 3
 *   npm run bench:orch:rodar -- --dry-run
 *
 * Não aceita `OPENCODE_API_KEY`: a execução passa pelo host do OpenCode, que já tem
 * credencial guardada (`opencode auth list`). O bench de 16/10/2026 exigia chave porque
 * chamava a API do Zen de fora — caminho que o free tier recusa ("can only be used from
 * within OpenCode").
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { createWriteStream, readFileSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const DIR = path.join(RAIZ, 'scripts', 'bench', 'orchestrator');
const SAIDA = path.join(DIR, 'resultados');
const ARQ_TAREFA = path.join(DIR, 'tarefa.md');

const PADRAO_MODELOS = ['opencode/space-bunny-free', 'opencode/big-pickle'];
const TIMEOUT_PADRAO_MIN = 20;

// A tool `subagent` é assíncrono neste host: ela ignora `background` e sempre devolve
// "the subagent is working in the background". O `opencode run` encerra o turno ali, e
// o resultado do subagente só chega depois, como notificação. Sem um segundo turno, o
// modelo que delega não tem como reconciliar — e a série mede o dispatcher, não o
// orchestrator. O texto abaixo é o mesmo para todos os modelos: mudar a tarefa só para
// um deles mede metodologia, não modelo.
const PROMPT_SEGUNDO_TURNO = [
  'Os agentes que você disparou já terminaram e os resultados deles já estão disponíveis',
  'para você nesta sessão.',
  '',
  'Reconcilie o que eles trouxeram com o que você mesmo já levantou, e entregue agora a',
  'auditoria final completa, no formato pedido na tarefa original — as quatro perguntas,',
  'em markdown, com a tabela. Toda afirmação sobre o código precisa de `arquivo:linha`',
  'apontando para onde a coisa é de fato aplicada, e não para o import.',
  '',
  'Não abra nada em `scripts/bench/`. Não volte a delegar o que já foi delegado: o',
  'trabalho de orchestar aqui é reconciliar o que chegou.',
].join('\n');

/** Le os argumentos no formato --chave valor ou --chave. */
function parseArgs(argv) {
  const opts = {
    modelos: [...PADRAO_MODELOS],
    repeticoes: 3,
    timeoutMin: TIMEOUT_PADRAO_MIN,
    sobrescrever: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--modelo' || arg === '-m') {
      const valor = argv[i + 1];
      if (!valor) throw new Error(`${arg} exige um valor`);
      opts.modelos = valor.split(',').map((m) => m.trim()).filter(Boolean);
      i += 1;
    } else if (arg === '--repeticoes' || arg === '-n') {
      const valor = Number.parseInt(argv[i + 1], 10);
      if (!Number.isInteger(valor) || valor < 1) throw new Error('--repeticoes exige um inteiro >= 1');
      opts.repeticoes = valor;
      i += 1;
    } else if (arg === '--turno' || arg === '-t') {
      const valor = Number.parseInt(argv[i + 1], 10);
      if (valor !== 1 && valor !== 2) throw new Error('--turno aceita 1 ou 2');
      opts.turno = valor;
      i += 1;
    } else if (arg === '--timeout-min') {
      const valor = Number.parseInt(argv[i + 1], 10);
      if (!Number.isInteger(valor) || valor < 1) throw new Error('--timeout-min exige um inteiro >= 1');
      opts.timeoutMin = valor;
      i += 1;
    } else if (arg === '--sobrescrever') {
      opts.sobrescrever = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  return opts;
}

// `stdio[0] = 'ignore'` não é detalhe: com o padrão `'pipe'`, o filho herda um stdin que
// ninguém escreve nem fecha, e o `opencode run` trava lendo stdin antes de abrir a
// sessão: saem zero bytes e nenhum processo de sessão. Do bash o mesmo comando passa,
// porque o shell entrega stdin já fechado. Medido em 19/10/2026.
const STDIO = ['ignore', 'pipe', 'pipe'];

/** Executa um comando e devolve { codigo, stdout, stderr }. */
function executar(comando, args, opcoes = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(comando, args, { cwd: RAIZ, stdio: STDIO, ...opcoes });
    let stdout = '';
    let stderr = '';
    filho.stdout?.on('data', (d) => { stdout += d; });
    filho.stderr?.on('data', (d) => { stderr += d; });
    filho.on('error', reject);
    filho.on('close', (codigo) => resolve({ codigo, stdout, stderr }));
  });
}

/**
 * Catálogo de modelos do host. Confere antes de rodar: um id fora do catálogo falha em
 * silêncio no spawn do agente, e a execução "vazia" parece uma falha do modelo.
 */
async function catalogo() {
  const { codigo, stdout } = await executar('opencode', ['models']);
  if (codigo !== 0) return null;
  const ids = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('/'));
  return new Set(ids);
}

/** Extrai o sessionID de uma linha de evento do `opencode run`. */
function sessionIdDaLinha(linha) {
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
 * evidência do que deu certo até ali. Guardar tudo em memória e escrever no fim perde a
 * execução inteira por causa de um Ctrl-C.
 */
function executarSessao(args, arqSaida, timeoutMs) {
  return new Promise((resolve, reject) => {
    const fluxo = createWriteStream(arqSaida, { encoding: 'utf8' });
    const filho = spawn('opencode', args, { cwd: RAIZ, stdio: STDIO });
    let stderr = '';
    let sessionID = null;
    let stdoutParcial = '';
    let excedeu = false;

    filho.stdout.on('data', (d) => {
      fluxo.write(d);
      stdoutParcial += d;
      if (!sessionID) {
        const achado = sessionIdDaLinha(stdoutParcial.split('\n')[0]);
        if (achado) sessionID = achado;
      }
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
      fluxo.end(() => {
        resolve({ codigo, sessionID, stderr, excedeu });
      });
    });
  });
}

/** Lê o sessionID da execução do turno 1, que é a sessão a continuar no turno 2. */
function lerSessaoDoTurno1(base) {
  const arq = path.join(SAIDA, `${base}.meta.json`);
  try {
    const meta = JSON.parse(readFileSync(arq, 'utf8'));
    if (!meta.sessionID) throw new Error(`meta sem sessionID`);
    return meta.sessionID;
  } catch {
    throw new Error(
      `Turno 2 de ${base} precisa da execução do turno 1: ${path.relative(RAIZ, arq)} não tem sessionID. ` +
      'Rode o turno 1 primeiro.'
    );
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const tarefa = await readFile(ARQ_TAREFA, 'utf8');
  if (!tarefa.trim()) throw new Error(`Tarefa vazia em ${ARQ_TAREFA}`);

  // A tarefa já pede para não ler scripts/bench/. Repetir aqui cobre o caso de alguém
  // editar o arquivo de tarefa e o runner rodar com o texto antigo em cache.
  const prompt = `${tarefa}\n\n---\nReforce: não abra nenhum arquivo em \`scripts/bench/\` — o gabarito está lá e ler invalida a medição.`;

  const disponiveis = await catalogo();
  if (disponiveis) {
    const fora = opts.modelos.filter((m) => !disponiveis.has(m));
    if (fora.length > 0) {
      throw new Error(
        `Modelo fora do catálogo: ${fora.join(', ')}. Rode \`opencode models\` e confira. ` +
        'Um id que saiu do catálogo falha em silêncio no spawn do agente.'
      );
    }
  } else {
    console.warn('AVISO: não consegui ler `opencode models`; seguindo sem conferir o catálogo.');
  }

  await mkdir(SAIDA, { recursive: true });

  console.log(`Bench do orchestrator — ${opts.repeticoes} execução(ões) por modelo, turno ${opts.turno}`);
  console.log(`Modelos: ${opts.modelos.join(', ')}`);
  console.log(`Saída:   ${path.relative(RAIZ, SAIDA)}/`);
  if (opts.turno === 2) {
    console.log('Turno 2: continua a sessão do turno 1, onde os resultados dos subagentes já estão.');
  }
  console.log(`Cota Zen é por IP/dia (~200 req observadas). ${opts.repeticoes * opts.modelos.length} execuções são ${opts.repeticoes * opts.modelos.length} sessões, não requisições — mas cada sessão gasta várias.\n`);

  if (opts.dryRun) {
    console.log('--dry-run: nada será executado. Comando que seria usado:');
    if (opts.turno === 1) {
      console.log('  opencode run --model <modelo> --title "bench-orch <modelo> #<n>" --format json --auto <prompt>');
    } else {
      console.log('  opencode run --session <sessionID do turno 1> --model <modelo> --format json --auto "<prompt do 2o turno>"');
    }
    return;
  }

  for (const modelo of opts.modelos) {
    const curto = modelo.split('/').pop();
    for (let n = 1; n <= opts.repeticoes; n += 1) {
      const base = `${curto}-${n}`;
      const sufixo = opts.turno === 2 ? '.t2' : '';
      const arqSaida = path.join(SAIDA, `${base}${sufixo}.ndjson`);
      const arqMeta = path.join(SAIDA, `${base}${sufixo}.meta.json`);

      const existe = await access(arqSaida, constants.F_OK).then(() => true, () => false);
      if (existe && !opts.sobrescrever) {
        console.log(`[${base}${sufixo}] já existe — pulando (use --sobrescrever para refazer)`);
        continue;
      }

      // No segundo turno o comando muda de forma: continua a MESMA sessão, para que o
      // modelo tenha o resultado do subagente que disparou no turno anterior.
      const args = opts.turno === 1
        ? ['run', '--model', modelo, '--title', `bench-orch ${base}`, '--format', 'json', '--auto', prompt]
        : ['run', '--session', lerSessaoDoTurno1(base), '--model', modelo, '--format', 'json', '--auto', PROMPT_SEGUNDO_TURNO];

      const titulo = opts.turno === 1 ? `bench-orch ${base}` : `bench-orch ${base} (turno 2)`;
      console.log(`[${base}${sufixo}] rodando… (timeout ${opts.timeoutMin} min)`);
      const inicio = Date.now();
      const { codigo, sessionID, stderr, excedeu } = await executarSessao(args, arqSaida, opts.timeoutMin * 60 * 1000);
      const duracao = Date.now() - inicio;

      await writeFile(arqMeta, JSON.stringify({
        modelo,
        repeticao: n,
        turno: opts.turno,
        titulo,
        sessionID,
        codigoSaida: codigo,
        excedeuTimeout: excedeu,
        duracaoMs: duracao,
        executadoEm: new Date(inicio).toISOString(),
        comando: args.map((a) => (a.length > 40 ? `<prompt ${a.length} chars>` : a)).join(' '),
        stderr: stderr.slice(0, 2000),
      }, null, 2), 'utf8');

      const parcial = await readFile(arqSaida, 'utf8');
      const temResposta = parcial.includes('"type":"text"');
      const situacao = excedeu
        ? `TIMEOUT depois de ${opts.timeoutMin} min`
        : codigo === 0 ? 'ok' : `código ${codigo}`;
      console.log(`[${base}] ${situacao} em ${Math.round(duracao / 1000)}s — ${path.relative(RAIZ, arqSaida)}${temResposta ? '' : ' (SEM RESPOSTA)'}${sessionID ? ` session=${sessionID}` : ''}`);
      if (codigo !== 0 && stderr) console.log(`         stderr: ${stderr.slice(0, 300)}`);
      if (excedeu) console.log('         execução parcial: o .ndjson tem o que deu certo até o timeout; marque como incompleta na pontuação.');
    }
  }

  console.log(`\nConferir com: npm run bench:orch:conferir`);
  console.log('Depois, pontuar com scripts/bench/orchestrator/rubrica.md (Camadas B e C são julgamento humano).');
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});