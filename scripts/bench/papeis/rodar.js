#!/usr/bin/env node
/**
 * Bench de **papel**: mede um modelo específico NUM papel específico do agente.
 *
 * O bench do `orchestrator` (`scripts/bench/orchestrator/`) mede o papel do agente
 * primário da sessão, que é único: trocar o `--model` troca o modelo do primário
 * enquanto os subagentes seguem no preset. Para os outros papéis a lógica é
 * diferente e mais simples — o papel é o **agente** (`--agent designer`), e o modelo
 * é o que se quer medir:
 *
 *   opencode run --agent designer --model opencode/beam-free --format json --auto "<tarefa>"
 *
 * O `--model` sobrepõe o modelo que o preset define para aquele agente, sem mudar
 * prompt, skills nem permissões. É o mesmo mecanismo do bench do orchestrator, com as
 * posições trocadas: ali troca-se o modelo do primário, aqui troca-se o do subagente.
 *
 * Por que o bench do orchestrator não serve aqui: a tarefa dele é sobre `pages/api/` e
 * mede quem *conduz* a auditoria. O papel do `designer` é sobre tokens e foco; o do
 * `fixer` é sobre editar e testar. Tarefas diferentes, gabaritos diferentes.
 *
 * Uso:
 *   node scripts/bench/papeis/rodar.js --agente designer --modelo opencode/beam-free
 *   node scripts/bench/papeis/rodar.js --agente fixer --modelo opencode/mimo-v2.6-flash-free
 *   node scripts/bench/papeis/rodar.js --agente oracle --modelo opencode/glm-5.3-flash-free
 *   node scripts/bench/papeis/rodar.js --agente oracle --dry-run
 *
 * Antes de qualquer spawn (inclusive `opencode models`), o runner confere o
 * instrumento do papel contra o disco por `scripts/bench/ground-truth.js`:
 * citação que não resolve, âncora que sumiu ou contagem divergente bloqueiam a
 * bateria. O `gabarito-designer.md` é o caso sabidamente desatualizado do
 * ADR-0008 — o preflight o bloqueia e lista P1/P3 até a recalibração. O runner
 * também valida os argumentos, detecta colisão de nome de saída e, no `fixer`,
 * exige a regressão do S1 no estado esperado antes de plantar o bug.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { exigirInstrumentoValido } from '../ground-truth.js';
import { STDIO, classificarExistencia, exigirMarcadorDeBench, resumirArgs } from '../runner-comum.js';
import { aplicarRegressao, verificarRegressao } from './regressao-s1.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const DIR = path.join(RAIZ, 'scripts', 'bench', 'papeis');
const SAIDA = path.join(DIR, 'resultados');

const TAREFAS = {
  designer: 'tarefa-designer.md',
  fixer: 'tarefa-fixer.md',
  explorer: 'tarefa-explorer.md',
  oracle: 'tarefa-oracle.md',
};

const PADRAO_MODELOS = {
  designer: ['opencode/beam-free'],
  fixer: ['opencode/mimo-v2.6-flash-free'],
  // explorer: candidatos da bateria do papel de 22/10/2026 (longcat-2.5-preview-free saiu do
  // catálogo). O deepseek venceu aquela rodada (0 erros verificáveis), mas desde 04/11 é
  // primário do orchestrator; o preset do explorer usa pulse-alpha-free (ADR-0008). Esta lista
  // é de candidatos a medir, não espelho do preset. flint-40b-free caiu com provider 503 na
  // única execução. Ids conferidos com `opencode models` — fora do catálogo, o spawn falha em
  // silêncio.
  explorer: ['opencode/deepseek-v4.1-flash-free', 'opencode/flint-40b-free'],
  // oracle: papel novo (22/10/2026) — triagem de achado de auditoria com fundamento em
  // decisão de projeto (tarefa-oracle.md + gabarito-oracle.md). glm é o único modelo sem
  // medição em catálogo vivo (fora os excluídos da rodada).
  oracle: ['opencode/glm-5.3-flash-free'],
};

/** Arquivos deste bench — nunca são tocados pela restauração do repo. */
/**
 * Arquivos que são **do bench** e não podem ser restaurados como "sujeira" da
 * execução — nem apagados. `scripts/bench/` inteiro entra: os scripts e os
 * gabaritos são trabalho do projeto, e a restauração os apagaria.
 */
const PROPRIOS = [
  'scripts/bench',
];

/** O arquivo é do bench (não deve ser restaurado como "sujeira" da execução)? */
function ehDoBench(caminho) {
  return PROPRIOS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

function parseArgs(argv) {
  const opts = {
    agente: null,
    modelos: null,
    repeticoes: 1,
    timeoutMin: 20,
    sobrescrever: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--agente' || arg === '-a') {
      const v = argv[++i];
      if (!v) throw new Error(`${arg} exige um valor`);
      opts.agente = v;
    } else if (arg === '--modelo' || arg === '-m') {
      const v = argv[++i];
      if (!v) throw new Error(`${arg} exige um valor`);
      opts.modelos = v.split(',').map((s) => s.trim()).filter(Boolean);
      if (opts.modelos.length === 0) throw new Error(`${arg} exige ao menos um id de modelo`);
    } else if (arg === '--repeticoes' || arg === '-n') {
      const v = argv[++i];
      if (!/^\d+$/.test(v ?? '') || Number.parseInt(v, 10) < 1) {
        throw new Error('--repeticoes exige um inteiro >= 1');
      }
      opts.repeticoes = Number.parseInt(v, 10);
    } else if (arg === '--timeout-min') {
      const v = argv[++i];
      if (!/^\d+$/.test(v ?? '') || Number.parseInt(v, 10) < 1) {
        throw new Error('--timeout-min exige um inteiro >= 1');
      }
      opts.timeoutMin = Number.parseInt(v, 10);
    } else if (arg === '--sobrescrever') {
      opts.sobrescrever = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  if (!opts.agente) throw new Error('Informe --agente (designer | fixer | explorer | oracle)');
  if (!TAREFAS[opts.agente]) {
    throw new Error(`Agente sem tarefa definida: ${opts.agente}. Conhecidos: ${Object.keys(TAREFAS).join(', ')}`);
  }
  if (!opts.modelos) opts.modelos = PADRAO_MODELOS[opts.agente];
  if (!opts.modelos || opts.modelos.length === 0) {
    throw new Error(`Sem modelos padrão para ${opts.agente}; informe --modelo.`);
  }
  return opts;
}

// `stdio[0] = 'ignore'` não é detalhe: com 'pipe' o filho herda um stdin que ninguém
// escreve nem fecha, e o `opencode run` trava lendo stdin antes de abrir a sessão
// (medido em 19/10/2026: zero bytes, nenhum processo, nenhum erro). O `STDIO` é comum
// aos dois runners (`../runner-comum.js`).

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

/** Catálogo de modelos do host: um id fora do catálogo falha em silêncio no spawn. */
async function catalogo() {
  const { codigo, stdout } = await executar('opencode', ['models']);
  if (codigo !== 0) return null;
  return new Set(stdout.split('\n').map((l) => l.trim()).filter((l) => l.includes('/')));
}

/**
 * Planeja TODAS as execuções antes do primeiro spawn. Read-only.
 *
 * A bateria grava `.ndjson` em streaming e gasta cota por sessão: dois modelos
 * com o mesmo nome curto gravariam no mesmo arquivo, e a colisão só apareceria
 * depois de uma execução inteira. O planner falha antes de qualquer `run`.
 */
function planejarJobs(opts, prompt) {
  const jobs = [];
  for (const modelo of opts.modelos) {
    const curto = modelo.split('/').pop();
    for (let n = 1; n <= opts.repeticoes; n += 1) {
      const base = `${opts.agente}-${curto}-${n}`;
      jobs.push({
        modelo,
        repeticao: n,
        base,
        arqSaida: path.join(SAIDA, `${base}.ndjson`),
        arqMeta: path.join(SAIDA, `${base}.meta.json`),
        args: [
          'run', '--agent', opts.agente, '--model', modelo,
          '--title', `bench-papel ${base}`, '--format', 'json', '--auto', prompt,
        ],
      });
    }
  }

  const porBase = new Map();
  for (const job of jobs) {
    const modelos = porBase.get(job.base) ?? [];
    modelos.push(job.modelo);
    porBase.set(job.base, modelos);
  }
  const colisoes = [...porBase].filter(([, modelos]) => modelos.length > 1);
  if (colisoes.length > 0) {
    throw new Error(
      'Colisão de nome de saída: modelos diferentes com o mesmo nome curto gravariam no mesmo arquivo. ' +
      `${colisoes.map(([base, modelos]) => `${base} <- ${modelos.join(', ')}`).join('; ')}. ` +
      'Use nomes curtos distintos ou rode em baterias separadas.'
    );
  }
  return jobs;
}

function executarSessao(args, arqSaida, timeoutMs) {
  return new Promise((resolve, reject) => {
    const fluxo = createWriteStream(arqSaida, { encoding: 'utf8' });
    const filho = spawn('opencode', args, { cwd: RAIZ, stdio: STDIO });
    let stderr = '';
    filho.stdout.on('data', (d) => fluxo.write(d));
    filho.stderr.on('data', (d) => { stderr += d; });
    const temporizador = setTimeout(() => {
      filho.kill('SIGTERM');
      setTimeout(() => filho.kill('SIGKILL'), 5000).unref();
    }, timeoutMs);
    filho.on('error', (erro) => { clearTimeout(temporizador); fluxo.end(); reject(erro); });
    filho.on('close', (codigo) => {
      clearTimeout(temporizador);
      fluxo.end(() => resolve({ codigo, stderr, excedeu: false }));
    });
  });
}

/** Extrai a resposta final (partes de texto) do .ndjson bruto. */
function extrairResposta(ndjson) {
  const partes = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    const parte = evento?.part;
    if (parte && parte.type === 'text' && typeof parte.text === 'string') partes.push(parte.text);
  }
  return partes.join('\n');
}

/** Arquivos alterados pela execução (a partir do próprio .ndjson). */
function arquivosEditados(ndjson) {
  const vistos = new Set();
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    const parte = evento?.part;
    if (parte && parte.type === 'tool' && ['write', 'edit', 'patch', 'multiedit'].includes(parte.tool)) {
      const entrada = parte.state?.input || {};
      const p = entrada.filePath || entrada.path || entrada.file;
      if (typeof p === 'string') vistos.add(p.replace(`${RAIZ}/`, ''));
    }
  }
  return [...vistos];
}

/**
 * Devolve o repositório ao commit — o estado em que a tarefa foi definida.
 *
 * A tarefa do `fixer` é corrigir um defeito **real** do código. Se a execução anterior
 * já corrigiu, a seguinte não tem o que fazer e o bench deixa de medir o papel: ela
 * passa a medir quem escreve teste para um arquivo já corrigido. Medido em 19/10/2026.
 *
 * Só `git checkout --` em arquivo **rastreado** e remoção em arquivo **não
 * rastreado** — nunca `git reset --hard`, que apagaria trabalho do usuário. E os
 * arquivos **deste bench** são preservados: eles são não rastreados por definição e
 * uma restauração indiscriminada os apagaria (foi o que aconteceu na primeira
 * tentativa).
 */
/**
 * Desfaz as alterações da execução no repositório.
 *
 * Só `git checkout --` em arquivo **rastreado** e remoção em arquivo **não
 * rastreado** — nunca `git reset --hard`, que apagaria trabalho do usuário. E os
 * arquivos **do bench** são preservados: eles não são rastreados por definição e uma
 * restauração indiscriminada os apagaria.
 *
 * O caminho sai do status do git pela posição 3 **sem** `trim()` antes: o status
 * " M arquivo" tem 2 campos + espaço, e aparar a linha inteira come a primeira letra
 * do caminho — o `git checkout` falha com "pathspec did not match" e a restauração
 * vira um no-op silencioso. Medido em 19/10/2026.
 */
async function restaurarArvore() {
  const status = await executar('git', ['status', '--porcelain']);
  if (status.codigo !== 0) return { ok: false, motivo: 'git status falhou' };
  const linhas = status.stdout.split('\n').filter((l) => l.trim().length > 0);
  for (const linha of linhas) {
    const codigo = linha.slice(0, 2);
    const caminho = linha.slice(3);
    if (ehDoBench(caminho)) continue;
    if (codigo.trim() === '??') {
      await executar('rm', ['-rf', caminho]);
    } else {
      await executar('git', ['checkout', '--', caminho]);
    }
  }
  const limpos = await executar('git', ['status', '--porcelain']);
  const restantes = limpos.stdout.split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => l.slice(3))
    .filter((c) => !ehDoBench(c));
  if (restantes.length > 0) {
    return { ok: false, motivo: `restaram ${restantes.length} arquivo(s) modificado(s)`, restantes };
  }
  return { ok: true, motivo: '' };
}

async function main() {
  await exigirMarcadorDeBench(RAIZ);
  const opts = parseArgs(process.argv.slice(2));

  // Fail-fast antes de qualquer spawn (inclusive `opencode models`): um instrumento
  // que já não descreve o disco produz nota sem significado e queima cota à toa.
  exigirInstrumentoValido(opts.agente, { raiz: RAIZ });
  if (opts.agente === 'fixer') {
    const regressao = await verificarRegressao(RAIZ);
    if (regressao.estado === 'ausente' || regressao.estado === 'desconhecido') {
      throw new Error(
        `Regressão do S1 não pode ser preparada: ${regressao.detalhe}. ` +
        'A tarefa do fixer ficaria sem objeto; recalibre `regressao-s1.js` (ADR-0008).'
      );
    }
  }

  const caminhoTarefa = path.join(DIR, TAREFAS[opts.agente]);
  const tarefa = await readFile(caminhoTarefa, 'utf8');
  if (!tarefa.trim()) throw new Error(`Tarefa vazia em ${caminhoTarefa}`);

  const prompt = `${tarefa}\n\n---\nReforce: não abra nenhum arquivo em \`scripts/bench/\` — o gabarito está lá e ler invalida a medição.`;

  const jobs = planejarJobs(opts, prompt);
  await classificarExistencia(jobs, opts.sobrescrever);
  const paraRodar = jobs.filter((job) => !job.pular);
  for (const job of jobs.filter((j) => j.pular)) {
    console.log(`[${job.base}] já existe — pulando (use --sobrescrever para refazer)`);
  }

  console.log(`Bench de papel — agente ${opts.agente}, ${paraRodar.length} execução(ões) a rodar`);
  console.log(`Modelos: ${opts.modelos.join(', ')}`);
  console.log(`Tarefa:  ${path.relative(RAIZ, caminhoTarefa)}`);
  console.log(`Saída:   ${path.relative(RAIZ, SAIDA)}/\n`);

  if (paraRodar.length === 0) {
    console.log('Nada a executar: todas as saídas já existem.');
    return;
  }

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

  if (opts.dryRun) {
    console.log('--dry-run: nada será executado. Comandos reais:');
    for (const job of paraRodar) console.log(`  ${resumirArgs(job.args)}`);
    return;
  }

  await mkdir(SAIDA, { recursive: true });

  for (const job of paraRodar) {
    const { modelo, repeticao: n, base, arqSaida, arqMeta, args } = job;

    // O fixer mede hoje a correção do S1 com o bug REINTRODUZIDO no disco:
    // o vazamento foi corrigido no HEAD em 21/10, sem o que a tarefa de
    // 19/10 fica sem objeto (glm 22/10: diagnosticou "já corrigido" e não
    // editou — comportamento honesto, medição sem objeto). A regressão é
    // plantada aqui e a restauração de pós-execução a desfaz pelo
    // `git checkout` padrão (status.js é rastreado). Se uma execução anterior
    // deixou o bug plantado, não reaplica (o bloco corrigido não está no disco).
    if (opts.agente === 'fixer') {
      const estado = await verificarRegressao(RAIZ);
      if (estado.estado === 'regredido') {
        console.log(`[${base}] regressão do S1 já plantada — não reaplica`);
      } else {
        try {
          await aplicarRegressao(RAIZ);
        } catch (erro) {
          throw new Error(`Falha ao preparar a regressão do S1 para o fixer: ${erro.message}`, { cause: erro });
        }
      }
    }

    console.log(`[${base}] rodando… (timeout ${opts.timeoutMin} min)`);
    const inicio = Date.now();
    const { codigo, stderr } = await executarSessao(args, arqSaida, opts.timeoutMin * 60 * 1000);
    const duracao = Date.now() - inicio;

    const bruto = await readFile(arqSaida, 'utf8');
    const resposta = extrairResposta(bruto);
    const editados = arquivosEditados(bruto);

    // O estado do repo ANTES da execução precisa voltar ao de antes. Sem isso, a
    // execução seguinte herda o trabalho da anterior e a tarefa deixa de ter objeto.
    const restaurado = await restaurarArvore();

    await writeFile(arqMeta, JSON.stringify({
      agente: opts.agente,
      modelo,
      repeticao: n,
      tarefa: path.relative(RAIZ, caminhoTarefa),
      codigoSaida: codigo,
      duracaoMs: duracao,
      executadoEm: new Date(inicio).toISOString(),
      comando: resumirArgs(args),
      arquivosEditados: editados,
      repoRestaurado: restaurado.ok,
      stderr: stderr.slice(0, 2000),
    }, null, 2), 'utf8');

    if (!restaurado.ok) {
      throw new Error(
        `[${base}] repo não restaurado (${restaurado.motivo}): ` +
        `${restaurado.restantes?.join(', ') ?? 'sem detalhe'}. ` +
        'Bateria abortada para a próxima execução não herdar a sujeira.'
      );
    }

    const situacao = codigo === 0 ? 'ok' : `código ${codigo}`;
    console.log(`[${base}] ${situacao} em ${Math.round(duracao / 1000)}s — ${path.relative(RAIZ, arqSaida)} (resposta ${resposta.length} chars)`);
    if (editados.length > 0) console.log(`         arquivos editados: ${editados.join(', ')}`);
    if (codigo !== 0 && stderr) console.log(`         stderr: ${stderr.slice(0, 300)}`);
  }

  console.log(`\nConferir com: node scripts/bench/papeis/conferir.js`);
  console.log('Depois, pontuar contra scripts/bench/papeis/gabarito-<papel>.md.');
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
