# Análise do Projeto — Testes (`/tests/`)

> **Data:** 02/08/2026
> **Objetivo:** Documentar de forma objetiva, clara e focada todos os arquivos de teste do projeto, descrevendo localização, propósito e funcionalidade de cada um, com base na análise atual dos arquivos.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Configuração Global](#2-configuração-global)
3. [Infraestrutura de Testes](#3-infraestrutura-de-testes)
4. [Testes de Integração](#4-testes-de-integração)
5. [Testes Unitários](#5-testes-unitários)
6. [Resumo Quantitativo](#6-resumo-quantitativo)

---

## 1. Visão Geral

A pasta `/tests` concentra toda a infraestrutura de testes do projeto **Caminhar** (site/blog cristão com posts, músicas, vídeos, produtos, usuários e configurações). A arquitetura é baseada em **Jest** com `@testing-library/react`, `node-mocks-http` e suporte a testes de integração com **PostgreSQL real via Testcontainers**.

A estrutura é organizada em camadas:

```
tests/
├── setup.js                          # Bootstrap global (jsdom)
├── setup.db.js                       # Bootstrap para banco real (node)
├── global-setup.db.js                # GlobalSetup: container PostgreSQL (Testcontainers)
├── examples/                         # Exemplos/demonstração da arquitetura
├── factories/                        # Fábricas de dados de teste
├── helpers/                          # Utilitários auxiliares
├── matchers/                         # Matchers customizados Jest
├── mocks/                            # Mocks globais reutilizáveis
├── integration/                      # Testes de integração
│   ├── api/                          #   Endpoints de API
│   │   ├── *.test.js
│   │   ├── admin/                    #     Endpoints administrativos
│   │   └── auth/                     #     Endpoints de autenticação
│   ├── auth/                         #   Autenticação v1
│   └── domain/                       #   Testes com PostgreSQL real (*.db.test.js)
└── unit/                             # Testes unitários
    ├── *.test.js                     #   Páginas e utilitários
    ├── components/                   #   Componentes React
    │   ├── Admin/                    #     Componentes administrativos
    │   ├── Features/                 #     Componentes de funcionalidades
    │   ├── Layout/                   #     Componentes de layout
    │   ├── Performance/              #     Componentes de performance
    │   ├── SEO/                      #     Componentes de SEO
    │   └── UI/                       #     Componentes de UI
    ├── domain/                       #   Lógica de domínio
    ├── hooks/                        #   Hooks React
    ├── lib/                          #   Bibliotecas
    ├── pages/                        #   Páginas (API routes)
    └── scripts/                      #   Scripts utilitários
```

---

## 2. Configuração Global

### `tests/setup.js`
**Localização:** `/tests/setup.js`
**Propósito:** Bootstrap central executado antes de todos os testes (ambiente jsdom). Configura polyfills (TextEncoder, TextDecoder, localStorage, matchMedia, IntersectionObserver, ResizeObserver, scrollTo, crypto.randomUUID, URL.revokeObjectURL), React Testing Library (timeout 5s), filtro de warnings conhecidos do `console.error` — incluindo erros intencionais de auth (`KNOWN_INTENTIONAL_AUTH_ERRORS`: 'Erro ao inicializar sistema de autenticação' e 'Falha ao armazenar refresh token') —, cleanup automático pós-teste (`afterEach` com `cleanup()` e `jest.clearAllMocks()`), e utilitários globais (`global.wait()`, `global.suppressWarnings()`). Importa os matchers customizados. O polyfill do `IntersectionObserver` simula interseção imediata via `setTimeout` para que iframes com lazy loading sejam renderizados sem interação manual.

### `tests/setup.db.js`
**Localização:** `/tests/setup.db.js`
**Propósito:** Bootstrap específico para testes de integração com banco real (ambiente node). Versão enxuta sem polyfills DOM. Inclui apenas polyfills de ReadableStream e MessageChannel (necessários para testcontainers), filtro de `console.error` para warnings conhecidos da API, matchers customizados e `afterEach` com `jest.clearAllMocks()`.

### `tests/global-setup.db.js`
**Localização:** `/tests/global-setup.db.js`
**Propósito:** GlobalSetup para testes com banco real. Inicializa container PostgreSQL via Testcontainers com `.withReuse(true)` e disponibiliza a string de conexão via `process.env.TEST_DATABASE_URL`. Se o Docker não estiver disponível, define `TEST_DATABASE_URL = '__docker_unavailable__'` para que os testes sejam ignorados.

---

## 3. Infraestrutura de Testes

### 3.1 Factories (`/tests/factories/`)

| Arquivo | Propósito | Funcionalidades |
|---------|-----------|-----------------|
| `base.js` | Núcleo do sistema de factories | `createBaseFactory(defaultsGenerator)` abstrai contador incremental, `.list(n, overrides, mapFn)`, `.resetId()` e `generateTimestamp(daysAgo)` |
| `index.js` | Barrel file | Reexporta `createBaseFactory`, `postFactory`, `musicFactory`, `videoFactory`, `userFactory` |
| `post.js` | Dados de posts do blog | `postFactory`, `draftPostFactory`, `publishedPostFactory`, `createPostInput`, `updatePostInput` |
| `music.js` | Dados de músicas | `musicFactory`, `unpublishedMusicFactory`, `publishedMusicFactory`, `invalidSpotifyMusicFactory`, `createMusicInput`, `updateMusicInput`, `detailedMusicFactory`, `generateSpotifyUrl` |
| `video.js` | Dados de vídeos do YouTube | `videoFactory`, `unpublishedVideoFactory`, `publishedVideoFactory`, `invalidYoutubeVideoFactory`, `createVideoInput`, `updateVideoInput`, `embeddableVideoFactory`, `generateYoutubeUrl`, `extractYoutubeId` |
| `user.js` | Dados de usuários | `userFactory`, `adminFactory`, `regularUserFactory`, `userFactory.withHash` (async), `createUserInput`, `loginInput`, `jwtPayloadFactory`, `invalidUserInput` |

### 3.2 Helpers (`/tests/helpers/`)

| Arquivo | Propósito | Funcionalidades |
|---------|-----------|-----------------|
| `index.js` | Barrel file | Reexporta `api.js`, `render.js`, `auth.js`, `console.js`, `crud-test.js` |
| `api.js` | Utilitários de API HTTP | `createApiMocks`, `createGetRequest`, `createPostRequest`, `createPutRequest`, `createDeleteRequest`, `createPatchRequest`, `executeHandler`, `createWebhookPayload`, `createAuthRequest`, `createCookieAuthRequest`, `getResponseBody` |
| `auth.js` | Utilitários de autenticação | `createAuthToken`, `createExpiredToken`, `createInvalidToken`, `decodeToken`, `isValidToken`, `mockAuthenticatedUser`, `mockAuthenticatedAdmin`, `hashPassword`, `verifyPassword`, `createMockAuthMiddleware`, `mockAuthLib`, `clearAuthCookies`, `createBearerHeader`, `createAuthCookie`, `defaultTokenPayload`, `adminTokenPayload` |
| `console.js` | Supressão controlada de console | `suppressConsoleError()`, `filterConsoleError(suppressList)`, `mockGlobalFetch()`, `createConfirmSpy(defaultValue)` |
| `crud-test.js` | Abstração de testes CRUD de API | `testPublicGetEndpoint` (com opção `skipMethodNotAllowed` para suprimir o teste padrão de 405 em endpoints híbridos), `testAdminCrudEndpoint`, `testAdminGetEndpoint` |
| `db-test.js` | Testes com PostgreSQL real | `isDockerAvailable()`, `createTestDb()`, `applyMigrations()`, `withTransaction(pool)`, `truncateAll(pool)` |
| `render.js` | Renderização de componentes React | `renderWithProviders`, `renderWithRouter`, `renderWithAuth`, `renderWithToast`, `testLoadingState`, `testErrorState`, `resizeWindow`, `setMobileViewport`, `setTabletViewport`, `setDesktopViewport`, `waitForAnimation`, `clickAndWait`, `fillForm`, `clearForm` |
| `async-polyfills.js` | Polyfills assíncronos | `setupAsyncPolyfills()` — ReadableStream e MessageChannel, idempotente |

### 3.3 Matchers Customizados (`/tests/matchers/`)

| Arquivo | Matcher | Propósito |
|---------|---------|-----------|
| `index.js` | — | Barrel file que importa todos os matchers |
| `toHaveStatus.js` | `toHaveStatus(status)` | Verifica status HTTP de respostas (node-mocks-http, fetch Response, http.ServerResponse) |
| `toBeValidJSON.js` | `toBeValidJSON(expected?)` | Verifica se a resposta contém JSON válido, opcionalmente com dados específicos |
| `toHaveHeader.js` | `toHaveHeader(name, value?)` | Verifica existência/valor de headers HTTP |
| `toBeISODate.js` | `toBeISODate()` / `toBeValidDate()` | Verifica formato ISO 8601 e validade de datas |
| `toHaveProperties.js` | `toHaveProperties(properties)` | Verifica se um objeto possui todas as propriedades listadas |

### 3.4 Mocks (`/tests/mocks/`)

| Arquivo | Propósito | Funcionalidades |
|---------|-----------|-----------------|
| `index.js` | Barrel file | Reexporta `next.js`, `fetch.js`, `db.js`, `cache.js`, `auth.js`, `db-module.js` |
| `next.js` | Mocks do Next.js | `mockUseRouter`, `mockNextImage`, `mockNextLink`, `mockNextHead`, `mockNextScript`, `mockNextDynamic`, `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths`, `mockNextHeaders`, `mockNextCookies`, `setupNextMocks` (deprecated) |
| `next-setup.js` | Setup automático de mocks do Next.js | Centraliza `jest.mock()` para `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`, `next/headers`, `next/server` |
| `next.test.js` | Teste de sanidade dos mocks do Next.js | Verifica que os mocks de `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/headers` funcionam corretamente |
| `fetch.js` | Mocks de requisições fetch | `mockFetch`, `mockFetchSuccess`, `mockFetchError`, `mockFetchNotFound`, `mockFetchUnauthorized`, `mockFetchServerError`, `mockFetchNetworkError`, `mockFetchWithRoutes`, `mockFetchSequence`, `fetchDelay`, `setupFetchMock`, `clearFetchMock`, `fetchWasCalledWith`, `getLastFetchCall` |
| `db.js` | Mocks de operações de banco | `mockQuery`, `mockQueryOne`, `mockQueryMany`, `mockQueryError`, `mockInsert`, `mockUpdate`, `mockDelete`, `mockTransaction`, `mockPool`, `queryWasCalledWith`, `getQueryParams`, `mockDbModule`, `mockPaginatedResult`, `clearQueryMocks`, `mockQuerySequence` |
| `cache.js` | Mocks de cache (Redis/memória) | `mockCacheModule(overrides)`, `resetCacheMocks(cacheMock)` |
| `auth.js` | Mocks de autenticação | `mockAuthModule(overrides)`, `mockAuthFailure()`, `resetAuthMocks(authMock)` |
| `db-module.js` | Mock centralizado de `lib/infra/db.js` | `mockDb(overrides)`, `mockDbError(error)`, `resetDbMocks(dbMock)` |

### 3.5 Examples (`/tests/examples/`)

| Arquivo | Propósito |
|---------|-----------|
| `simple-test.test.js` | Demonstração da arquitetura: uso de factories, helpers de API/auth, matchers customizados e mocks |
| `component-example.test.js` | Exemplo completo de teste de componente React: renderização, interações, estados de loading/erro, responsividade, router, autenticação e fetch mockado |

---

## 4. Testes de Integração

### 4.1 API Endpoints (`/tests/integration/api/`)

Testes de endpoints públicos e CRUD de recursos. Usam `node-mocks-http` + mocks de domínio/cache/auth.

| Arquivo | Propósito |
|---------|-----------|
| `audit.test.js` | Testa `logActivity` do domínio de auditoria (INSERT em activity_logs) |
| `cleanup-test-data.test.js` | Testa limpeza de dados de teste (inclui supressão e validação do log de erro esperado em falha de banco) |
| `dicas.test.js` | CRUD de dicas |
| `login.test.js` | Fluxo de login |
| `musicas.create.test.js` | Criação de músicas |
| `musicas.delete.test.js` | Exclusão de músicas |
| `musicas.flow.test.js` | Fluxo completo de músicas |
| `musicas.integration.test.js` | Integração de músicas |
| `musicas.pagination.test.js` | Paginação de músicas |
| `musicas.test.js` | CRUD principal de músicas |
| `musicas.update.test.js` | Atualização de músicas |
| `placeholder-image.test.js` | Imagem de placeholder (hero/banner) com fallbacks, isolamento do cache interno do filename e revalidação HTTP 304 (`If-None-Match`) |
| `posts.create.api.test.js` | Criação de posts |
| `posts.delete.test.js` | Exclusão de posts |
| `posts.flow.test.js` | Fluxo completo de posts |
| `posts.general.test.js` | Testes gerais de posts |
| `posts.integration.test.js` | Integração de posts |
| `posts.test.js` | CRUD principal de posts (usa `testPublicGetEndpoint` do `crud-test.js` com `skipMethodNotAllowed`; casos específicos em `customTests`) |
| `posts.update.api.test.js` | Atualização de posts |
| `products.test.js` | CRUD de produtos |
| `settings.general.test.js` | Testes gerais de configurações |
| `settings.test.js` | CRUD de configurações |
| `stats.test.js` | Estatísticas |
| `status.test.js` | Endpoint `/api/status` (health check do banco) |
| `upload-image.test.js` | Upload de imagem |
| `videos.create.api.test.js` | Criação de vídeos |
| `videos.delete.test.js` | Exclusão de vídeos |
| `videos.flow.test.js` | Fluxo completo de vídeos |
| `videos.integration.test.js` | Integração de vídeos |
| `videos.pagination.api.test.js` | Paginação de vídeos |
| `videos.test.js` | CRUD principal de vídeos (supressão e validação do log de erro esperado no caminho 500) |

### 4.2 API Administrativa (`/tests/integration/api/admin/`)

Testes de endpoints administrativos com autenticação.

| Arquivo | Propósito |
|---------|-----------|
| `audit.test.js` | Auditoria administrativa |
| `backups.test.js` | Gerenciamento de backups |
| `cache.test.js` | Gerenciamento de cache |
| `dicas.test.js` | CRUD admin de dicas (supressão e validação do log de erro esperado no caminho 500) |
| `fetch-ml.test.js` | Fetch de dados de ML |
| `fetch-spotify.test.js` | Fetch de dados do Spotify |
| `fetch-youtube.test.js` | Fetch de dados do YouTube |
| `integrity.test.js` | Verificação de integridade do sistema (banco, storage, backup, cache) |
| `musicas.test.js` | CRUD admin de músicas |
| `posts.test.js` | CRUD admin de posts |
| `rate-limit.test.js` | Rate limiting |
| `roles.test.js` | Gerenciamento de roles |
| `users.create.test.js` | Criação de usuários |
| `users.test.js` | CRUD de usuários |
| `videos.test.js` | CRUD admin de vídeos (inclui fallback de validação com `fieldErrors` vazio sem mock de `Object.values`, usando `req.body = null`) |

### 4.3 Autenticação (`/tests/integration/api/auth/`)

| Arquivo | Propósito |
|---------|-----------|
| `check.test.js` | Verificação de autenticação |
| `login.test.js` | Login |
| `logout.test.js` | Logout |
| `refresh.test.js` | Renovação de access token via refresh token (cookie/body) |

### 4.4 Autenticação v1 (`/tests/integration/auth/`)

| Arquivo | Propósito |
|---------|-----------|
| `auth.test.js` | Testes de autenticação v1 |

### 4.5 Domínio com Banco Real (`/tests/integration/domain/`)

Testes de integração com PostgreSQL real via Testcontainers (arquivos `*.db.test.js`).

| Arquivo | Propósito |
|---------|-----------|
| `musicas.db.test.js` | Operações de músicas com banco real |
| `posts.db.test.js` | Operações de posts com banco real |
| `products.db.test.js` | Operações de produtos com banco real |
| `settings.db.test.js` | Operações de configurações com banco real |
| `videos.db.test.js` | Operações de vídeos com banco real |

---

## 5. Testes Unitários

### 5.1 Páginas e Utilitários (`/tests/unit/` — raiz)

| Arquivo | Propósito |
|---------|-----------|
| `[slug].test.js` | Testa a página de post individual (BlogPost) — renderização, compartilhamento, imagem |
| `clean-test-db.test.js` | Testa o script de limpeza de banco de dados de teste |
| `index.test.js` | Testa a página do Blog (BlogIndex) — lista de posts e estado vazio |
| `settings.cache.test.js` | Testa integração de cache da API de configurações (cache miss/hit/invalidação) |
| `videos.validation.test.js` | Testa validação de vídeos (limite de caracteres, vídeo inexistente, extração de mensagem de validação via `getValidationMessage`) |

### 5.2 Componentes de Admin (`/tests/unit/components/Admin/`)

| Arquivo | Propósito |
|---------|-----------|
| `AdminAudit.test.js` | Painel de auditoria: logs, paginação, filtro, exportação CSV, tratamento de 401 |
| `AdminCrudBase.test.js` | Base CRUD: renderização, toggle booleano, estados de loading/erro, fluxo de exclusão com confirmação em 1 clique |
| `AdminDashboard.test.js` | Dashboard: estatísticas, permissões, cache em sessionStorage |
| `AdminDicas.test.js` | CRUD de dicas |
| `AdminMusicas.test.js` | CRUD de músicas |
| `AdminPosts.test.js` | CRUD de posts |
| `AdminProducts.test.js` | CRUD de produtos (formatação de preço, checkbox) |
| `AdminRolesTab.test.js` | Gerenciamento de roles |
| `AdminUsers.test.js` | CRUD de usuários |
| `AdminUsersTab.test.js` | Aba de usuários |
| `AdminVideos.test.js` | CRUD de vídeos (iframe embed) |
| `ImageUploadField.test.js` | Campo de upload de imagem (toast.error, onUpload) |
| `index.test.js` | Barrel de Admin |
| `TextAreaField.test.js` | Campo de textarea |
| `TextField.test.js` | Campo de texto |
| `ToggleField.test.js` | Campo toggle |
| `UrlField.test.js` | Campo de URL |
| `withAdminAuth.test.js` | HOC de autenticação admin (com AuthProvider real) |

#### Managers (`/tests/unit/components/Admin/Managers/`)

| Arquivo | Propósito |
|---------|-----------|
| `BackupManager.test.js` | Gerenciador de backups (Modal de confirmação) |
| `CacheManager.test.js` | Gerenciador de cache (Modal de confirmação) |

#### Tools (`/tests/unit/components/Admin/Tools/`)

| Arquivo | Propósito |
|---------|-----------|
| `IntegrityCheck.test.js` | Verificação de integridade |
| `RateLimitViewer.test.js` | Visualizador de rate limit: IPs bloqueados, whitelist, auditoria com busca/paginação, estados de erro, 401 em todas as rotas, refresh manual e auto-refresh de 15s |

### 5.3 Componentes de Funcionalidades (`/tests/unit/components/Features/`)

| Arquivo | Propósito |
|---------|-----------|
| `Blog/BlogSection.test.js` | Seção de blog |
| `Blog/PostCard.test.js` | Card de post |
| `ContentTabs/ContentTabs.test.js` | Abas de conteúdo |
| `ContentTabs/index.test.js` | Barrel de ContentTabs |
| `Music/MusicCard.test.js` | Card de música (iframe Spotify) |
| `Music/MusicGallery.edge.test.js` | Galeria de músicas (edge cases) |
| `Music/MusicGallery.test.js` | Galeria de músicas |
| `Products/ProductCard.test.js` | Card de produto |
| `Products/ProductList.test.js` | Lista de produtos: render, estados de loading/erro/vazio, busca e filtros de preço (min/max na URL), limpar filtros, ordenação por position/ID via `transform` real, paginação (Anterior/Próxima, faixa > 5 páginas, loading overlay com fake timers) |
| `Products/styles.test.js` | Estilos compartilhados de Products (`inputStyle` com whitelist/fallback seguro e `buttonBaseStyle`) |
| `Testimonials/index.test.js` | Depoimentos (carrossel; seção oculta quando a API não retorna dicas — sem fallback estático) |
| `Video/VideoCard.test.js` | Card de vídeo |
| `Video/VideoGallery.test.js` | Galeria de vídeos |

### 5.4 Componentes de Layout (`/tests/unit/components/Layout/`)

| Arquivo | Propósito |
|---------|-----------|
| `Container.test.js` | Container com subcomponentes Section/Article |
| `Grid.test.js` | Grid com Item, Auto e Responsive |
| `index.test.js` | Barrel de Layout |
| `Sidebar.test.js` | Sidebar |
| `Stack.test.js` | Stack |

### 5.5 Componentes de Performance (`/tests/unit/components/Performance/`)

| Arquivo | Propósito |
|---------|-----------|
| `CriticalCSS.test.js` | CSS crítico (fallback padrão, remoção) |
| `ImageOptimized.test.js` | Imagem otimizada |
| `index.test.js` | Barrel de Performance |
| `LazyIframe.test.js` | Iframe com lazy loading |
| `PreloadResources.test.js` | Pré-carregamento de recursos |

### 5.6 Componentes de SEO (`/tests/unit/components/SEO/`)

| Arquivo | Propósito |
|---------|-----------|
| `ArticleSchema.test.js` | Schema.org Article |
| `BreadcrumbSchema.test.js` | Schema.org Breadcrumb |
| `Head.test.js` | Head do Next.js |
| `index.test.js` | Barrel de SEO |
| `MusicSchema.test.js` | Schema.org Music |
| `OrganizationSchema.test.js` | Schema.org Organization |
| `VideoSchema.test.js` | Schema.org Video |
| `WebsiteSchema.test.js` | Schema.org Website |

### 5.7 Componentes de UI (`/tests/unit/components/UI/`)

| Arquivo | Propósito |
|---------|-----------|
| `Alert.test.js` | Alerta |
| `Badge.test.js` | Badge |
| `Button.test.js` | Botão |
| `Card.test.js` | Card |
| `index.test.js` | Barrel de UI |
| `Input.test.js` | Campo de entrada |
| `Modal.test.js` | Modal (preventScroll com classe CSS) |
| `Select.test.js` | Campo de seleção: modo custom (searchable/clearable) com dropdown (clique, teclado Enter/Escape, clique-fora), busca com debounce de 300ms, limpar seleção (`onClear`/`onChange`), valor controlado/defaultValue com `aria-selected`; modo nativo com `disabled`, foco, `aria-invalid`/`aria-describedby` e erro/helper |
| `Spinner.test.js` | Spinner de carregamento |
| `TextArea.test.js` | Campo de textarea (autoResize, contador de caracteres) |
| `Toast.test.js` | Notificações toast |

### 5.8 Componentes Gerais (`/tests/unit/components/`)

| Arquivo | Propósito |
|---------|-----------|
| `Header.test.js` | Cabeçalho do site |
| `SeoPerformance.test.js` | Integração SEO + Performance |

### 5.9 Domínio (`/tests/unit/domain/`)

| Arquivo | Propósito |
|---------|-----------|
| `posts.test.js` | Lógica de domínio de posts (full-text search, createPost) |
| `settings.test.js` | Lógica de domínio de configurações (json_object_agg) |
| `videos.test.js` | Lógica de domínio de vídeos (ILIKE, createRecord) |

### 5.10 Hooks (`/tests/unit/hooks/`)

| Arquivo | Propósito |
|---------|-----------|
| `useAdminCrud.test.js` | Hook de CRUD admin — regressão do `handleDelete`: `DELETE` com `Content-Type: application/json` e corpo `{ id }`, `onConfirmDelete(id)` e aborto quando a confirmação resolve `false` |

### 5.11 Lib (`/tests/unit/lib/`)

| Arquivo | Propósito |
|---------|-----------|
| `auth.test.js` | Módulo de autenticação (hash, JWT, cookies, middleware, refresh token não persistido) |
| `cache.test.js` | Módulo de cache (L1 memória, L2 Redis, rate limit) |
| `crud.test.js` | Módulo CRUD |
| `db.test.js` | Módulo de banco (pool, closeDatabase) |
| `middleware.test.js` | Middleware |
| `redis.test.js` | Módulo Redis (getRedisInstance) |

#### Lib/API (`/tests/unit/lib/api/`)

| Arquivo | Propósito |
|---------|-----------|
| `errors.test.js` | Tratamento de erros |
| `index.test.js` | Barrel de API |
| `middleware.test.js` | Middleware de API (rate limit) |
| `response.test.js` | Formatação de respostas |
| `validate.test.js` | Validação (Zod, erros inesperados) |

#### Lib/Backup (`/tests/unit/lib/backup/`)

| Arquivo | Propósito |
|---------|-----------|
| `backup.available.test.js` | Disponibilidade de backup |
| `backup.cleanup.test.js` | Limpeza de backups |
| `backup.logs.test.js` | Logs de backup |
| `backup.operations.test.js` | Operações de backup (criação/restauração; mock padrão de `fs.promises.opendir` no beforeEach evita TypeError/erro falso na limpeza) |

#### Lib/DB (`/tests/unit/lib/db/`)

| Arquivo | Propósito |
|---------|-----------|
| `createPost.test.js` | Criação de post |
| `deletePost.test.js` | Exclusão de post |
| `getAllPosts.test.js` | Listagem de posts |
| `getPaginatedPosts.test.js` | Paginação de posts (ILIKE) |
| `musicas.test.js` | Operações de músicas (ILIKE) |
| `query.test.js` | Base Query Wrapper (execução de SQL, log de erros) |
| `saveImage.test.js` | Salvamento de imagem |
| `settings.test.js` | Operações de configurações |
| `updatePost.test.js` | Atualização de post (parcial) |

#### Lib/Domain (`/tests/unit/lib/domain/`)

| Arquivo | Propósito |
|---------|-----------|
| `products.test.js` | Operações de domínio de produtos (paginação com filtros, create/update/delete) |

#### Lib/Infra (`/tests/unit/lib/infra/`)

| Arquivo | Propósito |
|---------|-----------|
| `logger.test.js` | Logger |
| `redis.test.js` | Módulo Redis (fallback em memória, Redis Upstash configurado, URL inválida, REDIS_URL) |

#### Lib/SEO (`/tests/unit/lib/seo/`)

| Arquivo | Propósito |
|---------|-----------|
| `config.test.js` | Configuração de SEO |

### 5.12 Pages/API Edge Cases (`/tests/unit/pages/api/`)

| Arquivo | Propósito |
|---------|-----------|
| `upload-image.edge.test.js` | Edge case: criação de diretório de upload |
| `admin/dicas.edge.test.js` | Edge case: dicas (logActivity, IP) |
| `admin/fetch-ml.edge.test.js` | Edge case: fetch ML |
| `admin/fetch-spotify.edge.test.js` | Edge case: fetch Spotify |
| `admin/posts.edge.test.js` | Edge case: posts (req.user null) |
| `admin/rate-limit.test.js` | Edge case: rate limit |
| `admin/roles.edge.test.js` | Edge case: roles |
| `admin/stats.edge.test.js` | Edge case: stats |
| `auth/login.edge.test.js` | Edge case: login (erro interno) |

### 5.13 Scripts (`/tests/unit/scripts/`)

| Arquivo | Propósito |
|---------|-----------|
| `backup.test.js` | Script de backup |
| `clean-orphaned-images.test.js` | Limpeza de imagens órfãs |
| `clear-db.test.js` | Limpeza de banco |
| `clear-musicas.test.js` | Limpeza de músicas |
| `init-table.test.js` | Utilitários de schema de tabelas |
| `migrate.test.js` | Gerenciador de migrações |
| `reset-password.test.js` | Reset de senha |
| `seed-all.test.js` | Seed de todos os dados |
| `validate-schema.test.js` | Validação de schema do banco (mock condicional por SQL cobre tabelas e colunas existentes; valida `result === true` no cenário de sucesso, sem falso alerta de "Tabela faltando") |

#### Scripts/DB (`/tests/unit/scripts/db/`)

| Arquivo | Propósito |
|---------|-----------|
| `connection.test.js` | Módulo de conexão PostgreSQL (getPool, closePool, query) |

#### Scripts/Utils (`/tests/unit/scripts/utils/`)

| Arquivo | Propósito |
|---------|-----------|
| `cleanup.test.js` | Módulo compartilhado de cleanup (loadEnv) |
| `constants.test.js` | Constantes |
| `date-format.test.js` | Formatação de datas |
| `load-env.test.js` | Carregamento de variáveis de ambiente |

---

## 6. Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| **Configuração Global** | 3 arquivos |
| **Factories** | 6 arquivos |
| **Helpers** | 8 arquivos |
| **Matchers** | 6 arquivos |
| **Mocks** | 9 arquivos |
| **Examples** | 2 arquivos |
| **Testes de Integração** | 56 arquivos |
| **Testes Unitários** | ~126 arquivos |
| **Total Aproximado** | **~216 arquivos** |

---

> **Nota:** Este documento reflete a análise atual dos arquivos em `/tests`. Em caso de divergência com documentos anteriores, prevalece esta análise.