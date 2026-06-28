# Documentação de Análise — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento descreve **todos os 28 arquivos** localizados na raiz do projeto em `/home/qa/Projeto/Caminhar/`. Cada entrada detalha a finalidade, as principais funcionalidades e a localização exata do arquivo.

Os arquivos foram agrupados por contexto para facilitar a leitura:

1. **Configuração Principal da Aplicação** — `package.json`, `next.config.js`, `next-sitemap.config.js`, `proxy.js`, `.env`, `.env.example`
2. **Configuração de Testes** — `jest.config.js`, `jest.config.db.js`, `jest.setup.js`, `jest.teardown.js`, `babel.jest.config.js`, `cypress.config.js`
3. **Ferramentas de Qualidade** — `eslint.config.js`, `jsconfig.json`, `knip.json`, `schema.knip.json`
4. **CI/CD e Automação (GitHub Actions)** — `ci.yml`, `pr-coverage.yml`, `load-tests.yml`, `security-tests.yml`
5. **Documentação e Contexto** — `README.md`, `CHANGELOG.md`, `GEMINI.md`, `tree.txt`
6. **Configuração de Ambiente** — `.gitignore`, `.clineignore`, `skills-lock.json`
7. **Lockfiles** — `package-lock.json`

---

## 1. Configuração Principal da Aplicação

### 1.1 `package.json`

**Localização:** `/home/qa/Projeto/Caminhar/package.json`

**Propósito:** Manifesto do projeto. Define nome (`caminhar`), versão (`1.4.0`), engine (`Node.js 24.16.0`, `npm 11.17.0`), tipo de módulo (`ES Modules`), scripts, dependências e overrides.

**Principais funcionalidades:**
- **88 scripts** organizados em categorias: dev, build, lint, testes unitários, testes de banco, testes E2E (Cypress), testes de carga (k6, 34 variações), gerenciamento de banco, backup, utilitários, segurança.
- **Dependências principais:** Next.js 16, React 19, bcryptjs, jsonwebtoken, pg, @upstash/redis, zod, sharp, formidable, react-hot-toast.
- **DevDependencies:** Jest 30, Cypress 15, ESLint 10, Knip 6, Testing Library, Faker, Testcontainers, next-sitemap.
- **Overrides:** `tar`, `glob`, `minimatch`, `postcss`, `uuid`, `whatwg-encoding`.
- **allowScripts:** Permissão para scripts nativos de `sharp`, `cypress`, `ssh2`, `protobufjs`, `cpu-features`, `unrs-resolver`.

---

### 1.2 `next.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next.config.js`

**Propósito:** Configuração principal do Next.js. Define comportamento do servidor, webpack e headers de segurança/CORS.

**Principais funcionalidades:**
- `serverExternalPackages`: `bcryptjs` e `jsonwebtoken`.
- Webpack fallback: desabilita módulos Node.js (`fs`, `path`, `url`, `crypto`) no cliente.
- **Headers de segurança:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` restritivo, `Strict-Transport-Security` (31536000s).
- **CORS para `/api/:path*`:** Origem dinâmica via `ALLOWED_ORIGINS`, métodos `GET, POST, PUT, DELETE, OPTIONS`.

---

### 1.3 `next-sitemap.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next-sitemap.config.js`

**Propósito:** Configuração do plugin `next-sitemap` para geração de sitemaps XML e `robots.txt`.

**Principais funcionalidades:**
- `robots.txt` com políticas para Googlebot, Bingbot e User-Agent genérico.
- Sitemaps adicionais: `sitemap-musicas.xml`, `sitemap-videos.xml`.
- Páginas excluídas: `/admin`, `/api/*`, `/404`, `/500`.
- Frequência e prioridade configuradas por path.
- Geração dinâmica de paths: busca no banco (`posts`, `musicas`, `videos` publicados).
- Função `transform` customizada e `autoLastmod: true`.

---

### 1.4 `proxy.js`

**Localização:** `/home/qa/Projeto/Caminhar/proxy.js`

**Propósito:** Middleware global do Next.js para Rate Limiting e Proteção DDoS.

**Principais funcionalidades:**
- Rotas protegidas com limites: login (5 req/min), posts/videos/musicas/products (30 req/min cada).
- Identificação de IP via `X-Forwarded-For` ou `request.ip`.
- Integração com Redis (`checkRateLimit`) com fallback em memória.
- Bloqueio com status 429 e mensagem em português.
- Logging de segurança com rota, IP, User-Agent e timestamp.

---

### 1.5 `.env`

**Localização:** `/home/qa/Projeto/Caminhar/.env`

**Propósito:** Variáveis de ambiente para desenvolvimento local. Contém credenciais e configurações sensíveis.

**Variáveis:** `DATABASE_URL`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_IP_WHITELIST`, `SITE_URL`, `ALLOWED_ORIGINS`, `NODE_ENV`.

> ⚠️ Excluído do Git via `.gitignore`. Contém credenciais reais de desenvolvimento.

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
- `maxWorkers: 1`, `clearMocks: true`, `restoreMocks: true`. Timeout: 10s.

---

### 2.2 `jest.config.db.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.db.js`

**Propósito:** Configuração do Jest para testes de integração com PostgreSQL real via Testcontainers.

**Principais funcionalidades:**
- Ambiente `node`. TestMatch: `*.db.test.js`. Timeout: 30s.
- GlobalSetup: `tests/global-setup.db.js`. Mesmos aliases do `jest.config.js`.

---

### 2.3 `jest.setup.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.setup.js`

**Propósito:** Setup global do Jest. Polyfills para JSDOM.

**Funcionalidades:** `@testing-library/jest-dom`, `TextEncoder`/`TextDecoder`, `Request`/`Response`/`Headers` (via `undici`).

---

### 2.4 `jest.teardown.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.teardown.js`

**Propósito:** Teardown global do Jest. Limpeza de conexões.

**Funcionalidades:** Fecha Redis (`redis.quit()`), PostgreSQL (`closeDatabase()`), container de testes (`global.__TEST_DB_CONTAINER__`).

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

## 3. Ferramentas de Qualidade e Análise Estática

### 3.1 `eslint.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/eslint.config.js`

**Propósito:** Configuração do ESLint (Flat Config) para JS, JSX, JSON, Markdown e CSS.

**Funcionalidades:** Regras por tipo de arquivo (JS geral, Cypress, React/JSX, Jest, k6, JSON, Markdown, CSS). Parser Babel para JSX. Globais específicos para cada contexto.


## 4. CI/CD e Automação (GitHub Actions)

### 4.1 `ci.yml`

**Localização:** `/home/qa/Projeto/Caminhar/ci.yml`

**Propósito:** CI básica: executa `npm run test:ci` em pushes e PRs para `main`/`master`.

---

### 4.2 `pr-coverage.yml`

**Localização:** `/home/qa/Projeto/Caminhar/pr-coverage.yml`

**Propósito:** Verificação de cobertura mínima de 20% em PRs. Inclui Knip, setup de PostgreSQL e Redis, Jest com cobertura, comentário automático no PR em falha.

---

### 4.3 `load-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/load-tests.yml`

**Propósito:** Execução diária (03:00 UTC) de testes de carga com k6. Inclui build, start da aplicação, orquestrador Node.js, validação de thresholds e upload de relatórios (retenção 30 dias).

---

### 4.4 `security-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/security-tests.yml`

**Propósito:** Testes de segurança com k6 (DDOS, Rate Limit, Login Negativo, IP Spoofing) em pushes e PRs para `main`.

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
| 13 | `eslint.config.js` | Qualidade | 🔴 Essencial |
| 14 | `jsconfig.json` | Qualidade | 🟡 Importante |
| 15 | `knip.json` | Qualidade | 🟡 Importante |
| 16 | `schema.knip.json` | Qualidade | ⚪ Acessório |
| 17 | `ci.yml` | CI/CD | 🔴 Essencial |
| 18 | `pr-coverage.yml` | CI/CD | 🟡 Importante |
| 19 | `load-tests.yml` | CI/CD | 🟡 Importante |
| 20 | `security-tests.yml` | CI/CD | 🟡 Importante |
| 21 | `README.md` | Documentação | 🔴 Essencial |
| 22 | `CHANGELOG.md` | Documentação | 🟡 Importante |
| 23 | `GEMINI.md` | Documentação | ⚪ Acessório |
| 24 | `tree.txt` | Documentação | ⚪ Acessório |
| 25 | `.gitignore` | Ambiente | 🔴 Essencial |
| 26 | `.clineignore` | Ambiente | ⚪ Acessório |
| 27 | `skills-lock.json` | Ambiente | ⚪ Acessório |
| 28 | `package-lock.json` | Lockfile | 🔴 Essencial |

---

### 3.2 `jsconfig.json`

**Localização:** `/home/qa/Projeto/Caminhar/jsconfig.json`

**Propósito:** Configuração de aliases de importação para o VS Code.

**Funcionalidades:** `baseUrl: "."`, `paths: { "@/*": ["./*"] }`, exclude `node_modules` e `.next`.

---

### 3.3 `knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/knip.json`

**Propósito:** Configuração do Knip para análise de código morto.

**Funcionalidades:** Ignora `tests`, `load-tests`, `scripts`, `examples`, `.agents`, `*.config.js`. Ignora binário `k6` e dependências específicas.

---

### 3.4 `schema.knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/schema.knip.json`

**Propósito:** JSON Schema de 986 linhas para validação do `knip.json`. Contém todas as definições de tipos, regras e plugins do Knip.

> ℹ️ Pode ser substituído pela referência ao schema oficial online.

---


## 4. CI/CD e Automação (GitHub Actions)

### 4.1 `ci.yml`

**Localização:** `/home/qa/Projeto/Caminhar/ci.yml`

**Propósito:** CI básica: executa `npm run test:ci` em pushes e PRs para `main`/`master`.

---

### 4.2 `pr-coverage.yml`

**Localização:** `/home/qa/Projeto/Caminhar/pr-coverage.yml`

**Propósito:** Verificação de cobertura mínima de 20% em PRs. Inclui Knip, setup de PostgreSQL e Redis, Jest com cobertura, comentário automático no PR em falha.

---

### 4.3 `load-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/load-tests.yml`

**Propósito:** Execução diária (03:00 UTC) de testes de carga com k6. Inclui build, start, orquestrador Node.js, validação de thresholds e upload de relatórios (30 dias).

---

### 4.4 `security-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/security-tests.yml`

**Propósito:** Testes de segurança com k6 (DDOS, Rate Limit, Login Negativo, IP Spoofing) em pushes e PRs para `main`.

---

## 5. Documentação e Contexto

### 5.1 `README.md`

**Localização:** `/home/qa/Projeto/Caminhar/README.md`

**Propósito:** Documento principal do repositório. Visão geral do projeto "Caminhar com Deus".

**Funcionalidades:** Descrição da plataforma, documentação de todas as áreas (raiz, componentes, páginas, hooks, lib, dados, exemplos, testes, mocks, E2E, carga, scripts), tabela de principais tecnologias.

---

### 5.2 `CHANGELOG.md`

**Localização:** `/home/qa/Projeto/Caminhar/CHANGELOG.md`

**Propósito:** Registro de alterações no formato Keep a Changelog, seguindo Semantic Versioning (versões 1.0.0 a 1.4.0).

---

### 5.3 `GEMINI.md`

**Localização:** `/home/qa/Projeto/Caminhar/GEMINI.md`

**Propósito:** Contexto para assistentes de IA. Referencia 10 skills de desenvolvimento Vercel em `.agents/skills/`.

> ⚪ Arquivo acessório, sem impacto direto no funcionamento do projeto.

---

### 5.4 `tree.txt`

**Localização:** `/home/qa/Projeto/Caminhar/tree.txt`

**Propósito:** Snapshot estático da estrutura de diretórios (1151 linhas, 182 diretórios, 967 arquivos).

> ⚪ Snapshot estático propenso a desatualização conforme o projeto evolui.

---

## 6. Configuração de Ambiente

### 6.1 `.gitignore`

**Localização:** `/home/qa/Projeto/Caminhar/.gitignore`

**Propósito:** Define padrões de arquivos/diretórios ignorados pelo Git: logs, cache, `.env`, `node_modules/`, `.next`, `coverage`, artefatos de build, etc.

---

### 6.2 `.clineignore`

**Localização:** `/home/qa/Projeto/Caminhar/.clineignore`

**Propósito:** Diretivas de ignore para o agente Cline no VS Code. Ignora `node_modules`, `.next`, `.env`, logs, `coverage`, `.git`, entre outros.

---

### 6.3 `skills-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/skills-lock.json`

**Propósito:** Lockfile de skills do agente de IA (~945 linhas). Registra mais de 80 skills com hashes criptográficos de verificação e suas fontes de origem.

> ⚪ Arquivo de ferramenta de IA, sem impacto no código da aplicação.

---

## 7. Lockfiles

### 7.1 `package-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/package-lock.json`

**Propósito:** Lockfile automático do npm (~606 KB). Fixa versões exatas de todas as dependências e sub-dependências (~16,7k linhas), garantindo reproducibilidade do ambiente.

> ℹ️ Gerado automaticamente pelo npm. Não deve ser editado manualmente.

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
| 13 | `eslint.config.js` | Qualidade | 🔴 Essencial |
| 14 | `jsconfig.json` | Qualidade | 🟡 Importante |
| 15 | `knip.json` | Qualidade | 🟡 Importante |
| 16 | `schema.knip.json` | Qualidade | ⚪ Acessório |
| 17 | `ci.yml` | CI/CD | 🔴 Essencial |
| 18 | `pr-coverage.yml` | CI/CD | 🟡 Importante |
| 19 | `load-tests.yml` | CI/CD | 🟡 Importante |
| 20 | `security-tests.yml` | CI/CD | 🟡 Importante |
| 21 | `README.md` | Documentação | 🔴 Essencial |
| 22 | `CHANGELOG.md` | Documentação | 🟡 Importante |
| 23 | `GEMINI.md` | Documentação | ⚪ Acessório |
| 24 | `tree.txt` | Documentação | ⚪ Acessório |
| 25 | `.gitignore` | Ambiente | 🔴 Essencial |
| 26 | `.clineignore` | Ambiente | ⚪ Acessório |
| 27 | `skills-lock.json` | Ambiente | ⚪ Acessório |
| 28 | `package-lock.json` | Lockfile | 🔴 Essencial |

