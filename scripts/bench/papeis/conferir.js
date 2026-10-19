#!/usr/bin/env node
/**
 * Camada A das baterias de **papel** (`scripts/bench/papeis/`).
 *
 * O que é automático (sem juízo):
 * - o modelo respondeu alguma coisa (a execução entregou texto);
 * - o modelo **editou** algum arquivo, e quais (isto é o sinal central no papel do
 *   `fixer`: um `fixer` que não edita nada não fez o trabalho);
 * - toda citação `arquivo:linha` existe de verdade;
 * - a execução tocou o gabarito (`scripts/bench/`) — contaminação.
 *
 * O que **não** é automático: se a resposta está *correta*. Isso é julgamento
 * humano, contra `gabarito-<papel>.md`, como em todas as baterias deste projeto.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { statSync, readdirSync } from 'node:fs';
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

function contaminada(tools) {
  for (const t of tools) {
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
  for (const [alvo, linhas] of citadas) {
    const candidatos = [alvo, path.posix.join('pages/api', alvo)];
    const partes = alvo.split('/');
    for (let i = 1; i < partes.length; i += 1) {
      const sufixo = partes.slice(i).join('/');
      candidatos.push(sufixo, path.posix.join('pages/api', sufixo));
    }
    for (const sufixo of sufixosPorNome(alvo)) candidatos.push(sufixo);

    let achado = null;
    for (const c of candidatos) {
      if (ehArquivo(c)) { achado = c; break; }
    }
    if (!achado) {
      // Arquivo **novo**, criado pela própria execução, não está mais no disco: a
      // restauração do repo o removeu entre a execução e a conferência. Não é erro
      // de citação — é consequência da medição. Sinalizado, não reprovado.
      if (criadosDurante.includes(alvo)) {
        criadasRemovidas.push(alvo);
        continue;
      }
      invalidas.push(`${alvo} (arquivo não encontrado)`);
      continue;
    }
    const total = (await readFile(path.join(RAIZ, achado), 'utf8')).split('\n').length;
    for (const linha of linhas) {
      // O arquivo pode ter sido EDITADO pela execução: a citação então aponta para
      // a linha no estado **novo**, e o disco já está no estado antigo (a restauração
      // do repo rodou). Comparar com o disco reprovaria citação certa.
      // Sinalizado, não reprovado — o acerto é julgamento humano, contra o gabarito.
      if (linha > total) {
        const editado = (meta.arquivosEditados || []).some((p) => p.replace(`${RAIZ}/`, '') === achado);
        if (editado) {
          citacoesPosArquivoEditado.push(`${alvo}:${linha} (arquivo editado pela execução)`);
          continue;
        }
        invalidas.push(`${alvo}:${linha} (${achado} tem ${total} linhas)`);
      }
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
    const citacoes = r.invalidas.length > 0 ? `**${r.invalidas.length} inválida(s)**` : 'válidas';
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
