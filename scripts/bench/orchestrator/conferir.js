#!/usr/bin/env node
/**
 * Camada A da rubrica (`scripts/bench/orchestrator/rubrica.md`): mede o que dá para
 * medir sem juízo, em cima das execuções salvas por `rodar.js`.
 *
 * O que ele NÃO faz: dizer se a resposta está correta. Julgarar o conteúdo contra o
 * `gabarito.md` é trabalho humano — a mesma doutrina de todas as baterias deste projeto:
 * a conferência é feita fora do modelo, não pela nota que o modelo dá a si mesmo.
 *
 * O que ele mede:
 *   - houve delegação (a saída crua menciona a tool `subagent`);
 *   - cada citação `arquivo:linha` existe de verdade;
 *   - a execução foi contaminada por leitura do gabarito.
 *
 * Uso: npm run bench:orch:conferir
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const SAIDA = path.join(RAIZ, 'scripts', 'bench', 'orchestrator', 'resultados');

// `arquivo.ext:123`, com ou sem crase/aspas em volta. Só as extensões típicas de código e
// doc do projeto entram; o que vier com caminho relativo ou com `/` é resolvido por
// sufixo. Não há espaço antes dos dois-pontos de propósito: `check.js`: 401 é status HTTP
// em prosa, não uma citação de linha, e em 19/10/2026 essa regex acusou duas citações
// válidas como apontando para a linha 401 de um arquivo de 109 linhas.
const REGEX_CITACAO = /([A-Za-z0-9_.\-/[\]]+\.(?:js|cjs|mjs|jsx|json|md|mdx|yml|yaml|css|tsx|ts))[`'"]?:(\d+)/g;

// Caminho de uma citação pode ser escrito relativo ao diretório auditado. Os modelos
// escrevem `admin/users.js` para `pages/api/admin/users.js` — que é a forma natural
// quando se está falando de "as rotas". Resolver só a partir da raiz marca essas citações
// como inexistentes, e é o que aconteceu em 19/10/2026: 16 "caminhos não encontrados"
// numa execução cujo texto estava correto.
const DIRETORIO_AUDITADO = 'pages/api';

// Cache de arquivos já lidos: a mesma citação aparece várias vezes na resposta.
const cacheLinhas = new Map();
let indiceBasename = null;

/**
 * Resolve a citação a partir da raiz e, se não achar, por sufixo dentro de `pages/api/`.
 *
 * Os modelos escrevem o caminho relativo ao diretório auditado — `admin/users.js` para
 * `pages/api/admin/users.js`, `settings.js` para `pages/api/settings.js` — que é a forma
 * natural quando se está falando de "as rotas". Resolver só a partir da raiz marca essas
 * citações como inexistentes: em 19/10/2026 isso produziu 16 "caminhos não encontrados"
 * numa execução cujo texto estava correto.
 */
async function resolverCitacao(alvo) {
  const candidatos = [alvo, path.posix.join(DIRETORIO_AUDITADO, alvo)];
  // Também tenta cada sufixo do caminho: `admin/users.js` -> `users.js`.
  const partes = alvo.split('/');
  for (let i = 1; i < partes.length; i += 1) {
    const sufixo = partes.slice(i).join('/');
    candidatos.push(sufixo, path.posix.join(DIRETORIO_AUDITADO, sufixo));
  }

  for (const candidato of candidatos) {
    if (cacheLinhas.has(candidato)) {
      const guardado = cacheLinhas.get(candidato);
      if (guardado !== null) return guardado;
      continue;
    }
    let total;
    try {
      total = (await readFile(path.join(RAIZ, candidato), 'utf8')).split('\n').length;
    } catch {
      total = null;
    }
    cacheLinhas.set(candidato, total);
    if (total !== null) return total;
  }
  return null;
}

/** Separa o texto do modelo dos eventos de log: só as partes `text` viram resposta. */
function extrairTexto(ndjson) {
  const partes = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try {
      evento = JSON.parse(linha);
    } catch {
      continue;
    }
    const parte = evento?.part;
    if (parte && parte.type === 'text' && typeof parte.text === 'string') {
      partes.push(parte.text);
    }
  }
  return partes.join('\n');
}

// Campos querepresentsem um ARQUIVO sendo aberto. Só eles provam leitura do gabarito.
// Texto em prosa (`prompt`, `description`) não conta: em 19/10/2026 o modelo repassou
// ao subagente a própria proibição de ler `scripts/bench/`, e uma busca em qualquer
// campo marcava toda execução como contaminada.
const CAMPOS_ALVO = ['path', 'filePath', 'file', 'pattern', 'query', 'command'];

/** Contaminação = alguma tool tentou abrir algo sob `scripts/bench/`. */
function houveContaminacao(tools) {
  return tools.some((t) => CAMPOS_ALVO.some((campo) => {
    const valor = t.entrada?.[campo];
    return typeof valor === 'string' && valor.includes('scripts/bench/');
  }));
}

/**
 * Lê os eventos de tool da execução.
 *
 * Delegação e contaminação são decididas AQUI, pelos eventos estruturados, e não por
 * busca de texto no bruto. O prompt entregue ao modelo menciona `scripts/bench/` na
 * própria instrução de não lê-lo, então qualquer busca no bruto marca tudo. E "delegou"
 * não é a palavra "subagent" aparecer na resposta: o modelo pode narrar uma delegação
 * que não fez.
 */
function extrairTools(ndjson) {
  const tools = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try {
      evento = JSON.parse(linha);
    } catch {
      continue;
    }
    const parte = evento?.part;
    if (parte && parte.type === 'tool' && typeof parte.tool === 'string') {
      tools.push({ nome: parte.tool, entrada: parte.state?.input });
    }
  }
  return tools;
}

/**
 * Índice basename -> caminho, para distinguir "citou um caminho que não existe" de
 * "citou um caminho abreviado que existe em outro lugar".
 *
 * `adminCrudHandler.js` não existe na raiz nem em `pages/api/` — o arquivo real é
 * `lib/api/adminCrudHandler.js`. Chamar isso de citação inválida seria cobrar do modelo
 * algo que ele não errou: o ponto do arquivo está certo, o caminho está abreviado. Já
 * `arquivo.js:999` num arquivo de 100 linhas é erro de conteúdo, e esse continua inválido.
 */
async function indicePorBasename() {
  if (indiceBasename) return indiceBasename;
  indiceBasename = new Map();
  const raizes = ['pages', 'lib', 'components', 'hooks', 'utils', 'data', 'tests', 'docs', 'scripts'];
  for (const raiz of raizes) {
    const pilha = [path.join(RAIZ, raiz)];
    while (pilha.length > 0) {
      const atual = pilha.pop();
      let entradas;
      try {
        entradas = await readdir(atual, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entrada of entradas) {
        const completo = path.join(atual, entrada.name);
        if (entrada.isDirectory()) {
          pilha.push(completo);
          continue;
        }
        const chave = entrada.name;
        if (!indiceBasename.has(chave)) indiceBasename.set(chave, []);
        indiceBasename.get(chave).push(path.relative(RAIZ, completo));
      }
    }
  }
  return indiceBasename;
}

async function analisar(arquivo) {
  const ndjson = await readFile(path.join(SAIDA, arquivo), 'utf8');
  const resposta = extrairTexto(ndjson);
  const tools = extrairTools(ndjson);

  const delegacoes = tools.filter((t) => t.nome === 'subagent');
  const contaminado = houveContaminacao(tools);

  const citadas = new Map();
  for (const m of resposta.matchAll(REGEX_CITACAO)) {
    const alvo = m[1];
    const linha = Number.parseInt(m[2], 10);
    if (!citadas.has(alvo)) citadas.set(alvo, new Set());
    citadas.get(alvo).add(linha);
  }

  const invalidas = [];
  const abreviadas = [];
  const indice = await indicePorBasename();
  for (const [alvo, linhas] of citadas) {
    const total = await resolverCitacao(alvo);
    if (total === null) {
      const candidatos = indice.get(path.posix.basename(alvo)) || [];
      if (candidatos.length > 0) {
        abreviadas.push(`${alvo} -> ${candidatos.join(' ou ')}`);
      } else {
        invalidas.push(`${alvo} (nenhum arquivo do repositório tem esse nome)`);
      }
      continue;
    }
    for (const linha of linhas) {
      if (linha > total) invalidas.push(`${alvo}:${linha} (o arquivo tem ${total} linhas)`);
    }
  }

  return {
    arquivo,
    resposta,
    delegou: delegacoes.length > 0,
    delegacoes,
    tools,
    contaminado,
    citacoes: citadas.size,
    linhasCitadas: [...citadas.values()].reduce((t, s) => t + s.size, 0),
    invalidas,
    abreviadas,
  };
}

const TAMANHO_MINIMO_RESPOSTA = 600;

function linhaRelatorio(r) {
  const citacoes = r.citacoes === 0 ? 'nenhuma' : `${r.citacoes} arquivo(s), ${r.linhasCitadas} linha(s)`;
  const tamanho = r.resposta.trim().length;
  const problemas = [];
  if (r.invalidas.length > 0) problemas.push(`${r.invalidas.length} citação(ões) inválida(s)`);
  if (r.abreviadas.length > 0) problemas.push(`${r.abreviadas.length} abreviada(s)`);
  if (tamanho === 0) problemas.push('**sem resposta final**');
  else if (tamanho < TAMANHO_MINIMO_RESPOSTA) problemas.push(`resposta curta (${tamanho} caracteres)`);
  return [
    `| ${r.arquivo} | ${r.delegou ? `sim (${r.delegacoes.length})` : '**não**'} | ${citacoes} | ${problemas.length ? problemas.join('; ') : '—'} | ${r.contaminado ? '**SIM — descartar**' : 'não'} |`,
  ].join('\n');
}

async function main() {
  let arquivos;
  try {
    arquivos = (await readdir(SAIDA)).filter((f) => f.endsWith('.ndjson')).sort();
  } catch {
    console.error(`Nada em ${path.relative(RAIZ, SAIDA)}/. Rode antes: npm run bench:orch:rodar`);
    process.exitCode = 1;
    return;
  }
  if (arquivos.length === 0) {
    console.error(`Nenhuma execução em ${path.relative(RAIZ, SAIDA)}/. Rode antes: npm run bench:orch:rodar`);
    process.exitCode = 1;
    return;
  }

  const relatorios = [];
  for (const arquivo of arquivos) {
    relatorios.push(await analisar(arquivo));
  }

  console.log('Camada A — sinais automáticos\n');
  console.log('| execução | delegou | citações | problemas | contaminada |');
  console.log('|---|---|---|---|---|');
  for (const r of relatorios) console.log(linhaRelatorio(r));

  const sujas = relatorios.filter((r) => r.contaminado);
  if (sujas.length > 0) {
    console.log(`\n${sujas.length} execução(ões) contaminada(s) — alguma tool tentou abrir algo em \`scripts/bench/\`, então leu o gabarito. Descarte na hora de comparar.`);
  }
  const semDelegar = relatorios.filter((r) => !r.delegou);
  if (semDelegar.length > 0) {
    console.log(`${semDelegar.length} execução(ões) sem delegação — o modelo respondeu na mão. Anotar como Camada C = não orquestrou, independente de acertar o gabarito.`);
  }
  const semResposta = relatorios.filter((r) => !r.resposta.trim());
  if (semResposta.length > 0) {
    console.log(`${semResposta.length} execução(ões) sem resposta final. Causa comum: delegação em \`background\` encerra o turno, e o \`opencode run\` devolve quando o turno acaba (ver rubrica.md §"Delegação em background").`);
  }

  const detalhe = relatorios.map((r) => {
    const ferramentas = r.tools.length === 0
      ? '(nenhum evento de tool)'
      : r.tools.map((t) => `- \`${t.nome}\``).join('\n');
    const delegacoes = r.delegacoes.length === 0
      ? 'nenhuma'
      : r.delegacoes.map((d) => {
        const entrada = d.entrada || {};
        const alvo = entrada.description || entrada.agent || '(sem descrição)';
        const modo = entrada.background === true ? 'background' : 'foreground';
        return `- \`${entrada.agent || '?'}\` (${modo}) — ${alvo}`;
      }).join('\n');
    const linhas = [
      `# ${r.arquivo}`,
      '',
      `- delegou: ${r.delegou ? `sim, ${r.delegacoes.length} vez(es)` : 'não'}`,
      `- contaminada: ${r.contaminado ? 'sim' : 'não'}`,
      `- citações: ${r.linhasCitadas} linha(s) em ${r.citacoes} arquivo(s)`,
      `- resposta final: ${r.resposta.trim() ? `${r.resposta.trim().length} caracteres` : '**VAZIA**'}`,
      '',
      '## Delegações',
      '',
      delegacoes,
      '',
      '## Ferramentas usadas',
      '',
      ferramentas,
      '',
      '## Citação(ões) inválida(s)',
      '',
      r.invalidas.length > 0 ? r.invalidas.map((c) => `- \`${c}\``).join('\n') : 'nenhuma',
      '',
      '## Resposta do modelo',
      '',
      r.resposta.trim() || '(vazio)',
      '',
      '---',
      '',
      'Conferir o conteúdo contra `gabarito.md` (Camada B) e julgar a orquestração pela `rubrica.md` (Camada C).',
    ];
    return linhas.join('\n');
  }).join('\n\n---\n\n');

  const arqRelatorio = path.join(SAIDA, 'conferencia.md');
  await writeFile(arqRelatorio, detalhe, 'utf8');
  const info = await stat(arqRelatorio);
  console.log(`\nDetalhe de cada execução em ${path.relative(RAIZ, arqRelatorio)} (${relatorios.length} execução(ões), ${info.size} bytes).`);
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});