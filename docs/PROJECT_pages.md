# Análise da Pasta `/pages`

> **Data da análise:** 01/08/2026
> **Objetivo:** Documentar todos os arquivos da pasta `/pages`, descrevendo localização exata, propósito e funcionalidades de cada um.
> **Total de arquivos analisados:** 42

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Páginas Raiz (`/pages`)](#1-páginas-raiz)
3. [API Pública (`/pages/api`)](#2-api-pública)
4. [API Admin (`/pages/api/admin`)](#3-api-admin)
5. [API Autenticação (`/pages/api/auth`)](#4-api-autenticação)
6. [Helper de API (`/pages/api/helper`)](#5-helper-de-api)
7. [Blog (`/pages/blog`)](#6-blog)
8. [Estilos (`/pages/styles`)](#7-estilos)

---

## Visão Geral

A pasta `/pages` é o coração do frontend e das rotas de API do projeto Next.js "Caminhar". Ela concentra:

- **5 páginas raiz** — incluindo o app wrapper, o documento HTML customizado, a home pública, o painel administrativo e a vitrine do Design System.
- **10 endpoints de API pública** — conteúdos acessíveis sem autenticação (posts, músicas, vídeos, dicas, produtos, configurações, status, upload, placeholder) com cache, rate limiting e paginação padronizados.
- **15 endpoints administrativos** — CRUDs e ferramentas de gestão, todos protegidos pelo handler factory `createAdminHandler()`.
- **4 endpoints de autenticação** — login, logout, verificação de token e renovação via refresh token.
- **1 helper** reutilizável de paginação.
- **2 páginas de blog + 1 CSS Module** — listagem e detalhe de posts com SSR direto ao banco.
- **4 arquivos de estilo** — tokens CSS, reset global e CSS Modules de home e design system.

Ao analisar, agrupei os arquivos por responsabilidade para facilitar a leitura. Arquivos com função puramente utilitária (helper) ou de suporte visual (CSS) foram tratados em suas respectivas seções.

---

## 1. Páginas Raiz

### `/pages/_app.js`

- **Localização:** `/pages/_app.js`
- **Propósito:** Componente raiz Next.js que envolve todas as páginas da aplicação.
- **Funcionalidades:**
  - Importa os estilos globais (`globals.css`).
  - Configura o sistema de notificações `react-hot-toast` (`<Toaster>`) posicionado no topo direito, com duração de 5 segundos e estilos de sucesso/erro baseados nas CSS Custom Properties (`--color-success-*` e `--color-error-*`) com fallbacks hex.
  - Monitora mudanças de rota via `router.events` — o log `[Router] Route changed to:` só é ativado quando `NEXT_PUBLIC_LOG_ROUTE_CHANGES=true` (variável de ambiente configurável).
  - Realiza cleanup do event listener (`router.events.off`) para evitar memory leaks.
  - **Monitoramento de performance:** envolve toda a árvore com `<PerformanceProvider>` e monta o componente `<PerformanceMonitor />` (que chama `usePerformance()` e não renderiza nada no DOM), ativando a coleta de Web Vitals em todas as páginas.

### `/pages/_document.js`

- **Localização:** `/pages/_document.js`
- **Propósito:** Personaliza o HTML document raiz com otimizações de performance, segurança e SEO.
- **Funcionalidades:**
  - **CSS crítico inline** gerado por `extractCriticalCSS()` e **cacheado em nível de módulo** (`cachedCriticalCSS`) — executado apenas na primeira requisição SSR e reaproveitado nas demais.
  - **Preconnect** para domínios essenciais: `fonts.googleapis.com`, `fonts.gstatic.com`, `www.youtube.com`, `img.youtube.com`, `open.spotify.com`, `i.scdn.co`.
  - **DNS prefetch** para os mesmos domínios de fontes, YouTube e Spotify.
  - **Google Fonts** com `font-display: swap`: Inter (400–700) e Montserrat (400–700) — evita FOIT.
  - **Content Security Policy (CSP)** restritiva: `default-src 'self'`, scripts de YouTube/Spotify, estilos de Google Fonts, imagens de `data:`/`https:`/`blob:`, frames de YouTube/Spotify.
  - **Permissions Policy** restritiva (geolocation, câmera, microfone, pagamento e USB bloqueados).
  - Meta tags PWA: `theme-color` adaptável (light/dark), `apple-mobile-web-app-capable`, `msapplication-*`.
  - Link canônico base e favicon.
  - Script inline que remove o CSS crítico após o `load` completo da página (com `setTimeout` de 100ms) e registra `performance.mark('document_loaded')`.

### `/pages/index.js`

- **Localização:** `/pages/index.js`
- **Propósito:** Página inicial pública do projeto "O Caminhar com Deus".
- **Funcionalidades:**
  - Carrega configurações (título e subtítulo) via `fetch('/api/settings')` com **cache em `sessionStorage`** (TTL de 1 minuto) e fallback para valores padrão.
  - Gerencia a URL da imagem hero com timestamp (`?t=${Date.now()}`) via `useEffect` para evitar Hydration Mismatch entre SSR e CSR.
  - Exibe header com título, subtítulo, indicador de erro de configurações e imagem hero (`<img loading="lazy">`).
  - Renderiza os componentes `ContentTabs` e `Testimonials`.
  - SEO dinâmico via `next/head` (title e meta description).
  - **Feedback de erro:** estado `settingsError` exibe a mensagem "Configurações temporariamente indisponíveis" abaixo do subtítulo quando a API falha ou retorna status não-OK.

### `/pages/admin.js`

- **Localização:** `/pages/admin.js`
- **Propósito:** Painel administrativo completo para gestão de todo o conteúdo do site (780 linhas, é o maior arquivo da pasta).
- **Funcionalidades:**
  - **Autenticação:** login via `POST /api/auth/login` com `credentials: 'include'` (para o cookie ser armazenado), verificação de sessão via `GET /api/auth/check` (com `AbortController` para cancelamento), redirect pós-login para `/admin` e logout que limpa a sessão e recarrega a página.
  - **Controle de permissões:** cada aba é exibida conforme `hasPermission(permission)` — usuários com `role === 'admin'` têm acesso total; demais dependem do array `permissions`.
  - **Upload e crop de imagens:** `react-easy-crop` com proporção 1100:320, zoom ajustável (1–3), funções utilitárias `resizeImage()` (máx. 1100px de largura) e `getCroppedImg()` (saída WebP), preview com estatísticas de compressão (economia percentual).
  - **Abas de gestão:** Visão Geral (dashboard), Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Dicas do Dia.
  - **Configuração de Cabeçalho:** edição de título, subtítulo e imagem principal com preview em tempo real e envio para `/api/upload-image` (`uploadType=setting_home_image`).
  - **Segurança:** quatro sub-abas — Verificação de Integridade, Backup do Sistema, Rate Limiting e Cache do Sistema.
  - **Usuários e Auditoria:** gerenciamento de usuários e consulta de logs de ações administrativas.
  - **Estilos:** mapeamento manual de 4 CSS Modules (`login`, `tabs`, `form`, `misc`) de `components/Admin/styles/`, além de numerosos estilos inline.

### `/pages/design-system.js`

- **Localização:** `/pages/design-system.js`
- **Propósito:** Página de demonstração e documentação visual do Design System da aplicação.
- **Funcionalidades:**
  - Exibe a paleta de cores: primária (Azul Serenidade), secundária (Dourado Luz) e cores de feedback (sucesso, erro, aviso, info).
  - Demonstra todos os componentes UI: Button (6 variantes, 4 tamanhos, 3 estados), Input (4 variações, incluindo erro e com ícone), Select, TextArea (com contador de caracteres).
  - Cards em 3 variantes (default, elevated, outlined) + interativo + com header/footer + com mídia (usa placeholder externo `via.placeholder.com`).
  - Badges (8 variantes + Counter + Dot com pulse), Alerts (4 variantes), Spinners (5 variantes + Container).
  - Modal demonstrativo e Toast de notificação.
  - Componentes de layout: Stack (vertical/horizontal) e Grid Responsivo.
  - Seção de documentação textual do que compõe o Design System (tokens, componentes, hooks `useTheme`).

---

## 2. API Pública

Todos os endpoints públicos seguem o mesmo padrão: validação de método HTTP, paginação, cache via `getOrSetCache`, rate limiting via `checkRateLimit` e respostas padronizadas `{ error, message }` em caso de falha.

### `/pages/api/helper/pagination.js`

- **Localização:** `/pages/api/helper/pagination.js`
- **Propósito:** Helper reutilizável de paginação (não é endpoint HTTP).
- **Funcionalidades:**
  - `paginate(rawPage, rawLimit, maxLimit=100)` — parseia e valida parâmetros, retorna `{ page, limit, offset }`; lança `INVALID_PAGINATION_PARAMS` se inválidos.
  - `buildPaginationMeta(page, limit, total)` — retorna `{ page, limit, total, totalPages }`.
  - `paginatedResponse(data, pagination)` — monta resposta `{ success, data, pagination }`.
- **Uso atual:** importado por `dicas.js` e `products.js`. `posts.js` e `videos.js` reimplementam manualmente a lógica de parse/validação.

### `/pages/api/dicas.js`

- **Localização:** `/pages/api/dicas.js`
- **Propósito:** Endpoint público de listagem de dicas com paginação.
- **Funcionalidades:**
  - Método GET apenas (405 com header `Allow` para outros).
  - Paginação via helper `paginate()`.
  - Cache via `getOrSetCache` com chave `dicas:public:published:${page}:${limit}`.
  - Rate limiting (`api:public:dicas`, 60 req/min) **dentro do callback de cache** para não penalizar cache hits.
  - Query com `SELECT COUNT(*)` + `SELECT ... WHERE published = true ORDER BY id ASC LIMIT/OFFSET` (parametrizado).
  - Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.
  - Tratamento de `RATE_LIMIT_EXCEEDED` (429) e `INVALID_PAGINATION_PARAMS` (400).

### `/pages/api/musicas.js`

- **Localização:** `/pages/api/musicas.js`
- **Propósito:** Endpoint público de listagem de músicas com paginação, busca e ordenação.
- **Funcionalidades:**
  - Método GET apenas (405 com header `Allow` para outros).
  - Validação de query params via **Zod** (`z.coerce.number().int().positive()` para page/limit, `search` máx. 200 chars, `sort` enum `default|recent|alpha`).
  - Cache via `getOrSetCache` com chave `musicas:${page}:${limit}:${sort}${search}`.
  - Rate limiting (`api:public:musicas`, 60 req/min) dentro do callback de cache.
  - Delega a busca para `getPaginatedMusicas()` em `lib/domain/musicas.js` (filtrando apenas músicas publicadas).
  - Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

### `/pages/api/posts.js`

- **Localização:** `/pages/api/posts.js`
- **Propósito:** Endpoint unificado de posts — listagem pública e criação autenticada.
- **Funcionalidades:**
  - **GET** (público): paginação manual (`parseInt` sem helper), busca textual, chaves de cache diferenciadas (`posts:list:` para listagens com TTL 2h e `posts:search:` para buscas com TTL 30min), rate limiting dentro do callback de cache (100 req/min com busca, 300 req/min sem).
  - **POST** (autenticado via `withAuth(postHandler)`): validação Zod (`postCreateSchema`), rate limiting em mutações (`api:posts:create`, 30 req/min), invalidação de cache com três chamadas (`posts:list:*`, `posts:search:*`, `posts:*` — redundantes entre si).
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, pagination, timestamp }`.
  - Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

### `/pages/api/videos.js`

- **Localização:** `/pages/api/videos.js`
- **Propósito:** Endpoint público de listagem de vídeos com paginação, busca e ordenação.
- **Funcionalidades:**
  - Método GET apenas.
  - Paginação manual (`parseInt` sem helper) com validação básica (page ≥ 1, 1 ≤ limit ≤ 100).
  - Ordenação via `SORT_MAP` (`recent`, `oldest`, `alpha`, `alpha_desc`) com fallback para `recent`.
  - **Rate limiting antes do cache** (`api:public:videos`) — diferente de `musicas.js`/`posts.js`/`dicas.js`, que aplicam dentro do callback.
  - Cache via `getOrSetCache` com chave `public_videos:${page}:${limit}:${search}:${sort}`.
  - Delega a busca para `getPublicPaginatedVideos()` em `lib/domain/videos.js`.
  - Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

### `/pages/api/products.js`

- **Localização:** `/pages/api/products.js`
- **Propósito:** CRUD completo de produtos com modo público e administrativo.
- **Funcionalidades:**
  - **GET** `?public=true` (público): paginação via helper `paginate()`, filtros (search, minPrice, maxPrice) na chave de cache, rate limiting antes do cache (`api:public:products`, 60 req/min), delega para `getPaginatedProducts()` em `lib/domain/products.js`.
  - **GET** (autenticado): listagem completa via `getAllProducts()`.
  - **POST/PUT/DELETE** (autenticado): cria, atualiza e remove via camada de domínio (`createProduct`, `updateProduct`, `deleteProduct`), com rate limiting em mutações (30 req/min), invalidação de cache (`products:*`) e `logActivity()` para auditoria.
  - **Autenticação:** middleware `requireAuth()` definido inline (encapsula `getAuthToken()` + `verifyToken()`) — não usa `createAdminHandler()` nem `withAuth`.
  - Validação mínima em POST (nome e preço obrigatórios) e tratamento de `NO_DATA_TO_UPDATE` no PUT.
  - GET admin e mutações delegam para `lib/domain/products.js`, mas sem validação Zod nos dados de entrada.

### `/pages/api/settings.js`

- **Localização:** `/pages/api/settings.js`
- **Propósito:** Endpoint unificado de configurações do sistema.
- **Funcionalidades:**
  - **GET** (público, sem `?key`): retorna configurações via `getSettings()`/`getAllSettingsRaw()` com cache `settings:all` (TTL 2h), Cache-Control `public, s-maxage=120, stale-while-revalidate=600`, e rate limiting `fire-and-forget` (`checkRateLimit(...).catch(() => {})` para falhas de rate limit nunca abortarem a resposta).
  - **GET** (autenticado, com `?key`): verificação manual de token (`getAuthToken` + `verifyToken`), restrição a roles `admin`/`editor`, cache `settings:${key}` (TTL 2h), fallback para valores padrão hardcoded (`site_name`, `site_description`, `posts_per_page`, etc.) e 404 se a chave não existir.
  - **POST** (autenticado via `withAuth`, apenas `admin`): validação Zod (`postSchema`), cria/atualiza via `updateSetting()` e invalida caches `settings:${key}`, `settings:all`, `settings:v1:all`.
  - **PUT** (autenticado via `withAuth`): validação Zod, atualiza via `updateSetting()` e invalida os mesmos caches.
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, timestamp }`.

### `/pages/api/status.js`

- **Localização:** `/pages/api/status.js`
- **Propósito:** Endpoint de diagnóstico e health check do sistema.
- **Funcionalidades:**
  - **GET** `?mode=health`: retorna apenas `{ status: 'ok' }` para health checks de infraestrutura.
  - **GET** (padrão): retorna diagnóstico completo — versão da API, ambiente, timestamp, status do banco PostgreSQL (teste `SELECT 1`), e métricas do sistema (Node.js, plataforma, uptime, memória RSS/heap).
  - Em caso de falha de conexão com o banco, registra o erro nos detalhes mas mantém status 200 com `database.status = 'error'`.

### `/pages/api/upload-image.js`

- **Localização:** `/pages/api/upload-image.js`
- **Propósito:** Endpoint de upload de imagens com múltiplas camadas de segurança.
- **Funcionalidades:**
  - Método POST protegido por `withAuth`; `bodyParser: false` (usa `formidable`).
  - Tamanho máximo de 5MB e tipos permitidos (JPEG, PNG, WebP, GIF) validados por `mimetype`.
  - **Validação de conteúdo real** via `sharp.metadata()` (magic bytes) — impede arquivos com extensão falsa.
  - **Limite de dimensões:** 1920×1920px com mensagem de erro informativa.
  - **Nome aleatório seguro:** `crypto.randomUUID()` com prefixo `hero-image-` ou `post-image-` conforme `uploadType`.
  - Extensão validada contra lista branca com fallback seguro para `.jpg`.
  - Se `uploadType === 'setting_home_image'`, atualiza a configuração `home_image_url` no banco.
  - Limpeza segura de arquivos temporários via `safeUnlink()` em cenários de validação.

### `/pages/api/placeholder-image.js`

- **Localização:** `/pages/api/placeholder-image.js`
- **Propósito:** Endpoint para servir a imagem principal da home (hero).
- **Funcionalidades:**
  - Tenta buscar `home_image_url` na configuração do banco (`getSetting`), extrai o nome do arquivo via `path.basename`.
  - Fallback: procura o arquivo `hero-image-*` mais recente em `public/uploads/` (ordenação por nome).
  - Fallback final: gera um SVG placeholder inline (1100×320).
  - Cache agressivo: `public, max-age=86400, immutable`, `ETag` e `Last-Modified`.
  - Content-Type detectado pela extensão (png, webp, jpeg).

### `/pages/api/cleanup-test-data.js`

- **Localização:** `/pages/api/cleanup-test-data.js`
- **Propósito:** Endpoint para limpeza de dados de teste gerados em carga.
- **Funcionalidades:**
  - Método DELETE protegido por `withAuth`.
  - Verificação adicional de admin: `req.user.username` deve ser `admin` ou `process.env.ADMIN_USERNAME`.
  - Executa `DELETE FROM posts WHERE slug LIKE 'post-carga-%'` e retorna `{ message, changes: rowCount }`.

---

## 3. API Admin

> **Padrão arquitetural:** Todos os 15 endpoints admin utilizam o **handler factory `createAdminHandler()`** de `lib/api/adminCrudHandler.js`, que centraliza: verificação de método HTTP + 405 padronizado em português, autenticação via `withAuth`, RBAC (checagem de permissão na tabela `roles`), rate limiting em mutações, invalidação automática de cache (via `cacheKeys`), injeção de `req.adminUtils.logActivity()` / `req.adminUtils.user` e try/catch unificado com mensagens de erro PostgreSQL traduzidas.

### CRUDs de Conteúdo

#### `/pages/api/admin/posts.js`

- **Localização:** `/pages/api/admin/posts.js`
- **Propósito:** CRUD administrativo de posts/artigos.
- **Funcionalidades:**
  - GET com `Cache-Control: no-store` (sempre atualizado), paginação e busca via `getPaginatedPosts()`.
  - POST com validação Zod (`postCreateSchema`) — título e slug obrigatórios, `image_url` validada (http ou caminho local).
  - PUT com validação Zod (`postUpdateDataSchema`), suporte a **reordenação em massa** via `action: 'reorder'` (atualiza `position` com `updateRecords`), e 400 se nenhum dado for enviado.
  - DELETE com busca do título para o log de auditoria.
  - Config: `permission: 'Posts/Artigos'`, `rateLimit: 300/min`, `cacheKeys: 'posts:*'`.

#### `/pages/api/admin/musicas.js`

- **Localização:** `/pages/api/admin/musicas.js`
- **Propósito:** CRUD administrativo de músicas.
- **Funcionalidades:**
  - GET com `Cache-Control: no-store`, paginação/busca via `getPaginatedMusicas()` (inclui não publicadas).
  - POST com validação Zod (`musicaSchema`) — título, artista e `url_spotify` obrigatórios; validação de URL do Spotify via `isValidSpotifyUrl()` (contém `spotify.com` ou `spotify:`).
  - PUT com validação Zod flexível (campos opcionais para toggle rápido de `publicado`), suporte a reordenação via `updateRecords('musicas', { position }, { id })`.
  - DELETE com extração do ID de query ou body.
  - Config: `rateLimit: 300/min`, `cacheKeys: 'musicas:*'`.

#### `/pages/api/admin/videos.js`

- **Localização:** `/pages/api/admin/videos.js`
- **Propósito:** CRUD administrativo de vídeos.
- **Funcionalidades:**
  - GET com `Cache-Control: no-store`, paginação/busca via `getPaginatedVideos()`.
  - POST com validação Zod (`videoSchema`) + validação de URL do YouTube via regex (`youtube.com/watch?v=` ou `youtu.be/` com ID de 11 caracteres).
  - PUT com validação parcial (Zod `partial()`), reordenação delegada a `reorderVideos()` de `lib/domain/videos.js`.
  - DELETE com ID de query ou body e log de auditoria.
  - Config: `permission: 'Gestão de Vídeos'`, `rateLimit: 300/min`, `cacheKeys: 'public_videos:*'`.

#### `/pages/api/admin/dicas.js`

- **Localização:** `/pages/api/admin/dicas.js`
- **Propósito:** CRUD administrativo de dicas.
- **Funcionalidades:**
  - GET (lista completa, inclui não publicadas).
  - POST com validação Zod (`dicaSchema`) — nome e conteúdo obrigatórios, `published` default `true`.
  - PUT com esquema de **atualização parcial**: se campos faltarem, busca valores atuais e faz merge antes de validar (`dicaUpdateSchema`); invalida `dicas:public:*`.
  - DELETE com log de auditoria.
  - Config: `rateLimit: 30/min`.

#### `/pages/api/admin/products.js` — *não existe como rota separada*

> **Nota:** O CRUD administrativo de produtos é gerenciado pelo endpoint público `/pages/api/products.js` (modo autenticado, sem `?public=true`). Não há arquivo `admin/products.js`; a gestão de produtos no painel usa o endpoint raiz.

#### `/pages/api/admin/users.js`

- **Localização:** `/pages/api/admin/users.js`
- **Propósito:** CRUD administrativo de usuários (124 linhas).
- **Funcionalidades:**
  - GET com paginação (limite padrão 100) e busca por username (`ILIKE`), **nunca retorna senhas** (seleciona apenas `id, username, role, created_at, last_login_at`).
  - POST com validação Zod (`userCreateSchema`), verificação de duplicidade de username e hash de senha via `hashPassword()`.
  - PUT com validação parcial, hash automático se nova senha enviada (senha vazia é ignorada).
  - DELETE: impede auto-exclusão do próprio usuário logado e registra auditoria.
  - Config: `permission: ['Segurança', 'Usuários']`, `rateLimit: 30/min`.
  - ⚠️ **Ponto de atenção:** as linhas 68, 99 e 115 contêm `await await` duplicado antes de `req.adminUtils.logActivity(...)`.

#### `/pages/api/admin/roles.js`

- **Localização:** `/pages/api/admin/roles.js`
- **Propósito:** Gerenciamento de papéis (roles) e permissões.
- **Funcionalidades:**
  - GET: lista roles; **cria a tabela `roles` automaticamente** se não existir (código `42P01`) e popula os cargos padrão (`admin` com todas as permissões e `user` com "Visão Geral").
  - POST/PUT com validação Zod (`roleSchema`/`roleUpdateSchema`); `permissions` serializado como JSONB.
  - DELETE com log de auditoria.
  - Config: `permission: ['Segurança', 'Usuários']`, `rateLimit: 30/min`.

### Ferramentas e Diagnóstico

#### `/pages/api/admin/audit.js`

- **Localização:** `/pages/api/admin/audit.js`
- **Propósito:** Consulta de logs de auditoria (`activity_logs`).
- **Funcionalidades:**
  - GET com paginação e **filtro por intervalo de datas** (`startDate`/`endDate`) montado dinamicamente com parâmetros parametrizados ($1, $2).
  - Ordenação por `created_at DESC`.
  - **Auto-criação da tabela `activity_logs`** se não existir (código `42P01`) e retorno de lista vazia.
  - Normaliza `user_id` para o `username` registrado no log.
  - Config: `permission: ['Auditoria', 'Segurança']`, `rateLimit: 30/min`.

#### `/pages/api/admin/stats.js`

- **Localização:** `/pages/api/admin/stats.js`
- **Propósito:** Estatísticas do dashboard administrativo.
- **Funcionalidades:**
  - GET com **19 queries em `Promise.all`** para contagens simultâneas: total/publicado/rascunho de posts, músicas, vídeos, produtos e dicas; total de usuários e usuários logados hoje/mês/ano.
  - Retorna objeto consolidado de métricas.
  - Config: `permission: 'Visão Geral'`, `rateLimit: 30/min`.

#### `/pages/api/admin/integrity.js`

- **Localização:** `/pages/api/admin/integrity.js`
- **Propósito:** Diagnóstico completo de integridade do sistema.
- **Funcionalidades:**
  - GET com verificação de 5 dimensões:
    - **Banco de dados:** conexão (`SELECT 1`), latência, tamanho (`pg_database_size`), conexões ativas (`pg_stat_database`).
    - **Cache/Redis:** ping via `@upstash/redis`; status `warning` se não configurado (fallback para memória).
    - **Armazenamento:** tamanho e contagem de arquivos em `public/uploads` (recursivo), espaço livre/ total do disco via `fs.statfsSync`.
    - **Backup:** listagem de arquivos em `data/backups` (.sql/.dump/.gz/.enc), último backup com idade formatada.
    - **Sistema:** versão Node, plataforma, arquitetura, hostname, uptime, memória RSS, CPU cores, ambiente.
  - Calcula status geral: `healthy` (tudo ok), `degraded` (algum erro), `warning` (algum aviso).
  - Inclui utilitários `formatBytes`, `formatUptime`, `formatTimeAgo`.
  - Config: `permission: 'Segurança'`, apenas GET.

#### `/pages/api/admin/backups.js`

- **Localização:** `/pages/api/admin/backups.js`
- **Propósito:** Gerenciamento de backups do banco de dados.
- **Funcionalidades:**
  - GET: lista arquivos de backup em `data/backups` (.sql/.gz/.enc) ordenados por data (mais recente primeiro) com nome, data e tamanho.
  - POST: cria backup via `createBackup()` de `scripts/backup` e registra auditoria.
  - Config: `rateLimit: 10/min`.
  - ⚠️ **Ponto de atenção:** importa `createBackup` de `'../../../scripts/backup'` **sem extensão `.js`** — no padrão ESM do projeto, isso pode gerar erro `ERR_MODULE_NOT_FOUND` (outros arquivos usam `'.js'` explícito).

#### `/pages/api/admin/cache.js`

- **Localização:** `/pages/api/admin/cache.js`
- **Propósito:** Gerenciamento e monitoramento do cache.
- **Funcionalidades:**
  - GET: retorna métricas do cache via `getCacheMetrics()`.
  - POST/DELETE: limpa todo o cache com `clearAllCache({ confirm: true })` (proteção contra FLUSHDB acidental) e registra auditoria.
  - Config: `requireAdmin: true`, `rateLimit: 10/min`.

#### `/pages/api/admin/rate-limit.js`

- **Localização:** `/pages/api/admin/rate-limit.js`
- **Propósito:** Gerenciamento completo de rate limiting no Redis (Upstash).
- **Funcionalidades:**
  - **GET** (sem `type`): lista IPs bloqueados via **SCAN paginado** (`redisScan` de `lib/infra/redis.js`; count 100, cap 2000) no lugar de `KEYS`, com `pipeline` restrita às chaves de contador (get + ttl em uma requisição) e filtrando apenas quem excedeu `MAX_ATTEMPTS` (5). Resultado agregado é cacheado em memória (TTL 15s) e invalidado em POST/DELETE bem-sucedidos.
  - **GET** `type=current_ip`: retorna IP atual do requisitante (prioriza `x-forwarded-for`, normaliza `::1`).
  - **GET** `type=whitelist`: lista IPs via `smembers('rate_limit:whitelist')`.
  - **GET** `type=audit`: lista logs de auditoria (lista `rate_limit:audit_logs` com limite de 100 registros) com paginação e filtros por data/busca (`parseAndFilterLogs`).
  - **GET** `type=export_csv`: exporta logs em CSV (`text/csv; charset=utf-8`) com os mesmos filtros.
  - **POST**: adiciona IP à whitelist (`sadd`), remove do bloqueio e registra auditoria.
  - **DELETE**: remove da whitelist (`srem`) ou desbloqueia IP (`del`).
  - **Função `redisSafe()`:** trata erros de rate limit do Upstash como fallback silencioso e propaga erros graves (timeout/conexão) para o handler superior.
  - Retorna 501 se Redis não estiver configurado (gerenciamento remoto indisponível no modo em memória).

### Integrações Externas (Fetchers)

Os três endpoints abaixo são usados pelo painel admin para **importar metadados automaticamente** a partir de URLs. Todos usam `createAdminHandler` com apenas método POST e compartilham a função `fetchWithTimeout()` com **timeout de 8 segundos** via `AbortController` (código duplicado nos três arquivos).

#### `/pages/api/admin/fetch-youtube.js`

- **Localização:** `/pages/api/admin/fetch-youtube.js`
- **Propósito:** Busca metadados de vídeo do YouTube.
- **Funcionalidade:** usa a API **oEmbed** pública (`https://www.youtube.com/oembed?url=...&format=json`) e retorna `{ title }`; registra auditoria.

#### `/pages/api/admin/fetch-spotify.js`

- **Localização:** `/pages/api/admin/fetch-spotify.js`
- **Propósito:** Busca metadados de música do Spotify.
- **Funcionalidades:** estratégias em cascata:
  1. **oEmbed oficial** (`open.spotify.com/oembed`) — retorna o título com precisão.
  2. **Extração do Iframe de Embed** (`open.spotify.com/embed/track/{id}`) — obtém o artista pelo JSON interno do HTML.
  3. **Scraping com User-Agent de Googlebot** — extrai o artista da meta description (`og:description`, padrão "Artista · Música · Ano").
  - Retorna `{ title, artist }` com fallback "Artista não identificado".

#### `/pages/api/admin/fetch-ml.js`

- **Localização:** `/pages/api/admin/fetch-ml.js`
- **Propósito:** Busca dados de produto do Mercado Livre para importação facilitada.
- **Funcionalidades:** decodifica a URL, extrai códigos `MLB` (regex `MLB[-_]?\d+`, remove duplicatas), prioriza `item_id` explícito (se presente) e tenta:
  1. **API de Items** (`api.mercadolibre.com/items/{id}`) + descrição.
  2. **API de Products/Catálogo** (`api.mercadolibre.com/products/{id}`) com `buy_box_winner`.
  3. **Scraping HTML** da página (com User-Agent real) — extrai meta tags `og:title`, `og:image`, `og:description`, `product:price:amount` e faz parse de preço.
  - Retorna `{ title, price, images, description }`; registra auditoria.

---

## 4. API Autenticação

### `/pages/api/auth/login.js`

- **Localização:** `/pages/api/auth/login.js`
- **Propósito:** Endpoint de autenticação (login) — unificado para web e API externa.
- **Funcionalidades:**
  - POST apenas (405 com header `Allow` para outros).
  - **Detecção de IP spoofing** via `detectSpoofedIP()` antes de autenticar; bloqueia com 403 se detectado.
  - Rate limiting por IP (5 tentativas/60s) delegado a `authenticateAndGenerateToken()` de `lib/auth/auth.js`.
  - Modo web (padrão): define cookies httpOnly `token` e `refreshToken` via `setAuthCookie()`/`setRefreshTokenCookie()` e retorna `{ success, user }`.
  - Modo API externa (`?response=body`): retorna `{ token, token_type, expires_in, refresh_token, refresh_token_expires_in, user }` no corpo.
  - Tratamento de erros específicos: `RATE_LIMITED` (429), `INVALID_CREDENTIALS` (401), `MISSING_FIELDS` (400).

### `/pages/api/auth/check.js`

- **Localização:** `/pages/api/auth/check.js`
- **Propósito:** Verificação de autenticação do token JWT.
- **Funcionalidades:**
  - GET apenas.
  - **Não usa `withAuth`** — valida manualmente com `getAuthToken(req)` (prioriza `Authorization: Bearer`, fallback cookie `token`) e `verifyToken(token)`.
  - Retorna 401 se token ausente ou inválido/expirado.
  - Sucesso: `{ success: true, data: { authenticated: true, user: { userId, username, role } }, message }`.
  - ⚠️ **Ponto de atenção:** o 405 não retorna o header `Allow` (diferente de `login.js`/`refresh.js`).

### `/pages/api/auth/refresh.js`

- **Localização:** `/pages/api/auth/refresh.js`
- **Propósito:** Renovação do access token via refresh token.
- **Funcionalidades:**
  - POST apenas (405 com header `Allow`).
  - Obtém refresh token do **cookie** (`getRefreshTokenCookie`) ou do **body** (`req.body.refreshToken`).
  - Delega a rotação (revoga token atual e gera novo par) a `refreshAccessToken()` de `lib/auth/auth.js`.
  - Sucesso: atualiza cookies e retorna `{ token, token_type, expires_in, refresh_token, refresh_token_expires_in, user }`.
  - Falha: limpa cookies antigos (`maxAge: 0`) e retorna 401.

### `/pages/api/auth/logout.js`

- **Localização:** `/pages/api/auth/logout.js`
- **Propósito:** Endpoint de logout.
- **Funcionalidades:**
  - Aceita qualquer método HTTP.
  - Extrai o refresh token do cookie e invalida no banco via `revokeRefreshToken()` (falha na revogação não impede o logout).
  - Limpa os cookies `token` e `refreshToken` com `maxAge: 0` usando as mesmas funções de criação (opções consistentes).
  - Retorna `{ success: true, message }`.

---

## 5. Helper de API

### `/pages/api/helper/pagination.js`

Já documentado na seção [2. API Pública](#2-api-pública) — é o único arquivo da pasta `helper/` e serve de suporte para todos os endpoints que precisam de paginação padronizada.

---

## 6. Blog

### `/pages/blog/index.js`

- **Localização:** `/pages/blog/index.js`
- **Propósito:** Página de listagem dos posts do blog com paginação SSR.
- **Funcionalidades:**
  - `getServerSideProps` com **query direta ao banco** (`SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2` + `COUNT(*)`) — sem fetch HTTP interno.
  - Paginação nativa via `LIMIT/OFFSET`; 9 posts por página.
  - Renderiza o componente `PostCard` (de `components/Features/Blog/PostCard`).
  - Navegação "Anterior"/"Próxima" com indicação de página atual.
  - **Estados diferenciados:** erro (`fetchError`) exibe mensagem amigável em destaque; lista vazia exibe "Nenhum post publicado ainda."
  - SEO via `next/head`.

### `/pages/blog/[slug].js`

- **Localização:** `/pages/blog/[slug].js`
- **Propósito:** Página de detalhe de post do blog (rota canônica).
- **Funcionalidades:**
  - `getServerSideProps` com query direta ao banco (`SELECT * FROM posts WHERE slug = $1 AND published = true`), retornando `notFound: true` se não existir ou em erro.
  - **SEO completo** com Open Graph (`og:type=article`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name`, `og:locale`, `article:published_time`) e Twitter Cards — URLs absolutas usando `SITE_URL` com fallback para localhost.
  - **Lightbox de imagem:** zoom ao clicar, fechamento com tecla `Esc`, foco automático ao abrir, `role="dialog"`, `aria-modal="true"`, `aria-label`.
  - **Compartilhamento:** botões estáticos para Facebook e WhatsApp; botão Instagram/Copiar Link que usa `navigator.share` com fallback para `navigator.clipboard`.
  - Renderiza o conteúdo com `white-space: pre-wrap`.
  - Link de voltar para a home.

### `/pages/blog/Blog.module.css`

- **Localização:** `/pages/blog/Blog.module.css`
- **Propósito:** Estilos CSS Module compartilhados entre as páginas do blog.
- **Estilos definidos:** `.container` (min-height 100vh), `.header` (texto centralizado), `.title` (2.5rem), `.subtitle` (1.1rem), `.grid` (grid responsivo `minmax(300px, 1fr)` com gap 2rem) e media query para 768px.

---

## 7. Estilos

> **Nota sobre a estrutura:** Os arquivos de design tokens JS (`/pages/styles/tokens/*.js`) e o gerador `generateTokensCSS.js` foram **removidos** do projeto por serem código morto (nenhum arquivo os importava). O `variables.css` (CSS estático pré-gerado) permanece como única fonte das CSS Custom Properties.

### `/pages/styles/variables.css`

- **Localização:** `/pages/styles/variables.css`
- **Propósito:** 386 CSS Custom Properties no `:root` — a fonte única dos Design Tokens.
- **Categorias:** cores (primary, secondary, neutral, feedback, semantic, state, spiritual), spacing (escalas `spacing`, `space`, `section`, `gap`, `padding`, `margin`), tipografia (font-family, size, weight, line-height, letter-spacing), borders, shadows (inclui variantes `shadow-glow` duplicadas nas linhas 278 e 290), breakpoints/containers, animações (duration, easing, transition), opacidade e z-index/layers.

### `/pages/styles/globals.css`

- **Localização:** `/pages/styles/globals.css`
- **Propósito:** Estilos globais — reset CSS e base tipográfica.
- **Funcionalidades:**
  - Importa `variables.css` via `@import`.
  - Reset (`box-sizing`, `margin`, `padding` em `*`).
  - `html, body` com `font-family: var(--font-family-body)`, background `var(--color-bg-secondary)`, texto `var(--color-text-primary)`, `overflow-y: auto`.
  - `body.modal-open { overflow: hidden; }` — **lock de scroll** para modais (gerenciado pelo componente Modal).
  - Links herdam cor e perdem sublinhado.

### `/pages/styles/Home.module.css`

- **Localização:** `/pages/styles/Home.module.css`
- **Propósito:** Estilos CSS Module da página inicial.
- **Características:** layout flex column (min-height 100vh), `.title` uppercase com `letter-spacing: 2px` (sem gradiente), `.subtitle` com largura máxima 800px, `.settingsError` (itálico, cor terciária), `.imageContainer` (máx. 1100px, altura 320px, border-radius, sombra) e `.heroImage` com hover scale (1.05). Responsivo para 768px e 480px. Todos os valores usam CSS Custom Properties.

### `/pages/styles/DesignSystem.module.css`

- **Localização:** `/pages/styles/DesignSystem.module.css`
- **Propósito:** Estilos CSS Module da página de demonstração do Design System.
- **Características:** header com gradiente azul (`primary-500` → `primary-700`), seções com card/sombra, classes de paleta de cores (`primary50`...`primary900`, `secondary50`...`secondary700`, `success/error/warning/info`), componentes de demonstração (`demoStack`, `demoBox`), lista de documentação e footer escuro. Responsivo para 768px. Todos os valores usam CSS Custom Properties.

---

## Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| Páginas raiz | 5 |
| APIs públicas | 10 |
| APIs admin | 15 |
| APIs autenticação | 4 |
| Helper de API | 1 |
| Páginas blog | 2 |
| CSS Module blog | 1 |
| Estilos globais e módulos | 4 |
| **Total** | **42** |

---

## Histórico de Mudanças Relevantes (documentação de apoio)

- **12–13/05/2026:** Endpoints `/api/v1/*` removidos e unificados na raiz; `[slug].js` catch-all removido (migrado para `blog/[slug].js`); 14 endpoints admin refatorados para `createAdminHandler()`; tokens CSS aplicados; validação Zod adicionada em endpoints admin; timeouts de 8s adicionados nos fetchers externos.
- **13/06/2026:** try/catch adicionado no `login.js` em torno de `authenticateAndGenerateToken()`.
- **28–30/07/2026:** Documentação consolidada em `PROJECT_pages.md` e `UPGRADE_pages.md`.
- **01/08/2026:** Nova análise profunda dos 42 arquivos atuais — corrigidos pontos divergentes (Cache-Control real dos endpoints, `check.js` sem `withAuth`, `globals.css` com `body.modal-open`, `Home.module.css` sem gradiente), identificado bug `await await` em `admin/users.js` e outros pontos registrados no `UPGRADE_pages.md`.