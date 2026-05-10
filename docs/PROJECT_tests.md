# Análise do Projeto — Testes (`/tests/`)

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
├── setup.js                          # Bootstrap global de testes
├── examples/                         # Exemplos/demonstração da arquitetura
├── factories/                        # Fábricas de dados de teste
├── helpers/                          # Utilitários auxiliares
├── matchers/                         # Matchers customizados Jest
├── mocks/                            # Mocks globais reutilizáveis
├── integration/                      # Testes de integração
│   ├── *.test.js                     #   Fluxos CRUD principais
│   ├── api/                          #   Testes de API endpoints
│   │   ├── *.test.js
│   │   ├── admin/                    #     Endpoints administrativos
│   │   ├── auth/                     #     Endpoints de autenticação
│   │   └── v1/                       #     API versão 1
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
**Propósito:** Bootstrap central executado antes de todos os testes. Configura polyfills (TextEncoder, ReadableStream, Request/Response, localStorage, matchMedia, IntersectionObserver, ResizeObserver, crypto.randomUUID), React Testing Library (timeout 5s), filtro de warnings conhecidos do console.error, cleanup automático pós-teste (`afterEach`), e utilitários globais (`global.wait()`, `global.suppressWarnings()`). Importa os matchers customizados.

---

## 3. Infraestrutura de Testes

### 3.1 Factories (`/tests/factories/`)

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Ponto de exportação que re-exporta todas as factories |
| `post.js` | Geração de dados de posts (título, slug, conteúdo, published, created_at). Exporta `postFactory`, `draftPostFactory`, `publishedPostFactory`, `createPostInput`, `updatePostInput`, `postFactory.list(n)` |
| `music.js` | Geração de dados de músicas gospel (titulo, artista, url_spotify, categoria, letra, cifra). Exporta `musicFactory`, `unpublishedMusicFactory`, `publishedMusicFactory`, `invalidSpotifyMusicFactory`, `createMusicInput`, `updateMusicInput`, `detailedMusicFactory` |
| `video.js` | Geração de dados de vídeos (titulo, url_youtube, descricao, publicado). Exporta `videoFactory`, `publishedVideoFactory`, `unpublishedVideoFactory`, `createVideoInput`, `updateVideoInput`, `videoFactory.list(n)` |
| `user.js` | Geração de dados de usuários (username, email, role, password_hash). Exporta `userFactory`, `adminFactory`, `createUserInput` |

### 3.2 Helpers (`/tests/helpers/`)

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Ponto de exportação que re-exporta todos os helpers |
| `api.js` | Criação de mocks HTTP. Exporta `createApiMocks(method, body)`, `createGetRequest()`, `createPostRequest(body, headers)`, `expectArray()`. Usa `node-mocks-http` |
| `auth.js` | Utilitários de autenticação para testes. Exporta `createAuthToken(payload)` (gera JWT), `mockAuthenticatedUser(overrides)`, `mockAuthenticatedAdmin()` (cria token, user, headers completos) |
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
| `db.js` | Mock de banco de dados. Exporta `mockQuery(rows, error)` para simular `db.query()`, e `createDbMock()` que retorna um objeto completo com `query`, `createRecord`, `updateRecords`, `deleteRecords`, `logActivity` |
| `fetch.js` | Mock de fetch API. Exporta `mockFetchSuccess(data)`, `mockFetchError(status, message)`, `mockFetchNetworkError()` |
| `next.js` | Mock de objetos Next.js. Exporta `mockReq(overrides)`, `mockRes()` com métodos `status`, `json`, `redirect`, `setHeader`, `getHeader` |

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
| `products.test.js` | CRUD de produtos | GET público, POST/PUT/DELETE admin, validação de campos |
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

### 4.4 Autenticação (`/tests/integration/auth/` e `/tests/integration/api/auth/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `api/auth/login.test.js` | Login via API | Sucesso (200), senha inválida (401), usuário inexistente (401) |
| `api/auth/logout.test.js` | Logout via API | Sucesso (200), token inválido |
| `auth/auth.test.js` | Autenticação v1 - middleware | Token válido, inválido, expirado |
| `auth/auth.v1.check.test.js` | Verificação de token v1 | Token válido, inválido, ausente |
| `auth/auth.v1.login.test.js` | Login v1 | Credenciais válidas, inválidas |

### 4.5 API Versão 1 (`/tests/integration/api/v1/`)

| Arquivo | Propósito |
|---------|-----------|
| `health.test.js` | Health check da API v1 (`/api/v1/health`) |
| `posts.test.js` | CRUD de posts via API v1 (`/api/v1/posts`) |
| `settings.test.js` | Configurações via API v1 (`/api/v1/settings`) |
| `status.test.js` | Status da API v1 (`/api/v1/status`) |

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
| `AdminAudit.test.js` | Tabela de auditoria | Renderização, paginação, filtro local, exportação CSV, sessão expirada (401) |
| `AdminAudit.edge.test.js` | Casos de borda da auditoria | Content-type inválido, JSON malformado, dados nulos, fallbacks CSV, navegação bidirecional |
| `AdminCrudBase.test.js` | CRUD genérico base | Skeleton loading, formulário novo/editar/excluir, filtro searchable, paginação, toggle com reversão, validação Zod, drag-and-drop, readOnly, onSuccess, scroll, resetForm |
| `AdminDashboard.test.js` | Painel administrativo | Stats, navegação por abas, valores nulos, erro de API |
| `AdminDicas.test.js` | CRUD de dicas | Configurações repassadas, truncamento de conteúdo (80 chars) |
| `AdminMusicas.test.js` | CRUD de músicas | Configuração de campos, busca, formatação de dados |
| `AdminPosts.test.js` | CRUD de posts | Configuração de campos, busca, formatação |
| `AdminProducts.test.js` | CRUD de produtos | Configuração de campos, busca, formatação |
| `AdminRolesTab.test.js` | Gerenciamento de papéis | Listar, criar, editar, excluir papéis |
| `AdminUsers.test.js` | Listagem de usuários | Renderização, busca, paginação, criação |
| `AdminUsersTab.test.js` | Aba de usuários | CRUD completo, busca, paginação |
| `AdminUsersTab.edge.test.js` | Casos de borda de usuários | Erro de API, dados vazios, role inválido |
| `AdminVideos.test.js` | CRUD de vídeos | Configuração de campos, busca, formatação |
| `index.test.js` | Barrel export Admin | Verifica exportações do diretório Admin |
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
| **ContentTabs/** `ContentTabs.test.js` | Abas de conteúdo | Troca de abas, aba bloqueada, aba desconhecida (fallback) |
| **Music/** `MusicGallery.test.js` | Galeria de músicas | Loading, erro, dados vazios, renderização de cards, busca/filtro |
| **Music/** `MusicCard.test.js` | Card de música individual | Título, artista, URL Spotify, thumbnail |
| **Music/** `MusicPlayer.test.js` | Player de música | Play, pause, next, previous, progresso |
| **Video/** (pendente leitura detalhada) | Componente de vídeo | - |
| **Testimonials/** (pendente leitura detalhada) | Depoimentos | - |

### 5.4 Componentes de Layout (`/tests/unit/components/Layout/`)

| Arquivo | Propósito |
|---------|-----------|
| `Container.test.js` | Container (div, section, article) com props fluid, as, className, centered |
| `Grid.test.js` | Grid system (columns, gap, align, justify, Grid.Item, Grid.Auto, Grid.Responsive) |
| `index.test.js` | Barrel export do diretório Layout |
| `Sidebar.test.js` | Sidebar com navegação, colapso, links ativos |
| `Stack.test.js` | Stack layout (direction, spacing, align, justify, dividers) |

### 5.5 Componentes de Performance (`/tests/unit/components/Performance/`)

| Arquivo | Propósito |
|---------|-----------|
| `CriticalCSS.test.js` | Inline de CSS crítico (renderização, atributos, múltiplas folhas) |
| `ImageOptimized.test.js` | Imagem otimizada (lazy loading, srcset, placeholder blur, fallback) |
| `index.test.js` | Barrel export do diretório Performance |
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
| `index.test.js` | Barrel export do diretório SEO |
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
| `index.test.js` | Barrel export UI | Verifica exportações de todos os 11 componentes + useToast + defaultIcons |
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
| `middleware.test.js` | Middleware HTTP | Autenticação, rate limit, CORS, logging |
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
| `products.edge.test.js` | Edge cases da API de produtos (405, 500, fallbacks, rate limit 429) |
| `upload-image.edge.test.js` | Edge cases de upload (arquivo muito grande, tipo inválido, sem arquivo) |
| `api/admin/dicas.edge.test.js` | Edge cases admin dicas |
| `api/admin/fetch-ml.edge.test.js` | Edge cases fetch ML |
| `api/admin/fetch-spotify.edge.test.js` | Edge cases fetch Spotify |
| `api/admin/posts.edge.test.js` | Edge cases admin posts |
| `api/admin/rate-limit.test.js` | Edge cases rate limit admin |
| `api/admin/roles.edge.test.js` | Edge cases admin roles |
| `api/admin/stats.edge.test.js` | Edge cases admin stats |
| `api/auth/login.edge.test.js` | Edge cases login auth |

---

## 6. Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| **Configuração Global** | 1 arquivo |
| **Factories** | 5 arquivos |
| **Helpers** | 4 arquivos |
| **Matchers** | 6 arquivos |
| **Mocks** | 4 arquivos |
| **Examples** | 2 arquivos |
| **Testes de Integração** | 39 arquivos (6 raiz + 27 API + 14 admin + 2 auth + 3 auth v1 + 4 v1) |
| **Testes Unitários** | ~96 arquivos (5 raiz + ~40 components + ~15 Admin + 2 Managers + 2 Tools + ~12 Features + 5 Layout + 5 Performance + 2 Products + 8 SEO + 12 UI + 3 domain + 6 lib + 5 lib/api + 4 lib/backup + 5 lib/db + 1 scripts + ~10 pages/api) |
| **Total Aproximado** | **~157 arquivos** |

---

> **Nota:** Este documento reflete a estrutura completa de testes do projeto Caminhar. Para detalhes de implementação específicos, consulte cada arquivo individualmente.