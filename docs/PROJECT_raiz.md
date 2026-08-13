# Documentação de Análise — Arquivos da Raiz do Projeto (`/`)

> **Data da análise:** 02/08/2026
> **Objetivo:** Documentar os arquivos localizados na raiz do projeto `/home/qa/Projeto/Caminhar/`, descrevendo localização exata, propósito e funcionalidades de cada um.
> **Escopo:** Apenas arquivos da raiz (sem subpastas). Arquivos bloqueados (`.env`, `.gitignore`, `.clineignore`) e arquivos em subpastas (ex: `.github/workflows/test-base.yml`) são mencionados apenas como nota, sem análise de conteúdo.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Principal da Aplicação](#1-configuração-principal-da-aplicação)
3. [Configuração de Testes](#2-configuração-de-testes)
4. [Ferramentas de Qualidade e Análise Estática](#3-ferramentas-de-qualidade-e-análise-estática)
5. [CI/CD e Automação (GitHub Actions)](#4-cicd-e-automação-github-actions)
6. [Documentação e Contexto](#5-documentação-e-contexto)
7. [Arquivos Gerados / Redundantes](#6-arquivos-gerados--redundantes)
8. [Lockfiles e Configuração de Ambiente](#7-lockfiles-e-configuração-de-ambiente)

---

## Visão Geral

A raiz do projeto concentra **31 arquivos** (excluindo subpastas e arquivos bloqueados). Eles se dividem em:

- **Configuração principal** — `package.json`, `next.config.js`, `next-sitemap.config.js`, `proxy.js`, `.env.example`.
- **Configuração de testes** — `jest.config.base.js`, `jest.config.js`, `jest.config.db.js`, `jest.setup.js`, `jest.teardown.js`, `babel.jest.config.js`, `cypress.config.js`.
- **Qualidade/estática** — `eslint.config.js`, `jsconfig.json`, `knip.json`, `schema.knip.json`, `.dependency-cruiser.cjs`.
- **CI/CD** — `ci.yml`, `pr-coverage.yml`, `load-tests.yml`, `security-tests.yml`.
- **Documentação/contexto** — `README.md`, `CHANGELOG.md`, `GEMINI.md`, `tree.txt`.
- **Arquivos gerados/redundantes** — `estrutura.html`, `estrutura.txt`, `estrutura_extras.html`, `estrutura_extras.txt`.
- **Lockfiles/ambiente** — `package-lock.json`, `skills-lock.json`.

> **Nota sobre arquivos bloqueados:** `.env`, `.gitignore` e `.clineignore` existem na raiz mas estão bloqueados (não acessíveis para leitura). O `.env.example` serve como template versionado das variáveis de ambiente.

---

## 1. Configuração Principal da Aplicação

### 1.1 `package.json`

**Localização:** `/home/qa/Projeto/Caminhar/package.json`

**Propósito:** Manifesto do projeto. Define nome (`caminhar`), versão (`1.4.0`), engine (`Node.js 24.18.0`, `npm 12.0.2`), tipo de módulo (`ES Modules`), scripts, dependências e overrides.

**Principais funcionalidades:**
- **60 scripts** organizados em categorias: dev, build, lint, testes unitários, testes de banco, testes E2E (Cypress), testes de carga (k6, centralizados no orquestrador), gerenciamento de banco, backup, utilitários, segurança.
- **Dependências principais:** Next.js 16, React 19, bcryptjs, jsonwebtoken, pg, @upstash/redis, zod, sharp, formidable, react-hot-toast, web-vitals.
- **DevDependencies:** Jest 30, Cypress 15, ESLint 10, Knip 6, Testing Library, Faker, Testcontainers, next-sitemap, dependency-cruiser.
- **Overrides:** `tar`, `glob`, `minimatch`, `postcss`, `uuid`, `whatwg-encoding` — documentados via campo `_overridesReason`.
- **allowScripts:** Permissão para scripts nativos de `sharp`, `cypress`, `ssh2`, `protobufjs`, `cpu-features`, `unrs-resolver`.
- **Scripts de carga centralizados:** A execução de testes de carga é feita pelo orquestrador `scripts/run-all-load-tests-sequentially.js`, acessível via `npm run test:load:all`.
- **Script `test:e2e:record`:** contém uma chave de projeto Cypress (`1c15e96c-3b79-4a4d-b2ec-7f0ffa209246`) exposta diretamente no manifesto.

> ⚠️ **Inconsistência:** o `engines` declara Node 24.18.0/npm 12.0.2, mas o `README.md` informa Node 24.16.0/npm 11.17.0.

---

### 1.2 `next.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next.config.js`

**Propósito:** Configuração principal do Next.js. Define comportamento do servidor, webpack e headers de segurança/CORS.

**Principais funcionalidades:**
- `serverExternalPackages`: `bcryptjs` e `jsonwebtoken`.
- Webpack fallback: desabilita módulos Node.js (`fs`, `path`, `url`, `crypto`) no cliente.
- **Headers de segurança:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` restritivo, `Strict-Transport-Security` (31536000s com `preload`).
- **CORS segmentado por grupo de endpoints:** `/api/:path*` (público, com lista completa de `ALLOWED_ORIGINS`), `/api/admin/:path*`, `/api/auth/:path*` e `/api/helper/:path*` (restritos à primeira origem de `ALLOWED_ORIGINS`). Métodos: `GET, POST, PUT, DELETE, OPTIONS`.

> ⚠️ **Inconsistência de CORS:** o bloco `/api/:path*` usa a lista completa de origens, enquanto admin/auth/helper usam apenas a primeira origem de `ALLOWED_ORIGINS`.

---

### 1.3 `next-sitemap.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next-sitemap.config.js`

**Propósito:** Configuração do plugin `next-sitemap` para geração de sitemaps XML e `robots.txt`.

**Principais funcionalidades:**
- `robots.txt` com políticas para Googlebot, Bingbot e User-Agent genérico.
- Sitemaps adicionais: `sitemap-musicas.xml`, `sitemap-videos.xml`.
- Páginas excluídas: `/admin`, `/api/*`, `/404`, `/500`.
- Geração dinâmica de paths: busca no banco (`posts`, `musicas`, `videos` publicados) via `additionalPaths`.
- `autoLastmod: true` para adição automática de `lastmod`.
- Logging de falhas via `logger` (`lib/infra/logger.js`).
- `onComplete` usa `console.log` para confirmar geração.

---

### 1.4 `proxy.js`

**Localização:** `/home/qa/Projeto/Caminhar/proxy.js`

**Propósito:** Middleware global do Next.js para Rate Limiting e Proteção DDoS (convenção `proxy` do Next.js 16).

**Principais funcionalidades:**
- Rotas protegidas com limites: login (5 req/min), posts/videos/musicas/products (30 req/min cada).
- Identificação de IP via `X-Forwarded-For` (priorizado em socket local) ou `request.ip`.
- Integração com Redis (`checkRateLimit`) com fallback em memória.
- Bloqueio com status 429 e mensagem em português.
- Logging via `logger.warn('Security', ...)` do módulo `lib/infra/logger.js`.

> ⚠️ **Divergência de limites:** o proxy limita posts/videos/musicas/products a 30 req/min, mas os próprios endpoints públicos definem limites diferentes (ex: `posts.js` usa 100/300 req/min; `musicas.js`/`dicas.js` usam 60 req/min). O proxy é a camada mais restritiva.

---

### 1.5 `.env.example`

**Localização:** `/home/qa/Projeto/Caminhar/.env.example`

**Propósito:** Template versionado das variáveis de ambiente necessárias, com valores placeholder para referência.

**Variáveis:** `DATABASE_URL`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_IP_WHITELIST`, `SITE_URL`, `ALLOWED_ORIGINS`, `NODE_ENV`.

> **Nota:** o `.env` real existe na raiz mas está bloqueado (não acessível). O `.env.example` é o template seguro para novos desenvolvedores.

---

## 2. Configuração de Testes

### 2.1 `jest.config.base.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.base.js`

**Propósito:** Configuração base compartilhada entre `jest.config.js` e `jest.config.db.js`. Contém as propriedades comuns para evitar duplicação.

**Funcionalidades:** `transform` (Babel via `babel.jest.config.js`), `moduleNameMapper` (6 aliases: `@/`, `@tests/`, `@factories/`, `@helpers/`, `@mocks/`, `@matchers/`), `moduleFileExtensions`, `clearMocks`, `restoreMocks`, `verbose`, `maxWorkers: '50%'`.

---

### 2.2 `jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.js`

**Propósito:** Configuração principal do Jest para testes unitários e de integração (ambiente jsdom).

**Principais funcionalidades:**
- Estende `jest.config.base.js`.
- Ambiente `jsdom`. TestMatch: `**/*.test.js`.
- Cobertura com provider V8. Thresholds: branches 80%, functions 85%, lines 90%, statements 90%.
- `transformIgnorePatterns` com exceções para `node-mocks-http`, `@faker-js`, `url`, `pg`, `@upstash/redis`, `uncrypto`.
- `setupFilesAfterEnv: tests/setup.js`, `globalTeardown: jest.teardown.js`.
- `moduleNameMapper` para CSS (`__mocks__/styleMock.js`). Timeout: 10s.

---

### 2.3 `jest.config.db.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.db.js`

**Propósito:** Configuração do Jest para testes de integração com PostgreSQL real via Testcontainers.

**Principais funcionalidades:**
- Estende `jest.config.base.js`.
- Ambiente `node`. TestMatch: `**/*.db.test.js`. Timeout: 30s.
- `globalSetup: tests/global-setup.db.js`, `setupFilesAfterEnv: tests/setup.db.js`, `globalTeardown: jest.teardown.js`.
- `transformIgnorePatterns` para `testcontainers`/`@testcontainers`.

---

### 2.4 `jest.setup.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.setup.js`

**Propósito:** Setup global do Jest. Polyfills para JSDOM.

**Funcionalidades:** `@testing-library/jest-dom`, `TextEncoder`/`TextDecoder`, polyfill de `Request`/`Response`/`Headers` via `undici` (com fallback silencioso). Logs de debug sobre módulos ES e versão do Node.

> ⚠️ **Ponto de atenção:** contém `console.log` de debug ("Jest setup running with ES modules", "Node.js version") que poluem a saída dos testes.

---

### 2.5 `jest.teardown.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.teardown.js`

**Propósito:** Teardown global do Jest. Limpeza de conexões e recursos.

**Funcionalidades:** Fecha Redis via `getRedisInstance().quit()`, PostgreSQL via `closeDatabase()`, container de testes (`global.__TEST_DB_CONTAINER__`), limpa timer de safety net do cache via `cleanupRateLimitTimer()`, aguarda resolução de polyfills assíncronos via `setupAsyncPolyfills()`. Usa `Promise.race` com `setImmediate` + timeout de segurança de 5s.

---

### 2.6 `babel.jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/babel.jest.config.js`

**Propósito:** Configuração Babel exclusiva para Jest.

**Funcionalidades:** `@babel/preset-env` (target node current), `@babel/preset-react` (runtime automatic), plugin `@babel/plugin-transform-modules-commonjs`.

---

### 2.7 `cypress.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/cypress.config.js`

**Propósito:** Configuração do Cypress para testes E2E.

**Funcionalidades:** `projectId: kddcrf`, timeouts (comando 10s, requisição 10s, página 30s), retry (2 em CI, 0 em open), viewport 1280×720, `baseUrl: http://localhost:3000`, vídeo e screenshots ativados, `supportFile: cypress/support/e2e.js`, `setupNodeEvents` vazio (sem plugins registrados).

---

## 3. Ferramentas de Qualidade e Análise Estática

### 3.1 `eslint.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/eslint.config.js`

**Propósito:** Configuração do ESLint (Flat Config) para JS, JSX, JSON, Markdown e CSS.

**Funcionalidades:** Regras por tipo de arquivo (JS geral, Cypress, React/JSX, Jest, k6, JSON, Markdown, CSS). Parser Babel para JSX. Globais específicos para cada contexto. Ignora `.next`, `out`, `build`, `reports`, `coverage`, `cypress/videos`, `cypress/screenshots`, `data`, `public/uploads`, `.agents`, `docs`, `package-lock.json`.

---

### 3.2 `jsconfig.json`

**Localização:** `/home/qa/Projeto/Caminhar/jsconfig.json`

**Propósito:** Configuração do JavaScript Language Server para o VS Code. Define paths e opções de compilação para IntelliSense.

**Funcionalidades:** Path alias `@/*` mapeado para `./*`, `baseUrl` na raiz, `ignoreDeprecations: "6.0"`, exclui `node_modules` e `.next`.

---

### 3.3 `knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/knip.json`

**Propósito:** Configuração da ferramenta Knip para análise de código morto, dependências não utilizadas e arquivos órfãos.

**Funcionalidades:** Schema referenciado (`./schema.knip.json`), path alias `@/*`, ignora `tests/`, `load-tests/`, `scripts/`, `examples/`, `.agents/`, `*.config.js`, `jest.setup.js`. Ignora dependências como `@faker-js/faker`, `babel-jest`, `jsdom`. Dicas de configuração tratadas como erro (`treatConfigHintsAsErrors`). Regra de duplicidade desligada.

---

### 3.4 `schema.knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/schema.knip.json`

**Propósito:** Schema JSON Schema (draft-07) para validação da configuração do Knip. Arquivo de suporte para garantir que `knip.json` esteja corretamente formatado.

**Funcionalidades:** Schema de validação completo do Knip (1113 linhas), define tipos aceitos para todas as propriedades de configuração, inclui plugins suportados (Jest, Cypress, Next.js, etc.), estrutura de workspace e regras de análise.

> ⚪ Arquivo acessório — pode ser substituído pela referência ao schema oficial online (`https://json.schemastore.org/knip.json`).

---

### 3.5 `.dependency-cruiser.cjs`

**Localização:** `/home/qa/Projeto/Caminhar/.dependency-cruiser.cjs`

**Propósito:** Configuração do `dependency-cruiser` para análise de dependências e detecção de ciclos/órfãos.

**Funcionalidades:** Regras `forbidden` (no-circular, no-orphans, no-deprecated-core, not-to-deprecated, no-non-package-json, not-to-unresolvable, no-duplicate-dep-types, not-to-test, not-to-spec, not-to-dev-dep, optional-deps-used, peer-deps-used). Usa `jsconfig.json` como `tsConfig`. `skipAnalysisNotInRules: true`. Gerado em 2026-07-25.

> ⚪ Ferramenta de análise — não afeta o runtime da aplicação.

---

## 4. CI/CD e Automação (GitHub Actions)

### 4.1 `ci.yml`

**Localização:** `/home/qa/Projeto/Caminhar/ci.yml`

**Propósito:** CI básica: executa `npm run test:ci` em pushes e PRs para `main`/`master`.

**Funcionalidades:** Utiliza a composite action `.github/actions/setup` (que inclui `actions/setup-node@v4` com `cache: 'npm'`), garantindo cache automático de dependências npm via `package-lock.json`.

---

### 4.2 `pr-coverage.yml`

**Localização:** `/home/qa/Projeto/Caminhar/pr-coverage.yml`

**Propósito:** Verificação de cobertura mínima em PRs com thresholds de 80% (branches), 85% (functions) e 90% (lines/statements).

**Funcionalidades:** Estrutura em 2 jobs: `call-test-base` (chama o workflow reutilizável `test-base.yml` com `skip-k6: true` e `seed-db: false`) e `coverage-report` (executa Knip, gerencia comentários no PR e faz upload do relatório de cobertura). Os serviços PostgreSQL e Redis são providos pelo `test-base.yml`.

---

### 4.3 `load-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/load-tests.yml`

**Propósito:** Execução diária (03:00 UTC) de testes de carga com k6.

**Funcionalidades:** Utiliza o workflow reutilizável `test-base.yml` para serviços (PostgreSQL/Redis) e steps comuns. Executa o orquestrador `scripts/run-all-load-tests-sequentially.js`. Valida thresholds via `orchestrator-results.json` e faz upload de relatórios (retenção 30 dias). Notifica violações de threshold.

---

### 4.4 `security-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/security-tests.yml`

**Propósito:** Testes de segurança com k6 (DDOS, Rate Limit, Login Negativo, IP Spoofing) em pushes e PRs para `main`.

**Funcionalidades:** Utiliza o workflow reutilizável `test-base.yml` para serviços (PostgreSQL/Redis) e steps comuns. Executa 4 scripts de segurança via k6. Upload de relatórios (retenção 30 dias).

---

## 5. Documentação e Contexto

### 5.1 `README.md`

**Localização:** `/home/qa/Projeto/Caminhar/README.md`

**Propósito:** Documento principal do repositório com visão geral do projeto.

**Funcionalidades:** Descrição da plataforma, documentação de todas as áreas (raiz, componentes, páginas, hooks, lib, dados, exemplos, testes, mocks, E2E, carga, scripts), principais tecnologias.

> ⚠️ **Inconsistência:** o README informa "28 arquivos" na raiz e "53 arquivos" em páginas, mas a análise atual identifica 31 arquivos na raiz e 42 em páginas. O README também cita `generateTokensCSS.js` e Design Tokens que foram removidos.

---

### 5.2 `CHANGELOG.md`

**Localização:** `/home/qa/Projeto/Caminhar/CHANGELOG.md`

**Propósito:** Registro de alterações (Keep a Changelog, SemVer). Versões de 1.0.0 a 1.4.0.

**Funcionalidades:** Documenta adições, melhorias, segurança, SEO, componentes UI, infraestrutura por versão. A versão 1.4.0 (2026-05-10) é a mais recente.

---

### 5.3 `GEMINI.md`

**Localização:** `/home/qa/Projeto/Caminhar/GEMINI.md`

**Propósito:** Contexto para assistentes de IA. Referencia 10 skills em `.agents/skills/`.

> ⚪ Arquivo acessório, sem impacto no funcionamento do projeto.

---

### 5.4 `tree.txt`

**Localização:** `/home/qa/Projeto/Caminhar/tree.txt`

**Propósito:** Snapshot da estrutura de diretórios (1253 linhas, 194 diretórios, 1057 arquivos).

> ⚪ Snapshot estático propenso a desatualização.

---

## 6. Arquivos Gerados / Redundantes

### 6.1 `estrutura.html` e `estrutura_extras.html`

**Localização:** `/home/qa/Projeto/Caminhar/estrutura.html`, `/home/qa/Projeto/Caminhar/estrutura_extras.html`

**Propósito:** Outputs HTML do `dependency-cruiser` (título "dependency-cruiser output"), ~1.1 MB cada.

**Funcionalidades:** Representam a matriz de dependências do projeto em formato HTML interativo (tabela de dependências).

> ⚪ **Arquivos gerados/redundantes:** são artefatos de análise estática, não fazem parte do código-fonte nem do build. Podem ser removidos ou movidos para `reports/`.

---

### 6.2 `estrutura.txt` e `estrutura_extras.txt`

**Localização:** `/home/qa/Projeto/Caminhar/estrutura.txt`, `/home/qa/Projeto/Caminhar/estrutura_extras.txt`

**Propósito:** Mapeamento de dependências em texto (formato `arquivo → dependência`).

**Funcionalidades:** `estrutura.txt` (339 linhas) lista as dependências entre módulos. `estrutura_extras.txt` (342 linhas) é quase idêntico, com a diferença de incluir `pages/api/admin/backups.js → scripts/backup.js` e as sub-dependências de `scripts/backup.js`.

> ⚪ **Arquivos redundantes:** `estrutura_extras.txt` é uma versão estendida de `estrutura.txt`. Ambos são artefatos de análise estática, não fazem parte do código-fonte.

---

## 7. Lockfiles e Configuração de Ambiente

### 7.1 `package-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/package-lock.json`

**Propósito:** Lockfile do npm (~602 KB, lockfileVersion 3). Versões exatas de todas as dependências. Não editável manualmente.

**Funcionalidades:** Garante reproducibilidade do ambiente. Utilizado nos workflows CI para `npm ci`.

---

### 7.2 `skills-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/skills-lock.json`

**Propósito:** Lockfile de skills do agente de IA (~945 linhas). 80+ skills com hashes de verificação e fontes.

**Funcionalidades:** Versionamento de skills (versão 1). Skills de múltiplas fontes: `anthropics/skills`, `wshobson/agents`, `vercel-labs`, `supabase`, `nextlevelbuilder`. Cada skill possui hash computado para verificação de integridade.

> ⚪ Arquivo de ferramenta de IA, sem impacto no código da aplicação.

---

## Resumo dos Arquivos Analisados

| # | Arquivo | Grupo | Relevância |
|---|---------|-------|------------|
| 1 | `package.json` | Config. Principal | 🔴 Essencial |
| 2 | `next.config.js` | Config. Principal | 🔴 Essencial |
| 3 | `next-sitemap.config.js` | Config. Principal | 🟡 Importante |
| 4 | `proxy.js` | Config. Principal | 🔴 Essencial |
| 5 | `.env.example` | Config. Principal | 🟡 Importante |
| 6 | `jest.config.base.js` | Testes | 🟡 Importante |
| 7 | `jest.config.js` | Testes | 🔴 Essencial |
| 8 | `jest.config.db.js` | Testes | 🟡 Importante |
| 9 | `jest.setup.js` | Testes | 🔴 Essencial |
| 10 | `jest.teardown.js` | Testes | 🔴 Essencial |
| 11 | `babel.jest.config.js` | Testes | 🟡 Importante |
| 12 | `cypress.config.js` | Testes | 🟡 Importante |
| 13 | `eslint.config.js` | Qualidade | 🔴 Essencial |
| 14 | `jsconfig.json` | Qualidade | 🟡 Importante |
| 15 | `knip.json` | Qualidade | 🟡 Importante |
| 16 | `schema.knip.json` | Qualidade | ⚪ Acessório |
| 17 | `.dependency-cruiser.cjs` | Qualidade | ⚪ Acessório |
| 18 | `ci.yml` | CI/CD | 🔴 Essencial |
| 19 | `pr-coverage.yml` | CI/CD | 🟡 Importante |
| 20 | `load-tests.yml` | CI/CD | 🟡 Importante |
| 21 | `security-tests.yml` | CI/CD | 🟡 Importante |
| 22 | `README.md` | Documentação | 🔴 Essencial |
| 23 | `CHANGELOG.md` | Documentação | 🟡 Importante |
| 24 | `GEMINI.md` | Documentação | ⚪ Acessório |
| 25 | `tree.txt` | Documentação | ⚪ Acessório |
| 26 | `estrutura.html` | Gerado | ⚪ Acessório |
| 27 | `estrutura_extras.html` | Gerado | ⚪ Acessório |
| 28 | `estrutura.txt` | Gerado | ⚪ Acessório |
| 29 | `estrutura_extras.txt` | Gerado | ⚪ Acessório |
| 30 | `package-lock.json` | Lockfile | 🔴 Essencial |
| 31 | `skills-lock.json` | Ambiente | ⚪ Acessório |

> **Nota:** `.env`, `.gitignore` e `.clineignore` existem na raiz mas estão bloqueados (não acessíveis). O `test-base.yml` está em `.github/workflows/` (subpasta), fora do escopo desta análise de raiz.