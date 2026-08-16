# Análise da Pasta `lib/`

> **Data da análise:** 01/08/2026
> **Projeto:** O Caminhar com Deus
> **Objetivo:** Documentar de forma objetiva, técnica e organizada todos os arquivos da pasta `lib/` e suas subpastas, descrevendo localização, propósito, funcionalidades e responsabilidades de cada módulo.

---

## Índice

1. [Subpasta `lib/api/`](#1-subpasta-libapi)
   - [1.1 `lib/api/index.js`](#11-libapiindexjs)
   - [1.2 `lib/api/adminCrudHandler.js`](#12-libapiadmincrudhandlerjs)
   - [1.3 `lib/api/errors.js`](#13-libapierrorsjs)
   - [1.4 `lib/api/helpers.js`](#14-libapihelpersjs)
   - [1.5 `lib/api/middleware.js`](#15-libapimiddlewarejs)
   - [1.6 `lib/api/response.js`](#16-libapiresponsejs)
   - [1.7 `lib/api/utils.js`](#17-libapiutilsjs)
   - [1.8 `lib/api/validate.js`](#18-libapivalidatejs)
2. [Subpasta `lib/auth/`](#2-subpasta-libauth)
   - [2.1 `lib/auth/auth.js`](#21-libauthauthjs)
3. [Subpasta `lib/cache/`](#3-subpasta-libcache)
   - [3.1 `lib/cache/cache.js`](#31-libcachecachejs)
4. [Subpasta `lib/crud/`](#4-subpasta-libcrud)
   - [4.1 `lib/crud/crud.js`](#41-libcrudcrudjs)
5. [Subpasta `lib/domain/`](#5-subpasta-libdomain)
   - [5.1 `lib/domain/audit.js`](#51-libdomainauditjs)
   - [5.2 `lib/domain/images.js`](#52-libdomainimagesjs)
   - [5.3 `lib/domain/musicas.js`](#53-libdomainmusicasjs)
   - [5.4 `lib/domain/permissions.js`](#54-libdomainpermissionsjs)
   - [5.5 `lib/domain/posts.js`](#55-libdomainpostsjs)
   - [5.6 `lib/domain/products.js`](#56-libdomainproductsjs)
   - [5.7 `lib/domain/settings.js`](#57-libdomainsettingsjs)
   - [5.8 `lib/domain/shared-pagination.js`](#58-libdomainshared-paginationjs)
   - [5.9 `lib/domain/videos.js`](#59-libdomainvideosjs)
6. [Subpasta `lib/infra/`](#6-subpasta-libinfra)
   - [6.1 `lib/infra/db.js`](#61-libinfradbjs)
   - [6.2 `lib/infra/logger.js`](#62-libinfraloggerjs)
   - [6.3 `lib/infra/redis.js`](#63-libinfraredisjs)
7. [Subpasta `lib/media/`](#7-subpasta-libmedia)
   - [7.1 `lib/media/spotify.js`](#71-libmediaspotifyjs)
   - [7.2 `lib/media/youtube.js`](#72-libmediayoutubejs)
8. [Subpasta `lib/seo/`](#8-subpasta-libseo)
   - [8.1 `lib/seo/config.js`](#81-libseoconfigjs)
9. [Resumo Consolidado](#9-resumo-consolidado)

---

## 1. Subpasta `lib/api/`

Módulo responsável pela padronização da camada de API: classes de erro, respostas JSON consistentes, validação com Zod, composição de middlewares, helpers de IP e a factory de handlers administrativos.

### 1.1 `lib/api/index.js`

**Localização:** `/lib/api/index.js`

**Propósito:** Barrel file — ponto de exportação centralizada dos submódulos da API. Exporta um objeto default com 4 namespaces: `errors`, `response`, `validate`, `middleware`. Os arquivos `adminCrudHandler.js`, `helpers.js` e `utils.js` não são re-exportados pelo barrel pois os consumidores externos os importam diretamente.

**Funcionalidades:**
- `default.errors` — Classes de erro customizadas
- `default.response` — Funções de resposta padronizadas
- `default.validate` — Middlewares de validação Zod
- `default.middleware` — Middlewares de composição

**Observações:** Arquivo simplificado em relação à versão anterior (removidos 47 exports nomeados não consumidos externamente).

---

### 1.2 `lib/api/adminCrudHandler.js`

**Localização:** `/lib/api/adminCrudHandler.js`

**Propósito:** Factory de handlers CRUD para endpoints administrativos. Centraliza todo o boilerplate comum: verificação de método HTTP, autenticação, RBAC, detecção de IP spoofing, rate limiting em mutações, invalidação automática de cache, injeção de utilitários e try/catch unificado com tradução de erros do banco.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `createAdminHandler(config)` | Cria handler Next.js completo a partir de configuração |

**Configuração aceita:**
- `name` — Nome da entidade para logs e rate limit
- `permission` — Permissão(ões) exigida(s) (OR). Ex: `'Posts/Artigos'` ou `['Auditoria', 'Segurança']`
- `requireAdmin` — Se `true`, exige `role === 'admin'` sem consultar a tabela `roles`
- `handlers` — Mapeamento método → handler `{ GET: fn, POST: fn, ... }`
- `rateLimit` — `{ max, window }` aplicado apenas em mutações (POST/PUT/DELETE)
- `cacheKeys` — Chave(s) de cache invalidadas automaticamente após mutação bem-sucedida
- `allowedMethods` — Métodos permitidos (default: GET, POST, PUT, DELETE)

**Ordem de execução do handler:**
1. Verificação de método HTTP → 405 com header `Allow`
2. Verificação de autenticação → 401 se `user` for nulo
3. RBAC via `requireAdmin` → 403 se não for admin
4. RBAC via permissão específica (consulta na tabela `roles`) → 403 se não possuir permissão
5. Detecção de IP spoofing (apenas mutações) → 403 se detectado
6. Rate limiting em mutações → 429 se exceder
7. Execução do handler específico com `req.adminUtils` injetado
8. Invalidação automática de cache em mutações bem-sucedidas (`res.statusCode < 400`)

**Injeções em `req.adminUtils`:**
- `logActivity(action, entityId, description)` — Registra auditoria via `lib/domain/audit.js`
- `invalidateCache(keys?)` — Invalida chaves de cache; usa `cacheKeys` da config se keys for omitido
- `user` — Dados do usuário autenticado
- `ip` — IP confiável extraído via `getClientIP`

**Observações:** O catch centralizado traduz erros comuns do PostgreSQL para português (unique constraint, foreign key, not null). Em caso de falha na tabela `roles`, permite apenas usuários com role `admin`. O handler final é envolvido por `withAuth` de `lib/auth/auth.js`. As respostas de erro deste módulo usam formato próprio `{ error, message }`, divergente do padrão `{ success, error: { code, message }, meta }` usado em `lib/api/response.js` (ver UPGRADE 1.1 e 1.10).

---

### 1.3 `lib/api/errors.js`

**Localização:** `/lib/api/errors.js`

**Propósito:** Classes de erro customizadas da API, cada uma mapeando para um código HTTP e código de erro semântico. Todas herdam de `ApiError` (que estende `Error`) e possuem `toJSON()` para resposta padronizada.

**Classes exportadas:**

| Classe | HTTP | Código | Uso |
|--------|------|--------|-----|
| `ApiError` | — | — | Classe base (requer `statusCode`, `code`, `details`, `meta`) |
| `ValidationError` | 400 | VALIDATION_ERROR | Dados inválidos — aceita `errors` array de `{ field, message }` |
| `AuthenticationError` | 401 | AUTHENTICATION_ERROR | Token ausente/expirado |
| `ForbiddenError` | 403 | FORBIDDEN_ERROR | Permissão insuficiente |
| `NotFoundError` | 404 | NOT_FOUND_ERROR | Recurso não encontrado — formata ID numérico `(id: 123)` e string `'admin'` |
| `MethodNotAllowedError` | 405 | METHOD_NOT_ALLOWED | Método HTTP não permitido — aceita `method` e `allowed` |
| `ConflictError` | 409 | CONFLICT_ERROR | Duplicidade/conflito de dados |
| `RateLimitError` | 429 | RATE_LIMIT_ERROR | Muitas requisições — aceita `retryAfter` |
| `ServerError` | 500 | SERVER_ERROR | Erro interno — aceita `originalError` para logging |
| `ServiceUnavailableError` | 503 | SERVICE_UNAVAILABLE | Serviço temporariamente fora — sobrescreve `toJSON()` para incluir `retryAfter` no meta |

**Funcionalidades comuns:**
- `toJSON()` — Formato padronizado `{ success: false, error: { code, message, details? }, meta: { timestamp, requestId, ...meta } }`
- Gera `requestId` via `generateUUID` de `utils.js`
- Mantém stack trace via `Error.captureStackTrace`

---

### 1.4 `lib/api/helpers.js`

**Localização:** `/lib/api/helpers.js`

**Propósito:** Helpers compartilhados para endpoints da API — extração segura de IP do cliente e detecção de tentativas de IP spoofing.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getClientIP(req, options)` | Extrai o IP real do cliente. Se `trustProxy: true`, confia no header `x-forwarded-for`; caso contrário, usa `req.socket.remoteAddress` (não falsificável pelo cliente). Normaliza `::1` para `127.0.0.1`. Fallback final garantido para `127.0.0.1` |
| `detectSpoofedIP(req)` | Compara o IP do socket com o header `x-forwarded-for` para detectar discrepância. Retorna `{ isSpoofed, socketIP, forwardedIP }`. Considera socket localhost como não-spoofing (comportamento normal do Next.js em dev). Detecta spoofing quando socket é privado e forwarded é público, ou quando socket é público e forwarded difere |

**Função interna:** `normalizeIP(ip)` — normaliza `::1` → `127.0.0.1` e `::ffff:x.x.x.x` → `x.x.x.x` (IPv4-mapped IPv6).

**Observações:** Usado pelo `adminCrudHandler.js` para extração de IP confiável (sem `trustProxy` = usa socket diretamente, prevenindo spoofing via header) e detecção de spoofing. A lógica de `detectSpoofedIP` é elaborada com múltiplos cenários (ver UPGRADE item 6.4).

---

### 1.5 `lib/api/middleware.js`

**Localização:** `/lib/api/middleware.js`

**Propósito:** Sistema de composição de middlewares para APIs Next.js. Único módulo de middlewares do projeto. Compõe autenticação, validação, rate limiting, CORS, cache, timeout e logging.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `composeMiddleware(...middlewares)` | Compõe middlewares da esquerda para direita via `reduceRight` |
| `withMethod(allowedMethods)` | Restringe métodos HTTP → 405 se não permitido |
| `withAuth(options)` | Autenticação com `roles` opcionais; usa `getAuthToken`/`verifyToken` de `lib/auth/auth.js`; adiciona `req.user`; loga `warn` em acesso sem token ou com token inválido |
| `withOptionalAuth()` | Autenticação opcional — não bloqueia anônimos, apenas popula `req.user` se token válido |
| `withRateLimit(options)` | Rate limit via `checkRateLimit` de `lib/cache/cache.js`. Suporta `maxRequests` como função dinâmica. Em produção, alerta se Redis não estiver disponível |
| `withCors(options)` | CORS configurável. Em produção usa `ALLOWED_ORIGINS` (env); em dev usa `['*']`. Responde preflight OPTIONS |
| `withErrorHandler(options)` | Captura erros e delega para `handleError` de `response.js`. Opção `includeStack` para desenvolvimento |
| `withLogger(options)` | Logging de requisições com duração — sobrescreve `res.end` para capturar finalização |
| `withTimeout(timeoutMs)` | Timeout de requisição (default 10s) — responde 500 se exceder |
| `withBodyParser(options)` | Valida tamanho do body (default 1MB) |
| `withCache(maxAge)` | Adiciona header `Cache-Control: public, max-age` apenas para GET |
| `publicApi(handler, options)` | Combinação pronta para APIs públicas: CORS + erro + rate limit + logger + método GET |
| `protectedApi(handler, options)` | Combinação pronta para APIs autenticadas: CORS + erro + rate limit + logger + método + auth |

**Observações:** A extração de IP no `withRateLimit` é feita inline (`req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'`) em vez de usar `getClientIP` de `helpers.js` (ver UPGRADE item 4.6). O header `X-RateLimit-Remaining` retorna texto informativo em vez de número real (ver UPGRADE 1.5). `withBodyParser` retorna 500 em vez do código 413 correto para payload grande (ver UPGRADE 1.3). O `withErrorHandler` usa `console.error` em vez do `logger` estruturado (ver UPGRADE 1.4).

---

### 1.6 `lib/api/response.js`

**Localização:** `/lib/api/response.js`

**Propósito:** Padronização de todas as respostas da API. Funções factory para respostas de sucesso e erro, garantindo formato JSON consistente em todos os endpoints.

**Respostas de Sucesso:**

| Função | HTTP | Descrição |
|--------|------|-----------|
| `success(res, data, meta)` | 200 | Resposta padrão `{ success, data, meta }` |
| `paginated(res, data, pagination, meta)` | 200 | Lista paginada com `pagination: { page, limit, total, totalPages, hasNext, hasPrev }` |
| `created(res, data, location, meta)` | 201 | Recurso criado, com header `Location` opcional |
| `accepted(res, data, meta)` | 202 | Requisição aceita para processamento assíncrono |
| `noContent(res)` | 204 | Sem conteúdo |
| `updated(res, data, meta)` | 200/204 | Recurso atualizado — 204 se `data` for `null` |
| `deleted(res, data, meta)` | 200/204 | Recurso deletado — 204 se `data` for `null` |

**Respostas de Erro:**

| Função | HTTP | Descrição |
|--------|------|-----------|
| `badRequest(res, message, errors, meta)` | 400 | Requisição inválida |
| `validationError(res, message, errors, meta)` | 400 | Erro de validação |
| `unauthorized(res, message, meta)` | 401 | Não autenticado + header `WWW-Authenticate: Bearer` |
| `forbidden(res, message, meta)` | 403 | Acesso negado |
| `notFound(res, resource, identifier, meta)` | 404 | Recurso não encontrado — formata ID como `(id: 123)` ou `'admin'` |
| `methodNotAllowed(res, method, allowed, meta)` | 405 | Método não permitido + header `Allow` |
| `conflict(res, message, meta)` | 409 | Conflito de dados |
| `tooManyRequests(res, message, retryAfter, meta)` | 429 | Rate limit excedido + header `Retry-After` |
| `serverError(res, message, meta)` | 500 | Erro interno do servidor |
| `serviceUnavailable(res, message, retryAfter, meta)` | 503 | Serviço indisponível + header/`meta.retryAfter` |
| `handleError(res, error, includeStack)` | — | Tratamento genérico: usa `error.toJSON()` se existir; caso contrário, infere `statusCode` e código a partir do `name` do erro. Inclui `stack` se `includeStack` |

**Observações:** Todas as respostas incluem `meta.timestamp` e `meta.requestId` via `generateMeta` de `utils.js`. Formato de erro padrão: `{ success: false, error: { code, message, details? }, meta }`.

---

### 1.7 `lib/api/utils.js`

**Localização:** `/lib/api/utils.js`

**Propósito:** Utilitários compartilhados entre os módulos da API, eliminando duplicação de código.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `generateUUID()` | Gera UUID v4 simples (Math.random) para rastreamento de requisições |
| `generateMeta(customMeta)` | Gera metadados padrão `{ timestamp, requestId, ...customMeta }` |
| `parseImages(imagesString)` | Transforma string de URLs separadas por quebra de linha em array de URLs limpas (trim + filter). Não valida formato URL nem remove duplicatas (ver UPGRADE 6.3) |

---

### 1.8 `lib/api/validate.js`

**Localização:** `/lib/api/validate.js`

**Propósito:** Middlewares de validação de dados de entrada usando Zod. Garante que body, query, params e headers estejam no formato correto antes do processamento.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `validateBody(schema)` | Valida body em POST/PUT/PATCH; atribui `req.body` com dados parseados |
| `validateQuery(schema)` | Valida query parameters; atribui `req.query` |
| `validateParams(schema)` | Valida parâmetros de rota dinâmica — extrai APENAS as chaves do schema do `req.query` (Next.js mistura route params e query strings) |
| `validateHeaders(schema)` | Valida headers com normalização case-insensitive |
| `validateRequest(schemas)` | Valida body + query + params combinados, coletando todos os erros de uma vez (usa `safeParse`) com campo `location` |
| `formatZodErrors(zodError)` | Converte erros do Zod para `[{ field, message, code }]` |
| `createPaginationSchema(options)` | Helper — schema para `page`/`limit` com transform de string para número, clamp de limite |
| `createSearchSchema(options)` | Helper — schema para `search` com min/max length |

**Observações:** Usa verificação `error.issues` (mais robusta que `instanceof`) para detectar erros do Zod. Loga erros inesperados via `logger` de `lib/infra/logger.js`. Os helpers de schema convertem strings de query para números automaticamente.

---

## 2. Subpasta `lib/auth/`

### 2.1 `lib/auth/auth.js`

**Localização:** `/lib/auth/auth.js`

**Propósito:** Sistema completo de autenticação do projeto. Gerencia hash de senhas (bcryptjs), tokens JWT, cookies de autenticação, login com rate limiting, refresh tokens com rotação e inicialização do admin padrão.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `hashPassword(password)` | Aplica hash bcrypt com 10 rounds de salt |
| `verifyPassword(password, hashedPassword)` | Compara senha com hash armazenado |
| `generateToken(user)` | Gera JWT com `userId`, `username`, `role` e expiração de 1h |
| `verifyToken(token)` | Verifica e decodifica JWT; retorna `null` se inválido (registra o tipo da falha em nível `debug`, sem conteúdo do token) |
| `setAuthCookie(res, token, options)` | Define cookie `httpOnly` com o token. Usa `res.appendHeader` para não sobrescrever outros cookies |
| `getAuthCookie(req)` | Extrai token do cookie da requisição |
| `getAuthToken(req)` | Extrai token do header `Authorization: Bearer` ou do cookie (fallback) |
| `authenticate(username, password)` | Autentica usuário contra o banco de dados |
| `authenticateAndGenerateToken(username, password, ip, options)` | Login completo: valida campos, aplica rate limit (5 tentativas/min), autentica, atualiza `last_login_at`, busca permissões do cargo, gera access token + refresh token. Em sucesso retorna `{ user, token, refreshToken, permissionsLoaded, error }` — `refreshToken` vem `null` quando o armazenamento do refresh token falhar e `permissionsLoaded` vem `false` quando a consulta de permissões falhar |
| `storeRefreshToken(userId, refreshToken)` | Armazena refresh token no banco com expiração de 30 dias |
| `validateRefreshToken(refreshToken)` | Valida refresh token no banco (não revogado e não expirado) |
| `revokeRefreshToken(refreshToken)` | Revoga um refresh token específico |
| `revokeAllUserRefreshTokens(userId)` | Revoga todos os refresh tokens de um usuário |
| `refreshAccessToken(refreshToken)` | Renovação completa com rotação: valida, revoga token atual, gera novo par e retorna `{ accessToken, refreshToken, user }` |
| `setRefreshTokenCookie(res, token, options)` | Define cookie httpOnly com refresh token, path restrito a `/api/auth/refresh`, sameSite Strict |
| `getRefreshTokenCookie(req)` | Extrai refresh token do cookie |
| `withAuth(handler)` | Middleware que protege handlers exigindo token JWT válido; loga `warn` em acesso sem token ou com token inválido |
| `initializeAuth()` | Cria tabela `users` e `refresh_tokens` (se não existirem), migra coluna `role`, cria admin via variáveis de ambiente, cria índices |

**Observações:**
- `JWT_SECRET` é obrigatório fora dos ambientes `development`/`test` — sem ele, lança erro. Nesses dois ambientes, gera chave derivada via `createHash('sha256')` a partir do ambiente local.
- Funcionalidades de cookies (`parseCookie`, `serializeCookie`) são implementações manuais sem dependência externa (ver UPGRADE 6.7).
- `initializeAuth` executa DDL (`CREATE TABLE`, `ALTER TABLE`) diretamente no código — importante garantir que `scripts/migrations/` seja a fonte canônica de schema.
- Os parâmetros `ADMIN_USERNAME` e `ADMIN_PASSWORD` são obrigatórios para a inicialização.
- O `withAuth` deste módulo retorna `{ message }` simples, divergente do formato padronizado da API (ver UPGRADE 1.10).

---

## 3. Subpasta `lib/cache/`

### 3.1 `lib/cache/cache.js`

**Localização:** `/lib/cache/cache.js`

**Propósito:** Camada de cache com dois níveis (L1: memória local, L2: Redis Upstash) com fallback completo e sistema de rate limit distribuído. Implementa padrão Cache-Aside com Single-Flight (request coalescing).

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getOrSetCache(key, fetchFunction, ttlSeconds)` | Cache-Aside: memória L1 → Redis L2 → fetch. TTL padrão 1h. Serializa dados uma única vez e reutiliza para Redis e memória |
| `invalidateCache(keyPattern)` | Invalida por chave exata ou padrão com `*` (usa SCAN no Redis). Sempre limpa também do cache em memória |
| `clearAllCache(options)` | FLUSHDB com proteção — requer `{ confirm: true }`. Retorna `{ success, error? }` |
| `checkRateLimit(ip, endpoint, limit, windowMs)` | Rate limit via Redis INCR+EXPIRE com fallback em Map local. Contadores sob `rate_limit:${endpoint}:${ip}` (namespace único `rate_limit:*`, alinhado às chaves de whitelist/auditoria). Aceita `limit` como função. Whitelist para localhost e redes privadas |
| `getCacheMetrics()` | Métricas: hits/misses/erros Redis e memória, tamanhos dos maps, status Redis, single-flight hits |
| `cleanupRateLimitTimer()` | Limpa o timer de safety net (uso em testes) |
| `clearAppMemoryCache()` | Limpa cache de aplicação em memória (uso em testes) |

**Mecanismos internos:**

| Mecanismo | Descrição |
|-----------|-----------|
| **Single-Flight** | Múltiplas chamadas concorrentes para a mesma chave aguardam a mesma promise (`inflightPromises`), evitando N buscas simultâneas no banco |
| **Lazy eviction** | Entradas expiradas do Map de rate limit e do cache de aplicação são removidas sob demanda no acesso |
| **Safety net** | `setInterval` de 60s que só atua se o Map exceder 5000 entradas (rate limit) ou 2000 (cache app), removendo seletivamente. Não criado em ambiente de teste |
| **Whitelist rate limit** | IPs locais (`127.0.0.1`, `::1`, `localhost`, IPv4-mapped) e redes privadas (10.x, 172.16-31.x, 192.168.x) nunca são rate-limited |

**Observações:** Design tolerante a falhas: o sistema nunca quebra por indisponibilidade do Redis. O `checkRateLimit` tem try/catch externo que retorna `false` (nunca bloqueia por engano) em caso de erro inesperado. Métricas acumulam entre cenários de teste sem função de reset (ver UPGRADE 1.9). A whitelist dinâmica de IPs privados testa o `ip` original, não o normalizado — `::ffff:192.168.x.x` pode escapar da whitelist privada (ver UPGRADE 1.8).

---

## 4. Subpasta `lib/crud/`

### 4.1 `lib/crud/crud.js`

**Localização:** `/lib/crud/crud.js`

**Propósito:** Operações CRUD genéricas parametrizadas para qualquer tabela do banco. Centraliza toda a construção SQL, evitando repetição nas camadas de domínio. Inclui validação de schema por tabela e proteção contra SQL injection.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `raw(value)` | Marca valor como expressão SQL bruta (ex: `CURRENT_TIMESTAMP`). Usa Symbol para evitar uso acidental |
| `createRecord(table, data, options)` | INSERT com `RETURNING` customizável. Suporta transação via `options.client` |
| `updateRecords(table, data, where, options)` | UPDATE dinâmico com WHERE parametrizado |
| `deleteRecords(table, where, options)` | DELETE com RETURNING (default: `id`) |
| `upsertRecord(table, insertData, conflictTarget, updateData, options)` | INSERT ... ON CONFLICT (campo) DO UPDATE |

**Funções internas:**
- `_filterAllowedFields(table, data)` — Filtra campos do objeto permitindo apenas os do schema da tabela (mapa `tableSchemas`). Campos não permitidos são ignorados com warning
- `_validateIdentifier(identifier)` — Valida nomes de tabela/coluna com regex `[a-zA-Z0-9_]` para prevenir SQL injection
- `_buildSetClause(data, startingIndex)` — Constrói cláusulas SET com placeholders parametrizados
- `_buildInsertClauseParts(data, startingIndex)` — Constrói campos e placeholders para INSERT

**Tabelas com schema definido:** `musicas`, `posts`, `videos`, `settings`, `images`, `categories`, `tags`, `post_categories`, `post_tags`, `audit_log`, `roles`, `users`, `dicas`, `products`.

**Observações:** Toda construção SQL é parametrizada. Nomes de tabelas/colunas são validados contra injeção. `raw()` permite funções SQL sem parametrização (uso consciente). Tabelas não mapeadas no schema operam sem filtro para compatibilidade. O mapa `tableSchemas` centraliza os campos válidos — qualquer alteração de schema no banco deve ser refletida aqui.

---

## 5. Subpasta `lib/domain/`

Camada de domínio: funções específicas por entidade de negócio, construídas sobre o CRUD genérico e o acesso ao banco.

### 5.1 `lib/domain/audit.js`

**Localização:** `/lib/domain/audit.js`

**Propósito:** Registro de log de auditoria na tabela `activity_logs`, rastreando ações dos usuários (CREATE, UPDATE, DELETE).

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `logActivity(username, action, entityType, entityId, details, ipAddress, options)` | Insere registro via SQL parametrizado. Suporta transação via `options.client`. Usa `log: false` (não gera log da própria operação) |

---

### 5.2 `lib/domain/images.js`

**Localização:** `/lib/domain/images.js`

**Propósito:** Persistência de metadados de imagens na tabela `images`, com validação via Zod antes do banco.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `saveImage(filename, relativePath, type, fileSize, userId, options)` | Valida com `imageSchema` (Zod) e salva via `createRecord('images', ...)`. Suporta `options` (ex: `{ client }`) |

**Schema de validação:** `filename` (string obrigatória), `path` (string obrigatória), `type` (string obrigatória), `size` (número inteiro positivo obrigatório), `user_id` (número positivo, nullable).

---

### 5.3 `lib/domain/musicas.js`

**Localização:** `/lib/domain/musicas.js`

**Propósito:** Camada de domínio para operações com músicas — CRUD completo com paginação e busca.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getAllMusicas(search)` | Lista todas as músicas com busca opcional por título/artista (ILIKE). Ordena por `position ASC, created_at DESC` |
| `getPaginatedMusicas(page, limit, search, publishedOnly, sort)` | Lista paginada via `paginate()` do `shared-pagination.js`. Aceita `sort`: `default` (position), `recent` (created_at), `alpha` (titulo). Retorna `{ musicas, data, pagination }` |
| `createMusica(musica, options)` | Cria música via `transaction()`. Calcula `MAX(position)` + 1 dentro da transação (evita race condition). Usa `raw('CURRENT_TIMESTAMP')` para `created_at` |
| `updateMusica(id, musica, options)` | Atualização parcial — só inclui campos explicitamente fornecidos. Adiciona `updated_at: raw('CURRENT_TIMESTAMP')` condicionalmente |
| `deleteMusica(id, options)` | Remove música pelo ID |

**Observações:** `getPaginatedMusicas` retorna tanto `musicas` quanto `data` (alias) para compatibilidade com `AdminCrudBase` — duplicidade intencional no payload (ver UPGRADE 1.11). A busca usa ILIKE com campos `titulo` e `artista`.

---

### 5.4 `lib/domain/permissions.js`

**Localização:** `/lib/domain/permissions.js`

**Propósito:** Lista imutável de permissões disponíveis para cargos administrativos.

**Exportação:**
- `permissionsList` — Array congelado (`Object.freeze`) com: `'Visão Geral'`, `'Posts/Artigos'`, `'Gestão de Músicas'`, `'Gestão de Vídeos'`, `'Gestão de Produtos'`, `'Gestão de Dicas'`, `'Configuração de Cabeçalho'`, `'Segurança'`, `'Usuários'`, `'Auditoria'`.

**Observações:** Usado por componentes administrativos (checkboxes de permissões) e pelo RBAC do `adminCrudHandler.js`.

---

### 5.5 `lib/domain/posts.js`

**Localização:** `/lib/domain/posts.js`

**Propósito:** Camada de domínio para operações com posts do blog — CRUD completo com paginação, busca full-text e auditoria transacional.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getRecentPosts(limit, page, search)` | Posts publicados com full-text search (`tsvector` em português via `to_tsvector` + `plainto_tsquery`) |
| `getAllPosts()` | Todos os posts (incluindo rascunhos) para admin, ordenados por `created_at DESC` |
| `getPaginatedPosts(page, limit, search)` | Posts paginados para admin (sem filtro de publicação), busca ILIKE no título |
| `createPost(post, options)` | Cria post com null safety (`excerpt`, `image_url`, `published`, `position`) |
| `updatePost(id, post, options)` | Atualização parcial — só inclui campos fornecidos. Adiciona `updated_at` condicionalmente |
| `deletePost(id, options)` | Remove post por ID |
| `createPostWithAudit(postData, auditData)` | Cria post + registra log de auditoria na mesma transação |

**Observações:** `getRecentPosts` usa busca semântica em português (`plainto_tsquery('portuguese', ...)`) — o único módulo com full-text search. `createPostWithAudit` demonstra o padrão de transação multi-operação. A ordenação da listagem pública é a padrão de `paginate()`.

---

### 5.6 `lib/domain/products.js`

**Localização:** `/lib/domain/products.js`

**Propósito:** Camada de domínio para operações com produtos — CRUD completo com paginação, filtros e formatação de moeda.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedProducts(page, limit, filters)` | Produtos públicos paginados. Filtros: `search` (nome/descrição), `minPrice`, `maxPrice`. Formata `formatted_price` (R$) via `Intl.NumberFormat('pt-BR')` |
| `getAllProducts(page, limit)` | Todos os produtos paginados (admin). Formata preço igualmente |
| `createProduct(data)` | Cria produto com cálculo automático de `MAX(position)` + 1 — **fora** de transação (ver UPGRADE 2.2) |
| `updateProduct(id, data)` | Atualização parcial — só inclui campos fornecidos. Adiciona `updated_at` condicionalmente. Lança `NO_DATA_TO_UPDATE` se vazio |
| `deleteProduct(id)` | Remove produto por ID |

**Observações:** Este módulo **não** utiliza `shared-pagination.js` — a paginação é implementada inline com queries manuais (ver UPGRADE 2.1). `createProduct` não aceita `options` (inconsistente com `createMusica`, `createVideo`, `createPost` — ver UPGRADE 2.2). A formatação de moeda é duplicada entre `getPaginatedProducts` e `getAllProducts` (ver UPGRADE 2.4).

---

### 5.7 `lib/domain/settings.js`

**Localização:** `/lib/domain/settings.js`

**Propósito:** Gerenciamento de configurações dinâmicas do sistema na tabela `settings`.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getSetting(key, defaultValue)` | Retorna valor de uma configuração específica ou default. Usa `log: false` |
| `getSettings()` | Retorna todas as configurações como objeto chave-valor. Otimizado com `json_object_agg` do PostgreSQL (sem loop em JS) |
| `updateSetting(key, value, type, description)` | Upsert (`INSERT ... ON CONFLICT (key) DO UPDATE`) via `upsertRecord`. Adiciona `updated_at: raw('CURRENT_TIMESTAMP')` |
| `getAllSettingsRaw()` | Retorna todos os registros como array bruto, ordenados por `key ASC` |

**Observações:** `getSetting` retorna o valor armazenado que "geralmente é JSON" — sem garantia de tipo (ver UPGRADE 6.5). Os aliases antigos `setSetting` e `getAllSettings` foram removidos.

---

### 5.8 `lib/domain/shared-pagination.js`

**Localização:** `/lib/domain/shared-pagination.js`

**Propósito:** Helper compartilhado de paginação com busca textual. Centraliza a lógica que antes estava duplicada em `musicas.js`, `videos.js` e `posts.js`.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `paginate(tableName, params)` | Executa paginação com busca em paralelo (COUNT + dados via `Promise.all`). Parâmetros: `page`, `limit`, `search`, `publishedOnly`, `publishedField`, `orderBy`, `searchOptions` |

**Estratégias de busca:**
- **ILIKE** (`searchOptions.fields`): Para músicas (`titulo`, `artista`) e vídeos (`titulo`, `descricao`). Usa `%termo%` com `ILIKE` e índice trigram
- **tsvector** (`searchOptions.tsvector`): Para posts com full-text search em português (`plainto_tsquery`)

**SELECT otimizado para listagens públicas:** O mapa `PUBLIC_SELECT_FIELDS` define colunas específicas por tabela (`posts`, `musicas`, `videos`, `dicas`) quando `publishedOnly=true`, evitando `SELECT *` (exclui colunas pesadas como `content`). Para `dicas`, o mapa usa campo `name` (não `title`).

**Observações:** O nome da tabela é interpolado diretamente no SQL sem validação de identificador (ver UPGRADE 6.1). O termo de busca é normalizado com `.toLowerCase().trim()` em ambos os modos.

---

### 5.9 `lib/domain/videos.js`

**Localização:** `/lib/domain/videos.js`

**Propósito:** Camada de domínio para operações com vídeos — CRUD completo com paginação, busca, reordenação e filtro de publicação.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedVideos(page, limit, search, publishedOnly, orderBy)` | Videos paginados via `paginate()`. Busca ILIKE em `titulo` e `descricao` |
| `getPublicPaginatedVideos(page, limit, search, orderBy)` | Alias para `getPaginatedVideos` com `publishedOnly=true` |
| `createVideo(videoData, options)` | Cria vídeo via `transaction()` — cálculo de `MAX(position)` + INSERT atômico. Aceita `options` repassado ao `createRecord` |
| `updateVideo(id, videoData, options)` | Atualização parcial — só inclui campos fornecidos. Adiciona `updated_at` condicionalmente. Aceita `options` |
| `deleteVideo(id)` | Remove vídeo por ID |
| `reorderVideos(items)` | Reordena posições em transação. Usa `Promise.allSettled` para capturar falhas parciais, loga cada `id`/`position` que falhou e relança erro para acionar ROLLBACK |

**Observações:** `deleteVideo` não aceita `options` (inconsistente com `updateVideo` e os demais módulos). `reorderVideos` é o único módulo de domínio com função de reordenação — `musicas`, `posts` e `products` não possuem (ver UPGRADE 2.5).

---

## 6. Subpasta `lib/infra/`

Módulos de infraestrutura: conexão com banco, logging estruturado e cache distribuído.

### 6.1 `lib/infra/db.js`

**Localização:** `/lib/infra/db.js`

**Propósito:** Gerenciamento da conexão com PostgreSQL via `pg.Pool`. Fornece a função `query` principal e utilitários de transação, health check e informações do banco.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `getPool()` | Obtém/cria o pool de conexões (lazy initialization) |
| `query(text, params, options)` | Executa SQL parametrizado. Opções: `log` (query logging em dev), `throwOnError`, `client` (transação). Retry automático (máx. 2) para erros de timeout/rede. Loga `{ code, message, query, duration, attempt }` em erro |
| `transaction(callback)` | Executa callback com BEGIN/COMMIT/ROLLBACK automático. `callback` recebe o `client` |
| `healthCheck()` | Verifica conectividade (`SELECT 1`) |
| `getDatabaseInfo()` | Retorna versão, conexões ativas e tamanho do banco |
| `closeDatabase()` | Fecha o pool e limpa health check timer |
| `resetPool()` | Reseta o pool (uso em testes) — desativa timers, remove listeners, fecha pool antigo |

**Configurações do pool:** `max: 50`, `min: 5`, `idleTimeoutMillis: 60000`, `connectionTimeoutMillis: 15000`. SSL habilitado em produção (`rejectUnauthorized: false`).

**Mecanismos internos:**
- **Lazy initialization** — pool criado apenas no primeiro uso, garantindo compatibilidade com Jest mocks
- **Health check periódico** — a cada 60s, verifica conectividade e recria o pool em caso de falha. Não inicia em ambiente de teste
- **Handler de erro fatal** — em caso de erro no pool, fecha o pool defeituoso e reseta a referência para recriação na próxima query
- **Pré-aquecimento** — no startup (não em teste), conecta uma vez com `SELECT 1` após 100ms

**Observações:** Re-exports removidos — importe diretamente dos módulos de origem (`crud.js`, `domain/settings.js`, `domain/audit.js`, `domain/posts.js`). O `max: 50` pode ser alto para ambientes limitados (ver UPGRADE 3.1).

---

### 6.2 `lib/infra/logger.js`

**Localização:** `/lib/infra/logger.js`

**Propósito:** Logger estruturado e padronizado para todo o projeto. Níveis hierárquicos configuráveis, saída JSON em produção, correlação via `requestId` e transports plugáveis.

**Exportações:**

| Exportação | Descrição |
|------------|-----------|
| `logger.info(module, message, ...args)` | Log informativo |
| `logger.success(module, message, ...args)` | Log de sucesso (alias de `info` para nível) |
| `logger.warn(module, message, ...args)` | Log de aviso |
| `logger.error(module, message, ...args)` | Log de erro |
| `logger.debug(module, message, ...args)` | Log de debug |
| `setRequestId(id)` | Define `requestId` no contexto assíncrono atual (via `AsyncLocalStorage`) |
| `runWithRequestId(id, fn)` | Executa `fn` com `requestId` no contexto; descartado ao finalizar |

**Níveis configuráveis:** `LOG_LEVEL` aceita `error`, `warn`, `info` ou `debug`. Default por `NODE_ENV`: `error` (teste), `info` (produção), `debug` (desenvolvimento).

**Saída JSON em produção:** Em `NODE_ENV=production`, cada log é linha JSON com `{ timestamp, level, module, message, requestId?, args? }`. Em desenvolvimento/teste, formato legível com emojis (ℹ️ ✅ ⚠️ ❌ 🔍).

**Transports:**
- **Console** — sempre ativo
- **Arquivo** — opcional via `LOG_FILE_PATH`, com rotação simples a 10 MB (renomeia para `.1`)

**Sanitização:** `Error` → `{ name, message, stack }`; objetos circulares tratados via replacer com `WeakSet`; limite de profundidade (10 níveis); funções/símbolos serializados com descrição.

**Observações:** Implementação nativa sem dependências externas (`node:async_hooks`, `node:fs`). Contrato `logger.<method>(module, message, ...args)` preservado para compatibilidade com os consumidores existentes.

---

### 6.3 `lib/infra/redis.js`

**Localização:** `/lib/infra/redis.js`

**Propósito:** Inicialização segura do cliente Redis Upstash com validação de configuração e fallback em memória. Inicialização lazy para evitar duplicidade em contextos separados do Next.js.

**Exportações:**

| Exportação | Descrição |
|------------|-----------|
| `redis` | Sempre `null` — use `getRedisInstance()` |
| `getRedisInstance()` | Retorna instância Redis, inicializando sob demanda (lazy, apenas uma vez) |
| `redisGet(key)` | Obtém valor — tenta Redis uma única vez; fallback direto em memória |
| `redisSet(key, value, ttlSeconds)` | Salva valor no Redis com fallback em memória |
| `redisDel(...keys)` | Deleta chave(s) do Redis e da memória; suporta wildcard na memória |
| `redisScan(cursor, options)` | Escaneia chaves no Redis (fallback: `['0', []]`) |
| `redisIncr(key)` | Incrementa chave (rate limit) com fallback em memória |
| `redisExpire(key, seconds, nx?)` | Define expiração em chave |
| `redisFlushdb()` | Executa FLUSHDB e limpa cache em memória. Lança erro se Redis falhar |

**Fluxo de inicialização:**
1. `getRedisInstance()` chama `initializeRedis()` silenciosamente (guard `initializationAttempted`)
2. Prioridade 1: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — valida URL `https://` e token não ser URL (proteção contra variáveis trocadas)
3. Prioridade 2: `REDIS_URL` — loga aviso que `@upstash/redis` não suporta protocolo `redis://`; usa fallback em memória
4. Sem variáveis — fallback em memória

**Observações:** Cache em memória de fallback com lazy cleanup acima de 1000 entradas. Design tolerante a falhas — o app nunca quebra por indisponibilidade do Redis.

---

## 7. Subpasta `lib/media/`

Utilitários de extração de IDs de plataformas de mídia.

### 7.1 `lib/media/spotify.js`

**Localização:** `/lib/media/spotify.js`

**Propósito:** Utilidade para extração de IDs do Spotify a partir de URLs.

**Funções exportadas:**

| Função | Descrição |
|--------|-----------|
| `extractSpotifyId(url)` | Extrai ID de track de formatos: `open.spotify.com/track/ID`, `spotify:track:ID`, `open.spotify.com/intl-XX/track/ID`. Retorna `null` se URL inválida |
| `getSpotifyEmbedUrl(url)` | Converte URL para embed (`https://open.spotify.com/embed/track/ID`). Retorna a URL original se não extrair ID |

**Observações:** Usado por `components/Admin/fields/UrlField.js` e `components/Features/Music/MusicCard.js`. Funções puras de manipulação de strings — sem dependências.

---

### 7.2 `lib/media/youtube.js`

**Localização:** `/lib/media/youtube.js`

**Propósito:** Utilidade para extração de IDs do YouTube a partir de URLs.

**Função exportada:**

| Função | Descrição |
|--------|-----------|
| `extractYoutubeId(url)` | Extrai ID de 11 caracteres de formatos: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/v/ID`, `youtube.com/e/ID`. Retorna `null` se inválida |

**Observações:** Usado por `components/Admin/fields/UrlField.js`, `components/Admin/AdminVideos.js` e `components/Performance/LazyIframe.js`. Função pura sem dependências.

---

## 8. Subpasta `lib/seo/`

### 8.1 `lib/seo/config.js`

**Localização:** `/lib/seo/config.js`

**Propósito:** Centralização de todas as configurações de SEO do site "O Caminhar com Deus", incluindo metadados, Schema.org, breadcrumbs e funções utilitárias.

**Configuração exportada (`siteConfig`):**

| Seção | Conteúdo |
|-------|----------|
| Básico | `name`, `shortName`, `description`, `shortDescription`, `url`, `language` (pt-BR), `locale` (pt_BR), `timezone` |
| Branding | `logo`, `defaultImage`, `favicon` |
| Autor | `author.name`, `author.email`, `author.url` |
| Social | URLs de Twitter, Facebook, Instagram, YouTube, Spotify |
| Contato | `email`, `phone`, `address` (dados de endereço vazios) |
| Seções | `blog`, `musicas`, `videos` — cada com `name`, `description`, `slug` |
| Feed RSS | `title`, `description`, `copyright` |
| SEO técnico | `noindexPaths` (admin, api, test, _next, 404, 500), `sitemap` (changefreq/priority), `ogImage` (1200×630) |
| Schema.org Organization | `@type: Organization`, `name`, `url`, `logo`, `sameAs`, `contactPoint` |
| Schema.org WebSite | `@type: WebSite`, `potentialAction: SearchAction` |

**Funções utilitárias exportadas:**

| Função | Descrição |
|--------|-----------|
| `getCanonicalUrl(path)` | Gera URL canônica completa (prefixa com `siteUrl`) |
| `getImageUrl(imagePath)` | Resolve URL absoluta de imagem (fallback: `defaultImage`) |
| `formatSchemaDate(date)` | Formata data para ISO 8601; `null` se inválida |
| `truncateDescription(text, maxLength)` | Trunca texto para meta description (160 chars default), cortando na última palavra |
| `extractKeywords(tags, max)` | Extrai keywords de tags (lowercase, limitado a 10) |
| `sanitizeJsonLd(schema)` | Sanitiza JSON-LD prevenindo XSS — escapa `</script>` |
| `shouldIndex(path)` | Verifica se página deve ser indexada (suporta wildcard `/*` no padrão) |
| `generateBreadcrumb(items)` | Gera breadcrumb com "Início" fixo + itens |

**Observações:** `siteUrl` vem de `SITE_URL` env com fallback `http://localhost:3000`. Campos de endereço e telefone estão vazios (ver UPGRADE 6.2). Descrições de seção duplicam a descrição geral do site (ver UPGRADE 5.1/5.2).

---

## 9. Resumo Consolidado

### Arquivos por contexto/módulo

| Módulo | Arquivo | Responsabilidade Principal |
|--------|---------|---------------------------|
| **API — Índice** | `api/index.js` | Barrel export (errors, response, validate, middleware) |
| **API — Admin** | `api/adminCrudHandler.js` | Factory de handlers CRUD administrativos |
| **API — Erros** | `api/errors.js` | Classes de erro customizadas com HTTP codes |
| **API — Helpers** | `api/helpers.js` | Extração de IP e detecção de spoofing |
| **API — Middlewares** | `api/middleware.js` | Composição de middlewares (auth, CORS, rate limit, etc.) |
| **API — Respostas** | `api/response.js` | Padronização de respostas JSON |
| **API — Utilitários** | `api/utils.js` | UUID, metadados, parse de imagens |
| **API — Validação** | `api/validate.js` | Validação de entrada com Zod |
| **Autenticação** | `auth/auth.js` | JWT, bcrypt, cookies, refresh tokens, login com rate limit |
| **Cache** | `cache/cache.js` | Cache multi-nível (memória + Redis) + rate limit |
| **CRUD Genérico** | `crud/crud.js` | Operações SQL genéricas parametrizadas com validação de schema |
| **Domínio** | `domain/audit.js` | Log de auditoria |
| **Domínio** | `domain/images.js` | Metadados de imagens |
| **Domínio** | `domain/musicas.js` | CRUD de músicas |
| **Domínio** | `domain/permissions.js` | Lista imutável de permissões de cargos |
| **Domínio** | `domain/posts.js` | CRUD de posts com full-text search |
| **Domínio** | `domain/products.js` | CRUD de produtos com formatação de moeda |
| **Domínio** | `domain/settings.js` | Configurações dinâmicas do sistema |
| **Domínio** | `domain/shared-pagination.js` | Paginação genérica com busca e SELECT otimizado |
| **Domínio** | `domain/videos.js` | CRUD de vídeos com reordenação |
| **Infra** | `infra/db.js` | Pool PostgreSQL + query + transações + health check |
| **Infra** | `infra/logger.js` | Logger estruturado (níveis, JSON, requestId, transports) |
| **Infra** | `infra/redis.js` | Cliente Redis Upstash com fallback em memória |
| **Mídia** | `media/spotify.js` | Extração de IDs do Spotify |
| **Mídia** | `media/youtube.js` | Extração de IDs do YouTube |
| **SEO** | `seo/config.js` | Configurações de SEO, Schema.org e utilitários |

### Fluxos de dependência principais

```
pages/api/ → lib/api/adminCrudHandler.js → lib/api/helpers.js, lib/auth/auth.js, lib/domain/audit.js, lib/cache/cache.js, lib/infra/db.js, lib/infra/logger.js
pages/api/ → lib/api/middleware.js → lib/auth/auth.js, lib/cache/cache.js, lib/api/response.js
pages/api/ → lib/domain/*.js → lib/crud/crud.js, lib/infra/db.js, lib/domain/shared-pagination.js
lib/domain/*.js → lib/crud/crud.js → lib/infra/db.js
lib/api/*.js → lib/infra/logger.js, lib/infra/db.js, lib/auth/auth.js, lib/cache/cache.js
lib/cache/cache.js → lib/infra/redis.js, lib/infra/logger.js