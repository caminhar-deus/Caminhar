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
 * bateria. Os cinco instrumentos estão calibrados (o designer foi recalibrado em
 * 06/11/2026). O runner também valida os argumentos, detecta colisão de nome de
 * saída e, no `fixer`, exige a regressão do S1 no estado esperado antes de
 * plantar o bug.
 *
 * Em execução real (sem `--dry-run`), a árvore fora de `scripts/bench` precisa
 * estar limpa: o runner restaura o repositório ao HEAD depois de cada execução
 * (`../arvore.js`) e não pode apagar trabalho que já estava no disco. A guarda
 * devolve o baseline de HEAD/branch e cada restauração o reencontra — commit ou
 * troca de branch do agente abortam a bateria em vez de passar em silêncio.
 *
 * `--timeout-min` aceita fração positiva (ex.: `0.05`) para exercitar o caminho
 * de timeout em segundos, sem esperar a janela real de 20 min.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { exigirInstrumentoValido } from '../ground-truth.js';
import { exigirArvoreLimpa, restaurarArvore } from '../arvore.js';
import {
  catalogo, classificarExistencia, exigirMarcadorDeBench, executarSessao, resumirArgs,
} from '../runner-comum.js';
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
      // Fração é aceita para smoke test do caminho de timeout sem esperar 20 min.
      if (!/^\d+(?:\.\d+)?$/.test(v ?? '') || !(Number.parseFloat(v) > 0)) {
        throw new Error('--timeout-min exige um número > 0 (minutos; aceita fração, ex.: 0.05)');
      }
      opts.timeoutMin = Number.parseFloat(v);
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

async function main() {
  await exigirMarcadorDeBench(RAIZ);
  const opts = parseArgs(process.argv.slice(2));

  // Execução real restaura o repo depois de cada sessão; com trabalho não
  // commitado fora do bench, a restauração apagaria esse trabalho. O `--dry-run`
  // não restaura nada e continua inspecionável. O baseline devolvido aqui é o
  // que cada restauração precisa reencontrar: um commit do agente deixa o status
  // limpo e só a comparação de HEAD/branch detecta.
  const cabecaInicial = opts.dryRun ? null : await exigirArvoreLimpa(RAIZ);

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

  const disponiveis = await catalogo(RAIZ);
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
    let resultado = { codigo: null, sessionID: null, stderr: '', excedeu: false };
    let bruto = '';
    let falhaExecucao = null;
    let restaurado;
    try {
      resultado = await executarSessao(
        RAIZ, args, arqSaida, Math.round(opts.timeoutMin * 60 * 1000)
      );
      bruto = await readFile(arqSaida, 'utf8');
    } catch (erro) {
      falhaExecucao = erro;
    } finally {
      // O repo precisa voltar ao estado de antes mesmo quando o spawn ou a
      // leitura do .ndjson lança: sem isso, a próxima sessão herda a sujeira.
      restaurado = await restaurarArvore(RAIZ, { cabecaEsperada: cabecaInicial });
    }
    const duracao = Date.now() - inicio;
    const { codigo, sessionID, stderr, excedeu } = resultado;

    const resposta = extrairResposta(bruto);
    const editados = arquivosEditados(bruto);

    await writeFile(arqMeta, JSON.stringify({
      agente: opts.agente,
      modelo,
      repeticao: n,
      tarefa: path.relative(RAIZ, caminhoTarefa),
      sessionID,
      codigoSaida: codigo,
      excedeuTimeout: excedeu,
      duracaoMs: duracao,
      executadoEm: new Date(inicio).toISOString(),
      comando: resumirArgs(args),
      arquivosEditados: editados,
      repoRestaurado: restaurado.ok,
      ...(falhaExecucao ? { erro: falhaExecucao.message } : {}),
      stderr: stderr.slice(0, 2000),
    }, null, 2), 'utf8');

    if (!restaurado.ok) {
      const restantes = restaurado.restantes?.length ? `: ${restaurado.restantes.join(', ')}` : '';
      throw new Error(
        `[${base}] repo não restaurado (${restaurado.motivo})${restantes}. ` +
        'Bateria abortada para a próxima execução não herdar a sujeira.'
      );
    }
    if (falhaExecucao) {
      throw new Error(
        `[${base}] execução não concluiu (${falhaExecucao.message}); repo restaurado.`,
        { cause: falhaExecucao }
      );
    }

    const situacao = excedeu
      ? `TIMEOUT depois de ${opts.timeoutMin} min`
      : codigo === 0 ? 'ok' : `código ${codigo}`;
    console.log(`[${base}] ${situacao} em ${Math.round(duracao / 1000)}s — ${path.relative(RAIZ, arqSaida)} (resposta ${resposta.length} chars)${sessionID ? ` session=${sessionID}` : ''}`);
    if (editados.length > 0) console.log(`         arquivos editados: ${editados.join(', ')}`);
    if (codigo !== 0 && stderr) console.log(`         stderr: ${stderr.slice(0, 300)}`);
    if (excedeu) console.log('         execução parcial: o .ndjson tem o que deu certo até o timeout; marque como incompleta na pontuação.');
  }

  console.log(`\nConferir com: node scripts/bench/papeis/conferir.js`);
  console.log('Depois, pontuar contra scripts/bench/papeis/gabarito-<papel>.md.');
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
