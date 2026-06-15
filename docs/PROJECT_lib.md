# Análise da Pasta `lib/`

> **Data da análise:** 08/06/2026 (atualizado em 14/06/2026)
> **Projeto:** O Caminhar com Deus
> **Objetivo:** Documentar de forma objetiva e clara todos os arquivos da pasta `lib/`, suas responsabilidades e propósitos.

---

## Índice

1. [Raiz de `lib/`](#1-raiz-de-lib)
   - [lib/auth.js](#11-libauthjs)
   - [lib/cache.js](#12-libcachejs)
   - [lib/crud.js](#13-libcrudjs)
   - [lib/db.js](#14-libdbjs)
   - [lib/redis.js](#15-libredisjs)
2. [Subpasta `lib/api/`](#2-subpasta-libapi)
   - [lib/api/adminCrudHandler.js](#21-libapiadmincrudhandlerjs)
   - [lib/api/errors.js](#22-libapierrorsjs)
   - [lib/api/index.js](#23-libapiindexjs)
   - [lib/api/middleware.js](#24-libapimiddlewarejs)
   - [lib/api/response.js](#25-libapiresponsejs)
   - [lib/api/utils.js](#26-libapiutilsjs)
   - [lib/api/validate.js](#27-libapivalidatejs)
3. [Subpasta `lib/domain/`](#3-subpasta-libdomain)
   - [lib/domain/audit.js](#31-libdomainauditjs)
   - [lib/domain/images.js](#32-libdomainimagesjs)
   - [lib/domain/musicas.js](#33-libdomainmusicasjs)
   - [lib/domain/posts.js](#34-libdomainpostsjs)
   - [lib/domain/settings.js](#35-libdomainsettingsjs)
   - [lib/domain/permissions.js](#36-libdomainpermissionsjs)
   - [lib/domain/products.js](#37-libdomainproductsjs)
   - [lib/domain/shared-pagination.js](#38-libdomainshared-paginationjs)
   - [lib/domain/videos.js](#39-libdomainvideosjs)
4. [Subpasta `lib/seo/`](#4-subpasta-libseo)
   - [lib/seo/config.js](#41-libseoconfigjs)

---

## 1. Raiz de `lib/`

### 1.1 `lib/auth.js`

**Localização:** `/lib/auth.js`

**Propósito:** Sistema completo de autenticação do projeto. Responsável pelo gerenciamento de usuários, hash de senhas, geração/verificação de tokens JWT, manipulação de cookies de autenticação e inicialização do sistema com criação do admin padrão.

**Funções principais:**
- `hashPassword(password)` / `verifyPassword(password, hashedPassword)` — Hash e verificação de senhas com bcryptjs.
- `generateToken(user)` / `verifyToken(token)` — Criação e verificação de tokens JWT com expiração de 1 hora.
- `setAuthCookie(res, token)` / `getAuthCookie(req)` — Gravação e leitura do token no cookie `httpOnly`.
- `getAuthToken(req)` — Extrai o token do header `Authorization` (Bearer) ou do cookie (fallback).
- `authenticate(username, password)` — Autentica usuário contra o banco de dados.
- `authenticateAndGenerateToken(username, password, ip, options)` — Função compartilhada de login que unifica a lógica usada pelo endpoint `/api/auth/login.js`. Inclui validação de entrada, rate limiting via `checkRateLimit` (5 tentativas/minuto por padrão), autenticação, atualização de `last_login_at`, busca de permissões do cargo e geração de token JWT. Retorna `{ user, token }` em sucesso ou `{ error, message }` em falha.
- `withAuth(handler)` — Middleware que protege handlers exigindo token válido.
- `initializeAuth()` — Cria a tabela `users` (se não existir), faz migração da coluna `role`, e cria o admin padrão via variáveis de ambiente.

**Observações:** Utiliza `jsonwebtoken`, `bcryptjs` e `cookie`. Possui fallback para compatibilidade CJS/ESM no módulo `cookie` (linha 7-8). O `JWT_SECRET` é obrigatório em produção — se não definido, lança erro. Em desenvolvimento, usa fallback com aviso explícito. Durante a inicialização (`initializeAuth`), os logs de criação/existência/atualização do admin usam mensagens genéricas sem expor o nome de usuário admin, prevenindo vazamento de informações. A função `authenticateAndGenerateToken` foi adicionada para centralizar a lógica de login que antes estava duplicada nos endpoints, além de aplicar rate limit contra brute force.

---

### 1.2 `lib/cache.js`

**Localização:** `/lib/cache.js`

**Propósito:** Camada de cache com Redis (Upstash) e fallback local. Centraliza operações de cache (get/set/invalidate) e inclui sistema de rate limit distribuído com fallback para memória local.

**Funções exportadas:**
- `getOrSetCache(key, fetchFunction, ttlSeconds)` — Padrão "Cache-Aside": tenta Redis, em caso de miss executa a função de fetch, salva no Redis e retorna. TTL padrão de 1 hora. Incrementa `redisHits` e `redisMisses` nas métricas.
- `invalidateCache(keyPattern)` / `clearAllCache(options)` — Invalida chave específica ou limpa todo o cache Redis (FLUSHDB). `clearAllCache` agora **requer** `{ confirm: true }` como parâmetro obrigatório para evitar FLUSHDB acidental. Retorna `{ success: true }` em sucesso ou `{ success: false, error: message }` em falha, incrementando `metrics.redisErrors`.
- `checkRateLimit(ip, endpoint, limit, windowMs)` — Rate limit distribuído via Redis (INCR + EXPIRE) com fallback em Map local. Aceita `limit` como função dinâmica. Possui whitelist para IPs locais.
- `getCacheMetrics()` — Retorna métricas de monitoramento (hits, misses, erros, tamanho do Map local).
- `cleanupRateLimitTimer()` — Limpa o timer de limpeza periódica (usado em testes).
- `clearAppMemoryCache()` — Limpa todo o cache de aplicação em memória (`appMemoryCache`). Criada para uso em testes, evitando contaminação de estado entre cenários que compartilham o mesmo Map estático.

**Observações:** Utiliza **lazy eviction** para o Map local de rate limit: entradas expiradas são removidas sob demanda em `checkInMemory()` apenas quando a chave é acessada. O `setInterval` existe apenas como **safety net** para evitar growth infinito, atuando de forma seletiva (remove entradas com mais de 120s ou as mais antigas se exceder 5000). Proteção contra memory leak usa `delete` seletivo (remove a entrada mais antiga) em vez de `clear()` agressivo, preservando dados de IPs legítimos. O rate limit tem fallback completo caso o Redis falhe. As métricas `redisHits` e `redisMisses` são incrementadas corretamente. A whitelist de IPs isentos de rate limit inclui apenas `127.0.0.1`, `::1` e `localhost` — o valor `'unknown'` foi removido para evitar bypass quando o header `x-forwarded-for` está ausente.

---

### 1.3 `lib/crud.js`

**Localização:** `/lib/crud.js`

**Propósito:** Operações CRUD genéricas parametrizadas para qualquer tabela do banco de dados. Evita repetição de código SQL nas camadas de domínio.

**Funções principais:**
- `raw(value)` — Marca um valor como expressão SQL bruta (ex: `CURRENT_TIMESTAMP`). Usa Symbol para evitar uso acidental.
- `createRecord(table, data, options)` — INSERT com `RETURNING` customizável. Suporte a transaction via `client`.
- `updateRecords(table, data, where, options)` — UPDATE dinâmico com cláusula WHERE parametrizada.
- `deleteRecords(table, where, options)` — DELETE com RETURNING.
- `upsertRecord(table, insertData, conflictTarget, updateData, options)` — INSERT ... ON CONFLICT DO UPDATE.

**Funções internas:**
- `_validateIdentifier(identifier)` — Valida nomes de tabela/coluna (regex de alfanuméricos + underscore) para prevenir SQL injection.
- `_buildSetClause(data, startingIndex)` — Constrói cláusulas SET para UPDATE.
- `_buildInsertClauseParts(data, startingIndex)` — Constrói campos e placeholders para INSERT.
- `_filterAllowedFields(table, data)` — Filtra campos do objeto de dados permitindo apenas campos do schema da tabela, prevenindo inserção de campos inexistentes.

**Observações:** Toda construção SQL é parametrizada. Os nomes de tabelas/colunas são validados. Suporta transações via passagem de `client`. O `raw()` permite funções SQL sem parametrização. Desde a última atualização, o `crud.js` passou a incluir validação de schema: um mapa `tableSchemas` define os campos permitidos para cada tabela (musicas, posts, videos, settings, audit_log, roles, users, dicas, products). As funções `createRecord`, `updateRecords` e `upsertRecord` filtram os dados recebidos, ignorando campos não pertencentes ao schema com um aviso no console. Tabelas não mapeadas continuam operando sem filtro para compatibilidade.

---

### 1.4 `lib/db.js`

**Localização:** `/lib/db.js`

**Propósito:** Gerenciamento da conexão com o banco de dados PostgreSQL via `pg.Pool`. Fornece a função `query` principal e utilitários de transação, health check e informações do banco.

**Funções exportadas:**
- `getPool()` — Obtém o pool de conexões, criando-o sob demanda (lazy initialization). Usada internamente por `query()` e `transaction()`, e externamente em testes para garantir que o pool esteja inicializado com a instância mockada antes de chamar `closeDatabase()`.
- `query(text, params, options)` — Executa SQL parametrizado com logging opcional, suporte a transações (`client`) e controle de exceções (`throwOnError`). Em caso de erro, loga o objeto completo `errorDetails` (`code`, `message`, `query`, `duration`, `attempt`) independentemente do `LOG_LEVEL`. Possui retry automático (máx. 2 tentativas) para erros de timeout/rede, com reset do pool entre tentativas.
- `transaction(callback)` — Executa uma transação com BEGIN/COMMIT/ROLLBACK automático.
- `healthCheck()` — Verifica se o banco está respondendo (`SELECT 1`).
- `getDatabaseInfo()` — Retorna versão, conexões ativas e tamanho do banco.
- `closeDatabase()` — Fecha o pool de conexões. Propaga erros de `pool.end()` para o chamador (removido `.catch(() => {})` anterior).
- `resetPool()` — Reseta o pool (usado em testes para recriar a conexão com mocks). Limpa timers, remove listeners de erro e fecha o pool antigo.

**Observações:** Pool configurado com lazy initialization (criado apenas no primeiro uso) para compatibilidade com Jest. Pool configurado com max: 50, min: 5, idleTimeoutMillis: 30000 (30s), connectionTimeoutMillis: 5000 (5s). SSL habilitado em produção. Re-exports removidos — importe diretamente dos módulos de origem (`./crud.js`, `./domain/settings.js`, `./domain/audit.js`, `./domain/posts.js`). A criação do pool foi extraída para `createPool()`, que registra handler para evento `error` — em caso de erro fatal, fecha o pool defeituoso e reseta a referência para recriação automática na próxima chamada. Health check periódico a cada 15s detecta falhas precoces e reseta o pool automaticamente. O log de erro da função `query` foi unificado em 13/06/2026: antes dependia de `LOG_LEVEL=debug` para exibir o objeto completo; agora sempre exibe `errorDetails` com `code`, `message`, `query`, `duration` e `attempt`.

---

### 1.5 `lib/redis.js`

**Localização:** `/lib/redis.js`

**Propósito:** Inicialização segura do cliente Redis Upstash com validação das variáveis de ambiente, proteção contra configurações incorretas e fallback em memória quando Redis está indisponível. A inicialização é **lazy** (sob demanda) para evitar duplicidade quando o Next.js avalia o módulo em contextos separados (SSR e API Routes).

**Exportações:**

| Exportação | Tipo | Descrição |
|------------|------|-----------|
| `redis` | `null` | Sempre `null` — use `getRedisInstance()` para obter a instância real |
| `getRedisInstance()` | `Function` | Retorna a instância Redis atual, inicializando sob demanda (lazy) |
| `checkRedisHealth()` | `Function` | Health check — retorna `Promise<boolean>` |
| `cleanupMemoryCache()` | `Function` | Remove entradas expiradas do cache em memória |
| `redisGet(key)` | `Function` | Obtém valor do Redis com fallback em memória e retry |
| `redisSet(key, value, ttlSeconds)` | `Function` | Salva valor no Redis com fallback em memória |
| `redisDel(...keys)` | `Function` | Deleta chave(s) do Redis e da memória |
| `redisScan(cursor, options)` | `Function` | Escaneia chaves no Redis |
| `redisIncr(key)` | `Function` | Incrementa chave (rate limit) com fallback em memória |
| `redisExpire(key, seconds, nx?)` | `Function` | Define expiração em chave |
| `redisFlushdb()` | `Function` | Executa FLUSHDB e limpa cache em memória |

**Fluxo de inicialização:**
1. `export const redis = null` — a exportação top-level não executa `initializeRedis()`, evitando efeito colateral na importação.
2. `getRedisInstance()` é chamada sob demanda por `lib/cache.js` e funções do próprio módulo.
3. Dentro de `initializeRedis()`: verifica se `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` existem.
4. Valida se a URL começa com `https://`.
5. Valida se o token **não** começa com `https://` (proteção contra variáveis trocadas).
6. Se tudo ok, cria instância `Redis` do `@upstash/redis` e loga `"Redis Upstash REST inicializado com sucesso"` **uma única vez**.
7. Em qualquer falha, define `redisInstance = null` e o sistema opera sem cache.

**Tratamento de erros:** As validações das variáveis prevenem erros comuns de configuração onde URL e token são trocados acidentalmente. Design tolerante a falhas: o app não quebra se Redis não estiver disponível. O guard `if (initializationAttempted) return redisInstance` garante que a inicialização aconteça apenas uma vez por módulo.

**Correção de bug (14/06/2026):** Anteriormente, `export const redis = initializeRedis()` executava `initializeRedis()` como efeito colateral no momento da importação. No Next.js com Turbopack, o módulo era avaliado em contextos separados (SSR de páginas e API Routes), cada um com seu próprio escopo de módulo, fazendo com que o guard `initializationAttempted` não funcionasse entre contextos — resultando em duas mensagens `"[Redis] ✅ Redis Upstash REST inicializado com sucesso"`. A correção removeu o efeito colateral da importação, deixando a inicialização acontecer apenas sob demanda via `getRedisInstance()`.

---

## 2. Subpasta `lib/api/`

### 2.1 `lib/api/adminCrudHandler.js`

**Localização:** `/lib/api/adminCrudHandler.js`

**Propósito:** Factory de handlers CRUD para endpoints administrativos. Centraliza o boilerplate comum a todos os endpoints admin: verificação de método HTTP, autenticação via `withAuth`, RBAC (verificação de permissão por cargo), rate limiting em mutações, invalidação automática de cache e try/catch unificado.

**Função principal:**
- `createAdminHandler(config)` — Cria um handler Next.js completo a partir de um objeto de configuração. Aceita `name` (nome da entidade), `permission` (permissão(ões) exigidas), `requireAdmin` (se true, exige role `admin` sem buscar permissões), `handlers` (mapeamento método → handler), `rateLimit` (opções de rate limit), `cacheKeys` (chaves de cache para invalidar em mutações) e `allowedMethods` (métodos permitidos). Injeta `req.adminUtils` com funções `logActivity()` e `invalidateCache()`.

**Observações:** O `createAdminHandler` aplica os middlewares na seguinte ordem: (1) verificação de método HTTP, (2) verificação de autenticação — retorna 401 se `user` for `null` (proteção contra acesso a `user.role` com usuário nulo), (3) RBAC via `requireAdmin` ou verificação de permissão na tabela `roles`, (4) detecção de IP spoofing, (5) rate limiting em mutações (POST/PUT/DELETE), (6) execução do handler específico, (7) invalidação automática de cache em mutações bem-sucedidas. Em caso de erro na verificação de permissões (ex: tabela `roles` inexistente), permite apenas usuários com role `admin`. O catch centralizado agora traduz mensagens de erro comuns do banco para português: `unique constraint`/`duplicate key` → "Já existe um registro com esses dados", `foreign key` → "Registro possui referências em outros dados", `not null` → "Um campo obrigatório não foi informado". O handler final é envolvido por `withAuth` do `lib/auth.js`.

---

### 2.2 `lib/api/errors.js`

**Localização:** `/lib/api/errors.js`

**Propósito:** Classes de erro customizadas para a API, cada uma mapeando para um código HTTP específico. Herdam de `ApiError` que estende `Error`.

**Classes exportadas:**

| Classe | HTTP Status | Código | Uso |
|--------|-------------|--------|-----|
| `ApiError` | Base | — | Classe base de todos os erros |
| `ValidationError` | 400 | VALIDATION_ERROR | Dados inválidos |
| `AuthenticationError` | 401 | AUTHENTICATION_ERROR | Token ausente/expirado |
| `ForbiddenError` | 403 | FORBIDDEN_ERROR | Permissão insuficiente |
| `NotFoundError` | 404 | NOT_FOUND_ERROR | Recurso não encontrado |
| `ConflictError` | 409 | CONFLICT_ERROR | Duplicidade/conflito |
| `RateLimitError` | 429 | RATE_LIMIT_ERROR | Muitas requisições |
| `ServerError` | 500 | SERVER_ERROR | Erro interno |
| `ServiceUnavailableError` | 503 | SERVICE_UNAVAILABLE | Serviço temporariamente fora |
| `MethodNotAllowedError` | 405 | METHOD_NOT_ALLOWED | Método HTTP não permitido |

**Observações:** Cada classe possui `toJSON()` que retorna formato padronizado com `success`, `error.code`, `error.message`, `details`, `meta.timestamp` e `meta.requestId`. Utiliza `generateUUID` de `lib/api/utils.js` para rastreamento. O `NotFoundError` agora exibe corretamente o ID: numérico como `(id: 123)` e string como `'admin'`.

---

### 2.3 `lib/api/index.js`

**Localização:** `/lib/api/index.js`

**Propósito:** Ponto de exportação centralizada de todos os submódulos de `lib/api/` (errors, response, utils, validate, middleware). Simplifica imports com uma única linha.

**Re-exporta:** Todas as classes de erro, funções de resposta, utilitários, funções de validação e middlewares. Também exporta um objeto `default` com todos os módulos agrupados.

---

### 2.4 `lib/api/middleware.js`

**Localização:** `/lib/api/middleware.js`

**Propósito:** Sistema de composição de middlewares para APIs Next.js. Este é o **único** módulo de middlewares do projeto. O arquivo `lib/middleware.js` foi removido e suas funcionalidades foram migradas para cá.

**Funções/Middlewares:**

| Função | Propósito |
|--------|-----------|
| `composeMiddleware(...middlewares)` | Compõe múltiplos middlewares da esquerda para direita |
| `withMethod(allowedMethods)` | Restringe métodos HTTP permitidos |
| `withAuth(options)` | Autenticação com suporte a roles e API Key |
| `withOptionalAuth()` | Autenticação opcional (não bloqueia anônimos) |
| `withRateLimit(options)` | Rate limit via `checkRateLimit` de `lib/cache.js` (Redis + fallback em memória) |
| `withCors(options)` | CORS configurável |
| `withErrorHandler(options)` | Captura e padroniza erros |
| `withLogger(options)` | Logging de requisições com duração |
| `withTimeout(timeoutMs)` | Timeout para evitar requisições pendentes |
| `withBodyParser(options)` | Validação de tamanho do body (1MB padrão) |
| `withCache(maxAge)` | Cache simples via header `Cache-Control` |
| `publicApi(handler, options)` | Combinação pronta para APIs públicas |
| `protectedApi(handler, options)` | Combinação pronta para APIs autenticadas |
| `cleanupTimers()` | Limpa timers ativos (usado em testes) |

**Observações:** O `composeMiddleware` usa `reduceRight` para aplicar middlewares de trás para frente. O `withRateLimit` agora utiliza `checkRateLimit` de `lib/cache.js`, unificando as 3 implementações de rate limit que existiam anteriormente. Suporta `maxRequests` como função para limites dinâmicos. Exporta `cleanupTimers()` para limpeza em testes. O `withCors` tem comportamento adaptativo: em desenvolvimento usa `['*']` como padrão, mas em produção lê `process.env.ALLOWED_ORIGINS` — se não configurado, emite aviso e usa array vazio (CORS bloqueado). O `withRateLimit` também emite aviso em produção se o Redis não estiver disponível.

---

### 2.5 `lib/api/response.js`

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
| `updated(res, data, meta)` | 200/204 | Recurso atualizado |
| `deleted(res, data, meta)` | 200/204 | Recurso deletado |

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
| `handleError(res, error, includeStack)` | — | Tratamento genérico de erros |

**Observações:** Todas as respostas incluem `meta.timestamp`, `meta.requestId`. Suporte a stack trace em desenvolvimento. A função `handleError` detecta automaticamente erros com `toJSON()` e erros comuns. Utiliza `generateUUID` e `generateMeta` de `lib/api/utils.js`. O `notFound` agora exibe corretamente o ID: numérico como `(id: 123)` e string como `'admin'`.

---

### 2.6 `lib/api/utils.js`

**Localização:** `/lib/api/utils.js`

**Propósito:** Utilitários compartilhados entre os módulos da API, eliminando duplicação de código.

**Funções:**
- `generateUUID()` — Gera UUID v4 simples para rastreamento de requisições.
- `generateMeta(customMeta)` — Gera metadados padrão com `timestamp` e `requestId`.
- `parseImages(imagesString)` — Transforma string de URLs separadas por quebra de linha em array de URLs válidas (trim + filter). Movido de `lib/seo/helpers.js` para cá por estar semanticamente mais relacionado a dados do que a SEO.

**Observações:** Criado para eliminar a duplicação da função `generateUUID` que existia em `lib/api/errors.js` e `lib/api/response.js`. Ambos os módulos agora importam de `utils.js`. A função `parseImages` foi adicionada para centralizar utilitários de dados.

---

### 2.7 `lib/api/validate.js`

**Localização:** `/lib/api/validate.js`

**Propósito:** Middlewares de validação de dados de entrada usando Zod. Garante que body, query, params e headers estejam no formato correto antes de chegar ao handler.

**Funções:**

| Função | Propósito |
|--------|-----------|
| `validateBody(schema)` | Valida body em POST/PUT/PATCH |
| `validateQuery(schema)` | Valida query parameters |
| `validateParams(schema)` | Valida parâmetros de rota |
| `validateHeaders(schema)` | Valida headers (case-insensitive) |
| `validateRequest(schemas)` | Valida body + query + params combinados |
| `formatZodErrors(zodError)` | Converte erros do Zod para formato padronizado |
| `createPaginationSchema(options)` | Helper para schema de paginação (page, limit) |
| `createSearchSchema(options)` | Helper para schema de busca (search com min/max length) |

**Observações:** Usa `safeParse` no `validateRequest` para coletar todos os erros de uma vez. Os helpers de schema convertem strings para números automaticamente. Normaliza headers para lowercase (case-insensitive).

---

## 3. Subpasta `lib/domain/`

### 3.1 `lib/domain/audit.js`

**Localização:** `/lib/domain/audit.js`

**Propósito:** Registro de log de auditoria para rastrear ações dos usuários no sistema (CREATE, UPDATE, DELETE).

**Funções:**
- `logActivity(username, action, entityType, entityId, details, ipAddress, options)` — Insere registro na tabela `activity_logs` com suporte a transações via `options.client`.

**Observações:** Operação simples de INSERT. Suporte a transaction via `client`. O log é desabilitado por padrão (`log: false`).

---

### 3.2 `lib/domain/images.js`

**Localização:** `/lib/domain/images.js`

**Propósito:** Gerenciamento de metadados de imagens no banco de dados, com validação via Zod antes da persistência.

**Funções:**
- `saveImage(filename, relativePath, type, fileSize, userId, options)` — Valida os dados com `imageSchema` (Zod) e salva na tabela `images` via `createRecord`.

**Schema de validação:** `filename` (string), `path` (string), `type` (string), `size` (number, inteiro positivo), `user_id` (number, positivo, nullable).

**Observações:** A validação com Zod garante integridade dos dados antes de qualquer operação no banco. Usa `createRecord` genérico do `crud.js`.

---

### 3.3 `lib/domain/musicas.js`

**Localização:** `/lib/domain/musicas.js`

**Propósito:** Camada de domínio para operações com músicas. CRUD completo com paginação e busca.

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getAllMusicas(search)` | Lista todas as músicas com busca opcional por título/artista |
| `getPaginatedMusicas(page, limit, search, publishedOnly)` | Lista paginada com filtro de publicação |
| `createMusica(musica, options)` | Cria nova música com `raw('CURRENT_TIMESTAMP')` para `created_at` |
| `updateMusica(id, musica, options)` | Atualiza música com `raw('CURRENT_TIMESTAMP')` para `updated_at` |
| `deleteMusica(id, options)` | Remove música por ID |
| `reorderMusicas(items)` | Reordena músicas em transação com tratamento de erro parcial |

**Observações:** A ordenação padrão é por `position ASC, created_at DESC`. Suporta busca em `titulo` e `artista` (lowercase). `publishedOnly` usado para filtrar músicas públicas. Retorna alias `data` para compatibilidade com componentes genéricos (AdminCrudBase). `reorderMusicas` segue o mesmo padrão de `reorderVideos`: usa transação, `Promise.allSettled` para capturar falhas parciais, loga o `id` e `position` exatos de cada item que falhou e relança o erro para acionar rollback.

---

### 3.4 `lib/domain/posts.js`

**Localização:** `/lib/domain/posts.js`

**Propósito:** Camada de domínio para operações com posts do blog. CRUD completo com paginação, busca e log de auditoria.

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getRecentPosts(limit, page, search)` | Posts publicados recentes com paginação e busca |
| `getAllPosts()` | Todos os posts (incluindo rascunhos) para admin |
| `getPaginatedPosts(page, limit, search)` | Posts paginados para admin (com busca) |
| `createPost(post, options)` | Cria novo post |
| `updatePost(id, post, options)` | Atualiza post com `raw('CURRENT_TIMESTAMP')` |
| `deletePost(id, options)` | Remove post |
| `createPostWithAudit(postData, auditData)` | Cria post + registra auditoria em transação |
| `reorderPosts(items)` | Reordena posts em transação com tratamento de erro parcial |

**Observações:** A função `createPostWithAudit` demonstra o padrão de transação combinando criação de post com log de auditoria. `getRecentPosts` filtra apenas posts publicados. Os dados são preparados com null safety (`?? null` para campos opcionais e `?? 0` para `position`). A inclusão do campo `position` expandiu o INSERT de 6 para 7 colunas, exigindo que os testes unitários fossem ajustados para refletir essa mudança. `reorderPosts` segue o mesmo padrão de `reorderVideos` e `reorderMusicas`: transação com `Promise.allSettled` para tratamento de erro parcial.

---

### 3.5 `lib/domain/settings.js`

**Localização:** `/lib/domain/settings.js`

**Propósito:** Gerenciamento de configurações dinâmicas do sistema armazenadas no banco de dados (tabela `settings`).

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getSetting(key, defaultValue)` | Retorna valor de uma configuração específica |
| `getSettings()` | Retorna todas as configurações como objeto chave-valor |
| `updateSetting(key, value, type, description)` | Cria ou atualiza configuração (upsert) |
| `setSetting(key, value, type, description)` | Alias para `updateSetting` |
| `getAllSettingsRaw()` | Retorna todas as configurações como array bruto de registros |
| `getAllSettings()` | Alias para `getAllSettingsRaw` |

**Observações:** Usa `upsertRecord` do `crud.js` para INSERT ON CONFLICT. A função `getSettings` retorna um objeto plano (agregado via `json_object_agg` do PostgreSQL), enquanto `getAllSettingsRaw` retorna array completo de registros. O alias `getAllSettings` é mantido para compatibilidade com consumidores existentes.

---

### 3.6 `lib/domain/permissions.js`

**Localização:** `/lib/domain/permissions.js`

**Propósito:** Lista imutável de permissões disponíveis para atribuição a cargos de administrador. Utiliza `Object.freeze` para garantir imutabilidade em tempo de execução, prevenindo modificações acidentais.

**Exportações:**
- `permissionsList` — Array congelado (`ReadonlyArray<string>`) com as permissões: 'Visão Geral', 'Posts/Artigos', 'Gestão de Músicas', 'Gestão de Vídeos', 'Gestão de Produtos', 'Gestão de Dicas', 'Configuração de Cabeçalho', 'Segurança', 'Usuários', 'Auditoria'.

**Uso:** Importado por componentes administrativos que exibem checkboxes de permissões e pelo middleware de RBAC em `adminCrudHandler.js` para validar permissões de acesso.

---

### 3.7 `lib/domain/products.js`

**Localização:** `/lib/domain/products.js`

**Propósito:** Camada de domínio para operações com produtos. CRUD completo com paginação e formatação de moeda.

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedProducts(page, limit)` | Retorna produtos públicos paginados com formatação de moeda para Real (R$) |
| `getAllProducts(page, limit)` | Retorna todos os produtos paginados (admin) |
| `createProduct(data)` | Cria novo produto com cálculo automático de posição |
| `updateProduct(id, data)` | Atualiza produto existente |
| `deleteProduct(id)` | Remove produto pelo ID |

**Observações:** Criado em 13/05/2026 para centralizar a lógica de paginação e formatação de moeda que antes estava duplicada em `handlePublicGet` e `handleAdminGet` no endpoint `products.js`. Segue o mesmo padrão dos demais módulos de domínio (musicas, posts, videos).

---

### 3.8 `lib/domain/shared-pagination.js`

**Localização:** `/lib/domain/shared-pagination.js`

**Propósito:** Helper compartilhado de paginação com busca textual que centraliza a lógica que antes estava duplicada em `musicas.js`, `videos.js` e `posts.js`. Suporta dois modos de busca: ILIKE (com índice trigram) e full-text search (tsvector).

**Funções:**

| Função | Descrição |
|--------|-----------|
| `paginate(tableName, params)` | Executa paginação com busca em uma tabela. Aceita `page`, `limit`, `search`, `publishedOnly`, `publishedField`, `orderBy` e `searchOptions` |
| `buildSearchClause(search, paramIndex, options)` | (interna) Constrói cláusula WHERE de busca conforme estratégia escolhida |

**Estratégias de busca:**
- **ILIKE** (`searchOptions.fields`): Para tabelas como `musicas` (campos: `titulo`, `artista`) e `videos` (campos: `titulo`, `descricao`). O termo de busca é normalizado com `.toLowerCase().trim()` e envolvido em `%` para wildcard duplo.
- **tsvector** (`searchOptions.tsvector`): Para `posts` com full-text search em português. Usa `plainto_tsquery` para busca semântica normalizada.

**Observações:** A função `paginate` executa duas queries em paralelo via `Promise.all`: a query de dados (com `LIMIT` e `OFFSET`) e a query de contagem (COUNT). Os parâmetros de busca são compartilhados entre ambas, enquanto `limit` e `offset` são adicionados apenas na query de dados. O termo de busca em ambos os modos é normalizado com `.toLowerCase().trim()` para garantir consistência nos parâmetros. O nome da tabela é interpolado diretamente no SQL, porém o helper é interno ao projeto e os nomes são controlados (não recebidos do usuário).

---

### 3.9 `lib/domain/videos.js`

**Localização:** `/lib/domain/videos.js`

**Propósito:** Camada de domínio para operações com vídeos. CRUD completo com paginação, busca, reordenação e filtro de publicação.

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedVideos(page, limit, search, publishedOnly)` | Videos paginados com filtro de publicação (padrão: `publishedOnly=false`) |
| `getPublicPaginatedVideos(page, limit, search)` | Alias para `getPaginatedVideos` com `publishedOnly=true` |
| `createVideo(videoData, options)` | Cria novo vídeo com cálculo automático de posição dentro de transação. Aceita `options` (ex: `{ client }`) |
| `updateVideo(id, videoData)` | Atualiza vídeo |
| `deleteVideo(id)` | Remove vídeo |
| `reorderVideos(items)` | Reordena vídeos em transação com tratamento de erro parcial |

**Observações:** A paginação foi unificada no helper `paginate()` do `shared-pagination.js`. `getPaginatedVideos` aceita `publishedOnly` como 4º parâmetro (mesmo padrão de `musicas.js`). `getPublicPaginatedVideos` é mantida como alias que repassa `publishedOnly=true`. `createVideo` aceita `options` como 2º parâmetro, alinhando-se ao padrão de `createMusica` e `createPost`. O cálculo de posição em `createVideo` busca o `MAX(position)` e incrementa, tudo dentro de uma transação para evitar race condition em chamadas concorrentes. `reorderVideos` usa `Promise.allSettled` para identificar falhas parciais, logando o `id` e `position` exatos do vídeo que falhou antes de acionar o rollback.

---

## 4. Subpasta `lib/seo/`

### 4.1 `lib/seo/config.js`

**Localização:** `/lib/seo/config.js`

**Propósito:** Centralização de todas as configurações de SEO do site "O Caminhar com Deus". Inclui metadados, redes sociais, Schema.org, breadcrumbs e funções utilitárias.

**Configurações:**

| Seção | Conteúdo |
|-------|----------|
| `siteConfig.name` | Nome do site |
| `siteConfig.social` | URLs de redes sociais (Twitter, Facebook, Instagram, YouTube, Spotify) |
| `siteConfig.sections` | Definições das seções (blog, musicas, videos) |
| `siteConfig.seo` | Configurações técnicas (noindex, sitemap, OG Image) |
| `siteConfig.organization` | Schema.org Organization |
| `siteConfig.website` | Schema.org WebSite com SearchAction |

**Funções utilitárias:**

| Função | Propósito |
|--------|-----------|
| `getCanonicalUrl(path)` | Gera URL canônica completa |
| `getImageUrl(imagePath)` | Resolve URL absoluta de imagem |
| `formatSchemaDate(date)` | Formata data para ISO 8601 |
| `truncateDescription(text, maxLength)` | Trunca texto para meta description (160 chars) |
| `extractKeywords(tags, max)` | Extrai keywords de tags |
| `sanitizeJsonLd(schema)` | Sanitiza JSON-LD prevenindo XSS |
| `shouldIndex(path)` | Verifica se página deve ser indexada |
| `generateBreadcrumb(items)` | Gera breadcrumb com "Início" fixo |

**Observações:** Contém dados completos de Schema.org (Organization, WebSite, SearchAction). `sanitizeJsonLd` previne XSS escapando `</script>`. `shouldIndex` usa pattern matching com suporte a wildcard (`/*`). O arquivo `lib/seo/helpers.js` foi removido — sua função `parseImages` foi movida para `lib/api/utils.js`.
