# 🏞️ Caminhar com Deus

**Versão:** 1.4.0 | **Engine:** Node.js 24.15.0 | **Stack:** Next.js 16 + React 19

Plataforma web completa para compartilhamento de conteúdo gospel, incluindo blog com artigos, músicas com integração Spotify, vídeos com integração YouTube, produtos com integração Mercado Livre e sistema administrativo completo.

---

## Índice

- [Visão Geral do Projeto](#visão-geral-do-projeto)
- [Documentação do Projeto](#documentação-do-projeto)
  - [📁 Raiz do Projeto](#-raiz-do-projeto)
  - [🧩 Componentes](#-componentes)
  - [📄 Páginas](#-páginas)
  - [🪝 Hooks](#-hooks)
  - [📚 Biblioteca (lib)](#-biblioteca-lib)
  - [🗄️ Dados](#️-dados)
  - [📋 Exemplos](#-exemplos)
  - [🧪 Testes](#-testes)
  - [🎭 Mocks](#-mocks)
  - [🤖 Testes E2E (Cypress)](#-testes-e2e-cypress)
  - [⚡ Testes de Carga](#-testes-de-carga)
  - [🔧 Scripts](#-scripts)
- [Principais Tecnologias](#principais-tecnologias)

---

## Visão Geral do Projeto

O **Caminhar com Deus** é uma aplicação web desenvolvida com Next.js (Pages Router) que serve como plataforma de conteúdo cristão. O projeto conta com:

- **Blog** com artigos, categorias e tags
- **Seção de Músicas** integrada ao Spotify
- **Seção de Vídeos** integrada ao YouTube
- **Seção de Produtos** integrada ao Mercado Livre
- **Painel Administrativo** completo com CRUD para todos os recursos
- **Sistema de Autenticação** com JWT e controle de acesso baseado em papéis (RBAC)
- **SEO completo** com Open Graph, Twitter Cards e Schema.org JSON-LD
- **Testes automatizados** com ~157 arquivos de teste (unitários, integração, E2E e carga)
- **CI/CD** com GitHub Actions (3 workflows: CI, cobertura em PRs, testes de carga)
- **Cache** com Redis (Upstash) + fallback em memória local
- **Backup automatizado** com criptografia AES-256-GCM e compressão gzip

---

## Documentação do Projeto

A pasta [`/docs`](/docs) contém documentos detalhados de análise para cada área do projeto. Abaixo, um resumo de cada um.

---

### 📁 Raiz do Projeto

**Arquivo:** [`docs/PROJECT_raiz.md`](/docs/PROJECT_raiz.md)

Documentação completa de todos os **22 arquivos** localizados na raiz do projeto. Inclui:

- **`next.config.js`** — Configuração principal do Next.js com headers de segurança e CORS
- **`package.json`** — Manifesto do projeto (scripts, dependências, engine Node.js 24.15.0)
- **`jest.config.js`** — Configuração do Jest com thresholds de cobertura (branches 92%, functions 95%, lines 98%)
- **`cypress.config.js`** — Configuração do Cypress para testes E2E
- **`ci.yml`** / **`pr-coverage.yml`** / **`load-tests.yml`** / **`security-tests.yml`** — Workflows do GitHub Actions
- **`rate-limit-proxy.js`** — Middleware de rate limiting para proteção contra força bruta
- **`next-sitemap.config.js`** — Geração automática de sitemaps XML para SEO
- **`knip.json`** — Análise de código morto e dependências não utilizadas
- **`babel.jest.config.js`** — Configuração Babel exclusiva para testes com Jest
- **`jsconfig.json`** — Configuração de aliases de importação para o VS Code
- **`styleMock.js`** — Mock para arquivos CSS nos testes Jest
- **`GEMINI.md`** — Documento de contexto para assistentes de IA
- **`skills-lock.json`** — Lockfile de skills do agente (80+ skills registradas)
- **`tree.txt`** — Snapshot da estrutura de diretórios do projeto

---

### 🧩 Componentes

**Arquivo:** [`docs/PROJECT_components.md`](/docs/PROJECT_components.md)

Análise detalhada de todos os componentes React organizados em 6 categorias:

1. **Admin** — `AdminCrudBase` (CRUD genérico reutilizável), `AdminMusicas` (integração Spotify), `AdminVideos` (integração YouTube), `AdminPosts` (slug automático, upload), `AdminProducts` (integração Mercado Livre), `AdminUsers`, `AdminRolesTab`, `AdminDashboard`, `AdminAudit`, `AdminDicas`, `withAdminAuth`
2. **Features** — `BlogSection`, `PostCard`, `MusicGallery`, `MusicCard`, `MusicPlayer`, `VideoSection`, `VideoCard`, `VideoPlayer`, `ContentTabs`, `Testimonials`, `ProductCard`, `ProductList`
3. **Layout** — `Container`, `Grid`, `Sidebar`, `Stack`, `Footer`, `Header`, `Layout`
4. **Performance** — `ImageOptimized` (lazy loading, srcset, placeholder blur), `LazyIframe`, `PreloadResources`, `CriticalCSS`
5. **SEO** — `SEOHead`, `ArticleSchema`, `BreadcrumbSchema`, `MusicSchema`, `VideoSchema`, `OrganizationSchema`, `WebsiteSchema`
6. **UI** — `Alert`, `Badge`, `Button`, `Card`, `Input`, `Modal`, `Select`, `Spinner`, `TextArea`, `Toast`

---

### 📄 Páginas

**Arquivo:** [`docs/PROJECT_pages.md`](/docs/PROJECT_pages.md)

Análise das **55 páginas** da aplicação Next.js (Pages Router):

- **`_app.js`** — Componente raiz com estilos globais e Toaster (react-hot-toast)
- **`_document.js`** — HTML customizado com preconnect para Google Fonts, YouTube, Spotify; pré-carregamento de fontes (Montserrat, Inter); CSS crítico inline
- **`index.js`** — Página inicial com hero image, ContentTabs e Testimonials
- **`[slug].js`** — Página dinâmica de posts com SEO completo (Open Graph, Twitter Cards)
- **`admin.js`** — Painel administrativo com proteção de autenticação
- **`design-system.js`** — Página de documentação visual dos componentes
- **Rotas de API** — ~49 endpoints organizados em: api/ (públicos), api/admin/ (administrativos), api/auth/ (autenticação), api/v1/ (API versão 1)

---

### 🪝 Hooks

**Arquivo:** [`docs/PROJECT_hooks.md`](/docs/PROJECT_hooks.md)

Documentação dos **8 hooks customizados** do projeto:

| Hook | Função |
|------|--------|
| `useTheme` | Gerenciamento de tema light/dark com tokens de design |
| `useAuth` | Contexto global de autenticação (user, login, logout) |
| `useAdminAuth` | Autenticação específica do admin com redirect via `next/router` |
| `useAdminCrud` | CRUD reutilizável para painéis admin com `react-hot-toast` |
| `useApiFetch` | Hook genérico de fetch com loading, error e cache |
| `useDebounce` | Hook utilitário de debounce (default 300ms) |
| `usePerformanceMetrics` | Monitoramento de Core Web Vitals com `web-vitals` |
| `index.js` | Barrel file que centraliza e reexporta todos os hooks |

---

### 📚 Biblioteca (lib)

**Arquivo:** [`docs/PROJECT_lib.md`](/docs/PROJECT_lib.md)

Análise completa da pasta `lib/`, dividida em 4 grupos:

1. **Infraestrutura (raiz):**
   - `auth.js` — Autenticação: bcryptjs para hash de senhas, JWT (1h expiração), cookies httpOnly, middleware `withAuth()`
   - `cache.js` — Cache com Redis (Upstash) + fallback local (Cache-Aside, rate limit distribuído, métricas)
   - `crud.js` — Operações CRUD genéricas com SQL parametrizado e proteção contra SQL injection
   - `db.js` — Pool PostgreSQL (pg.Pool) com lazy initialization, suporte a transações, health check
   - `middleware.js` — Middlewares: CORS, logging, validação de token, rate limit
   - `redis.js` — Cliente Redis com reconexão automática e fallback

2. **API** — Classes de erro personalizadas, helpers de resposta, middlewares de validação, schemas Zod

3. **Domínio** — Lógica de negócio para posts (slug, sanitização), músicas (validação Spotify), vídeos (validação YouTube), produtos, imagens

4. **SEO** — Schemas JSON-LD (Article, Breadcrumb, Organization, Video, Music, Website), geração de meta tags Open Graph e Twitter Cards, estratégias de crawling

---

### 🗄️ Dados

**Arquivo:** [`docs/PROJECT_data.md`](/docs/PROJECT_data.md)

Análise da estrutura de dados do projeto:

- **Bancos de Dados:**
  - **SQLite** (`/data/caminhar.db`) — Banco principal para desenvolvimento local
  - **PostgreSQL 16.13** — Banco de produção (evidenciado por backups `.sql.gz`)

- **9 tabelas SQLite:** `users`, `settings`, `images`, `categories`, `tags`, `posts`, `post_categories`, `post_tags`, `site_settings`

- **Backups:**
  - Diretório `/data/backups/` com dumps PostgreSQL (gzip) + exportações JSON + logs
  - Sistema de criptografia AES-256-GCM, compressão gzip, verificação SHA-256
  - Retenção configurável de 10 backups, agendamento cron
  - Migrações versionadas com rastreamento de schema e rollback

---

### 📋 Exemplos

**Arquivo:** [`docs/PROJECT_examples.md`](/docs/PROJECT_examples.md)

Análise dos **4 arquivos de exemplo** na pasta `/examples/`, que servem como documentação viva e referência de boas práticas:

1. **`blog-post-seo-example.js`** (242 linhas) — Exemplo completo de SEO para página de post: SEOHead, 3 schemas JSON-LD (Article, Organization, Breadcrumb), breadcrumb visual com microdados, ImageOptimized, LazyIframe, usePerformanceMetrics, botões de compartilhamento social, SSG/ISR com getStaticProps/getStaticPaths

2. **`homepage-seo-example.js`** (61 linhas) — SEO para página inicial: meta tags básicas, OrganizationSchema e WebsiteSchema, ImageOptimized com flag critical/priority, PreloadResources

3. **`musicas-seo-example.js`** (59 linhas) — SEO para seção de músicas: MusicSchema com track list e integração Spotify

4. **`videos-seo-example.js`** (57 linhas) — SEO para seção de vídeos: VideoSchema com thumbnail, duração e data de publicação

---

### 🧪 Testes

**Arquivo:** [`docs/PROJECT_tests.md`](/docs/PROJECT_tests.md)

Documentação completa da suíte de testes do projeto, com **~157 arquivos de teste**:

- **Configuração Global:** `setup.js` com polyfills (TextEncoder, ReadableStream, Request/Response, IntersectionObserver, ResizeObserver, crypto.randomUUID), React Testing Library com timeout 5s
- **Infraestrutura:**
  - Factories: post, music, video, user (geração de dados de teste)
  - Helpers: api.js (mocks HTTP), auth.js (tokens JWT), render.js (providers)
  - Matchers customizados: toBeISODate, toBeValidJSON, toHaveHeader, toHaveProperties, toHaveStatus
  - Mocks globais: db.js (banco de dados), fetch.js (API), next.js (requisições/respostas)
- **Testes de Integração (39 arquivos):** CRUD de posts, músicas, vídeos, produtos, dicas, auditoria, backups, configurações, login/logout, rate limit, upload de imagens, API v1
- **Testes Unitários (~96 arquivos):** Todos os componentes (Admin, Features, Layout, Performance, SEO, UI, Products), lógica de domínio (posts, settings, videos), bibliotecas (auth, cache, crud, db, middleware, redis, api, backup), scripts, edge cases de API
- **Thresholds de cobertura:** branches 92%, functions 95%, lines 98%, statements 98%

---

### 🎭 Mocks

**Arquivo:** [`docs/PROJECT_mocks.md`](/docs/PROJECT_mocks.md)

Análise dos **3 mocks manuais do Jest** na pasta `__mocks__/`:

1. **`cookie.js`** — Mock da biblioteca `cookie` (npm): simula funções `serialize` (concatena atributos HttpOnly, Secure, SameSite, Max-Age, Path) e `parse` (decodifica cabeçalhos Cookie)
2. **`pg.js`** — Mock completo do módulo `pg`: simula `Pool` com `query()`, `connect()`, `release()`; suporta transações com `BEGIN`, `COMMIT`; simula erros de conexão; configuração de latência e fail rate
3. **`styleMock.js`** — Mock para arquivos `.css` que retorna objeto vazio para testes Jest
4. **Mocks globais em `/tests/mocks/`**: db.js, fetch.js, next.js

---

### 🤖 Testes E2E (Cypress)

**Arquivo:** [`docs/PROJECT_cypress.md`](/docs/PROJECT_cypress.md)

Análise da estrutura de testes end-to-end com Cypress:

- **Configuração:** Base URL `http://localhost:3000`, gravação de vídeo e screenshots em falhas ativados
- **Estado atual:** Escopo reduzido — único arquivo de teste (`cypress/e2e/image_zoom.cy.js`, 57 linhas)
- **Cobertura do teste:** Funcionalidade de zoom de imagem (lightbox) em posts do blog
- **Padrões utilizados:** Mock de API via `cy.intercept()`, `cy.visit()` com query params, `cy.get()` com seletores de dados, asserções de visibilidade e atributos
- **Ausências notáveis:** Sem pastas `support/`, `fixtures/` ou `plugins/` — estrutura mínima
- **Áreas não testadas:** CRUD admin, autenticação, formulários, navegação, busca, responsividade, SEO

---

### ⚡ Testes de Carga

**Arquivo:** [`docs/PROJECT_load-tests.md`](/docs/PROJECT_load-tests.md)

Documentação completa da suíte de **28 scripts de teste de carga** utilizando **k6** (Grafana Labs):

| Categoria | Qtd | Descrição |
|-----------|:---:|-----------|
| Músicas | 6 | CRUD, filtro, paginação, busca, ordenação, carga |
| Vídeos | 6 | CRUD, filtro, paginação, validação, ordenação, carga |
| Posts/Blog | 4 | Paginação com cursor, tags, busca de conteúdo, criação de post |
| Autenticação/Segurança | 4 | Login negativo, rate limit, IP spoofing, DDoS |
| Saúde/Recuperação | 3 | Health check, backup, recovery |
| Cache | 2 | Headers de cache, performance de cache |
| Fluxos Combinados | 2 | Stress test combinado, upload flow |

- **Automação CI/CD:** Workflow `load-tests.yml` com execução diária (03:00 UTC) via GitHub Actions
- **Serviços:** PostgreSQL 15 e Redis 7 Alpine
- **Relatórios:** Upload como artefatos com retenção de 30 dias
- **Métricas monitoradas:** Taxa de requisições, tempo de resposta, erros, vUs simultâneos, thresholds

---

### 🔧 Scripts

**Arquivo:** [`docs/PROJECT_scripts.md`](/docs/PROJECT_scripts.md)

Documentação de **~50 scripts** organizados em 13 categorias:

1. **Backup** (5) — Criação, restauração, limpeza, inicialização, agendamento cron com criptografia AES-256-GCM
2. **Inicialização** (5) — init-server, seed-all, seed-musicas, seed-posts, seed-videos, seed-products, init-dicas
3. **Banco de Dados** — db-shell (psql interativo), clear-db, clear-musicas, validate-schema, migrações versionadas
4. **Manutenção** — clean-orphaned-images (dry-run + exclusão segura), clean-k6-reports, monitor-disk-space
5. **Diagnóstico** — check-env, check-db-status, check-server, reset-admin-password
6. **Cache** — clear-cache (Redis + memória local)
7. **Testes de Carga** — run-load-tests.sh (automação bash para execução de testes k6)
8. **Relatórios** — generate-load-report, consolidate-k6-reports
9. **Migrações** — Scripts versionados com rastreamento de schema, rollback e validação
10. **Autenticação** — Scripts de gerenciamento de tokens e senhas
11. **Utilitários** — clean-test-db, vários utilitários de apoio

---

## Principais Tecnologias

| Categoria | Tecnologia |
|-----------|-----------|
| **Framework** | Next.js 16 (Pages Router) |
| **Frontend** | React 19 |
| **Backend** | Node.js 24.15.0 (ES Modules) |
| **Banco de Dados** | PostgreSQL 16 + SQLite (dev) |
| **Cache** | Redis (Upstash) + fallback em memória |
| **Autenticação** | JWT + bcryptjs + cookies httpOnly |
| **Validação** | Zod |
| **ORM/Query** | pg (Pool nativo) |
| **Testes Unitários/Integração** | Jest 30 + React Testing Library |
| **Testes E2E** | Cypress 15 |
| **Testes de Carga** | k6 (Grafana Labs) |
| **CI/CD** | GitHub Actions (3 workflows) |
| **Análise Estática** | Knip (código morto) |
| **SEO** | next-sitemap, Schema.org JSON-LD |
| **Monitoramento** | Core Web Vitals, Rate Limiting |

---

> Para informações detalhadas sobre cada área, consulte os documentos correspondentes na pasta [`/docs/`](/docs/).