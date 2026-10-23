/**
 * Guarda de contrato de `sort` entre a suíte k6 e as rotas públicas.
 *
 * POR QUE ESTE TESTE EXISTE (cron #19, 22/10/2026). O ADR-0014 (21/10/2026)
 * trocou o conjunto de valores de `sort` de `/api/musicas`: `recent` saiu e
 * entraram `positioned`, `oldest` e `alpha_desc` — e a rota passou a REJEITAR
 * (400) qualquer valor fora do conjunto, porque valida com `z.enum`. O script
 * `musicas-sort-test.js` continuou mandando `?sort=recent`: a requisição
 * voltou 400, 2 dos 3 checks falharam, o threshold `checks: ['rate==1.0']`
 * reprovou o script e o job inteiro caiu. Nada na suíte avisou antes — o
 * contrato da API mudou e o script ficou para trás.
 *
 * Lição reforçada em 23/10/2026: o `videos-sort-test.js` mandava
 * `?sort=created_at&order=desc` — formato legado que nenhuma rota entende.
 * `/api/videos` caía no fallback `recent` e o teste validava o DEFAULT, não o
 * parâmetro; além disso declarava uma chave de config morta que o runner
 * nunca leu. A rota foi endurecida (enum estrito, 400 sem fallback) e
 * o runner abandonou o formato legado (`sortMode` é obrigatório).
 *
 * O QUE ESTE TESTE TRAVA (quatro frentes):
 * 1. Todo valor de `sort` que um script de ordenação envia para uma rota
 *    estrita tem que estar no enum vigente da rota.
 * 2. Todo script de ordenação declara `sortMode` — sem ele o runner agora
 *    lança erro; nunca mais config morta.
 * 3. Cobertura bidirecional de chaves: toda chave top-level de um
 *    `resourceConfig` de `createSortTest` tem que ser consumida pelo runner —
 *    mata a classe de bug de "config morta" (chave declarada, nunca lida).
 * 4. Paridade teste×componente para vídeos: o `limit` do script é o mesmo que
 *    o `VideoGallery` manda (12) e o `sort` default do componente está no
 *    enum da rota — o script mede a MESMA entrada de cache que o usuário usa.
 *
 * Teste TEXTUAL: lê os arquivos do disco (fonte única de verdade) e não os
 * importa — importar um script k6 no jest falharia porque `k6/http` não
 * resolve.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

/** Raiz do repositório. */
const RAIZ = process.cwd();

/** Raiz da suíte de carga. */
const DIR_LOAD_TESTS = path.join(RAIZ, 'load-tests');

/** Subdiretórios que contêm scripts de teste (o `helpers/` fica de fora). */
const DIRS_SCRIPTS = ['functional', 'performance', 'security'];

/**
 * Rotas públicas com ordenação e o arquivo que define o contrato.
 * `estrito: true` = a rota REJEITA (400) valor fora do conjunto declarado.
 * `defaultSort` = o valor que a rota assume sem parâmetro (precisa estar no
 * enum; era a asserção global cega `aceitos.has('default')` — agora por rota,
 * porque `/api/videos` caiu para o enum estrito com default `recent`).
 */
const ROTAS = [
  { endpoint: '/api/musicas', arquivo: 'pages/api/musicas.js', estrito: true, defaultSort: 'default' },
  { endpoint: '/api/products', arquivo: 'pages/api/products.js', estrito: true, defaultSort: 'default' },
  { endpoint: '/api/videos', arquivo: 'pages/api/videos.js', estrito: true, defaultSort: 'recent' },
];

/** Lê um arquivo do repositório. */
function ler(arquivo) {
  return fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
}

/**
 * Extrai o contrato de `sort` de uma rota.
 * @returns {{aceitos: Set<string>, temFallback: boolean}}
 */
function contratoDaRota(rota) {
  const texto = ler(rota.arquivo);
  const aceitos = new Set();

  // (a) enum inline: `sort: z.enum([...])`
  for (const m of texto.matchAll(/sort:\s*z\.enum\(\[([^\]]*)\]\)/g)) {
    for (const v of m[1].matchAll(/'([^']+)'/g)) aceitos.add(v[1]);
  }

  // (b) constante usada como enum: `const PUBLIC_SORT_ENUM = [...]` + `z.enum(PUBLIC_SORT_ENUM)`
  for (const m of texto.matchAll(/const\s+([A-Z0-9_]*SORT[A-Z0-9_]*)\s*=\s*\[([^\]]*)\]/g)) {
    if (!new RegExp(`z\\.enum\\(\\s*${m[1]}\\s*\\)`).test(texto)) continue;
    for (const v of m[2].matchAll(/'([^']+)'/g)) aceitos.add(v[1]);
  }

  // Fallback: `SORT_MAP[sort] || SORT_MAP.<algo>` — a rota aceita qualquer valor.
  const temFallback = /SORT_MAP\[\s*\w+\s*\]\s*\|\|\s*SORT_MAP\./.test(texto);

  return { aceitos, temFallback };
}

/**
 * Scripts que exercitam ordenação (os que importam `createSortTest`), com o
 * endpoint público, o `sortMode` e as chaves top-level do `resourceConfig`.
 * Todos usam o formato único: URL `?sort=<sortMode>` (+ `limit` opcional).
 */
function scriptsDeOrdenacao() {
  const achados = [];
  for (const dir of DIRS_SCRIPTS) {
    const absoluto = path.join(DIR_LOAD_TESTS, dir);
    for (const nome of fs.readdirSync(absoluto).sort()) {
      if (!nome.endsWith('.js')) continue;
      const relativo = `${dir}/${nome}`;
      const texto = ler(`load-tests/${relativo}`);
      if (!texto.includes('createSortTest')) continue;
      const bloco = (texto.match(/const resourceConfig = \{([\s\S]*?)\n\};/) || [])[1] || '';
      // Chaves top-level: linhas com exatamente 2 espaços de indentação seguidas
      // de `identificador:` — comentários (//) e chaves aninhadas ficam de fora.
      const chaves = [...bloco.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
      achados.push({
        relativo,
        chaves,
        endpoint: (texto.match(/publicEndpoint:\s*'([^']+)'/) || [])[1],
        sortMode: (texto.match(/sortMode:\s*'([^']+)'/) || [])[1],
      });
    }
  }
  return achados;
}

/** Trecho de código de uma função do runner, entre duas assinaturas. */
function corpoDaFuncao(runner, inicio, fim) {
  const i = runner.indexOf(inicio);
  const j = runner.indexOf(fim, i + 1);
  return runner.slice(i, j === -1 ? runner.length : j);
}

/**
 * Chaves de `resourceConfig` consumidas pelo pipeline de ordenação do runner:
 * a desestruturação de `createSortDefault` + as leituras `resourceConfig.x`
 * de `createSortOptions` (profundidade: `profileName` e `optionsOverrides`).
 */
function chavesConsumidasPeloRunner() {
  const runner = ler('load-tests/helpers/resource-test-runner.js');
  const segDefault = corpoDaFuncao(runner, 'function createSortDefault', 'function createLoadOptions');
  const segOptions = corpoDaFuncao(runner, 'function createSortOptions', 'function createSortDefault');

  const destructured = (segDefault.match(/const \{([^}]*)\}\s*=\s*resourceConfig/) || [])[1] || '';
  const nomesDestructuring = destructured
    .split(',')
    .map((t) => t.split('=')[0].trim())
    .filter(Boolean);

  const leiturasDiretas = [...(segOptions + segDefault).matchAll(/resourceConfig\.(\w+)/g)].map((m) => m[1]);

  return new Set([...nomesDestructuring, ...leiturasDiretas]);
}

describe('Contrato de `sort` entre a suíte k6 e as rotas públicas', () => {
  it('extrai um conjunto de valores aceitos para cada rota estrita, contendo o default da rota', () => {
    for (const rota of ROTAS.filter((r) => r.estrito)) {
      const { aceitos } = contratoDaRota(rota);
      expect(aceitos.size).toBeGreaterThan(0);
      expect(aceitos.has(rota.defaultSort)).toBe(true);
    }
  });

  it('/api/videos tem enum estrito, sem fallback, e referencia INVALID_PARAMS_MESSAGE (correção 23/10/2026)', () => {
    const videos = ROTAS.find((r) => r.endpoint === '/api/videos');
    const { aceitos, temFallback } = contratoDaRota(videos);
    expect(temFallback).toBe(false);
    expect([...aceitos].sort()).toEqual(['alpha', 'alpha_desc', 'oldest', 'recent']);
    expect(ler(videos.arquivo)).toContain('INVALID_PARAMS_MESSAGE');
  });

  it('todo `sort` que um script envia para rota estrita está no enum vigente', () => {
    const problemas = [];
    for (const script of scriptsDeOrdenacao()) {
      const rota = ROTAS.find((r) => r.endpoint === script.endpoint);
      if (!rota || !rota.estrito || !script.sortMode) continue;
      const { aceitos } = contratoDaRota(rota);
      if (!aceitos.has(script.sortMode)) {
        problemas.push(
          `${script.relativo}: sort=${script.sortMode} não é aceito por ${rota.endpoint} [aceitos: ${[...aceitos].join(', ')}]`
        );
      }
    }
    expect(problemas).toEqual([]);
  });

  it('todo script de ordenação declara `sortMode` (o formato legado saiu do runner)', () => {
    const semSortMode = scriptsDeOrdenacao()
      .filter((s) => !s.sortMode)
      .map((s) => s.relativo);
    expect(semSortMode).toEqual([]);
  });

  it('toda chave top-level de um resourceConfig de ordenação é consumida pelo runner (mata config morta)', () => {
    const consumidas = chavesConsumidasPeloRunner();
    const problemas = [];
    for (const script of scriptsDeOrdenacao()) {
      const orfas = script.chaves.filter((k) => !consumidas.has(k));
      for (const chave of orfas) {
        problemas.push(
          `${script.relativo}: chave "${chave}" declarada no resourceConfig mas NÃO consumida por createSortDefault/createSortOptions [consumidas: ${[...consumidas].sort().join(', ')}]`
        );
      }
    }
    expect(problemas).toEqual([]);
  });

  it('musicas-sort-test.js envia um valor aceito por /api/musicas (regressão do cron #19)', () => {
    const script = scriptsDeOrdenacao().find((s) => s.relativo.endsWith('musicas-sort-test.js'));
    expect(script).toBeDefined();
    expect(script.sortMode).toBe('default');
    const { aceitos } = contratoDaRota(ROTAS.find((r) => r.endpoint === '/api/musicas'));
    expect(aceitos.has(script.sortMode)).toBe(true);
  });

  it('vídeos: limit do script == limit do VideoGallery e o sort default do componente está no enum da rota', () => {
    // Paridade teste×componente (parse textual, sem importar — o componente
    // usa JSX e o script k6 usa `k6/http`).
    const script = ler('load-tests/performance/videos-sort-test.js');
    const limitScript = (script.match(/^ {2}limit:\s*(\d+),$/m) || [])[1];
    const gallery = ler('components/Features/Video/VideoGallery.js');
    const limitComponente = (gallery.match(/limit:\s*'(\d+)'/) || [])[1];
    expect(limitScript).toBeDefined();
    expect(limitComponente).toBeDefined();
    expect(limitScript).toBe(limitComponente);

    const sortDefaultComponente = (gallery.match(/\[sortBy, setSortBy\] = useState\('([^']+)'\)/) || [])[1];
    expect(sortDefaultComponente).toBeDefined();
    const { aceitos } = contratoDaRota(ROTAS.find((r) => r.endpoint === '/api/videos'));
    expect(aceitos.has(sortDefaultComponente)).toBe(true);
  });
});
