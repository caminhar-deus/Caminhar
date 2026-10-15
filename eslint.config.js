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

  // `cache` é o nome de uma variável de escopo do programa emitida pelo helper
  // `_interopRequireWildcard` do Babel 8 (o memo WeakMap de interop). Um
  // `import * as cache` compila para `var cache = _interopRequireWildcard(...)` e
  // sobrescreve essa variável pelo objeto namespace; a SEGUNDA importação namespace
  // do mesmo arquivo então executa `cache.has(...)` sobre um objeto comum e falha
  // com `TypeError: cache.has is not a function` — mensagem que aponta o helper
  // Babel como culpado e joga o stack na linha errada. Vale para todo o JS do
  // projeto porque o babel-jest também transforma `lib/` e `pages/` carregados
  // pelos testes, não só os arquivos de teste. Prefira `import * as cacheModule`
  // ou named import (`import { checkRateLimit }`), que não geram namespace.
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportNamespaceSpecifier > Identifier[name='cache']",
          message: "Não use `import * as cache`: `cache` colide com a variável de escopo do programa do helper _interopRequireWildcard (Babel 8) e faz a segunda importação namespace do arquivo falhar com `cache.has is not a function`. Use `import * as cacheModule` ou named import.",
        },
      ],
    },
  },

  // `lib/api/{index,middleware,response,errors,validate}.js` são CÓDIGO MORTO
  // em quarentena: nenhum importador de produção, apenas `tests/**`. O perigo
  // concreto é o segundo `withAuth`: o de `lib/api/middleware.js:88` tem
  // assinatura `withAuth({ roles })` (aceita objeto), enquanto o VIVO de
  // `lib/auth/auth.js:324` é `withAuth(handler)` (só função) — os dois exportam
  // o mesmo nome e quem copiar o exemplo errado ganha um middleware que "parece"
  // checar role mas quebra em runtime (TypeError ao autenticar). O barrel
  // `index.js` re-exporta os 4 módulos mortos, propalando o uso. Remoção dos 5
  // módulos é passo futuro adiado; até lá este guard impede reintrodução.
  // Vivos: `withAuth` em `lib/auth/auth.js`; caminho de produção das rotas
  // admin é `createAdminHandler` de `lib/api/adminCrudHandler.js` (não existe
  // `composeMiddleware` vivo). Detecção complementar em CI:
  // `npm run lint:dead-api` (scripts/diagnostics/lint-dead-api-modules.js).
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/lib/api/index.js",
                "**/lib/api/middleware.js",
                "**/lib/api/response.js",
                "**/lib/api/errors.js",
                "**/lib/api/validate.js",
              ],
              message:
                "lib/api/{index,middleware,response,errors,validate}.js são código morto (quarentena) — nenhum importador de produção, só testes. O `withAuth` vivo é `withAuth(handler)` de lib/auth/auth.js, usado por lib/api/adminCrudHandler.js (createAdminHandler); não existe `composeMiddleware` vivo. Novo uso aqui reintroduziria o segundo `withAuth` incompatível de lib/api/middleware.js. Guard: npm run lint:dead-api.",
            },
          ],
        },
      ],
    },
  },

  // Formas RELATIVAS dos mesmos 5 módulos mortos. Os glob `**/lib/api/*.js`
  // do bloco anterior casam com o import como escrito no arquivo, então um
  // `./middleware.js` (dentro de `lib/api/`) ou um `../api/response.js` (de
  // `lib/<subpasta>/`) passariam. Aqui só entram formas relativas que são
  // inequívocas em qualquer ponto de `lib/`: `../api/X.js` e `./api/X.js`
  // sempre resolvem para `lib/api/X.js` (só existe um diretório `api` sob
  // `lib/`), e o alias `@/lib/api/X.js` (`@/*` → `./*`, jsconfig.json) é o
  // caminho absoluto do projeto. O `./X.js` NÃO entra aqui: `lib/domain/novo.js`
  // importando `./index.js` é um barrel novo legítimo, não a cadeia morta —
  // tratá-lo como morto era o falso positivo anterior (`lib/**/*.js` no bloco
  // de `./X.js` acusava qualquer módulo novo de `lib/`). O `./X.js` é
  // inequívoco só dentro de `lib/api/` e fica no bloco seguinte.
  // Sobrescreve o bloco anterior para `lib/**`, por isso repete os glob dele.
  {
    files: ["lib/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/lib/api/index.js",
                "**/lib/api/middleware.js",
                "**/lib/api/response.js",
                "**/lib/api/errors.js",
                "**/lib/api/validate.js",
                "../api/index.js",
                "../api/middleware.js",
                "../api/response.js",
                "../api/errors.js",
                "../api/validate.js",
                "./api/index.js",
                "./api/middleware.js",
                "./api/response.js",
                "./api/errors.js",
                "./api/validate.js",
                "@/lib/api/index.js",
                "@/lib/api/middleware.js",
                "@/lib/api/response.js",
                "@/lib/api/errors.js",
                "@/lib/api/validate.js",
              ],
              message:
                "lib/api/{index,middleware,response,errors,validate}.js são código morto (quarentena) — nenhum importador de produção, só testes. O `withAuth` vivo é `withAuth(handler)` de lib/auth/auth.js, usado por lib/api/adminCrudHandler.js (createAdminHandler); não existe `composeMiddleware` vivo. Novo uso aqui reintroduziria o segundo `withAuth` incompatível de lib/api/middleware.js. Guard: npm run lint:dead-api.",
            },
          ],
        },
      ],
    },
  },

  // Formas `./X.js` da cadeia morta — o caso onde `X.js` só pode ser o módulo
  // morto: um filho DIRETO de `lib/api/` importando `./middleware.js` atinge
  // exatamente a cadeia em quarentena (é como `index.js` e `validate.js` se
  // importam entre si). Deliberadamente `lib/api/*.js` e não `lib/api/**/*.js`:
  // num futuro `lib/api/<subpasta>/novo.js`, um `./validate.js` resolveria para
  // um módulo novo da subpasta, não para o morto — mesmo falso positivo que
  // este bloco corrige, só recortado em escala menor. Como sobrescreve o bloco
  // anterior para os filhos diretos, repete os glob dele e acrescenta o `./X.js`.
  {
    files: ["lib/api/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/lib/api/index.js",
                "**/lib/api/middleware.js",
                "**/lib/api/response.js",
                "**/lib/api/errors.js",
                "**/lib/api/validate.js",
                "../api/index.js",
                "../api/middleware.js",
                "../api/response.js",
                "../api/errors.js",
                "../api/validate.js",
                "./api/index.js",
                "./api/middleware.js",
                "./api/response.js",
                "./api/errors.js",
                "./api/validate.js",
                "@/lib/api/index.js",
                "@/lib/api/middleware.js",
                "@/lib/api/response.js",
                "@/lib/api/errors.js",
                "@/lib/api/validate.js",
                "./index.js",
                "./middleware.js",
                "./response.js",
                "./errors.js",
                "./validate.js",
              ],
              message:
                "lib/api/{index,middleware,response,errors,validate}.js são código morto (quarentena) — nenhum importador de produção, só testes. O `withAuth` vivo é `withAuth(handler)` de lib/auth/auth.js, usado por lib/api/adminCrudHandler.js (createAdminHandler); não existe `composeMiddleware` vivo. Novo uso aqui reintroduziria o segundo `withAuth` incompatível de lib/api/middleware.js. Guard: npm run lint:dead-api.",
            },
          ],
        },
      ],
    },
  },

  // Exceções obrigatórias do guard acima — sem elas o lint quebra hoje:
  // 1) `tests/**` ainda importa os 5 módulos legitimamente (a remoção dos
  //    módulos é passo futuro adiado pelo mantenedor; quebrar o teste seria
  //    forçar o adiamento).
  // 2) Os próprios arquivos da cadeia morta se importam entre si
  //    (`index.js` → `./errors.js` etc.): sem isentar essa lista, o lint
  //    acusaria o próprio código em quarentena de se importar.
  // Desligar a regra no arquivo é o único mecanismo do flat config — a regra
  // não aceita "exceto estes arquivos" dentro das opções dela.
  {
    files: [
      "tests/**/*.js",
      "tests/**/*.jsx",
      "**/*.test.{js,jsx,mjs}",
      "**/__tests__/**/*.{js,jsx,mjs}",
      "lib/api/index.js",
      "lib/api/middleware.js",
      "lib/api/response.js",
      "lib/api/errors.js",
      "lib/api/validate.js",
    ],
    rules: { "no-restricted-imports": "off" },
  },

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

  // `.opencode/**/*.json` é JSONC apesar da extensão: o slim declara que
  // "arquivo .json aceita comentários" e valida com `oh-my-opencode-slim doctor`.
  // Sem este override o bloco `**/*.json` aplica `json/json`, que proíbe
  // comentário, e o arquivo falha no parse. O padrão é `**` e não o nome de um
  // arquivo porque o contrato vale para todo `.opencode/`: um override por
  // arquivo só empurraria o erro para o próximo `.json` criado ali.
  // Custo: `json/jsonc` tolera comentário num `.json` que deveria ser estrito.
  // `.opencode/skills/**` não é afetado — `ignores` tem precedência.
  { files: [".opencode/**/*.json"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },

  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

  // Markdown
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },

  // `markdown/no-missing-label-refs` dá falso positivo em task-list do GFM:
  // `- [ ]` e `- [x]` viram link de referência com rótulo vazio, e cada item de
  // checklist gera "Label reference not found". A regra só aceita `allowLabels`,
  // que não afeta task-list — não há como contornar. Desligada; a concessão é
  // perder a detecção de referência quebrada em docs, que hoje ninguém usa fora
  // de `.opencode/`. `fenced-code-language` e `no-multiple-h1` foram mantidas:
  // não são falso positivo.
  { files: ["**/*.md"], rules: { "markdown/no-missing-label-refs": "off" } },

  // `AGENTS.md` recebe um bloco de regras que o próprio Next.js reescreve a cada
  // `next dev` (ver `node_modules/next/dist/server/lib/generate-agent-files.js`),
  // e esse bloco começa com um H1. Como o arquivo volta sozinho, desligar a
  // regra aqui é o único jeito de o `npm run lint` não quebrar sempre que
  // alguém roda o dev server. A concessão é só para este arquivo.
  { files: ["AGENTS.md"], rules: { "markdown/no-multiple-h1": "off" } },

  // CSS
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"], rules: { "css/no-invalid-properties": "off" } },
]);