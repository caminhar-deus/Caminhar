# Relatório de Melhorias e Correções — `lib/`

> **Data do relatório:** 12/05/2026 (atualizado)
> **Objetivo:** Identificar duplicidades, problemas de performance, inconsistências e oportunidades de melhoria nos arquivos da pasta `lib/`. Nenhuma correção foi aplicada, apenas reportada.

---

## Sumário

1. [Duplicidades](#1-duplicidades)
   - [1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js](#11-middlewares-duplicados-entre-libmiddlewarejs-e-libapimiddlewarejs) — **RESOLVIDO**
   - [1.2 Três implementações de Rate Limit](#12-três-implementações-de-rate-limit) — **RESOLVIDO**
   - [1.3 Autenticação replicada em três locais](#13-autenticação-replicada-em-três-locais) — **RESOLVIDO**
   - [1.4 Função generateUUID duplicada](#14-função-generateuuid-duplicada) — **RESOLVIDO**
   - [1.5 Re-exports em db.js criam acoplamento](#15-re-exports-em-dbjs-criam-acoplamento) — **RESOLVIDO**
   - [1.6 Tratamento de erros em dois padrões diferentes](#16-tratamento-de-erros-em-dois-padrões-diferentes) — **RESOLVIDO**
2. [Performance](#2-performance)
   - [2.1 Verificação O(n) em Map.size no cache.js](#21-verificação-on-em-mapsize-no-cachejs)
   - [2.2 Cálculo de posição com race condition em videos.js](#22-cálculo-de-posição-com-race-condition-em-videosjs)
   - [2.3 setInterval sem cleanup em cache.js e api/middleware.js](#23-setinterval-sem-cleanup-em-cachejs-e-apimiddlewarejs) — **RESOLVIDO**
   - [2.4 Pool PostgreSQL recriado sem validação de saúde](#24-pool-postgresql-recriado-sem-validação-de-saúde)
   - [2.5 clearAllCache silencia erros do Redis](#25-clearallcache-silencia-erros-do-redis)
   - [2.6 Promises.all sem tratamento de erro parcial em reorderVideos](#26-promisesall-sem-tratamento-de-erro-parcial-em-reordervideos)
3. [Segurança](#3-segurança)
   - [3.1 JWT_SECRET com fallback inseguro em auth.js](#31-jwt_secret-com-fallback-inseguro-em-authjs) — **RESOLVIDO**
   - [3.2 CORS com origem '*' por padrão](#32-cors-com-origem--por-padrão) — **RESOLVIDO**
   - [3.3 AdminUsername/Password podem vazar em logs de inicialização](#33-adminusernamepassword-podem-vazar-em-logs-de-inicialização) — **RESOLVIDO**
   - [3.4 Rate limit local não protege contra DDoS real](#34-rate-limit-local-não-protege-contra-ddos-real) — **RESOLVIDO**
4. [Inconsistências de Código](#4-inconsistências-de-código)
   - [4.1 validateParams usa req.query em vez de req.params](#41-validateparams-usa-reqquery-em-vez-de-reqparams)
   - [4.2 parseImages em localização incorreta (seo/helpers)](#42-parseimages-em-localização-incorreta-seohelpers)
   - [4.3 Mistura de idiomas em JSDoc (português/inglês)](#43-mistura-de-idiomas-em-jsdoc-portuguêsinglês)
   - [4.4 createVideo não aceita options (diferente de outras entidades)](#44-createvideo-não-aceita-options-diferente-de-outras-entidades)
   - [4.5 Nomenclatura inconsistente em getPublicPaginatedVideos](#45-nomenclatura-inconsistente-em-getpublicpaginatedvideos)
   - [4.6 getRecentPosts em posts.js versus getPaginatedPosts](#46-getrecentposts-em-postssj-versus-getpaginatedposts)
5. [Manutenibilidade](#5-manutenibilidade)
   - [5.1 Ausência de reorder em musicas.js e posts.js](#51-ausência-de-reorder-em-musicasjs-e-postssj) — **RESOLVIDO**
   - [5.2 Logging inconsistente entre módulos](#52-logging-inconsistente-entre-módulos) — **RESOLVIDO**
   - [5.3 cleanCache com FLUSHDB agressivo sem confirmação](#53-clearcache-com-flushdb-agressivo-sem-confirmação) — **RESOLVIDO**
   - [5.4 settings.js com getSettings e getAllSettings confusos](#54-settingsjs-com-getsettings-e-getallsettings-confusos) — **RESOLVIDO**
   - [5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses)](#55-cachemetrics-nunca-é-incrementado-redishitsredismisses) — **RESOLVIDO**
   - [5.6 Falta de validação de schema nos CRUDs genéricos](#56-falta-de-validação-de-schema-nos-cruds-genéricos) — **RESOLVIDO**
6. [Possíveis Bugs](#6-possíveis-bugs)
   - [6.1 NotFoundError com formatação condicional incorreta](#61-notfounderror-com-formatação-condicional-incorreta) — **RESOLVIDO**
   - [6.2 rateLimitMiddleware usa Map sem limite de crescimento](#62-ratelimitmiddleware-usa-map-sem-limite-de-crescimento)
   - [6.3 withRateLimit em api cria Map novo a cada chamada](#63-withratelimit-em-api-cria-map-novo-a-cada-chamada) — **RESOLVIDO**
   - [6.4 cacheMetrics.redisErrors incrementado mas nunca exposto em getCacheMetrics](#64-cachemetricsrediserros-incrementado-mas-nunca-exposto) — **RESOLVIDO**
7. [Novas Funcionalidades](#7-novas-funcionalidades)
   - [7.1 Criação de lib/api/adminCrudHandler.js](#71-criação-de-libapiadmincrudhandlerjs--factory-de-handlers-crud-para-admin)
   - [7.2 Criação de authenticateAndGenerateToken em lib/auth.js](#72-criação-de-authenticatemdgenerateToken-em-libauthjs)
8. [Testes e Cobertura](#8-testes-e-cobertura)
   - [8.1 Ausência de testes para a camada lib/api](#81-ausência-de-testes-para-a-camada-libapi)
   - [8.2 cache.js sem testes de fallback](#82-cachejs-sem-testes-de-fallback)

---

## 1. Duplicidades

### 1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js — **RESOLVIDO**

**Arquivos:** `lib/middleware.js` (removido) vs `lib/api/middleware.js` (477 linhas)

**O que foi feito:**
- `lib/middleware.js` foi **removido** do projeto. O arquivo não existe mais.
- Todas as funcionalidades foram migradas para `lib/api/middleware.js`.
- `lib/api/middleware.js` recebeu melhorias no `withRateLimit` (agora usa `checkRateLimit` de `cache.js`) e exporta `cleanupTimers()`.
- `pages/api/upload-image.js` foi migrado de `externalAuthMiddleware` para `withAuth` (lib/auth.js).
- Dependência `cors` removida do `package.json` (era usada apenas por `lib/middleware.js`).

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

### 1.6 Tratamento de erros em dois padrões diferentes — **RESOLVIDO**

**Arquivos:** `lib/middleware.js` (errorHandlingMiddleware, removido) e `lib/api/response.js` (handleError)

**O que foi feito:**
- `lib/middleware.js` foi removido, eliminando o `errorHandlingMiddleware`.
- O `handleError` de `lib/api/response.js` agora é o único padrão de tratamento de erros.
- O `withErrorHandler` de `lib/api/middleware.js` delega para `handleError`.

---

## 2. Performance

### 2.1 Iteração O(n) no setInterval e clear() agressivo no cache.js — **RESOLVIDO**

**Arquivo:** `lib/cache.js`

**Problema original documentado:** `Map.size` é O(1) e não havia problema real ali.

**Problema real identificado durante análise:**
1. **Iteração O(n) no `setInterval`** (antigas linhas 23-28): O timer de limpeza percorria TODAS as entradas do `localRateLimitMap` a cada 60 segundos, mesmo quando o Map estava vazio ou com poucas entradas expiradas. Com 5000 entradas, eram 5000 iterações/minuto desnecessárias.
2. **`clear()` agressivo** (antigas linhas 36-38 e 168): Quando o Map atingia 5000 entradas, `localRateLimitMap.clear()` descartava TODO o tracking de rate limit acumulado para todos os IPs, perdendo dados legítimos durante picos.

**O que foi feito:**
- Substituída a iteração completa do `setInterval` por **lazy eviction**: o expurgo de entradas expiradas agora é feito sob demanda dentro de `checkInMemory()`, apenas quando a chave específica é acessada.
- O `setInterval` foi mantido apenas como **safety net** para evitar growth infinito, mas agora atua de forma seletiva:
  - Remove apenas entradas com mais de 120s, interrompendo ao atingir margem segura de 4000 entradas.
  - Se ainda restarem entradas excedentes, ordena por `startTime` e remove apenas as mais antigas (lazy eviction).
- Substituído `clear()` em `checkInMemory()` por **delete seletivo**: quando o Map excede 5000 entradas, remove apenas a entrada mais antiga via `entries().next()`.
- Adicionado lazy eviction da chave atual: verifica se a entrada existe e expirou antes de processar, fazendo `delete` da chave específica.

---

### 2.2 Cálculo de posição com race condition em videos.js — **RESOLVIDO**

**Arquivo:** `lib/domain/videos.js` (linhas 112-114)

**O que foi feito:**
- A lógica de `SELECT MAX(position)` + `INSERT` agora é executada dentro de uma transação (`transaction()`).
- O `SELECT MAX(position)` utiliza o `client` da transação, garantindo isolamento entre chamadas concorrentes.
- O `createRecord` também recebe `{ client }`, mantendo toda a operação atômica.
- Elimina race condition onde duas chamadas simultâneas podiam ler o mesmo `MAX(position)` e atribuir a mesma posição.

---

### 2.3 setInterval sem cleanup em cache.js e api/middleware.js — **RESOLVIDO**

**Arquivos:** `lib/cache.js` (linha 16), `lib/api/middleware.js` (linha 194)

**O que foi feito:**
- `lib/cache.js`: O timer do `setInterval` agora é armazenado na variável `cleanupTimer`. Exportada a função `cleanupRateLimitTimer()` que limpa o timer (para uso em testes).
- `lib/api/middleware.js`: Adicionada função `cleanupTimers()` que percorre `activeTimers` e limpa todos. O `setInterval` anterior (que não tinha referência) foi removido, já que o `withRateLimit` agora delega para `checkRateLimit` de `cache.js` (que já tem seu próprio cleanup).

---

### 2.4 Pool PostgreSQL recriado sem validação de saúde — **RESOLVIDO**

**Arquivo:** `lib/db.js` (linhas 8-23)

**O que foi feito:**
- Extraída a criação do pool para a função `createPool()`, que retorna um novo `Pool`.
- Adicionado handler para o evento `error` do pool que, em caso de erro fatal, tenta fechar o pool defeituoso e reseta a referência (`pool = null`) para que o próximo `getPool()` crie um novo.
- `resetPool()` foi aprimorado: agora limpa o `healthCheckTimer`, remove listeners de erro e fecha o pool antigo com `.end()`.
- Variável `healthCheckTimer` adicionada (preparada para health check periódico futuro).

---

### 2.5 clearAllCache silencia erros do Redis — **RESOLVIDO**

**Arquivo:** `lib/cache.js` (linhas 111-123)

**O que foi feito:**
- `clearAllCache()` agora retorna `{ success: true }` em caso de sucesso.
- Em caso de falha do Redis, incrementa `metrics.redisErrors` e retorna `{ success: false, error: error.message }`.
- O chamador agora tem visibilidade do resultado da operação e pode decidir como reagir.
- O `metrics.redisErrors` continua sendo exposto via `getCacheMetrics()`.

---

### 2.6 Promises.all sem tratamento de erro parcial em reorderVideos — **RESOLVIDO**

**Arquivo:** `lib/domain/videos.js` (linhas 147-152)

**O que foi feito:**
- Substituído `Promise.all` por `Promise.allSettled` para capturar falhas individuais sem rejeição abrupta.
- Adicionada lógica que identifica e loga cada `item.id` e `item.position` que falhou, com a mensagem de erro original.
- Após logar todas as falhas, relança o erro da primeira falha para acionar o ROLLBACK da transação.
- Garante que o administrador saiba exatamente qual vídeo causou o problema.

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

### 3.2 CORS com origem '*' por padrão — **RESOLVIDO**

**Arquivo:** `lib/api/middleware.js` (função `withCors`)

**O que foi feito:**
- Em **produção**, o padrão de `origins` foi alterado de `['*']` para usar `process.env.ALLOWED_ORIGINS` (split por vírgula).
- Se `ALLOWED_ORIGINS` não estiver definido, retorna um array vazio `[]`, impedindo CORS aberto.
- Adicionado `console.warn()` em produção alertando sobre a necessidade de configurar `ALLOWED_ORIGINS`.
- Em **desenvolvimento**, mantém o padrão `['*']` para facilitar testes locais.
- Quando `origins` é explicitamente passado como parâmetro, o valor passado é respeitado (sem override automático).

---

### 3.3 AdminUsername/Password podem vazar em logs de inicialização — **RESOLVIDO**

**Arquivo:** `lib/auth.js` (função `initializeAuth`, linhas 164, 166, 170)

**O que foi feito:**
- Substituídos os `console.log` que expunham o `adminUsername` nas mensagens de criação, existência e atualização de role:
  - `Admin user '${adminUsername}' created successfully` → `Admin user created successfully`
  - `Admin user '${adminUsername}' already exists` → `Admin user already exists`
  - `Admin user '${adminUsername}' role updated to 'admin'` → `Admin user role updated to admin`
- O nome de usuário admin não é mais exposto nos logs de inicialização, mitigando vazamento de informações via sistemas de log (CloudWatch, ELK, etc.).

---

### 3.4 Rate limit local não protege contra DDoS real — **RESOLVIDO**

**Arquivos:** `lib/cache.js`, `lib/api/middleware.js`

**O que foi feito:**
- **`lib/cache.js`** (linha 163): Removido `'unknown'` da whitelist permanente de IPs. Antes, qualquer requisição com IP `'unknown'` (ex: quando `x-forwarded-for` não está presente) passava sem rate limit. Agora IPs não identificados são rate-limited normalmente.
- **`lib/api/middleware.js`** (função `withRateLimit`): Adicionada validação que alerta via `console.warn()` quando o Redis não está disponível em produção, orientando o desenvolvedor a configurar as variáveis de ambiente necessárias.
- O rate limit via Redis (`checkRateLimit` em `cache.js`) já era a implementação padrão via `withRateLimit`. Agora há visibilidade quando o fallback em memória está sendo usado em produção.

---

## 4. Inconsistências de Código

### 4.1 validateParams usa req.query em vez de req.params — **RESOLVIDO**

**Arquivo:** `lib/api/validate.js`

**O que foi feito:**
- `validateParams` agora extrai **apenas as chaves definidas no schema** do `req.query`, evitando que query strings extras contaminem a validação dos parâmetros de rota.
- A lógica percorre as chaves do schema (`schema.shape`) e filtra apenas os campos esperados antes de passar pelo `schema.parse()`.
- A mesma correção foi aplicada ao `validateRequest` para a validação combinada de `schemas.params`.

---

### 4.2 parseImages em localização incorreta (seo/helpers) — **RESOLVIDO**

**Arquivo:** `lib/seo/helpers.js` → `lib/api/utils.js`

**O que foi feito:**
- A função `parseImages` foi **movida** para `lib/api/utils.js`, onde faz mais sentido semanticamente (utilitário de dados, não de SEO).
- O import em `components/Features/Products/ProductCard.js` foi atualizado de `../../../lib/seo/helpers` para `../../../lib/api/utils`.
- O arquivo `lib/seo/helpers.js` foi **removido** do projeto (não há mais re-export).

---

### 4.3 Mistura de idiomas em JSDoc (português/inglês) — **RESOLVIDO**

**Arquivos:** `lib/domain/videos.js`, `lib/domain/musicas.js`, `lib/domain/posts.js`

**O que foi feito:**
- Todos os JSDocs em inglês foram convertidos para **português** nos 3 arquivos de domínio, seguindo o padrão já estabelecido em `lib/api/validate.js`.
- O padrão adotado:
  - Descrições das funções em português (`Retorna vídeos paginados.`, `Cria um novo post.`)
  - Parâmetros documentados em português com tipos preservados
  - Comentários internos (não-JSDoc) também padronizados para português

---

### 4.4 createVideo não aceita options (diferente de outras entidades) — **RESOLVIDO**

**Arquivos:** `lib/domain/videos.js` (createVideo)

**O que foi feito:**
- `createVideo(videoData)` foi alterado para `createVideo(videoData, options = {})`, alinhando-se ao padrão de `createMusica` e `createPost`.
- O `options` é repassado ao `createRecord` dentro da transação via `{ ...options, client }`, garantindo que opções extras (ex: `{ client }` para transações já existentes) sejam preservadas.
- A transação interna continua sendo usada para o cálculo de `MAX(position)`, mas agora aceita e propaga o `options` recebido.

---

### 4.5 Nomenclatura inconsistente em getPublicPaginatedVideos — **RESOLVIDO**

**Arquivo:** `lib/domain/videos.js`

**O que foi feito:**
- Criada função interna `_paginateVideos({ page, limit, search, publishedOnly })` para centralizar a lógica de paginação.
- `getPaginatedVideos` agora aceita `publishedOnly` como 4º parâmetro (mesmo padrão de `musicas.js:getPaginatedMusicas`), delegando para `_paginateVideos`.
- `getPublicPaginatedVideos` mantida como alias público que chama `getPaginatedVideos(page, limit, search, true)` para compatibilidade com consumidores existentes.
- Nomenclatura padronizada entre `videos.js`, `musicas.js` e `posts.js` — todos agora usam um padrão consistente com parâmetro `publishedOnly`.

---

### 4.6 getRecentPosts em posts.js versus getPaginatedPosts — **RESOLVIDO**

**Arquivo:** `lib/domain/posts.js`

**O que foi feito:**
- Criada função interna `_paginatePosts({ page, limit, search, publishedOnly, searchContent })` para centralizar a lógica de paginação.
- `getRecentPosts` foi refatorado para delegar a `_paginatePosts` com `publishedOnly: true` e `searchContent: true`.
- `getPaginatedPosts` foi refatorado para delegar a `_paginatePosts` com `publishedOnly: false` e `searchContent: false`.
- A ordenação agora é consistente: ambas usam `ORDER BY position ASC, created_at DESC`.
- A assinatura de `getRecentPosts` foi mantida como `(limit, page, search)` para compatibilidade com consumidores existentes.

---

## 5. Manutenibilidade

### 5.1 Ausência de reorder em musicas.js e posts.js — **RESOLVIDO**

**Arquivos:** `lib/domain/musicas.js`, `lib/domain/posts.js`

**O que foi feito:**
- Criada função `reorderMusicas(items)` em `lib/domain/musicas.js` seguindo o mesmo padrão de `reorderVideos`.
- Criada função `reorderPosts(items)` em `lib/domain/posts.js` seguindo o mesmo padrão de `reorderVideos`.
- Ambas utilizam `transaction()` com `Promise.allSettled` para capturar falhas parciais.
- Falhas individuais são logadas com `item.id` e `item.position` exatos.
- O erro da primeira falha é relançado para acionar o ROLLBACK da transação.
- Importação de `transaction` adicionada em `musicas.js`.

---

### 5.2 Logging inconsistente entre módulos — **RESOLVIDO**

**Arquivos:** `lib/auth.js`, `lib/cache.js`, `lib/db.js`, `lib/redis.js`, `lib/domain/videos.js`, `lib/domain/musicas.js`, `lib/domain/posts.js`, `lib/crud.js`

**O que foi feito:**
- **Padronização de prefixos**: Todos os módulos agora usam prefixo `[NomeDoModulo]` em todas as mensagens de console:
  - `[Auth]` — lib/auth.js
  - `[Cache]` — lib/cache.js
  - `[DB]` — lib/db.js
  - `[Redis]` — lib/redis.js
  - `[Videos]` — lib/domain/videos.js
  - `[Musicas]` — lib/domain/musicas.js
  - `[Posts]` — lib/domain/posts.js
  - `[CRUD]` — lib/crud.js
- **Padronização de emojis**: 
  - ⚠️ exclusivo para `console.warn` (avisos)
  - ❌ exclusivo para `console.error` (erros)
  - ✅ e ℹ️ para `console.log` (informativos)
- **Idioma único português**: Todas as mensagens em inglês foram convertidas para português:
  - `'Admin user created successfully'` → `'[Auth] Usuário admin criado com sucesso'`
  - `'Admin user already exists'` → `'[Auth] Usuário admin já existe'`
  - `'Admin user role updated to admin'` → `'[Auth] Role do usuário admin atualizada para admin'`
  - `'Error initializing auth system:'` → `'[Auth] ❌ Erro ao inicializar sistema de autenticação:'`
- **Mensagens dinâmicas**: Template literals (`` `...${var}` ``) foram convertidos para concatenação com `+` para consistência visual com o prefixo.

---

### 5.3 clearAllCache com FLUSHDB agressivo sem confirmação — **RESOLVIDO**

**Arquivo:** `lib/cache.js` (linhas 110-123)

**O que foi feito:**
- `clearAllCache()` agora aceita um parâmetro `options = {}` com a opção `confirm`.
- Se `{ confirm: true }` não for passado, a função lança erro com mensagem explícita orientando o desenvolvedor.
- Isso evita que FLUSHDB seja executado acidentalmente, protegendo outras aplicações que compartilham a mesma instância Redis.

---

### 5.4 settings.js com getSettings e getAllSettings confusos — **RESOLVIDO**

**Arquivo:** `lib/domain/settings.js`

**O que foi feito:**
- `getAllSettings()` foi renomeado para `getAllSettingsRaw()`, deixando claro que retorna registros completos em array.
- Todos os JSDocs foram convertidos de inglês para português, seguindo o padrão estabelecido no item 4.3.
- O consumidor `pages/api/v1/settings.js` foi atualizado para importar e usar `getAllSettingsRaw`.

---

### 5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses) — **RESOLVIDO**

**Arquivo:** `lib/cache.js`

**O que foi feito:**
- `metrics.redisHits++` foi adicionado quando o cache Redis retorna dados (linha do cache hit).
- `metrics.redisMisses++` foi adicionado quando o cache Redis não tem dados (cache miss).
- `redisErrors` já era incrementado.

---

### 5.6 Falta de validação de schema nos CRUDs genéricos — **RESOLVIDO**

**Arquivo:** `lib/crud.js`

**O que foi feito:**
- Criado o mapa `tableSchemas` com os campos permitidos para cada tabela: musicas, posts, videos, settings, audit_log, roles, users, dicas, products.
- Criada a função interna `_filterAllowedFields(table, data)` que filtra campos do objeto de dados permitindo apenas campos do schema.
- `createRecord`, `updateRecords` e `upsertRecord` agora filtram os dados recebidos antes de montar a query SQL.
- Campos não pertencentes ao schema são ignorados com um aviso no console.
- Tabelas não mapeadas continuam operando sem filtro para compatibilidade retroativa.

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

**Arquivo:** `lib/middleware.js` (removido)

**Status:** **Resolvido indiretamente.** O arquivo `lib/middleware.js` foi removido. O rate limit agora é tratado exclusivamente pelo `withRateLimit` em `lib/api/middleware.js` que usa `checkRateLimit` de `cache.js` (Redis + fallback em memória com limpeza periódica).

---

### 6.3 withRateLimit em api cria Map novo a cada chamada — **RESOLVIDO**

**Arquivo:** `lib/api/middleware.js` (linha 181)

**O que foi feito:**
- O `withRateLimit` foi refatorado para usar `checkRateLimit` de `cache.js` em vez de seu próprio `Map` local.
- O `Map` local e o `setInterval` de cleanup foram removidos de `withRateLimit`.

---

### 6.4 cacheMetrics.redisErrors incrementado mas nunca exposto em getCacheMetrics — **RESOLVIDO**

**Arquivo:** `lib/cache.js`

**O que foi feito:**
- `redisErrors` sempre foi exposto em `getCacheMetrics()` através do spread `...metrics`, portanto nunca houve o problema de "não exposto".
- O problema real (itens 5.5 e 6.4) era que `redisHits` e `redisMisses` nunca eram incrementados — o que foi corrigido no item 5.5.
- Adicionado `metrics.redisErrors++` no bloco `catch` do `redis.set()` (erro de escrita), que era o único local onde o erro não era contabilizado. Agora as 3 operações críticas registram erros: `redis.get()`, `redis.set()` e `redis.flushdb()`.

---

## 7. Novas Funcionalidades

### 7.1 Criação de `lib/api/adminCrudHandler.js` — Factory de handlers CRUD para admin

**Arquivo:** `lib/api/adminCrudHandler.js` (197 linhas)

**O que foi criado:**
- Função `createAdminHandler(config)` que centraliza o boilerplate comum a todos os endpoints administrativos.
- Verificação de método HTTP com resposta 405 padronizada.
- Autenticação via `withAuth` do `lib/auth.js`.
- RBAC com suporte a `requireAdmin` (role `admin`) e verificação de permissão específica na tabela `roles`.
- Rate limiting em mutações (POST/PUT/DELETE) via `checkRateLimit`.
- Invalidação automática de cache em mutações bem-sucedidas.
- Injeção de `req.adminUtils` com funções `logActivity()` e `invalidateCache()`.
- Try/catch unificado com resposta de erro padronizada.

**Observação:** O handler final é envolvido por `withAuth`. Em caso de erro na tabela `roles` (inexistente), permite apenas usuários com role `admin`.

---

### 7.2 Criação de `authenticateAndGenerateToken` em `lib/auth.js`

**Arquivo:** `lib/auth.js`

**O que foi criado:**
- Função `authenticateAndGenerateToken(username, password, ip, options)` que unifica a lógica de login usada pelo endpoint `/api/auth/login.js`.
- Inclui validação de entrada, rate limiting via `checkRateLimit` (padrão 5 tentativas/minuto), autenticação, atualização de `last_login_at`, busca de permissões do cargo e geração de token JWT.
- Retorna `{ user, token }` em sucesso ou `{ error, message }` em falha (RATE_LIMITED, INVALID_CREDENTIALS, MISSING_FIELDS).
- Elimina duplicação de lógica de login que existia anteriormente nos endpoints.

---

## 8. Testes e Cobertura

### 8.1 Ausência de testes para a camada lib/api

**Descrição:** Os arquivos `lib/api/errors.js`, `lib/api/response.js`, `lib/api/validate.js` e `lib/api/middleware.js` totalizam ~1170 linhas de código, e não há testes unitários específicos para esses módulos.

**Status:** Não foram feitas alterações.

---

### 8.2 cache.js sem testes de fallback

**Descrição:** `lib/cache.js` tem lógica complexa de fallback (Redis → memória local) que não possui cobertura de testes específicos para:
- Falha de Redis com ativação de fallback
- Limpeza periódica do Map local
- Limpeza do Map quando excede 5000 entradas
- Rate limit com Redis vs sem Redis

**Status:** Não foram feitas alterações.
