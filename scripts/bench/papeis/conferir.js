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
import { readFileSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const DIR = path.join(RAIZ, 'scripts', 'bench', 'papeis');
const SAIDA = path.join(DIR, 'resultados');

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

function ehArquivo(caminho) {
  try { return statSync(path.join(RAIZ, caminho)).isFile(); } catch { return false; }
}

/**
 * Índice basename -> caminhos do repositório que têm esse nome.
 *
 * O modelo escreve o caminho de forma relativa ao diretório que conhece: "MASTER.md"
 * para "design-system/MASTER.md", "Input.module.css" para
 * "components/UI/Input.module.css". Resolver por prefixo fixo erra — "MASTER.md"
 * resolveria para o gabarito do próprio bench, que fica em scripts/bench/, e a
 * citação boa seria marcada como inválida. Medido em 19/10/2026.
 */
let indicePorNome = null;

function constroiIndice() {
  const indice = new Map();
  const raizes = [
    'pages', 'lib', 'components', 'hooks', 'utils', 'data',
    'tests', 'docs', 'design-system', 'public',
  ];
  const pilha = raizes.map((r) => path.join(RAIZ, r));
  while (pilha.length > 0) {
    const atual = pilha.pop();
    let entradas;
    try { entradas = readdirSync(atual, { withFileTypes: true }); } catch { continue; }
    for (const entrada of entradas) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) { pilha.push(completo); continue; }
      const chave = entrada.name;
      if (!indice.has(chave)) indice.set(chave, []);
      indice.get(chave).push(path.relative(RAIZ, completo));
    }
  }
  return indice;
}

function sufixosPorNome(alvo) {
  if (!indicePorNome) indicePorNome = constroiIndice();
  return indicePorNome.get(path.posix.basename(alvo)) ?? [];
}

/* ---------------------------------------------------------------
 * Citações sobre o Next instalado e sobre o repo upstream (ADR-0008, 05/11/2026).
 * Medido nas baterias 9×5: os papeis citam docs e código do Next de propósito
 * (o AGENTS.md manda ler o guia instalado em `node_modules/next/dist/docs/`), e
 * o `constroiIndice` — que cobre só este repositório — reprovou citações reais:
 * - `route.md`, `headers.md`, `self-hosting.md` existem em
 *   `node_modules/next/dist/docs/01-app/...`;
 * - `incremental-cache/index.js:73` é de
 *   `node_modules/next/dist/server/lib/incremental-cache/index.js` (555 linhas) —
 *   a colisão por nome com `tests/mocks/index.js` puniu a linha certa;
 * - `packages/next/src/...` e URLs `//github.com/...` têm fonte FORA do disco.
 *
 * O pacote é resolvedor de RESERVA: entra após as raízes do projeto, nunca no
 * mesmo índice — o critério do `constroiIndice` (comentários acima, 19/10/2026)
 * não muda.
 */
let caminhosProjetoMemo = null;
let caminhosDistMemo = null;

function caminhosProjeto() {
  if (caminhosProjetoMemo) return caminhosProjetoMemo;
  sufixosPorNome('-placeholder-');
  caminhosProjetoMemo = [...new Set([...indicePorNome.values()].flat())].sort();
  return caminhosProjetoMemo;
}

function caminhosNextDist() {
  if (caminhosDistMemo) return caminhosDistMemo;
  const arquivos = [];
  const pilha = [path.join(RAIZ, 'node_modules', 'next', 'dist')];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    let entradas;
    try { entradas = readdirSync(atual, { withFileTypes: true }); } catch { continue; }
    for (const entrada of entradas) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) { pilha.push(completo); continue; }
      arquivos.push(path.relative(RAIZ, completo).split(path.sep).join('/'));
    }
  }
  caminhosDistMemo = arquivos.sort();
  return caminhosDistMemo;
}

function resolverEmNextDist(alvo) {
  const arquivos = caminhosNextDist();
  if (arquivos.length === 0) return [];
  const partes = alvo.split('/');
  for (let i = 0; i < partes.length; i += 1) {
    const sufixo = partes.slice(i).join('/');
    const achados = arquivos.filter((p) => p.endsWith(`/${sufixo}`));
    if (achados.length > 0) {
      // O mesmo módulo existe em build CJS (`server/lib/...`) e ESM (`esm/server/...`).
      // A CJS tem prioridade na ordem: foi o layout da citação real testada.
      const normais = achados.filter((p) => !p.includes('/esm/'));
      const esm = achados.filter((p) => p.includes('/esm/'));
      return [...normais, ...esm];
    }
  }
  return [];
}

// "..." no caminho é forma escrita, não endereço: `node_modules/.../02-guides/
// cdn-caching.md`, `.../15-route-handlers.md`, `docs/adr/0010-...md`. Vira padrão
// que casa com arquivos reais; os "..." representam o trecho que o modelo cortou.
function padraoAbreviado(alvo) {
  if (!alvo.includes('...')) return null;
  const corpo = alvo.split('...').map((pedaco) => pedaco.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`${corpo}$`);
}

function resolverPorPadrao(padrao) {
  return caminhosProjeto().find((p) => padrao.test(p))
    ?? caminhosNextDist().find((p) => padrao.test(p))
    ?? null;
}

// Fonte fora do disco: layout do repo upstream (`packages/next/...`) e caminhos
// extraídos de URL (`//github.com/...`). A bateria empurra o papel a buscar fora
// (gh_grep, guia do repo upstream); nada no disco poderia validar — sinaliza.
function externaAoDisco(alvo) {
  return alvo.startsWith('//') || alvo.includes('github.com') || alvo.startsWith('packages/');
}

const linhasDeMemo = new Map();

function linhasDe(caminhoRelativo) {
  if (!linhasDeMemo.has(caminhoRelativo)) {
    try {
      linhasDeMemo.set(caminhoRelativo, readFileSync(path.join(RAIZ, caminhoRelativo), 'utf8').split('\n').length);
    } catch {
      linhasDeMemo.set(caminhoRelativo, 0);
    }
  }
  return linhasDeMemo.get(caminhoRelativo);
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

    const diretos = [alvo, path.posix.join('pages/api', alvo)];
    const partes = alvo.split('/');
    const sufixos = [];
    for (let i = 1; i < partes.length; i += 1) {
      const sufixo = partes.slice(i).join('/');
      sufixos.push(sufixo, path.posix.join('pages/api', sufixo));
    }

    // TODOS os candidatos existentes entram — o primeiro achado NÃO é campeão. É a
    // regra que o conferidor do orchestrator consertou em 19/10/2026 (comentário de
    // `resolverCitacao` lá) e que estas baterias repetiram: `roles.js:113` caiu no
    // `tests/helpers/roles.js` (22 linhas) enquanto `pages/api/admin/roles.js` (133)
    // tem a linha; `posts.js:152` caiu em `pages/api/posts.js` (85) com
    // `pages/api/admin/posts.js` (171) e `lib/domain/posts.js` (181) no disco.
    const lista = [];
    for (const c of [...diretos, ...sufixos]) {
      if (ehArquivo(c) && !lista.includes(c)) lista.push(c);
    }
    for (const c of sufixosPorNome(alvo)) {
      if (ehArquivo(c) && !lista.includes(c)) lista.push(c);
    }

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
      const terminaTs = alvo.endsWith('.ts');
      const origemTs = terminaTs
        && (resolverEmNextDist(alvo.replace(/\.ts$/, '.js')).length > 0
          || resolverEmNextDist(alvo.replace(/\.ts$/, '.d.ts')).length > 0);
      if (alvo.endsWith('.mdx') || origemTs) {
        externas.push(alvo);
        continue;
      }
      // Citação abreviada com "..." ou basename do Next instalado: forma escrita
      // comum nos papéis (`node_modules/.../02-guides/cdn-caching.md`, `route.md`,
      // `incremental-cache/index.js`). Resolve na raiz reserva e sinaliza — reprovar
      // aqui puniu citações reais (ver o comentário de `caminhosNextDist`).
      const padrao = padraoAbreviado(alvo);
      const porPadrao = padrao ? resolverPorPadrao(padrao) : null;
      const porDist = porPadrao ? [] : resolverEmNextDist(alvo);
      const reservados = porPadrao ? [porPadrao] : porDist;
      if (reservados.length > 0) {
        lista.push(...reservados);
      } else {
        invalidas.push(`${alvo} (arquivo não encontrado)`);
        continue;
      }
    }
    for (const linha of linhas) {
      const cabem = lista.filter((c) => linha <= linhasDe(c));
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
      const detalhe = lista.map((c) => `${c} (${linhasDe(c)} linhas)`).join(' ou ');
      invalidas.push(`${alvo}:${linha} (nenhum candidato tem a linha: ${detalhe})`);
    }
  }

  const metaPath2 = path.join(SAIDA, arquivo.replace(/\.ndjson$/, '.meta.json'));
  void metaPath2;

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
