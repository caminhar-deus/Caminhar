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
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { executar } from './runner-comum.js';

const PROPRIOS = ['scripts/bench'];

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

/**
 * Exige a árvore limpa fora de `scripts/bench` antes de uma execução real.
 *
 * Sem esta guarda, `restaurarArvore()` apagaria trabalho não commitado que já
 * estava no disco antes da medição. O `--dry-run` é isento: ele não restaura nada.
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
}

/**
 * Desfaz as alterações da execução no repositório.
 *
 * Só restaura **arquivos rastreados ao HEAD** e remove **não rastreados**; nunca
 * `git reset --hard`. Caminhos vêm de `git status -z`, então espaço, acento e
 * renomeação não são confundidos com a sintaxe do status. Renomeação/cópia é
 * recusada: a restauração não tenta adivinhar o par original/novo.
 *
 * @returns {Promise<{ok: boolean, motivo: string, restantes?: string[]}>}
 */
export async function restaurarArvore(raiz = process.cwd()) {
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
