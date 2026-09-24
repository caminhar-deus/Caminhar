# Análise Completa da Biblioteca `/lib`

## 1. Nome do documento

**Análise Completa da Biblioteca `/lib` — Projeto Caminhar**
Data: 24/09/2026
Escopo: 26 arquivos JavaScript em `/home/gus/Projetos/Caminhar/lib/`

---

## 2. Descrição geral

Este documento apresenta análise abrangente de todos os 26 arquivos da pasta `lib/` do projeto "O Caminhar com Deus". A análise cobre estrutura, propósito, relacionamentos entre módulos, problemas identificados, melhorias recomendadas, duplicidades e código morto.

O objetivo é fornecer visão consolidada da arquitetura da biblioteca, facilitar manutenção futura e identificar pontos de atenção que impactam segurança, performance e consistência do código.

---

## 3. Estrutura de arquivos e pastas

```
lib/
├── seo/
│   └── config.js          # Configurações de SEO e metadados do site
├── auth/
│   └── auth.js            # Autenticação JWT, cookies, refresh tokens
├── infra/
│   ├── redis.js           # Cliente Redis com fallback em memória
│   ├── logger.js          # Logger estruturado com níveis e transportes
│   └── db.js              # Pool PostgreSQL com health check e retry
├── media/
│   ├── youtube.js         # Extração de ID de vídeos do YouTube
│   └── spotify.js         # Extração e embed de tracks do Spotify
├── domain/
│   ├── posts.js           # Operações de posts (CRUD + paginação)
│   ├── images.js          # Salvamento de metadados de imagens
│   ├── audit.js           # Registro de atividades (log de auditoria)
│   ├── shared-pagination.js # Helper compartilhado de paginação com busca
│   ├── settings.js        # Gerenciamento de configurações do site
│   ├── musicas.js         # Operações de músicas (CRUD + paginação)
│   ├── videos.js          # Operações de vídeos (CRUD + paginação)
│   ├── products.js        # Operações de produtos (CRUD + paginação)
│   └── permissions.js     # Lista congelada de permissões disponíveis
├── crud/
│   └── crud.js            # Operações CRUD genéricas com filtro de campos
├── cache/
│   └── cache.js           # Cache L1/L2 com rate limiting e métricas
└── api/
    ├── index.js           # Barrel de exportação da API
    ├── errors.js          # Classes de erro customizadas (Zod-friendly)
    ├── response.js        # Funções padronizadas de resposta HTTP
    ├── adminCrudHandler.js # Factory de handlers admin com RBAC
    ├── validate.js        # Middlewares de validação com Zod
    ├── middleware.js      # Composição de middlewares (CORS, rate limit, auth)
    ├── helpers.js         # Helpers de IP e detecção de spoofing
    └── utils.js           # Utilitários (UUID, metadados, parseamento)
```

### Relacionamentos entre módulos

- **infra/db.js** é a base para todos os módulos de domínio e crud
- **infra/logger.js** é utilizado por todos os módulos para logging
- **infra/redis.js** é consumido exclusivamente por **cache/cache.js**
- **crud/crud.js** é a base CRUD para todos os módulos de domínio
- **domain/shared-pagination.js** é utilizado por posts, musicas e videos
- **domain/audit.js** é utilizado por posts.js e adminCrudHandler.js
- **cache/cache.js** é utilizado por middleware.js e adminCrudHandler.js
- **api/response.js** e **api/errors.js** formam o padrão de resposta
- **api/utils.js** é utilizado por errors.js e response.js
- **api/helpers.js** é utilizado por adminCrudHandler.js
- **auth/auth.js** é utilizado por middleware.js e adminCrudHandler.js

---

## 4. Análise individual de cada arquivo

---

### 4.1 lib/seo/config.js

**Nome do arquivo:** `lib/seo/config.js`

**Arquivos relacionados:** Nenhum import direto — módulo autônomo consumido externamente (geradores de sitemap, RSS, metadata de páginas).

**Resumo:**
Centraliza configurações de SEO do site "O Caminhar com Deus". Define URL base, branding, redes sociais, Schema.org (Organization e Website), seções do site (blog, músicas, vídeos), configurações de RSS e sitemap. Exporta funções utilitárias: `getCanonicalUrl`, `getImageUrl`, `formatSchemaDate`, `truncateDescription`, `extractKeywords`, `sanitizeJsonLd`, `shouldIndex`, `generateBreadcrumb`.

---

### 4.2 lib/auth/auth.js

**Nome do arquivo:** `lib/auth/auth.js`

**Arquivos relacionados:**
- Importa: `jsonwebtoken`, `bcryptjs`, `crypto`, `../infra/db.js` (query), `../infra/logger.js` (logger)
- Exportado para: `lib/api/middleware.js`, `lib/api/adminCrudHandler.js`

**Resumo:**
Módulo completo de autenticação. Implementa hash/verificação de senha com bcrypt, geração e verificação de JWT, refresh tokens com rotação, manipulação manual de cookies (parse/serialização), middleware `withAuth`, função `initializeAuth` que cria tabelas e usuário admin, e `authenticateAndGenerateToken` que autentica e gera par de tokens (access + refresh).

Contém implementação própria de `parseCookie` e `serializeCookie` em vez de usar biblioteca externa.

---

### 4.3 lib/infra/redis.js

**Nome do arquivo:** `lib/infra/redis.js`

**Arquivos relacionados:**
- Importa: `@upstash/redis`, `./logger.js`
- Exportado para: `lib/cache/cache.js`

**Resumo:**
Cliente Redis com lazy initialization e fallback completo em memória. Suporta Upstash Redis REST (prioridade 1) e REDIS_URL (CI). Valida variáveis de ambiente antes de inicializar. Exporta funções `redisGet`, `redisSet`, `redisDel`, `redisScan`, `redisIncr`, `redisExpire`, `redisFlushdb`, `getRedisInstance`. A exportação `redis = null` é intencional para evitar inicialização em import.

---

### 4.4 lib/infra/logger.js

**Nome do arquivo:** `lib/infra/logger.js`

**Arquivos relacionados:**
- Importa: `node:async_hooks` (AsyncLocalStorage), `node:fs` (appendFileSync, statSync, renameSync, existsSync)
- Exportado para: todos os módulos que necessitam logging

**Resumo:**
Logger estruturado com níveis hierárquicos (error, warn, info, debug), saída JSON em produção, formato legível com emojis em desenvolvimento. Suporta correlação via `requestId` com AsyncLocalStorage. Transporte duplo (console + arquivo opcional com rotação por tamanho). Inclui `safeSerialize` para lidar com objetos circulares e erros.

---

### 4.5 lib/infra/db.js

**Nome do arquivo:** `lib/infra/db.js`

**Arquivos relacionados:**
- Importa: `pg` (Pool), `./logger.js`
- Exportado para: todos os módulos de domínio, crud, cache, auth, audit

**Resumo:**
Pool PostgreSQL com lazy initialization, health check periódico (60s), auto-recovery em falhas, retry em timeouts (2 tentativas), transação helper, e funções utilitárias (`query`, `transaction`, `closeDatabase`, `healthCheck`, `getDatabaseInfo`). Pool pré-aquecido imediatamente na criação. Suporte a client específico para transações.

---

### 4.6 lib/media/youtube.js

**Nome do arquivo:** `lib/media/youtube.js`

**Arquivos relacionados:** Módulo autônomo, consumido por componentes frontend (VideoCard, VideoSection, UrlField)

**Resumo:**
Função única `extractYoutubeId(url)` que extrai o ID de 11 caracteres de URLs do YouTube. Suporta formatos: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/v/ID`, `youtube.com/e/ID`.

---

### 4.7 lib/media/spotify.js

**Nome do arquivo:** `lib/media/spotify.js`

**Arquivos relacionados:** Módulo autônomo, consumido por componentes frontend (MusicCard, UrlField)

**Resumo:**
Duas funções: `extractSpotifyId(url)` para extrair ID de track do Spotify (suporta `open.spotify.com/track/ID`, `spotify:track:ID`, `intl-XX` prefix) e `getSpotifyEmbedUrl(url)` para converter URL para formato embed.

---

### 4.8 lib/domain/posts.js

**Nome do arquivo:** `lib/domain/posts.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query, transaction), `../crud/crud.js` (createRecord, updateRecords, deleteRecords, raw), `./audit.js` (logActivity), `./shared-pagination.js` (paginate)

**Resumo:**
Domínio de posts com operações CRUD completas. `getRecentPosts` usa paginação com full-text search em português (tsvector). `getPaginatedPosts` para admin (busca por título). `createPost`, `updatePost` (atualização parcial), `deletePost`. `createPostWithAudit` envolve criação + auditoria em transação única.

---

### 4.9 lib/domain/images.js

**Nome do arquivo:** `lib/domain/images.js`

**Arquivos relacionados:**
- Importa: `../crud/crud.js` (createRecord), `zod`

**Resumo:**
Função `saveImage` que valida metadados de imagem (filename, path, type, size, user_id) via schema Zod antes de persistir. Único módulo de domínio com validação Zod explícita.

---

### 4.10 lib/domain/audit.js

**Nome do arquivo:** `lib/domain/audit.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query)
- Exportado para: `lib/domain/posts.js`, `lib/api/adminCrudHandler.js`

**Resumo:**
Função `logActivity` para registrar ações no log de auditoria. Aceita `options.client` para participar de transações existentes.

---

### 4.11 lib/domain/shared-pagination.js

**Nome do arquivo:** `lib/domain/shared-pagination.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query)
- Exportado para: `lib/domain/posts.js`, `lib/domain/musicas.js`, `lib/domain/videos.js`

**Resumo:**
Helper compartilhado de paginação com suporte a dois modos de busca: ILIKE com trigram e full-text search com tsvector. Define `PUBLIC_SELECT_FIELDS` para SELECT otimizado por tabela. Função `paginate` executa consultas de dados e count em paralelo (`Promise.all`).

---

### 4.12 lib/domain/settings.js

**Nome do arquivo:** `lib/domain/settings.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query), `../crud/crud.js` (upsertRecord, raw)

**Resumo:**
Gerenciamento de configurações (key-value). Funções: `getSetting`, `getSettings` (usa `json_object_agg` do PostgreSQL), `updateSetting` (upsert), `getAllSettingsRaw`. Não possui validação de tipo.

---

### 4.13 lib/domain/musicas.js

**Nome do arquivo:** `lib/domain/musicas.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query, transaction), `../crud/crud.js` (createRecord, updateRecords, deleteRecords, raw), `./shared-pagination.js` (paginate)

**Resumo:**
Domínio de músicas. `getAllMusicas` (com busca opcional), `createMusica` (em transação com cálculo de MAX(position)), `updateMusica` (parcial), `deleteMusica`. `getPaginatedMusicas` retorna `{ musicas, data, pagination }` onde `musicas` e `data` são a mesma referência (alias para compatibilidade).

---

### 4.14 lib/domain/videos.js

**Nome do arquivo:** `lib/domain/videos.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query, transaction), `../crud/crud.js` (createRecord, updateRecords, deleteRecords, raw), `../infra/logger.js` (logger), `./shared-pagination.js` (paginate)

**Resumo:**
Domínio de vídeos. `getPaginatedVideos`, `getPublicPaginatedVideos`, `createVideo` (transação para MAX(position)), `updateVideo`, `deleteVideo`, `reorderVideos` (transação com Promise.allSettled para detecção de falhas parciais). Único módulo com função de reordenação.

---

### 4.15 lib/domain/products.js

**Nome do arquivo:** `lib/domain/products.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query), `../crud/crud.js` (createRecord, updateRecords, deleteRecords, raw)

**Resumo:**
Domínio de produtos. Implementa paginação manual (não usa `shared-pagination.js`). `getPaginatedProducts` com filtros (search, minPrice, maxPrice), `getAllProducts`, `createProduct` (sem transação para MAX(position)), `updateProduct` (parcial), `deleteProduct`. Formata preço com `Intl.NumberFormat` para BRL em duas funções.

---

### 4.16 lib/domain/permissions.js

**Nome do arquivo:** `lib/domain/permissions.js`

**Arquivos relacionados:** Módulo autônomo — lista estática consumida por componentes de UI de roles/permissions

**Resumo:**
Exporta array congelado (`Object.freeze`) com 10 permissões disponíveis: Visão Geral, Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Gestão de Dicas, Configuração de Cabeçalho, Segurança, Usuários, Auditoria.

---

### 4.17 lib/crud/crud.js

**Nome do arquivo:** `lib/crud/crud.js`

**Arquivos relacionados:**
- Importa: `../infra/db.js` (query), `../infra/logger.js` (logger)
- Exportado para: todos os módulos de domínio

**Resumo:**
Operações CRUD genéricas com validação de campos via `tableSchemas`. Filtra campos não permitidos antes de inserir/atualizar. Suporta raw SQL via Symbol-based marker. Funções: `createRecord`, `updateRecords`, `deleteRecords`, `upsertRecord`. Define esquemas para 12 tabelas.

---

### 4.18 lib/cache/cache.js

**Nome do arquivo:** `lib/cache/cache.js`

**Arquivos relacionados:**
- Importa: `../infra/redis.js` (7 funções), `../infra/logger.js` (logger)
- Exportado para: `lib/api/middleware.js`, `lib/api/adminCrudHandler.js`

**Resumo:**
Camada de cache com dois níveis (L1 memória, L2 Redis). Implementa `getOrSetCache` com Single-Flight (request coalescing via `inflightPromises`), `invalidateCache` com SCAN para wildcards, `clearAllCache` (FLUSHDB com confirmação), `checkRateLimit` com whitelist de IPs, fallback em memória, e métricas detalhadas.

---

### 4.19 lib/api/index.js

**Nome do arquivo:** `lib/api/index.js`

**Arquivos relacionados:**
- Importa: `./errors.js`, `./response.js`, `./validate.js`, `./middleware.js`
- Exportado para: consumidores que preferem import via barrel

**Resumo:**
Barrel que exporta 4 namespaces: errors, response, validate, middleware. Não exporta helpers, utils nem adminCrudHandler — consumidores precisam importá-los diretamente.

---

### 4.20 lib/api/errors.js

**Nome do arquivo:** `lib/api/errors.js`

**Arquivos relacionados:**
- Importa: `./utils.js` (generateUUID)
- Exportado para: barrels, handlers, middlewares

**Resumo:**
Classes de erro customizadas estendendo `ApiError`. Cada classe mapeia para um código HTTP: ValidationError (400), AuthenticationError (401), ForbiddenError (403), NotFoundError (404), ConflictError (409), RateLimitError (429), ServerError (500), ServiceUnavailableError (503), MethodNotAllowedError (405). Todas incluem `toJSON()` padronizado com requestId via `generateUUID`.

---

### 4.21 lib/api/response.js

**Nome do arquivo:** `lib/api/response.js`

**Arquivos relacionados:**
- Importa: `./utils.js` (generateMeta)
- Exportado para: handlers, middlewares

**Resumo:**
Funções padronizadas de resposta HTTP. Sucesso: `success`, `paginated`, `created`, `accepted`, `noContent`, `updated`, `deleted`. Erro: `badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `methodNotAllowed`, `conflict`, `tooManyRequests`, `serverError`, `serviceUnavailable`. `handleError` detecta erros com `toJSON` automaticamente.

---

### 4.22 lib/api/adminCrudHandler.js

**Nome do arquivo:** `lib/api/adminCrudHandler.js`

**Arquivos relacionados:**
- Importa: `../auth/auth.js` (withAuth), `../domain/audit.js` (logActivity), `../cache/cache.js` (checkRateLimit, invalidateCache), `../infra/db.js` (query), `./helpers.js` (getClientIP, detectSpoofedIP), `../infra/logger.js` (logger)

**Resumo:**
Factory `createAdminHandler` que gera handlers Next.js com: verificação de método HTTP, autenticação, RBAC (permissão por cargo via banco), detecção de IP spoofing, rate limiting em mutações, invalidação automática de cache, try/catch centralizado com tradução de erros do banco.

---

### 4.23 lib/api/validate.js

**Nome do arquivo:** `lib/api/validate.js`

**Arquivos relacionados:**
- Importa: `zod`, `./response.js` (validationError), `../infra/logger.js` (logger)

**Resumo:**
Middlewares de validação Zod: `validateBody`, `validateQuery`, `validateParams`, `validateHeaders`, `validateRequest` (combina todos). Helpers `createPaginationSchema` e `createSearchSchema`. Usa `error.issues` em vez de `instanceof z.ZodError` para detecção.

---

### 4.24 lib/api/middleware.js

**Nome do arquivo:** `lib/api/middleware.js`

**Arquivos relacionados:**
- Importa: `../auth/auth.js` (getAuthToken, verifyToken), `../cache/cache.js` (checkRateLimit, getCacheMetrics), `../infra/logger.js` (logger), `./response.js` (methodNotAllowed, unauthorized, tooManyRequests, serverError, handleError)

**Resumo:**
Sistema de composição de middlewares. Funções: `composeMiddleware`, `withMethod`, `withAuth`, `withOptionalAuth`, `withRateLimit`, `withCors`, `withErrorHandler`, `withLogger`, `withTimeout`, `withBodyParser`, `withCache`, `publicApi`, `protectedApi`. Contém lógica inline de extração de IP em `withRateLimit`.

---

### 4.25 lib/api/helpers.js

**Nome do arquivo:** `lib/api/helpers.js`

**Arquivos relacionados:** Módulo autônomo, exportado para `lib/api/adminCrudHandler.js`

**Resumo:**
Helpers de IP: `getClientIP` (extração com trustProxy opcional), `normalizeIP` (interna), `detectSpoofedIP` (detecção de spoofing com strictMode). Função `detectSpoofedIP` possui múltiplos cenários com lógica complexa.

---

### 4.26 lib/api/utils.js

**Nome do arquivo:** `lib/api/utils.js`

**Arquivos relacionados:** Módulo utilitário sem dependências externas

**Resumo:**
Três utilitários: `generateUUID` (implementação manual com Math.random), `generateMeta` (timestamp + requestId), `parseImages` (split/trim/filter de URLs separadas por quebra de linha).

---

## 5. Ajustes e correções

### 5.1 lib/api/adminCrudHandler.js — Erros de banco expostos ao cliente
**Onde:** Catch centralizado, tratamento de erros do PostgreSQL.
**Problema:** Apenas 3 tipos de erro do banco são traduzidos; outros expõem `error.message` original ao cliente, podendo vazar nomes de tabelas/colunas.
**Correção:** Em produção, retornar mensagem genérica e logar original no servidor.

### 5.2 lib/api/adminCrudHandler.js — Dupla invalidação de cache em mutações
**Onde:** `req.adminUtils.invalidateCache()` + invalidação automática pós-handler.
**Problema:** Handler pode chamar `invalidateCache` explicitamente E a config ter `cacheKeys`, causando operações redundantes de SCAN/DEL.
**Correção:** Unificar estratégia — preferencialmente manter apenas a invalidação automática (mais segura).

### 5.3 lib/api/middleware.js — `withBodyParser` retorna 500 em vez de 413
**Onde:** Verificação de tamanho do body.
**Problema:** Retorna `serverError` (HTTP 500) quando o correto para payload muito grande é 413.
**Correção:** Criar resposta `payloadTooLarge` (413) em `response.js`.

### 5.4 lib/api/middleware.js — `withErrorHandler` usa `console.error`
**Onde:** Catch do error handler.
**Problema:** Usa `console.error` em vez do `logger` estruturado.
**Correção:** Substituir por `logger.error('API', ...)`.

### 5.5 lib/api/middleware.js — Header `X-RateLimit-Remaining` inválido
**Onde:** `withRateLimit`, resposta de rate limit.
**Problema:** Header retorna string `"calculado via IP:endpoint"` em vez de número real.
**Correção:** Calcular valor real ou remover header.

### 5.6 lib/api/middleware.js — `withLogger` sobrescreve `res.end`
**Onde:** Interceptação de resposta.
**Problema:** Sobrescreve `res.end` que pode conflitar com outros interceptadores.
**Correção:** Usar `res.on('finish', callback)` em vez de sobrescrever `res.end`.

### 5.7 lib/api/utils.js — `generateUUID` usa `Math.random`
**Onde:** Geração de UUID v4.
**Problema:** `Math.random` não é criptograficamente seguro.
**Correção:** Usar `crypto.randomUUID()` nativo (Node.js >= 14.17).

### 5.8 lib/cache/cache.js — Whitelist de IPs privados usa IP original
**Onde:** `checkRateLimit`, whitelist dinâmica.
**Problema:** Testa regex sobre `ip` original (não normalizado); IP `::ffff:192.168.x.x` escaparia da whitelist.
**Correção:** Testar `normalizedIp` em ambos os whitelists.

### 5.9 lib/auth/auth.js — `withAuth` com formato de erro divergente
**Onde:** Retorno de erros 401.
**Problema:** Retorna `{ message }` simples em vez do padrão `{ success, error: { code, message }, meta }`.
**Correção:** Alinhar ao formato padronizado via `unauthorized()` de `response.js`.

### 5.10 lib/auth/auth.js — `initializeAuth` executa DDL diretamente
**Onde:** Criação de tabelas e índices.
**Problema:** Duplica responsabilidade com scripts de migração.
**Correção:** Mover DDL para migrações; manter apenas bootstrap de admin.

### 5.11 lib/domain/shared-pagination.js — Interpolação direta de tableName
**Onde:** Construção de SQL com `FROM ${tableName}`.
**Problema:** Sem validação de identifier, vulnerável se tableName vier de entrada externa.
**Correção:** Adicionar validação `^[a-zA-Z0-9_]+$`.

### 5.12 lib/api/validate.js — Verificação `error.issues` sem `instanceof`
**Onde:** Blocos catch das validações.
**Problema:** Qualquer erro com propriedade `issues` seria tratado como ZodError.
**Correção:** Combinar `error.issues && error instanceof z.ZodError`.

### 5.13 lib/domain/products.js — Paginação inline (não usa shared-pagination)
**Onde:** `getPaginatedProducts` e `getAllProducts`.
**Problema:** Implementação manual inconsistente com o padrão do projeto.
**Correção:** Migrar para `paginate()` de `shared-pagination.js`.

### 5.14 lib/domain/products.js — `createProduct` sem transação para MAX(position)
**Onde:** Cálculo de posição.
**Problema:** Race condition em chamadas concorrentes (problema já corrigido em musicas/videos).
**Correção:** Envolver em `transaction()`.

### 5.15 lib/domain/videos.js — `deleteVideo` não aceita `options`
**Onde:** Assinatura da função.
**Problema:** Diferente de updateVideo e demais módulos; não permite participação em transação.
**Correção:** Adicionar `options = {}` como parâmetro.

---

## 6. Melhorias

### 6.1 Pool de conexões configurável via env
**Problema:** Valores do pool PostgreSQL (`max: 50`, `min: 5`, timeouts) estão hardcoded.
**Melhoria:** Tornar configurável via `DB_POOL_MAX`, `DB_POOL_MIN`, etc., com fallback.
**Justificativa:** Permite ajuste por ambiente sem deploy.

### 6.2 Cache de permissões no JWT
**Problema:** Permissões consultadas no banco a cada requisição admin.
**Melhoria:** Incluir permissões no payload do JWT no login; validar a partir do token.
**Justificativa:** Reduz latência e carga no banco (permissões alteradas refletem após 1h — aceitável).

### 6.3 Health check reativo
**Problema:** Health check executa a cada 60s ininterruptamente.
**Melhoria:** Executar apenas após falha de query ou com intervalo configurável.
**Justificativa:** Reduz consultas desnecessárias ao banco.

### 6.4 Centralização de timestamps automáticos
**Problema:** `raw('CURRENT_TIMESTAMP')` adicionado manualmente em cada função create/update.
**Melhoria:** Centralizar no `crud.js` — detectar esquema da tabela e adicionar timestamps automaticamente.
**Justificativa:** Elimina esquecimento e duplicação.

### 6.5 Função genérica `reorderRecords`
**Problema:** Apenas `videos.js` possui `reorderVideos`; musicas, posts e produtos reordenam sem camada de domínio.
**Melhria:** Criar `reorderRecords(table, items)` genérica em `crud.js`.
**Justificativa:** Padronização e redução de duplicação.

### 6.6 Função `buildUpdateData` genérica
**Problema:** Padrão de atualização parcial repetido em 4 módulos de domínio.
**Melhria:** Criar helper genérico que filtra campos `!== undefined` e adiciona `updated_at`.
**Justificativa:** Reduz ~80 linhas de código duplicado.

### 6.7 Fallback de paginação para products.js
**Problema:** `products.js` não usa `shared-pagination.js`, impedindo reuso de PUBLIC_SELECT_FIELDS otimizado.
**Melhoria:** Migrar para `paginate()` mantendo filtros de preço como condições adicionais.
**Justificativa:** Consistência e manutenção centralizada.

### 6.8 `formatProductRows` centralizada
**Problema:** Formatação de moeda duplicada em `getPaginatedProducts` e `getAllProducts`.
**Melhoria:** Extrair função `formatPrice(value)` ou `formatProductRows(rows)`.
**Justificativa:** Ponto único de manutenção para lógica de apresentação.

### 6.9 Logger em `withErrorHandler`
**Problema:** `console.error` ignora o logger estruturado.
**Melhoria:** Usar `logger.error('API', 'Erro na requisição:', error)`.
**Justificativa:** Correlação de logs e formatação padronizada.

### 6.10 Documentação de limitação no `PUBLIC_SELECT_FIELDS`
**Problema:** Novas tabelas públicas não adicionadas ao mapa silenciosamente usam `SELECT *`.
**Melhria:** Documentar no módulo que novas tabelas públicas devem ser adicionadas ao mapa.
**Justificativa:** Evita performance degradada sem aviso.

---

## 7. Duplicidades

### 7.1 Padrão de atualização parcial em 4 módulos
**Onde:** `musicas.js`, `posts.js`, `products.js`, `videos.js`.
**Evidência:** Mesmo padrão de construir objeto com campos `!== undefined`, adicionar `updated_at` se houver dados, chamar `updateRecords`.
**Redução estimada:** ~80 linhas em 4 arquivos.

### 7.2 Lógica de `MAX(position) + 1`
**Onde:** `createMusica`, `createVideo`, `createProduct`.
**Evidência:** `SELECT COALESCE(MAX(position), 0) as max_pos FROM tabela` repetido 3x.
**Redução estimada:** Função `getNextPosition(table, client?)` eliminaria duplicação.

### 7.3 `formatted_price` em products.js
**Onde:** `getPaginatedProducts` (linhas 56-61) e `getAllProducts` (linhas 87-92).
**Evidência:** Mesmo `Intl.NumberFormat` + `map` aplicado separadamente.

### 7.4 Resposta 405 duplicada em adminCrudHandler.js
**Onde:** Linhas 66-72 e 152-158.
**Evidência:** Código quase idêntico para construir resposta 405 com header `Allow`.

### 7.5 Descrição do site em seo/config.js
**Onde:** `siteConfig.shortDescription` (linha 13) e `siteConfig.sections.blog.description` (linha 59).
**Evidência:** Ambas contêm exatamente "Reflexões e ensinamentos sobre a fé cristã".

### 7.6 Extração de IP em múltiplos pontos
**Onde:** `middleware.js` (inline), `helpers.js` (getClientIP), `adminCrudHandler.js` (getClientIP).
**Evidência:** Estratégias diferentes — middleware confia em `x-forwarded-for`, admin usa socket.

---

## 8. Código morto

### 8.1 `lib/api/helpers.js` — `normalizeIP`
**Status:** Código ativo, mas função interna (não exportada). Usada apenas dentro de `detectSpoofedIP`.
**Observação:** Função auxiliar necessária — não é código morto, mas poderia ser documentada.

### 8.2 `lib/api/index.js` — barrel incompleto
**Status:** Não exporta `helpers`, `utils`, `adminCrudHandler`.
**Observação:** Conforme análise anterior, é intencional. Consumidores importam diretamente.

### 8.3 `lib/domain/musicas.js` — alias `musicas` em `getPaginatedMusicas`
**Status:** Retorna `{ musicas, data, pagination }` onde `musicas === data`.
**Observação:** Intencional para compatibilidade com `AdminCrudBase`. Documentado no código.

### 8.4 `lib/infra/redis.js` — `redisExpire` sem fallback em memória
**Status:** Função é no-op quando Redis offline.
**Observação:** Documentado como comportamento aceitável — o `redisIncr` de fallback já define TTL.

### 8.5 `lib/domain/settings.js` — `getAllSettingsRaw`
**Status:** Função exportada sem evidência de uso externo óbvio.
**Observação:** Possível código morto — verificar consumidores antes de remover.

### 8.6 `lib/seo/config.js` — `contact` com campos vazios
**Status:** `phone`, `street`, `city`, `state`, `zipCode` são strings vazias.
**Observação:** Estrutura preparada para uso futuro; não é código morto, mas pode gerar Schema.org incompleto se consumido diretamente.

### 8.7 `lib/cache/cache.js` — `getCacheMetrics`
**Status:** Usada para diagnóstico interno (verificação em `withRateLimit`).
**Observação:** Ativa — usada para verificar `redisConnected` em produção.

---

## Resumo quantitativo

| Métrica | Total |
|---------|-------|
| Arquivos analisados | 26 |
| Seções no documento | 8 |
| Problemas de correção (Seção 5) | 15 |
| Melhorias recomendadas (Seção 6) | 10 |
| Duplicidades identificadas (Seção 7) | 6 |
| Possíveis códigos mortos (Seção 8) | 7 |
