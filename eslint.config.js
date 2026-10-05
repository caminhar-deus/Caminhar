import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import cypress from "eslint-plugin-cypress";
import babelParser from "@babel/eslint-parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignorar diretórios gerados e artefatos de build
  { ignores: [".next/**", "out/**", "build/**", "reports/**", "coverage/**", "coverage-db/**", "cypress/videos/**", "cypress/screenshots/**", "data/**", "public/uploads/**", ".agents/**", ".opencode/skills/**", "docs/**", "package-lock.json"] },

  // JavaScript padrão (browser + node) - parser padrão
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} }, rules: { "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] } },

  // Cypress (arquivos de teste E2E e suporte)
  {
    files: ["cypress/**/*.js"],
    plugins: { js, cypress },
    languageOptions: {
      globals: {
        ...globals.browser,
        cy: "readonly",
        Cypress: "readonly",
        describe: "readonly",
        context: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        it: "readonly",
        expect: "readonly",
        assert: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      ...cypress.configs.recommended.rules,
    },
  },

  // JSX (arquivos .jsx e .js em diretórios que usam JSX)
  { files: ["**/*.jsx", "components/**/*.js", "pages/**/*.js", "hooks/**/*.js", "examples/**/*.js", "tests/helpers/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.jest, ...globals.browser, ...globals.node, gtag: "readonly"}, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: [["@babel/preset-react", { runtime: "automatic" }]] } } }, rules: { "no-unused-vars": ["warn", { "varsIgnorePattern": "^[A-Z]", "args": "none" }] } },

  // Test setup, matchers e mocks (usam jest/expect mas não são .test.js nem helpers)
  { files: ["tests/setup.js", "tests/setup.db.js", "tests/matchers/**/*.js", "tests/mocks/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.jest, ...globals.browser, ...globals.node} }, rules: { "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] } },

  // Arquivos de teste (Jest globals + JSX via Babel)
  { files: ["**/*.test.{js,jsx,mjs}", "**/__tests__/**/*.{js,jsx,mjs}", "tests/**/*.test.{js,jsx,mjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { ...globals.jest, ...globals.browser }, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: [["@babel/preset-react", { runtime: "automatic" }]] } } }, rules: { "no-unused-vars": ["warn", { "varsIgnorePattern": "^[A-Z]", "args": "none" }] } },

  // k6 Load Tests (globais nativas do k6: __ENV, __ITER, __VU)
  { files: ["load-tests/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { __ENV: "readonly", __ITER: "readonly", __VU: "readonly" } }, rules: { "no-unused-vars": ["warn", { caughtErrors: "none" }] } },

  // JSON
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },

  // Config do oh-my-opencode-slim: apesar da extensão `.json`, os arquivos são
  // JSONC — o cabeçalho de `oh-my-opencode-slim.json` declara "Arquivo .json
  // aceita comentários (JSONC). Valide com: oh-my-opencode-slim doctor". Sem
  // este override, o bloco `**/*.json` aplica `json/json`, que proíbe
  // comentários, e o arquivo falha no parse.
  //
  // O padrão é `**` e não o nome de um arquivo: o contrato do slim é "`.json`
  // aceita comentários" para TUDO em `.opencode/`, então um override por
  // arquivo só empurraria o mesmo erro para o próximo `.json` criado ali.
  // Verificado: um `.opencode/qualquer.json` com `//` falhava no parse antes
  // deste override.
  //
  // Custo de ser leniente: `json/jsonc` aceita estritamente mais que
  // `json/json`, então um `.json` aqui que deveria ser estrito passa a tolerar
  // comentário. Desprezível, e as regras do `json/recommended` continuam valendo.
  // `.opencode/skills/**` não é afetado: está em `ignores`, que tem precedência.
  { files: [".opencode/**/*.json"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },

  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

  // Markdown
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },

  // `markdown/no-missing-label-refs` é falso positivo para task-list do GFM:
  // `- [ ] item` e `- [x] item` são lidos como link de referência com rótulo
  // vazio (`''` / `'x'`), gerando "Label reference '' not found" em CADA item de
  // checklist. Comprovado: um arquivo de 6 linhas com 2 checkboxes e 1 cerca de
  // código sem linguagem produz 3 erros, sendo 2 deles desse falso positivo.
  //
  // A regra não tem como ser contornada por configuração — o único option
  // aceito é `allowLabels`, que não afeta a interpretação de task-list. Como
  // checklist é formato comum em README/CHANGELOG, a regra não é utilizável
  // aqui: desligada, perde-se a detecção de referência de link quebrada em
  // docs, concessão aceita (nenhum `.md` fora de `.opencode/` usa hoje).
  //
  // `markdown/fenced-code-language` foi MANTIDA: não é falso positivo, é
  // apenas estrita, e satisfaz-la é trivial ( ```text ). Manter
  // `markdown/no-multiple-h1` também: é regra de estrutura de documento válida.
  { files: ["**/*.md"], rules: { "markdown/no-missing-label-refs": "off" } },

  // CSS
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"], rules: { "css/no-invalid-properties": "off" } },
]);