/**
 * Ground truth das baterias de bench — verdade derivada do disco em runtime.
 *
 * Este módulo NÃO grava nada e não lê arquivo gerado: contagem de rotas, linhas
 * de âncora e a cobertura das citações dos instrumentos (`gabarito-*.md`,
 * `rubrica.md`) são calculadas na hora, contra a árvore de trabalho. Assim, quando
 * o código mudar, quem acusar primeiro é o verificador — e não o número velho
 * escrito num gabarito.
 *
 * Sem `import.meta`: como `citacoes.js`, é importado por teste Jest/Babel-CJS.
 * Toda função recebe `raiz` explicitamente.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { criarResolvedor, externaAoDisco } from './citacoes.js';

/* ---------------------------------------------------------------
 * 1. Inventário e linhas
 */

function lerArquivo(raiz, relativo) {
  try { return readFileSync(path.join(raiz, relativo), 'utf8'); } catch { return null; }
}

/**
 * Inventário de `pages/api/`: arquivos regulares (diretórios ocultos ignorados),
 * caminhos relativos POSIX ordenados. `rotas` = arquivos cujo texto casa
 * `export default` — a mesma definição de "rota" usada nos gabaritos.
 */
export function inventarioApi(raiz) {
  const arquivos = [];
  const pilha = [path.join(raiz, 'pages', 'api')];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    let entradas;
    try { entradas = readdirSync(atual, { withFileTypes: true }); } catch { continue; }
    for (const entrada of entradas) {
      if (entrada.name.startsWith('.')) continue;
      if (entrada.isDirectory()) { pilha.push(path.join(atual, entrada.name)); continue; }
      if (!entrada.isFile()) continue;
      arquivos.push(path.relative(raiz, path.join(atual, entrada.name)).split(path.sep).join('/'));
    }
  }
  arquivos.sort();
  const rotas = arquivos.filter((a) => /export\s+default\b/.test(lerArquivo(raiz, a) ?? ''));
  return { arquivos, rotas, totalArquivos: arquivos.length, totalRotas: rotas.length };
}

/**
 * Todas as linhas (1-based) em que `trecho` (literal, `includes`) aparece.
 * `[]` quando o arquivo não existe ou nada casa.
 */
export function linhasDe(raiz, arquivo, trecho) {
  const texto = lerArquivo(raiz, arquivo);
  if (texto === null) return [];
  const achadas = [];
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].includes(trecho)) achadas.push(i + 1);
  }
  return achadas;
}

/**
 * Exatamente uma ocorrência ou erro alto (fail-fast): uma âncora que sumiu ou
 * virou duas tem de quebrar a conferência, não devolver `undefined` silencioso.
 */
export function linhaUnica(raiz, arquivo, trecho) {
  const linhas = linhasDe(raiz, arquivo, trecho);
  if (linhas.length === 1) return linhas[0];
  const detalhe = linhas.length === 0
    ? 'nenhuma ocorrência'
    : `${linhas.length} ocorrências (linhas ${linhas.join(', ')})`;
  throw new Error(`linhaUnica: esperava exatamente 1 ocorrência de ${JSON.stringify(trecho)} em ${arquivo}; achei ${detalhe}`);
}

/**
 * Fatos do bench do orchestrator, lidos do disco. Os itens de `pontuar.js`
 * (contagem, ponto de aplicação da autenticação) saem daqui — é o que torna o
 * rótulo e o teste acompanarem o código em vez de um número gravado.
 */
export function fatosOrchestrator(raiz) {
  const inv = inventarioApi(raiz);
  return {
    arquivos: inv.totalArquivos,
    rotas: inv.totalRotas,
    withAuthHandler: linhaUnica(raiz, 'lib/api/adminCrudHandler.js', 'const authenticatedHandler = withAuth(handler);'),
    ipDiagnostico: linhaUnica(raiz, 'pages/api/ip-diagnostico.js', 'export default createAdminHandler({'),
    settingsPost: linhaUnica(raiz, 'pages/api/settings.js', 'const handlePost = withAuth('),
    settingsPut: linhaUnica(raiz, 'pages/api/settings.js', 'const handlePut = withAuth('),
    productsRequireAuth: linhaUnica(raiz, 'pages/api/products.js', 'function requireAuth(req, res)'),
    productsRequireAuthUsos: linhasDe(raiz, 'pages/api/products.js', 'if (!requireAuth(req, res)) return;'),
  };
}

/* ---------------------------------------------------------------
 * 2. Parser de citações de instrumento
 *
 * Os gabaritos citam de dois jeitos: `arquivo.js:305` e, na mesma linha,
 * `arquivo.js` seguido de `(:129)` / `(:302,308,313,318)` / `(:175-180)`.
 * Só parsear aqui — resolver é papel do verificador, com o mesmo resolvedor do
 * conferidor.
 */

// Mesma lista de extensões do REGEX_CITACAO do conferidor (js, cjs, mjs, jsx,
// json, md, mdx, yml, yaml, css, tsx, ts). O lookahead impede que `.jsx` seja
// lido como `.js` (o conferidor escape isso exigindo `:dígito` logo após; aqui o
// token de arquivo pode existir sozinho, então a âncora é o lookahead).
const REGEX_TOKEN_INSTRUMENTO = /([A-Za-z0-9_.\-/[\]]+\.(?:js|cjs|mjs|jsx|json|md|mdx|yml|yaml|css|tsx|ts)(?![A-Za-z0-9]))|(?<![0-9]):(\d+(?:\s*[-,]\s*\d+)*)/g;

/** `21-24` -> {21,24}; `302,308` -> {302,302} e {308,308}; `73` (de `73+`) -> {73,73}. */
function faixasDe(sequencia) {
  const faixas = [];
  for (const pedaco of sequencia.split(',')) {
    const [inicioTexto, fimTexto] = pedaco.trim().split('-');
    const inicio = Number.parseInt(inicioTexto, 10);
    const fim = fimTexto === undefined ? inicio : Number.parseInt(fimTexto, 10);
    faixas.push({ inicio, fim });
  }
  return faixas;
}

/**
 * Extrai `Map<arquivo, Array<{inicio, fim}>>` (deduplicado) de um instrumento.
 *
 * O contexto de arquivo persiste entre linhas de propósito: os gabaritos citam o
 * arquivo numa linha e as linhas na seguinte (`headers.md` num parágrafo, `:395-399`
 * no seguinte). Dentro de uma linha o arquivo mais recente vence — `A.js (:1), B.js (:2)`
 * associa 1 a A e 2 a B — e o contexto não zera depois de associar, para o
 * `status.js (':34',':39' — ... ':27')` fechar as três linhas no mesmo arquivo.
 */
export function extrairCitacoesDeInstrumento(texto) {
  const saida = new Map();
  let arquivoAtual = null;
  for (const linha of texto.split('\n')) {
    for (const m of linha.matchAll(REGEX_TOKEN_INSTRUMENTO)) {
      if (m[1]) { arquivoAtual = m[1]; continue; }
      if (!arquivoAtual) continue;
      if (!saida.has(arquivoAtual)) saida.set(arquivoAtual, []);
      const faixas = saida.get(arquivoAtual);
      for (const faixa of faixasDe(m[2])) {
        if (!faixas.some((f) => f.inicio === faixa.inicio && f.fim === faixa.fim)) faixas.push(faixa);
      }
    }
  }
  return saida;
}

/* ---------------------------------------------------------------
 * 3. Configuração dos instrumentos
 *
 * `documentos` são caminhos relativos a `scripts/bench/`. Cada âncora declara
 * onde a citação DEVE aparecer; contagens casam número escrito contra
 * `inventarioApi`; afirmações conferem expectativa de texto do instrumento (o
 * designer é sabidamente desatualizado — ADR-0008 — e aqui só se DETECTA).
 */
const INSTRUMENTOS = {
  orchestrator: {
    documentos: ['orchestrator/gabarito.md', 'orchestrator/rubrica.md'],
    ancoras: [
      { arquivo: 'lib/api/adminCrudHandler.js', trecho: 'const authenticatedHandler = withAuth(handler);', documentos: ['orchestrator/gabarito.md', 'orchestrator/rubrica.md'] },
      { arquivo: 'pages/api/ip-diagnostico.js', trecho: 'export default createAdminHandler({', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/settings.js', trecho: 'const handlePost = withAuth(', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/settings.js', trecho: 'const handlePut = withAuth(', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/products.js', trecho: 'function requireAuth(req, res)', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/products.js', trecho: 'if (!requireAuth(req, res)) return;', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/auth/check.js', trecho: 'const token = getAuthToken(req);', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/auth/check.js', trecho: 'const decoded = verifyToken(token);', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/status.js', trecho: "if (req.query.mode === 'health') {", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/status.js', trecho: 'const token = getAuthToken(req);', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/status.js', trecho: 'const decoded = verifyToken(token);', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/uploads/[...path].js', trecho: '// Hardening de conteúdo enviado pelo usuário fica em', documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'pages/api/uploads/[...path].js', trecho: "if (req.method === 'HEAD') {", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'next.config.js', trecho: "key: 'Content-Security-Policy'", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'next.config.js', trecho: "key: 'X-Content-Type-Options'", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'proxy.js', trecho: "'/api/auth/login': { limit: 5, window: 60000, key: 'api:auth:login' },", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'proxy.js', trecho: "matcher: ['/api/auth/login'],", documentos: ['orchestrator/gabarito.md'] },
      { arquivo: 'proxy.js', trecho: 'if (clientIP === UNKNOWN_IP) {', documentos: ['orchestrator/gabarito.md'] },
    ],
    contagens: [
      { documento: 'orchestrator/gabarito.md', regex: /\*\*(\d+) arquivos\*\* em `pages\/api\/`/, fontes: ['arquivos'] },
      { documento: 'orchestrator/gabarito.md', regex: /\*\*(\d+) rotas\*\*/, fontes: ['rotas'] },
      { documento: 'orchestrator/rubrica.md', regex: /Acertou (\d+) arquivos e (\d+) rotas/, fontes: ['arquivos', 'rotas'] },
    ],
    afirmacoes: [],
  },

  explorer: {
    documentos: ['papeis/gabarito-explorer.md'],
    ancoras: [
      { arquivo: 'lib/auth/auth.js', trecho: 'export function withAuth(handler) {', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'lib/api/adminCrudHandler.js', trecho: 'const authenticatedHandler = withAuth(handler);', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'pages/api/upload-image.js', trecho: 'export default withAuth(handler);', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'pages/api/settings.js', trecho: 'const handlePost = withAuth(', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'pages/api/settings.js', trecho: 'const handlePut = withAuth(', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'pages/api/cleanup-test-data.js', trecho: 'export default withAuth(handler);', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md', trecho: 'You can [revalidate cached data]', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md', trecho: 'Next.js sets the `Cache-Control` header of `public, max-age=31536000, immutable`', documentos: ['papeis/gabarito-explorer.md'] },
      { arquivo: 'node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md', trecho: "res.setHeader('Cache-Control', 's-maxage=86400')", documentos: ['papeis/gabarito-explorer.md'] },
    ],
    contagens: [],
    // O gabarito afirma zero ocorrências de `cache-control` no route.md: se o doc
    // instalado ganhar a palavra, é o instrumento que está desatualizado.
    afirmacoes: [
      {
        tipo: 'contagem',
        arquivo: 'node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md',
        padrao: /cache-control/gi,
        esperado: 0,
        problema: (n) => `explorer desatualizado: route.md tem ${n} ocorrência(s) case-insensitive de cache-control (o gabarito afirma zero)`,
      },
    ],
  },

  oracle: {
    documentos: ['papeis/gabarito-oracle.md'],
    ancoras: [
      // A âncora é o comentário (linha 55), não o `if`: o mesmo par
      // `if (role === 'admin')` / `return { allowed: true, reason: 'admin' }`
      // aparece de novo no fail-open do `catch` (linhas 68-69), e exigir as duas
      // ocorrências citadas obrigaria o gabarito a cobrir um detalhe que não é o
      // ponto obrigatório — o bypass primário é o do `try`.
      { arquivo: 'lib/api/permissions.js', trecho: "// `role === 'admin'` pula a checagem de permissão POR DESENHO (ADR-0010).", documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'lib/api/permissions.js', trecho: "* - `role === 'admin'` é permitido POR DESENHO", documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'lib/api/adminCrudHandler.js', trecho: '// bypass do cargo `admin` por desenho — ADR-0010', documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'lib/api/adminCrudHandler.js', trecho: '// ── 5. Rate limiting em mutações', documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'pages/api/admin/users.js', trecho: "role: z.string({ error: 'Cargo é obrigatório' }).min(1, 'Cargo é obrigatório'),", documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'pages/api/admin/users.js', trecho: 'async function roleExists(role) {', documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'pages/api/admin/users.js', trecho: 'if (!(await roleExists(role))) {', documentos: ['papeis/gabarito-oracle.md'] },
      { arquivo: 'pages/api/admin/users.js', trecho: "permission: ['Segurança', 'Usuários'],", documentos: ['papeis/gabarito-oracle.md'] },
    ],
    contagens: [],
    afirmacoes: [],
  },

  fixer: {
    documentos: ['papeis/gabarito-fixer.md'],
    ancoras: [
      // `} catch {` é a única ocorrência no arquivo (confere antes de trocar).
      { arquivo: 'pages/api/status.js', trecho: '} catch {', documentos: ['papeis/gabarito-fixer.md'] },
      { arquivo: 'pages/api/status.js', trecho: "status.data.database.details.error = 'Falha ao conectar ao banco de dados';", documentos: ['papeis/gabarito-fixer.md'] },
      { arquivo: 'pages/api/status.js', trecho: 'res.status(200).json(status);', documentos: ['papeis/gabarito-fixer.md'] },
      { arquivo: 'tests/integration/api/status.test.js', trecho: "not.toContain('DB Offline')", documentos: ['papeis/gabarito-fixer.md'] },
    ],
    contagens: [],
    afirmacoes: [],
  },

  designer: {
    documentos: ['papeis/gabarito-designer.md'],
    ancoras: [
      { arquivo: 'design-system/MASTER.md', trecho: 'via `:focus-visible` com a declaração exata', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'design-system/MASTER.md', trecho: 'usar só `box-shadow: var(--color-focus-ring)` como único indicador de', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'design-system/MASTER.md', trecho: 'foco invisível ou removido', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'design-system/MASTER.md', trecho: '`#a3a3a3` sobre claro **não passa**', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'design-system/MASTER.md', trecho: 'usar só para placeholder e texto decorativo, nunca para informação.', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'pages/styles/variables.css', trecho: '--color-focus-primary: #2563eb;', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'pages/styles/variables.css', trecho: '--color-focus-ring: 0 0 0 3px #bfdbfe;', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'pages/styles/variables.css', trecho: '--color-text-tertiary: #a3a3a3;', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'components/UI/Input.module.css', trecho: 'color: var(--color-text-tertiary);', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'components/UI/BaseCard.module.css', trecho: 'color: var(--color-text-tertiary);', documentos: ['papeis/gabarito-designer.md'] },
      { arquivo: 'components/UI/Button.module.css', trecho: '.button:focus-visible {', documentos: ['papeis/gabarito-designer.md'] },
    ],
    contagens: [],
    // O instrumento do designer está sabidamente desatualizado (ADR-0008): P1 e P3
    // afirmam o estado de 22/10 e o disco já foi corrigido. NÃO recalibramos o
    // conteúdo — só detectamos a divergência.
    afirmacoes: [
      {
        tipo: 'bloco',
        arquivo: 'components/UI/Button.module.css',
        seletor: '.button:focus-visible',
        padrao: /outline:\s*none/,
        esperado: true,
        problema: 'P1 desatualizado: o disco tem o par outline + box-shadow',
      },
      {
        tipo: 'bloco',
        arquivo: 'components/UI/Input.module.css',
        seletor: '.helperText',
        padrao: /--color-text-tertiary/,
        esperado: true,
        problema: 'P3 desatualizado: .helperText não usa --color-text-tertiary',
      },
      {
        tipo: 'contagem',
        arquivo: 'components/UI/Input.module.css',
        padrao: /--color-text-tertiary/g,
        esperado: 4,
        problema: (n) => `P3 desatualizado: o disco tem ${n} usos`,
      },
    ],
  },
};

export { INSTRUMENTOS };

/* ---------------------------------------------------------------
 * 4. Verificador
 */

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detalhaCandidatos(resolver, lista) {
  return lista.map((c) => `${c} (${resolver.linhasDe(c)} linhas)`).join(' ou ') || 'nenhum';
}

function verificaCitacao(resolver, alvo, faixas, documento) {
  // Fonte fora do disco vem PRIMEIRO (mesma ordem do conferidor).
  if (externaAoDisco(alvo)) return null;
  const { lista } = resolver.candidatosProjeto(alvo);
  if (lista.length > 0) {
    const faltantes = faixas.filter((f) => !lista.some((c) => resolver.linhasDe(c) >= f.fim));
    if (faltantes.length === 0) return null;
    const citado = faltantes.map((f) => (f.inicio === f.fim ? `:${f.inicio}` : `:${f.inicio}-${f.fim}`)).join(',');
    return {
      tipo: 'citacao',
      documento,
      detalhe: `${alvo}${citado}: nenhum candidato tem a linha citada; candidatos: ${detalhaCandidatos(resolver, lista)}`,
    };
  }
  // Sem candidato no projeto: fonte externa pela extensão, depois a reserva
  // (abreviação "..." ou `node_modules/next/dist`) — abreviadas resolvidas não
  // geram problema, mesmo.
  if (resolver.origemExternaPorExtensao(alvo)) return null;
  if (resolver.resolverReserva(alvo).length > 0) return null;
  return { tipo: 'citacao', documento, detalhe: `${alvo} (arquivo não encontrado)` };
}

function citaArquivo(resolver, alvo, arquivo) {
  if (alvo === arquivo) return true;
  if (arquivo.endsWith(`/${alvo}`)) return true;
  if (alvo.includes('/')) return false;
  return resolver.candidatosProjeto(alvo).lista.includes(arquivo);
}

/**
 * Confere um instrumento contra o disco: documento existe, citações resolvem,
 * âncoras existem E estão cobertas por ranges citados, contagens batem com
 * `inventarioApi` e afirmações de texto se confirmam.
 *
 * @param {string} agente Chave de `INSTRUMENTOS`.
 * @param {object} opcoes
 * @param {string} opcoes.raiz Caminho absoluto da raiz do repositório (obrigatório).
 * @returns {{ok: boolean, agente: string, problemas: Array<object>}}
 */
export function verificarInstrumento(agente, { raiz } = {}) {
  if (!raiz) throw new Error('verificarInstrumento: `raiz` é obrigatória.');
  const config = INSTRUMENTOS[agente];
  if (!config) {
    throw new Error(`verificarInstrumento: agente desconhecido: ${agente} (esperado: ${Object.keys(INSTRUMENTOS).join(', ')})`);
  }
  const resolver = criarResolvedor({ raiz });
  const problemas = [];
  const textos = new Map();
  const citacoesPorDocumento = new Map();

  for (const documento of config.documentos) {
    const relativo = path.join('scripts', 'bench', documento);
    const texto = resolver.conteudoDe(relativo);
    if (texto === null) {
      problemas.push({ tipo: 'documento', documento, detalhe: `${relativo} não existe no disco` });
      textos.set(documento, null);
      citacoesPorDocumento.set(documento, new Map());
      continue;
    }
    textos.set(documento, texto);
    const citacoes = extrairCitacoesDeInstrumento(texto);
    citacoesPorDocumento.set(documento, citacoes);
    for (const [alvo, faixas] of citacoes) {
      const problema = verificaCitacao(resolver, alvo, faixas, documento);
      if (problema) problemas.push(problema);
    }
  }

  for (const ancora of config.ancoras) {
    const linhas = linhasDe(raiz, ancora.arquivo, ancora.trecho);
    if (linhas.length === 0) {
      problemas.push({ tipo: 'ancora', detalhe: `trecho não encontrado em ${ancora.arquivo}: ${JSON.stringify(ancora.trecho)}` });
      continue;
    }
    for (const documento of ancora.documentos) {
      const citacoes = citacoesPorDocumento.get(documento) ?? new Map();
      const coberturas = [];
      for (const [alvo, faixas] of citacoes) {
        if (citaArquivo(resolver, alvo, ancora.arquivo)) coberturas.push({ alvo, faixas });
      }
      if (coberturas.length === 0) {
        problemas.push({ tipo: 'ancora', documento, detalhe: `${documento} não cita o arquivo ${ancora.arquivo} (âncora: ${JSON.stringify(ancora.trecho)})` });
        continue;
      }
      const faltantes = linhas.filter((linha) => !coberturas.some(({ faixas }) => faixas.some((f) => f.inicio <= linha && linha <= f.fim)));
      if (faltantes.length > 0) {
        const citados = coberturas.map(({ alvo, faixas }) => `${alvo} (${faixas.map((f) => (f.inicio === f.fim ? `:${f.inicio}` : `:${f.inicio}-${f.fim}`)).join(', ')})`).join('; ');
        problemas.push({
          tipo: 'ancora',
          documento,
          detalhe: `${documento} cita ${citados}; âncora está em ${ancora.arquivo}:${faltantes.join(', ')} (${JSON.stringify(ancora.trecho)})`,
        });
      }
    }
  }

  if (config.contagens.length > 0) {
    const inv = inventarioApi(raiz);
    const totais = { arquivos: inv.totalArquivos, rotas: inv.totalRotas };
    for (const contagem of config.contagens) {
      const texto = textos.get(contagem.documento);
      if (texto === null) continue; // problema do documento já registrado
      const m = contagem.regex.exec(texto);
      if (!m) {
        problemas.push({ tipo: 'contagem', documento: contagem.documento, detalhe: `${contagem.regex} não casou em ${contagem.documento}` });
        continue;
      }
      contagem.fontes.forEach((fonte, i) => {
        const noDocumento = Number.parseInt(m[i + 1], 10);
        const noDisco = totais[fonte];
        if (noDocumento !== noDisco) {
          problemas.push({
            tipo: 'contagem',
            documento: contagem.documento,
            detalhe: `${contagem.documento} diz ${noDocumento} ${fonte}; o disco tem ${noDisco}`,
          });
        }
      });
    }
  }

  for (const afirmacao of config.afirmacoes) {
    const texto = lerArquivo(raiz, afirmacao.arquivo);
    if (texto === null) {
      problemas.push({ tipo: 'afirmacao', detalhe: `${afirmacao.arquivo} não existe no disco` });
      continue;
    }
    if (afirmacao.tipo === 'bloco') {
      const bloco = new RegExp(`${escaparRegex(afirmacao.seletor)}\\s*\\{([\\s\\S]*?)\\}`).exec(texto);
      const casa = bloco !== null && afirmacao.padrao.test(bloco[1]);
      if (casa !== afirmacao.esperado) {
        problemas.push({ tipo: 'afirmacao', detalhe: `${afirmacao.arquivo} (${afirmacao.seletor}): ${afirmacao.problema}` });
      }
    } else if (afirmacao.tipo === 'contagem') {
      const n = [...texto.matchAll(afirmacao.padrao)].length;
      if (n !== afirmacao.esperado) {
        problemas.push({ tipo: 'afirmacao', detalhe: `${afirmacao.arquivo}: ${afirmacao.problema(n)} (o instrumento afirma ${afirmacao.esperado})` });
      }
    }
  }

  return { ok: problemas.length === 0, agente, problemas };
}

/** Formata os problemas de um instrumento, um por linha (mesmo formato nos dois runners). */
export function descreverProblemas(resultado) {
  return resultado.problemas
    .map((p) => `- [${p.tipo}] ${p.documento ? `${p.documento}: ` : ''}${p.detalhe}`)
    .join('\n');
}

/**
 * Fail-fast dos runners: lança quando o instrumento divergiu do disco.
 *
 * Medir contra um gabarito que já não descreve o código produz nota sem
 * significado (e gasta cota para descobrir isso no fim). O chamador decide
 * QUANDO verificar; a regra de verificação fica num lugar só.
 */
export function exigirInstrumentoValido(agente, { raiz } = {}) {
  const resultado = verificarInstrumento(agente, { raiz });
  if (resultado.ok) return resultado;
  throw new Error(
    `Instrumento do papel "${agente}" divergiu do disco (${resultado.problemas.length} problema(s)). ` +
    'Recalibre `scripts/bench/` na mesma rodada (ADR-0008) antes de medir:\n' +
    descreverProblemas(resultado)
  );
}
