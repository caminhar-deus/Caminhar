# Análise do Projeto — Testes (`/tests/`)

> **Data:** 13/05/2026 (atualizado em 06/06/2026 — 8ª revisão)
> **Objetivo:** Documentar de forma objetiva, clara e focada todos os arquivos de teste do projeto, descrevendo localização, propósito e funcionalidade de cada um.

---

## Sumário

1. [Estrutura Geral](#1-estrutura-geral)
2. [Configuração Global](#2-configuração-global)
3. [Infraestrutura de Testes](#3-infraestrutura-de-testes)
4. [Testes de Integração](#4-testes-de-integração)
5. [Testes Unitários](#5-testes-unitários)
6. [Resumo Quantitativo](#6-resumo-quantitativo)

---

## 1. Estrutura Geral

```
tests/
├── setup.js                          # Bootstrap global de testes (jsdom)
├── setup.db.js                       # Bootstrap específico para testes com banco real (node)
├── global-setup.db.js                # GlobalSetup: container PostgreSQL (Testcontainers)
├── examples/                         # Exemplos/demonstração da arquitetura
├── factories/                        # Fábricas de dados de teste
├── helpers/                          # Utilitários auxiliares
├── matchers/                         # Matchers customizados Jest
├── mocks/                            # Mocks globais reutilizáveis
├── integration/                      # Testes de integração
│   ├── domain/                       #   Testes com PostgreSQL real (*.db.test.js)
│   ├── *.test.js                     #   Fluxos CRUD principais
│   ├── api/                          #   Testes de API endpoints
│   │   ├── *.test.js
│   │   ├── admin/                    #     Endpoints administrativos
│   │   └── auth/                     #     Endpoints de autenticação
│   └── auth/                         #   Testes de autenticação v1
└── unit/                             # Testes unitários
    ├── *.test.js                     #   Testes de páginas e utilitários
    ├── components/                   #   Testes de componentes React
    │   ├── Admin/                    #     Componentes administrativos
    │   │   ├── Managers/             #       Gerenciadores (backup, cache)
    │   │   └── Tools/                #       Ferramentas (integridade, rate-limit)
    │   ├── Features/                 #     Componentes de funcionalidades
    │   │   ├── Blog/                 #       Blog
    │   │   ├── ContentTabs/          #       Abas de conteúdo
    │   │   ├── Music/                #       Música
    │   │   ├── Testimonials/         #       Depoimentos
    │   │   └── Video/                #       Vídeo
    │   ├── Layout/                   #     Componentes de layout
    │   ├── Performance/              #     Componentes de performance
    │   ├── Products/                 #     Componentes de produtos
    │   ├── SEO/                      #     Componentes de SEO
    │   └── UI/                       #     Componentes de interface
    ├── domain/                       #   Testes de lógica de domínio
    ├── lib/                          #   Testes de bibliotecas
    │   ├── api/                      #     Utilitários de API
    │   ├── backup/                   #     Operações de backup
    │   └── db/                       #     Operações de banco de dados
    ├── pages/                        #   Testes de páginas (API routes)
    │   └── api/                      #     Edge cases de API
    │       ├── admin/                #       Admin edge cases
    │       └── auth/                 #       Auth edge cases
    └── scripts/                      #   Testes de scripts utilitários
```

---

## 2. Configuração Global

### `tests/setup.js`
**Localização:** `/tests/setup.js`
**Propósito:** Bootstrap central executado antes de todos os testes (ambiente jsdom). Configura polyfills (TextEncoder, ReadableStream, Request/Response, localStorage, matchMedia, IntersectionObserver, ResizeObserver, crypto.randomUUID), React Testing Library (timeout 5s), filtro de warnings conhecidos do console.error, cleanup automático pós-teste (`afterEach` com `cleanup()` e `jest.clearAllMocks()`), e utilitários globais (`global.wait()`, `global.suppressWarnings()`). Importa os matchers customizados.

### `tests/setup.db.js`
**Localização:** `/tests/setup.db.js`
**Propósito:** Bootstrap específico para testes de integração com banco real (ambiente node). Versão enxuta sem polyfills DOM (localStorage, matchMedia, IntersectionObserver, ResizeObserver — desnecessários em node). Inclui apenas polyfills de ReadableStream e MessageChannel (necessários para testcontainers), filtro de console.error para warnings conhecidos da API, matchers customizados e `afterEach` com `jest.clearAllMocks()`. **Criado em 06/06/2026.**

### `jest.config.db.js`
**Localização:** `/jest.config.db.js`
**Propósito:** Configuração Jest dedicada para testes de integração com banco PostgreSQL real via Testcontainers. Usa ambiente `node` (não jsdom), `testMatch: **/*.db.test.js`, timeout 30s, `maxWorkers: 1`. Possui transform Babel para compatibilidade ESM e `transformIgnorePatterns` para processar `testcontainers`/`@testcontainers`. Executa `tests/global-setup.db.js` para iniciar o container. **Criado em 06/06/2026.**

### `tests/global-setup.db.js`
**Localização:** `/tests/global-setup.db.js`
**Propósito:** GlobalSetup para testes com banco real. Inicializa container PostgreSQL via Testcontainers com `.withReuse(true)` (reutilização entre execuções). Define `process.env.TEST_DATABASE_URL` com a string de conexão. Fallback seguro: se Docker não estiver disponível, define `TEST_DATABASE_URL = '__docker_unavailable__'` para que os testes sejam ignorados via `describe.skip`. **Criado em 06/06/2026.**

### `jest.teardown.js`
**Localização:** `/jest.teardown.js`
**Propósito:** GlobalTeardown executado após todos os testes. Fecha conexões Redis e PostgreSQL. **Estendido em 06/06/2026** para também parar o container PostgreSQL (`global.__TEST_DB_CONTAINER__`) quando existir.

---

## 3. Infraestrutura de Testes

### 3.1 Factories (`/tests/factories/`)

| Arquivo | Propósito |
|---------|-----------|
| `base.js` | Factory base compartilhada. Exporta `createBaseFactory(defaultsGenerator)` que abstrai contador incremental, `.list(n, overrides, mapFn)`, `.resetId()` e `generateTimestamp(daysAgo)`. Criada em 05/06/2026 para eliminar código sobreposto entre as demais factories |
| `index.js` | Ponto de exportação que re-exporta todas as factories + `createBaseFactory` |
| `post.js` | Geração de dados de posts. Usa `createBaseFactory`. Exporta `postFactory`, `draftPostFactory`, `publishedPostFactory`, `createPostInput`, `updatePostInput` |
| `music.js` | Geração de dados de músicas gospel. Usa `createBaseFactory`. Exporta `musicFactory`, `unpublishedMusicFactory`, `publishedMusicFactory`, `invalidSpotifyMusicFactory`, `createMusicInput`, `updateMusicInput`, `detailedMusicFactory` |
| `video.js` | Geração de dados de vídeos. Usa `createBaseFactory`. Exporta `videoFactory`, `publishedVideoFactory`, `unpublishedVideoFactory`, `invalidYoutubeVideoFactory`, `createVideoInput`, `updateVideoInput`, `embeddableVideoFactory` |
| `user.js` | Geração de dados de usuários. Usa `createBaseFactory`. Exporta `userFactory`, `adminFactory`, `regularUserFactory`, `createUserInput`, `loginInput`, `jwtPayloadFactory`, `invalidUserInput` |

### 3.2 Helpers (`/tests/helpers/`)

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Ponto de exportação que re-exporta todos os helpers |
| `api.js` | Criação de mocks HTTP. Exporta `createApiMocks(method, body)`, `createGetRequest()`, `createPostRequest(body, headers)`, `expectArray()`. Usa `node-mocks-http` |
| `auth.js` | Utilitários de autenticação para testes. Exporta `createAuthToken(payload)` (gera JWT), `mockAuthenticatedUser(overrides)`, `mockAuthenticatedAdmin()` (cria token, user, headers completos) |
| `console.js` | Utilitários de console e mocks para testes. **Criado em 05/06/2026.** Exporta `suppressConsoleError()` (spy silencioso para console.error), `filterConsoleError(suppressList)` (spy que suprime apenas padrões específicos), `mockGlobalFetch()` (mock de global.fetch compatível com JSDOM), `createConfirmSpy(defaultValue)` (spy para window.confirm). **Nota:** `jest.spyOn(global, 'fetch')` não funciona em JSDOM — `mockGlobalFetch()` usa atribuição direta |
| `crud-test.js` | Abstração de testes CRUD de API. **Criado em 06/06/2026.** Exporta `testPublicGetEndpoint(handler, config, customTests?)` (para endpoints GET públicos — testa 405 e 400 automaticamente), `testAdminCrudEndpoint(handler, config, customTests?)` (para endpoints CRUD admin — testa 401 automaticamente), `testAdminGetEndpoint(handler, config, customTests?)` (para endpoints GET admin — testa 401 e 405). Testes específicos de cada recurso são fornecidos via `customTests`, mantendo flexibilidade total sobre mocks e assertions |
| `db-test.js` | Utilitários para testes com PostgreSQL real via Testcontainers. **Criado em 06/06/2026.** Exporta `isDockerAvailable()`, `createTestDb()` (cria pool de conexão), `applyMigrations()` (executa `scripts/migrate.js` como subprocesso), `withTransaction(pool)` (inicia transação com ROLLBACK automático), `truncateAll(pool)` (limpa tabelas via TRUNCATE CASCADE) |
| `render.js` | Helpers de renderização com React Testing Library. Exporta `renderWithProviders(ui, options)` que wrappa o componente com `AuthProvider`, `ThemeProvider` e `ToastProvider` |

### 3.3 Matchers Customizados (`/tests/matchers/`)

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Registra todos os matchers customizados via `expect.extend()` |
| `toBeISODate.js` | Verifica se um valor está no formato ISO 8601 (`2024-01-15T10:30:00Z`) |
| `toBeValidJSON.js` | Verifica se um response mock contém JSON parseável. Aceita `expect(res).toBeValidJSON(expectedData)` |
| `toHaveHeader.js` | Verifica se um response mock possui determinado header (com ou sem valor específico) |
| `toHaveProperties.js` | Verifica se um objeto possui um conjunto de propriedades específicas |
| `toHaveStatus.js` | Verifica se um response mock possui determinado status code HTTP |

### 3.4 Mocks (`/tests/mocks/`)

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Ponto de exportação que re-exporta todos os mocks |
| `auth.js` | Mock centralizado de autenticação. Exporta `mockAuthModule(overrides)` (cria módulo completo com todas as funções de `lib/auth.js`: `hashPassword`, `verifyPassword`, `generateToken`, `verifyToken`, `withAuth`, etc.), `mockAuthFailure()` (simula falha de autenticação) e `resetAuthMocks(authMock)`. **Criado em 05/06/2026.** Uso: `jest.mock('...lib/auth.js', () => require('...mocks/auth').mockAuthModule())` |
| `cache.js` | Mock de cache compartilhado. Exporta `mockCacheModule(overrides)` (cria módulo completo com `getOrSetCache`, `checkRateLimit`, `invalidateCache`) e `resetCacheMocks(cacheMock)`. Uso: `jest.mock('...lib/cache.js', () => require('...mocks/cache').mockCacheModule())` |
| `db.js` | Mock de operações de banco de dados (query helpers). Exporta `mockQuery(returnValue)`, `mockQueryOne(row)`, `mockQueryMany(rows)`, `mockQueryError(error)`, `mockInsert(insertedRow)`, `mockUpdate(updatedRow)`, `mockDelete(deletedId)`, `mockTransaction(callback)`, `mockPool(options)`, `mockDbModule(options)`, `mockPaginatedResult(data, page, limit)`, `queryWasCalledWith(queryMock, pattern)`, `getQueryParams(queryMock, callIndex)`, `mockQuerySequence(responses)` |
| `db-module.js` | Mock centralizado do módulo `lib/db.js`. Exporta `mockDb(overrides)` (cria módulo completo com todas as funções exportadas por `lib/db.js`: `query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`), `mockDbError(error)` (simula erro de conexão) e `resetDbMocks(dbMock)`. **Criado em 05/06/2026.** Uso: `jest.mock('...lib/db.js', () => require('...mocks/db-module').mockDb())` |
| `fetch.js` | Mock de fetch API. Exporta `mockFetchSuccess(data)`, `mockFetchError(status, message)`, `mockFetchNetworkError()` |
| `next.js` | Implementações individuais de mocks do Next.js. Exporta `mockUseRouter(options)`, `mockNextImage`, `mockNextLink`, `mockNextHead`, `mockNextScript`, `mockNextDynamic`, `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths`, `mockNextHeaders(headers)`, `mockNextCookies(cookies)`, `setupNextMocks()` (depreciado) |
| `next-setup.js` | Setup centralizado de mocks do Next.js. **Criado em 06/06/2026.** Centraliza todos os `jest.mock()` para `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`, `next/headers`, `next/cookies` e `next/server`. Basta importar `../../mocks/next-setup.js` no início do arquivo de teste. Importa implementações de `next.js` |
| `next.test.js` | Teste de sanidade dos mocks do Next.js. **Criado em 06/06/2026.** 9 testes validando a estrutura e comportamento básico de cada módulo mockado. Deve ser executado ao atualizar a versão do Next.js |

### 3.5 Examples (`/tests/examples/`)

| Arquivo | Propósito |
|---------|-----------|
| `simple-test.test.js` | Demonstração completa da arquitetura de testes. Testa factories (post, music, video, user), API helpers (createApiMocks, createPostRequest), auth helpers (createAuthToken, mockAuthenticatedUser/Admin), matchers customizados (toBeISODate, toHaveHeader, toHaveStatus, toBeValidJSON) e mocks (mockQuery, mockFetchSuccess). Inclui um teste integrado de fluxo completo |
| `component-example.test.js` | Demonstração de teste de componentes React com renderização, interação (clique, mudança de input), teste de formulário com submit e validação de erro |

---

## 4. Testes de Integração

### 4.1 Fluxos CRUD Principais (`/tests/integration/` — raiz)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `create-post-flow.test.js` | Fluxo completo de criação de post + upload de imagem | Upload imagem → criar post com URL da imagem; verifica persistência da URL |
| `musicas_flow.test.js` | Fluxo CRUD completo de músicas | Criar (201), listar (200), excluir (200), URL Spotify inválida (400), busca textual |
| `musicas_public_db_integration.test.js` | Segurança SQL na API pública de músicas | Query contém `WHERE publicado = true`; filtro mantido com busca |
| `posts.integration.test.js` | Endpoint público `/api/posts` | GET com paginação; parâmetros inválidos (400); rate limit (429); busca textual; cache; erro interno (500); método não permitido (405) |
| `videos_flow.test.js` | Fluxo CRUD completo de vídeos | Criar (201), listar (200), excluir (200), busca textual |
| `videos_public_db_integration.test.js` | Segurança SQL na API pública de vídeos | Query contém `WHERE publicado = true`; filtro mantido com busca |

### 4.2 API Endpoints (`/tests/integration/api/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `audit.test.js` | CRUD + consulta de logs de auditoria | Inserir log, listar com paginação/filtros, rate limit |
| `backups.api.test.js` | CRUD de backups via API | Listar, criar, restaurar, excluir backups, erros |
| `cleanup-test-data.test.js` | Limpeza de dados de teste | Remover registros de teste do banco |
| `dicas.test.js` | CRUD de dicas/quick tips | Listar (público), admin CRUD |
| `login.test.js` | Login via API | Sucesso, credenciais inválidas, usuário inexistente |
| `musicas.create.test.js` | Criação de música (admin) | Dados válidos, campos obrigatórios faltando, URL inválida |
| `musicas.delete.test.js` | Exclusão de música (admin) | ID existente, ID inexistente |
| `musicas.pagination.test.js` | Paginação de músicas | Página 1, página 2, página 3 (vazia), different limits |
| `musicas.test.js` | CRUD completo /api/musicas | Listar (GET), criar (POST), atualizar (PUT), excluir (DELETE), método não permitido |
| `musicas.update.test.js` | Atualização de música (admin) | Atualizar com campos, música inexistente |
| `placeholder-image.test.js` | Geração de placeholder | PNG 1x1 válido, Content-Type image/png |
| `posts.create.api.test.js` | Criação de post (admin) | Dados válidos (201), post sem título (400), post sem conteúdo (400) |
| `posts.delete.test.js` | Exclusão de post (admin) | ID existente, ID inexistente, erro no banco |
| `posts.general.test.js` | Validações gerais de posts | Slug duplicado, slug inválido |
| `posts.test.js` | CRUD completo /api/posts | GET público com paginação, POST admin, PUT admin, DELETE admin, métodos não permitidos |
| `posts.update.api.test.js` | Atualização de post (admin) | Atualizar campos, post inexistente |
| `products.test.js` | CRUD de produtos + casos de borda | GET público/POST/PUT/DELETE admin, validação, 405, fallbacks GET, token silencioso |
| `settings.api.test.js` | Configurações via API | CRUD admin, validações |
| `settings.general.test.js` | Validações de configurações | Atualizar com dados inválidos |
| `settings.test.js` | CRUD /api/settings | GET público, POST/PUT/DELETE admin |
| `stats.test.js` | Estatísticas | GET /api/stats, contagem de recursos |
| `status.api.test.js` | Status da API | GET /api/status, health check |
| `upload-image.test.js` | Upload de imagem | Upload válido, tipo inválido, tamanho excessivo |
| `videos.create.api.test.js` | Criação de vídeo (admin) | Dados válidos, URL inválida, campos obrigatórios |
| `videos.delete.test.js` | Exclusão de vídeo (admin) | ID existente, ID inexistente |
| `videos.pagination.api.test.js` | Paginação de vídeos | Página 1, página 2, página 3 (vazia), different limits |
| `videos.test.js` | CRUD completo /api/videos | GET público, POST admin, PUT admin, DELETE admin |

### 4.3 API Administrativa (`/tests/integration/api/admin/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `audit.test.js` | Auditoria admin | Listar auditoria com paginação, exportar CSV |
| `backups.test.js` | Gerenciamento de backups admin | Listar, criar, restaurar, excluir |
| `cache.test.js` | Gerenciamento de cache admin | Limpar cache, verificar status |
| `dicas.test.js` | CRUD admin de dicas | Criar, listar, atualizar, excluir |
| `fetch-ml.test.js` | Fetch de dados de Machine Learning | Buscar dados de ML, erro na API externa |
| `fetch-spotify.test.js` | Fetch de dados do Spotify | Buscar música no Spotify, erro na API |
| `fetch-youtube.test.js` | Fetch de dados do YouTube | Buscar vídeo no YouTube, erro na API |
| `musicas.test.js` | CRUD admin de músicas | Criar, listar, atualizar, excluir, busca |
| `posts.test.js` | CRUD admin de posts | Criar, listar, atualizar, excluir, busca |
| `rate-limit.test.js` | Rate limiting admin | Exceder limite, reset |
| `roles.test.js` | Gerenciamento de papéis (RBAC) | Criar role, listar, atualizar, excluir |
| `users.create.test.js` | Criação de usuário admin | Criar admin, criar usuário comum, duplicidade |
| `users.test.js` | CRUD admin de usuários | Listar, buscar, atualizar, excluir, paginação |
| `videos.test.js` | CRUD admin de vídeos | Criar, listar, atualizar, excluir, busca |

### 4.4 Autenticação (`/tests/integration/api/auth/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `auth/login.test.js` | Login via API | Sucesso (200), senha inválida (401), usuário inexistente (401) |
| `auth/logout.test.js` | Logout via API | Sucesso (200), token inválido |
| `auth/check.test.js` | Verificação de token JWT | Token válido, inválido, ausente, erro interno |

> **Nota:** Os arquivos `auth/auth.v1.check.test.js`, `auth/auth.v1.login.test.js` e `auth/auth.test.js` foram **removidos** em 13/05/2026. Os testes de auth v1 foram substituídos por `auth/check.test.js` que testa o endpoint `/api/auth/check`.

### 4.5 API Versão 1 — **DIRETÓRIO REMOVIDO (13/05/2026)**

O diretório `tests/integration/api/v1/` foi **removido** do projeto em 13/05/2026 como parte da estratégia de eliminar endpoints versionados.

**Arquivos removidos:**
- `health.test.js` — Testava `/api/v1/health` (substituído por `/api/status?mode=health`)
- `posts.test.js` — Testava `/api/v1/posts` (substituído por `/api/posts?response=v1`)
- `settings.test.js` — Testava `/api/v1/settings` (substituído por `/api/settings?response=v1`)
- `status.test.js` — Testava `/api/v1/status` (substituído por `/api/status`)
- `videos/[id].test.js` — Testava `/api/v1/videos/[id]` (PUT/DELETE gerenciados por `/api/admin/videos`)
- `auth/check.test.js` — Testava `/api/v1/auth/check` (substituído por `/api/auth/check`)

**Novos testes criados:**
- `tests/integration/api/status.test.js` — testa `/api/status`
- `tests/integration/api/auth/check.test.js` — testa `/api/auth/check`

---

## 5. Testes Unitários

### 5.1 Páginas e Utilitários (`/tests/unit/` — raiz)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `[slug].test.js` | Página dinâmica `[slug]` | Renderização com slug válido, slug inválido (404), loading, erro |
| `clean-test-db.test.js` | Script de limpeza do banco de teste | Remover registros de teste, manter dados reais |
| `index.test.js` | Página inicial (`/`) | Renderização, seções presentes (Hero, Blog, Music, Video, Products) |
| `settings-cache.test.js` | Cache de configurações | Get/set cache, invalidação, TTL |
| `videos_validation.test.js` | Validação de vídeos | URL YouTube válida/inválida, campos obrigatórios |

### 5.2 Componentes de Admin (`/tests/unit/components/Admin/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `AdminAudit.test.js` | Tabela de auditoria + casos de borda | Renderização, paginação, filtro local, exportação CSV, sessão expirada (401), content-type inválido, JSON malformado, dados nulos, fallbacks CSV, navegação bidirecional |
| `AdminCrudBase.test.js` | CRUD genérico base | Skeleton loading, formulário novo/editar/excluir, filtro searchable, paginação, toggle com reversão, validação Zod, drag-and-drop, readOnly, onSuccess, scroll, resetForm |
| `AdminDashboard.test.js` | Painel administrativo | Stats, navegação por abas, valores nulos, erro de API |
| `AdminDicas.test.js` | CRUD de dicas | Configurações repassadas, truncamento de conteúdo (80 chars) |
| `AdminMusicas.test.js` | CRUD de músicas | Configuração de campos, busca, formatação de dados |
| `AdminPosts.test.js` | CRUD de posts | Configuração de campos, busca, formatação |
| `AdminProducts.test.js` | CRUD de produtos | Configuração de campos, busca, formatação |
| `AdminRolesTab.test.js` | Gerenciamento de papéis | Listar, criar, editar, excluir papéis |
| `AdminUsers.test.js` | Listagem de usuários | Renderização, busca, paginação, criação |
| `AdminUsersTab.test.js` | Aba de usuários + casos de borda | CRUD completo, RoleSelectField (carregar, fallbacks, 401, erros, JSON inválido), validações de senha (novo/edição) |
| `AdminVideos.test.js` | CRUD de vídeos | Configuração de campos, busca, formatação |
| `index.test.js` | Barrel export Admin | Snapshot da estrutura de exportações + validação crítica `AdminCrudBase` (convertido em 05/06/2026) |
| `withAdminAuth.test.js` | HOC de autenticação admin | Redirecionamento sem auth, renderização com auth, role verification |
| `ImageUploadField.test.js` | Campo de upload de imagem | Upload, preview, remoção, validação de tipo/tamanho |
| `TextAreaField.test.js` | Campo textarea | Renderização, label, erro, onChange |
| `TextField.test.js` | Campo texto | Renderização, label, placeholder, erro, onChange |
| `ToggleField.test.js` | Campo toggle | Renderização, onChange, estado checked |
| `UrlField.test.js` | Campo URL | Renderização, validação de URL, onChange |

#### Admin Managers (`/tests/unit/components/Admin/Managers/`)

| Arquivo | Propósito |
|---------|-----------|
| `BackupManager.test.js` | Gerenciador de backup (criação, cancelamento, erros de API, fallbacks) |
| `CacheManager.test.js` | Gerenciador de cache Redis (limpar cache, notificações toast) |

#### Admin Tools (`/tests/unit/components/Admin/Tools/`)

| Arquivo | Propósito |
|---------|-----------|
| `IntegrityCheck.test.js` | Verificação de integridade (renderização estática) |
| `RateLimitViewer.test.js` | Visualizador de rate limit (renderização estática) |

### 5.3 Componentes de Funcionalidades (`/tests/unit/components/Features/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| **Blog/** `BlogSection.test.js` | Seção de blog front-end | Loading, posts vazios (null), renderização de posts, prop `limit`, botão "Ver todas", erro de API (success false), erro HTTP (500, 404), falha de rede/JSON inválido |
| **Blog/** `PostCard.test.js` | Card de post individual | Título, excerpt, categorias, imagem, link, placeholder sem imagem, texto customizado |
| **ContentTabs/** `index.test.js` | Barrel do componente ContentTabs | Snapshot da estrutura de exportações + validação do componente default. **Criado em 06/06/2026** |
| **Music/** `MusicGallery.test.js` | Galeria de músicas | Loading, erro, dados vazios, renderização de cards, busca/filtro |
| **Music/** `MusicCard.test.js` | Card de música individual | Título, artista, URL Spotify, thumbnail |
| **Music/** `MusicPlayer.test.js` | Player de música | Play, pause, next, previous, progresso |
| **Products/** `ProductCard.test.js` | Card de produto com imagem, lightbox e links de marketplace | Título/descrição/preço, sem imagem (null e string vazia), navegação entre múltiplas imagens, links ML/Shopee/Amazon, lightbox (abrir, fechar Escape/overlay), opacidade da imagem no carregamento. **Criado em 06/06/2026 — 12 testes** |
| **Products/** `ProductList.test.js` | Lista de produtos com busca, filtro de preço e paginação | Renderização da lista, loading, erro, lista vazia, filtro sem resultados, paginação (visível/escondida, botões desabilitados), campos de busca/filtro, ordenação por position + ID. **Criado em 06/06/2026 — 11 testes** |
| **Testimonials/** `index.test.js` | Componente de depoimentos com carrossel | Carregamento de dados da API, fallback em erro de rede, fallback em erro HTTP/array vazio, botões de carrossel com scroll e resize |
| **Video/** `VideoCard.test.js` | Card de vídeo individual | Título, descrição, LazyIframe com props (src, title, thumbnail) |
| **Video/** `VideoGallery.test.js` | Galeria de vídeos | Loading, erro, dados vazios, renderização de cards |

### 5.4 Componentes de Layout (`/tests/unit/components/Layout/`)

| Arquivo | Propósito |
|---------|-----------|
| `Container.test.js` | Container (div, section, article) com props fluid, as, className, centered |
| `Grid.test.js` | Grid system (columns, gap, align, justify, Grid.Item, Grid.Auto, Grid.Responsive) |
| `index.test.js` | Barrel export Layout | Snapshot da estrutura de exportações + validação crítica `Container` (convertido em 05/06/2026) |
| `Sidebar.test.js` | Sidebar com navegação, colapso, links ativos |
| `Stack.test.js` | Stack layout (direction, spacing, align, justify, dividers) |

### 5.5 Componentes de Performance (`/tests/unit/components/Performance/`)

| Arquivo | Propósito |
|---------|-----------|
| `CriticalCSS.test.js` | Inline de CSS crítico (renderização, atributos, múltiplas folhas) |
| `ImageOptimized.test.js` | Imagem otimizada (lazy loading, srcset, placeholder blur, fallback) |
| `index.test.js` | Barrel export Performance | Snapshot da estrutura de exportações + validação crítica `ImageOptimized` (convertido em 05/06/2026) |
| `LazyIframe.test.js` | Iframe lazy (lazy loading, placeholder, props width/height, intersecção) |
| `PreloadResources.test.js` | Pré-carregamento de recursos (links preload, prefetch, preconnect, dns-prefetch) |

### 5.6 Componentes de Produtos (`/tests/unit/components/Products/`)

| Arquivo | Propósito |
|---------|-----------|
| `ProductCard.test.js` | Card de produto (nome, preço, imagem, link) |
| `ProductList.test.js` | Lista de produtos (grid, loading, vazio, erro) |

### 5.7 Componentes de SEO (`/tests/unit/components/SEO/`)

| Arquivo | Propósito |
|---------|-----------|
| `ArticleSchema.test.js` | Schema.org Article (JSON-LD) |
| `BreadcrumbSchema.test.js` | Schema.org BreadcrumbList (JSON-LD) |
| `Head.test.js` | Gerenciamento de `<head>` (title, meta tags, Open Graph, Twitter Cards) |
| `index.test.js` | Barrel export SEO | Snapshot da estrutura de exportações + verificação `DefaultExport === SEOHead` (convertido em 05/06/2026) |
| `MusicSchema.test.js` | Schema.org Music (JSON-LD) |
| `OrganizationSchema.test.js` | Schema.org Organization (JSON-LD) |
| `VideoSchema.test.js` | Schema.org Video (JSON-LD) |
| `WebsiteSchema.test.js` | Schema.org WebSite (JSON-LD) |

### 5.8 Componentes de UI (`/tests/unit/components/UI/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `Alert.test.js` | Alerta | Título, conteúdo, variantes (success, info, warning, error), ícone customizado, botão fechar com onClose |
| `Badge.test.js` | Badge | leftIcon, rightIcon, pulse, position; `Badge.Counter` com max/99+/showZero; `Badge.Dot` |
| `Button.test.js` | Botão | leftIcon/rightIcon, loading (aria-busy, disabled), disabled com ARIA |
| `Card.test.js` | Card | Header/Footer, mídia (string img ou componente), hoverable, onClick, teclado (Enter/Espaço), fullWidth |
| `index.test.js` | Barrel export UI | Snapshot da estrutura de exportações + validação crítica `Button` (convertido em 05/06/2026) |
| `Input.test.js` | Input | Label, required, leftAddon, rightAddon, ref forwarding, helperText vs errorMessage com aria-invalid |
| `Modal.test.js` | Modal | Abertura, fechamento (botão X, overlay, Escape), título, conteúdo, footer, props `size`, `closeOnOverlay`, `blocked` |
| `Select.test.js` | Select | Label, opções, placeholder, onChange, erro, múltiplo |
| `Spinner.test.js` | Spinner | Variações de tamanho, cor, label (aria-label) |
| `TextArea.test.js` | TextArea | Label, placeholder, erro, onChange, maxLength, resizable |
| `Toast.test.js` | Toast | Notificação, auto-dismiss, types (success, error, info), posições |

### 5.9 Domínio (`/tests/unit/domain/`)

| Arquivo | Propósito |
|---------|-----------|
| `posts.test.js` | Lógica de domínio de posts (validação, transformação, regras de negócio) |
| `settings.test.js` | Lógica de domínio de configurações (validação, defaults) |
| `videos.test.js` | Lógica de domínio de vídeos (validação, regras de negócio) |

### 5.10 Lib (`/tests/unit/lib/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `auth.test.js` | Autenticação (JWT, bcrypt) | Geração/verificação de token, hash de senha, validação |
| `cache.test.js` | Cache em memória/Redis | Get, set, invalidação, TTL, fallback |
| `crud.test.js` | Operações CRUD genéricas | Criar, ler, atualizar, excluir, paginação, busca |
| `db.test.js` | Conexão com banco de dados | Query, pool, transaction, erro de conexão |
| `middleware.test.js` | Middleware HTTP → **MIGRADO (05/06/2026)** | Agora testa `lib/api/middleware.js`. Testa `withLogger`, `composeMiddleware`, `withCors`, `withAuth`, `withRateLimit`, `withErrorHandler`. Removidos testes de `authenticatedApiMiddleware` e `externalAuthMiddleware` (funções removidas do código). **9/9 testes passando** |
| `redis.test.js` | Cliente Redis | Conexão, get/set, expiração, erro de conexão |

#### Lib/API (`/tests/unit/lib/api/`)

| Arquivo | Propósito |
|---------|-----------|
| `errors.test.js` | Classes de erro personalizadas (ApiError, ValidationError, AuthError, NotFoundError) |
| `index.test.js` | Barrel export do diretório API |
| `middleware.test.js` | Middleware de API (validação, autenticação, rate limit) |
| `response.test.js` | Helpers de resposta (success, error, paginated) |
| `validate.test.js` | Validação de dados (schemas, campos obrigatórios, tipos) |

#### Lib/Backup (`/tests/unit/lib/backup/`)

| Arquivo | Propósito |
|---------|-----------|
| `backup.available.test.js` | Verificação de disponibilidade de backup (espaço em disco, permissões) |
| `backup.cleanup.test.js` | Limpeza de backups antigos (retenção, rotação) |
| `backup.logs.test.js` | Logs de operações de backup |
| `backup.operations.test.js` | Operações de backup (criar, restaurar, verificar integridade) |

#### Lib/DB (`/tests/unit/lib/db/`)

| Arquivo | Propósito |
|---------|-----------|
| `createPost.test.js` | Criação de post no banco (INSERT, retorno, erro) |
| `deletePost.test.js` | Exclusão de post (DELETE, verificar existência, erro) |
| `getAllPosts.test.js` | Listagem de posts (SELECT, filtros, ordenação) |
| `getPaginatedPosts.test.js` | Paginação de posts (LIMIT, OFFSET, COUNT, ordenação) |
| `musicas.test.js` | Operações de banco para músicas (CRUD, busca, filtros) |

### 5.11 Scripts (`/tests/unit/scripts/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `clean-orphaned-images.test.js` | Limpeza de imagens órfãs | Identificar imagens não referenciadas, exclusão segura, dry-run |

### 5.12 Pages/API Edge Cases (`/tests/unit/pages/api/`)

| Arquivo | Propósito |
|---------|-----------|
| `upload-image.edge.test.js` | Edge cases de upload (criação de diretório). Mocks migrados em 05/06/2026: `lib/middleware.js` → `lib/auth.js` + `lib/db.js` → `lib/domain/settings.js` |
| `api/admin/dicas.edge.test.js` | Edge cases admin dicas |
| `api/admin/fetch-ml.edge.test.js` | Edge cases fetch ML |
| `api/admin/fetch-spotify.edge.test.js` | Edge cases fetch Spotify |
| `api/admin/posts.edge.test.js` | Edge cases admin posts |
| `api/admin/rate-limit.test.js` | Edge cases rate limit admin |
| `api/admin/roles.edge.test.js` | Edge cases admin roles |
| `api/admin/stats.edge.test.js` | Edge cases admin stats |
| `api/auth/login.edge.test.js` | Edge cases login auth |

> **Nota (04/06/2026):** O arquivo `products.edge.test.js` foi **removido** — seu conteúdo foi mesclado em `tests/integration/api/products.test.js` com organização sob `describe('Casos de Borda')` e mocks migrados de `db.js` para `lib/domain/products.js`.

---

## 6. Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| **Configuração Global** | 5 arquivos |
| **Factories** | 5 arquivos |
| **Helpers** | 5 arquivos |
| **Matchers** | 6 arquivos |
| **Mocks** | 8 arquivos |
| **Examples** | 2 arquivos |
| **Testes de Integração** | 33 arquivos (6 raiz + 27 API + 14 admin + 2 api/auth)* |
| **Testes Unitários** | ~95 arquivos (5 raiz + ~40 components + ~15 Admin + 2 Managers + 2 Tools + ~12 Features + 5 Layout + 5 Performance + 2 Products + 8 SEO + 12 UI + 3 domain + 6 lib + 5 lib/api + 4 lib/backup + 5 lib/db + 1 scripts + ~9 pages/api) |
| **Total Aproximado** | **~153 arquivos** |

> *\*Removidos em 13/05/2026: `tests/integration/api/v1/` (4 arquivos), `tests/integration/auth/auth.v1.check.test.js`, `tests/integration/auth/auth.v1.login.test.js`, `tests/integration/auth/auth.test.js` e `tests/integration/api/status.api.test.js`. Adicionados: `tests/integration/api/status.test.js` e `tests/integration/api/auth/check.test.js`.*
>
> *\*Removido em 04/06/2026: `tests/unit/pages/api/products.edge.test.js` (mesclado em `tests/integration/api/products.test.js`), `tests/unit/components/Admin/AdminAudit.edge.test.js` (mesclado em `AdminAudit.test.js`), `tests/unit/components/Admin/AdminUsersTab.edge.test.js` (mesclado em `AdminUsersTab.test.js`).*

---

> **Nota atualizada (05/06/2026 — 2ª revisão):** Este documento reflete a estrutura completa de testes do projeto Caminhar.
> 
> **Ajustes realizados na 1ª revisão (05/06):** 3 mesclagens de arquivos edge case (04/06), centralizado `jest.clearAllMocks()` no setup.js, removido ~41 chamadas redundantes, eliminado supressão global de `console.error` em 10 arquivos, refatoradas 4 factories para usar `createBaseFactory` (~70 linhas eliminadas).
> 
> **Ajustes realizados na 2ª revisão (05/06):**
> - Criado `tests/helpers/console.js` com 4 funções: `suppressConsoleError()`, `filterConsoleError()`, `mockGlobalFetch()`, `createConfirmSpy()`
> - Removido `jest.clearAllMocks()` de mais 20 arquivos (total: 61 eliminações)
> - 6 arquivos de componente migrados para usar helpers centralizados (`BackupManager`, `CacheManager`, `BlogSection`, `MusicCard`, `MusicGallery.edge`, `ImageOptimized`)
> - 5 testes de barrel export convertidos de `expect(X).toBeDefined()` para snapshot
> - Migração completa da Seção 6: `lib/middleware.js` → `lib/api/middleware.js` (3 arquivos de teste atualizados)
> - `middleware.test.js` reescrito com 9/9 testes passando para o novo sistema de middleware
> - **Total:** ~30 arquivos modificados/criados. Nenhuma regressão.
> 
> **Ajustes realizados na 3ª revisão (05/06):**
> - `mockGlobalFetch()` evoluído com método `.mockRestore()` para restaurar o fetch original
> - 23 arquivos padronizados com `mockGlobalFetch()` + `fetchMock?.mockRestore()` no `afterEach`
> - Helper documenta que `jest.spyOn(global, 'fetch')` não funciona em JSDOM
> - **Total:** 25 arquivos modificados. Nenhuma regressão (7 falhas pré-existentes inalteradas).
> 
> **Ajustes realizados na 4ª revisão (05/06):**
> - Criado `tests/mocks/auth.js` com `mockAuthModule()` e `mockAuthFailure()` para centralizar mocks de `lib/auth.js`
> - Criado `tests/mocks/db-module.js` com `mockDb()` e `mockDbError()` para centralizar mocks de `lib/db.js`
> - 27 arquivos padronizados para usar `require('...mocks/db-module').mockDb()` em vez de factory functions inline
> - Redução de ~120 linhas de código repetido nos mocks de `lib/db.js`
> - Seção 2.3 do `UPGRADE_tests.md` atualizada de "Sugestão" para **"RESOLVIDO"**
> - **Total:** 29 arquivos modificados/criados (2 novos mocks + 27 arquivos convertidos).
> 
> **Ajustes realizados na 5ª revisão (06/06):**
> - Substituídos 3 `require()` por `await import()` dinâmico em `tests/setup.js` (polyfills ReadableStream, MessageChannel, Request/Response/Headers)
> - Cada `require()` envolvido em IIFE async para manter compatibilidade com o fluxo de carregamento do setup
> - Correção documentada na Seção 3.2 do `UPGRADE_tests.md` como **"RESOLVIDO (06/06/2026)"**
> - **Total:** 1 arquivo modificado. Nenhuma regressão.
> 
> **Ajustes realizados na 6ª revisão (06/06):**
> - Criado `tests/mocks/next-setup.js` — Setup centralizado de mocks do Next.js com `jest.mock()` para todos os módulos
> - Adicionados mocks faltantes: `next/navigation` (App Router), `next/headers`/`next/cookies` (API assíncrona), `next/server`
> - Criado `tests/mocks/next.test.js` — Teste de sanidade com 9 testes
> - Removidos mocks duplicados de 10 arquivos de teste (substituídos por import de `next-setup.js`)
> - `setupNextMocks()` depreciado em `tests/mocks/next.js`
> - **Total:** 4 arquivos criados + 10 modificados. Nenhuma regressão.
> 
> > **Ajustes realizados na 7ª revisão (06/06):**
> - Investigação completa da Seção 3.6: mapeamento `components/Features/` vs. cobertura de testes, revelando que Video/ e Testimonials/ já estavam cobertos e o verdadeiro gap era ContentTabs/ e Products/
> - Criado `tests/unit/components/Features/ContentTabs/index.test.js` — Teste de barrel com snapshot (2 testes)
> - Criado `tests/unit/components/Features/Products/ProductCard.test.js` — 12 testes (renderização, imagens, lightbox, links marketplace)
> - Criado `tests/unit/components/Features/Products/ProductList.test.js` — 11 testes (loading, erro, vazio, paginação, ordenação, filtros)
> - Atualizada Seção 3.6 do `UPGRADE_tests.md` de "Sugestão" para **"AJUSTADO (06/06/2026)"**
> - Atualizada Seção 4.7 do `UPGRADE_tests.md` como **"CONCLUÍDO (06/06/2026)"**
> - **Total:** 3 arquivos criados + 2 documentos atualizados. 25 novos testes. Nenhuma regressão.
> 
> > **Ajustes realizados na 8ª revisão (06/06):**
> - Criado `tests/setup.db.js` — Bootstrap específico para testes com banco real (ambiente node), versão enxuta sem polyfills DOM
> - Ajustado `jest.config.db.js` — `setupFilesAfterEnv` alterado de `setup.js` para `setup.db.js`
> - Atualizada Seção 4.6.2 do `UPGRADE_tests.md` — Código corrigido para usar `export default` (sem `require()`), nomes de scripts corrigidos para `test:db:container`, adicionadas notas sobre setup enxuto
> - **Total:** 1 arquivo criado + 2 documentos atualizados. Nenhuma regressão.
> 
> Para detalhes de implementação específicos, consulte `docs/UPGRADE_tests.md`.
