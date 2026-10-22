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
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { createWriteStream, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { aplicarRegressao } from './regressao-s1.js';

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
  // catálogo). RESULTADO: deepseek venceu (0 erros verificáveis) e é o modelo do preset;
  // flint-40b-free caiu com provider 503 na única execução. Lista conferida com `opencode
  // models` — id fora do catálogo falha em silêncio no spawn.
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
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--agente' || arg === '-a') {
      opts.agente = argv[++i];
    } else if (arg === '--modelo' || arg === '-m') {
      const v = argv[++i];
      opts.modelos = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--repeticoes' || arg === '-n') {
      opts.repeticoes = Number.parseInt(argv[++i], 10);
    } else if (arg === '--timeout-min') {
      opts.timeoutMin = Number.parseInt(argv[++i], 10);
    } else if (arg === '--sobrescrever') {
      opts.sobrescrever = true;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  if (!opts.agente) throw new Error('Informe --agente (designer | fixer | explorer)');
  if (!opts.agente) throw new Error('Informe --agente (designer | fixer | explorer | oracle)');
  if (!TAREFAS[opts.agente]) {
    throw new Error(`Agente sem tarefa definida: ${opts.agente}. Conhecidos: ${Object.keys(TAREFAS).join(', ')}`);
  }
  if (!opts.modelos) opts.modelos = PADRAO_MODELOS[opts.agente];
  return opts;
}

/** `stdio[0] = 'ignore'` é o detalhe: com 'pipe' o filho herda um stdin que ninguém
 *  escreve nem fecha, e o `opencode run` trava lendo stdin antes de abrir a sessão
 *  (medido em 19/10/2026: zero bytes, nenhum processo, nenhum erro). */
const STDIO = ['ignore', 'pipe', 'pipe'];

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
  const opts = parseArgs(process.argv.slice(2));
  const caminhoTarefa = path.join(DIR, TAREFAS[opts.agente]);
  const tarefa = await readFile(caminhoTarefa, 'utf8');
  if (!tarefa.trim()) throw new Error(`Tarefa vazia em ${caminhoTarefa}`);

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

  console.log(`Bench de papel — agente ${opts.agente}, ${opts.repeticoes} execução(ões) por modelo`);
  console.log(`Modelos: ${opts.modelos.join(', ')}`);
  console.log(`Tarefa:  ${path.relative(RAIZ, caminhoTarefa)}`);
  console.log(`Saída:   ${path.relative(RAIZ, SAIDA)}/\n`);

  for (const modelo of opts.modelos) {
    const curto = modelo.split('/').pop();
    for (let n = 1; n <= opts.repeticoes; n += 1) {
      const base = `${opts.agente}-${curto}-${n}`;
      const arqSaida = path.join(SAIDA, `${base}.ndjson`);
      const arqMeta = path.join(SAIDA, `${base}.meta.json`);

      const existe = await access(arqSaida, constants.F_OK).then(() => true, () => false);
      if (existe && !opts.sobrescrever) {
        console.log(`[${base}] já existe — pulando (use --sobrescrever para refazer)`);
        continue;
      }

      const args = [
        'run', '--agent', opts.agente, '--model', modelo,
        '--title', `bench-papel ${base}`, '--format', 'json', '--auto', prompt,
      ];

      console.log(`[${base}] rodando… (timeout ${opts.timeoutMin} min)`);
      // O fixer mede hoje a correção do S1 com o bug REINTRODUZIDO no disco:
      // o vazamento foi corrigido no HEAD em 21/10, sem o que a tarefa de
      // 19/10 fica sem objeto (glm 22/10: diagnosticou "já corrigido" e não
      // editou — comportamento honesto, medição sem objeto). A regressão é
      // plantada aqui e a restauração de pós-execução a desfaz pelo
      // `git checkout` padrão (status.js é rastreado).
      if (opts.agente === 'fixer') {
        try {
          await aplicarRegressao(RAIZ);
        } catch (erro) {
          throw new Error(`Falha ao preparar a regressão do S1 para o fixer: ${erro.message}`, { cause: erro });
        }
      }
      const inicio = Date.now();
      const { codigo, stderr } = await executarSessao(args, arqSaida, opts.timeoutMin * 60 * 1000);
      const duracao = Date.now() - inicio;

      const bruto = await readFile(arqSaida, 'utf8');
      const resposta = extrairResposta(bruto);
      const editados = arquivosEditados(bruto);

      // O estado do repo ANTES da execução precisa voltar ao de antes. Sem isso, a
      // execução seguinte herda o trabalho da anterior e a tarefa deixa de ter objeto.
      const restaurado = await restaurarArvore();
      if (!restaurado.ok) {
        console.log(`[${base}] ATENÇÃO: repo não restaurado (${restaurado.motivo})`);
      }

      await writeFile(arqMeta, JSON.stringify({
        agente: opts.agente,
        modelo,
        repeticao: n,
        tarefa: path.relative(RAIZ, caminhoTarefa),
        codigoSaida: codigo,
        duracaoMs: duracao,
        executadoEm: new Date(inicio).toISOString(),
        comando: args.map((a) => (a.length > 40 ? `<prompt ${a.length} chars>` : a)).join(' '),
        arquivosEditados: editados,
        repoRestaurado: restaurado.ok,
        stderr: stderr.slice(0, 2000),
      }, null, 2), 'utf8');

      const situacao = codigo === 0 ? 'ok' : `código ${codigo}`;
      console.log(`[${base}] ${situacao} em ${Math.round(duracao / 1000)}s — ${path.relative(RAIZ, arqSaida)} (resposta ${resposta.length} chars)`);
      if (editados.length > 0) console.log(`         arquivos editados: ${editados.join(', ')}`);
      if (codigo !== 0 && stderr) console.log(`         stderr: ${stderr.slice(0, 300)}`);
    }
  }

  console.log(`\nConferir com: node scripts/bench/papeis/conferir.js`);
  console.log('Depois, pontuar contra scripts/bench/papeis/gabarito-<papel>.md.');
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
