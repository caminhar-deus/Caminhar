# Análise da Pasta `lib/`

> **Data da análise:** 10/05/2026
> **Projeto:** O Caminhar com Deus
> **Objetivo:** Documentar de forma objetiva e clara todos os arquivos da pasta `lib/`, suas responsabilidades e propósitos.

---

## Índice

1. [Raiz de `lib/`](#1-raiz-de-lib)
   - [lib/auth.js](#11-libauthjs)
   - [lib/cache.js](#12-libcachejs)
   - [lib/crud.js](#13-libcrudjs)
   - [lib/db.js](#14-libdbjs)
   - [lib/middleware.js](#15-libmiddlewarejs)
   - [lib/redis.js](#16-libredisjs)
2. [Subpasta `lib/api/`](#2-subpasta-libapi)
   - [lib/api/errors.js](#21-libapierrorsjs)
   - [lib/api/index.js](#22-libapiindexjs)
   - [lib/api/middleware.js](#23-libapimiddlewarejs)
   - [lib/api/response.js](#24-libapiresponsejs)
   - [lib/api/validate.js](#25-libapivalidatejs)
3. [Subpasta `lib/domain/`](#3-subpasta-libdomain)
   - [lib/domain/audit.js](#31-libdomainauditjs)
   - [lib/domain/images.js](#32-libdomainimagesjs)
   - [lib/domain/musicas.js](#33-libdomainmusicasjs)
   - [lib/domain/posts.js](#34-libdomainpostsjs)
   - [lib/domain/settings.js](#35-libdomainsettingsjs)
   - [lib/domain/videos.js](#36-libdomainvideosjs)
4. [Subpasta `lib/seo/`](#4-subpasta-libseo)
   - [lib/seo/config.js](#41-libseoconfigjs)
   - [lib/seo/helpers.js](#42-libseohelpersjs)

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
- `withAuth(handler)` — Middleware que protege handlers exigindo token válido.
- `initializeAuth()` — Cria a tabela `users` (se não existir), faz migração da coluna `role`, e cria o admin padrão via variáveis de ambiente.

**Observações:** Utiliza `jsonwebtoken`, `bcryptjs` e `cookie`. Possui fallback para compatibilidade CJS/ESM no módulo `cookie` (linha 7-8). O JWT_SECRET tem fallback para string fixa em desenvolvimento.

---

### 1.2 `lib/cache.js`

**Localização:** `/lib/cache.js`

**Propósito:** Camada de cache com Redis (Upstash) e fallback local. Centraliza operações de cache (get/set/invalidate) e inclui sistema de rate limit distribuído com fallback para memória local.

**Funções principais:**
- `getOrSetCache(key, fetchFunction, ttlSeconds)` — Padrão "Cache-Aside": tenta Redis, em caso de miss executa a função de fetch, salva no Redis e retorna. TTL padrão de 1 hora.
- `invalidateCache(keyPattern)` / `clearAllCache()` — Invalida chave específica ou limpa todo o cache Redis (FLUSHDB).
- `checkRateLimit(ip, endpoint, limit, windowMs)` — Rate limit distribuído via Redis (INCR + EXPIRE) com fallback em Map local. Possui whitelist para IPs locais.
- `getCacheMetrics()` — Retorna métricas de monitoramento (hits, misses, erros, tamanho do Map local).

**Observações:** Inclui limpeza periódica do Map local a cada 1 minuto via `setInterval`. Proteção contra memory leak: limpa o Map se exceder 5000 entradas. O rate limit tem fallback completo caso o Redis falhe.

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

**Observações:** Toda construção SQL é parametrizada. Os nomes de tabelas/colunas são validados. Suporta transações via passagem de `client`. O `raw()` permite funções SQL sem parametrização.

---

### 1.4 `lib/db.js`

**Localização:** `/lib/db.js`

**Propósito:** Gerenciamento da conexão com o banco de dados PostgreSQL via `pg.Pool`. Fornece a função `query` principal e utilitários de transação, health check e informações do banco.

**Funções principais:**
- `query(text, params, options)` — Executa SQL parametrizado com logging opcional, suporte a transações (`client`) e controle de exceções (`throwOnError`).
- `transaction(callback)` — Executa uma transação com BEGIN/COMMIT/ROLLBACK automático.
- `healthCheck()` — Verifica se o banco está respondendo (`SELECT 1`).
- `getDatabaseInfo()` — Retorna versão, conexões ativas e tamanho do banco.
- `closeDatabase()` — Fecha o pool de conexões.
- `resetPool()` — Reseta o pool (usado em testes para recriar a conexão com mocks).

**Observações:** Pool configurado com lazy initialization (criado apenas no primeiro uso) para compatibilidade com Jest. Pool configurado com max: 20, min: 2, idleTimeout: 30s, connectionTimeout: 2s. SSL habilitado em produção. Re-exporta funções de `domain/`, `crud.js` e `audit.js` para backward compatibility.

---

### 1.5 `lib/middleware.js`

**Localização:** `/lib/middleware.js`

**Propósito:** Middlewares gerais para as APIs Next.js. Inclui CORS, autenticação, rate limiting (em memória), tratamento de erros e logging.

**Funções principais:**
- `runMiddleware(req, res, fn)` — Helper para executar middlewares no padrão Express/Next.js.
- `apiMiddleware(handler)` — Middleware principal que aplica CORS, trata OPTIONS e adiciona headers padrão (`Content-Type`, `X-API-Version`).
- `authenticatedApiMiddleware(handler)` — Combina `apiMiddleware` + `withAuth`.
- `externalAuthMiddleware(handler)` — Middleware para APIs externas: extrai token do header ou cookie, verifica e anexa ao request.
- `rateLimitMiddleware(handler)` — Rate limit simples em memória (100 req/15 min) com Map. Verifica IP via `x-forwarded-for`.
- `errorHandlingMiddleware(handler)` — Tratamento de erros padronizado com mapeamento de tipos (`ValidationError`, `UnauthorizedError`, etc.).

**Observações:** Utiliza o pacote `cors` para configuração CORS. Possui objeto `logger` exportado com métodos info/error/warn. O rate limit usa Map local (não Redis) — diferente do `lib/cache.js` que usa Redis + fallback.

---

### 1.6 `lib/redis.js`

**Localização:** `/lib/redis.js`

**Propósito:** Inicialização segura do cliente Redis Upstash com validação das variáveis de ambiente e proteção contra configurações incorretas.

**Exportações:**
- `redis` — Instância do cliente Redis ou `null` se não configurado.

**Fluxo de inicialização:**
1. Verifica se `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` existem.
2. Valida se a URL começa com `https://`.
3. Valida se o token **não** começa com `https://` (proteção contra variáveis trocadas).
4. Se tudo ok, cria instância `Redis` do `@upstash/redis`.
5. Em qualquer falha, define `redis = null` e o sistema opera sem cache.

**Observações:** As validações das variáveis prevenem erros comuns de configuração onde URL e token são trocados acidentalmente. Design tolerante a falhas: o app não quebra se Redis não estiver disponível.

---

## 2. Subpasta `lib/api/`

### 2.1 `lib/api/errors.js`

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

**Observações:** Cada classe possui `toJSON()` que retorna formato padronizado com `success`, `error.code`, `error.message`, `details`, `meta.timestamp` e `meta.requestId`. Gera UUID v4 interno para rastreamento.

---

### 2.2 `lib/api/index.js`

**Localização:** `/lib/api/index.js`

**Propósito:** Ponto de exportação centralizada de todos os submódulos de `lib/api/` (errors, response, validate, middleware). Simplifica imports com uma única linha.

**Re-exporta:** Todas as classes de erro, funções de resposta, funções de validação e middlewares. Também exporta um objeto `default` com todos os módulos agrupados.

---

### 2.3 `lib/api/middleware.js`

**Localização:** `/lib/api/middleware.js`

**Propósito:** Sistema de composição de middlewares para APIs Next.js. Diferente do `lib/middleware.js` (que é mais genérico), este módulo foca em middlewares encadeáveis e reutilizáveis.

**Funções/Middlewares:**

| Função | Propósito |
|--------|-----------|
| `composeMiddleware(...middlewares)` | Compõe múltiplos middlewares da esquerda para direita |
| `withMethod(allowedMethods)` | Restringe métodos HTTP permitidos |
| `withAuth(options)` | Autenticação com suporte a roles e API Key |
| `withOptionalAuth()` | Autenticação opcional (não bloqueia anônimos) |
| `withRateLimit(options)` | Rate limit em memória com suporte a função customizada para limite |
| `withCors(options)` | CORS configurável |
| `withErrorHandler(options)` | Captura e padroniza erros |
| `withLogger(options)` | Logging de requisições com duração |
| `withTimeout(timeoutMs)` | Timeout para evitar requisições pendentes |
| `withBodyParser(options)` | Validação de tamanho do body (1MB padrão) |
| `withCache(maxAge)` | Cache simples via header `Cache-Control` |
| `publicApi(handler, options)` | Combinação pronta para APIs públicas |
| `protectedApi(handler, options)` | Combinação pronta para APIs autenticadas |

**Observações:** O `composeMiddleware` usa `reduceRight` para aplicar middlewares de trás para frente, garantindo a ordem correta de execução. O rate limit possui cleanup periódico a cada 5 minutos. Suporta `maxRequests` como função para limites dinâmicos baseados no request.

---

### 2.4 `lib/api/response.js`

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

**Observações:** Todas as respostas incluem `meta.timestamp`, `meta.requestId`. Suporte a stack trace em desenvolvimento. A função `handleError` detecta automaticamente erros com `toJSON()` e erros comuns.

---

### 2.5 `lib/api/validate.js`

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

**Observações:** A ordenação padrão é por `position ASC, created_at DESC`. Suporta busca em `titulo` e `artista` (lowercase). `publishedOnly` usado para filtrar músicas públicas. Retorna alias `data` para compatibilidade com componentes genéricos (AdminCrudBase).

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

**Observações:** A função `createPostWithAudit` demonstra o padrão de transação combinando criação de post com log de auditoria. `getRecentPosts` filtra apenas posts publicados. Os dados são preparados com null safety (`?? null`).

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
| `getAllSettings()` | Retorna todas as configurações como array de registros |

**Observações:** Usa `upsertRecord` do `crud.js` para INSERT ON CONFLICT. A função `getSettings` retorna um objeto plano, enquanto `getAllSettings` retorna array completo de registros. Ordenação alfabética em `getAllSettings`.

---

### 3.6 `lib/domain/videos.js`

**Localização:** `/lib/domain/videos.js`

**Propósito:** Camada de domínio para operações com vídeos. CRUD completo com paginação, busca, reordenação e filtro de publicação.

**Funções:**

| Função | Descrição |
|--------|-----------|
| `getPaginatedVideos(page, limit, search)` | Videos paginados para admin (todos) |
| `getPublicPaginatedVideos(page, limit, search)` | Videos paginados públicos (apenas publicados) |
| `createVideo(videoData)` | Cria novo vídeo com cálculo automático de posição |
| `updateVideo(id, videoData)` | Atualiza vídeo |
| `deleteVideo(id)` | Remove vídeo |
| `reorderVideos(items)` | Reordena vídeos em transação |

**Observações:** `getPublicPaginatedVideos` força `WHERE publicado = true`. O cálculo de posição em `createVideo` busca o `MAX(position)` e incrementa. `reorderVideos` usa `Promise.all` dentro de uma transação para atualizar posições em lote.

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

**Observações:** Contém dados completos de Schema.org (Organization, WebSite, SearchAction). `sanitizeJsonLd` previne XSS escapando `</script>`. `shouldIndex` usa pattern matching com suporte a wildcard (`/*`).

---

### 4.2 `lib/seo/helpers.js`

**Localização:** `/lib/seo/helpers.js`

**Propósito:** Utilitários diversos. Atualmente contém apenas uma função para processamento de URLs de imagens.

**Funções:**
- `parseImages(imagesString)` — Converte string de URLs separadas por quebra de linha em array de URLs válidas (trim + filter).

**Observações:** Arquivo de apenas 16 linhas, com escopo limitado. Apesar de estar em `lib/seo/`, a função é relacionada a produtos (menção no JSDoc), não especificamente a SEO.