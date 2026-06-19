import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import babelParser from "@babel/eslint-parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignorar diretórios gerados e artefatos de build
  { ignores: [".next/**", "out/**", "build/**", "reports/**", "coverage/**", "cypress/videos/**", "cypress/screenshots/**", "data/**", "public/uploads/**"] },

  // JavaScript padrão (browser + node) - parser padrão
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} } },

  // JSX (arquivos React) + testes com JSX - usa Babel parser
  { files: ["**/*.jsx"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node}, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: ["@babel/preset-react"] } } }, rules: { "react/prop-types": "off" } },

  // Arquivos de teste (Jest globals + JSX via Babel)
  { files: ["**/*.test.{js,jsx,mjs}", "**/__tests__/**/*.{js,jsx,mjs}", "tests/**/*.test.{js,jsx,mjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { ...globals.jest, ...globals.browser }, parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: ["@babel/preset-react"] } } }, rules: { "no-unused-vars": "warn", "react/prop-types": "off" } },

  // JSON
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

  // Markdown
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },

  // CSS
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
