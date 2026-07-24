# Documentação de Análise — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento descreve **todos os 30 arquivos** localizados na raiz do projeto em `/home/qa/Projeto/Caminhar/`. Cada entrada detalha a finalidade, as principais funcionalidades e a localização exata do arquivo.

Os arquivos foram agrupados por contexto para facilitar a leitura:

1. **Configuração Principal da Aplicação** — `package.json`, `next.config.js`, `next-sitemap.config.js`, `proxy.js`, `.env`, `.env.example`
2. **Configuração de Testes** — `jest.config.base.js`, `jest.config.js`, `jest.config.db.js`, `jest.setup.js`, `jest.teardown.js`, `babel.jest.config.js`, `cypress.config.js`
3. **Ferramentas de Qualidade** — `eslint.config.js`, `jsconfig.json`, `knip.json`, `schema.knip.json`
4. **CI/CD e Automação (GitHub Actions)** — `ci.yml`, `pr-coverage.yml`, `load-tests.yml`, `security-tests.yml`, `test-base.yml`
5. **Documentação e Contexto** — `README.md`, `CHANGELOG.md`, `GEMINI.md`, `tree.txt`
6. **Configuração de Ambiente** — `.gitignore`, `.clineignore`, `skills-lock.json`
7. **Lockfiles** — `package-lock.json`

---

## 1. Configuração Principal da Aplicação

### 1.1 `package.json`

**Localização:** `/home/qa/Projeto/Caminhar/package.json`

**Propósito:** Manifesto do projeto. Define nome (`caminhar`), versão (`1.4.0`), engine (`Node.js 24.16.0`, `npm 12.0.0`), tipo de módulo (`ES Modules`), scripts, dependências e overrides.

**Principais funcionalidades:**
- **~58 scripts** organizados em categorias: dev, build, lint, testes unitários, testes de banco, testes E2E (Cypress), testes de carga (k6, centralizados no orquestrador), gerenciamento de banco, backup, utilitários, segurança.
- **Dependências principais:** Next.js 16, React 19, bcryptjs, jsonwebtoken, pg, @upstash/redis, zod, sharp, formidable, react-hot-toast.
- **DevDependencies:** Jest 30, Cypress 15, ESLint 10, Knip 6, Testing Library, Faker, Testcontainers, next-sitemap.
- **Overrides:** `tar`, `glob`, `minimatch`, `postcss`, `uuid`, `whatwg-encoding` — documentados via campo `_overridesReason`.
- **allowScripts:** Permissão para scripts nativos de `sharp`, `cypress`, `ssh2`, `protobufjs`, `cpu-features`, `unrs-resolver`.
- **Scripts de carga centralizados:** Os 30 scripts individuais de `k6 run` foram removidos. A execução é feita exclusivamente pelo orquestrador `scripts/run-all-load-tests-sequentially.js`, acessível via `npm run test:load:all`.
- **Campos preenchidos:** `description` e `author` foram preenchidos (estavam vazios).

---

### 1.2 `next.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next.config.js`

**Propósito:** Configuração principal do Next.js. Define comportamento do servidor, webpack e headers de segurança/CORS.

**Principais funcionalidades:**
- `serverExternalPackages`: `bcryptjs` e `jsonwebtoken`.
- Webpack fallback: desabilita módulos Node.js (`fs`, `path`, `url`, `crypto`) no cliente.
- **Headers de segurança:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` restritivo, `Strict-Transport-Security` (31536000s com `preload`).
- **CORS segmentado por grupo de endpoints:** `/api/:path*` (público, com lista completa de `ALLOWED_ORIGINS`), `/api/admin/:path*`, `/api/auth/:path*` e `/api/helper/:path*` (restritos à primeira origem de `ALLOWED_ORIGINS`). Métodos: `GET, POST, PUT, DELETE, OPTIONS`.

---

### 1.3 `next-sitemap.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next-sitemap.config.js`

**Propósito:** Configuração do plugin `next-sitemap` para geração de sitemaps XML e `robots.txt`.

**Principais funcionalidades:**
- `robots.txt` com políticas para Googlebot, Bingbot e User-Agent genérico.
- Sitemaps adicionais: `sitemap-musicas.xml`, `sitemap-videos.xml`.
- Páginas excluídas: `/admin`, `/api/*`, `/404`, `/500`.
- Frequência e prioridade definidas apenas no bloco `additionalPaths` para URLs dinâmicas.
- Geração dinâmica de paths: busca no banco (`posts`, `musicas`, `videos` publicados).
- `autoLastmod: true` para adição automática de `lastmod`.
- Logging padronizado via `logger` (`lib/logger.js`) para falhas nas queries do banco.

---

### 1.4 `proxy.js`

**Localização:** `/home/qa/Projeto/Caminhar/proxy.js`

**Propósito:** Middleware global do Next.js para Rate Limiting e Proteção DDoS.

**Principais funcionalidades:**
- Rotas protegidas com limites: login (5 req/min), posts/videos/musicas/products (30 req/min cada).
- Identificação de IP via `X-Forwarded-For` ou `request.ip`.
- Integração com Redis (`checkRateLimit`) com fallback em memória.
- Bloqueio com status 429 e mensagem em português.
- Logging padronizado via `logger.warn('Security', ...)` do módulo `lib/logger.js`, com suporte a níveis configuráveis via `LOG_LEVEL`.

---

### 1.5 `.env`

**Localização:** `/home/qa/Projeto/Caminhar/.env`

**Propósito:** Variáveis de ambiente para desenvolvimento local. Contém placeholders no lugar de credenciais reais. Os valores reais devem ser gerenciados via secrets.

**Variáveis:** `DATABASE_URL`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_IP_WHITELIST`, `SITE_URL`, `ALLOWED_ORIGINS`, `NODE_ENV`.

> ⚠️ Excluído do Git via `.gitignore`. Permissão `600` (`-rw-------`). Contém apenas placeholders — valores reais devem ser preenchidos localmente.

---

### 1.6 `.env.example`

**Localização:** `/home/qa/Projeto/Caminhar/.env.example`

**Propósito:** Template versionado das variáveis de ambiente necessárias, com valores placeholder para referência.


---

## 2. Configuração de Testes

### 2.1 `jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.js`

**Propósito:** Configuração principal do Jest para testes unitários e de integração.

**Principais funcionalidades:**
- Ambiente `jsdom`. Transformação via Babel (`babel.jest.config.js`).
- Cobertura com provider V8. Thresholds: branches 80%, functions 85%, lines 90%, statements 90%.
- Aliases: `@/`, `@tests/`, `@factories/`, `@helpers/`, `@mocks/`, `@matchers/`.
- `maxWorkers: '50%'`, `clearMocks: true`, `restoreMocks: true`. Timeout: 10s.

---

### 2.2 `jest.config.db.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.db.js`

**Propósito:** Configuração do Jest para testes de integração com PostgreSQL real via Testcontainers.

**Principais funcionalidades:**
- Ambiente `node`. TestMatch: `*.db.test.js`. Timeout: 30s.
- GlobalSetup: `tests/global-setup.db.js`. Mesmos aliases do `jest.config.js`.
- `maxWorkers: '50%'`, `clearMocks: true`, `restoreMocks: true`.

---

### 2.3 `jest.setup.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.setup.js`

**Propósito:** Setup global do Jest. Polyfills para JSDOM.

**Funcionalidades:** `@testing-library/jest-dom`, `TextEncoder`/`TextDecoder`, `Request`/`Response`/`Headers` (via `undici`).

---

### 2.4 `jest.teardown.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.teardown.js`

**Propósito:** Teardown global do Jest. Limpeza de conexões e recursos.

**Funcionalidades:** Fecha Redis via `getRedisInstance().quit()`, PostgreSQL via `closeDatabase()`, container de testes (`global.__TEST_DB_CONTAINER__`), limpa timer de safety net do cache via `cleanupRateLimitTimer()`, aguarda resolução de polyfills assíncronos via `setupAsyncPolyfills()`. Substitui timeout fixo de 1s por `Promise.race` com `setImmediate` + timeout de segurança de 5s.

---

### 2.5 `babel.jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/babel.jest.config.js`

**Propósito:** Configuração Babel exclusiva para Jest.

**Funcionalidades:** `@babel/preset-env` (target node current), `@babel/preset-react` (runtime automatic), plugin `@babel/plugin-transform-modules-commonjs`.

---

### 2.6 `cypress.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/cypress.config.js`

**Propósito:** Configuração do Cypress para testes E2E.

**Funcionalidades:** `projectId: kddcrf`, timeouts (comando 10s, página 30s), retry (2 em CI), viewport 1280×720, `baseUrl: http://localhost:3000`, vídeo e screenshots ativados, `supportFile: cypress/support/e2e.js`.

---

### 2.7 `jest.config.base.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.base.js`

**Propósito:** Configuração base compartilhada entre `jest.config.js` e `jest.config.db.js`. Contém as propriedades comuns para evitar duplicação.

**Funcionalidades:** `transform` (Babel), `moduleNameMapper` (6 aliases: `@/`, `@tests/`, `@factories/`, `@helpers/`, `@mocks/`, `@matchers/`), `moduleFileExtensions`, `clearMocks`, `restoreMocks`, `verbose`, `maxWorkers: '50%'`.

---

## 3. Ferramentas de Qualidade e Análise Estática

### 3.1 `eslint.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/eslint.config.js`

**Propósito:** Configuração do ESLint (Flat Config) para JS, JSX, JSON, Markdown e CSS.

**Funcionalidades:** Regras por tipo de arquivo (JS geral, Cypress, React/JSX, Jest, k6, JSON, Markdown, CSS). Parser Babel para JSX. Globais específicos para cada contexto.

---

## 4. CI/CD e Automação (GitHub Actions)

### 4.1 `ci.yml`

**Localização:** `/home/qa/Projeto/Caminhar/ci.yml`

**Propósito:** CI básica: executa `npm run test:ci` em pushes e PRs para `main`/`master`.

**Funcionalidades:** Utiliza a composite action `.github/actions/setup` que inclui `actions/setup-node@v4` com `cache: 'npm'`, garantindo cache automático de dependências npm via `package-lock.json`.

---

### 4.2 `pr-coverage.yml`

**Localização:** `/home/qa/Projeto/Caminhar/pr-coverage.yml`

**Propósito:** Verificação de cobertura mínima em PRs com thresholds de 80% (branches), 85% (functions) e 90% (lines/statements).

**Funcionalidades:** Estrutura em 2 jobs: `call-test-base` (que chama o workflow reutilizável `test-base.yml` com `skip-k6: true` e `seed-db: false`) e `coverage-report` (que executa Knip, gerencia comentários no PR e faz upload do relatório de cobertura). Os serviços PostgreSQL e Redis são providos pelo `test-base.yml`.

---

### 4.3 `load-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/load-tests.yml`

**Propósito:** Execução diária (03:00 UTC) de testes de carga com k6. Utiliza o workflow reutilizável `test-base.yml` para serviços (PostgreSQL/Redis) e steps comuns. Inclui orquestrador Node.js, validação de thresholds e upload de relatórios (retenção 30 dias).

---

### 4.4 `security-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/security-tests.yml`

**Propósito:** Testes de segurança com k6 (DDOS, Rate Limit, Login Negativo, IP Spoofing) em pushes e PRs para `main`. Utiliza o workflow reutilizável `test-base.yml` para serviços (PostgreSQL/Redis) e steps comuns.

---

### 4.5 `test-base.yml`

**Localização:** `/home/qa/Projeto/Caminhar/.github/workflows/test-base.yml`

**Propósito:** Workflow reutilizável que centraliza os serviços PostgreSQL e Redis (com health checks) e os steps comuns de build, setup e execução de testes. Utilizado por `load-tests.yml`, `security-tests.yml` e `pr-coverage.yml` via `workflow_call`, eliminando a duplicação de configuração de serviços entre workflows.

**Funcionalidades:** Serviço PostgreSQL com health check (`pg_isready`, intervalo 10s, timeout 5s, 5 retries), serviço Redis com health check (`redis-cli ping`), steps de checkout, setup Node.js, restore de cache do Next.js, setup de banco de testes, build e start da aplicação, setup do k6 (condicional via input `skip-k6`) e execução dos testes. Aceita como inputs: `test-type` (obrigatório), `run-command` (obrigatório), `skip-k6` (opcional, default `false`), `seed-db` (opcional, default `true`), `extra-steps` (opcional, default `''`). Inclui step de upload de artifact do output de cobertura quando `test-type` é `coverage`.

---

## 5. Documentação e Contexto

### 5.1 `README.md`

**Localização:** `/home/qa/Projeto/Caminhar/README.md`

**Propósito:** Documento principal do repositório com visão geral do projeto.

**Funcionalidades:** Descrição da plataforma, documentação de todas as áreas (raiz, componentes, páginas, hooks, lib, dados, exemplos, testes, mocks, E2E, carga, scripts), principais tecnologias.

---

### 5.2 `CHANGELOG.md`

**Localização:** `/home/qa/Projeto/Caminhar/CHANGELOG.md`

**Propósito:** Registro de alterações (Keep a Changelog, SemVer). Versões de 1.0.0 a 1.4.0.

---

### 5.3 `GEMINI.md`

**Localização:** `/home/qa/Projeto/Caminhar/GEMINI.md`

**Propósito:** Contexto para assistentes de IA. Referencia 10 skills em `.agents/skills/`.

> ⚪ Arquivo acessório, sem impacto no funcionamento do projeto.

---

### 5.4 `tree.txt`

**Localização:** `/home/qa/Projeto/Caminhar/tree.txt`

**Propósito:** Snapshot da estrutura de diretórios (1151 linhas, 182 diretórios, 967 arquivos).

> ⚪ Snapshot estático propenso a desatualização.

---

## 6. Configuração de Ambiente

### 6.1 `.gitignore`

**Localização:** `/home/qa/Projeto/Caminhar/.gitignore`

**Propósito:** Define arquivos/diretórios ignorados pelo Git: logs, cache, `.env`, `node_modules`, `.next`, `coverage`, etc.

---

### 6.2 `.clineignore`

**Localização:** `/home/qa/Projeto/Caminhar/.clineignore`

**Propósito:** Diretivas de ignore para o agente Cline. Ignora node_modules, .next, .env, logs, coverage, etc.

---

### 6.3 `skills-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/skills-lock.json`

**Propósito:** Lockfile de skills do agente de IA (~945 linhas). 80+ skills com hashes de verificação.

> ⚪ Arquivo de ferramenta de IA, sem impacto no código da aplicação.

---

## 7. Lockfiles

### 7.1 `package-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/package-lock.json`

**Propósito:** Lockfile do npm (~606 KB). Versões exatas de todas as dependências. Não editável manualmente.

---

## Resumo dos Arquivos Analisados

| # | Arquivo | Grupo | Relevância |
|---|---------|-------|------------|
| 1 | `package.json` | Config. Principal | 🔴 Essencial |
| 2 | `next.config.js` | Config. Principal | 🔴 Essencial |
| 3 | `next-sitemap.config.js` | Config. Principal | 🟡 Importante |
| 4 | `proxy.js` | Config. Principal | 🔴 Essencial |
| 5 | `.env` | Config. Principal | 🔴 Essencial |
| 6 | `.env.example` | Config. Principal | 🟡 Importante |
| 7 | `jest.config.js` | Testes | 🔴 Essencial |
| 8 | `jest.config.db.js` | Testes | 🟡 Importante |
| 9 | `jest.setup.js` | Testes | 🔴 Essencial |
| 10 | `jest.teardown.js` | Testes | 🔴 Essencial |
| 11 | `babel.jest.config.js` | Testes | 🟡 Importante |
| 12 | `cypress.config.js` | Testes | 🟡 Importante |
| 13 | `jest.config.base.js` | Testes | 🟡 Importante |
| 14 | `eslint.config.js` | Qualidade | 🔴 Essencial |
| 15 | `jsconfig.json` | Qualidade | 🟡 Importante |
| 16 | `knip.json` | Qualidade | 🟡 Importante |
| 17 | `schema.knip.json` | Qualidade | ⚪ Acessório |
| 18 | `ci.yml` | CI/CD | 🔴 Essencial |
| 19 | `pr-coverage.yml` | CI/CD | 🟡 Importante |
| 20 | `load-tests.yml` | CI/CD | 🟡 Importante |
| 21 | `security-tests.yml` | CI/CD | 🟡 Importante |
| 22 | `README.md` | Documentação | 🔴 Essencial |
| 23 | `CHANGELOG.md` | Documentação | 🟡 Importante |
| 24 | `GEMINI.md` | Documentação | ⚪ Acessório |
| 25 | `tree.txt` | Documentação | ⚪ Acessório |
| 26 | `.gitignore` | Ambiente | 🔴 Essencial |
| 27 | `.clineignore` | Ambiente | ⚪ Acessório |
| 28 | `skills-lock.json` | Ambiente | ⚪ Acessório |
| 29 | `package-lock.json` | Lockfile | 🔴 Essencial |
| 30 | `test-base.yml` | CI/CD | 🟡 Importante |


