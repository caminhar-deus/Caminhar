# 🏞️ Caminhar com Deus

**Versão:** 1.4.0 | **Engine:** Node.js 24.16.0, npm 11.17.0 | **Stack:** Next.js 16 + React 19

Plataforma web para compartilhamento de conteúdo gospel. Inclui blog com artigos, músicas com integração Spotify, vídeos com integração YouTube, produtos com integração Mercado Livre, sistema administrativo completo, testes automatizados e CI/CD.

---

## Índice

- [Visão Geral do Projeto](#visão-geral-do-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
  - [📁 Raiz do Projeto](#-raiz-do-projeto)
  - [🧩 Componentes](#-componentes)
  - [📄 Páginas](#-páginas)
  - [🪝 Hooks](#-hooks)
  - [📚 Biblioteca (lib)](#-biblioteca-lib)
  - [🗄️ Dados](#-dados)
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

- **Blog** com artigos e paginação SSR
- **Seção de Músicas** integrada ao Spotify
- **Seção de Vídeos** integrada ao YouTube
- **Seção de Produtos** com links para Mercado Livre, Shopee e Amazon
- **Painel Administrativo** completo com CRUD reutilizável para todos os recursos
- **Sistema de Autenticação** com JWT e controle de acesso baseado em papéis (RBAC)
- **SEO completo** com Open Graph, Twitter Cards e Schema.org JSON-LD
- **Cache** com Redis (Upstash) + fallback em memória local
- **Backup automatizado** do PostgreSQL com criptografia AES-256-GCM e compressão gzip
- **Testes automatizados** com ~157 arquivos (unitários, integração, E2E e carga)
- **CI/CD** com GitHub Actions (4 workflows: CI, cobertura em PRs, testes de carga, testes de segurança)
- **Middlewares de proteção:** Rate limiting, DDoS, Content Security Policy, CORS

---

## Estrutura do Projeto

A pasta [`/docs`](/docs) contém documentos detalhados de análise para cada área do projeto. Abaixo, um resumo de cada tema.

---

### 📁 Raiz do Projeto

**Arquivo:** [`docs/PROJECT_raiz.md`](/docs/PROJECT_raiz.md)

Documentação dos **28 arquivos** na raiz do projeto, agrupados por contexto:

- **Configuração Principal:** `package.json` (88 scripts, ES Modules), `next.config.js` (headers de segurança e CORS), `next-sitemap.config.js` (sitemap XML + rotas dinâmicas do banco), `proxy.js` (Rate limiting e proteção DDoS com Redis)
- **Testes:** `jest.config.js` (thresholds: branches 80%, functions 85%, lines 90%), `jest.config.db.js` (testes com PostgreSQL via Testcontainers), `jest.setup.js`, `jest.teardown.js`, `babel.jest.config.js`, `cypress.config.js`
- **Qualidade:** `eslint.config.js` (Flat Config), `jsconfig.json` (aliases de importação), `knip.json` (análise de código morto)
- **CI/CD:** `ci.yml`, `pr-coverage.yml`, `load-tests.yml`, `security-tests.yml`

---

### 🧩 Componentes

**Arquivo:** [`docs/PROJECT_components.md`](/docs/PROJECT_components.md)

Componentes React organizados em 6 categorias:

1. **Admin** — `AdminCrudBase` (CRUD genérico reutilizável com tabela, formulário dinâmico, Drag & Drop, exportação CSV, validação Zod), `AdminDashboard` (cards de estatísticas com cache), `AdminMusicas` (integração Spotify), `AdminVideos` (integração YouTube com preview lazy), `AdminPosts` (slug automático, imagem de capa obrigatória), `AdminProducts` (integração Mercado Livre), `AdminUsers`/`AdminUsersTab`/`AdminRolesTab`, `AdminAudit` (filtro por data, exportação CSV), `AdminDicas`, `withAdminAuth` (HOC de autenticação), `CacheManager`, `BackupManager`, `IntegrityCheck`, `RateLimitViewer`
2. **Features** — `BlogSection`/`PostCard`, `MusicGallery`/`MusicCard` (player Spotify via LazyIframe), `VideoGallery`/`VideoCard` (player YouTube), `ProductList`/`ProductCard` (carrossel de imagens, lightbox, links ML/Shopee/Amazon), `ContentTabs` (lazy loading com React.lazy), `Testimonials` (carrossel de Dicas do Dia)
3. **Layout** — `Container` (max-width configurável), `Grid` (1-12 colunas responsivo), `Stack` (vertical/horizontal), `Sidebar` (colapsável com localStorage)
4. **Performance** — `ImageOptimized` (wrapper next/image com fallback), `LazyIframe` (IntersectionObserver), `PreloadResources`, `CriticalCSS`
5. **SEO** — `SEOHead` (meta tags, Open Graph, Twitter Cards), `StructuredData` (`ArticleSchema`, `BreadcrumbSchema`, `MusicSchema`, `VideoSchema`, `OrganizationSchema`, `WebsiteSchema`)
6. **UI** — `Button` (6 variantes, ripple), `Input` (addons, clearable), `TextArea` (auto-resize), `Select` (nativo + custom searchable), `Modal` (focus trap, portal), `Toast` (hook useToast), `Alert`, `Badge`, `BaseCard` (slots media/header/content/footer), `Spinner`, `StateMessages`

---

### 📄 Páginas

**Arquivo:** [`docs/PROJECT_pages.md`](/docs/PROJECT_pages.md)

**53 arquivos** no total:

- **Páginas raiz (5):** `_app.js` (Toaster react-hot-toast), `_document.js` (CSS crítico, preconnect, CSP, Google Fonts), `index.js` (hero + ContentTabs + Testimonials), `admin.js` (painel completo com upload e crop de imagens), `design-system.js` (documentação visual dos componentes)
- **API pública (10):** `/api/posts`, `/api/musicas`, `/api/videos`, `/api/products`, `/api/dicas`, `/api/settings`, `/api/status` (health check), `/api/upload-image` (validação com sharp), `/api/placeholder-image`, `/api/cleanup-test-data`
- **API admin (15):** CRUD de posts, músicas, vídeos, produtos, dicas, usuários, cargos; gerenciamento de backups, cache, rate limit; auditoria; integridade; fetch de dados externos (Mercado Livre, Spotify, YouTube)
- **API autenticação (3):** login, logout, check
- **Blog (2):** `index.js` (listagem SSR com paginação), `[slug].js` (detalhe com SEO, lightbox, compartilhamento)
- **Estilos globais (5):** `globals.css`, `variables.css` (386 CSS Custom Properties dos design tokens), `generateTokensCSS.js`, CSS Modules
- **Design Tokens (11):** cores, tipografia, espaçamentos, bordas, sombras, breakpoints, animações, opacidade, z-index

---

### 🪝 Hooks

**Arquivo:** [`docs/PROJECT_hooks.md`](/docs/PROJECT_hooks.md)

**9 hooks customizados:**

| Hook | Função |
|------|--------|
| `useAuth` | Contexto global de autenticação (user, login, logout) |
| `useAdminAuth` | Autenticação específica do admin com redirect via `next/router` |
| `useAdminCrud` | CRUD reutilizável para painéis admin com paginação e validação |
| `useApiFetch` | Fetch genérico com loading, error, cache e transformação |
| `useTheme` | Tema light/dark com acesso centralizado a design tokens |
| `usePerformanceMetrics` | Monitoramento de Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB, TBT) |
| `useDebounce` | Hook utilitário de debounce (default 300ms) |
| `useThrottle` | Hook utilitário de throttle (default 300ms) |
| `index.js` | Barrel file que centraliza todas as exportações |

---

### 📚 Biblioteca (lib)

**Arquivo:** [`docs/PROJECT_lib.md`](/docs/PROJECT_lib.md)

**~28 arquivos** divididos em 4 grupos:

- **Infraestrutura:** `auth.js` (bcryptjs, JWT, cookies httpOnly, rate limit no login), `cache.js` (Cache-Aside com Redis + memória, Single-Flight, rate limit distribuído), `crud.js` (SQL parametrizado com proteção contra injeção), `db.js` (pool PostgreSQL com lazy init, transações, retry automático), `redis.js` (Upstash Redis com fallback em memória), `logger.js` (logger leve com emojis)
- **API (8 arquivos):** Classes de erro customizadas (10 tipos), middlewares (`composeMiddleware`, `withMethod`, `withAuth`, `withRateLimit`, `withCors`, `withCache`), respostas padronizadas, validação Zod, factory de handlers admin (`createAdminHandler`)
- **Domínio (9 arquivos):** CRUD de posts (full-text search tsvector em português), músicas, vídeos, produtos, dicas, settings, imagens, auditoria, permissões, paginação compartilhada
- **SEO:** `config.js` com siteConfig, schemas JSON-LD, funções utilitárias (canonical, image, breadcrumb, sanitização)

---

### 🗄️ Dados

**Arquivo:** [`docs/PROJECT_data.md`](/docs/PROJECT_data.md)

- **Banco de Dados:** PostgreSQL com 15 tabelas: `users`, `settings`, `images`, `categories`, `tags`, `posts`, `post_categories`, `post_tags`, `musicas`, `videos`, `products`, `dicas`, `activity_logs`, `roles`, `_migrations`
- **11 migrações** aplicadas (criação de tabelas, índices TRGM para busca textual, campos de ordenação)
- **Backups:** Dumps PostgreSQL em `data/backups/` com criptografia AES-256-GCM, compressão gzip, hash SHA-256, rotação automática (máx. 10 backups)

---

### 📋 Exemplos

**Arquivo:** [`docs/PROJECT_examples.md`](/docs/PROJECT_examples.md)

**4 arquivos** de exemplo que servem como documentação viva de implementação SEO:

1. **`blog-post-seo-example.js`** — Exemplo completo: SEOHead, ArticleSchema + OrganizationSchema + BreadcrumbSchema, ImageOptimized (LCP), LazyIframe (YouTube), usePerformanceMetrics, microdados Schema.org inline, botões de compartilhamento, fallback de dados
2. **`homepage-seo-example.js`** — SEO para página inicial: OrganizationSchema, WebsiteSchema, PreloadResources, ImageOptimized critical
3. **`musicas-seo-example.js`** — SEO para músicas: MusicSchema, BreadcrumbSchema, LazyIframe (Spotify)
4. **`videos-seo-example.js`** — SEO para vídeos: VideoSchema, BreadcrumbSchema, LazyIframe (YouTube)

---

### 🧪 Testes

**Arquivo:** [`docs/PROJECT_tests.md`](/docs/PROJECT_tests.md)

**~157 arquivos de teste** organizados em duas categorias:

- **Jest (jsdom):** Testes unitários e de integração com Jest 30 + React Testing Library + node-mocks-http
- **Jest (node):** Testes de integração com PostgreSQL real via Testcontainers

**Infraestrutura de teste:**
- Factories: post, music, video, user (geração de dados)
- Helpers: api (mocks HTTP), auth (tokens JWT), console, crud-test, db-test, render (providers)
- Matchers customizados: toBeISODate, toBeValidJSON, toHaveHeader, toHaveProperties, toHaveStatus
- Mocks: db, auth, cache, fetch, next

**Distribuição:** 39 testes de integração (API pública, admin, autenticação, domínio/BD real) + ~96 testes unitários (componentes, lib, domínio, páginas, scripts) + exemplos

---

### 🎭 Mocks

**Arquivo:** [`docs/PROJECT_mocks.md`](/docs/PROJECT_mocks.md)

**3 mocks manuais** do Jest em `__mocks__/`:

1. **`pg.js`** — Mock completo do `pg.Pool` com `mockQuery` singleton, simulação de erros de query/conexão, restauração de implementação — ativo em 16 arquivos de teste
2. **`cookie.js`** — Mock da biblioteca `cookie` (parse/serialize) — **não utilizado atualmente** (mock órfão)
3. **`styleMock.js`** — Mock de arquivos `.css` para CSS Modules, ativado via `moduleNameMapper` no `jest.config.js`

---

### 🤖 Testes E2E (Cypress)

**Arquivo:** [`docs/PROJECT_cypress.md`](/docs/PROJECT_cypress.md)

**5 arquivos de teste**, **25 cenários**, distribuídos em 4 páginas/sistemas:

| Arquivo | Cenários | Funcionalidade |
|---------|:--------:|----------------|
| `home.cy.js` | 4 | Página inicial (título, navegação, conteúdo) |
| `blog.cy.js` | 3 | Listagem do blog (título, links para posts) |
| `post.cy.js` | 3 | Post individual (imagem, conteúdo, botões de compartilhamento) |
| `navigation.cy.js` | 3 | Navegação entre páginas e acesso admin não autenticado |
| `image_zoom.cy.js` | 12 | Zoom de imagem (lightbox): fluxo principal, casos de borda, responsividade, acessibilidade |

**Suporte:** 8 comandos customizados (`cy.login`, `cy.createPost`, `cy.viewportMobile/Tablet`, lightbox helpers), 1 fixture (`posts.json`)

---

### ⚡ Testes de Carga

**Arquivo:** [`docs/PROJECT_load-tests.md`](/docs/PROJECT_load-tests.md)

**30 scripts k6** organizados em 3 categorias + 7 módulos helpers:

| Categoria | Qtd | Descrição |
|-----------|:---:|-----------|
| **Funcionais** | 9 | Health check, cache headers, search content, posts tags, cursor pagination, backup verification, video validation, upload flow, recovery test |
| **Performance** | 17 | Cache warmup/performance, auth flow, create post, pagination, stress test combinado, CRUD/carga/filtro/paginação/ordenação de músicas e vídeos |
| **Segurança** | 4 | Login negativo, rate limit, IP spoofing, DDoS search |

**Helpers:** config, auth (login JWT), network (IP aleatório), profiles (7 perfis de carga), report (relatórios JSON sanitizados), sleep (pausa aleatória), resource-test-runner (factory pattern para reduzir duplicação CRUD)

**Automação:** Workflow `load-tests.yml` com execução diária (03:00 UTC), relatórios retidos por 30 dias

---

### 🔧 Scripts

**Arquivo:** [`docs/PROJECT_scripts.md`](/docs/PROJECT_scripts.md)

**~72 arquivos** em `scripts/` e subpastas, organizados por categoria:

| Categoria | Qtd | Descrição |
|-----------|:---:|-----------|
| Backup | 5 | `backup.js` (módulo central) + entry points (criar, restaurar, inicializar, ver logs) |
| Seed | 5 | `seed-all.js` (orquestrador) + seeds de posts, músicas, vídeos, produtos |
| Migrações | 16 | `migrate.js` (executor) + 14 migrações versionadas (001 a 013 + utilidades) |
| Schemas JSON | 4 | Definições de tabelas (dicas, musicas, posts, videos) para `init-table.js` |
| Inicialização | 4 | `init-table.js`, `init-server.js`, `init-backup.js`, `seed-settings.js` |
| Limpeza | 10 | Banco (clear-db, clear-musicas, clean-load-test-posts), arquivos (clean-orphaned-images, clean-k6-reports), cache, auth locks |
| Diagnóstico | 8 | `check-db-status`, `check-env`, `check-server`, `check-sql-injection`, `validate-schema` + 5 em `diagnostics/` |
| Testes de Carga | 4 | Orquestrador Node.js, shell script, warm-routes |
| Manutenção | 4 | Backup/restore de posts, fix hero key, video thumbnails |
| Utilitários | 9 | Conexão DB, constants, date-format, load-env, cleanup, init-table-utils |

---

## Principais Tecnologias

| Categoria | Tecnologia |
|-----------|-----------|
| **Framework** | Next.js 16 (Pages Router) |
| **Frontend** | React 19 |
| **Backend** | Node.js 24.16.0 (ES Modules) |
| **Banco de Dados** | PostgreSQL |
| **Cache** | Redis (Upstash) + fallback em memória |
| **Autenticação** | JWT + bcryptjs + cookies httpOnly |
| **Validação** | Zod |
| **ORM/Query** | pg (Pool nativo) |
| **Testes Unitários/Integração** | Jest 30 + React Testing Library |
| **Testes E2E** | Cypress 15 |
| **Testes de Carga** | k6 (Grafana Labs) |
| **CI/CD** | GitHub Actions (4 workflows) |
| **Análise Estática** | Knip (código morto), ESLint 10 |
| **SEO** | next-sitemap, Schema.org JSON-LD |

---

> Para informações detalhadas sobre cada área, consulte os documentos correspondentes na pasta [`/docs/`](/docs/).