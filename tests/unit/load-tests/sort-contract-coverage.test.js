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
 * O QUE ESTE TESTE TRAVA. Todo valor de `sort` que um script de ordenação
 * envia para uma rota de enum ESTREITO tem que estar no enum vigente. Rota
 * com FALLBACK (aceita qualquer valor) não é restringida aqui: valor
 * desconhecido nela não reprova a suíte — e o formato legado
 * `sort=<campo>&order=<dir>` só é permitido contra rota com fallback.
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
 * `estrito: false` = a rota tem fallback (aceita qualquer valor) — não há o
 * que restringir, e valor desconhecido ali não reprova a suíte.
 */
const ROTAS = [
  { endpoint: '/api/musicas', arquivo: 'pages/api/musicas.js', estrito: true },
  { endpoint: '/api/products', arquivo: 'pages/api/products.js', estrito: true },
  { endpoint: '/api/videos', arquivo: 'pages/api/videos.js', estrito: false },
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
 * endpoint público e o valor de `sort` que enviam.
 * - `sortMode` presente → formato novo (enum): URL `?sort=<sortMode>`.
 * - `sortMode` ausente → formato legado: URL `?sort=<sortField>&order=<sortOrder>`.
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
      achados.push({
        relativo,
        endpoint: (texto.match(/publicEndpoint:\s*'([^']+)'/) || [])[1],
        sortMode: (texto.match(/sortMode:\s*'([^']+)'/) || [])[1],
      });
    }
  }
  return achados;
}

describe('Contrato de `sort` entre a suíte k6 e as rotas públicas', () => {
  it('extrai um conjunto de valores aceitos para cada rota estrita', () => {
    for (const rota of ROTAS.filter((r) => r.estrito)) {
      const { aceitos } = contratoDaRota(rota);
      expect(aceitos.size).toBeGreaterThan(0);
      expect(aceitos.has('default')).toBe(true);
    }
  });

  it('/api/videos aceita valor desconhecido (fallback) — se isso mudar, esta guarda precisa ser revista', () => {
    const videos = ROTAS.find((r) => r.endpoint === '/api/videos');
    const { temFallback } = contratoDaRota(videos);
    expect(temFallback).toBe(true);
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

  it('o formato legado sort=<campo>&order=<dir> só é usado contra rota com fallback', () => {
    const problemas = [];
    for (const script of scriptsDeOrdenacao()) {
      if (script.sortMode) continue; // formato novo (enum)
      const rota = ROTAS.find((r) => r.endpoint === script.endpoint);
      if (!rota) continue;
      if (rota.estrito) {
        problemas.push(`${script.relativo}: formato legado contra rota estrita ${rota.endpoint}`);
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
});
