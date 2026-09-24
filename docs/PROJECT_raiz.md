# Documentação de Análise — Arquivos da Raiz do Projeto (`/`)

> **Data da análise:** 02/08/2026 — revisão completa em 23/09/2026
> **Objetivo:** Documentar os arquivos localizados na raiz do projeto `/home/gus/Projetos/Caminhar/`, descrevendo caminho exato, arquivos acionados/relacionados, propósito e funcionamento de cada um.
> **Escopo:** Apenas os **38 arquivos da raiz** (subpastas e seus arquivos não entram nesta análise; são citados apenas como referência quando acionados por um arquivo da raiz). Todos os arquivos da raiz foram lidos e analisados — incluindo `.env`, `.gitignore` e `.clineignore`, que uma análise anterior registrava como bloqueados e que estão acessíveis. Os valores reais do `.env` não são reproduzidos neste documento por conterem segredos.

---

## Índice

1. [Descrição Geral](#descrição-geral)
2. [Estrutura de Arquivos e Pastas](#estrutura-de-arquivos-e-pastas)
3. [Configuração Principal da Aplicação](#3-configuração-principal-da-aplicação)
4. [Configuração de Testes](#4-configuração-de-testes)
5. [Ferramentas de Qualidade e Análise Estática](#5-ferramentas-de-qualidade-e-análise-estática)
6. [CI/CD e Automação (GitHub Actions)](#6-cicd-e-automação-github-actions)
7. [Documentação e Contexto](#7-documentação-e-contexto)
8. [Arquivos Gerados (Saídas da Análise Estática)](#8-arquivos-gerados-saídas-da-análise-estática)
9. [Lockfiles](#9-lockfiles)
10. [Ferramentas de IA e Controle de Versão](#10-ferramentas-de-ia-e-controle-de-versão)
11. [Resumo dos Arquivos Analisados](#resumo-dos-arquivos-analisados)

---

## Descrição Geral

Este documento registra a análise individual de todos os arquivos localizados na raiz do projeto **Caminhar** — plataforma web de conteúdo católico construída em Next.js. A raiz concentra a configuração central da aplicação (manifesto, Next.js, middleware, ambiente), a configuração das suítes de teste (Jest, Cypress), as ferramentas de qualidade e análise estática (ESLint, Knip, dependency-cruiser), os workflows de CI/CD, a documentação de contexto e os artefatos gerados pelas ferramentas de análise.

A raiz do projeto concentra **38 arquivos** (excluindo subpastas). Eles se dividem em:

- **Configuração principal** — `package.json`, `next.config.js`, `next-sitemap.config.js`, `proxy.js`, `.env`, `.env.example`.
- **Configuração de testes** — `jest.config.base.js`, `jest.config.js`, `jest.config.db.js`, `jest.setup.js`, `jest.teardown.js`, `babel.jest.config.js`, `cypress.config.js`.
- **Qualidade/estática** — `eslint.config.js`, `jsconfig.json`, `knip.json`, `schema.knip.json`, `.dependency-cruiser.cjs`, `.dependency-cruiser.core.cjs`, `.dependency-cruiser.extras.cjs`, `.dependency-cruiser.isolados.cjs`.
- **CI/CD** — `ci.yml`, `load-tests.yml`, `security-tests.yml`.
- **Documentação/contexto** — `README.md`, `CHANGELOG.md`, `tree.txt`.
- **Arquivos gerados (análise estática)** — `estrutura.html`, `estrutura.txt`, `estrutura_extras.html`, `estrutura_extras.txt`, `estrutura_isolados.html`, `estrutura_isolados.txt`.
- **Lockfiles** — `package-lock.json`, `skills-lock.json`.
- **Ferramentas de IA e controle de versão** — `.ai-memory.toml`, `.clineignore`, `.gitignore`.

> **Nota sobre arquivos antes considerados bloqueados:** a análise anterior registrava `.env`, `.gitignore` e `.clineignore` como inacessíveis. Na análise atual os três estão acessíveis e foram analisados (seções 3.6, 10.3 e 10.2, respectivamente). Os valores reais das variáveis do `.env` não são reproduzidos neste documento.

---

## Estrutura de Arquivos e Pastas

Escopo da análise — somente os arquivos da raiz (as subpastas da raiz aparecem apenas para contexto e não foram analisadas aqui):

```text
/home/gus/Projetos/Caminhar/
├── .ai-memory.toml
├── .clineignore
├── .dependency-cruiser.cjs
├── .dependency-cruiser.core.cjs
├── .dependency-cruiser.extras.cjs
├── .dependency-cruiser.isolados.cjs
├── .env
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── README.md
├── babel.jest.config.js
├── ci.yml
├── cypress.config.js
├── eslint.config.js
├── estrutura.html
├── estrutura.txt
├── estrutura_extras.html
├── estrutura_extras.txt
├── estrutura_isolados.html
├── estrutura_isolados.txt
├── jest.config.base.js
├── jest.config.db.js
├── jest.config.js
├── jest.setup.js
├── jest.teardown.js
├── jsconfig.json
├── knip.json
├── load-tests.yml
├── next-sitemap.config.js
├── next.config.js
├── package-lock.json
├── package.json
├── proxy.js
├── schema.knip.json
├── security-tests.yml
├── skills-lock.json
└── tree.txt
```

Subpastas existentes na raiz (fora do escopo, citadas como contexto ao longo do documento): `.agents/`, `.claude/`, `.clinerules/`, `.github/`, `.next/`, `.vscode/`, `__mocks__/`, `components/`, `coverage/`, `coverage-db/`, `cypress/`, `data/`, `docs/`, `examples/`, `hooks/`, `lib/`, `load-tests/`, `logs/`, `node_modules/`, `pages/`, `public/`, `reports/`, `scripts/`, `tests/`, `utils/`.

---

## 3. Configuração Principal da Aplicação

### 3.1 `package.json`

**Nome do arquivo:** `package.json`

**Caminho:** `/home/gus/Projetos/Caminhar/package.json`

**Arquivos acionados/relacionados:** é o manifesto central — virtualmente todos os arquivos de configuração da raiz são acionados por seus scripts (`jest.config.js` via `test*`, `cypress.config.js` via `cypress*`, `eslint.config.js` via `lint*`, os três configs segmentados via `depcruise:*`, `scripts/` inteiro via `db:*`/`backup:*`/`seed:*`/`migrate`/etc., `next.config.js` via `dev`/`build`/`start`, `next-sitemap.config.js` via `postbuild`); `package-lock.json` trava suas versões; `.env`/`.env.example` (`check-env` via `scripts/check-env.js`).

**Resumo:** Manifesto do projeto (168 linhas). Define nome `caminhar`, versão `1.4.0`, descrição "Plataforma web de conteúdo católico com Next.js", `type: module` (ES Modules), engine **Node.js 24.19.0 / npm 12.0.2**, repositório `github.com/caminhar-deus/Caminhar`, licença ISC e autor "Comunidade Caminhar".

- **66 scripts** organizados em categorias: env/dev (`check-env`, `dev`, `build`, `postbuild`, `start`, `dev:clean`, `analyze`), lint (`lint`, `lint:log`, `lint:fix`, `lint:workflows`), knip (`knip`, `knip:watch`), diagnóstico (`diag:lsp`, `diag:reusable-workflow`), dependency-cruiser (`depcruise:core`/`extras`/`isolados`), testes Jest (`test`, `test:log`, `test:watch`, `test:coverage*`, `test:ci`, `test:db:container*`, `test:db:unit`), warm-up (`warm-routes`, `warm:api`, `precypress:run`), Cypress/E2E (`cypress:open`, `cypress:run`, `test:e2e`, `test:e2e:record`), banco (`db:init`, `db:status`, `db:shell`, `db:reset*`, `db:clean:test`, `db:clear*`), backup (`backup:init/create/restore/logs*`), seed/migrações (`seed:all`, `migrate*`), manutenção (`cache:clear`, `settings:update`, `validate-schema`, `monitor:disk`, `clean:reports`, `clean:images`), segurança (`security:check-sql*`), testes de carga (`test:load:all`, `test:load:all:log`, `test:load:orchestrator`, `test:load:safe`, `report:load`).
- **Dependências (18):** Next.js 16, React 19 (+ `react-dom`), `@next/env`, `@upstash/redis`, `bcryptjs`, `date-fns`, `dotenv`, `formidable`, `jsdom`, `jsonwebtoken`, `pg`, `prop-types`, `react-easy-crop`, `react-hot-toast`, `sharp`, `web-vitals`, `zod`.
- **DevDependencies (32):** Jest 30, Cypress 16, ESLint 10, Knip 6, Testing Library, Faker, Testcontainers, `dependency-cruiser`, `next-sitemap`, `esbuild`, `yaml`, pacotes `@actions/*` e `vscode-*` (diagnósticos de workflow), entre outros.
- **Overrides:** `tar`, `glob`, `minimatch`, `postcss`, `uuid`, `whatwg-encoding` — documentados via campo `_overridesReason`.
- **allowScripts:** permissão de scripts nativos para `sharp`, `cypress`, `ssh2`, `protobufjs`, `cpu-features`, `unrs-resolver` e `@parcel/watcher`.
- Detalhes de scripts relevantes: `test:e2e:record` exige `CYPRESS_RECORD_KEY`; `test:log`/`test:coverage:log`/`test:load:all:log`/`lint:log` usam `bash -c 'set -o pipefail; …'` para propagar exit code; `test:ci` usa `jest --ci --coverage --bail`; `test:db:unit` usa `--testPathPatterns` ancorado em `tests/unit/lib/db.test.js`; `test:load:orchestrator` delega a `test:load:all`.

---

### 3.2 `next.config.js`

**Nome do arquivo:** `next.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/next.config.js`

**Arquivos acionados/relacionados:** lido pelo Next.js em `dev`/`build`/`start` (scripts do `package.json`); variável `ALLOWED_ORIGINS` do `.env` (CORS); `proxy.js` (middleware complementar de rate limiting — este arquivo cuida de headers, aquele de proteção DDoS).

**Resumo:** Configuração principal do Next.js (123 linhas). Define: `serverExternalPackages: ['bcryptjs', 'jsonwebtoken']` (evita empacotamento desses módulos no servidor); customização do webpack que, em código cliente (`!isServer`), desabilita os módulos Node `fs`, `path`, `url` e `crypto` (fallback `false` — comentário do arquivo indica ser para builds não-Turbopack); e a função `headers()` com dois grupos:

- **Headers de segurança** para `/(.*)` (todas as rotas): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` e `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- **CORS** em 4 blocos, todos com métodos `GET, POST, PUT, DELETE, OPTIONS`, headers `Content-Type, Authorization, X-API-Key` e `Access-Control-Allow-Credentials: true`: `/api/:path*` (usa a lista completa de `ALLOWED_ORIGINS`) e `/api/admin/:path*`, `/api/auth/:path*`, `/api/helper/:path*` (restritos à **primeira** origem de `ALLOWED_ORIGINS`, via `split(',')[0]`).

> ⚠️ **Inconsistência de CORS (mantida):** o bloco `/api/:path*` usa a lista completa de origens, enquanto admin/auth/helper usam apenas a primeira — comportamento segmentado intencional ou não, segue como registrado na análise anterior, agora confirmado no código.

---

### 3.3 `next-sitemap.config.js`

**Nome do arquivo:** `next-sitemap.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/next-sitemap.config.js`

**Arquivos acionados/relacionados:** `lib/infra/logger.js` (importado para logging de erros); `lib/infra/db.js` (importado dinamicamente em `additionalPaths` para consultar o banco); `package.json` (script `postbuild` → `next-sitemap`, executado automaticamente após `npm run build`); variável `SITE_URL` do `.env` (com fallback `http://localhost:3000`).

**Resumo:** Configuração do plugin `next-sitemap` (113 linhas) para geração de sitemaps XML e `robots.txt` no pós-build. Define `siteUrl` a partir de `SITE_URL`. `robots.txt` com 3 políticas: User-Agent genérico `*` (bloqueia `/admin`, `/admin/*`, `/api/*`, `/_next/*`, `/404`, `/500`), `Googlebot` e `Bingbot` (acesso total exceto `/admin` e `/api/*`), além de sitemaps adicionais (`sitemap-musicas.xml`, `sitemap-videos.xml`). `exclude` cobre `/admin`, `/admin/*`, `/api/*`, `/_next/*`, `/404`, `/500` e `/server-sitemap.xml`. `autoLastmod: true`. A função `additionalPaths` gera paths dinâmicos consultando o banco (via `lib/infra/db.js`): posts publicados (`/blog/[slug]`, prioridade 0.8), músicas (`/musicas/[slug]`, 0.7) e vídeos (`/videos/[slug]`, 0.7), todos com `changefreq: weekly` e `lastmod` a partir de `updated_at`; erros são logados via `logger.error` (com TODO para integração futura com notificações). `onComplete` confirma a geração via `console.log`.

---

### 3.4 `proxy.js`

**Nome do arquivo:** `proxy.js`

**Caminho:** `/home/gus/Projetos/Caminhar/proxy.js`

**Arquivos acionados/relacionados:** `lib/cache/cache.js` (`checkRateLimit` — rate limit com Redis distribuído e fallback em memória); `lib/infra/logger.js` (`logger.warn` para eventos de segurança); `lib/api/helpers.js` (`detectSpoofedIP`); `next/server` (`NextResponse`); variáveis `NODE_ENV` e `ENABLE_STRICT_SPOOFING` do ambiente.

**Resumo:** Middleware global do Next.js 16 (convenção `proxy.js`, 109 linhas) para rate limiting e proteção DDoS — primeira camada de defesa, antes do handler da rota. Protege exclusivamente `/api/auth/login` (5 requisições por janela de 60s — `RATE_LIMIT_CONFIG` e `config.matcher: ['/api/auth/login']` no fim do arquivo), contra brute force. Identificação de IP: prioriza `X-Forwarded-For` quando o socket é localhost (desenvolvimento/teste com k6, que envia IP público simulado); caso contrário usa `request.ip`. Detecção de IP spoofing via `detectSpoofedIP` com `strictMode` dinâmico: `ENABLE_STRICT_SPOOFING=true` força o modo estrito; senão, modo estrito apenas em produção (`NODE_ENV === 'production'`) — em desenvolvimento fica desligado para evitar falsos positivos nos testes de carga. Respostas: **403** ("IP spoofing detectado") e **429** ("Muitas requisições. Tente novamente mais tarde."), ambas em português, com logging `logger.warn('Security', ...)`.

> ⚠️ **Rate limit centralizado nos handlers (mantido):** o middleware protege somente `/api/auth/login`; as rotas públicas de listagem/busca (posts, videos, musicas, products, dicas) são limitadas exclusivamente nos próprios handlers — o próprio comentário do arquivo registra que a duplicidade de contagem (middleware + handler, cada request contado 2x) foi removida.

---

### 3.5 `.env.example`

**Nome do arquivo:** `.env.example`

**Caminho:** `/home/gus/Projetos/Caminhar/.env.example`

**Arquivos acionados/relacionados:** `.env` (arquivo real cuja estrutura este template espelha — seção 3.6); `scripts/check-env.js` (script `check-env`, executado antes de `dev`, `build` e `start`, valida as variáveis obrigatórias); `.gitignore` (linha `!.env.example` garante que este arquivo seja versionado mesmo com `.env` e `.env.*` ignorados).

**Resumo:** Template versionado das variáveis de ambiente do projeto, com valores placeholder e comentários explicativos. Organiza as 11 variáveis em dois blocos:

- **Obrigatórias** (3): `DATABASE_URL` (conexão PostgreSQL, com exemplo para porta 5433), `JWT_SECRET` (chave de assinatura dos tokens JWT; o comentário recomenda `openssl rand -hex 32`), `BACKUP_ENCRYPTION_KEY` (chave de criptografia dos backups, 32 caracteres recomendados).
- **Opcionais** (8): `ADMIN_USERNAME`/`ADMIN_PASSWORD` (credenciais iniciais do administrador), `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (Redis para rate limiting persistente; sem elas o rate limit funciona em memória), `ADMIN_IP_WHITELIST` (IPs que nunca são bloqueados pelo middleware), `SITE_URL` (base para sitemap/SEO), `ALLOWED_ORIGINS` (CORS da API pública), `NODE_ENV` (`development`, `production` ou `test`).

> **Nuance confirmada na análise:** o bloco "Obrigatórias" do template lista 3 variáveis, mas `scripts/check-env.js` só exige `DATABASE_URL` e `JWT_SECRET` — `BACKUP_ENCRYPTION_KEY` só é exigida pelo fluxo de backups (`scripts/init-backup.js`).

---

### 3.6 `.env`

**Nome do arquivo:** `.env`

**Caminho:** `/home/gus/Projetos/Caminhar/.env`

**Arquivos acionados/relacionados:** `.env.example` (template versionado com a mesma estrutura); `scripts/check-env.js` (carrega o ambiente via `loadEnvConfig` do `@next/env` — a mesma lógica do Next.js — e valida as obrigatórias); `.gitignore` (ignora `.env` e `.env.*`; confirmado via `git check-ignore`: regra na linha 74). Arquivos da raiz que consomem essas variáveis: `package.json` (scripts), `next.config.js` (CORS/`ALLOWED_ORIGINS`), `proxy.js` (rate limit/Redis).

**Resumo:** Arquivo real de variáveis de ambiente (43 linhas, legível), contendo valores efetivos — incluindo segredos como credenciais de banco, chaves JWT/de criptografia e token do Redis. Define as mesmas 11 variáveis do `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_IP_WHITELIST`, `SITE_URL`, `ALLOWED_ORIGINS`, `NODE_ENV`. **Os valores não são reproduzidos neste documento** por razão de segurança. Não é versionado pelo Git.

---

## 4. Configuração de Testes

### 4.1 `jest.config.base.js`

**Nome do arquivo:** `jest.config.base.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.base.js`

**Arquivos acionados/relacionados:** `babel.jest.config.js` (referenciado em `transform` via `babel-jest` com `configFile`); importado por `jest.config.js` e `jest.config.db.js`; `package.json` (scripts `test`, `test:ci`, `test:db:container` usam indiretamente esta base).

**Resumo:** Configuração base compartilhada do Jest (28 linhas, ES Module). O cabeçalho documenta seu papel: propriedades comuns entre `jest.config.js` e `jest.config.db.js`, que importam este base e sobrescrevem/estendem conforme a necessidade. Define: `transform` (Babel via `babel-jest` apontando para `babel.jest.config.js`), `moduleNameMapper` com 6 aliases (`@/` → raiz, `@tests/` → `tests/`, `@factories/` → `tests/factories/`, `@helpers/` → `tests/helpers/`, `@mocks/` → `tests/mocks/`, `@matchers/` → `tests/matchers/`), `moduleFileExtensions` (`js`, `jsx`, `json`, `node`), `clearMocks: true`, `restoreMocks: true`, `verbose: true` e `maxWorkers: '50%'`.

---

### 4.2 `jest.config.js`

**Nome do arquivo:** `jest.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.js`

**Arquivos acionados/relacionados:** importa `jest.config.base.js`; `babel.jest.config.js` (via base); `tests/setup.js` (`setupFilesAfterEnv`); `jest.teardown.js` (`globalTeardown`); `__mocks__/styleMock.js` (mapper de CSS); `package.json` (scripts `test`, `test:log`, `test:coverage`, `test:ci`, `test:watch`, `test:db:unit`); `ci.yml` (executa `npm run test:ci`); `knip.json` (ignora este arquivo da análise de órfãos).

**Resumo:** Configuração principal do Jest (88 linhas) para testes unitários e de integração em ambiente `jsdom`. Estende a base e define: `testMatch: **/*.test.js`, `coverageProvider: 'v8'` (evita conflito com o plugin Istanbul do Babel), cobertura desativada por padrão (`collectCoverage: false` — ativada via CLI `--coverage` nos scripts `test:coverage`/`test:ci`), `collectCoverageFrom` restrito a `lib/`, `pages/api/` e `components/` (excluindo tests/coverage), `coverageReporters` text/lcov/html e **thresholds**: global branches 80/functions 85/lines 90/statements 90, mais grupos por diretório — `lib/domain/` (78/95/95/95), `pages/api/admin/` (80/95/90/90) e `components/Admin/fields/` (88/95/95/95). `transformIgnorePatterns` com exceções ESM para `node-mocks-http`, `@faker-js`, `url`, `pg`, `@upstash/redis`, `uncrypto`; `moduleNameMapper` estendido com `\.css$` → `__mocks__/styleMock.js`; timeout de 10s.

> ✅ **Divergência com o CHANGELOG resolvida:** o CHANGELOG da 1.4.0 registra thresholds "92/95/98/98", mas a configuração atual deste arquivo é 80/85/90/90 (global) — o registro do CHANGELOG é histórico do lançamento e não reflete a configuração vigente.

---

### 4.3 `jest.config.db.js`

**Nome do arquivo:** `jest.config.db.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.db.js`

**Arquivos acionados/relacionados:** importa `jest.config.base.js`; `tests/global-setup.db.js` (`globalSetup` — sobe o container PostgreSQL via Testcontainers); `tests/setup.db.js` (`setupFilesAfterEnv`); `jest.teardown.js` (`globalTeardown`); `package.json` (scripts `test:db:container` e `test:db:container:coverage`); devDependency `@testcontainers/postgresql`.

**Resumo:** Configuração dedicada do Jest (35 linhas) para testes de integração com PostgreSQL real via Testcontainers, em ambiente `node`. Executa apenas arquivos `**/*.db.test.js` com timeout de 30s. Cobertura desativada por padrão; quando ativada (`test:db:container:coverage`), grava em diretório próprio `coverage-db` (para não sobrescrever o relatório da suíte principal) e mede apenas `lib/domain/**` e `lib/infra/**` — as camadas exercitadas pelos testes com banco real, evitando relatório inflado. `transformIgnorePatterns` com exceção para `testcontainers`/`@testcontainers`.

---

### 4.4 `jest.setup.js`

**Nome do arquivo:** `jest.setup.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.setup.js`

**Arquivos acionados/relacionados:** `jest.config.js` (`setupFilesAfterEnv: tests/setup.js`); devDependencies `@testing-library/jest-dom` e `undici` (polyfills). Nota: o `jest.config.db.js` usa `tests/setup.db.js`, não este arquivo.

**Resumo:** Setup global da suíte Jest principal (26 linhas). Importa `@testing-library/jest-dom` (matchers como `.toBeInTheDocument()`), define `TextEncoder`/`TextDecoder` globais a partir do módulo `util` do Node (exigência do jsdom) e instala polyfills de `Request`/`Response`/`Headers` via `undici` (necessários para testes de middleware e API do Next.js), com `try/catch` silencioso caso o `undici` não esteja disponível. Termina com dois `console.log` de debug ("Jest setup running with ES modules", "Node.js version") que poluem a saída dos testes.

---

### 4.5 `jest.teardown.js`

**Nome do arquivo:** `jest.teardown.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.teardown.js`

**Arquivos acionados/relacionados:** `lib/infra/redis.js` (`getRedisInstance`), `lib/infra/db.js` (`closeDatabase`), `lib/cache/cache.js` (`cleanupRateLimitTimer`), `tests/helpers/async-polyfills.js` (`setupAsyncPolyfills`); referenciado como `globalTeardown` por `jest.config.js` e `jest.config.db.js`.

**Resumo:** Teardown global do Jest (51 linhas), compartilhado pelas duas suítes (principal e db). Na ordem: aguarda resolução dos polyfills assíncronos (`setupAsyncPolyfills`), limpa o timer periódico do cache em memória (`cleanupRateLimitTimer`), fecha a instância do Redis (`quit()`), encerra o pool PostgreSQL (`closeDatabase`), para o container de testes (`global.__TEST_DB_CONTAINER__.stop()`) e aguarda callbacks residuais com `Promise.race` entre `setImmediate` e timeout de segurança de 5s — cancelado via `clearTimeout` no `.finally()` assim que o race resolve, evitando que o timer pendente segure o processo do Jest. Erros são capturados com `console.warn` (não falham a suíte).

---

### 4.6 `babel.jest.config.js`

**Nome do arquivo:** `babel.jest.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/babel.jest.config.js`

**Arquivos acionados/relacionados:** `jest.config.base.js` (referencia este arquivo em `transform`, via `babel-jest`); `package.json` (devDependencies `@babel/preset-env`, `@babel/preset-react`); `@babel/plugin-transform-modules-commonjs` (plugin declarado).

**Resumo:** Configuração Babel exclusiva para os testes Jest (15 linhas, ES Module). Define dois presets — `@babel/preset-env` com `targets: { node: 'current' }` e `modules: 'auto'` (deixa o Jest controlar a transformação de módulos) e `@babel/preset-react` com `runtime: 'automatic'` — e o plugin `@babel/plugin-transform-modules-commonjs`, que converte os ES Modules do projeto para CommonJS durante os testes. Não afeta o build do Next.js, que usa seu próprio pipeline Babel/SWC.

---

### 4.7 `cypress.config.js`

**Nome do arquivo:** `cypress.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/cypress.config.js`

**Arquivos acionados/relacionados:** `cypress/support/e2e.js` (`supportFile` — comandos customizados e setup dos testes E2E); `package.json` (scripts `cypress:open`, `cypress:run`, `test:e2e`, `test:e2e:record`, `precypress:run`); `scripts/warm-routes.js` (pré-aquecimento executado antes de `cypress:run`); `cypress/e2e/` (os 5 specs de teste).

**Resumo:** Configuração do Cypress 16 para testes E2E (46 linhas). Define `projectId: 'kddcrf'` (necessário para o `--record` do Cypress Cloud), timeouts (comandos 10s, requisições 10s, carregamento de página 30s), retries (2 em modo `run`/CI, 0 em modo `open`), viewport 1280×720 e, no bloco `e2e`: `baseUrl: http://localhost:3000`, gravação de vídeo, screenshot automático em falha, `allowCypressEnv: false` (bloqueia acesso inseguro a `Cypress.env()` no navegador), `supportFile: cypress/support/e2e.js` e `setupNodeEvents` vazio (sem plugins registrados).

---

## 5. Ferramentas de Qualidade e Análise Estática

### 5.1 `eslint.config.js`

**Nome do arquivo:** `eslint.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/eslint.config.js`

**Arquivos acionados/relacionados:** `package.json` (scripts `lint`, `lint:log`, `lint:fix`; devDependencies `eslint`, `@eslint/js`, `@eslint/json`, `@eslint/markdown`, `@eslint/css`, `eslint-plugin-cypress`, `@babel/eslint-parser`, `globals`); `babel.jest.config.js` (compartilham `@babel/preset-react`).

**Resumo:** Configuração ESLint 10 em Flat Config (64 linhas, ES Module, via `defineConfig`). Define um bloco de ignores (`.next`, `out`, `build`, `reports`, `coverage`, `coverage-db`, `cypress/videos`, `cypress/screenshots`, `data`, `public/uploads`, `.agents`, `docs`, `package-lock.json`) e 11 blocos de regras por contexto: JS geral (browser+node, `no-unused-vars` warn com `argsIgnorePattern: ^_`), Cypress (globais `cy`/`Cypress`/`describe`/`context`/`beforeEach`/`afterEach`/`it`/`expect`/`assert`, plugin `eslint-plugin-cypress`, `no-unused-vars` off), JSX (componentes/pages/hooks/examples/tests-helpers, parser Babel com `preset-react` automatic, `gtag` readonly), setup/matchers/mocks de teste (globais jest), arquivos `.test.js` (jest + JSX via Babel), k6 load tests (globais `__ENV`/`__ITER`/`__VU`), JSON/jsonc/json5 (plugin `@eslint/json`), Markdown (commonmark) e CSS (plugin `@eslint/css`, com `css/no-invalid-properties` desligado).

---

### 5.2 `jsconfig.json`

**Nome do arquivo:** `jsconfig.json`

**Caminho:** `/home/gus/Projetos/Caminhar/jsconfig.json`

**Arquivos acionados/relacionados:** lido pelo VS Code (Language Server) e referenciado pelos quatro configs do dependency-cruiser (`options.tsConfig.fileName`); o alias `@/*` espelha o `moduleNameMapper` de `jest.config.base.js` e o `paths` de `knip.json`.

**Resumo:** Configuração do JavaScript Language Server (10 linhas). Define `baseUrl: "."` na raiz, o path alias `@/*` → `./*`, `ignoreDeprecations: "6.0"` e exclui `node_modules` e `.next`. Habilita IntelliSense com resolução de imports absolutos no editor — não afeta o build (o Next.js resolve os aliases nativamente).

---

### 5.3 `knip.json`

**Nome do arquivo:** `knip.json`

**Caminho:** `/home/gus/Projetos/Caminhar/knip.json`

**Arquivos acionados/relacionados:** `schema.knip.json` (referenciado em `$schema`); `package.json` (scripts `knip`, `knip:watch`; o Knip lê as dependências nele declaradas); `jsconfig.json` (o alias `@/*` espelha o deste arquivo).

**Resumo:** Configuração do Knip (28 linhas) para análise de código morto, dependências não utilizadas e arquivos órfãos. Define: `$schema` local (`./schema.knip.json`), path alias `@/*`, `ignore` para `tests/**`, `load-tests/**`, `scripts/**`, `examples/**`, `.agents/**`, `*.config.js` e `jest.setup.js`; `ignoreBinaries: []`; `ignoreDependencies` com 5 pacotes (`@faker-js/faker`, `@jest/reporters`, `babel-jest`, `jest-watch-typeahead`, `jsdom`); `ignoreExportsUsedInFile: true`; `treatConfigHintsAsErrors: true` e regra `duplicates: "off"`.

---

### 5.4 `schema.knip.json`

**Nome do arquivo:** `schema.knip.json`

**Caminho:** `/home/gus/Projetos/Caminhar/schema.knip.json`

**Arquivos acionados/relacionados:** `knip.json` (referencia este arquivo em `$schema` — é sua única razão de existir no projeto).

**Resumo:** JSON Schema (draft-07, 1161 linhas) com a definição completa da configuração do Knip — título "Knip configuration for JSON", descrição apontando para `https://github.com/webpro-nl/knip`. Estrutura: `allOf` (2 blocos), `definitions` (inclui `plugin` e `list`), 20 propriedades de topo (`ignoreDependencies`, `ignoreBinaries`, `ignoreExportsUsedInFile`, `ignoreIssues`, `include`, `exclude`, `preprocessor` etc.) e definições para **180 plugins** (Jest, Cypress, Next.js, ESLint, Vitest, Playwright, Astro, Babel, Biome etc.), cada um com link para `knip.dev/reference/plugins/...`. É uma cópia local do schema oficial — permite validação offline do `knip.json` no editor.

> ⚪ Arquivo acessório — pode ser substituído pela referência ao schema oficial online (`https://json.schemastore.org/knip.json`).

---

### 5.5 `.dependency-cruiser.cjs`

**Nome do arquivo:** `.dependency-cruiser.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.cjs`

**Arquivos acionados/relacionados:** `jsconfig.json` (referenciado em `options.tsConfig.fileName` para resolução dos aliases de path); `package.json` (o dependency-cruiser lê as dependências nele declaradas para as regras de `dependencyTypes`). Nenhum script npm referencia este arquivo — os scripts `depcruise:core`, `depcruise:extras` e `depcruise:isolados` usam as configurações segmentadas `.dependency-cruiser.core.cjs`, `.dependency-cruiser.extras.cjs` e `.dependency-cruiser.isolados.cjs`.

**Resumo:** Configuração genérica do `dependency-cruiser`, gerada pelo `depcruise --init` (o rodapé registra `dependency-cruiser@18.1.0 on 2026-07-25`). Define 12 regras `forbidden`: `no-circular` (warn), `no-orphans` (warn, com exceções para dot-files, `.d.ts`, `tsconfig.json` e configs de babel/webpack), `no-deprecated-core` (warn), `not-to-deprecated` (warn), `no-non-package-json` (error), `not-to-unresolvable` (error), `no-duplicate-dep-types` (warn), `not-to-test` (error), `not-to-spec` (error), `not-to-dev-dep` (error — código em `lib/` não pode depender de `devDependencies`), `optional-deps-used` (info) e `peer-deps-used` (warn). Em `options`: não segue `node_modules` (`doNotFollow`), detecta chamadas a `process.getBuiltinModule` (`detectProcessBuiltinModuleCalls: true`), usa `jsconfig.json` como `tsConfig`, aplica `skipAnalysisNotInRules: true` e define `reporterOptions` para os formatos dot/archi/text. Funciona como a configuração padrão assumida pelo dependency-cruiser quando executado sem `--config` (ex.: `npx depcruise .`); a análise segmentada por camadas do projeto é feita pelos três arquivos dedicados (seções 5.6 a 5.8).

---

### 5.6 `.dependency-cruiser.core.cjs`

**Nome do arquivo:** `.dependency-cruiser.core.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.core.cjs`

**Arquivos acionados/relacionados:** `package.json` (script `depcruise:core` → `depcruise --config .dependency-cruiser.core.cjs .`); `jsconfig.json` (`options.tsConfig.fileName`); arquivos irmãos da análise segmentada: `.dependency-cruiser.extras.cjs` e `.dependency-cruiser.isolados.cjs`.

**Resumo:** Configuração do `dependency-cruiser` para o contexto **CORE** da aplicação. O cabeçalho do arquivo declara: valida `pages`, `components`, `lib`, `hooks`, `data`, `utils`, `mocks` e `tests` (via `includeOnly: '^(pages|components|lib|hooks|data|utils|mocks|tests)'`), com o objetivo de garantir a hierarquia de camadas da aplicação. Contém as 12 regras genéricas do padrão (equivalentes às de `.dependency-cruiser.cjs`, com comentários adaptados ao projeto) e acrescenta: `no-mocks-in-production-code` (error — mocks nunca podem ser importados fora de `tests/`/`mocks/`) e cinco regras de camadas que codificam a arquitetura: `no-utils-importing-upper-layers` (error — `utils` não depende de `components`/`pages`/`hooks`/`lib`), `no-hooks-importing-ui` (error — `hooks` não depende de `components`/`pages`), `no-lib-importing-ui` (error — `lib` não depende de `components`/`pages`/`hooks`), `no-components-importing-pages` (error — `components` não depende de `pages`) e `no-data-importing-ui` (warn — `data` deveria ser consumido pela UI, não o contrário). Acionado por `npm run depcruise:core`.

---

### 5.7 `.dependency-cruiser.extras.cjs`

**Nome do arquivo:** `.dependency-cruiser.extras.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.extras.cjs`

**Arquivos acionados/relacionados:** `package.json` (script `depcruise:extras` → `depcruise --config .dependency-cruiser.extras.cjs .`); `jsconfig.json` (`options.tsConfig.fileName`); arquivos irmãos da análise segmentada: `.dependency-cruiser.core.cjs` e `.dependency-cruiser.isolados.cjs`.

**Resumo:** Configuração do `dependency-cruiser` para o contexto **EXTRAS**. O cabeçalho declara: valida `pages`, `components`, `lib`, `hooks`, `data`, `utils`, `mocks`, `tests`, `cypress`, `load-tests` e `scripts` (via `includeOnly`), com o objetivo de garantir que o app não seja "invadido" por dependências de teste/automação. Contém 14 regras `forbidden`: 6 genéricas (`no-circular` warn, `no-orphans` warn, `not-to-deprecated` warn, `no-non-package-json` error, `not-to-unresolvable` error, `no-duplicate-dep-types` warn) e 8 específicas — proteção do app contra os extras: `no-app-importing-cypress` (error — código de produção nunca pode depender de Cypress), `no-app-importing-load-tests` (error), `no-app-importing-scripts` (error), `no-mocks-in-production-code` (error — mocks só podem ser usados por `tests/`, `mocks/` ou `cypress/`), `not-to-spec` (error, com exceção para `cypress/` e `tests/`); camadas: `no-utils-importing-upper-layers` (error), `no-hooks-importing-ui` (error) e `no-lib-importing-ui` (error). Acionado por `npm run depcruise:extras`.

---

### 5.8 `.dependency-cruiser.isolados.cjs`

**Nome do arquivo:** `.dependency-cruiser.isolados.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.isolados.cjs`

**Arquivos acionados/relacionados:** `package.json` (script `depcruise:isolados` → `depcruise --config .dependency-cruiser.isolados.cjs .`); `jsconfig.json` (`options.tsConfig.fileName`); arquivos irmãos da análise segmentada: `.dependency-cruiser.core.cjs` e `.dependency-cruiser.extras.cjs`.

**Resumo:** Configuração do `dependency-cruiser` para o contexto **ISOLADOS**. O cabeçalho declara: valida apenas `cypress`, `load-tests` e `scripts` entre si (via `includeOnly: '^(cypress|load-tests|scripts)'`), sem tocar o app core, com o objetivo de evitar acoplamento indevido entre ferramentas auxiliares — por isso usa regras mais leves (warn). Contém 8 regras `forbidden`: 5 genéricas (`no-circular` warn, `no-orphans` warn, `not-to-deprecated` warn, `no-non-package-json` error, `not-to-unresolvable` error) e 3 de acoplamento entre ferramentas auxiliares: `no-cypress-importing-load-tests` (warn), `no-load-tests-importing-cypress` (warn) e `no-scripts-importing-cypress-or-load-tests` (warn — scripts de automação não deveriam depender de testes de fluxo ou de carga). Acionado por `npm run depcruise:isolados`.

---

## 6. CI/CD e Automação (GitHub Actions)

### 6.1 `ci.yml`

**Nome do arquivo:** `ci.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/ci.yml`

**Arquivos acionados/relacionados:** `.github/actions/setup/action.yml` (composite action local "Setup Node.js Environment", que executa `actions/setup-node@v4` com `cache: 'npm'` e `npm ci`; seu input `node-version` tem default `'24.15.0'`); `package.json` (executa `npm run test:ci` → `jest --ci --coverage --bail`); `package-lock.json` (usado pelo cache npm e pelo `npm ci`); `jest.config.js` (configuração usada pelo teste).

**Resumo:** Workflow "Node.js CI" (20 linhas) — a CI básica do projeto. Dispara em `push` e `pull_request` para as branches `main`/`master`, roda em `ubuntu-latest` com um único job `test`: checkout (`actions/checkout@v4`), setup do ambiente via composite action local `./.github/actions/setup` (Node.js com cache npm + `npm ci`) e execução de `npm run test:ci`.

> ⚠️ **Descoberta da análise (posição do arquivo):** este workflow está **na raiz do repositório**, mas o GitHub Actions só executa automaticamente workflows em `.github/workflows/`. Os únicos workflows nesse diretório são `pr-coverage.yml` e `test-base.yml`. O próprio `scripts/diagnostics/lint-workflows.sh` registra em comentário que `ci.yml`, `load-tests.yml` e `security-tests.yml` "ainda estão na raiz" e não são descobertos automaticamente nem pelo actionlint. Portanto, as três cópias na raiz **não são executadas pelo GitHub nesta localização** — para ativá-las seria necessário movê-las para `.github/workflows/`. Os arquivos são rastreados pelo Git (confirmado via `git ls-files`).

> ⚠️ **Divergência de versão do Node:** o default do input `node-version` da composite action `setup` é `24.15.0`, enquanto o `engines` do `package.json` exige `24.19.0` — o `ci.yml` não sobrescreve o input, de modo que a CI instalaria Node 24.15.0 se executada.

---

### 6.2 `load-tests.yml`

**Nome do arquivo:** `load-tests.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/load-tests.yml`

**Arquivos acionados/relacionados:** `.github/workflows/test-base.yml` (workflow reutilizável, chamado com `test-type: load` e `secrets: inherit`); `scripts/run-all-load-tests-sequentially.js` (orquestrador dos testes de carga, via `run-command`); `reports/k6-summaries/orchestrator-results.json` (lido na validação de thresholds via `jq`); `package.json` (script `test:load:all` equivalente local).

**Resumo:** Workflow "Load Tests (k6)" (79 linhas) para execução diária dos testes de carga. Dispara por agenda (`cron: '0 3 * * *'` — 03:00 UTC, madrugada no Brasil) e manualmente (`workflow_dispatch`). Estrutura em 2 jobs: `call-test-base` (delega serviços PostgreSQL/Redis e steps comuns ao workflow reutilizável `test-base.yml`, executando o orquestrador `scripts/run-all-load-tests-sequentially.js`) e `validate-and-report` (`needs: call-test-base`, `if: always()`), que valida os thresholds a partir de `reports/k6-summaries/orchestrator-results.json` (falha o job se `failed > 0`, listando os scripts com falha e exit code), faz upload dos relatórios de `reports/` como artefato `k6-load-test-reports` (retenção 30 dias) e emite notificação de violação de threshold em caso de falha.

> ⚠️ **Mesma ressalva de posição do `ci.yml` (seção 6.1):** este arquivo está na raiz do repositório, fora de `.github/workflows/` — o agendamento `cron` e o `workflow_dispatch` **não são ativados pelo GitHub nesta localização**. A chamada a `./.github/workflows/test-base.yml` em si é válida (o `test-base.yml` existe no diretório correto).

---

### 6.3 `security-tests.yml`

**Nome do arquivo:** `security-tests.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/security-tests.yml`

**Arquivos acionados/relacionados:** `.github/workflows/test-base.yml` (workflow reutilizável, chamado com `test-type: security` e `secrets: inherit`); scripts k6 em `load-tests/`: `ddos-search-test.js`, `rate-limit-test.js`, `login-negative-test.js`, `ip-spoofing-test.js`; `proxy.js` (alvo indireto dos testes de rate limit/spoofing).

**Resumo:** Workflow "Security Tests (k6)" (33 linhas) para testes de segurança. Dispara em `push` e `pull_request` para `main`, além de `workflow_dispatch` (execução manual). Estrutura em 2 jobs: `run-tests` (delega ao workflow reutilizável `test-base.yml` com `run-command` executando 4 scripts k6 de segurança — DDoS em busca, rate limit, login negativo e IP spoofing) e `upload-reports` (`needs: run-tests`, `if: always()`) que faz upload de `reports/k6-summaries/` como artefato `k6-security-test-reports` com retenção de 30 dias.

> ⚠️ **Mesma ressalva de posição dos demais workflows (seção 6.1):** este arquivo está na raiz, fora de `.github/workflows/` — os gatilhos `push`/`pull_request` **não são ativados pelo GitHub nesta localização**.

---

## 7. Documentação e Contexto

### 7.1 `README.md`

**Nome do arquivo:** `README.md`

**Caminho:** `/home/gus/Projetos/Caminhar/README.md`

**Arquivos acionados/relacionados:** referencia os documentos de análise da pasta `docs/` — `PROJECT_raiz.md` (este documento), `PROJECT_components.md`, `PROJECT_pages.md`, `PROJECT_hooks.md`, `PROJECT_lib.md`, `PROJECT_data.md`, `PROJECT_examples.md`, `PROJECT_tests.md`, `PROJECT_mocks.md`, `PROJECT_cypress.md`, `PROJECT_load-tests.md`, `PROJECT_scripts.md` — e os arquivos de configuração da raiz que resume (`package.json`, `next.config.js`, `next-sitemap.config.js`, `proxy.js`, `jest.config.js`, `jest.config.db.js`, `eslint.config.js`, `ci.yml`, `load-tests.yml`, `security-tests.yml`).

**Resumo:** Documento principal do repositório (265 linhas) — porta de entrada do projeto "Caminhar com Deus". Declara versão 1.4.0, engine Node.js 24.19.0/npm 12.0.2 (em conformidade com o `package.json`) e stack Next.js 16 + React 19. Estrutura-se em: visão geral do projeto (blog, músicas/Spotify, vídeos/YouTube, produtos/Mercado Livre-Shopee-Amazon, admin com CRUD reutilizável, autenticação JWT com RBAC, SEO, cache Redis, backup criptografado, 186 arquivos Jest, 5 specs Cypress, 37 arquivos de testes de carga, CI/CD com 5 workflows), resumo de cada área do projeto com link para o documento detalhado correspondente em `docs/`, e tabela de principais tecnologias.

> ⚠️ **Contagem desatualizada:** o README informa **"29 arquivos"** na raiz; a análise atual identifica **38**. As demais contagens conferem com os documentos de cada área (42 arquivos em páginas, 16 tabelas, 186 arquivos de teste).

> 📌 A seção **Dados** do README registra: 16 tabelas, **17 migrações** versionadas (000 a 017) e instrução de instalação limpa — a migração `000-create-base-schema` cria o schema base em banco vazio durante o `npm run migrate`. A referência anterior a `generateTokensCSS.js` foi removida do README; os Design Tokens continuam documentados (11 arquivos em `pages/DesignTokens/`, conforme `PROJECT_pages.md`).

---

### 7.2 `CHANGELOG.md`

**Nome do arquivo:** `CHANGELOG.md`

**Caminho:** `/home/gus/Projetos/Caminhar/CHANGELOG.md`

**Arquivos acionados/relacionados:** nenhum arquivo é acionado. Referencia conceitualmente os arquivos que documenta: `security-tests.yml`, `load-tests.yml` (workflow de carga), scripts de backup em `scripts/`, `proxy.js` (rate limiting do login), `next.config.js` (headers de segurança/CORS), `next-sitemap.config.js` (SEO/sitemaps) e componentes de UI.

**Resumo:** Registro de alterações do projeto (199 linhas), no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) com aderência ao Semantic Versioning (v2.0.0). Documenta 5 versões (`1.0.0`, `1.1.0`, `1.2.0`, `1.3.0`, `1.4.0`), com a mais recente sendo a **1.4.0 (2026-05-10)**. Cada versão organiza as mudanças em categorias (Adicionado, Melhorado, Segurança, SEO, Componentes UI, Corrigido etc.). Destaques da 1.4.0: sistema de testes de carga com k6 (28 scripts), workflow de segurança, sistema de backup com criptografia (gzip + AES-256-GCM + SHA-256, retenção de 10), rate limiting do login (5 tentativas/15 min com banimento progressivo), cache Redis com fallback local e autenticação JWT (1h, cookies httpOnly). O rodapé contém os links de comparação entre versões no GitHub. A versão 1.0.0 usa data placeholder (`2026-01-XX`) e registra o lançamento inicial (Next.js Pages Router, PostgreSQL, JWT+bcrypt, tema light/dark, integrações Spotify/YouTube/Mercado Livre).

> ⚠️ **Divergência com o `jest.config.js` (seção 4.2):** a 1.4.0 do CHANGELOG registra thresholds de cobertura "branches 92%, funções 95%, linhas 98%, statements 98%", mas a configuração vigente do `jest.config.js` é 80/85/90/90 (global). O registro do CHANGELOG é histórico do lançamento e não reflete a configuração atual.

---

### 7.3 `tree.txt`

**Nome do arquivo:** `tree.txt`

**Caminho:** `/home/gus/Projetos/Caminhar/tree.txt`

**Arquivos acionados/relacionados:** nenhum — é um snapshot estático da estrutura de diretórios, sem ser lido por nenhum script do projeto.

**Resumo:** Snapshot da saída do comando `tree` (1.263 linhas) da estrutura de diretórios do projeto, no formato com `├──`/`└──`. A última linha declara o total: **"201 directories, 1060 files"**. Inclui o próprio `tree.txt` na listagem. É um artefato de referência propenso a desatualização — a análise atual identifica 38 arquivos na raiz (o snapshot não inclui dotfiles como `.env`, `.gitignore` etc., pois o `tree` por padrão não os lista), e o momento da captura não é identificável no arquivo.

---

## 8. Arquivos Gerados (Saídas da Análise Estática)

### 8.1 `estrutura.txt` e `estrutura.html`

**Nome do arquivo:** `estrutura.txt` / `estrutura.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura.txt` / `/home/gus/Projetos/Caminhar/estrutura.html`

**Arquivos acionados/relacionados:** saídas do `dependency-cruiser` no contexto CORE — gerados a partir de `.dependency-cruiser.core.cjs` (script `npm run depcruise:core`); refletem as dependências dos arquivos sob `includeOnly` daquele config.

**Resumo:** Par texto+HTML do cruise CORE da aplicação. `estrutura.txt` (48 KB, 740 linhas) lista as dependências no formato `arquivo → dependência`, uma por linha, cobrindo 296 arquivos de origem em `tests` (398 arestas), `components` (172), `pages` (114), `lib` (44) e `hooks` (11). `estrutura.html` (5,1 MB) é a mesma matriz no formato interativo do dependency-cruiser (título "dependency-cruiser output"). A correspondência com o config CORE é observável pelo escopo: nenhuma dependência de `scripts/`, `load-tests/` ou `cypress/` aparece aqui (elas estão nos arquivos 8.2 e 8.3).

---

### 8.2 `estrutura_extras.txt` e `estrutura_extras.html`

**Nome do arquivo:** `estrutura_extras.txt` / `estrutura_extras.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_extras.txt` / `/home/gus/Projetos/Caminhar/estrutura_extras.html`

**Arquivos acionados/relacionados:** saídas do `dependency-cruiser` no contexto EXTRAS — geradas a partir de `.dependency-cruiser.extras.cjs` (script `npm run depcruise:extras`).

**Resumo:** Par texto+HTML do cruise EXTRAS. `estrutura_extras.txt` (60 KB, 924 linhas, 388 arquivos de origem) é **superconjunto exato de `estrutura.txt`**: contém as mesmas 740 arestas do CORE mais 184 adicionais, provenientes de `load-tests` (90), `scripts` (76), `tests` (16), `pages` (1 — `pages/api/admin/backups.js → scripts/backup.js`) e `cypress` (1). `estrutura_extras.html` (8,8 MB) é a versão interativa do mesmo cruise. A análise anterior registrava a diferença como apenas "backups.js e sub-dependências" — desatualizado: a diferença atual abrange todo o contexto de automação.

---

### 8.3 `estrutura_isolados.txt` e `estrutura_isolados.html`

**Nome do arquivo:** `estrutura_isolados.txt` / `estrutura_isolados.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_isolados.txt` / `/home/gus/Projetos/Caminhar/estrutura_isolados.html`

**Arquivos acionados/relacionados:** saídas do `dependency-cruiser` no contexto ISOLADOS — geradas a partir de `.dependency-cruiser.isolados.cjs` (script `npm run depcruise:isolados`).

**Resumo:** Par texto+HTML do cruise ISOLADOS (ferramentas auxiliares). `estrutura_isolados.txt` (11 KB, 161 linhas, 73 arquivos de origem) cobre exclusivamente `load-tests` (90 arestas), `scripts` (70) e `cypress` (1) — o contexto `includeOnly: '^(cypress|load-tests|scripts)'` do config isolados. `estrutura_isolados.html` (0,5 MB) é a versão interativa. Estes dois arquivos não constavam da análise anterior.

> ⚪ **Nota do grupo:** os seis arquivos são artefatos de análise estática, não fazem parte do código-fonte nem do build, mas **são versionados pelo Git** (confirmado via `git ls-files`). Regeneráveis pelos scripts `depcruise:*` do `package.json`.

---

## 9. Lockfiles

### 9.1 `package-lock.json`

**Nome do arquivo:** `package-lock.json`

**Caminho:** `/home/gus/Projetos/Caminhar/package-lock.json`

**Arquivos acionados/relacionados:** `package.json` (cujo manifesto trava); usado pelo `npm ci` (composite action `setup` dos workflows e instalações locais); `eslint.config.js` o ignora da lint; `knip.json` não o referencia.

**Resumo:** Lockfile do npm (17.452 linhas, ~630 KB, `lockfileVersion: 3`) com as versões exatas de todas as dependências — 1.215 entradas em `packages` (incluindo a raiz). Garante reprodutibilidade do ambiente e é a base do cache da CI (`cache: 'npm'`). Não editável manualmente.

---

### 9.2 `skills-lock.json`

**Nome do arquivo:** `skills-lock.json`

**Caminho:** `/home/gus/Projetos/Caminhar/skills-lock.json`

**Arquivos acionados/relacionados:** `.agents/skills/` (diretório das skills cujo estado este lockfile trava); ferramenta de gestão de skills do agente de IA (não faz parte do runtime da aplicação).

**Resumo:** Lockfile das skills do agente de IA (1.167 linhas, `version: 1`). Registra **225 skills** com `source`, `sourceType` (`github`) e `computedHash` SHA-256 para verificação de integridade. Fontes: `wshobson/agents` (151), `mattpocock/skills` (37), `anthropics/skills` (18), `nextlevelbuilder/ui-ux-pro-max-skill` (7), `vercel-labs/agent-skills` (7), `vercel-labs/next-skills` (3) e `supabase/agent-skills` (2).

> ⚪ Arquivo de ferramenta de IA, sem impacto no código da aplicação.

---

## 10. Ferramentas de IA e Controle de Versão

### 10.1 `.ai-memory.toml`

**Nome do arquivo:** `.ai-memory.toml`

**Caminho:** `/home/gus/Projetos/Caminhar/.ai-memory.toml`

**Arquivos acionados/relacionados:** nenhum arquivo do projeto é referenciado. O arquivo é lido pela ferramenta `ai-memory` (servidor MCP de memória de longo prazo usada pelos assistentes de IA) para associar este repositório ao seu workspace/projeto.

**Resumo:** Arquivo de configuração mínimo (2 linhas, 43 bytes) da ferramenta `ai-memory`. Define `workspace = "default"` e `project = "Caminhar"`, identificando este repositório como o projeto "Caminhar" dentro do workspace padrão da ferramenta. Não afeta o build, os testes ou o runtime da aplicação — é infraestrutura exclusiva dos assistentes de IA.

---

### 10.2 `.clineignore`

**Nome do arquivo:** `.clineignore`

**Caminho:** `/home/gus/Projetos/Caminhar/.clineignore`

**Arquivos acionados/relacionados:** nenhum arquivo é referenciado diretamente. Semanticamente espelha parte do `.gitignore` (seção 10.3), listando padrões de exclusão — mas para a ferramenta Cline (assistente de IA para IDE) em vez do Git.

**Resumo:** Lista de padrões de arquivos e diretórios que a ferramenta Cline deve ignorar ao ler o projeto, organizada em categorias: dependências (`node_modules`, `.pnpm`, `.yarn`, `bun.lockb`), artefatos de build (`.next`, `out`, `build`, `dist`), logs (`*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`), arquivos de ambiente (`.env`, `.env.local`, `.env.development`, `.env.production`), Git (`.git`, `.gitignore`), cobertura de testes (`coverage`, `.nyc_output`), caches (`.cache`, `.turbo`, `.vercel`) e arquivos de sistema operacional (`.DS_Store`, `Thumbs.db`). Evita que a ferramenta indexe conteúdo irrelevante ou sensível (como o `.env`).

---

### 10.3 `.gitignore`

**Nome do arquivo:** `.gitignore`

**Caminho:** `/home/gus/Projetos/Caminhar/.gitignore`

**Arquivos acionados/relacionados:** nenhum arquivo é acionado — é lido pelo próprio Git. Relaciona-se com `.env` (ignorado) e `.env.example` (mantido versionado pela exceção `!.env.example`); os padrões `logs`, `coverage`, `coverage-db` correspondem a diretórios gerados pelos scripts de `package.json` (`test:log`, `lint:log`, `test:coverage`, `test:db:container`).

**Resumo:** Lista de padrões de exclusão do Git (144 linhas), combinando entradas específicas do projeto com o template padrão de Node/Next.js. Entradas específicas do projeto no topo: logs gerados pelos scripts (`coverage-output.log`, `eslint.log`, `load-tests.log`, `tests-output.log`, diretório `logs/`, `*.log`), diretórios de cobertura (`coverage`, `coverage-db`, `*.lcov`, `.nyc_output`). Bloco dotenv: `.env`, `.env.*` com a exceção `!.env.example`. O restante segue o template padrão: `node_modules/`, artefatos de build (`.next`, `out`, `dist`, `build/Release`), caches de ferramentas (`.cache`, `.eslintcache`, `.parcel-cache`, `.turbo`, `.docusaurus`, `.firebase` etc.), saídas de outros frameworks (Nuxt, Gatsby, vuepress, vitepress, SvelteKit) e padrões Yarn v3/Vite. Confirmado em tempo de execução: `git check-ignore -v .env` aponta a regra `.gitignore:74:.env`.

---

## Resumo dos Arquivos Analisados

| # | Arquivo | Grupo | Seção | Relevância |
|---|---------|-------|-------|------------|
| 1 | `.ai-memory.toml` | Ferramentas de IA | 10.1 | ⚪ Acessório |
| 2 | `.clineignore` | Ferramentas de IA | 10.2 | ⚪ Acessório |
| 3 | `.dependency-cruiser.cjs` | Qualidade | 5.5 | ⚪ Acessório |
| 4 | `.dependency-cruiser.core.cjs` | Qualidade | 5.6 | 🟡 Importante |
| 5 | `.dependency-cruiser.extras.cjs` | Qualidade | 5.7 | 🟡 Importante |
| 6 | `.dependency-cruiser.isolados.cjs` | Qualidade | 5.8 | 🟡 Importante |
| 7 | `.env` | Config. Principal | 3.6 | 🔴 Essencial |
| 8 | `.env.example` | Config. Principal | 3.5 | 🟡 Importante |
| 9 | `.gitignore` | Controle de Versão | 10.3 | 🟡 Importante |
| 10 | `CHANGELOG.md` | Documentação | 7.2 | 🟡 Importante |
| 11 | `README.md` | Documentação | 7.1 | 🔴 Essencial |
| 12 | `babel.jest.config.js` | Testes | 4.6 | 🟡 Importante |
| 13 | `ci.yml` | CI/CD | 6.1 | 🔴 Essencial |
| 14 | `cypress.config.js` | Testes | 4.7 | 🟡 Importante |
| 15 | `eslint.config.js` | Qualidade | 5.1 | 🔴 Essencial |
| 16 | `estrutura.html` | Gerado | 8.1 | ⚪ Acessório |
| 17 | `estrutura.txt` | Gerado | 8.1 | ⚪ Acessório |
| 18 | `estrutura_extras.html` | Gerado | 8.2 | ⚪ Acessório |
| 19 | `estrutura_extras.txt` | Gerado | 8.2 | ⚪ Acessório |
| 20 | `estrutura_isolados.html` | Gerado | 8.3 | ⚪ Acessório |
| 21 | `estrutura_isolados.txt` | Gerado | 8.3 | ⚪ Acessório |
| 22 | `jest.config.base.js` | Testes | 4.1 | 🟡 Importante |
| 23 | `jest.config.db.js` | Testes | 4.3 | 🟡 Importante |
| 24 | `jest.config.js` | Testes | 4.2 | 🔴 Essencial |
| 25 | `jest.setup.js` | Testes | 4.4 | 🔴 Essencial |
| 26 | `jest.teardown.js` | Testes | 4.5 | 🔴 Essencial |
| 27 | `jsconfig.json` | Qualidade | 5.2 | 🟡 Importante |
| 28 | `knip.json` | Qualidade | 5.3 | 🟡 Importante |
| 29 | `load-tests.yml` | CI/CD | 6.2 | 🟡 Importante |
| 30 | `next-sitemap.config.js` | Config. Principal | 3.3 | 🟡 Importante |
| 31 | `next.config.js` | Config. Principal | 3.2 | 🔴 Essencial |
| 32 | `package-lock.json` | Lockfile | 9.1 | 🔴 Essencial |
| 33 | `package.json` | Config. Principal | 3.1 | 🔴 Essencial |
| 34 | `proxy.js` | Config. Principal | 3.4 | 🔴 Essencial |
| 35 | `schema.knip.json` | Qualidade | 5.4 | ⚪ Acessório |
| 36 | `security-tests.yml` | CI/CD | 6.3 | 🟡 Importante |
| 37 | `skills-lock.json` | Lockfile | 9.2 | ⚪ Acessório |
| 38 | `tree.txt` | Documentação | 7.3 | ⚪ Acessório |

> **Nota:** os três workflows de CI/CD da raiz (`ci.yml`, `load-tests.yml`, `security-tests.yml`) estão fora de `.github/workflows/` e por isso não são executados automaticamente pelo GitHub Actions nesta localização (ver seções 6.1–6.3). Os workflows ativos do repositório são `pr-coverage.yml` e `test-base.yml`, em `.github/workflows/` (subpasta, fora do escopo deste documento).
