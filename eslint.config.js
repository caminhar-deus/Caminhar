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
  { ignores: [".next/**", "out/**", "build/**", "reports/**", "coverage/**", "cypress/videos/**", "cypress/screenshots/**", "data/**", "public/uploads/**", ".agents/**", "docs/**", "package-lock.json"] },

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
  { files: ["**/*.jsx", "components/**/*.js", "pages/**/*.js", "hooks/**/*.js", "examples/**/*.js", "tests/helpers/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.jest, ...globals.browser, ...globals.node, gtag: "readonly"}, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: [["@babel/preset-react", { runtime: "automatic" }]] } } }, rules: { "no-unused-vars": ["warn", { "varsIgnorePattern": "^[A-Z]", "args": "none" }], "react/prop-types": "off" } },

  // Test setup, matchers e mocks (usam jest/expect mas não são .test.js nem helpers)
  { files: ["tests/setup.js", "tests/setup.db.js", "tests/matchers/**/*.js", "tests/mocks/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.jest, ...globals.browser, ...globals.node} }, rules: { "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] } },

  // Arquivos de teste (Jest globals + JSX via Babel)
  { files: ["**/*.test.{js,jsx,mjs}", "**/__tests__/**/*.{js,jsx,mjs}", "tests/**/*.test.{js,jsx,mjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { ...globals.jest, ...globals.browser }, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: [["@babel/preset-react", { runtime: "automatic" }]] } } }, rules: { "no-unused-vars": ["warn", { "varsIgnorePattern": "^[A-Z]", "args": "none" }], "react/prop-types": "off" } },

  // k6 Load Tests (globais nativas do k6: __ENV, __ITER, __VU)
  { files: ["load-tests/**/*.js"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { __ENV: "readonly", __ITER: "readonly", __VU: "readonly" } }, rules: { "no-unused-vars": ["warn", { caughtErrors: "none" }] } },

  // JSON
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

  // Markdown
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },

  // CSS
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"], rules: { "css/no-invalid-properties": "off", "css/use-baseline": "off", "css/no-important": "off" } },
]);