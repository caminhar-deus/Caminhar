# Análise da Suite de Testes — `/tests/`

> **Data:** 28/06/2026  
> **Última atualização:** 12/07/2026
> **Propósito:** Documentação completa e consolidada de todos os arquivos de teste do projeto Caminhar.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Diretórios](#2-estrutura-de-diretórios)
3. [Configuração e Setup](#3-configuração-e-setup)
4. [Factories (Fábricas de Dados)](#4-factories)
5. [Helpers (Utilitários)](#5-helpers)
6. [Matchers Customizados](#6-matchers-customizados)
7. [Mocks (Simulações)](#7-mocks)
8. [Exemplos](#8-exemplos)
9. [Testes de Integração — API Pública](#9-testes-de-integração--api-pública)
10. [Testes de Integração — API Admin](#10-testes-de-integração--api-admin)
11. [Testes de Integração — Autenticação](#11-testes-de-integração--autenticação)
12. [Testes de Integração — Domínio/BD Real](#12-testes-de-integração--domíniobd-real)
13. [Testes Unitários — Componentes React](#13-testes-unitários--componentes-react)
14. [Testes Unitários — API Lib (Submódulos)](#14-testes-unitários--api-lib-submódulos)
15. [Testes Unitários — Lib (Core)](#15-testes-unitários--lib-core)
16. [Testes Unitários — Domínio](#16-testes-unitários--domínio)
17. [Testes Unitários — Páginas e Handlers de API](#17-testes-unitários--páginas-e-handlers-de-api)
18. [Testes Unitários — Scripts](#18-testes-unitários--scripts)
19. [Testes Unitários — Top Level](#19-testes-unitários--top-level)

---

## 1. Visão Geral

A suite de testes está dividida em **duas grandes categorias**:

| Categoria | Ambiente | Tecnologias | Finalidade |
|-----------|----------|-------------|------------|
| **Testes com Jest (jsdom)** | `jest.config.js` | Jest + RTL + jsdom | Testes de componentes, páginas, hooks, mocks |
| **Testes com Jest (node)** | `jest.config.db.js` | Jest + node + Testcontainers | Testes de integração com PostgreSQL real |

**Stack principal:**
- **Jest** (`@jest/globals`) — executor de testes
- **React Testing Library** (`@testing-library/react`) — renderização de componentes
- **node-mocks-http** (`createMocks`) — simulação de requisições HTTP
- **Testcontainers** (`@testcontainers/postgresql`) — banco PostgreSQL efêmero
- **jsonwebtoken** — geração de tokens JWT para testes
- **bcryptjs** — hash de senhas em testes
- **sharp** — processamento de imagens (mockado)
- **formidable** — parsing de formulários (mockados)
- **Zod** — validação de schemas

**Arquivos de configuração:**
| Arquivo | Finalidade |
|---------|-----------|
| `jest.config.js` | Configuração principal (jsdom, setup.js) |
| `jest.config.db.js` | Configuração para testes com banco real (node, setup.db.js, globalSetup) |
| `jest.setup.js` | Setup adicional carregado pelo Jest |
| `jest.teardown.js` | Teardown global |
| `babel.jest.config.js` | Transpilação Babel para os testes |

---

## 2. Estrutura de Diretórios

```
tests/
├── global-setup.db.js           # Setup global: container PostgreSQL
├── setup.db.js                   # Setup para testes de banco (node)
├── setup.js                      # Setup principal (jsdom)
├── examples/                     # Exemplos de uso da arquitetura
│   ├── component-example.test.js (565 linhas)
│   └── simple-test.test.js (234 linhas)
├── factories/                    # Fábricas de dados para testes (5 arquivos, 524 linhas)
│   ├── index.js
│   ├── base.js                   # createBaseFactory (contador, list, resetId)
│   ├── post.js                   # postFactory, draftPostFactory, etc.
│   ├── music.js                  # musicFactory, detailedMusicFactory, etc.
│   ├── video.js                  # videoFactory, embeddableVideoFactory, etc.
│   └── user.js                   # userFactory, adminFactory, withHash, etc.
├── helpers/                      # Utilitários reutilizáveis (7 arquivos, ~1030 linhas)
│   ├── index.js
│   ├── api.js                    # createMocks, createGetRequest, etc.
│   ├── auth.js                   # JWT tokens, mockAuthenticatedUser, etc.
│   ├── console.js                # suppressConsoleError, mockGlobalFetch, etc.
│   ├── crud-test.js              # testPublicGetEndpoint, testAdminCrudEndpoint, etc.
│   ├── db-test.js                # isDockerAvailable, withTransaction, etc.
│   └── render.js                 # renderWithProviders, renderWithRouter, etc.
├── matchers/                     # Matchers Jest customizados (6 arquivos, 276 linhas)
│   ├── index.js
│   ├── toHaveStatus.js
│   ├── toBeValidJSON.js
│   ├── toHaveHeader.js
│   ├── toBeISODate.js            # Inclui toBeValidDate
│   └── toHaveProperties.js
├── mocks/                        # Mocks reutilizáveis (9 arquivos, ~1100 linhas)
│   ├── index.js
│   ├── auth.js                   # mockAuthModule, mockAuthFailure
│   ├── cache.js                  # mockCacheModule
│   ├── db.js                     # mockQuery, mockInsert, mockUpdate, mockDelete, etc.
│   ├── db-module.js              # mockDb (módulo completo)
│   ├── fetch.js                  # mockFetchSuccess, mockFetchError, etc.
│   ├── next.js                   # mockUseRouter, mockNextImage, etc.
│   ├── next-setup.js             # Setup automático de mocks Next.js
│   └── next.test.js              # Teste de sanidade dos mocks Next.js
├── integration/                  # Testes de integração
│   ├── api/                      # Endpoints públicos (28+ arquivos)
│   │   ├── musicas.*.test.js     # 6 arquivos: create, delete, flow, integration, pagination, general
│   │   ├── posts.*.test.js       # 6 arquivos: create, delete, flow, general, integration, general
│   │   ├── videos.*.test.js      # 6 arquivos: create, delete, flow, integration, pagination, general
│   │   ├── audit.test.js         # (31 linhas) — função de domínio logActivity
│   │   ├── dicas.test.js
│   │   ├── login.test.js
│   │   ├── products.test.js
│   │   ├── settings.test.js
│   │   ├── settings.general.test.js
│   │   ├── stats.test.js
│   │   ├── status.test.js
│   │   ├── upload-image.test.js
│   │   ├── placeholder-image.test.js
│   │   └── cleanup-test-data.test.js
│   ├── api/admin/                # Endpoints administrativos (14 arquivos)
│   │   ├── audit.test.js (150 linhas)
│   │   ├── backups.test.js
│   │   ├── cache.test.js
│   │   ├── dicas.test.js
│   │   ├── fetch-ml.test.js
│   │   ├── fetch-spotify.test.js
│   │   ├── fetch-youtube.test.js
│   │   ├── musicas.test.js
│   │   ├── posts.test.js
│   │   ├── rate-limit.test.js
│   │   ├── roles.test.js
│   │   ├── users.test.js
│   │   ├── users.create.test.js
│   │   └── videos.test.js
│   ├── api/auth/                 # Endpoints de autenticação
│   │   ├── check.test.js
│   │   ├── login.test.js
│   │   └── logout.test.js
│   ├── auth/                     # Fluxo de autenticação (banco real)
│   │   └── auth.test.js
│   └── domain/                   # CRUD com banco real
│       ├── musicas.db.test.js
│       ├── posts.db.test.js
│       ├── products.db.test.js
│       ├── settings.db.test.js
│       └── videos.db.test.js
├── unit/                         # Testes unitários
│   ├── [slug].test.js
│   ├── clean-test-db.test.js
│   ├── index.test.js
│   ├── settings.cache.test.js
│   ├── videos.validation.test.js
│   ├── components/               # Componentes React (55+ arquivos)
│   │   ├── Header.test.js
│   │   ├── SeoPerformance.test.js
│   │   ├── Admin/                (18 testes: CRUD, campos, auth)
│   │   ├── Features/             (12 testes: Blog, ContentTabs, Music, Products, etc.)
│   │   ├── Layout/               (5 testes: Container, Grid, Sidebar, Stack)
│   │   ├── Performance/          (5 testes: CriticalCSS, ImageOptimized, LazyIframe, etc.)
│   │   ├── SEO/                  (9 testes: ArticleSchema, Breadcrumb, Head, etc.)
│   │   └── UI/                   (6 testes: Alert, Badge, Button, Card, Input, Modal)
│   ├── domain/                   (3 arquivos)
│   │   ├── posts.test.js
│   │   ├── settings.test.js
│   │   └── videos.test.js
│   ├── lib/                      (6+19 arquivos)
│   │   ├── auth.test.js
│   │   ├── cache.test.js
│   │   ├── crud.test.js
│   │   ├── db.test.js
│   │   ├── middleware.test.js
│   │   ├── redis.test.js
│   │   ├── api/                  (5 arquivos: errors, index, middleware, response, validate)
│   │   ├── backup/               (múltiplos arquivos)
│   │   ├── db/                   (múltiplos arquivos)
│   │   └── seo/                  (múltiplos arquivos)
│   ├── pages/api/                (9 arquivos)
│   │   ├── upload-image.edge.test.js (66 linhas)
│   │   ├── admin/                (6 testes: dicas, fetch-ml, fetch-spotify, posts, rate-limit, roles, stats)
│   │   └── auth/                 (1 teste: login.edge.test.js)
│   └── scripts/                  (9+ arquivos)
│       ├── backup.test.js (86 l)
│       ├── clean-orphaned-images.test.js (92 l)
│       ├── clear-db.test.js (68 l)
│       ├── clear-musicas.test.js
│       ├── init-table.test.js
│       ├── migrate.test.js
│       ├── reset-password.test.js
│       ├── seed-all.test.js
│       ├── validate-schema.test.js
│       └── db/ + diagnostics/ + maintenance/ + migrations/ + utils/
```

---

## 3. Configuração e Setup

### `/tests/setup.js` (230 linhas)
- **Localização:** `tests/setup.js`
- **Ambiente:** jsdom (testes de componentes React)
- **Propósito:** Configuração centralizada carregada automaticamente pelo Jest antes de todos os testes.
- **Funcionalidades:**
  - Polyfills de APIs do Node.js: `TextEncoder`, `TextDecoder`
  - Polyfill de `ReadableStream` via `node:stream/web`
  - Polyfill de `MessageChannel`/`MessagePort` via `node:worker_threads`
  - Polyfill de `localStorage`, `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo`
  - Mock de `crypto.randomUUID`
  - Configuração do React Testing Library (`asyncUtilTimeout: 5000ms`)
  - Filtro de `console.error` para warnings conhecidos do React e de API
  - Cleanup automático via `afterEach`: `cleanup()` e `jest.clearAllMocks()`
  - Utilitários globais: `global.wait()`, `global.suppressWarnings()`
  - Import dos custom matchers (`./matchers/index.js`)

### `/tests/setup.db.js` (85 linhas)
- **Localização:** `tests/setup.db.js`
- **Ambiente:** node (testes com banco de dados real)
- **Propósito:** Versão enxuta do setup.js para ambiente node, sem polyfills DOM.
- **Funcionalidades:**
  - Polyfills de `ReadableStream` e `MessageChannel` (necessários para testcontainers)
  - Import dos custom matchers
  - Filtro de `console.error` para warnings conhecidos
  - Cleanup via `afterEach`: `jest.clearAllMocks()`

### `/tests/global-setup.db.js` (33 linhas)
- **Localização:** `tests/global-setup.db.js`
- **Propósito:** Inicializa um container PostgreSQL via Testcontainers antes de todas as suites de teste de banco.
- **Funcionalidades:**
  - Cria container PostgreSQL com database `caminhar_test`
  - Define `process.env.TEST_DATABASE_URL` com a string de conexão
  - Armazena referência do container em `global.__TEST_DB_CONTAINER__`
  - Usa `.withReuse(true)` para reutilizar o container entre execuções
  - Graceful handling: se Docker não estiver disponível, define `TEST_DATABASE_URL = '__docker_unavailable__'`

---

## 4. Factories

### `/tests/factories/base.js` (67 linhas)
- **Localização:** `tests/factories/base.js`
- **Propósito:** Abstração base para todas as factories. Implementa o padrão de contador incremental, método `.list(n)` e `.resetId()`.
- **Exportações:**
  - `createBaseFactory(defaultsGenerator)` → factory function
  - `generateTimestamp(daysAgo)` → string ISO
- **Funcionamento:** A factory gerada recebe `(overrides = {})`, incrementa `idCounter` automaticamente, e combina defaults com overrides. Se `id` for passado no override, o contador não é incrementado.

### `/tests/factories/index.js` (18 linhas)
- **Localização:** `tests/factories/index.js`
- **Propósito:** Ponto de entrada que reexporta todas as factories.
- **Exportações:** `createBaseFactory`, `postFactory`, `musicFactory`, `videoFactory`, `userFactory`

### `/tests/factories/post.js` (126 linhas)
- **Localização:** `tests/factories/post.js`
- **Propósito:** Gera dados de teste para posts do blog.
- **Funcionalidades:**
  - `postFactory(overrides)` — post completo com id, title, slug, excerpt, content, image_url, published
  - `postFactory.list(n)` — lista de n posts
  - `draftPostFactory(overrides)` — post não publicado
  - `publishedPostFactory(overrides)` — post publicado
  - `createPostInput(overrides)` — dados para criação (sem id/timestamps)
  - `updatePostInput(overrides)` — dados para atualização (campos opcionais)
- **Templates:** 10 títulos de posts religiosos ("A Jornada da Fé", "Caminhando com Propósito"), 5 conteúdos variados

### `/tests/factories/music.js` (160 linhas)
- **Localização:** `tests/factories/music.js`
- **Propósito:** Gera dados de teste para músicas com URLs do Spotify.
- **Funcionalidades:**
  - `musicFactory(overrides)` — música completa com titulo, artista, url_imagem, url_spotify
  - `musicFactory.list(n)` — lista de n músicas
  - `unpublishedMusicFactory(overrides)` — música não publicada
  - `publishedMusicFactory(overrides)` — música publicada
  - `invalidSpotifyMusicFactory(overrides)` — música com URL inválida (YouTube em vez de Spotify)
  - `createMusicInput(overrides)` — dados para criação
  - `updateMusicInput(overrides)` — dados para atualização
  - `detailedMusicFactory(overrides)` — música com álbum, gênero, ano, duração
  - `generateSpotifyUrl()` — gera URL spotify aleatória (track ID de 22 caracteres)
- **Templates:** 10 títulos de hinos gospel ("Amazing Grace", "How Great Thou Art"), 10 artistas cristãos

### `/tests/factories/video.js` (179 linhas)
- **Localização:** `tests/factories/video.js`
- **Propósito:** Gera dados de teste para vídeos do YouTube.
- **Funcionalidades:**
  - `videoFactory(overrides)` — vídeo completo com titulo, url_youtube, youtube_id, descricao
  - `videoFactory.list(n)` — lista de n vídeos
  - `unpublishedVideoFactory(overrides)` — vídeo não publicado
  - `publishedVideoFactory(overrides)` — vídeo publicado
  - `invalidYoutubeVideoFactory(overrides)` — vídeo com URL inválida (Vimeo em vez de YouTube)
  - `createVideoInput(overrides)` — dados para criação
  - `updateVideoInput(overrides)` — dados para atualização
  - `embeddableVideoFactory(overrides)` — vídeo com URLs embed e thumbnail
  - `extractYoutubeId(url)` — extrai ID do YouTube de URLs em 4 formatos diferentes
  - `generateYoutubeUrl(id)` — gera URL youtube aleatória (ID de 11 caracteres)
- **Templates:** 10 títulos de vídeos religiosos, 5 descrições variadas

### `/tests/factories/user.js` (153 linhas)
- **Localização:** `tests/factories/user.js`
- **Propósito:** Gera dados de teste para usuários com senhas hasheadas.
- **Funcionalidades:**
  - `userFactory(overrides)` — usuário completo com username, email, password, role, name, avatar
  - `userFactory.list(n)` — lista de n usuários
  - `adminFactory(overrides)` — usuário com role 'admin'
  - `regularUserFactory(overrides)` — usuário com role 'user'
  - `userFactory.withHash(overrides)` — usuário com senha hasheada via bcrypt (async), preserva senha original em `plainPassword`
  - `createUserInput(overrides)` — dados para criação
  - `loginInput(overrides)` — credenciais de login
  - `jwtPayloadFactory(overrides)` — payload JWT para testes (com iat/exp)
  - `invalidUserInput(type)` — 6 tipos de dados inválidos: empty, short, invalid_email, no_username, no_password, weak_password
- **Templates:** 10 nomes próprios, 10 sobrenomes, 5 domínios de email, geração de username automática com remoção de acentos

---

## 5. Helpers

### `/tests/helpers/index.js` (13 linhas)
- **Localização:** `tests/helpers/index.js`
- **Propósito:** Ponto de entrada que reexporta todos os helpers via `export *`.

### `/tests/helpers/api.js` (160 linhas)
- **Localização:** `tests/helpers/api.js`
- **Propósito:** Utilitários para criação de mocks HTTP usando `node-mocks-http` e verificação de respostas.
- **Exportações:**
  - `createApiMocks(options)` — wrapper sobre `createMocks` com defaults (host, content-type)
  - `createGetRequest(query, headers)` — requisição GET
  - `createPostRequest(body, headers)` — requisição POST
  - `createPutRequest(body, query, headers)` — requisição PUT
  - `createDeleteRequest(body, query, headers)` — requisição DELETE
  - `createPatchRequest(body, headers)` — requisição PATCH
  - `executeHandler(handler, req, res)` — executa handler e retorna { status, data, headers }
  - `createWebhookPayload(event, data)` — payload de webhook simulado
  - `createAuthRequest(token, options)` — requisição com Bearer token
  - `createCookieAuthRequest(token, options)` — requisição com cookie de autenticação
  - `getResponseBody(res)` — extrai corpo da resposta como objeto

### `/tests/helpers/auth.js` (243 linhas)
- **Localização:** `tests/helpers/auth.js`
- **Propósito:** Utilitários para criação de tokens JWT e mocks de autenticação. Usa `jsonwebtoken` e `bcryptjs`.
- **Exportações:**
  - `createAuthToken(payload, options)` — token JWT válido (secret do ambiente ou fallback hardcoded)
  - `createExpiredToken(payload)` — token JWT expirado (-1h)
  - `createInvalidToken()` — token inválido ("invalid.token.here")
  - `decodeToken(token)` — decodifica sem verificar
  - `isValidToken(token)` — verifica validade
  - `mockAuthenticatedUser(user)` — { user, token, headers, cookies }
  - `mockAuthenticatedAdmin(admin)` — igual ao acima com role 'admin'
  - `hashPassword(password)` — bcrypt hash
  - `verifyPassword(password, hash)` — bcrypt compare
  - `createMockAuthMiddleware(user)` — middleware de autenticação mockado
  - `mockAuthLib(options)` — módulo auth completo mockado (12 funções)
  - `clearAuthCookies()` — limpa cookies simulados (manipula `document.cookie`)
  - `createBearerHeader(token)` — header de autorização
  - `createAuthCookie(token)` — cookie de autenticação
  - `defaultTokenPayload` / `adminTokenPayload` — payloads padrão para testes

### `/tests/helpers/console.js` (80 linhas)
- **Localização:** `tests/helpers/console.js`
- **Propósito:** Utilitários para supressão controlada de console durante testes.
- **Exportações:**
  - `suppressConsoleError()` — spy silencioso para `console.error`. Uso: beforeEach/afterEach.
  - `filterConsoleError(suppressList)` — spy que suprime apenas warnings específicos
  - `mockGlobalFetch()` — mock de `global.fetch` com método `.mockRestore()` (contorna limitação do JSDOM onde `jest.spyOn(global, 'fetch')` não funciona)
  - `createConfirmSpy(defaultValue)` — spy para `window.confirm`

### `/tests/helpers/crud-test.js` (142 linhas)
- **Localização:** `tests/helpers/crud-test.js`
- **Propósito:** Utilitários para abstrair padrões repetitivos de testes CRUD de API. Usa `node-mocks-http`.
- **Exportações:**
  - `testPublicGetEndpoint(handler, config, customTests)` — testa endpoint GET público: 405 para método não permitido, 400 para paginação inválida, 500 para erro servidor + customTests
  - `testAdminCrudEndpoint(handler, config, customTests)` — testa endpoint CRUD admin: 401 sem autenticação + customTests (não testa 405 porque autenticação ocorre antes da verificação de método)
  - `testAdminGetEndpoint(handler, config, customTests)` — testa endpoint GET-only admin: 401, 405 + customTests
- **Design:** Cada função testa apenas o que não requer mocks específicos, delegando testes específicos via `customTests`.

### `/tests/helpers/db-test.js` (121 linhas)
- **Localização:** `tests/helpers/db-test.js`
- **Propósito:** Utilitários para testes com PostgreSQL real via Testcontainers.
- **Exportações:**
  - `isDockerAvailable()` — verifica se `process.env.TEST_DATABASE_URL` está definida e não é `'__docker_unavailable__'`
  - `createTestDb()` — cria pool de conexão PostgreSQL (max 5 conexões)
  - `applyMigrations()` — executa migrações via subprocesso `node scripts/migrate.js` com timeout de 30s
  - `withTransaction(pool)` — inicia transação com rollback automático, segurança contra falha de conexão
  - `truncateAll(pool)` — limpa todas as tabelas (TRUNCATE CASCADE), valida nomes com `validateIdentifier`

### `/tests/helpers/render.js` (272 linhas)
- **Localização:** `tests/helpers/render.js`
- **Propósito:** Utilitários para renderização de componentes React com providers. Usa `@testing-library/react` e `userEvent`.
- **Exportações:**
  - `renderWithProviders(ui, options)` — renderização básica com `userEvent.setup()`
  - `renderWithRouter(ui, options)` — renderização com Next.js Router mockado via `useRouter().mockReturnValue()`
  - `renderWithAuth(ui, options)` — renderização com contexto de autenticação (`AuthContext.Provider`)
  - `renderWithToast(ui, options)` — renderização com Toast provider (`react-hot-toast`)
  - `testLoadingState(ui, loadingTestId)` — helper para testar estado de loading
  - `testErrorState(ui, errorMessage)` — helper para testar estado de erro
  - `resizeWindow(width, height)` — simula redimensionamento
  - `setMobileViewport()`, `setTabletViewport()`, `setDesktopViewport()` — breakpoints predefinidos
  - `waitForAnimation(duration)` — aguarda animação via setTimeout
  - `clickAndWait(user, element)` — clica e aguarda animação
  - `fillForm(user, fields)` — preenche formulário (label ou testId)
  - `clearForm(user, fieldLabels)` — limpa formulário

---

## 6. Matchers Customizados

### `/tests/matchers/index.js` (12 linhas)
- **Localização:** `tests/matchers/index.js`
- **Propósito:** Ponto de entrada que importa todos os matchers customizados via efeito colateral (`import './...'`).

### `/tests/matchers/toHaveStatus.js` (45 linhas)
- **Propósito:** Verifica se uma resposta HTTP tem o status esperado.
- **Uso:** `expect(res).toHaveStatus(200)`
- **Suporta:** `node-mocks-http` (`_getStatusCode()`), `fetch` (`status`), `http.ServerResponse` (`statusCode`)

### `/tests/matchers/toBeValidJSON.js` (52 linhas)
- **Propósito:** Verifica se uma resposta contém JSON válido, opcionalmente com `expect.objectContaining`.
- **Uso:** `expect(res).toBeValidJSON()` ou `expect(res).toBeValidJSON({ id: 1 })`
- **Suporta:** Objetos com `.data`, `._getData()`, `.body`, ou string direta.

### `/tests/matchers/toHaveHeader.js` (55 linhas)
- **Propósito:** Verifica se uma resposta HTTP tem um header específico, opcionalmente com valor. Normaliza case.
- **Uso:** `expect(res).toHaveHeader('content-type')` ou `expect(res).toHaveHeader('content-type', 'application/json')`

### `/tests/matchers/toBeISODate.js` (82 linhas)
- **Propósito:** Verifica se uma string está em formato ISO 8601 e é uma data válida. Inclui também matcher `toBeValidDate`.
- **Uso:** `expect(dateString).toBeISODate()` ou `expect(date).toBeValidDate()`
- **Suporta:** Date objects, strings, números (timestamps).

### `/tests/matchers/toHaveProperties.js` (30 linhas)
- **Propósito:** Verifica se um objeto possui todas as propriedades listadas.
- **Uso:** `expect(obj).toHaveProperties(['id', 'name'])` ou `expect(obj).toHaveProperties('email')`

---

## 7. Mocks

### `/tests/mocks/index.js` (14 linhas)
- **Localização:** `tests/mocks/index.js`
- **Propósito:** Ponto de entrada que reexporta todos os mocks via `export *`.

### `/tests/mocks/auth.js` (67 linhas)
- **Localização:** `tests/mocks/auth.js`
- **Propósito:** Mock reutilizável do módulo `lib/auth.js`.
- **Exportações:**
  - `mockAuthModule(overrides)` — módulo auth completo (11 funções mockadas: hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, getAuthCookie, getAuthToken, authenticate, authenticateAndGenerateToken, withAuth, initializeAuth)
  - `mockAuthFailure()` — módulo auth simulando falha (getAuthToken → null, verifyToken → null, withAuth → 401)
  - `resetAuthMocks(authMock)` — reseta todos os mocks para estado padrão

### `/tests/mocks/cache.js` (29 linhas)
- **Localização:** `tests/mocks/cache.js`
- **Propósito:** Mock reutilizável do módulo `lib/cache.js`.
- **Exportações:**
  - `mockCacheModule(overrides)` — módulo cache mockado: `getOrSetCache` (executa fetchFunction), `checkRateLimit` (false), `invalidateCache` (noop)
  - `resetCacheMocks(cacheMock)` — reseta mocks para comportamento padrão

### `/tests/mocks/db-module.js` (63 linhas)
- **Localização:** `tests/mocks/db-module.js`
- **Propósito:** Mock centralizado do módulo `lib/db.js` para testes de integração de API admin.
- **Exportações:**
  - `mockDb(overrides)` — módulo db completo: query, resetPool, closeDatabase, transaction (com BEGIN/COMMIT/ROLLBACK), healthCheck, getDatabaseInfo
  - `mockDbError(error)` — módulo db simulando erro de conexão
  - `resetDbMocks(dbMock)` — reseta mocks
- **Uso típico:** `jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb())`

### `/tests/mocks/db.js` (235 linhas)
- **Localização:** `tests/mocks/db.js`
- **Propósito:** Mocks granulares para operações de banco de dados. Mais completo que db-module.js.
- **Exportações:**
  - `mockQuery(returnValue)` — mock de query com retorno configurável
  - `mockQueryOne(row)` — mock que retorna uma linha
  - `mockQueryMany(rows)` — mock que retorna múltiplas linhas
  - `mockQueryError(error)` — mock que lança erro
  - `mockInsert(insertedRow)` — simula INSERT
  - `mockUpdate(updatedRow)` — simula UPDATE
  - `mockDelete(deletedId)` — simula DELETE
  - `mockTransaction(callback)` — simula transação
  - `mockPool(options)` — pool de conexões mockado
  - `queryWasCalledWith(queryMock, pattern)` — verifica chamada por padrão
  - `getQueryParams(queryMock, callIndex)` — obtém parâmetros
  - `mockDbModule(options)` — módulo db completo
  - `mockPaginatedResult(data, page, limit)` — simula paginação
  - `clearQueryMocks(...mocks)` — limpa múltiplos mocks
  - `mockQuerySequence(responses)` — respostas sequenciais

### `/tests/mocks/fetch.js` (181 linhas)
- **Localização:** `tests/mocks/fetch.js`
- **Propósito:** Mocks para requisições `fetch`.
- **Exportações:**
  - `mockFetch(response, options)` — mock base com suporte a Headers, Blob, FormData, ArrayBuffer
  - `mockFetchSuccess(data)` — fetch 200 OK
  - `mockFetchError(status, error)` — fetch com erro HTTP
  - `mockFetchNotFound()` — 404
  - `mockFetchUnauthorized()` — 401
  - `mockFetchServerError()` — 500
  - `mockFetchNetworkError(message)` — erro de rede (rejected promise)
  - `mockFetchWithRoutes(urlMap)` — rotas baseadas em URL (suporta RegExp)
  - `mockFetchSequence(responses)` — respostas em sequência
  - `fetchDelay(ms)` — delay simulado
  - `setupFetchMock(mockImpl)` — configura `global.fetch`
  - `clearFetchMock()` — limpa mock
  - `fetchWasCalledWith(fetchMock, url)` — verifica chamada por URL
  - `getLastFetchCall(fetchMock)` — último call

### `/tests/mocks/next.js` (213 linhas)
- **Localização:** `tests/mocks/next.js`
- **Propósito:** Implementações individuais de mocks de componentes e hooks do Next.js. Usa `React.createElement`.
- **Exportações:**
  - `mockUseRouter(options)` — router mockado completo (Pages Router): push, replace, reload, back, prefetch, events, locale...
  - `mockNextImage(props)` — componente Image → tag `<img>`
  - `mockNextLink(props)` — componente Link → tag `<a>`
  - `mockNextHead(props)` — componente Head → Fragment
  - `mockNextScript(props)` — componente Script → tag `<script>`
  - `mockNextDynamic(importFunc, options)` — dynamic import mockado
  - `mockGetServerSideProps(data)` — resultado de getServerSideProps
  - `mockGetStaticProps(data)` — resultado de getStaticProps (com revalidate: 60)
  - `mockGetStaticPaths(paths)` — resultado de getStaticPaths (fallback: false)
  - `mockNextHeaders(headers)` — headers mockados (App Router com iterador)
  - `mockNextCookies(cookies)` — cookies mockados (App Router com iterador)
  - `setupNextMocks()` — (deprecated) configura todos os mocks

### `/tests/mocks/next-setup.js` (147 linhas)
- **Localização:** `tests/mocks/next-setup.js`
- **Propósito:** Setup automático que registra todos os `jest.mock()` para módulos do Next.js, eliminando duplicação.
- **Módulos mockados:** `next/router` (Pages Router), `next/navigation` (App Router), `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`, `next/headers`, `next/server`
- **Uso:** `import '../../mocks/next-setup.js';` no início do arquivo de teste.
- **Destaque:** Mock de `next/server` usa `jest.requireActual` combinado com spies.

### `/tests/mocks/next.test.js` (146 linhas)
- **Localização:** `tests/mocks/next.test.js`
- **Propósito:** Teste de sanidade para verificar se os mocks do Next.js funcionam corretamente. Deve ser executado sempre que a versão do Next.js for atualizada.
- **Testes:** 7 describes testando exportações de `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/headers`
- **Padrão:** `jest.requireMock` + render de componentes mockados + assertions de DOM

---

## 8. Exemplos

### `/tests/examples/component-example.test.js` (565 linhas)
- **Localização:** `tests/examples/component-example.test.js`
- **Propósito:** Demonstração completa de como usar todos os helpers para criar testes de componentes React.
- **Cenários:** PostList (renderização vazia/com dados, interações de exclusão, loading/erro), PostForm (formulário vazio, dados iniciais, digitação, submissão, factory), responsividade (mobile/desktop), Router mockado, autenticação, fetch mockado (sucesso/erro)
- **Componentes mockados inline:** `MockPostList`, `MockPostForm`, `MockLoadingComponent`, `MockErrorComponent`, `MockFetchComponent` — não existem no código real do projeto.
- **Ferramentas demonstradas:** `postFactory`, `renderWithProviders`, `renderWithRouter`, `renderWithAuth`, `setMobileViewport`, `setDesktopViewport`, `fillForm`, `mockFetchSuccess`, `mockFetchError`, `mockGlobalFetch`, `userEvent`, `waitFor`, `screen`

### `/tests/examples/simple-test.test.js` (234 linhas)
- **Localização:** `tests/examples/simple-test.test.js`
- **Propósito:** Demonstração básica da arquitetura de teste. Validates all factories and helpers.
- **Cenários:** Factories (post, music, video, user, admin, criação/atualização), API helpers (createApiMocks, createPostRequest, toHaveStatus, toBeValidJSON), Auth helpers (JWT tokens, mockAuthenticatedUser, mockAuthenticatedAdmin), matchers customizados (toBeISODate, toHaveHeader), mocks (mockQuery, mockFetchSuccess), fluxo completo integrado (admin autenticado cria post e verifica resposta)
- **Ferramentas demonstradas:** Todas as factories, `createApiMocks`, `createPostRequest`, `createGetRequest`, `createAuthToken`, `mockAuthenticatedUser`, `mockAuthenticatedAdmin`, `mockQuery`, `mockFetchSuccess`, `createPostInput`

---

## 9. Testes de Integração — API Pública

Endpoints públicos testados com mocks de banco de dados via `db-module.js` (sem container real). Usam `node-mocks-http` para simular requisições.

### `/tests/integration/api/audit.test.js` (31 linhas)
- **Propósito:** Testa a função `logActivity` do domínio de auditoria.
- **Testes:** Inserção de log com parâmetros completos (admin, CREATE, POST, id, detalhes, IP, client); uso de valores padrão para IP vazio e opções omitidas.
- **jest.mock:** `lib/db.js` → `{ query: jest.fn() }`
- **Padrão:** Teste de função de domínio isolada (NÃO é teste de endpoint HTTP), localizado inadequadamente em `integration/api/`.

### `/tests/integration/api/dicas.test.js`
- **Propósito:** Testa o endpoint público `/api/dicas` (GET-only, paginado).
- **Testes:** Listagem paginada de dicas publicadas (page, limit, total, totalPages), erro 500 no banco, 405 para métodos não permitidos, invalidação de cache entre testes.
- **jest.mock:** `lib/db.js`, `lib/cache.js`

### `/tests/integration/api/login.test.js`
- **Propósito:** Testa o endpoint de login `/api/auth/login`.
- **Testes:** Login bem-sucedido (retorna user + token), senha incorreta (401), usuário inexistente (401), campos vazios (400), 405 para GET.
- **jest.mock:** `lib/auth.js`, `lib/cache.js`

### `/tests/integration/api/musicas.*.test.js` (6 arquivos)
- **Arquivos e linhas:**
  - `musicas.create.test.js` (91 linhas) — Testa handler inline de criação. Valida campos obrigatórios (titulo, artista, url_spotify). 3 testes: criação com sucesso (201), 400 para campos faltando, 405 para método não permitido.
  - `musicas.delete.test.js` — Testa deleção de música.
  - `musicas.flow.test.js` — Testa fluxo completo (CRUD integrado).
  - `musicas.integration.test.js` — Testa integração com banco mockado.
  - `musicas.pagination.test.js` — Testa paginação do endpoint.
  - `musicas.test.js` — Testes gerais do endpoint de músicas.
- **Propósito geral:** Cobrem GET (listagem, paginação, busca por título/artista), POST (criação com validação), DELETE, fluxos completos.
- **Padrão:** Uso de `createMocks`, handlers mockados inline, validação de campos.

### `/tests/integration/api/posts.*.test.js` (6 arquivos)
- **Arquivos:** `posts.create.api.test.js`, `posts.delete.test.js`, `posts.flow.test.js`, `posts.general.test.js`, `posts.integration.test.js`, `posts.test.js`
- **Propósito:** Testes de GET (listagem, paginação, busca), criação (POST), deleção (DELETE) e fluxos completos de posts.
- **Padrão:** Similar a musicas, com `createMocks` e handlers inline.

### `/tests/integration/api/videos.*.test.js` (6 arquivos)
- **Arquivos:** `videos.create.api.test.js`, `videos.delete.test.js`, `videos.flow.test.js`, `videos.integration.test.js`, `videos.pagination.api.test.js`, `videos.test.js`
- **Propósito:** Testes de GET (listagem, paginação, busca), criação (POST), deleção (DELETE) e fluxos completos de vídeos.

### `/tests/integration/api/products.test.js`
- **Propósito:** Testa o endpoint público `/api/products`.
- **Testes:** Listagem de produtos, 405 para métodos não permitidos.

### `/tests/integration/api/settings.*.test.js` (2 arquivos)
- **Arquivos:** `settings.test.js`, `settings.general.test.js`
- **Propósito:** Leitura e atualização de configurações.

### `/tests/integration/api/stats.test.js`
- **Propósito:** Testa o endpoint de estatísticas públicas.
- **Testes:** Retorno de estatísticas, 405 para não-GET.

### `/tests/integration/api/status.test.js`
- **Propósito:** Testa o endpoint de health check `/api/status`.
- **Testes:** Retorno de status do servidor (uptime, versão, etc).

### `/tests/integration/api/upload-image.test.js`
- **Propósito:** Testa o upload de imagens via `formidable` e `sharp`.
- **Testes:** Upload bem-sucedido, validação de tipo MIME, validação de tamanho.

### `/tests/integration/api/placeholder-image.test.js`
- **Propósito:** Testa a geração de placeholder para imagens.
- **Testes:** Geração de imagem placeholder.

### `/tests/integration/api/cleanup-test-data.test.js`
- **Propósito:** Utilitário para limpar dados gerados durante testes de integração.

---

## 10. Testes de Integração — API Admin

Endpoints administrativos testados com mocks de banco e autenticação. **Total: 14 arquivos, ~2.250 linhas.**

### `/tests/integration/api/admin/audit.test.js` (150 linhas)
- **Propósito:** Testa o endpoint `/api/admin/audit` para logs de auditoria.
- **Testes:** 401 sem token, 403 sem permissão, 200 com logs paginados e filtros de data, tratamento de tabela ausente (erro 42P01 → auto-criação), 500 em erro de banco.
- **jest.mock:** `lib/db.js`, `lib/auth.js`

### `/tests/integration/api/admin/backups.test.js`
- **Propósito:** Testa o endpoint de gerenciamento de backups.
- **Testes:** Criação, listagem e restauração de backups.

### `/tests/integration/api/admin/cache.test.js`
- **Propósito:** Testa o endpoint de gerenciamento de cache.
- **Testes:** Invalidação de cache.

### `/tests/integration/api/admin/dicas.test.js`
- **Propósito:** Testa o endpoint CRUD de dicas (admin).
- **Testes:** Autenticação (401/403), CRUD completo (GET, POST, PUT, DELETE), autorização por role/permissão.

### `/tests/integration/api/admin/fetch-ml.test.js`
- **Propósito:** Testa o endpoint de busca de produtos do Mercado Livre.
- **Testes:** Fetch via API, fallback para scraping HTML, tratamento de erro.

### `/tests/integration/api/admin/fetch-spotify.test.js`
- **Propósito:** Testa o endpoint de busca de músicas do Spotify.
- **Testes:** Fetch via API, tratamento de erro.

### `/tests/integration/api/admin/fetch-youtube.test.js`
- **Propósito:** Testa o endpoint de busca de vídeos do YouTube.
- **Testes:** Fetch via API, tratamento de erro.

### `/tests/integration/api/admin/musicas.test.js`
- **Propósito:** Testa o endpoint CRUD de músicas (admin).
- **Testes:** Autenticação, CRUD completo (GET, POST, PUT, DELETE), autorização.

### `/tests/integration/api/admin/posts.test.js`
- **Propósito:** Testa o endpoint CRUD de posts (admin).
- **Testes:** Autenticação, CRUD completo, autorização.

### `/tests/integration/api/admin/rate-limit.test.js`
- **Propósito:** Testa o endpoint de rate limiting.
- **Testes:** Listagem de IPs bloqueados, whitelist, exportação CSV, logs de auditoria, adicionar/remover IP, desbloqueio.

### `/tests/integration/api/admin/roles.test.js`
- **Propósito:** Testa o endpoint CRUD de cargos/permissões.
- **Testes:** CRUD de cargos, atribuição de permissões.

### `/tests/integration/api/admin/users.test.js` e `users.create.test.js` (2 arquivos)
- **Propósito:** Testam o endpoint admin de usuários.
- **Testes:** Listagem, criação, atualização, deleção, criação com validação.

### `/tests/integration/api/admin/videos.test.js`
- **Propósito:** Testa o endpoint CRUD de vídeos (admin).
- **Testes:** Autenticação, CRUD completo, autorização.

---

## 11. Testes de Integração — Autenticação

### `/tests/integration/api/auth/check.test.js`
- **Propósito:** Testa o endpoint de verificação de autenticação.
- **Testes:** Token válido (200 + user), token inválido (401), token expirado (401).

### `/tests/integration/api/auth/login.test.js`
- **Propósito:** Testa o endpoint de login.
- **Testes:** Login bem-sucedido, falha de autenticação, rate limiting, bloqueio por muitos tentativas.

### `/tests/integration/api/auth/logout.test.js`
- **Propósito:** Testa o endpoint de logout.
- **Testes:** Logout limpa cookie e token, logout sem token ainda funciona.

### `/tests/integration/auth/auth.test.js`
- **Propósito:** Testes de fluxo de autenticação completos (integração com banco real via Testcontainers).
- **Testes:** Registro, login, refresh de token, logout.
- **jest.mock:** Não usa mocks — usa banco PostgreSQL real.

---

## 12. Testes de Integração — Domínio/BD Real

Testes que usam PostgreSQL real via Testcontainers (`jest.config.db.js`). Validam operações CRUD reais no banco.

### `/tests/integration/domain/musicas.db.test.js`
- **Propósito:** CRUD de músicas com PostgreSQL real.
- **Conexão:** `tests/helpers/db-test.js` (createTestDb, withTransaction), `tests/global-setup.db.js`

### `/tests/integration/domain/posts.db.test.js`
- **Propósito:** CRUD de posts com PostgreSQL real.

### `/tests/integration/domain/products.db.test.js`
- **Propósito:** CRUD de produtos com PostgreSQL real.

### `/tests/integration/domain/settings.db.test.js`
- **Propósito:** CRUD de configurações com PostgreSQL real.

### `/tests/integration/domain/videos.db.test.js`
- **Propósito:** CRUD de vídeos com PostgreSQL real.

**Padrão comum:** Todos usam `describe` com `beforeAll` para criar pool e aplicar migrações, `afterAll` para fechar pool, `withTransaction` para isolar cada teste com rollback automático.

---

## 13. Testes Unitários — Componentes React

### `/tests/unit/components/Header.test.js`
- **Propósito:** Testes do componente de cabeçalho/Header.
- **Testes:** Renderização, navegação, responsividade.

### `/tests/unit/components/SeoPerformance.test.js`
- **Propósito:** Testes do componente de métricas de performance SEO.
- **Testes:** Renderização com métricas.

### `/tests/unit/components/Admin/` (18 arquivos)
- **Propósito:** Testes de componentes administrativos.
- **Arquivos:** `AdminAudit.test.js`, `AdminCrudBase.test.js`, `AdminDashboard.test.js`, `AdminDicas.test.js`, `AdminMusicas.test.js`, `AdminPosts.test.js`, `AdminProducts.test.js`, `AdminRolesTab.test.js`, `AdminUsers.test.js`, `AdminUsersTab.test.js`, `AdminVideos.test.js`, `ImageUploadField.test.js`, `TextAreaField.test.js`, `TextField.test.js`, `ToggleField.test.js`, `UrlField.test.js`, `withAdminAuth.test.js`, `index.test.js`
- **Padrões:** Mock de fetch global, interceptação de toast (`react-hot-toast`), confirmação de modais (`window.confirm`), renderização com providers (`renderWithProviders`, `renderWithRouter`, `renderWithAuth`).

### `/tests/unit/components/Features/` (12 arquivos)
- **Propósito:** Testes de componentes de funcionalidades: Blog (seção e cards), ContentTabs (componente com abas), Music (galeria e cards com parsing de URL Spotify), Products (cards com lightbox, carrossel, links de marketplace), Products Listing (busca, filtro, paginação), Testimonials (carrossel de depoimentos), Video (galeria com busca com debounce).

### `/tests/unit/components/Layout/` (5 arquivos + snapshots)
- **Arquivos:** `Container.test.js` (semantic tags: section, div, article, main, aside), `Grid.test.js` (responsivo, CSS custom properties), `Sidebar.test.js` (collapse/expand, overlay mobile, subcomponentes), `Stack.test.js` (HStack e VStack), `index.test.js` (barrel exports)

### `/tests/unit/components/Performance/` (5 arquivos + snapshots)
- **Arquivos:** `CriticalCSS.test.js` (injeção e remoção de CSS crítico), `ImageOptimized.test.js` (skeleton, fallback em erro de src), `LazyIframe.test.js` (lazy loading com IntersectionObserver, corrigido para usar `waitFor` para aguardar fila assíncrona de carregamento e thumbnail `hqdefault.jpg`), `PreloadResources.test.js` (pré-carregamento de recursos), `index.test.js` (barrel exports)

### `/tests/unit/components/SEO/` (9 arquivos + snapshots)
- **Arquivos:** `ArticleSchema.test.js`, `BreadcrumbSchema.test.js`, `Head.test.js` (meta tags, título, Open Graph), `index.test.js`, `MusicSchema.test.js`, `OrganizationSchema.test.js`, `VideoSchema.test.js`, `WebsiteSchema.test.js`

### `/tests/unit/components/UI/` (6 arquivos)
- **Arquivos:** `Alert.test.js` (tipos: success, error, warning, info, com botão de fechar), `Badge.test.js` (cores, variantes), `Button.test.js` (variantes, loading, disabled, onClick), `Card.test.js` (título, conteúdo, footer), `Input.test.js` (label, erro, placeholder, onChange), `Modal.test.js` (abrir/fechar, overlay, conteúdo, onClose)

---

## 14. Testes Unitários — API Lib (Submódulos)

### `/tests/unit/lib/api/errors.test.js` (248 linhas)
- **Propósito:** Testa 10 classes de erro customizadas: `ApiError` (base), `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `InternalError`, `ServiceUnavailableError`, `ExternalServiceError`.
- **Testes:** Status code, mensagem padrão, serialização `toJSON()`, herança correta.

### `/tests/unit/lib/api/middleware.test.js` (319 linhas)
- **Propósito:** Testa 12 middlewares: `compose`, `withMethod`, `withAuth`, `withOptionalAuth`, `withRateLimit`, `withCORS`, `withErrorHandler`, `withLogger`, `withTimeout`, `withBodyParser`, `withCache`, e builders `publicApi`, `protectedApi`.
- **Testes:** Composição, métodos HTTP, autenticação, rate limit, CORS, tratamento de erro, logging, timeout, body parser, cache.

### `/tests/unit/lib/api/response.test.js` (342 linhas)
- **Propósito:** Testa 16 funções de resposta: `success`, `paginated`, `created`, `noContent`, `updated`, `deleted`, `badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `methodNotAllowed`, `conflict`, `tooManyRequests`, `serverError`, `serviceUnavailable`, e `handleError`.
- **Testes:** Status code, corpo da resposta, tratamento de erro.

### `/tests/unit/lib/api/validate.test.js` (325 linhas)
- **Propósito:** Testa middlewares de validação Zod: `formatZodErrors`, `validateBody`, `validateQuery`, `validateParams`, `validateHeaders`, `validateRequest`, e schemas helpers `createPaginationSchema`, `createSearchSchema`.
- **Testes:** Validação de body, query, params, headers, formatação de erros, schemas combinados.

### `/tests/unit/lib/api/index.test.js` (19 linhas)
- **Propósito:** Barrel export verification. Verifica que todos os submodules e named exports são reexportados.

### `/tests/unit/lib/backup/` (múltiplos arquivos)
- **Propósito:** Testes do sistema de backup (criação, restauração, listagem, limpeza).

### `/tests/unit/lib/db/` (múltiplos arquivos)
- **Propósito:** Testes de operações de banco de dados (queries, transações, migrações).

### `/tests/unit/lib/seo/` (múltiplos arquivos)
- **Propósito:** Testes de funções SEO (meta tags, schemas, Open Graph, etc).

---

## 15. Testes Unitários — Lib (Core)

### `/tests/unit/lib/auth.test.js`
- **Propósito:** Testes do módulo de autenticação.
- **Testes:** Hash de senha (bcrypt), geração de token JWT, verificação de token, cookie de autenticação, middleware `withAuth`.

### `/tests/unit/lib/cache.test.js`
- **Propósito:** Testes do módulo de cache.
- **Testes:** `getOrSetCache` (cache hit/miss), `checkRateLimit`, `invalidateCache`.

### `/tests/unit/lib/crud.test.js`
- **Propósito:** Testes do módulo genérico de CRUD.
- **Testes:** Criação (`createRecord`), leitura (`getRecords`, `getRecordById`), atualização (`updateRecords`), deleção (`deleteRecords`), paginação, filtros.

### `/tests/unit/lib/db.test.js`
- **Propósito:** Testes do módulo de conexão com banco de dados.
- **Testes:** Pool de conexões, queries, transações, health check.

### `/tests/unit/lib/middleware.test.js`
- **Propósito:** Testes de middlewares HTTP.
- **Testes:** Middleware de método, autenticação, CORS, logging, erro.

### `/tests/unit/lib/redis.test.js`
- **Propósito:** Testes do módulo Redis.
- **Testes:** Conexão, operações básicas (get/set), pipeline, rate limiting.

---

## 16. Testes Unitários — Domínio

### `/tests/unit/domain/posts.test.js`
- **Propósito:** Testes da lógica de domínio de posts.
- **Testes:** Queries de listagem com filtros, paginação, criação, atualização, deleção.

### `/tests/unit/domain/settings.test.js`
- **Propósito:** Testes da lógica de domínio de configurações.
- **Testes:** Leitura, atualização, cache de configurações.

### `/tests/unit/domain/videos.test.js`
- **Propósito:** Testes da lógica de domínio de vídeos.
- **Testes:** Queries de listagem, paginação, filtros por título/descrição, validação de URL.

---

## 17. Testes Unitários — Páginas e Handlers de API

Testes que focam em cenários de borda (edge cases) para handlers de API. Usam `node-mocks-http`.

### `/tests/unit/pages/api/upload-image.edge.test.js` (66 linhas)
- **Handler:** `pages/api/upload-image.js`
- **Mocks:** `fs` (existsSync, mkdirSync, rename, unlink), `sharp`, `formidable`, `lib/domain/settings`, `lib/auth`
- **Testes:** Criação de diretório de upload se não existir.

### `/tests/unit/pages/api/admin/dicas.edge.test.js` (54 linhas)
- **Handler:** `pages/api/admin/dicas.js`
- **Mocks:** `lib/db.js` (db-module), `lib/auth.js`, `lib/domain/audit.js`
- **Testes:** IP padrão (127.0.0.1) e valor padrão de `published` (true) em POST e PUT.

### `/tests/unit/pages/api/admin/fetch-ml.edge.test.js` (189 linhas)
- **Handler:** `pages/api/admin/fetch-ml.js`
- **Mocks:** `lib/auth.js`, `global.fetch` via `mockGlobalFetch`
- **Testes:** Ordenação de IDs (explicitId primeiro), fallback de catálogo com descrição vazia, fallback HTML com preço inválido (isNaN), fallback HTML com priceMatch, fallback de imagens (url vs secure_url), erro de texto HTML no scraping.

### `/tests/unit/pages/api/admin/fetch-spotify.edge.test.js` (51 linhas)
- **Handler:** `pages/api/admin/fetch-spotify.js`
- **Mocks:** `lib/auth.js`, `global.fetch` via `mockGlobalFetch`
- **Testes:** Falha em todas as 3 estratégias (oEmbed, Iframe, HTML) → 500 com mensagem de erro.

### `/tests/unit/pages/api/admin/posts.edge.test.js` (165 linhas)
- **Handler:** `pages/api/admin/posts.js`
- **Mocks:** `lib/db.js` (db-module), `lib/auth.js`, `lib/cache.js`, `lib/domain/posts.js`, `lib/crud.js`, `lib/domain/audit.js`
- **Testes:** 401 sem user, 403 sem permissão, permissões vazias, validação Zod (image_url inválida), ID inválido no PUT, sem dados no PUT, erro no DELETE (500), erro no PUT (500), 405 para PATCH, reorder de posts.

### `/tests/unit/pages/api/admin/rate-limit.test.js` (194 linhas)
- **Handler:** `pages/api/admin/rate-limit.js`
- **Mocks:** `@upstash/redis` (Redis mock completo), `lib/auth.js`. Usa `jest.resetModules()` para recarregar handler.
- **Testes:** Redis não configurado (501), exportação CSV com filtros de data e busca, IP atual (::1 → 127.0.0.1), whitelist, logs de auditoria com paginação, IPs bloqueados (com threshold), sem chaves Redis, adicionar IP à whitelist (+ auditoria), 400 sem IP, remover IP da whitelist, desbloquear IP com fallback de usuário, 400 sem IP no DELETE, 405 para PUT, erro interno (500).

### `/tests/unit/pages/api/admin/roles.edge.test.js` (121 linhas)
- **Handler:** `pages/api/admin/roles.js`
- **Mocks:** `lib/auth.js` (custom com getAuthToken/verifyToken/withAuth), `lib/db.js` (db-module), `lib/crud.js`, `lib/domain/audit.js`
- **Testes:** Role misteriosa sem permissões (403), POST com permissões como string (JSON.stringify), PUT extraindo ID da query, DELETE com fallback de nome (cargo não encontrado).

### `/tests/unit/pages/api/admin/stats.edge.test.js` (64 linhas)
- **Handler:** `pages/api/admin/stats.js`
- **Mocks:** `lib/auth.js`, `lib/db.js` (db-module)
- **Testes:** 405 para POST, 500 em erro de banco.

### `/tests/unit/pages/api/auth/login.edge.test.js` (62 linhas)
- **Handler:** `pages/api/auth/login.js`
- **Mocks:** `lib/auth.js`, `lib/cache.js`, `lib/logger.js`
- **Testes:** 500 em erro interno durante autenticação, verificação de log via `logger.error`.

---

## 18. Testes Unitários — Scripts

### `/tests/unit/scripts/backup.test.js` (86 linhas)
- **Propósito:** Testa o sistema de backup (`scripts/backup.js`).
- **Testes:** Exportação de 6 funções (createBackup, restoreBackup, cleanupOldBackups, getAvailableBackups, getBackupLogs, initializeBackupSystem) via ESM. Uso de `jest.unstable_mockModule` e `jest.isolateModules`.
- **Mocks:** `child_process` (spawn), `fs`, `date-fns`, `scripts/utils/constants.js`

### `/tests/unit/scripts/clean-orphaned-images.test.js` (92 linhas)
- **Propósito:** Testa a limpeza de imagens órfãs (`scripts/clean-orphaned-images.js`).
- **Testes:** Remove arquivos órfãos, protege imagens em uso (verifica prefixo no BD), tratamento de diretório uploads ausente, resiliência a erros de BD, tolerância a colunas ausentes.
- **Mocks:** `fs`, `pg` (global __mocks__/pg.js), `dotenv`

### `/tests/unit/scripts/clear-db.test.js` (68 linhas)
- **Propósito:** Testa a limpeza completa do banco (`scripts/clear-db.js`).
- **Testes:** TRUNCATE em posts, videos, musicas, images, settings, users com CASCADE. Verifica ordenação das tabelas.

### `/tests/unit/scripts/clear-musicas.test.js`
- **Propósito:** Testa a limpeza específica de músicas.

### `/tests/unit/scripts/init-table.test.js`
- **Propósito:** Testa a inicialização de tabelas no banco.

### `/tests/unit/scripts/migrate.test.js`
- **Propósito:** Testa o sistema de migrações.

### `/tests/unit/scripts/reset-password.test.js`
- **Propósito:** Testa o script de reset de senha.

### `/tests/unit/scripts/seed-all.test.js`
- **Propósito:** Testa o script de seed de dados.

### `/tests/unit/scripts/validate-schema.test.js`
- **Propósito:** Testa a validação de schema do banco.

---

## 19. Testes Unitários — Top Level

### `/tests/unit/[slug].test.js`
- **Propósito:** Testa a página de post individual do blog (`pages/[slug].js`).
- **Testes:** Renderização de conteúdo (título, data, imagem), botões de compartilhamento WhatsApp e Facebook com URLs codificadas, ocultação de imagem quando `image_url` é null.
- **Padrão:** `@testing-library/react` com `React.createElement`, CSS module mock, `encodeURIComponent`.

### `/tests/unit/clean-test-db.test.js`
- **Propósito:** Testa o script de limpeza do banco de teste (`scripts/clean-test-db.js`).
- **Testes:** Remove arquivos `test.db` e `caminhar-test.db` quando existem, não faz nada quando não existem. Mock de `fs`.
- **Padrão:** Função reimplementada inline (não importa o módulo real).

### `/tests/unit/index.test.js`
- **Propósito:** Testa a página inicial (`pages/index.js`).

### `/tests/unit/settings.cache.test.js`
- **Propósito:** Testa o cache de configurações.

### `/tests/unit/videos.validation.test.js`
- **Propósito:** Testa a validação de URLs de vídeo (YouTube, Vimeo, etc).