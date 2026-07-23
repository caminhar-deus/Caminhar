# Análise da Pasta `lib/`

> **Data da análise:** 28/06/2026  
> **Última atualização:** 18/07/2026
> **Objetivo:** Documentar de forma objetiva, técnica e organizada todos os arquivos da pasta `lib/` e suas subpastas, descrevendo localização, propósito, funcionalidades e responsabilidades de cada módulo.

---

## Índice

1. [Raiz de `lib/`](#1-raiz-de-lib)
   - [1.1 `lib/auth.js`](#11-libauthjs)
   - [1.2 `lib/cache.js`](#12-libcachejs)
   - [1.3 `lib/crud.js`](#13-libcrudjs)
   - [1.4 `lib/csvExport.js`](#14-libcsvexportjs)
   - [1.5 `lib/db.js`](#15-libdbjs)
   - [1.6 `lib/handleUnauthorized.js`](#16-libhandleunauthorizedjs)
   - [1.7 `lib/logger.js`](#17-libloggerjs)
   - [1.8 `lib/redis.js`](#18-libredisjs)
   - [1.9 `lib/reorder.js`](#19-libreorderjs)
   - [1.10 `lib/spotify.js`](#110-libspotifyjs)
   - [1.11 `lib/youtube.js`](#111-libyoutubejs)
2. [Subpasta `lib/api/`](#2-subpasta-libapi)
3. [Subpasta `lib/domain/`](#3-subpasta-libdomain)
4. [Subpasta `lib/seo/`](#4-subpasta-libseo)

---

## 1. Raiz de `lib/`

### 1.1 `lib/auth.js`

**Localização:** `/lib/auth.js`

**Propósito:** Sistema completo de autenticação do projeto. Gerencia hash de senhas (bcryptjs), tokens JWT, cookies de autenticação, login com rate limiting e inicialização do admin padrão.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `hashPassword(password)` | Aplica hash bcrypt com 10 rounds de salt |
| `verifyPassword(password, hashedPassword)` | Compara senha com hash armazenado |
| `generateToken(user)` | Gera JWT com `userId`, `username`, `role` e expiração de 1h |
| `verifyToken(token)` | Verifica e decodifica JWT; retorna `null` se inválido |
| `setAuthCookie(res, token, options)` | Define cookie `httpOnly` com o token |
| `getAuthCookie(req)` | Extrai token do cookie da requisição |
| `getAuthToken(req)` | Extrai token do header `Authorization: Bearer` ou do cookie (fallback) |
| `authenticate(username, password)` | Autentica usuário contra o banco de dados |
| `authenticateAndGenerateToken(username, password, ip, options)` | Função completa de login: valida campos, aplica rate limit (5 tentativas/min), autentica, atualiza `last_login_at`, busca permissões do cargo e gera token |
| `withAuth(handler)` | Middleware que protege handlers exigindo token JWT válido |
| `initializeAuth()` | Cria tabela `users`, migra coluna `role`, cria admin via variáveis de ambiente |

**Observações:** Utiliza `jsonwebtoken` e `bcryptjs`. O `JWT_SECRET` é obrigatório em produção — se ausente, lança erro. Em desenvolvimento, usa fallback com aviso explícito. O rate limit no login usa `checkRateLimit` do `cache.js` com padrão de 5 tentativas por minuto por IP.

---

### 1.2 `lib/cache.js`

**Localização:** `/lib/cache.js`

**Propósito:** Camada de cache com dois níveis (L1: memória local, L2: Redis) e sistema de rate limit distribuído com fallback completo. Implementa padrão Cache-Aside com Single-Flight (request coalescing) para evitar múltiplas buscas concorrentes pela mesma chave.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getOrSetCache(key, fetchFunction, ttlSeconds)` | Cache-Aside: tenta memória local → Redis → executa fetch e popula ambos. TTL padrão: 1h |
| `invalidateCache(keyPattern)` | Invalida cache por chave exata ou padrão com `*` (usa SCAN no Redis) |
| `clearAllCache(options)` | Limpa todo o cache (FLUSHDB). Requer `{ confirm: true }` para segurança |
| `checkRateLimit(ip, endpoint, limit, windowMs)` | Rate limit via Redis INCR+EXPIRE com fallback em Map local. Aceita `limit` como função dinâmica. Whitelist para IPs locais e redes privadas. Possui try/catch externo que retorna `false` em caso de erro inesperado, nunca bloqueando requisições por engano |
| `getCacheMetrics()` | Retorna métricas: hits, misses, erros, tamanhos dos maps, status da conexão Redis |
| `cleanupRateLimitTimer()` | Limpa o timer interno de safety net (uso em testes) |
| `clearAppMemoryCache()` | Limpa cache de aplicação em memória (uso em testes) |

**Mecanismos internos:**
- **Single-Flight:** Múltiplas chamadas concorrentes para a mesma chave aguardam a mesma promise, evitando N buscas simultâneas no banco.
- **Lazy eviction:** Entradas expiradas do Map de rate limit são removidas sob demanda no acesso, não em intervalo fixo.
- **Safety net:** `setInterval` a cada 60s que só atua se o Map ultrapassar 5000 entradas, removendo as mais antigas seletivamente.

**Observações:** Possui fallback completo caso o Redis falhe — o sistema nunca quebra por indisponibilidade do Redis. A whitelist de rate limit inclui `127.0.0.1`, `::1`, `localhost`, IPs IPv4-mapped e redes privadas (10.x, 172.16-31.x, 192.168.x). O valor `'unknown'` foi removido da whitelist para evitar bypass malicioso quando o header `x-forwarded-for` está ausente. A função `fetchAndCache` serializa os dados uma única vez com `JSON.stringify`, reutilizando a string serializada tanto para o Redis quanto para o cache em memória — eliminando a dupla serialização anterior. O `setInterval` de safety net só é criado em ambientes com `NODE_ENV` definido e diferente de `'test'`, evitando handles abertos durante execução de testes.

---

### 1.3 `lib/crud.js`

**Localização:** `/lib/crud.js`

**Propósito:** Operações CRUD genéricas parametrizadas para qualquer tabela do banco. Centraliza toda a construção SQL, evitando repetição nas camadas de domínio.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `raw(value)` | Marca valor como expressão SQL bruta (ex: `CURRENT_TIMESTAMP`). Usa Symbol para segurança |
| `createRecord(table, data, options)` | INSERT com `RETURNING` customizável. Suporta transação via `options.client` |
| `updateRecords(table, data, where, options)` | UPDATE dinâmico com WHERE parametrizado |
| `deleteRecords(table, where, options)` | DELETE com RETURNING |
| `upsertRecord(table, insertData, conflictTarget, updateData, options)` | INSERT ... ON CONFLICT DO UPDATE |

**Observações:** Toda construção SQL é parametrizada. Os nomes de tabelas/colunas são validados contra injeção SQL. Suporta `raw()` para funções SQL. Tabelas não mapeadas no schema operam sem filtro para compatibilidade.

---

### 1.4 `lib/csvExport.js`

**Localização:** `/lib/csvExport.js`

**Propósito:** Utilitário para exportação de dados no formato CSV diretamente no navegador.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `exportToCSV({ data, columns, filename, onEmpty })` | Exporta array de objetos para CSV e inicia download. Aceita `columns` com `key`, `header` e `format` (função opcional de formatação). Converte booleanos para "Publicado"/"Rascunho". Callback `onEmpty` se não houver dados |

**Observações:** Função exclusiva de frontend (navegador). Cria Blob com BOM `\uFEFF` para compatibilidade com Excel. Inclui proteção `typeof URL.revokeObjectURL === 'function'` para ambientes sem suporte à API (ex.: JSDOM em testes).

---

### 1.5 `lib/db.js`

**Localização:** `/lib/db.js`

**Propósito:** Gerenciamento da conexão com PostgreSQL via `pg.Pool`. Fornece a função `query` principal e utilitários de transação, health check e informações do banco.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPool()` | Obtém/cria o pool de conexões (lazy initialization) |
| `query(text, params, options)` | Executa SQL parametrizado com logging opcional, suporte a transação (`client`), controle de exceções (`throwOnError`) e retry automático (máx. 2 tentativas) para erros de timeout/rede |
| `transaction(callback)` | Executa callback dentro de BEGIN/COMMIT/ROLLBACK automático |
| `healthCheck()` | Verifica se o banco responde (`SELECT 1`) |
| `getDatabaseInfo()` | Retorna versão, conexões ativas e tamanho do banco |
| `closeDatabase()` | Fecha o pool de conexões |
| `resetPool()` | Reseta o pool (uso em testes) |

**Configurações do pool:** `max: 50`, `min: 5`, `idleTimeoutMillis: 60000`, `connectionTimeoutMillis: 15000`. SSL habilitado em produção. Health check periódico a cada 60s detecta falhas precoces e reseta o pool automaticamente.

**Observações:** O pool é criado sob demanda (lazy initialization) para compatibilidade com Jest mocks. Em caso de erro fatal no pool, tenta recriar automaticamente. Erros de timeout/rede disparam retry sem resetar o pool. O pool é pré-aquecido no startup com uma conexão inicial (`SELECT 1`) — exceto em ambiente de teste, onde o pré-aquecimento é desabilitado para evitar handles abertos. Re-exports removidos — importe diretamente de `./crud.js`, `./domain/settings.js`, `./domain/audit.js` e `./domain/posts.js`.

---

### 1.6 `lib/handleUnauthorized.js`

**Localização:** `/lib/handleUnauthorized.js`

**Propósito:** Função utilitária para tratamento padronizado de resposta 401 no frontend.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `handleUnauthorized(router, delay, message)` | Exibe toast de erro via `react-hot-toast`, aguarda delay opcional (ms), chama `router.reload()` e interrompe o fluxo com `await new Promise(() => {})` |

**Observações:** Exclusiva para uso no frontend.

---

### 1.7 `lib/logger.js`

**Localização:** `/lib/logger.js`

**Propósito:** Logger leve e padronizado para todo o projeto. Utiliza console nativo com emojis para categorização visual.

**Exportações:**

| Método | Descrição |
|--------|-----------|
| `logger.info(module, message, ...args)` | Log informativo com `console.log` e emoji ℹ️ |
| `logger.success(module, message, ...args)` | Log de sucesso com emoji ✅ |
| `logger.warn(module, message, ...args)` | Log de aviso com `console.warn` e emoji ⚠️ |
| `logger.error(module, message, ...args)` | Log de erro com `console.error` e emoji ❌ |
| `logger.debug(module, message, ...args)` | Log de debug com emoji 🔍 — só exibe se `LOG_LEVEL === 'debug'` |

**Observações:** Implementação simples e sem dependências externas.

---

### 1.8 `lib/redis.js`

**Localização:** `/lib/redis.js`

**Propósito:** Inicialização segura do cliente Redis Upstash com validação de configuração e fallback em memória. A inicialização é lazy (sob demanda) para evitar duplicidade em contextos separados do Next.js (SSR + API Routes).

**Exportações:**

| Exportação | Descrição |
|------------|-----------|
| `redis` | Sempre `null` — use `getRedisInstance()` |
| `getRedisInstance()` | Retorna instância Redis, inicializando sob demanda (lazy) |
| `redisGet(key)` | Obtém valor do Redis em tentativa única, com fallback direto em memória |
| `redisSet(key, value, ttlSeconds)` | Salva valor no Redis com fallback em memória |
| `redisDel(...keys)` | Deleta chave(s) do Redis e da memória; suporta wildcard na memória |
| `redisScan(cursor, options)` | Escaneia chaves no Redis |
| `redisIncr(key)` | Incrementa chave (rate limit) com fallback em memória |
| `redisExpire(key, seconds, nx?)` | Define expiração em chave |
| `redisFlushdb()` | Executa FLUSHDB e limpa cache em memória |

**Fluxo de inicialização:**
1. `getRedisInstance()` é chamada sob demanda por `cache.js`.
2. Verifica `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
3. Valida se URL começa com `https://` e se o token **não** começa com `https://` (proteção contra variáveis trocadas).
4. Se tudo ok, cria instância `Redis` do `@upstash/redis`. Caso contrário, opera com fallback em memória.

**Observações:** Design tolerante a falhas: o app não quebra se Redis estiver indisponível. O cache em memória (fallback) tem lazy cleanup quando ultrapassa 1000 entradas. A função `redisGet` tenta o Redis uma única vez — o retry duplo anterior foi removido para eliminar latência extra de ~50-150ms por requisição, já que o `cache.js` possui cache L1 (memória) e Single-Flight como camadas de resiliência.

---

### 1.9 `lib/reorder.js`

**Localização:** `/lib/reorder.js`

**Propósito:** Helper compartilhado para reordenação via Drag & Drop no Admin.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `handleReorder(endpoint, reorderedItems, currentPage, itemsPerPage)` | Envia requisição PUT para o endpoint com os itens na nova ordem, calculando `position` como `offset + index`. |

**Observações:** Função exclusiva de frontend.

---

### 1.10 `lib/spotify.js`

**Localização:** `/lib/spotify.js`

**Propósito:** Utilitário para extração de IDs do Spotify a partir de URLs.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `extractSpotifyId(url)` | Extrai o ID da track de diferentes formatos |
| `getSpotifyEmbedUrl(url)` | Converte URL para embed |

---

### 1.11 `lib/youtube.js`

**Localização:** `/lib/youtube.js`

**Propósito:** Utilitário para extração de IDs do YouTube a partir de URLs.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `extractYoutubeId(url)` | Extrai o ID de 11 caracteres de vários formatos de URL |

---

## 2. Subpasta `lib/api/`

### 2.1 `lib/api/index.js`

**Localização:** `/lib/api/index.js`

**Propósito:** Ponto de exportação centralizada de todos os submódulos de `lib/api/`. Exporta apenas um objeto default com os 4 namespaces (`errors`, `response`, `validate`, `middleware`). Os 47 exports nomeados anteriormente foram removidos por não serem consumidos externamente — as páginas em `pages/api/` importam diretamente de `adminCrudHandler.js` e `helpers.js`, e os submódulos internos se importam entre si.

---

### 2.2 `lib/api/adminCrudHandler.js`

**Localização:** `/lib/api/adminCrudHandler.js`

**Propósito:** Factory de handlers CRUD para endpoints administrativos. Centraliza o boilerplate comum: verificação de método, autenticação, RBAC, rate limiting, detecção de IP spoofing, invalidação de cache e try/catch unificado.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `createAdminHandler(config)` | Cria handler Next.js completo a partir de configuração |

---

### 2.3 `lib/api/errors.js`

**Localização:** `/lib/api/errors.js`

**Propósito:** Classes de erro customizadas para a API (ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, ServerError, ServiceUnavailableError, MethodNotAllowedError).

---

### 2.4 `lib/api/helpers.js`

**Localização:** `/lib/api/helpers.js`

**Propósito:** Helpers compartilhados para endpoints da API — extração segura de IP e detecção de spoofing.

**Funções exportadas:** `getClientIP(req, options)`, `detectSpoofedIP(req)`

---

### 2.5 `lib/api/middleware.js`

**Localização:** `/lib/api/middleware.js`

**Propósito:** Sistema de composição de middlewares para APIs Next.js. Único módulo de middlewares do projeto.

**Funções exportadas:** `composeMiddleware`, `withMethod`, `withAuth`, `withOptionalAuth`, `withRateLimit`, `withCors`, `withErrorHandler`, `withLogger`, `withTimeout`, `withBodyParser`, `withCache`, `publicApi`, `protectedApi`

---

### 2.6 `lib/api/response.js`

**Localização:** `/lib/api/response.js`

**Propósito:** Padronização de todas as respostas da API. Funções factory para respostas de sucesso e erro em formato JSON consistente.

---

### 2.7 `lib/api/utils.js`

**Localização:** `/lib/api/utils.js`

**Propósito:** Utilitários compartilhados: `generateUUID()`, `generateMeta()`, `parseImages()`.

---

### 2.8 `lib/api/validate.js`

**Localização:** `/lib/api/validate.js`

**Propósito:** Middlewares de validação de dados de entrada usando Zod.

---

## 3. Subpasta `lib/domain/`

### 3.1 `lib/domain/audit.js`

Registro de log de auditoria — `logActivity(username, action, entityType, entityId, details, ipAddress, options)`.

### 3.2 `lib/domain/images.js`

Gerenciamento de metadados de imagens — `saveImage(filename, relativePath, type, fileSize, userId, options)` com validação Zod.

### 3.3 `lib/domain/musicas.js`

CRUD de músicas com paginação e busca. Funções: `getAllMusicas()`, `getPaginatedMusicas()`, `createMusica()`, `updateMusica()`, `deleteMusica()`.

### 3.4 `lib/domain/permissions.js`

Lista imutável (`Object.freeze`) com 10 permissões para atribuição a cargos de administrador.

### 3.5 `lib/domain/posts.js`

CRUD de posts com paginação e full-text search (tsvector em português). Funções: `getRecentPosts()`, `getAllPosts()`, `getPaginatedPosts()`, `createPost()`, `updatePost()`, `deletePost()`, `createPostWithAudit()`.

### 3.6 `lib/domain/products.js`

CRUD de produtos com paginação e formatação de moeda (R$). Funções: `getPaginatedProducts()`, `getAllProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`.

### 3.7 `lib/domain/settings.js`

Gerenciamento de configurações dinâmicas — `getSetting()`, `getSettings()`, `updateSetting()`, `setSetting()`, `getAllSettingsRaw()`, `getAllSettings()`.

### 3.8 `lib/domain/shared-pagination.js`

**Localização:** `/lib/domain/shared-pagination.js`

**Propósito:** Helper compartilhado de paginação com busca textual. Centraliza a lógica que antes estava duplicada em `musicas.js`, `videos.js` e `posts.js`.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `paginate(tableName, params)` | Executa paginação com busca em paralelo (COUNT + dados). Aceita: `page`, `limit`, `search`, `publishedOnly`, `publishedField`, `orderBy`, `searchOptions` |

**Estratégias de busca:**
- **ILIKE** (`searchOptions.fields`): Para músicas (titulo, artista) e vídeos (titulo, descricao). Usa `%termo%` com `ILIKE`.
- **tsvector** (`searchOptions.tsvector`): Para posts com full-text search em português. Usa `plainto_tsquery`.

**Observações:** Executa duas queries em paralelo via `Promise.all`. O termo de busca é normalizado com `.toLowerCase().trim()`. Para listagens públicas (`publishedOnly=true`), a query usa `SELECT` com colunas específicas em vez de `SELECT *`, excluindo colunas pesadas como `content` que não são utilizadas na listagem — reduzindo payload de dados trafegados do PostgreSQL.

---

### 3.9 `lib/domain/videos.js`

CRUD de vídeos com paginação, busca e reordenação. Funções: `getPaginatedVideos()`, `getPublicPaginatedVideos()`, `createVideo()`, `updateVideo()`, `deleteVideo()`, `reorderVideos()`.

---

## 4. Subpasta `lib/seo/`

### 4.1 `lib/seo/config.js`

Centralização de todas as configurações de SEO: `siteConfig` (nome, URL, descrição, redes sociais), Schema.org JSON-LD (Organization, WebSite, BreadcrumbList), funções utilitárias (`getCanonicalUrl`, `getImageUrl`, `sanitizeJsonLd`, `shouldIndex`, `generateBreadcrumb`, etc.).

---

## Resumo dos arquivos

| Arquivo | Responsabilidade Principal |
|---------|---------------------------|
| `auth.js` | Autenticação (JWT + bcrypt + cookies + login com rate limit) |
| `cache.js` | Cache multi-nível (memória + Redis) + rate limit distribuído |
| `crud.js` | Operações SQL genéricas parametrizadas |
| `csvExport.js` | Exportação de dados para CSV no navegador |
| `db.js` | Pool PostgreSQL + query + transações + health check (60s) |
| `handleUnauthorized.js` | Tratamento de 401 no frontend |
| `logger.js` | Logger leve e padronizado com emojis |
| `redis.js` | Cliente Redis Upstash com fallback em memória (retry único) |
| `reorder.js` | Reordenação Drag & Drop via API (frontend) |
| `spotify.js` | Extração de IDs do Spotify |
| `youtube.js` | Extração de IDs do YouTube |
| `api/adminCrudHandler.js` | Factory de handlers CRUD para admin |
| `api/errors.js` | Classes de erro customizadas da API |
| `api/helpers.js` | Extração de IP e detecção de spoofing |
| `api/index.js` | Barrel export dos módulos da API |
| `api/middleware.js` | Composição de middlewares |
| `api/response.js` | Padronização de respostas JSON |
| `api/utils.js` | Utilitários (UUID, metadados, parse de imagens) |
| `api/validate.js` | Validação de entrada com Zod |
| `domain/audit.js` | Log de auditoria |
| `domain/images.js` | Metadados de imagens |
| `domain/musicas.js` | CRUD de músicas |
| `domain/permissions.js` | Lista de permissões de cargos |
| `domain/posts.js` | CRUD de posts |
| `domain/products.js` | CRUD de produtos |
| `domain/settings.js` | Configurações dinâmicas do sistema |
| `domain/shared-pagination.js` | Paginação genérica com busca e SELECT otimizado |
| `domain/videos.js` | CRUD de vídeos |
| `seo/config.js` | Configurações de SEO e Schema.org |