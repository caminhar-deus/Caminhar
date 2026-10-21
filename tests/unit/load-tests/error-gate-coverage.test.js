/**
 * Guardas de cobertura de gate de erro da suíte k6 (Fase 2 do item AD de
 * `docs/PENDENCIAS_scripts_testes.md`).
 *
 * Testes TEXTUAIS: leem os scripts do disco (fonte única de verdade) e não os
 * importam — importar um script k6 no jest falharia porque `k6/http` não
 * resolve. O único import direto é `load-tests/helpers/profiles.js`, que é JS
 * puro sem dependência do k6 (o `babel.jest.config.js` converte os ES Modules
 * para CommonJS).
 *
 * Antes de qualquer busca, os comentários (`//` e `/* *\/`) são REMOVIDOS do
 * texto: `ddos-search-test.js`, por exemplo, menciona `http_req_failed`
 * justamente para explicar por que NÃO o declara — procurar a chave sem antes
 * limpar os comentários daria falso positivo.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { PROFILES } from '../../../load-tests/helpers/profiles';

/** Raiz da suíte de carga. */
const DIR_LOAD_TESTS = path.resolve(process.cwd(), 'load-tests');

/** Subdiretórios que contêm scripts de teste (o `helpers/` fica de fora). */
const DIRS_SCRIPTS = ['functional', 'performance', 'security'];

/** Todos os scripts `.js` da suíte, como caminhos relativos ordenados. */
function todosOsScripts() {
  const scripts = [];
  for (const dir of DIRS_SCRIPTS) {
    const absoluto = path.join(DIR_LOAD_TESTS, dir);
    for (const nome of fs.readdirSync(absoluto).sort()) {
      if (nome.endsWith('.js')) {
        scripts.push(path.join(dir, nome));
      }
    }
  }
  return scripts;
}

/** Texto bruto de um script, a partir do caminho relativo à raiz da suíte. */
function lerScript(relativo) {
  return fs.readFileSync(path.join(DIR_LOAD_TESTS, relativo), 'utf8');
}

/**
 * Remove comentários de bloco e de linha do texto. É um stripper textual
 * (não um parser): o que importa aqui é que nenhuma CHAVE de threshold ou
 * trecho de código que só existe comentado satisfaga uma asserção.
 */
function removerComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Extrai os template literais INICIADOS por `${BASE_URL}` — esses são URLs de
 * requisição. Mensagens como `` `❌ Conexão recusada em ${BASE_URL}...` ``
 * (ex.: `exec.test.abort`) contêm acento mas não são URL e por isso ficam de
 * fora: o `^` do regex só casa literais que começam com `${BASE_URL}`.
 */
function urlsTemplate(texto) {
  const urls = [];
  const regex = /`(\$\{BASE_URL\}[^`]*)`/g;
  let m;
  while ((m = regex.exec(texto)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

/**
 * Remove as interpolações `${...}` de um template literal, deixando só a
 * parte ESTÁTICA do request target. As interpolações são computadas em
 * runtime — `encodeURIComponent('Graça')` viaja como `Gra%C3%A7a`, puro
 * ASCII; o que gera 400 Bad Request no parser HTTP é o byte cru na parte
 * estática (o bug do run #15/#17/#18 em `musicas-search-test.js`).
 */
function parteEstatica(template) {
  // As interpolações da suíte não têm `{` aninhado dentro de `${...}`.
  return template.replace(/\$\{[^{}]*\}/g, '');
}

/** Caracteres com codePoint > 127 (não-ASCII) de uma string. */
function naoAscii(texto) {
  return Array.from(texto).filter(c => c.codePointAt(0) > 127);
}

describe('suíte k6 — nenhuma URL de requisição carrega caractere não-ASCII', () => {
  // Regressão do bug real medido nos runs #15, #17 e #18: a URL do warm-up
  // `?search=Graça` levava o byte UTF-8 cru no request target; o parser HTTP
  // do Node respondia 400 Bad Request ANTES da aplicação e a suíte reportava
  // PASS porque o warm-up não tinha `check` nem gate de taxa.
  it('template literais iniciados por ${BASE_URL} são 100% ASCII na parte estática', () => {
    const violacoes = [];

    for (const script of todosOsScripts()) {
      const semComentarios = removerComentarios(lerScript(script));
      for (const template of urlsTemplate(semComentarios)) {
        const caracteresRuins = naoAscii(parteEstatica(template));
        if (caracteresRuins.length > 0) {
          violacoes.push({
            script,
            template,
            caracteres: caracteresRuins.map(c => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase()})`),
          });
        }
      }
    }

    // Envelope com os detalhes: a falha aponta o script, a URL e o caractere.
    expect(violacoes).toEqual([]);
  });
});

describe('suíte k6 — scripts que esperam 4xx por desenho não declaram http_req_failed', () => {
  // `http_req_failed` conta respostas fora de 200–399. Um script cujo
  // DESENHO espera 4xx (segurança, recuperação, validação) recebe esse gate
  // ~100% mesmo com a proteção funcionando — o threshold reprovaria tudo.
  const SCRIPTS_4XX_ESPERADO = [
    'security/ddos-search-test.js',
    'security/ip-spoofing-test.js',
    'security/login-negative-test.js',
    'security/rate-limit-test.js',
    'functional/recovery-test.js',
    'functional/video-validation-test.js',
  ];

  it('cada arquivo da lista de 4xx existe na suíte', () => {
    // Tripwire do teste abaixo: se o arquivo sumir/renomear, a asserção de
    // "não declara" passaria por vazio — aqui a ausência reprova.
    for (const relativo of SCRIPTS_4XX_ESPERADO) {
      expect(fs.existsSync(path.join(DIR_LOAD_TESTS, relativo))).toBe(true);
    }
  });

  it('nenhum desses scripts declara http_req_failed (comentários ignorados)', () => {
    for (const relativo of SCRIPTS_4XX_ESPERADO) {
      const semComentarios = removerComentarios(lerScript(relativo));
      // Envelope por arquivo: a falha aponta o script culpado.
      expect({ script: relativo, temGate: semComentarios.includes('http_req_failed') }).toEqual({
        script: relativo,
        temGate: false,
      });
    }
  });
});

describe('suíte k6 — lacunas de cobertura fechadas têm check de status', () => {
  /**
   * Um `it` por script, com o marcador próprio do seu warm-up/teardown.
   *
   * Os regexes COUBREAM o `check(` ao nome do check (ex.:
   * `check(nomeVariavel, { 'Warm-up ...`), porque um simples `contains` de
   * `'Warm-up` + `check(` passaria mesmo sem o check: o `console.log` do
   * warm-up contém `'Warm-up` e o fluxo principal do script já tem `check(`.
   * Com o acoplamento, remover o `check` reprova o teste exatamente como
   * exige a prova de mutação.
   */
  const LACUNAS = [
    {
      script: 'performance/musicas-search-test.js',
      padroes: [
        /check\(\s*\w+\s*,\s*\{\s*'Warm-up \(busca inicial\): status é 200'/,
        /check\(\s*\w+\s*,\s*\{\s*'Warm-up \(busca de controle\): status é 200'/,
      ],
    },
    {
      script: 'functional/search-content-test.js',
      padroes: [
        /check\(\s*\w+\s*,\s*\{\s*'Warm-up \(Deus\): status é 200'/,
        /check\(\s*\w+\s*,\s*\{\s*'Warm-up \(Jesus\): status é 200'/,
        /check\(\s*\w+\s*,\s*\{\s*'Warm-up \(amor\): status é 200'/,
      ],
    },
    {
      script: 'performance/musicas-crud-test.js',
      padroes: [
        /check\(\s*\w+\s*,\s*\{\s*'Teardown \(listagem de músicas K6\): status é 200'/,
        /check\(\s*http\.del/,
        /'Teardown \(delete de música K6\): status é 200 ou 404'/,
      ],
    },
    {
      script: 'performance/videos-crud-test.js',
      padroes: [
        /check\(\s*\w+\s*,\s*\{\s*'Teardown \(listagem de vídeos K6\): status é 200'/,
        /check\(\s*http\.del/,
        /'Teardown \(delete de vídeo K6\): status é 200 ou 404'/,
      ],
    },
  ];

  for (const lacuna of LACUNAS) {
    it(`${lacuna.script} tem check de status no warm-up/teardown`, () => {
      const semComentarios = removerComentarios(lerScript(lacuna.script));

      for (const padrao of lacuna.padroes) {
        // Envelope com o padrão: a falha mostra qual marcador falta.
        expect({ script: lacuna.script, marcador: String(padrao), encontrado: padrao.test(semComentarios) }).toEqual({
          script: lacuna.script,
          marcador: String(padrao),
          encontrado: true,
        });
      }
    });
  }
});

describe('posts-tags-test.js — o único script que precisa de gate de taxa', () => {
  // Com `checks: ['rate>0.80']` e 3 checks por requisição, uma resposta 500
  // derruba só 1 dos 3 checks ('Retornou lista de posts' cai no fallback [],
  // que é Array.isArray → passa): até 2 das 5 requisições (40%) podiam falhar
  // com a execução ainda aprovada. `rate<0.20` reprova já na primeira falha
  // (1/5 = 20%).
  it('declara http_req_failed com rate<0.20', () => {
    const semComentarios = removerComentarios(lerScript('functional/posts-tags-test.js'));

    expect(semComentarios).toMatch(/http_req_failed:\s*\[\s*'rate<0\.20'\s*\]/);
  });
});

describe('load-tests/helpers/profiles.js — quem declara http_req_failed', () => {
  // `http_req_failed` é gate de taxa de respostas fora de 200–399. Os perfis
  // `light` (busca 200 por desenho), `recovery` e `rateLimit` (thresholds
  // vazios por desenho) não podem declará-lo; medium/heavy/health podem.
  it('light, recovery e rateLimit NÃO declaram http_req_failed', () => {
    for (const nome of ['light', 'recovery', 'rateLimit']) {
      expect({ perfil: nome, temGate: 'http_req_failed' in PROFILES[nome].thresholds }).toEqual({
        perfil: nome,
        temGate: false,
      });
    }
  });

  it('medium, heavy e health DECLARAM http_req_failed', () => {
    for (const nome of ['medium', 'heavy', 'health']) {
      expect({ perfil: nome, temGate: 'http_req_failed' in PROFILES[nome].thresholds }).toEqual({
        perfil: nome,
        temGate: true,
      });
    }
  });
});

describe('suíte k6 — inventário', () => {
  it('tem exatamente 30 scripts (tripwire da auditoria do item AD)', () => {
    // Se alguém adicionar ou remover um script, a auditoria de gates do item
    // AD precisa ser refeita — e o número atualizado aqui, de propósito.
    const scripts = todosOsScripts();

    expect(scripts).toHaveLength(30);
  });
});
