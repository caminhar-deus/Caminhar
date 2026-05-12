# Relatório de Melhorias e Correções — `lib/`

> **Data do relatório:** 11/05/2026 (atualizado)
> **Objetivo:** Identificar duplicidades, problemas de performance, inconsistências e oportunidades de melhoria nos arquivos da pasta `lib/`. Nenhuma correção foi aplicada, apenas reportada.

---

## Sumário

1. [Duplicidades](#1-duplicidades)
   - [1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js](#11-middlewares-duplicados-entre-libmiddlewarejs-e-libapimiddlewarejs) — **RESOLVIDO**
   - [1.2 Três implementações de Rate Limit](#12-três-implementações-de-rate-limit) — **RESOLVIDO**
   - [1.3 Autenticação replicada em três locais](#13-autenticação-replicada-em-três-locais) — **RESOLVIDO**
   - [1.4 Função generateUUID duplicada](#14-função-generateuuid-duplicada) — **RESOLVIDO**
   - [1.5 Re-exports em db.js criam acoplamento](#15-re-exports-em-dbjs-criam-acoplamento) — **RESOLVIDO**
   - [1.6 Tratamento de erros em dois padrões diferentes](#16-tratamento-de-erros-em-dois-padrões-diferentes) — **PENDENTE**
2. [Performance](#2-performance)
   - [2.1 Verificação O(n) em Map.size no cache.js](#21-verificação-on-em-mapsize-no-cachejs)
   - [2.2 Cálculo de posição com race condition em videos.js](#22-cálculo-de-posição-com-race-condition-em-videosjs)
   - [2.3 setInterval sem cleanup em cache.js e api/middleware.js](#23-setinterval-sem-cleanup-em-cachejs-e-apimiddlewarejs) — **RESOLVIDO**
   - [2.4 Pool PostgreSQL recriado sem validação de saúde](#24-pool-postgresql-recriado-sem-validação-de-saúde)
   - [2.5 clearAllCache silencia erros do Redis](#25-clearallcache-silencia-erros-do-redis)
   - [2.6 Promises.all sem tratamento de erro parcial em reorderVideos](#26-promisesall-sem-tratamento-de-erro-parcial-em-reordervideos)
3. [Segurança](#3-segurança)
   - [3.1 JWT_SECRET com fallback inseguro em auth.js](#31-jwt_secret-com-fallback-inseguro-em-authjs) — **RESOLVIDO**
   - [3.2 CORS com origem '*' por padrão](#32-cors-com-origem--por-padrão)
   - [3.3 AdminUsername/Password podem vazar em logs de inicialização](#33-adminusernamepassword-podem-vazar-em-logs-de-inicialização)
   - [3.4 Rate limit local não protege contra DDoS real](#34-rate-limit-local-não-protege-contra-ddos-real)
4. [Inconsistências de Código](#4-inconsistências-de-código)
   - [4.1 validateParams usa req.query em vez de req.params](#41-validateparams-usa-reqquery-em-vez-de-reqparams)
   - [4.2 parseImages em localização incorreta (seo/helpers)](#42-parseimages-em-localização-incorreta-seohelpers)
   - [4.3 Mistura de idiomas em JSDoc (português/inglês)](#43-mistura-de-idiomas-em-jsdoc-portuguêsinglês)
   - [4.4 createVideo não aceita options (diferente de outras entidades)](#44-createvideo-não-aceita-options-diferente-de-outras-entidades)
   - [4.5 Nomenclatura inconsistente em getPublicPaginatedVideos](#45-nomenclatura-inconsistente-em-getpublicpaginatedvideos)
   - [4.6 getRecentPosts em posts.js versus getPaginatedPosts](#46-getrecentposts-em-postssj-versus-getpaginatedposts)
5. [Manutenibilidade](#5-manutenibilidade)
   - [5.1 Ausência de reorder em musicas.js e posts.js](#51-ausência-de-reorder-em-musicasjs-e-postssj)
   - [5.2 Logging inconsistente entre módulos](#52-logging-inconsistente-entre-módulos)
   - [5.3 cleanCache com FLUSHDB agressivo sem confirmação](#53-clearcache-com-flushdb-agressivo-sem-confirmação)
   - [5.4 settings.js com getSettings e getAllSettings confusos](#54-settingsjs-com-getsettings-e-getallsettings-confusos)
   - [5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses)](#55-cachemetrics-nunca-é-incrementado-redishitsredismisses) — **RESOLVIDO**
   - [5.6 Falta de validação de schema nos CRUDs genéricos](#56-falta-de-validação-de-schema-nos-cruds-genéricos)
6. [Possíveis Bugs](#6-possíveis-bugs)
   - [6.1 NotFoundError com formatação condicional incorreta](#61-notfounderror-com-formatação-condicional-incorreta) — **RESOLVIDO**
   - [6.2 rateLimitMiddleware usa Map sem limite de crescimento](#62-ratelimitmiddleware-usa-map-sem-limite-de-crescimento)
   - [6.3 withRateLimit em api cria Map novo a cada chamada](#63-withratelimit-em-api-cria-map-novo-a-cada-chamada) — **RESOLVIDO**
   - [6.4 cacheMetrics.redisErrors incrementado mas nunca exposto em getCacheMetrics](#64-cachemetricsrediserros-incrementado-mas-nunca-exposto)
7. [Testes e Cobertura](#7-testes-e-cobertura)
   - [7.1 Ausência de testes para a camada lib/api](#71-ausência-de-testes-para-a-camada-libapi)
   - [7.2 cache.js sem testes de fallback](#72-cachejs-sem-testes-de-fallback)

---

## 1. Duplicidades

### 1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js — **RESOLVIDO**

**Arquivos:** `lib/middleware.js` (219 linhas) vs `lib/api/middleware.js` (486 linhas)

**O que foi feito:**
- `lib/middleware.js` foi marcado como **depreciado** com comentário `@deprecated` e guia de migração no topo do arquivo.
- Cada função exportada foi marcada individualmente com `@deprecated` indicando o equivalente em `lib/api/middleware.js`.
- `lib/api/middleware.js` recebeu melhorias no `withRateLimit` (agora usa `checkRateLimit` de `cache.js`) e exporta `cleanupTimers()`.
- `pages/api/upload-image.js` foi migrado de `externalAuthMiddleware` para `withAuth` (lib/auth.js).
- `authenticatedApiMiddleware` e `externalAuthMiddleware` foram removidos de `lib/middleware.js`.

---

### 1.2 Três implementações de Rate Limit — **RESOLVIDO**

**Arquivos:** `lib/cache.js` (checkRateLimit), `lib/middleware.js` (rateLimitMiddleware), `lib/api/middleware.js` (withRateLimit)

**O que foi feito:**
- `withRateLimit` em `lib/api/middleware.js` foi refatorado para usar `checkRateLimit` de `lib/cache.js` em vez do seu próprio `Map` local.
- `checkRateLimit` em `lib/cache.js` foi enriquecido com suporte a `limit` como função dinâmica.
- Agora existe apenas **uma** implementação efetiva de rate limit: `checkRateLimit` em `cache.js`.
- `rateLimitMiddleware` em `middleware.js` está depreciado.
- `withRateLimit` em `api/middleware.js` delega para `cache.js`.

---

### 1.3 Autenticação replicada em três locais — **RESOLVIDO**

**Arquivos:** `lib/auth.js` (withAuth), `lib/middleware.js` (externalAuthMiddleware, authenticatedApiMiddleware), `lib/api/middleware.js` (withAuth, withOptionalAuth)

**O que foi feito:**
- `pages/api/upload-image.js` foi migrado de `externalAuthMiddleware` (lib/middleware.js) para `withAuth` (lib/auth.js).
- `authenticatedApiMiddleware` e `externalAuthMiddleware` foram **removidos** de `lib/middleware.js`.
- O import de `auth.js` em `lib/middleware.js` foi removido (não era mais necessário).
- Agora existem apenas **2 implementações** de `withAuth`:
  - `lib/auth.js`: `withAuth(handler)` — versão simples, atende 11 consumidores
  - `lib/api/middleware.js`: `withAuth(options)` — factory com suporte a roles
- Nenhum consumidor de `lib/middleware.js` para funcionalidades de autenticação.

---

### 1.4 Função generateUUID duplicada — **RESOLVIDO**

**Arquivos:** `lib/api/errors.js` e `lib/api/response.js`

**O que foi feito:**
- Criado `lib/api/utils.js` com as funções `generateUUID()` e `generateMeta()`.
- `lib/api/errors.js` agora importa `generateUUID` de `./utils.js`.
- `lib/api/response.js` agora importa `generateUUID` e `generateMeta` de `./utils.js`.
- As implementações locais foram removidas de ambos os arquivos.

---

### 1.5 Re-exports em db.js criam acoplamento — **RESOLVIDO**

**Arquivo:** `lib/db.js` (linhas 175-178)

**O que foi feito:**
- As 4 linhas de re-export foram removidas e substituídas por comentário indicando os módulos de origem.
- Todos os consumidores foram atualizados para importar diretamente dos módulos de origem:
  - `pages/api/admin/users.js` → `createRecord`, `updateRecords`, `deleteRecords` de `../../lib/crud`; `logActivity` de `../../lib/domain/audit`
  - `pages/api/admin/roles.js` → mesmo padrão
  - `pages/api/products.js` → mesmo padrão
  - `pages/api/admin/dicas.js` → `logActivity` de `../../lib/domain/audit`
  - `pages/api/v1/settings.js` → `getSetting`, `setSetting`, `getAllSettings` de `../../lib/domain/settings`
  - `pages/api/upload-image.js` → `updateSetting` de `../../lib/domain/settings`
  - `pages/api/placeholder-image.js` → `getSetting` de `../../lib/domain/settings`
  - `pages/api/v1/posts.js` → `createPost` de `../../lib/domain/posts`
  - `pages/api/v1/videos/[id].js` → `updateVideo`, `deleteVideo` de `../../lib/domain/videos`
- A dependência circular potencial (posts.js → db.js → posts.js) foi eliminada.

---

### 1.6 Tratamento de erros em dois padrões diferentes — **PENDENTE**

**Arquivos:** `lib/middleware.js` (errorHandlingMiddleware) e `lib/api/response.js` (handleError)

**Status:** Não foram feitas alterações. O `errorHandlingMiddleware` em `middleware.js` está depreciado. Quando `middleware.js` for removido, o `handleError` em `response.js` prevalecerá como único padrão.

---

## 2. Performance

### 2.1 Verificação O(n) em Map.size no cache.js

**Arquivo:** `lib/cache.js` (linhas 33, 147)

**Status:** Não foram feitas alterações. `Map.size` é O(1) na maioria dos engines modernos.

---

### 2.2 Cálculo de posição com race condition em videos.js

**Arquivo:** `lib/domain/videos.js` (linhas 112-113)

**Status:** Não foram feitas alterações.

---

### 2.3 setInterval sem cleanup em cache.js e api/middleware.js — **RESOLVIDO**

**Arquivos:** `lib/cache.js` (linha 16), `lib/api/middleware.js` (linha 194)

**O que foi feito:**
- `lib/cache.js`: O timer do `setInterval` agora é armazenado na variável `cleanupTimer`. Exportada a função `cleanupRateLimitTimer()` que limpa o timer (para uso em testes).
- `lib/api/middleware.js`: Adicionada função `cleanupTimers()` que percorre `activeTimers` e limpa todos. O `setInterval` anterior (que não tinha referência) foi removido, já que o `withRateLimit` agora delega para `checkRateLimit` de `cache.js` (que já tem seu próprio cleanup).

---

### 2.4 Pool PostgreSQL recriado sem validação de saúde

**Arquivo:** `lib/db.js` (linhas 8-23)

**Status:** Não foram feitas alterações.

---

### 2.5 clearAllCache silencia erros do Redis

**Arquivo:** `lib/cache.js` (linhas 111-123)

**Status:** Não foram feitas alterações.

---

### 2.6 Promises.all sem tratamento de erro parcial em reorderVideos

**Arquivo:** `lib/domain/videos.js` (linhas 147-152)

**Status:** Não foram feitas alterações.

---

## 3. Segurança

### 3.1 JWT_SECRET com fallback inseguro em auth.js — **RESOLVIDO**

**Arquivo:** `lib/auth.js` (linha 11)

**O que foi feito:**
- Agora verifica se `process.env.JWT_SECRET` está definido.
- Em **produção**, lança erro se não estiver definido.
- Em **desenvolvimento**, usa fallback com aviso explícito no console.
- A variável de fallback foi renomeada para `JWT_SECRET_OR_FALLBACK` para clareza.

---

### 3.2 CORS com origem '*' por padrão

**Arquivo:** `lib/middleware.js` (linha 7)

**Status:** Não foram feitas alterações. O middleware está depreciado. O `withCors` em `api/middleware.js` também usa `['*']` como padrão, mas é configurável.

---

### 3.3 AdminUsername/Password podem vazar em logs de inicialização

**Arquivo:** `lib/auth.js` (linhas 148-157)

**Status:** Não foram feitas alterações.

---

### 3.4 Rate limit local não protege contra DDoS real

**Arquivos:** `lib/cache.js`, `lib/middleware.js`, `lib/api/middleware.js`

**Status:** Não foram feitas alterações. O rate limit via Redis (`checkRateLimit` em `cache.js`) agora é a implementação padrão via `withRateLimit` em `api/middleware.js`, o que mitiga parcialmente o problema (persistência entre reinicializações).

---

## 4. Inconsistências de Código

### 4.1 validateParams usa req.query em vez de req.params

**Arquivo:** `lib/api/validate.js` (linha 132)

**Status:** Não foram feitas alterações.

---

### 4.2 parseImages em localização incorreta (seo/helpers)

**Arquivo:** `lib/seo/helpers.js`

**Status:** Não foram feitas alterações.

---

### 4.3 Mistura de idiomas em JSDoc (português/inglês)

**Arquivos:** Múltiplos

**Status:** Não foram feitas alterações.

---

### 4.4 createVideo não aceita options (diferente de outras entidades)

**Arquivos:** `lib/domain/videos.js` (createVideo) vs `lib/domain/musicas.js` (createMusica), `lib/domain/posts.js` (createPost)

**Status:** Não foram feitas alterações.

---

### 4.5 Nomenclatura inconsistente em getPublicPaginatedVideos

**Arquivo:** `lib/domain/videos.js`

**Status:** Não foram feitas alterações.

---

### 4.6 getRecentPosts em posts.js versus getPaginatedPosts

**Arquivo:** `lib/domain/posts.js`

**Status:** Não foram feitas alterações.

---

## 5. Manutenibilidade

### 5.1 Ausência de reorder em musicas.js e posts.js

**Arquivos:** `lib/domain/musicas.js`, `lib/domain/posts.js`

**Status:** Não foram feitas alterações.

---

### 5.2 Logging inconsistente entre módulos

**Arquivos:** Múltiplos

**Status:** Não foram feitas alterações.

---

### 5.3 clearAllCache com FLUSHDB agressivo sem confirmação

**Arquivo:** `lib/cache.js` (linhas 110-123)

**Status:** Não foram feitas alterações.

---

### 5.4 settings.js com getSettings e getAllSettings confusos

**Arquivo:** `lib/domain/settings.js`

**Status:** Não foram feitas alterações.

---

### 5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses) — **RESOLVIDO**

**Arquivo:** `lib/cache.js`

**O que foi feito:**
- `metrics.redisHits++` foi adicionado quando o cache Redis retorna dados (linha do cache hit).
- `metrics.redisMisses++` foi adicionado quando o cache Redis não tem dados (cache miss).
- `redisErrors` já era incrementado.

---

### 5.6 Falta de validação de schema nos CRUDs genéricos

**Arquivo:** `lib/crud.js`

**Status:** Não foram feitas alterações.

---

## 6. Possíveis Bugs

### 6.1 NotFoundError com formatação condicional incorreta — **RESOLVIDO**

**Arquivos:** `lib/api/errors.js` (linha 150), `lib/api/response.js` (linhas 293-295)

**O que foi feito:**
- Ambos os arquivos foram corrigidos para exibir corretamente o identificador:
  - Número: `"Música não encontrado (id: 123)"`
  - String: `"Usuário não encontrado 'admin'"`
- A lógica condicional anterior estava invertida: para números, o ID não era exibido.

---

### 6.2 rateLimitMiddleware usa Map sem limite de crescimento

**Arquivo:** `lib/middleware.js` (linhas 135-166)

**Status:** Não foram feitas alterações. O middleware está depreciado.

---

### 6.3 withRateLimit em api cria Map novo a cada chamada — **RESOLVIDO**

**Arquivo:** `lib/api/middleware.js` (linha 181)

**O que foi feito:**
- O `withRateLimit` foi refatorado para usar `checkRateLimit` de `cache.js` em vez de seu próprio `Map` local.
- O `Map` local e o `setInterval` de cleanup foram removidos de `withRateLimit`.

---

### 6.4 cacheMetrics.redisErrors incrementado mas nunca exposto em getCacheMetrics

**Arquivo:** `lib/cache.js`

**Status:** **Corrigido indiretamente.** `redisErrors` já era exposto em `getCacheMetrics()` através do spread `...metrics`. O problema real (itens 5.5 e 6.4) era que `redisHits` e `redisMisses` nunca eram incrementados — o que foi corrigido. `redisErrors` continua sendo incrementado e exposto corretamente.

---

## 7. Testes e Cobertura

### 7.1 Ausência de testes para a camada lib/api

**Descrição:** Os arquivos `lib/api/errors.js`, `lib/api/response.js`, `lib/api/validate.js` e `lib/api/middleware.js` totalizam ~1170 linhas de código, e não há testes unitários específicos para esses módulos.

**Status:** Não foram feitas alterações.

---

### 7.2 cache.js sem testes de fallback

**Descrição:** `lib/cache.js` tem lógica complexa de fallback (Redis → memória local) que não possui cobertura de testes específicos para:
- Falha de Redis com ativação de fallback
- Limpeza periódica do Map local
- Limpeza do Map quando excede 5000 entradas
- Rate limit com Redis vs sem Redis

**Status:** Não foram feitas alterações.