/**
 * Higiene da árvore de trabalho do bench de papéis.
 *
 * A tarefa do `fixer` edita o repositório; a execução seguinte precisa partir do
 * mesmo estado da anterior, senão o bench mede quem escreve teste para um arquivo
 * já corrigido. A restauração é destrutiva por natureza — por isso ela é
 * **fail-closed**: o runner exige a árvore limpa fora de `scripts/bench` antes de
 * começar e só então devolve ao HEAD o que a execução mudou.
 *
 * `scripts/bench` é preservado: os scripts, gabaritos e resultados são trabalho
 * do projeto, não sujeira da execução.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { executar } from './runner-comum.js';

const PROPRIOS = ['scripts/bench'];
const TRAVA = ['scripts', 'bench', 'papeis', 'resultados', '.execucao-pendente.json'];

function normalizar(caminho) {
  return caminho.split(path.sep).join('/');
}

/** O caminho é do bench (não deve ser restaurado como "sujeira" da execução)? */
function ehDoBench(caminho) {
  const p = normalizar(caminho);
  return PROPRIOS.some((proprio) => p === proprio || p.startsWith(`${proprio}/`));
}

/** Resolve um caminho relativo do git e recusa qualquer coisa fora da raiz. */
function resolverDentro(raiz, relativo) {
  const base = path.resolve(raiz);
  const absoluto = path.resolve(base, relativo);
  if (absoluto !== base && !absoluto.startsWith(`${base}${path.sep}`)) {
    throw new Error(`caminho fora da raiz: ${relativo}`);
  }
  return absoluto;
}

/**
 * Entradas do `git status --porcelain=v1 -z` fora de `scripts/bench`.
 *
 * O `-z` é obrigatório: sem ele o git cita caminhos com espaço/UTF-8 e a
 * restauração tenta abrir um nome que não existe. Em renomeação/cópia o formato
 * é `XY novo\0antigo\0`; consumimos o segundo token e marcamos a entrada para
 * falhar fechada, em vez de adivinhar qual lado restaurar.
 */
async function statusForaDoBench(raiz) {
  const status = await executar(raiz, 'git', ['status', '--porcelain=v1', '-z']);
  if (status.codigo !== 0) {
    throw new Error(`git status falhou: ${status.stderr.trim() || `código ${status.codigo}`}`);
  }
  const partes = status.stdout.split('\0');
  const entradas = [];
  for (let i = 0; i < partes.length; i += 1) {
    const bruto = partes[i];
    if (!bruto) continue;
    const codigo = bruto.slice(0, 2);
    const caminho = bruto.slice(3);
    const renomeado = /[RC]/.test(codigo);
    const original = renomeado ? partes[++i] : undefined;
    // Só ignora o que é do bench dos DOIS lados. Renomeação que cruza a
    // fronteira (ex.: `docs/x` -> `scripts/bench/x`) tem de aparecer: o lado de
    // fora precisa ser restaurado e a restauração falha fechada nesse caso.
    const doBench = ehDoBench(caminho) && (!original || ehDoBench(original));
    if (doBench) continue;
    entradas.push({ codigo, caminho, original, renomeado });
  }
  return entradas;
}

/** Lê o baseline da execução: commit e branch correntes. */
async function lerCabeca(raiz) {
  const head = await executar(raiz, 'git', ['rev-parse', 'HEAD']);
  if (head.codigo !== 0) {
    throw new Error(`git rev-parse HEAD falhou: ${head.stderr.trim() || `código ${head.codigo}`}`);
  }
  const branch = await executar(raiz, 'git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch.codigo !== 0) {
    throw new Error(`git rev-parse --abbrev-ref HEAD falhou: ${branch.stderr.trim() || `código ${branch.codigo}`}`);
  }
  return { head: head.stdout.trim(), branch: branch.stdout.trim() };
}

/**
 * Exige a árvore limpa fora de `scripts/bench` antes de uma execução real e
 * devolve o baseline `{ head, branch }` que `restaurarArvore()` deve reencontrar.
 *
 * Sem esta guarda, `restaurarArvore()` apagaria trabalho não commitado que já
 * estava no disco antes da medição. O `--dry-run` é isento: ele não restaura nada.
 *
 * O baseline não é decoração: um agente que commita ou troca de branch deixa
 * `git status` limpo, e a restauração por caminhos não veria nada a desfazer.
 * Comparar HEAD/branch é o que transforma esse caso em falha fechada.
 *
 * @returns {Promise<{head: string, branch: string}>}
 */
export async function exigirArvoreLimpa(raiz = process.cwd()) {
  let entradas;
  try {
    entradas = await statusForaDoBench(raiz);
  } catch (erro) {
    throw new Error(`Não consegui conferir a árvore: ${erro.message}`, { cause: erro });
  }
  if (entradas.length > 0) {
    const lista = entradas
      .map((e) => `${e.codigo} ${e.caminho}${e.original ? ` (de ${e.original})` : ''}`)
      .join('\n');
    throw new Error(
      'Árvore suja fora de `scripts/bench`: o bench restaura o repositório e apagaria ' +
      `esse trabalho. Commite ou dê stash antes de rodar.\n${lista}`
    );
  }
  try {
    return await lerCabeca(raiz);
  } catch (erro) {
    throw new Error(`Não consegui ler o baseline (HEAD/branch): ${erro.message}`, { cause: erro });
  }
}

/**
 * Compara a cabeça atual com o baseline da execução; devolve `null` se bateu.
 *
 * A checagem vem ANTES de qualquer escrita: com commit do agente ou branch
 * trocada, restaurar os caminhos reportados pelo status não desfaria nada e
 * ainda mascararia a causa (o status fica limpo depois do commit).
 */
async function conferirCabeca(raiz, cabecaEsperada) {
  if (!cabecaEsperada) return null;
  let atual;
  try {
    atual = await lerCabeca(raiz);
  } catch (erro) {
    return `não consegui reler HEAD/branch: ${erro.message}`;
  }
  if (atual.head !== cabecaEsperada.head) {
    return 'HEAD mudou durante a execução: o agente commitou. Restauração abortada para ' +
      `não mascarar o commit (${cabecaEsperada.head.slice(0, 12)} -> ${atual.head.slice(0, 12)}). ` +
      'Inspecione `git log` e decida manualmente; a cópia do bench é descartável.';
  }
  if (atual.branch !== cabecaEsperada.branch) {
    return 'branch mudou durante a execução: o agente trocou de branch. Restauração ' +
      `abortada (${cabecaEsperada.branch} -> ${atual.branch}). Volte com \`git checkout\` e inspecione.`;
  }
  return null;
}

/**
 * Desfaz as alterações da execução no repositório.
 *
 * Só restaura **arquivos rastreados ao HEAD** e remove **não rastreados**; nunca
 * `git reset --hard`. Caminhos vêm de `git status -z`, então espaço, acento e
 * renomeação não são confundidos com a sintaxe do status. Renomeação/cópia é
 * recusada: a restauração não tenta adivinhar o par original/novo.
 *
 * @param {string} raiz
 * @param {{cabecaEsperada?: {head: string, branch: string}}} [opcoes]
 *   `cabecaEsperada` é o baseline devolvido por `exigirArvoreLimpa()`. Quando
 *   presente, HEAD/branch são comparados antes de qualquer escrita e a
 *   restauração falha fechada se o agente commitou ou trocou de branch.
 * @returns {Promise<{ok: boolean, motivo: string, restantes?: string[]}>}
 */
export async function restaurarArvore(raiz = process.cwd(), { cabecaEsperada } = {}) {
  const mudouCabeca = await conferirCabeca(raiz, cabecaEsperada);
  if (mudouCabeca) return { ok: false, motivo: mudouCabeca };

  let entradas;
  try {
    entradas = await statusForaDoBench(raiz);
  } catch (erro) {
    return { ok: false, motivo: erro.message };
  }

  const renomeados = entradas.filter((e) => e.renomeado);
  if (renomeados.length > 0) {
    return {
      ok: false,
      motivo: `renomeação/cópia não suportada: ${renomeados.map((e) => `${e.original} -> ${e.caminho}`).join(', ')}`,
    };
  }

  const adicionados = entradas.filter((e) => e.codigo.includes('A')).map((e) => e.caminho);
  const rastreados = entradas
    .filter((e) => !e.codigo.includes('??') && !e.codigo.includes('A'))
    .map((e) => e.caminho);
  const naoRastreados = entradas
    .filter((e) => e.codigo.includes('??') || e.codigo.includes('A'))
    .map((e) => e.caminho);

  if (adicionados.length > 0) {
    const removidoDoIndice = await executar(raiz, 'git', ['rm', '--cached', '--', ...adicionados]);
    if (removidoDoIndice.codigo !== 0) {
      return { ok: false, motivo: `git rm --cached falhou: ${removidoDoIndice.stderr.trim()}` };
    }
  }

  if (rastreados.length > 0) {
    const devolvido = await executar(raiz, 'git', ['checkout', 'HEAD', '--', ...rastreados]);
    if (devolvido.codigo !== 0) {
      return { ok: false, motivo: `git checkout falhou: ${devolvido.stderr.trim()}` };
    }
  }

  for (const relativo of naoRastreados) {
    try {
      await rm(resolverDentro(raiz, relativo), { recursive: true, force: true });
    } catch (erro) {
      return { ok: false, motivo: `falha ao remover ${relativo}: ${erro.message}` };
    }
  }

  let restantes;
  try {
    restantes = await statusForaDoBench(raiz);
  } catch (erro) {
    return { ok: false, motivo: erro.message };
  }
  if (restantes.length > 0) {
    return {
      ok: false,
      motivo: `restaram ${restantes.length} arquivo(s) modificado(s)`,
      restantes: restantes.map((e) => e.caminho),
    };
  }
  return { ok: true, motivo: '' };
}

/** Caminho da trava de execução pendente; fica sob `resultados/` (ignorado pelo git). */
export function caminhoDaTrava(raiz = process.cwd()) {
  return path.join(raiz, ...TRAVA);
}

/**
 * Recusa uma nova bateria quando a anterior não concluiu.
 *
 * A trava grava o baseline da execução em curso. Sem ela, depois de um aborto
 * (SIGINT, commit do agente, falha de spawn) só a mensagem do erro lembraria o
 * HEAD de origem; a próxima execução encontraria a árvore suja — ou pior, limpa
 * depois de um commit — e seguiria sem saber o que aconteceu. O arquivo fica em
 * `scripts/bench/papeis/resultados/`, que o git ignora, então não aparecem
 * alterações pendentes só por causa dele.
 *
 * @returns {Promise<null>} quando não há execução pendente.
 * @throws {Error} quando a trava existe (concluída só por `concluirExecucao`).
 */
export async function exigirSemExecucaoPendente(raiz = process.cwd()) {
  const arquivo = caminhoDaTrava(raiz);
  let texto;
  try {
    texto = await readFile(arquivo, 'utf8');
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw new Error(
      `Não consegui ler a trava de execução pendente (${arquivo}): ${erro.message}`,
      { cause: erro }
    );
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error(
      `Trava de execução pendente ilegível em ${arquivo}. Se a cópia está no estado ` +
      'desejado, apague o arquivo e rode de novo.'
    );
  }

  const modelos = Array.isArray(dados.modelos) ? dados.modelos.join(', ') : dados.modelos ?? '?';
  const detalhe = [
    `agente ${dados.agente ?? '?'}`,
    `modelos ${modelos}`,
    `iniciada em ${dados.iniciadoEm ?? '?'}`,
    `baseline ${dados.branch ?? '?'}@${String(dados.head ?? '?').slice(0, 12)}`,
  ].join(', ');
  throw new Error(
    `Execução de bench pendente (${detalhe}). A bateria anterior não concluiu: confira ` +
    '`git status` e `git log`, devolva a cópia ao baseline se precisar e apague ' +
    `${arquivo} antes de rodar de novo.`
  );
}

/** Grava a trava com o baseline da bateria que vai começar. */
export async function registrarExecucao(raiz = process.cwd(), { head, branch, agente, modelos } = {}) {
  const arquivo = caminhoDaTrava(raiz);
  await mkdir(path.dirname(arquivo), { recursive: true });
  const dados = {
    head: head ?? null,
    branch: branch ?? null,
    agente: agente ?? null,
    modelos: modelos ?? [],
    iniciadoEm: new Date().toISOString(),
  };
  await writeFile(arquivo, JSON.stringify(dados, null, 2), 'utf8');
  return dados;
}

/** Remove a trava quando a bateria terminou por inteiro. */
export async function concluirExecucao(raiz = process.cwd()) {
  await rm(caminhoDaTrava(raiz), { force: true });
}
