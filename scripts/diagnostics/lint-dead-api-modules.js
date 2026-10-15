#!/usr/bin/env node
/**
 * Detecta importadores de PRODUÇÃO dos 5 módulos mortos de `lib/api/`:
 * `index.js`, `middleware.js`, `response.js`, `errors.js` e `validate.js`.
 *
 * Motivo: esses módulos são código morto em quarentena — nenhum importador em
 * produção; os únicos consumidores estão em `tests/**`, e a remoção deles é um
 * passo futuro ainda em análise. Enquanto isso, um import novo em produção
 * reintroduziria o segundo `withAuth` incompatível (o morto de
 * `lib/api/middleware.js` é `withAuth({ roles })`; o vivo de
 * `lib/auth/auth.js` é `withAuth(handler)`). O `knip` não pega isso porque
 * `knip.json` ignora `tests/**` e import de arquivo ignorado ainda conta como
 * uso. Este script é o guard de CI dessa classe de defeito — ele SÓ reporta,
 * nunca corrige nem deleta nada.
 *
 * Ignora: `tests/**`, `coverage/`, `node_modules/`, `.next/` e os próprios
 * módulos mortos se importando entre si (a cadeia em quarentena é legítima
 * até o passo de remoção).
 *
 * Uso:
 *   npm run lint:dead-api
 *   node scripts/diagnostics/lint-dead-api-modules.js
 */
import fs from 'fs';
import path from 'path';

const RAIZ = process.cwd();

/** Os 5 módulos mortos, em caminho absoluto. */
const MODULOS_MORTOS = new Set(
  ['index.js', 'middleware.js', 'response.js', 'errors.js', 'validate.js'].map(
    (nome) => path.join(RAIZ, 'lib', 'api', nome)
  ),
);

const IGNORADOS = new Set([
  'node_modules', '.next', 'out', 'build', 'coverage', 'coverage-db',
  'reports', '.git',
  // Testes ainda importam os módulos mortos legitimamente: a remoção dos
  // módulos é passo futuro adiado. Mesmo precedente do guard
  // `no-restricted-imports` no eslint.config.js.
  'tests',
  'cypress/videos', 'cypress/screenshots',
]);

// Só código JS: importador de produção é arquivo JS (o .md/.yml do repo cita
// esses caminhos em prosa e documentação, que não é "uso").
const EXTENSOES = new Set(['.js', '.mjs', '.cjs', '.jsx']);

// Espécimes de módulo: `import ... from 'X'`, `export ... from 'X'`,
// `import('X')`, `require('X')` e side-effect `import 'X'`.
const RE_ESPECIFICADOR =
  /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g;

function* walk(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) yield* walk(completo);
    else if (EXTENSOES.has(path.extname(entrada.name))) yield completo;
  }
}

/**
 * Resolve um especificador de import para os candidatos de caminho absoluto
 * que o bundler aceitaria: o caminho literal, com `.js` anexado e como
 * import de diretório (`index.js`). Cobre relativos (`./`, `../`), o alias
 * `@/*` (jsconfig.json), o `baseUrl: "."` (bare `lib/api/x.js`) e absolutos.
 */
function candidatos(especificador, dirArquivo) {
  let base;
  if (especificador.startsWith('.')) base = path.resolve(dirArquivo, especificador);
  else if (especificador.startsWith('/')) base = path.normalize(especificador);
  else base = path.resolve(RAIZ, especificador.replace(/^@\//, ''));
  return [base, `${base}.js`, path.join(base, 'index.js')];
}

const achados = [];

for (const arquivo of walk(RAIZ)) {
  if (MODULOS_MORTOS.has(arquivo)) continue; // a cadeia morta entre si é permitida
  const relativo = path.relative(RAIZ, arquivo) || arquivo;
  const dirArquivo = path.dirname(arquivo);
  fs.readFileSync(arquivo, 'utf8').split('\n').forEach((linha, i) => {
    RE_ESPECIFICADOR.lastIndex = 0;
    for (const m of linha.matchAll(RE_ESPECIFICADOR)) {
      const especificador = m[1] ?? m[2] ?? m[3] ?? m[4];
      if (!especificador) continue;
      const alvo = candidatos(especificador, dirArquivo).find((c) => MODULOS_MORTOS.has(c));
      if (alvo) {
        achados.push({
          arquivo: relativo,
          linha: i + 1,
          especificador,
          modulo: path.relative(RAIZ, alvo),
          trecho: linha.trim().slice(0, 80),
        });
      }
    }
  });
}

if (achados.length === 0) {
  console.log('OK: nenhum importador de produção dos módulos mortos de lib/api/.');
  process.exitCode = 0;
} else {
  console.error(
    `ERRO: ${achados.length} importador(es) de produção de módulo morto de lib/api/:\n`
  );
  for (const a of achados) {
    console.error(`  ${a.arquivo}:${a.linha}  importa "${a.especificador}" → ${a.modulo}`);
    console.error(`      ${a.trecho}\n`);
  }
  console.error(
    'Módulos index.js, middleware.js, response.js, errors.js e validate.js de lib/api/\n' +
    'são código morto (quarentena): nenhum importador de produção é permitido. O `withAuth`\n' +
    'vivo está em lib/auth/auth.js (usado por lib/api/adminCrudHandler.js). Se você precisou\n' +
    'importar um desses módulos, revise o design; a remoção dos módulos é passo futuro.\n' +
    'Este script não corrige nada — ele só reporta.'
  );
  process.exitCode = 1;
}
