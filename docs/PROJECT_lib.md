# Análise da Pasta `lib/`

> **Data da análise:** 28/06/2026  
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
   - [2.1 `lib/api/index.js`](#21-libapiindexjs)
   - [2.2 `lib/api/adminCrudHandler.js`](#22-libapiadmincrudhandlerjs)
   - [2.3 `lib/api/errors.js`](#23-libapierrorsjs)
   - [2.4 `lib/api/helpers.js`](#24-libapihelpersjs)
   - [2.5 `lib/api/middleware.js`](#25-libapimiddlewarejs)
   - [2.6 `lib/api/response.js`](#26-libapiresponsejs)
   - [2.7 `lib/api/utils.js`](#27-libapiutilsjs)
   - [2.8 `lib/api/validate.js`](#28-libapivalidatejs)
3. [Subpasta `lib/domain/`](#3-subpasta-libdomain)
   - [3.1 `lib/domain/audit.js`](#31-libdomainauditjs)
   - [3.2 `lib/domain/images.js`](#32-libdomainimagesjs)
   - [3.3 `lib/domain/musicas.js`](#33-libdomainmusicasjs)
   - [3.4 `lib/domain/permissions.js`](#34-libdomainpermissionsjs)
   - [3.5 `lib/domain/posts.js`](#35-libdomainpostsjs)
   - [3.6 `lib/domain/products.js`](#36-libdomainproductsjs)
   - [3.7 `lib/domain/settings.js`](#37-libdomainsettingsjs)
   - [3.8 `lib/domain/shared-pagination.js`](#38-libdomainshared-paginationjs)
   - [3.9 `lib/domain/videos.js`](#39-libdomainvideosjs)
4. [Subpasta `lib/seo/`](#4-subpasta-libseo)
   - [4.1 `lib/seo/config.js`](#41-libseoconfigjs)

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
| `checkRateLimit(ip, endpoint, limit, windowMs)` | Rate limit via Redis INCR+EXPIRE com fallback em Map local. Aceita `limit` como função dinâmica. Whitelist para IPs locais e redes privadas |
| `getCacheMetrics()` | Retorna métricas: hits, misses, erros, tamanhos dos maps, status da conexão Redis |
| `cleanupRateLimitTimer()` | Limpa o timer interno de safety net (uso em testes) |
| `clearAppMemoryCache()` | Limpa cache de aplicação em memória (uso em testes) |

**Mecanismos internos:**
- **Single-Flight:** Múltiplas chamadas concorrentes para a mesma chave aguardam a mesma promise, evitando N buscas simultâneas no banco.
- **Lazy eviction:** Entradas expiradas do Map de rate limit são removidas sob demanda no acesso, não em intervalo fixo.
- **Safety net:** `setInterval` a cada 60s que só atua se o Map ultrapassar 5000 entradas, removendo as mais antigas seletivamente.

**Observações:** Possui fallback completo caso o Redis falhe — o sistema nunca quebra por indisponibilidade do Redis. A whitelist de rate limit inclui `127.0.0.1`, `::1`, `localhost`, IPs IPv4-mapped e redes privadas (10.x, 172.16-31.x, 192.168.x). O valor `'unknown'` foi removido da whitelist para evitar bypass malicioso quando o header `x-forwarded-for` está ausente.

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

**Funções internas:**
- `_validateIdentifier(identifier)` — Valida nomes de tabela/coluna (regex `^[a-zA-Z0-9_]+$`) para prevenir SQL injection.
- `_buildSetClause(data, startingIndex)` — Constrói cláusulas SET para UPDATE.
- `_buildInsertClauseParts(data, startingIndex)` — Constrói campos e placeholders para INSERT.
- `_filterAllowedFields(table, data)` — Filtra campos permitidos com base no schema da tabela, ignorando campos não pertencentes com aviso no console.

**Schema de tabelas (`tableSchemas`):** Define campos permitidos para: `musicas`, `posts`, `videos`, `settings`, `images`, `categories`, `tags`, `post_categories`, `post_tags`, `audit_log`, `roles`, `users`, `dicas`, `products`.

**Observações:** Toda construção SQL é parametrizada. Os nomes de tabelas/colunas são validados contra injeção SQL. Suporta `raw()` para funções SQL. Tabelas não mapeadas no schema operam sem filtro para compatibilidade.

---

### 1.4 `lib/csvExport.js`

**Localização:** `/lib/csvExport.js`

**Propósito:** Utilitário para exportação de dados no formato CSV diretamente no navegador. Gera Blob com BOM UTF-8, cria link temporário e inicia o download.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `exportToCSV({ data, columns, filename, onEmpty })` | Exporta array de objetos para CSV e inicia download. Aceita `columns` com `key`, `header` e `format` (função opcional de formatação). Converte booleanos para "Publicado"/"Rascunho". Callback `onEmpty` se não houver dados |

**Observações:** Função exclusiva de frontend (navegador). Cria Blob com BOM `\uFEFF` para compatibilidade com Excel. Libera memória do Blob após 1s com `setTimeout`.

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

**Configurações do pool:** `max: 50`, `min: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. SSL habilitado em produção. Health check periódico a cada 15s detecta falhas precoces e reseta o pool automaticamente.

**Observações:** O pool é criado sob demanda (lazy initialization) para compatibilidade com Jest mocks. Em caso de erro fatal no pool, tenta recriar automaticamente. Erros de timeout/rede disparam retry com reset do pool. Re-exports removidos — importe diretamente de `./crud.js`, `./domain/settings.js`, `./domain/audit.js` e `./domain/posts.js`.

---

### 1.6 `lib/handleUnauthorized.js`

**Localização:** `/lib/handleUnauthorized.js`

**Propósito:** Função utilitária para tratamento padronizado de resposta 401 no frontend. Exibe toast de sessão expirada e recarrega a página. Este arquivo **não** importa módulos de servidor (pg, jwt, bcryptjs) para evitar erros de build no Next.js/Turbopack.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `handleUnauthorized(router, delay, message)` | Exibe toast de erro via `react-hot-toast`, aguarda delay opcional (ms), chama `router.reload()` e interrompe o fluxo com `await new Promise(() => {})` |

**Observações:** Exclusiva para uso no frontend. Importa `react-hot-toast` dinamicamente com `await import()`. O delay serve para permitir que o toast apareça antes do reload.

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

**Observações:** Implementação simples e sem dependências externas. O parâmetro `module` identifica a origem (ex: 'Auth', 'DB', 'Cache').

---

### 1.8 `lib/redis.js`

**Localização:** `/lib/redis.js`

**Propósito:** Inicialização segura do cliente Redis Upstash com validação de configuração, fallback em memória e retry. A inicialização é lazy (sob demanda) para evitar duplicidade em contextos separados do Next.js (SSR + API Routes).

**Exportações:**

| Exportação | Descrição |
|------------|-----------|
| `redis` | Sempre `null` — use `getRedisInstance()` |
| `getRedisInstance()` | Retorna instância Redis, inicializando sob demanda (lazy) |
| `redisGet(key)` | Obtém valor do Redis com retry (2 tentativas) e fallback em memória |
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

**Observações:** Design tolerante a falhas: o app não quebra se Redis estiver indisponível. O cache em memória (fallback) tem lazy cleanup quando ultrapassa 1000 entradas.

---

### 1.9 `lib/reorder.js`

**Localização:** `/lib/reorder.js`

**Propósito:** Helper compartilhado para reordenação via Drag & Drop no Admin. Centraliza a lógica que antes estava duplicada em `AdminMusicas.js`, `AdminPosts.js`, `AdminVideos.js` e `AdminProducts.js`.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `handleReorder(endpoint, reorderedItems, currentPage, itemsPerPage)` | Envia requisição PUT para o endpoint com os itens na nova ordem, calculando `position` como `offset + index`. Loga erro no console se falhar |

**Observações:** Função exclusiva de frontend. Dispara fetch para o endpoint admin. Não relança erro após failure — apenas loga no console.

---

### 1.10 `lib/spotify.js`

**Localização:** `/lib/spotify.js`

**Propósito:** Utilitário para extração de IDs do Spotify a partir de URLs. Evita duplicação de regex entre componentes (`MusicCard` e `UrlField`).

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `extractSpotifyId(url)` | Extrai o ID da track de diferentes formatos: `open.spotify.com/track/ID`, `spotify:track:ID`, `open.spotify.com/intl-XX/track/ID` |
| `getSpotifyEmbedUrl(url)` | Converte URL para embed: `https://open.spotify.com/embed/track/ID` |

---

### 1.11 `lib/youtube.js`

**Localização:** `/lib/youtube.js`

**Propósito:** Utilitário para extração de IDs do YouTube a partir de URLs. Evita duplicação de regex entre componentes (`VideoCard`, `VideoSection` e `UrlField`).

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `extractYoutubeId(url)` | Extrai o ID de 11 caracteres de formatos: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/v/ID`, `youtube.com/e/ID` |

---

## 2. Subpasta `lib/api/`

### 2.1 `lib/api/index.js`

**Localização:** `/lib/api/index.js`

**Propósito:** Ponto de exportação centralizada de todos os submódulos de `lib/api/`. Simplifica imports com uma única linha.

**Re-exporta:** Todas as classes de erro (`errors.js`), funções de resposta (`response.js`), validação (`validate.js`) e middlewares (`middleware.js`). Também exporta um objeto `default` com todos os módulos agrupados.

---

### 2.2 `lib/api/adminCrudHandler.js`

**Localização:** `/lib/api/adminCrudHandler.js`

**Propósito:** Factory de handlers CRUD para endpoints administrativos. Centraliza o boilerplate comum a todos os endpoints admin: verificação de método, autenticação, RBAC, rate limiting, detecção de IP spoofing, invalidação de cache e try/catch unificado.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `createAdminHandler(config)` | Cria handler Next.js completo a partir de configuração. Aceita: `name`, `permission(s)`, `requireAdmin`, `handlers` (mapeamento método → função), `rateLimit`, `cacheKeys`, `allowedMethods` |

**Ordem de execução do handler gerado:**
1. Verificação de método HTTP (405 se não permitido)
2. Verificação de autenticação (401 se `user` for nulo)
3. RBAC: `requireAdmin` ou verificação de permissão na tabela `roles`
4. Detecção de IP spoofing em mutações (POST/PUT/DELETE)
5. Rate limiting em mutações
6. Execução do handler específico com `req.adminUtils` injetado (`logActivity`, `invalidateCache`)
7. Invalidação automática de cache em mutações bem-sucedidas

**Tratamento de erros:** Traduz mensagens comuns do banco para português (unique constraint, foreign key, not null). O handler final é envolvido por `withAuth` do `auth.js`.

---

### 2.3 `lib/api/errors.js`

**Localização:** `/lib/api/errors.js`

**Propósito:** Classes de erro customizadas para a API, cada uma mapeando para um código HTTP específico. Herdam de `ApiError` que estende `Error`.

**Classes exportadas:**

| Classe | HTTP | Código | Uso |
|--------|------|--------|-----|
| `ApiError` | — | — | Classe base |
| `ValidationError` | 400 | VALIDATION_ERROR | Dados inválidos |
| `AuthenticationError` | 401 | AUTHENTICATION_ERROR | Token ausente/expirado |
| `ForbiddenError` | 403 | FORBIDDEN_ERROR | Permissão insuficiente |
| `NotFoundError` | 404 | NOT_FOUND_ERROR | Recurso não encontrado |
| `ConflictError` | 409 | CONFLICT_ERROR | Duplicidade/conflito |
| `RateLimitError` | 429 | RATE_LIMIT_ERROR | Muitas requisições |
| `ServerError` | 500 | SERVER_ERROR | Erro interno |
| `ServiceUnavailableError` | 503 | SERVICE_UNAVAILABLE | Serviço temporariamente fora |
| `MethodNotAllowedError` | 405 | METHOD_NOT_ALLOWED | Método HTTP não permitido |

**Observações:** Cada classe possui `toJSON()` com formato padronizado: `success`, `error.code`, `error.message`, `details`, `meta.timestamp` e `meta.requestId`. Utiliza `generateUUID` de `utils.js` para rastreamento.

---

### 2.4 `lib/api/helpers.js`

**Localização:** `/lib/api/helpers.js`

**Propósito:** Helpers compartilhados para endpoints da API, com foco em extração segura de IP e detecção de spoofing.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getClientIP(req, options)` | Extrai IP real do cliente: prioriza `x-forwarded-for` se `trustProxy=true`, senão usa `req.socket.remoteAddress`. Normaliza IPv4-mapped IPv6. Fallback para `127.0.0.1` |
| `detectSpoofedIP(req)` | Detecta IP spoofing comparando `socket.remoteAddress` (não falsificável) com `x-forwarded-for`. Considera localhost, redes privadas e cenários de proxy legítimo |

**Observações:** A função `detectSpoofedIP` tem lógica refinada que considera conexões locais do Next.js (localhost com `x-forwarded-for` diferente não é spoofing), redes privadas com proxy interno e cenários onde socket é público mas forwarded diverge (spoofing claro). Função `normalizeIP` interna converte `::1` para `127.0.0.1` e remove prefixo `::ffff:`.

---

### 2.5 `lib/api/middleware.js`

**Localização:** `/lib/api/middleware.js`

**Propósito:** Sistema de composição de middlewares para APIs Next.js. Único módulo de middlewares do projeto.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `composeMiddleware(...middlewares)` | Compõe middlewares da esquerda para direita usando `reduceRight` |
| `withMethod(allowedMethods)` | Restringe métodos HTTP permitidos |
| `withAuth(options)` | Autenticação com suporte a roles |
| `withOptionalAuth()` | Autenticação opcional (não bloqueia anônimos) |
| `withRateLimit(options)` | Rate limit via `checkRateLimit` do `cache.js` (Redis + memória). Suporta `maxRequests` como função |
| `withCors(options)` | CORS adaptativo: em produção lê `ALLOWED_ORIGINS`, em desenvolvimento usa `*` |
| `withErrorHandler(options)` | Captura e padroniza erros |
| `withLogger(options)` | Logging de requisições com duração |
| `withTimeout(timeoutMs)` | Timeout (padrão: 10s) |
| `withBodyParser(options)` | Validação de tamanho do body (1MB padrão) |
| `withCache(maxAge)` | Cache via header `Cache-Control` (GET apenas) |
| `publicApi(handler, options)` | Combinação pronta para APIs públicas (CORS + error handler + rate limit + logger + GET) |
| `protectedApi(handler, options)` | Combinação pronta para APIs autenticadas (CORS + error handler + rate limit + logger + método + auth com roles) |

**Observações:** `withRateLimit` e `withCors` emitem avisos no console se Redis não estiver disponível em produção ou se `ALLOWED_ORIGINS` não estiver configurado.

---

### 2.6 `lib/api/response.js`

**Localização:** `/lib/api/response.js`

**Propósito:** Padronização de todas as respostas da API. Funções factory para respostas de sucesso e erro, garantindo formato JSON consistente.

**Respostas de Sucesso:**

| Função | HTTP | Descrição |
|--------|------|-----------|
| `success(res, data, meta)` | 200 | Resposta padrão |
| `paginated(res, data, pagination, meta)` | 200 | Lista paginada com `hasNext`, `hasPrev`, `totalPages` |
| `created(res, data, location, meta)` | 201 | Recurso criado, com header `Location` opcional |
| `accepted(res, data, meta)` | 202 | Requisição aceita para processamento |
| `noContent(res)` | 204 | Sem conteúdo |
| `updated(res, data, meta)` | 200/204 | Recurso atualizado (204 se sem dados) |
| `deleted(res, data, meta)` | 200/204 | Recurso deletado (204 se sem dados) |

**Respostas de Erro:**

| Função | HTTP | Descrição |
|--------|------|-----------|
| `badRequest(res, message, errors, meta)` | 400 | Requisição inválida |
| `validationError(res, message, errors, meta)` | 400 | Erro de validação |
| `unauthorized(res, message, meta)` | 401 | Não autenticado (+ header WWW-Authenticate) |
| `forbidden(res, message, meta)` | 403 | Acesso negado |
| `notFound(res, resource, identifier, meta)` | 404 | Recurso não encontrado |
| `methodNotAllowed(res, method, allowed, meta)` | 405 | Método não permitido (+ header Allow) |
| `conflict(res, message, meta)` | 409 | Conflito de dados |
| `tooManyRequests(res, message, retryAfter, meta)` | 429 | Rate limit excedido (+ header Retry-After) |
| `serverError(res, message, meta)` | 500 | Erro interno |
| `serviceUnavailable(res, message, retryAfter, meta)` | 503 | Serviço indisponível |
| `handleError(res, error, includeStack)` | — | Tratamento genérico (detecta `toJSON()` e erros comuns) |

**Observações:** Todas as respostas incluem `meta.timestamp` e `meta.requestId`. Utiliza `generateUUID` e `generateMeta` de `utils.js`.

---

### 2.7 `lib/api/utils.js`

**Localização:** `/lib/api/utils.js`

**Propósito:** Utilitários compartilhados entre os módulos da API.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `generateUUID()` | Gera UUID v4 simples (fallback quando uuid lib não disponível) |
| `generateMeta(customMeta)` | Gera metadados padrão com `timestamp` e `requestId` |
| `parseImages(imagesString)` | Transforma string de URLs separadas por `\n` em array de URLs limpas |

---

### 2.8 `lib/api/validate.js`

**Localização:** `/lib/api/validate.js`

**Propósito:** Middlewares de validação de dados de entrada usando Zod.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `formatZodErrors(zodError)` | Converte erros do Zod para formato padronizado `{ field, message, code }` |
| `validateBody(schema)` | Valida body em POST/PUT/PATCH |
| `validateQuery(schema)` | Valida query parameters |
| `validateParams(schema)` | Valida parâmetros de rota (extrai apenas chaves do schema) |
| `validateHeaders(schema)` | Valida headers (case-insensitive, normaliza para lowercase) |
| `validateRequest(schemas)` | Valida body + query + params combinados usando `safeParse` para coletar todos os erros |
| `createPaginationSchema(options)` | Helper para schema de paginação (page, limit com conversão automática de string para número) |
| `createSearchSchema(options)` | Helper para schema de busca (search com min/max length) |

---

## 3. Subpasta `lib/domain/`

### 3.1 `lib/domain/audit.js`

**Localização:** `/lib/domain/audit.js`

**Propósito:** Registro de log de auditoria para rastrear ações dos usuários no sistema.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `logActivity(username, action, entityType, entityId, details, ipAddress, options)` | Insere registro na tabela `activity_logs`. Suporta transação via `options.client` |

**Observações:** Operação simples de INSERT na tabela `activity_logs`. O log é desabilitado por padrão (`log: false`).

---

### 3.2 `lib/domain/images.js`

**Localização:** `/lib/domain/images.js`

**Propósito:** Gerenciamento de metadados de imagens no banco de dados, com validação Zod antes da persistência.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `saveImage(filename, relativePath, type, fileSize, userId, options)` | Valida dados com schema Zod (`filename`, `path`, `type`, `size` inteiro positivo, `user_id` nullable) e salva na tabela `images` via `createRecord` |

---

### 3.3 `lib/domain/musicas.js`

**Localização:** `/lib/domain/musicas.js`

**Propósito:** Camada de domínio para operações com músicas. CRUD completo com paginação e busca.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getAllMusicas(search)` | Lista todas as músicas com busca opcional por título/artista (ILIKE) |
| `getPaginatedMusicas(page, limit, search, publishedOnly, sort)` | Lista paginada com filtro de publicação e ordenação (default, recent, alpha) |
| `createMusica(musica, options)` | Cria nova música com `raw('CURRENT_TIMESTAMP')` para `created_at` e posição automática |
| `updateMusica(id, musica, options)` | Atualiza música com `raw('CURRENT_TIMESTAMP')` para `updated_at`. Aceita atualizações parciais |
| `deleteMusica(id, options)` | Remove música por ID |

**Observações:** Ordenação padrão: `position ASC, created_at DESC`. Suporta busca em `titulo` e `artista`. Retorna alias `musicas` e `data` para compatibilidade com `AdminCrudBase`.

---

### 3.4 `lib/domain/permissions.js`

**Localização:** `/lib/domain/permissions.js`

**Propósito:** Lista imutável de permissões disponíveis para atribuição a cargos de administrador.

**Exportação:**

| Exportação | Descrição |
|------------|-----------|
| `permissionsList` | Array congelado (`Object.freeze`) com 10 permissões: Visão Geral, Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Gestão de Dicas, Configuração de Cabeçalho, Segurança, Usuários, Auditoria |

---

### 3.5 `lib/domain/posts.js`

**Localização:** `/lib/domain/posts.js`

**Propósito:** Camada de domínio para operações com posts do blog. CRUD completo com paginação, busca e log de auditoria.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getRecentPosts(limit, page, search)` | Posts publicados com paginação e full-text search (tsvector em português) |
| `getAllPosts()` | Todos os posts (incluindo rascunhos) para admin |
| `getPaginatedPosts(page, limit, search)` | Posts paginados para admin com busca por título |
| `createPost(post, options)` | Cria novo post com `raw('CURRENT_TIMESTAMP')` |
| `updatePost(id, post, options)` | Atualiza post com `raw('CURRENT_TIMESTAMP')`. Aceita atualizações parciais |
| `deletePost(id, options)` | Remove post |
| `createPostWithAudit(postData, auditData)` | Cria post e registra auditoria em uma única transação |

**Observações:** `getRecentPosts` usa full-text search (`tsvector`) em português. `createPostWithAudit` demonstra o padrão de transação combinando duas operações. Os campos opcionais usam `?? null` para segurança.

---

### 3.6 `lib/domain/products.js`

**Localização:** `/lib/domain/products.js`

**Propósito:** Camada de domínio para operações com produtos. CRUD completo com paginação e formatação de moeda.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedProducts(page, limit, filters)` | Produtos públicos paginados com filtros (search, minPrice, maxPrice) e formatação para Real (R$) |
| `getAllProducts(page, limit)` | Todos os produtos paginados (admin) |
| `createProduct(data)` | Cria novo produto com posição automática |
| `updateProduct(id, data)` | Atualiza produto. Lança `NO_DATA_TO_UPDATE` se nenhum campo fornecido |
| `deleteProduct(id)` | Remove produto pelo ID |

**Observações:** Aceita os campos `published` e `publicado` no update (dualidade de nomenclatura). Os preços são formatados com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

---

### 3.7 `lib/domain/settings.js`

**Localização:** `/lib/domain/settings.js`

**Propósito:** Gerenciamento de configurações dinâmicas do sistema armazenadas na tabela `settings`.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getSetting(key, defaultValue)` | Retorna valor de uma configuração específica |
| `getSettings()` | Retorna todas as configurações como objeto chave-valor (agregado via `json_object_agg` do PostgreSQL) |
| `updateSetting(key, value, type, description)` | Cria ou atualiza configuração (upsert) |
| `setSetting(key, value, type, description)` | Alias para `updateSetting` |
| `getAllSettingsRaw()` | Retorna todas as configurações como array bruto de registros |
| `getAllSettings()` | Alias para `getAllSettingsRaw` (compatibilidade) |

---

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

**Observações:** Executa duas queries em paralelo via `Promise.all`. O termo de busca é normalizado com `.toLowerCase().trim()`.

---

### 3.9 `lib/domain/videos.js`

**Localização:** `/lib/domain/videos.js`

**Propósito:** Camada de domínio para operações com vídeos. CRUD completo com paginação, busca e reordenação.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedVideos(page, limit, search, publishedOnly, orderBy)` | Vídeos paginados com filtro de publicação |
| `getPublicPaginatedVideos(page, limit, search, orderBy)` | Alias com `publishedOnly=true` |
| `createVideo(videoData, options)` | Cria novo vídeo com cálculo de posição dentro de transação |
| `updateVideo(id, videoData)` | Atualiza vídeo |
| `deleteVideo(id)` | Remove vídeo |
| `reorderVideos(items)` | Reordena vídeos em transação com `Promise.allSettled` para tratamento de erro parcial |

**Observações:** O cálculo de posição em `createVideo` ocorre dentro de uma transação para evitar race condition. `reorderVideos` loga o ID e posição exatos de cada item que falhou e relança o erro para acionar rollback.

---

## 4. Subpasta `lib/seo/`

### 4.1 `lib/seo/config.js`

**Localização:** `/lib/seo/config.js`

**Propósito:** Centralização de todas as configurações de SEO do site "O Caminhar com Deus".

**Configurações:**

| Seção | Conteúdo |
|-------|----------|
| `siteConfig` | Nome, descrição, URL, idioma (pt-BR), fuso horário |
| `siteConfig.social` | URLs de redes sociais (Twitter, Facebook, Instagram, YouTube, Spotify) |
| `siteConfig.sections` | Definições das seções (blog, musicas, videos) com nome, descrição e slug |
| `siteConfig.seo.noindexPaths` | Padrões de URL para não indexar (admin, api, _next, 404, 500) |
| `siteConfig.seo.sitemap` | Frequência e prioridade por seção |
| `siteConfig.seo.ogImage` | Dimensões padrão do Open Graph (1200x630) |
| `siteConfig.organization` | Schema.org Organization (JSON-LD) |
| `siteConfig.website` | Schema.org WebSite com SearchAction |

**Funções utilitárias:**

| Função | Descrição |
|--------|-----------|
| `getCanonicalUrl(path)` | Gera URL canônica completa |
| `getImageUrl(imagePath)` | Resolve URL absoluta de imagem |
| `formatSchemaDate(date)` | Formata data para ISO 8601 |
| `truncateDescription(text, maxLength)` | Trunca texto para meta description (padrão: 160 chars) |
| `extractKeywords(tags, max)` | Extrai keywords de tags (padrão: 10) |
| `sanitizeJsonLd(schema)` | Sanitiza JSON-LD prevenindo XSS (escapa `</script>`) |
| `shouldIndex(path)` | Verifica se página deve ser indexada (pattern matching com `/*`) |
| `generateBreadcrumb(items)` | Gera breadcrumb com "Início" fixo |

---

## Resumo dos arquivos

### Arquivos por categoria

| Categoria | Arquivos |
|-----------|----------|
| Infraestrutura / Conexão | `db.js`, `redis.js`, `logger.js` |
| Autenticação e Segurança | `auth.js`, `handleUnauthorized.js` |
| Cache e Performance | `cache.js`, `redis.js` |
| Banco de Dados (CRUD genérico) | `crud.js` |
| Domínio (Entidades) | `domain/audit.js`, `domain/images.js`, `domain/musicas.js`, `domain/posts.js`, `domain/products.js`, `domain/settings.js`, `domain/videos.js`, `domain/permissions.js`, `domain/shared-pagination.js` |
| API (Middleware e Responses) | `api/index.js`, `api/errors.js`, `api/helpers.js`, `api/middleware.js`, `api/response.js`, `api/utils.js`, `api/validate.js`, `api/adminCrudHandler.js` |
| Utilitários de Frontend | `csvExport.js`, `reorder.js`, `spotify.js`, `youtube.js` |
| SEO | `seo/config.js` |

### Arquivos e suas responsabilidades principais

| Arquivo | Responsabilidade Principal |
|---------|---------------------------|
| `auth.js` | Autenticação (JWT + bcrypt + cookies + login com rate limit) |
| `cache.js` | Cache multi-nível (memória + Redis) + rate limit distribuído |
| `crud.js` | Operações SQL genéricas parametrizadas (INSERT, UPDATE, DELETE, UPSERT) |
| `csvExport.js` | Exportação de dados para CSV no navegador |
| `db.js` | Pool PostgreSQL + query + transações + health check |
| `handleUnauthorized.js` | Tratamento de 401 no frontend com toast e reload |
| `logger.js` | Logger leve e padronizado com emojis |
| `redis.js` | Cliente Redis Upstash com fallback em memória |
| `reorder.js` | Reordenação Drag & Drop via API (frontend) |
| `spotify.js` | Extração de IDs do Spotify |
| `youtube.js` | Extração de IDs do YouTube |
| `api/adminCrudHandler.js` | Factory de handlers CRUD para admin |
| `api/errors.js` | Classes de erro customizadas da API |
| `api/helpers.js` | Extração de IP e detecção de spoofing |
| `api/index.js` | Barrel export dos módulos da API |
| `api/middleware.js` | Composição de middlewares (auth, rate limit, CORS, etc.) |
| `api/response.js` | Padronização de respostas JSON da API |
| `api/utils.js` | Utilitários (UUID, metadados, parse de imagens) |
| `api/validate.js` | Validação de entrada com Zod |
| `domain/audit.js` | Log de auditoria |
| `domain/images.js` | Metadados de imagens |
| `domain/musicas.js` | CRUD de músicas |
| `domain/permissions.js` | Lista de permissões de cargos |
| `domain/posts.js` | CRUD de posts |
| `domain/products.js` | CRUD de produtos |
| `domain/settings.js` | Configurações dinâmicas do sistema |
| `domain/shared-pagination.js` | Paginação genérica com busca |
| `domain/videos.js` | CRUD de vídeos |
| `seo/config.js` | Configurações de SEO e Schema.org |