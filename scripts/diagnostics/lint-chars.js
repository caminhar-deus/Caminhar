#!/usr/bin/env node
/**
 * Detecta caracteres de escrita não-latina (CJK, cirílico, grego, árabe, etc.)
 * em arquivos de texto do repositório.
 *
 * Motivo: token corrompido em comentário e documentação não passa pelo
 * ESLint — que valida sintaxe, não texto — e só aparece na revisão visual.
 * Este script é o guard automatizado para essa classe de defeito.
 *
 * Acentuação portuguesa, emoji, tipografia e símbolos técnicos são legítimos e
 * não são reportados. Só é reportado o que não deveria aparecer.
 *
 * Uso:
 *   npm run lint:chars
 *   node scripts/diagnostics/lint-chars.js <arquivo> [...]
 */
import fs from 'fs';
import path from 'path';

const RAIZ = process.cwd();

const IGNORADOS = new Set([
  'node_modules', '.next', 'out', 'build', 'coverage', 'coverage-db',
  'reports', '.git', 'cypress/videos', 'cypress/screenshots',
  // Skills vendorizadas: contêm exemplos legítimos de RTL, cirílico e CJK como
  // parte do próprio conteúdo sobre i18n. Mesmo precedente do `ignores` do
  // eslint.config.js e do knip.json.
  '.opencode', '.agents',
]);

const EXTENSOES = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.json', '.jsonc', '.md', '.yml', '.yaml', '.css',
]);

/** Faixas legítimas: latim acentuado, tipografia, moeda, emoji e setas. */
const PERMITIDOS = [
  [0x00a0, 0x024f], // latim-1 e latim estendido (acentuação pt-BR)
  [0x2000, 0x206f], // pontuação tipográfica (— – … “ ” ‘ ’)
  [0x20a0, 0x20cf], // símbolos de moeda
  [0x20d0, 0x20ff], // marcas combinantes de símbolo (keycap de emoji)
  [0x2190, 0x2bff], // setas e símbolos matemáticos
  [0x1f000, 0x1faff], // emoji
  [0xfe00, 0xfe0f], // seletores de variação de emoji
];

/** Símbolo isolado aceito. U+FFFD fica de fora de propósito: é mojibake. */
const EXTRAS_PERMITIDOS = new Set(['§', '·', 'ª', 'º', 'ℓ', 'ℹ', '×', '÷']);

const ehPermitido = (cp, ch) =>
  PERMITIDOS.some(([ini, fim]) => cp >= ini && cp <= fim) || EXTRAS_PERMITIDOS.has(ch);

function* walk(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) yield* walk(completo);
    else if (EXTENSOES.has(path.extname(entrada.name))) yield completo;
  }
}

const alvos = process.argv.slice(2);
const arquivos = alvos.length ? alvos : [...walk(RAIZ)];
const achados = [];

for (const arquivo of arquivos) {
  if (!fs.existsSync(arquivo)) continue;
  const relativo = path.relative(RAIZ, arquivo) || arquivo;
  fs.readFileSync(arquivo, 'utf8').split('\n').forEach((linha, i) => {
    for (const ch of linha) {
      const cp = ch.codePointAt(0);
      if (cp < 128 || ehPermitido(cp, ch)) continue;
      achados.push({ ch, cp, linha: i + 1, arquivo: relativo, trecho: linha.trim().slice(0, 80) });
    }
  });
}

if (achados.length === 0) {
  console.log(`OK: nenhum caractere não-latina inesperado em ${arquivos.length} arquivo(s).`);
  process.exitCode = 0;
} else {
  console.error(`ERRO: ${achados.length} caractere(s) não-latina(s) inesperado(s):\n`);
  for (const a of achados) {
    const hex = `U+${a.cp.toString(16).toUpperCase().padStart(4, '0')}`;
    console.error(`  ${a.arquivo}:${a.linha}  ${hex}  "${a.ch}"`);
    console.error(`      ${a.trecho}\n`);
  }
  process.exitCode = 1;
}
