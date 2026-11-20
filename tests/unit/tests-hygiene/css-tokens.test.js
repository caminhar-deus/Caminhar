/**
 * Higiene de design e CSS — invariantes de tokens, estilos inline e contraste.
 *
 * Por que este teste existe (DS-01 / PR-01 / DS-02 / DS-03):
 * - A passada de padrões anterior testava apenas `CustomerPages.module.css`,
 *   deixando 24 declarações com tokens inexistentes em `Home.module.css`,
 *   `ProductCard.module.css` e `AdminSales.module.css` sem detecção automática.
 * - Este invariante varre todos os `.css` do repositório contra
 *   `pages/styles/variables.css`, exige ausência de `style={{` nos arquivos
 *   auditados (`AdminSales.js` e `pages/checkout/[id].js`) e valida contraste
 *   WCAG AA (>= 4.5:1) dos botões de marketplace em `ProductCard.module.css`.
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

function caminhoRelativo(caminhoAbsoluto) {
  return path.relative(RAIZ_PROJETO, caminhoAbsoluto).split(path.sep).join('/');
}

function listarArquivosCss(dir = RAIZ_PROJETO, acumulados = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (DIRETORIOS_IGNORADOS.has(entrada.name)) continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      listarArquivosCss(completo, acumulados);
    } else if (entrada.isFile() && entrada.name.endsWith('.css')) {
      acumulados.push(completo);
    }
  }
  return acumulados.sort();
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

function extrairBlocosFocus(conteudoCss) {
  const semComentarios = conteudoCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocos = [];
  for (const match of semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const seletor = match[1].trim();
    if (/:focus(?:-visible)?\b/.test(seletor)) {
      blocos.push({ seletor, corpo: match[2] });
    }
  }
  return blocos;
}

function detectarFocusSemOutline(conteudoCss, arquivoRelativo) {
  const violacoes = [];
  for (const bloco of extrairBlocosFocus(conteudoCss)) {
    if (/\boutline\s*:\s*(?:none|0)\b/i.test(bloco.corpo)) {
      violacoes.push({
        arquivo: arquivoRelativo,
        seletor: bloco.seletor.replace(/\s+/g, ' '),
      });
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
    expect(arquivosCss.length).toBeGreaterThanOrEqual(40);

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

  it('garante ausência de estilo inline (style={{) em AdminSales.js e pages/checkout/[id].js', () => {
    const arquivosAuditados = [
      'components/Admin/AdminSales.js',
      'pages/checkout/[id].js',
    ];

    const ocorrencias = [];
    for (const rel of arquivosAuditados) {
      const conteudo = fs.readFileSync(path.join(RAIZ_PROJETO, rel), 'utf8');
      conteudo.split(/\r?\n/).forEach((linha, indice) => {
        if (linha.includes('style={{')) {
          ocorrencias.push({ arquivo: rel, linha: indice + 1 });
        }
      });
    }

    expect(ocorrencias).toEqual([]);
  });

  it('garante contraste WCAG AA (>= 4.5:1) nos botões de marketplace em ProductCard.module.css', () => {
    const productCardCss = fs.readFileSync(
      path.join(RAIZ_PROJETO, 'components/Features/Products/styles/ProductCard.module.css'),
      'utf8'
    );

    const seletores = ['.linkMercadoLivre', '.linkShopee', '.linkAmazon'];
    for (const seletor of seletores) {
      const escaped = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const bloco = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(productCardCss);
      expect(bloco).not.toBeNull();

      const bgMatch = /background-color:\s*([^;]+);/.exec(bloco[1]);
      const fgMatch = /(?:^|[^-])color:\s*([^;]+);/m.exec(bloco[1]);
      expect(bgMatch).not.toBeNull();
      expect(fgMatch).not.toBeNull();

      const bgHex = normalizarHex(bgMatch[1], tokensGlobais);
      const fgHex = normalizarHex(fgMatch[1], tokensGlobais);
      expect(razaoContraste(fgHex, bgHex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('proíbe outline: none ou outline: 0 dentro de seletores :focus / :focus-visible em todos os .css', () => {
    const arquivosCss = listarArquivosCss();
    expect(arquivosCss.length).toBeGreaterThanOrEqual(40);

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

  it('garante par de foco duplo (outline + halo) nos CSS Modules auditados', () => {
    const modulosAuditados = [
      'pages/styles/Home.module.css',
      'pages/styles/CustomerPages.module.css',
      'components/Features/Products/styles/ProductCard.module.css',
      'components/Admin/styles/AdminSales.module.css',
    ];

    for (const rel of modulosAuditados) {
      const conteudo = fs.readFileSync(path.join(RAIZ_PROJETO, rel), 'utf8');
      const blocos = extrairBlocosFocus(conteudo);
      expect(blocos.length).toBeGreaterThanOrEqual(1);

      for (const bloco of blocos) {
        expect(bloco.corpo).toMatch(/outline:\s*2px solid var\(--color-focus-primary\)/);
        expect(bloco.corpo).toMatch(/box-shadow:\s*var\(--color-focus-ring\)/);
      }
    }
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
