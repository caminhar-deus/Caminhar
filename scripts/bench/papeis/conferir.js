#!/usr/bin/env node
/**
 * Camada A das baterias de **papel** (`scripts/bench/papeis/`).
 *
 * O que é automático (sem juízo):
 * - o modelo respondeu alguma coisa (a execução entregou texto);
 * - o modelo **editou** algum arquivo, e quais (isto é o sinal central no papel do
 *   `fixer`: um `fixer` que não edita nada não fez o trabalho);
 * - toda citação `arquivo:linha` existe de verdade — no disco do projeto, no
 *   pacote instalado (`node_modules/next/dist`) ou, se a fonte veio de fora do
 *   disco (repo upstream, URL), sinalizada em categoria própria;
 * - a execução tocou o gabarito (`scripts/bench/`) — contaminação.
 *
 * O que **não** é automático: se a resposta está *correta*. Isso é julgamento
 * humano, contra `gabarito-<papel>.md`, como em todas as baterias deste projeto.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { criarResolvedor, externaAoDisco } from '../citacoes.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const DIR = path.join(RAIZ, 'scripts', 'bench', 'papeis');
const SAIDA = path.join(DIR, 'resultados');

// O resolvedor de citações mora em `scripts/bench/citacoes.js` (Parte 1 da fonte
// de verdade derivada do disco): o verificador de instrumentos
// (`scripts/bench/ground-truth.js`) usa a MESMA regra — se este conferidor
// guardasse a sua, a verdade derivaria do disco aqui e hardcoded lá.
const resolvedor = criarResolvedor({ raiz: RAIZ });

// O formato da resposta é `arquivo:linha` adjacente; o parser de citações do
// instrumento (parênteses `(:129)`) é outra coisa e não serve aqui.
const REGEX_CITACAO = /([A-Za-z0-9_.\-/[\]]+\.(?:js|cjs|mjs|jsx|json|md|mdx|yml|yaml|css|tsx|ts))[`'"]?:(\d+)/g;

function extrairTexto(ndjson) {
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

function extrairTools(ndjson) {
  const tools = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    const parte = evento?.part;
    if (parte && parte.type === 'tool' && typeof parte.tool === 'string') {
      tools.push({ nome: parte.tool, entrada: parte.state?.input || {} });
    }
  }
  return tools;
}

function contaminada(tools) {
  for (const t of tools) {
    // A memória do projeto é via de contaminação (ADR-0008, 19/10/2026): a execução
    // grava a RESPOSTA da tarefa e a execução seguinte a lê de volta — o mesmo que
    // ler o gabarito. Toda escrita E toda consulta com propósito de resposta contam.
    if (typeof t.nome === 'string' && t.nome.startsWith('memory_')) return true;
    const e = t.entrada || {};
    for (const campo of ['path', 'filePath', 'file', 'pattern', 'query']) {
      const v = e[campo];
      if (typeof v === 'string' && v.includes('scripts/bench/')) return true;
    }
    if (typeof e.command === 'string' && /scripts\/bench\/[A-Za-z0-9_.\-/]*\.[A-Za-z0-9]+/.test(e.command)) return true;
  }
  return false;
}

function arquivosEditados(tools) {
  const vistos = new Set();
  for (const t of tools) {
    if (!['write', 'edit', 'patch', 'multiedit'].includes(t.nome)) continue;
    const e = t.entrada || {};
    const p = e.filePath || e.path || e.file;
    if (typeof p === 'string') vistos.add(p.replace(`${RAIZ}/`, ''));
  }
  return [...vistos];
}

async function conferir(arquivo) {
  const ndjson = await readFile(path.join(SAIDA, arquivo), 'utf8');
  const resposta = extrairTexto(ndjson);
  const tools = extrairTools(ndjson);

  // Arquivos que a PRÓPRIA execução criou (o .meta.json registra). A restauração do
  // repo os remove do disco antes da conferência, então citá-los não pode ser
  // reprovado como "arquivo não encontrado" — seria erro do conferidor, não do modelo.
  const metaPath = path.join(SAIDA, arquivo.replace(/\.ndjson$/, '.meta.json'));
  let meta = {};
  try { meta = JSON.parse(await readFile(metaPath, 'utf8')); } catch { /* sem meta */ }
  const criadosDurante = (meta.arquivosEditados || []).map((p) => p.replace(`${RAIZ}/`, ''));
  const criadasRemovidas = [];
  const citacoesPosArquivoEditado = [];

  const citadas = new Map();
  for (const m of resposta.matchAll(REGEX_CITACAO)) {
    const alvo = m[1];
    const linha = Number.parseInt(m[2], 10);
    if (!citadas.has(alvo)) citadas.set(alvo, new Set());
    citadas.get(alvo).add(linha);
  }

  const invalidas = [];
  const abreviadas = [];
  const externas = [];
  for (const [alvo, linhas] of citadas) {
    // Fonte fora do disco vem PRIMEIRO: layout do repo upstream (`packages/next/...`)
    // e URLs (`//github.com/...`) fecham a lista antes de qualquer tentativa.
    if (externaAoDisco(alvo)) { externas.push(alvo); continue; }

    // TODOS os candidatos existentes entram — o primeiro achado NÃO é campeão. É a
    // regra que o conferidor do orchestrator consertou em 19/10/2026 (comentário de
    // `resolverCitacao` lá) e que estas baterias repetiram: `roles.js:113` caiu no
    // `tests/helpers/roles.js` (22 linhas) enquanto `pages/api/admin/roles.js` (133)
    // tem a linha; `posts.js:152` caiu em `pages/api/posts.js` (85) com
    // `pages/api/admin/posts.js` (171) e `lib/domain/posts.js` (181) no disco.
    // A montagem (diretos + sufixos + índice por basename, filtrados por
    // `ehArquivo`) está em `resolvedor.candidatosProjeto`; `diretos` volta sem
    // filtro porque a decisão de "abreviada" compara com o caminho ESCRITO.
    const { lista, diretos } = resolvedor.candidatosProjeto(alvo);

    if (lista.length === 0) {
      // Arquivo **novo**, criado pela própria execução, não está mais no disco: a
      // restauração do repo o removeu entre a execução e a conferência. Não é erro
      // de citação — é consequência da medição. Sinalizado, não reprovado.
      if (criadosDurante.includes(alvo)) {
        criadasRemovidas.push(alvo);
        continue;
      }
      // Origem pela extensão: docs do repo upstream só existem em .mdx — o pacote
      // instalado traz .md (a árvore instalada tem 0 .mdx) —, e fontes .ts do
      // upstream têm seu irmão .js/.d.ts no dist (`app-route.ts`). É fonte externa,
      // não citação inexistente — sinalizada, nunca reprovada.
      if (resolvedor.origemExternaPorExtensao(alvo)) {
        externas.push(alvo);
        continue;
      }
      // Citação abreviada com "..." ou basename do Next instalado: forma escrita
      // comum nos papéis (`node_modules/.../02-guides/cdn-caching.md`, `route.md`,
      // `incremental-cache/index.js`). Resolve na raiz reserva e sinaliza — reprovar
      // aqui puniu citações reais (ver o comentário de `caminhosNextDist` em
      // `scripts/bench/citacoes.js`).
      const reservados = resolvedor.resolverReserva(alvo);
      if (reservados.length > 0) {
        lista.push(...reservados);
      } else {
        invalidas.push(`${alvo} (arquivo não encontrado)`);
        continue;
      }
    }
    for (const linha of linhas) {
      const cabem = lista.filter((c) => linha <= resolvedor.linhasDe(c));
      if (cabem.length > 0) {
        // "Abreviada" = forma: o que serviu não é o caminho como escrito
        // (`dicas.js` servido por `pages/api/admin/dicas.js`; `route.md` por
        // `node_modules/next/dist/docs/...`). Sinaliza, não reprova.
        const servico = cabem[0];
        if (!diretos.includes(servico) && !abreviadas.some((a) => a.startsWith(`${alvo} ->`))) {
          abreviadas.push(`${alvo} -> ${servico}`);
        }
        continue;
      }
      // O arquivo pode ter sido EDITADO pela execução: a citação então aponta para
      // a linha no estado **novo**, e o disco já está no estado antigo (a restauração
      // do repo rodou). Comparar com o disco reprovaria citação certa.
      // Sinalizado, não reprovado — o acerto é julgamento humano, contra o gabarito.
      const editado = (meta.arquivosEditados || []).some((p) => lista.some((c) => p.replace(`${RAIZ}/`, '') === c));
      if (editado) {
        citacoesPosArquivoEditado.push(`${alvo}:${linha} (arquivo editado pela execução)`);
        continue;
      }
      const detalhe = lista.map((c) => `${c} (${resolvedor.linhasDe(c)} linhas)`).join(' ou ');
      invalidas.push(`${alvo}:${linha} (nenhum candidato tem a linha: ${detalhe})`);
    }
  }

  return {
    arquivo,
    agente: meta.agente || '?',
    modelo: meta.modelo || '?',
    resposta,
    len: resposta.trim().length,
    editados: arquivosEditados(tools),
    tools: tools.length,
    contaminada: contaminada(tools),
    invalidas,
    abreviadas,
    externas,
    criadasRemovidas,
    citacoesPosArquivoEditado,
  };
}

async function main() {
  let arquivos;
  try {
    arquivos = (await readdir(SAIDA)).filter((f) => f.endsWith('.ndjson')).sort();
  } catch {
    console.error(`Nada em ${path.relative(RAIZ, SAIDA)}/. Rode antes: node scripts/bench/papeis/rodar.js`);
    process.exitCode = 1;
    return;
  }
  if (arquivos.length === 0) {
    console.error(`Nenhuma execução em ${path.relative(RAIZ, SAIDA)}/.`);
    process.exitCode = 1;
    return;
  }

  const relatorios = [];
  for (const a of arquivos) relatorios.push(await conferir(a));

  console.log('Camada A — sinais automáticos\n');
  console.log('| execução | modelo | respondeu | editou | citações | contaminada |');
  console.log('|---|---|---|---|---|---|');
  for (const r of relatorios) {
    const partes = [];
    if (r.invalidas.length > 0) partes.push(`**${r.invalidas.length} inválida(s)**`);
    if (r.abreviadas.length > 0) partes.push(`${r.abreviadas.length} abreviada(s)`);
    if (r.externas.length > 0) partes.push(`${r.externas.length} externa(s)`);
    const citacoes = partes.length > 0 ? partes.join(', ') : 'válidas';
    const editou = r.editados.length === 0 ? '**nenhum**' : r.editados.map((e) => `\`${e}\``).join(', ');
    console.log(`| ${r.arquivo} | ${String(r.modelo).replace('opencode/', '')} | ${r.len} chars | ${editou} | ${citacoes} | ${r.contaminada ? '**SIM**' : 'não'} |`);
  }
  const detalhe = relatorios.map((r) => [
    `# ${r.arquivo}`,
    '',
    `- modelo: ${r.modelo}`,
    `- resposta: ${r.len} caracteres`,
    `- tool calls: ${r.tools}`,
    `- arquivos editados: ${r.editados.length ? r.editados.join(', ') : 'nenhum'}`,
    `- citações inválidas: ${r.invalidas.length ? r.invalidas.join('; ') : 'nenhuma'}`,
    ...(r.abreviadas.length > 0 ? [`- citações abreviadas (resolvidas além das raízes do projeto): ${r.abreviadas.join('; ')}`] : []),
    ...(r.externas.length > 0 ? [`- citações de fonte externa ao disco (repo upstream/URL): ${r.externas.join('; ')}`] : []),
    '',
    '## Resposta',
    '',
    r.resposta.trim() || '(vazio)',
    '',
    '---',
    '',
  ].join('\n')).join('\n');

  await writeFile(path.join(SAIDA, 'conferencia.md'), detalhe, 'utf8');
  console.log(`\nDetalhe em ${path.relative(RAIZ, path.join(SAIDA, 'conferencia.md'))} (${relatorios.length} execuções).`);
  console.log('A correção da resposta é julgamento humano, contra gabarito-<papel>.md.');
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  if (process.env.BENCH_STACK) console.error(erro.stack);
  process.exitCode = 1;
});
