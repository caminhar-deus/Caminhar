/**
 * Higiene de design e CSS — invariantes globais de tokens, estilos inline,
 * foco acessível duplo, restauração de outline e contraste WCAG AA.
 *
 * Evolução (DS-01..DS-07 / PR-01 / PR-05):
 * - Cobre todos os arquivos `.css` do repositório contra `pages/styles/variables.css`.
 * - Varre todos os `.js`/`.jsx` em `pages/` (exceto `pages/api/`) e `components/`
 *   contra `style={{` com baseline congelada para usos dinâmicos/legados.
 * - Exige anel de foco duplo (`outline` + `box-shadow: var(--color-focus-ring)`)
 *   em todos os `.css` do repositório (com exceções de erro/variante auditadas).
 * - Garante que nenhum `outline: none`/`0` em seletor base fique sem restauração
 *   de foco no mesmo arquivo.
 * - Bloqueia regressões de `--color-text-tertiary` fora de placeholders, estados
 *   desabilitados, ícones puramente decorativos e fundo escuro.
 * - Valida contraste WCAG AA (>= 4,5:1) nos botões de marketplace, botões de
 *   compartilhamento do blog e nas 8 barras do gráfico em `AdminDashboard.js`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';

const RAIZ_PROJETO = process.cwd();
const DIRETORIOS_IGNORADOS = new Set(['node_modules', '.next', 'coverage', '.git']);

/**
 * Variáveis dinâmicas injetadas via prop `style` pelos componentes de layout,
 * todas com fallback no CSS Module correspondente.
 */
const VARIAVEIS_DINAMICAS_PERMITIDAS = {
  'components/Layout/Grid.module.css': new Set([
    '--cols-default',
    '--cols-sm',
    '--cols-md',
    '--cols-lg',
    '--cols-xl',
    '--min-width',
  ]),
  'components/Layout/Sidebar.module.css': new Set(['--main-margin']),
};

/**
 * Baseline congelada de `style={{` em JSX fora de `pages/api/`.
 * Arquivos saneados (`AdminSales.js`, `checkout/[id].js`, `blog/[slug].js`, `404.js`)
 * e qualquer novo arquivo DEVEM permanecer com 0 ocorrências.
 * Reduções abaixo do teto são aceitas (e devem reduzir este baseline).
 */
const BASELINE_STYLE_INLINE = {
  'components/Admin/AdminAudit.js': 4,
  'components/Admin/AdminCategories.js': 2,
  'components/Admin/AdminDashboard.js': 1,
  'components/Admin/AdminPosts.js': 3,
  'components/Admin/AdminRolesTab.js': 1,
  'components/Admin/CrudForm.js': 1,
  'components/Admin/CrudTable.js': 4,
  'components/Admin/fields/ExternalDataButton.js': 1,
  'components/Features/Products/ProductCard.js': 1,
  'components/Layout/Grid.js': 2,
  'components/Layout/Sidebar.js': 2,
  'components/Performance/ImageOptimized.js': 3,
  'components/Performance/LazyIframe.js': 5,
  'components/UI/Button.js': 1,
  'components/UI/Input.js': 1,
  'components/UI/Select.js': 1,
  'components/UI/TextArea.js': 1,
  'components/UI/Toast.js': 1,
};

/**
 * Exceções auditadas de foco duplo:
 * - 'error-focus': campos em estado inválido usam `--color-error-500` em vez de azul primário.
 * - 'variant-override': modificadores ou combinadores que herdam ou decoram a regra base.
 */
const EXCECOES_FOCO_DUPLO = new Map([
  ["components/Admin/fields/DateTimeBRField.module.css|.field[aria-invalid='true']:focus-visible", 'error-focus'],
  ['components/Admin/styles/form.module.css|.selectError:focus-visible', 'error-focus'],
  ['components/UI/Input.module.css|.hasError .input:focus', 'error-focus'],
  ['components/UI/Select.module.css|.hasError .select:focus', 'error-focus'],
  ['components/UI/TextArea.module.css|.hasError .textarea:focus', 'error-focus'],
  ['pages/styles/Login.module.css|.inputInvalid:focus', 'error-focus'],
  ['components/UI/Input.module.css|.filled:focus', 'variant-override'],
  ['components/UI/Input.module.css|.flushed:focus', 'variant-override'],
  ['components/UI/Select.module.css|.select:focus + .arrow', 'variant-override'],
]);

/**
 * Input interno de Select pesquisável cujo anel de foco é exibido no
 * contêiner pai `.selectFocused` (anéis duplos azul em Select.module.css).
 */
const EXCECOES_BASE_OUTLINE_NONE = new Set([
  'components/UI/Select.module.css|.searchInput',
]);

/**
 * Usos explicitamente permitidos de `color: var(--color-text-tertiary)` fora de
 * `::placeholder` e `:disabled` (ícones puramente decorativos, texto sobre fundo
 * escuro com contraste >= 4,5:1 ou âncoras vigiadas pelo canário do bench).
 */
const EXCECOES_TEXT_TERTIARY = new Set([
  'components/Admin/styles/AdminSales.module.css|.searchIcon',
  'components/Admin/styles/crud.module.css|.searchIcon',
  'components/Admin/styles/crud.module.css|.dragHandleCell',
  'components/Admin/styles/misc.module.css|.dashedEmptyIcon',
  'components/Features/Music/styles/MusicGallery.module.css|.noResultsIcon',
  'components/Features/Video/styles/VideoGallery.module.css|.noResultsIcon',
  'components/UI/Select.module.css|.arrow',
  'pages/styles/DesignSystem.module.css|.footer',
  'components/UI/Input.module.css|.leftAddon',
  'components/UI/Input.module.css|.rightAddon',
  'components/UI/BaseCard.module.css|.headerSubtitle',
]);

const RE_SELETOR_TERTIARY_PERMITIDO =
  /::placeholder\b|:disabled\b|\.pageButtonDisabled\b|\.soldOutButton\b|\.optionDisabled\b|\.disabled\s+\.arrow\b|\.placeholder\b/;

function caminhoRelativo(caminhoAbsoluto) {
  return path.relative(RAIZ_PROJETO, caminhoAbsoluto).split(path.sep).join('/');
}

function listarArquivosPorExtensao(dir, extensoes, ignorarSubcaminhos = new Set(), acumulados = []) {
  if (!fs.existsSync(dir)) return acumulados;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (DIRETORIOS_IGNORADOS.has(entrada.name)) continue;
    const completo = path.join(dir, entrada.name);
    const rel = caminhoRelativo(completo);
    if (ignorarSubcaminhos.has(rel)) continue;
    if (entrada.isDirectory()) {
      listarArquivosPorExtensao(completo, extensoes, ignorarSubcaminhos, acumulados);
    } else if (entrada.isFile() && extensoes.some((ext) => entrada.name.endsWith(ext))) {
      acumulados.push(completo);
    }
  }
  return acumulados.sort();
}

function listarArquivosCss(dir = RAIZ_PROJETO) {
  return listarArquivosPorExtensao(dir, ['.css']);
}

function extrairDefinicoesTokens(conteudoCss) {
  const mapa = new Map();
  const reDefinicao = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  for (const match of conteudoCss.matchAll(reDefinicao)) {
    mapa.set(match[1], match[2].trim());
  }
  return mapa;
}

function detectarTokensAusentes(conteudoCss, arquivoRelativo, tokensGlobais) {
  const tokensLocais = new Set(extrairDefinicoesTokens(conteudoCss).keys());
  const dinamicos = VARIAVEIS_DINAMICAS_PERMITIDAS[arquivoRelativo] || new Set();
  const violacoes = [];

  conteudoCss.split(/\r?\n/).forEach((linha, indice) => {
    for (const match of linha.matchAll(/var\((--[a-zA-Z0-9_-]+)/g)) {
      const token = match[1];
      if (!tokensGlobais.has(token) && !tokensLocais.has(token) && !dinamicos.has(token)) {
        violacoes.push({
          arquivo: arquivoRelativo,
          linha: indice + 1,
          token,
        });
      }
    }
  });

  return violacoes;
}

function detectarStyleInlineConteudo(conteudoJs, arquivoRelativo, baselinePermitida) {
  const ocorrencias = [];
  conteudoJs.split(/\r?\n/).forEach((linha) => {
    if (linha.includes('style={{')) {
      ocorrencias.push(linha);
    }
  });
  const teto = Object.prototype.hasOwnProperty.call(baselinePermitida, arquivoRelativo)
    ? baselinePermitida[arquivoRelativo]
    : 0;
  if (ocorrencias.length > teto) {
    return [{
      arquivo: arquivoRelativo,
      encontrado: ocorrencias.length,
      permitido: teto,
    }];
  }
  return [];
}

function normalizarHex(valor, tokensGlobais) {
  let atual = valor.trim();
  const varMatch = /^var\((--[a-zA-Z0-9_-]+)\)$/.exec(atual);
  if (varMatch) {
    atual = tokensGlobais.get(varMatch[1]) || '';
  }
  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(atual);
  if (!hexMatch) {
    throw new Error(`Cor não resolvida para hex: "${valor}" -> "${atual}"`);
  }
  const raw = hexMatch[1];
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }
  return `#${raw}`.toLowerCase();
}

function luminanciaRelativa(hex) {
  const limpo = hex.replace('#', '');
  const canais = [0, 2, 4].map((offset) => {
    const srgb = Number.parseInt(limpo.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function razaoContraste(hexA, hexB) {
  const lumA = luminanciaRelativa(hexA);
  const lumB = luminanciaRelativa(hexB);
  const maior = Math.max(lumA, lumB);
  const menor = Math.min(lumA, lumB);
  return (maior + 0.05) / (menor + 0.05);
}

function extrairBlocosCss(conteudoCss) {
  const semComentarios = conteudoCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocos = [];
  for (const match of semComentarios.matchAll(/([^{}@]+)\{([^{}]+)\}/g)) {
    blocos.push({
      seletor: match[1].trim().replace(/\s+/g, ' '),
      corpo: match[2].trim().replace(/\s+/g, ' '),
    });
  }
  return blocos;
}

function extrairBlocosFocus(conteudoCss) {
  return extrairBlocosCss(conteudoCss).filter((bloco) => /:focus(?:-visible)?\b/.test(bloco.seletor));
}

function detectarFocusSemOutline(conteudoCss, arquivoRelativo) {
  const violacoes = [];
  for (const bloco of extrairBlocosFocus(conteudoCss)) {
    if (/\boutline\s*:\s*(?:none|0)\b/i.test(bloco.corpo)) {
      violacoes.push({
        arquivo: arquivoRelativo,
        seletor: bloco.seletor,
      });
    }
  }
  return violacoes;
}

function detectarBaseOutlineSemRestauracao(conteudoCss, arquivoRelativo) {
  const blocos = extrairBlocosCss(conteudoCss);
  const seletoresFocusComOutline = blocos
    .filter(
      (b) =>
        /:focus(?:-visible)?\b/.test(b.seletor) &&
        /\boutline\s*:/i.test(b.corpo) &&
        !/\boutline\s*:\s*(?:none|0)\b/i.test(b.corpo)
    )
    .map((b) => b.seletor);

  const violacoes = [];
  for (const bloco of blocos) {
    if (/:focus(?:-visible)?\b/.test(bloco.seletor)) continue;
    if (!/\boutline\s*:\s*(?:none|0)\b/i.test(bloco.corpo)) continue;

    for (const parte of bloco.seletor.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (EXCECOES_BASE_OUTLINE_NONE.has(`${arquivoRelativo}|${parte}`)) continue;

      const classePrincipal = parte.match(/\.[a-zA-Z0-9_-]+/)?.[0] || parte;
      const restaurado = seletoresFocusComOutline.some((selFocus) =>
        selFocus.includes(classePrincipal)
      );
      if (!restaurado) {
        violacoes.push({ arquivo: arquivoRelativo, seletor: parte });
      }
    }
  }
  return violacoes;
}

function detectarFocoDuploAusente(conteudoCss, arquivoRelativo) {
  const violacoes = [];
  for (const bloco of extrairBlocosFocus(conteudoCss)) {
    const chave = `${arquivoRelativo}|${bloco.seletor}`;
    const tipoExcecao = EXCECOES_FOCO_DUPLO.get(chave);
    if (tipoExcecao === 'variant-override') continue;
    if (tipoExcecao === 'error-focus') {
      if (!/outline:\s*2px solid var\(--color-error-500\)/.test(bloco.corpo)) {
        violacoes.push({ arquivo: arquivoRelativo, seletor: bloco.seletor, motivo: 'error-focus sem outline error-500' });
      }
      continue;
    }

    const temOutline = /outline:\s*2px solid var\(--color-focus-primary\)/.test(bloco.corpo);
    const temHalo = /box-shadow:\s*[^;]*var\(--color-focus-ring\)/.test(bloco.corpo);
    if (!temOutline || !temHalo) {
      violacoes.push({
        arquivo: arquivoRelativo,
        seletor: bloco.seletor,
        temOutline,
        temHalo,
      });
    }
  }
  return violacoes;
}

function verificarContrasteClasseCss(conteudoCss, seletores, tokensGlobais, fundoHexFallback = null) {
  for (const seletor of seletores) {
    const escaped = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bloco = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(conteudoCss);
    expect(bloco).not.toBeNull();

    const bgMatch = /background-color:\s*([^;]+);/.exec(bloco[1]);
    const fgMatch = /(?:^|[^-])color:\s*([^;]+);/m.exec(bloco[1]);
    expect(fgMatch).not.toBeNull();
    const bgHex = bgMatch ? normalizarHex(bgMatch[1], tokensGlobais) : fundoHexFallback;
    const fgHex = normalizarHex(fgMatch[1], tokensGlobais);
    expect(razaoContraste(fgHex, bgHex)).toBeGreaterThanOrEqual(4.5);
  }
}

function detectarTextoTerciarioIndevido(conteudoCss, arquivoRelativo) {
  if (arquivoRelativo === 'pages/styles/variables.css') return [];
  const violacoes = [];

  for (const bloco of extrairBlocosCss(conteudoCss)) {
    if (!/(?:^|[;\s])color\s*:\s*var\(--color-text-tertiary\b/.test(bloco.corpo)) continue;

    for (const parte of bloco.seletor.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (RE_SELETOR_TERTIARY_PERMITIDO.test(parte)) continue;
      if (EXCECOES_TEXT_TERTIARY.has(`${arquivoRelativo}|${parte}`)) continue;
      violacoes.push({ arquivo: arquivoRelativo, seletor: parte });
    }
  }
  return violacoes;
}

describe('Higiene de CSS e Design System', () => {
  const variablesPath = path.join(RAIZ_PROJETO, 'pages/styles/variables.css');
  const variablesCss = fs.readFileSync(variablesPath, 'utf8');
  const tokensGlobais = extrairDefinicoesTokens(variablesCss);

  it('garante que todos os tokens var(--*) em todos os arquivos .css existem em variables.css ou localmente', () => {
    const arquivosCss = listarArquivosCss();
    expect(arquivosCss.length).toBeGreaterThanOrEqual(45);

    const todasViolacoes = [];
    for (const arquivoAbs of arquivosCss) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      todasViolacoes.push(...detectarTokensAusentes(conteudo, rel, tokensGlobais));
    }

    expect(todasViolacoes).toEqual([]);
  });

  it('sanidade do detector: reprova token inexistente e aceita token global ou local', () => {
    const cssInvalido = '.box {\n  border: 1px solid var(--token-inexistente-999);\n}\n';
    expect(detectarTokensAusentes(cssInvalido, 'exemplo.module.css', tokensGlobais)).toEqual([
      { arquivo: 'exemplo.module.css', linha: 2, token: '--token-inexistente-999' },
    ]);

    const cssValido = '.box {\n  --local-gap: 8px;\n  gap: var(--local-gap);\n  color: var(--color-text-primary);\n}\n';
    expect(detectarTokensAusentes(cssValido, 'exemplo.module.css', tokensGlobais)).toEqual([]);
  });

  it('garante política global contra regressão de estilo inline (style={{) em pages/ e components/', () => {
    const ignorar = new Set(['pages/api']);
    const arquivosJs = [
      ...listarArquivosPorExtensao(path.join(RAIZ_PROJETO, 'pages'), ['.js', '.jsx'], ignorar),
      ...listarArquivosPorExtensao(path.join(RAIZ_PROJETO, 'components'), ['.js', '.jsx'], ignorar),
    ];

    const arquivosZeroObrigatorio = [
      'components/Admin/AdminSales.js',
      'components/Admin/Managers/CacheManager.js',
      'components/Features/Blog/BlogSection.js',
      'components/Features/Blog/PostCard.js',
      'components/Features/Music/MusicCard.js',
      'components/Features/Testimonials/index.js',
      'components/Features/Video/VideoCard.js',
      'components/UI/StateMessages.js',
      'pages/checkout/[id].js',
      'pages/blog/[slug].js',
      'pages/404.js',
    ];
    for (const relZero of arquivosZeroObrigatorio) {
      expect(Object.prototype.hasOwnProperty.call(BASELINE_STYLE_INLINE, relZero)).toBe(false);
    }

    const violacoes = [];
    for (const arquivoAbs of arquivosJs) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      violacoes.push(...detectarStyleInlineConteudo(conteudo, rel, BASELINE_STYLE_INLINE));
    }
    expect(violacoes).toEqual([]);

    // Sanidade do detector
    expect(
      detectarStyleInlineConteudo('<div style={{ color: "red" }} />', 'pages/nova-pagina.js', BASELINE_STYLE_INLINE)
    ).toEqual([{ arquivo: 'pages/nova-pagina.js', encontrado: 1, permitido: 0 }]);
  });

  it('garante contraste WCAG AA (>= 4.5:1) nos botões de marketplace em ProductCard.module.css', () => {
    const productCardCss = fs.readFileSync(
      path.join(RAIZ_PROJETO, 'components/Features/Products/styles/ProductCard.module.css'),
      'utf8'
    );
    verificarContrasteClasseCss(productCardCss, ['.linkMercadoLivre', '.linkShopee', '.linkAmazon'], tokensGlobais);
  });

  it('garante contraste WCAG AA (>= 4.5:1) nos botões de compartilhamento e data em pages/blog/Blog.module.css', () => {
    const blogCss = fs.readFileSync(
      path.join(RAIZ_PROJETO, 'pages/blog/Blog.module.css'),
      'utf8'
    );
    verificarContrasteClasseCss(
      blogCss,
      ['.shareFacebook', '.shareWhatsapp', '.shareInstagram'],
      tokensGlobais
    );
    verificarContrasteClasseCss(
      blogCss,
      ['.postDate'],
      tokensGlobais,
      normalizarHex('var(--color-bg-secondary)', tokensGlobais)
    );
  });

  it('garante contraste WCAG AA (>= 4.5:1) nas 8 barras de Distribuição de Conteúdo em AdminDashboard.js', () => {
    const dashboardJs = fs.readFileSync(
      path.join(RAIZ_PROJETO, 'components/Admin/AdminDashboard.js'),
      'utf8'
    );
    const coresBarras = [...dashboardJs.matchAll(/color:\s*['"](var\(--[a-zA-Z0-9_-]+\))['"]/g)].map(
      (m) => m[1]
    );
    expect(coresBarras).toHaveLength(8);

    const textoHex = normalizarHex('var(--color-text-inverse)', tokensGlobais);
    for (const corToken of coresBarras) {
      const fundoHex = normalizarHex(corToken, tokensGlobais);
      expect(razaoContraste(textoHex, fundoHex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('proíbe outline: none ou outline: 0 dentro de seletores :focus / :focus-visible em todos os .css', () => {
    const arquivosCss = listarArquivosCss();
    expect(arquivosCss.length).toBeGreaterThanOrEqual(45);

    const violacoes = [];
    for (const arquivoAbs of arquivosCss) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      violacoes.push(...detectarFocusSemOutline(conteudo, rel));
    }

    expect(violacoes).toEqual([]);

    // Sanidade do detector
    const cssInvalido = '.btn:focus-visible { outline: none; }';
    expect(detectarFocusSemOutline(cssInvalido, 'exemplo.module.css')).toEqual([
      { arquivo: 'exemplo.module.css', seletor: '.btn:focus-visible' },
    ]);

    const cssValido = '.btn:focus-visible { outline: 2px solid var(--color-focus-primary); box-shadow: var(--color-focus-ring); }';
    expect(detectarFocusSemOutline(cssValido, 'exemplo.module.css')).toEqual([]);
  });

  it('exige restauração de foco no mesmo arquivo para qualquer seletor base com outline: none ou outline: 0', () => {
    const arquivosCss = listarArquivosCss();
    const violacoes = [];

    for (const arquivoAbs of arquivosCss) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      violacoes.push(...detectarBaseOutlineSemRestauracao(conteudo, rel));
    }

    expect(violacoes).toEqual([]);

    // Sanidade do detector
    expect(
      detectarBaseOutlineSemRestauracao('.campo { outline: none; }', 'exemplo.module.css')
    ).toEqual([{ arquivo: 'exemplo.module.css', seletor: '.campo' }]);

    expect(
      detectarBaseOutlineSemRestauracao(
        '.campo { outline: none; }\n.campo:focus-visible { outline: 2px solid var(--color-focus-primary); box-shadow: var(--color-focus-ring); }',
        'exemplo.module.css'
      )
    ).toEqual([]);
  });

  it('garante par de foco duplo (outline + halo) em TODOS os arquivos .css do repositório', () => {
    const arquivosCss = listarArquivosCss();
    expect(arquivosCss.length).toBeGreaterThanOrEqual(45);

    const violacoes = [];
    let totalBlocosFocus = 0;

    for (const arquivoAbs of arquivosCss) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      totalBlocosFocus += extrairBlocosFocus(conteudo).length;
      violacoes.push(...detectarFocoDuploAusente(conteudo, rel));
    }

    expect(totalBlocosFocus).toBeGreaterThan(20);
    expect(violacoes).toEqual([]);

    // Sanidade do detector
    const cssSemHalo = '.btn:focus-visible { outline: 2px solid var(--color-focus-primary); }';
    expect(detectarFocoDuploAusente(cssSemHalo, 'exemplo.module.css')).toEqual([
      {
        arquivo: 'exemplo.module.css',
        seletor: '.btn:focus-visible',
        temOutline: true,
        temHalo: false,
      },
    ]);
  });

  it('proíbe --color-text-tertiary em textos informativos e controles ativos fora de placeholders/desabilitados', () => {
    const arquivosCss = listarArquivosCss();
    const violacoes = [];

    for (const arquivoAbs of arquivosCss) {
      const rel = caminhoRelativo(arquivoAbs);
      const conteudo = fs.readFileSync(arquivoAbs, 'utf8');
      violacoes.push(...detectarTextoTerciarioIndevido(conteudo, rel));
    }

    expect(violacoes).toEqual([]);

    // Sanidade do detector
    expect(
      detectarTextoTerciarioIndevido('.legenda { color: var(--color-text-tertiary); }', 'exemplo.module.css')
    ).toEqual([{ arquivo: 'exemplo.module.css', seletor: '.legenda' }]);

    expect(
      detectarTextoTerciarioIndevido(
        '.campo::placeholder { color: var(--color-text-tertiary); }\n.btn:disabled { color: var(--color-text-tertiary); }',
        'exemplo.module.css'
      )
    ).toEqual([]);
  });

  it('garante guard global prefers-reduced-motion: reduce em pages/styles/globals.css', () => {
    const globalsCss = fs.readFileSync(path.join(RAIZ_PROJETO, 'pages/styles/globals.css'), 'utf8');
    const blocoMedia = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*)\}/.exec(globalsCss);

    expect(blocoMedia).not.toBeNull();
    expect(blocoMedia[1]).toMatch(/animation-duration:\s*0\.01ms/);
    expect(blocoMedia[1]).toMatch(/transition-duration:\s*0\.01ms/);
    expect(blocoMedia[1]).toMatch(/scroll-behavior:\s*auto/);
  });
});
