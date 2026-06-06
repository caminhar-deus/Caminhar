# Documentação de Análise — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Esta documentação descreve todos os arquivos localizados na raiz do projeto `/home/qa/Projeto/Caminhar`. Cada entrada detalha a finalidade, o propósito e as principais características do arquivo.

---

## 1. `babel.jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/babel.jest.config.js`

**Propósito:** Configuração do Babel exclusiva para o ambiente de testes com Jest. Define os presets necessários para transpilar código ES Modules e JSX, garantindo compatibilidade com o Node.js e o React.

**Principais características:**
- Preset `@babel/preset-env` com target para Node.js atual
- Preset `@babel/preset-react` com runtime automático
- Plugin `@babel/plugin-transform-modules-commonjs` para conversão de ES Modules
- Configuração específica para ambiente de teste desabilitando conflitos com Istanbul

---

## 2. `ci.yml`

**Localização:** `/home/qa/Projeto/Caminhar/ci.yml`

**Propósito:** Workflow de Integração Contínua (CI) do GitHub Actions para executar testes automatizados em pushes e pull requests nas branches `main` e `master`.

**Principais características:**
- Executa em `ubuntu-latest` com Node.js 24.15.0
- Cache automático de dependências npm
- Executa o comando `npm run test:ci` para testes com cobertura

---

## 3. `cypress.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/cypress.config.js`

**Propósito:** Configuração do Cypress para testes end-to-end (E2E) da aplicação.

**Principais características:**
- Base URL apontando para `http://localhost:3000`
- Gravação de vídeo e screenshots em falhas ativados
- Sem arquivo de suporte global
- Estrutura preparada para plugins customizados via `setupNodeEvents`

---

## 4. `GEMINI.md`

**Localização:** `/home/qa/Projeto/Caminhar/GEMINI.md`

**Propósito:** Documento de contexto para instruções específicas de padrões de desenvolvimento Vercel, utilizado como referência para assistentes de IA (como o Gemini) durante o desenvolvimento.

**Principais características:**
- Referencia arquivos de skills em `.agents/skills/` (caminhos relativos)
- Skills incluem: Next.js, cache components, composition patterns, React best practices, Node.js backend patterns, Supabase, UI/UX, startup metrics e prompt engineering

---

## 5. `jest.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.config.js`

**Propósito:** Configuração principal do Jest para a suíte de testes do projeto. Define ambiente de teste, transformação de código, cobertura e mapeamento de módulos.

**Principais características:**
- Ambiente `jsdom` para testes de componentes React
- Transformação via Babel para arquivos `.js`, `.jsx`, `.mjs`, `.cjs`
- Cobertura com provider V8 (evitando conflitos com Istanbul)
- Thresholds mínimos: branches 80%, functions 85%, lines 90%, statements 90%
- Mapeamento de aliases: `@/` → raiz, `@tests/`, `@factories/`, `@helpers/`, `@mocks/`, `@matchers/`
- Timeout de 10s, verbose mode, maxWorkers: 1

---

## 6. `jest.setup.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.setup.js`

**Propósito:** Arquivo de setup global do Jest executado antes de todos os testes. Configura polyfills e dependências necessárias para o ambiente JSDOM.

**Principais características:**
- Importa `@testing-library/jest-dom` para matchers customizados
- Polyfill de `TextEncoder` e `TextDecoder`
- Polyfill de `ReadableStream` e `MessageChannel/MessagePort` do Node.js
- Polyfill de `localStorage`, `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo`, `crypto.randomUUID`
- Filtro de warnings conhecidos do `console.error` (React deprecations + API warnings)
- Cleanup automático pós-teste (`afterEach` com `cleanup()` e `jest.clearAllMocks()`)
- Log informativo sobre módulos ES e versão do Node.js
- Nota: Polyfill de `Request`/`Response`/`Headers` via `undici` foi **removido em 06/06/2026** — Node.js v24 + JSDOM já fornecem essas APIs nativamente

---

## 7. `jest.teardown.js`

**Localização:** `/home/qa/Projeto/Caminhar/jest.teardown.js`

**Propósito:** Arquivo de limpeza global executado após todos os testes do Jest. Responsável por fechar conexões com Redis e banco de dados PostgreSQL.

**Principais características:**
- Fecha conexão Redis via `redis.quit()`
- Fecha pool de conexões PostgreSQL via `closeDatabase()`
- Aguarda 1 segundo para finalização completa
- Tratamento de erros com `console.warn`

---

## 8. `jsconfig.json`

**Localização:** `/home/qa/Projeto/Caminhar/jsconfig.json`

**Propósito:** Configuração do JavaScript Language Server para o VS Code. Define paths e opções de compilação para IntelliSense.

**Principais características:**
- Path alias `@/*` mapeado para `./*`
- Base URL configurada como raiz do projeto
- Exclui `node_modules` e `.next` da análise

---

## 9. `knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/knip.json`

**Propósito:** Configuração da ferramenta Knip para análise de código morto, dependências não utilizadas e arquivos órfãos.

**Principais características:**
- Schema referenciado para validação do próprio JSON
- Ignora diretórios: `tests/`, `load-tests/`, `scripts/`, `examples/`, `styles/tokens/`, `.agents/`
- Ignora arquivos de configuração (`*.config.js`) e mocks
- Ignora dependências como `@babel/preset-env`, `@faker-js/faker`, `jsdom`
- Regra de duplicidade desligada

---

## 10. `load-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/load-tests.yml`

**Propósito:** Workflow do GitHub Actions para execução automatizada de testes de carga com k6, agendado diariamente ou manualmente.

**Principais características:**
- Agenda cron: diariamente às 03:00 UTC
- Serviços PostgreSQL 15 e Redis 7 Alpine
- Usa Composite Action `.github/actions/setup` para Node.js + cache npm
- Usa Composite Action `.github/actions/setup-db` para setup + seed do banco
- Build completo da aplicação Next.js com cache de build
- Executa `stress-test-combined.js` via k6
- Upload de relatórios como artefatos com retenção de 30 dias

---

## 11. `next-sitemap.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next-sitemap.config.js`

**Propósito:** Configuração do plugin `next-sitemap` para geração automática de sitemaps XML e `robots.txt` para SEO.

**Principais características:**
- Gera `sitemap.xml`, `robots.txt` e sitemaps adicionais para músicas e vídeos
- Políticas de `robots.txt` diferenciadas para Googlebot e Bingbot
- Páginas excluídas: `/admin`, `/api/*`, `/_next/*`
- Frequência e prioridade configuradas por path
- Paths dinâmicos: posts, músicas e vídeos do banco de dados
- Transform customizado por tipo de página

---

## 12. `next.config.js`

**Localização:** `/home/qa/Projeto/Caminhar/next.config.js`

**Propósito:** Configuração principal do Next.js. Define opções de runtime, webpack e headers de segurança/CORS.

**Principais características:**
- `serverExternalPackages`: bcryptjs, jsonwebtoken
- Configuração webpack com fallbacks para módulos Node.js em client-side
- Headers de segurança: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`
- CORS configurado para rotas `/api/*` com suporte a `ALLOWED_ORIGINS`

---

## 13. `package.json`

**Localização:** `/home/qa/Projeto/Caminhar/package.json`

**Propósito:** Manifesto principal do projeto Node.js. Define metadados, scripts, dependências e configurações de engine.

**Principais características:**
- **Nome:** `caminhar`, **versão:** `1.4.0`
- **Engine:** Node.js 24.15.0
- **Tipo ES Module** (`"type": "module"`)
- **Scripts principais:** dev, build, start, lint, test, cypress, backup, seed, migrações, testes de carga
- **Dependências principais:** Next.js 16, React 19, pg, bcryptjs, jsonwebtoken, zod, redis
- **DevDependências:** Jest 30, Cypress 15, Babel, Testing Library, Faker, Knip
- **Overrides:** tar, glob, minimatch, postcss, uuid, whatwg-encoding

---

## 14. `pr-coverage.yml`

**Localização:** `/home/qa/Projeto/Caminhar/pr-coverage.yml`

**Propósito:** Workflow do GitHub Actions que verifica cobertura de testes em Pull Requests, garantindo mínimo de 20% de cobertura.

**Principais características:**
- Executa em PRs para branch `main`
- Serviços PostgreSQL 15 e Redis 7 Alpine
- Usa Composite Action `.github/actions/setup` para Node.js + cache npm
- Usa Composite Action `.github/actions/setup-db` para setup do banco
- Remove comentários antigos de cobertura antes de postar novos
- Executa Knip para análise de código morto
- Posta comentário automático no PR em caso de falha
- Faz upload do relatório HTML de cobertura

---

## 15. `rate-limit-proxy.js`

**Localização:** `/home/qa/Projeto/Caminhar/rate-limit-proxy.js`

**Propósito:** Middleware de Rate Limiting para proteção contra ataques de força bruta na rota de login. Implementa controle de tentativas com fallback entre Redis e memória local.

**Principais características:**
- Limite: 5 tentativas por IP a cada 15 minutos
- Whitelist permanente para IPs locais (127.0.0.1, ::1, localhost)
- Whitelist configurável via variável de ambiente `ADMIN_IP_WHITELIST`
- Whitelist dinâmica via Redis
- Duas estratégias: Redis (persistente) e Map em memória (fallback)
- Sistema de banimento progressivo com multiplicador de tempo
- Notificação webhook para bloqueios recorrentes (3+ vezes)
- Matcher configurado apenas para rota `/api/auth/login`

---

## 16. `schema.knip.json`

**Localização:** `/home/qa/Projeto/Caminhar/schema.knip.json`

**Propósito:** Schema JSON Schema (draft-07) para validação da configuração do Knip. Arquivo de suporte para garantir que `knip.json` esteja corretamente formatado.

**Principais características:**
- Schema de validação completo do Knip
- Define tipos aceitos para todas as propriedades de configuração
- Inclui plugins suportados pelo Knip (Jest, Cypress, Next.js, etc.)
- Estrutura de workspace e regras de análise

---

## 17. `security-tests.yml`

**Localização:** `/home/qa/Projeto/Caminhar/security-tests.yml`

**Propósito:** Workflow do GitHub Actions para execução automatizada de testes de segurança com k6, incluindo testes de DDoS, Rate Limit, Login Negativo e IP Spoofing.

**Principais características:**
- Executa em pushes/PRs para `main` e manualmente
- Serviços PostgreSQL 15 e Redis 7 Alpine
- Usa Composite Action `.github/actions/setup` para Node.js + cache npm (Node.js 24.15.0)
- Usa Composite Action `.github/actions/setup-db` para setup + seed do banco
- Build completo da aplicação
- Testes executados: DDOS Search, Rate Limit, Login Negative, IP Spoofing
- Upload de relatórios com retenção de 30 dias

---

## 18. `skills-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/skills-lock.json`

**Propósito:** Lockfile de skills do agente, contendo registros de todas as skills instaladas com seus hashes de verificação e fontes.

**Principais características:**
- Versionamento de skills (versão 1)
- Skills de múltiplas fontes: `anthropics/skills`, `wshobson/agents`, `vercel-labs`, `supabase`, `nextlevelbuilder`
- Cada skill possui hash computado para verificação de integridade
- Mais de 80 skills registradas

---

## 19. `tree.txt`

**Localização:** `/home/qa/Projeto/Caminhar/tree.txt`

**Propósito:** Snapshot da estrutura de diretórios do projeto, gerado pelo comando `tree` para referência rápida da organização dos arquivos.

**Principais características:**
- Lista completa da hierarquia de diretórios
- Inclui todas as pastas e subpastas do projeto
- Arquivo auxiliar para documentação e onboarding

---

## 20. `package-lock.json`

**Localização:** `/home/qa/Projeto/Caminhar/package-lock.json`

**Propósito:** Lockfile automático do npm que fixa as versões exatas de todas as dependências instaladas, garantindo reproducibilidade do ambiente.

**Principais características:**
- Gerado automaticamente pelo npm
- Versões exatas de todas as dependências e sub-dependências
- Utilizado nos workflows CI para `npm ci`

---

## 21. `CHANGELOG.md` (não lido, mas presente na `tree.txt`)

**Localização:** `/home/qa/Projeto/Caminhar/CHANGELOG.md`

**Propósito:** Documento de registro de alterações do projeto, listando versões e mudanças implementadas ao longo do tempo. (Arquivo não analisado em detalhes.)

---

## 22. `README.md` (não lido, mas presente na `tree.txt`)

**Localização:** `/home/qa/Projeto/Caminhar/README.md`

**Propósito:** Documento de README padrão do repositório, contendo informações sobre o projeto, instruções de instalação e uso. (Arquivo não analisado em detalhes.)

---

## 23. `.github/actions/setup-db/action.yml`

**Localização:** `/home/qa/Projeto/Caminhar/.github/actions/setup-db/action.yml`

**Propósito:** Composite Action do GitHub Actions para setup do banco de dados de teste, utilizado pelos workflows `load-tests.yml`, `pr-coverage.yml` e `security-tests.yml`.

**Principais características:**
- Executa `npm run setup:test-db` para criar tabelas do banco
- Executa `node scripts/seed-all.js` condicionalmente (via input `seed`)
- Substitui comandos inline que estavam duplicados em 3 workflows
- Inputs: `seed` (boolean, default `false`) — executa seed do banco quando `true`

---

## 24. `.github/actions/setup/action.yml`

**Localização:** `/home/qa/Projeto/Caminhar/.github/actions/setup/action.yml`

**Propósito:** Composite Action do GitHub Actions para setup do Node.js com cache npm e instalação de dependências, utilizado por todos os workflows do projeto.

**Principais características:**
- Versão do Node.js parametrizada via input (padrão: `24.15.0`)
- Cache automático de dependências npm
- Executa `npm ci` para instalação limpa e reproduzível
- Remove duplicação de configuração entre os 4 workflows do projeto
