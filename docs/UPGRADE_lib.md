# Relatório de Melhorias e Correções — `lib/`

> **Data do relatório:** 10/05/2026
> **Objetivo:** Identificar duplicidades, problemas de performance, inconsistências e oportunidades de melhoria nos arquivos da pasta `lib/`. Nenhuma correção foi aplicada, apenas reportada.

---

## Sumário

1. [Duplicidades](#1-duplicidades)
   - [1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js](#11-middlewares-duplicados-entre-libmiddlewarejs-e-libapimiddlewarejs)
   - [1.2 Três implementações de Rate Limit](#12-três-implementações-de-rate-limit)
   - [1.3 Autenticação replicada em três locais](#13-autenticação-replicada-em-três-locais)
   - [1.4 Função generateUUID duplicada](#14-função-generateuuid-duplicada)
   - [1.5 Re-exports em db.js criam acoplamento](#15-re-exports-em-dbjs-criam-acoplamento)
   - [1.6 Tratamento de erros em dois padrões diferentes](#16-tratamento-de-erros-em-dois-padrões-diferentes)
2. [Performance](#2-performance)
   - [2.1 Verificação O(n) em Map.size no cache.js](#21-verificação-on-em-mapsize-no-cachejs)
   - [2.2 Cálculo de posição com race condition em videos.js](#22-cálculo-de-posição-com-race-condition-em-videosjs)
   - [2.3 setInterval sem cleanup em cache.js e api/middleware.js](#23-setinterval-sem-cleanup-em-cachejs-e-apimiddlewarejs)
   - [2.4 Pool PostgreSQL recriado sem validação de saúde](#24-pool-postgresql-recriado-sem-validação-de-saúde)
   - [2.5 clearAllCache silencia erros do Redis](#25-clearallcache-silencia-erros-do-redis)
   - [2.6 Promises.all sem tratamento de erro parcial em reorderVideos](#26-promisesall-sem-tratamento-de-erro-parcial-em-reordervideos)
3. [Segurança](#3-segurança)
   - [3.1 JWT_SECRET com fallback inseguro em auth.js](#31-jwt_secret-com-fallback-inseguro-em-authjs)
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
   - [5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses)](#55-cachemetrics-nunca-é-incrementado-redishitsredismisses)
   - [5.6 Falta de validação de schema nos CRUDs genéricos](#56-falta-de-validação-de-schema-nos-cruds-genéricos)
6. [Possíveis Bugs](#6-possíveis-bugs)
   - [6.1 NotFoundError com formatação condicional incorreta](#61-notfounderror-com-formatação-condicional-incorreta)
   - [6.2 rateLimitMiddleware usa Map sem limite de crescimento](#62-ratelimitmiddleware-usa-map-sem-limite-de-crescimento)
   - [6.3 withRateLimit em api cria Map novo a cada chamada](#63-withratelimit-em-api-cria-map-novo-a-cada-chamada)
   - [6.4 cacheMetrics.redisErrors incrementado mas nunca exposto em getCacheMetrics](#64-cachemetricsrediserros-incrementado-mas-nunca-exposto)
7. [Testes e Cobertura](#7-testes-e-cobertura)
   - [7.1 Ausência de testes para a camada lib/api](#71-ausência-de-testes-para-a-camada-libapi)
   - [7.2 cache.js sem testes de fallback](#72-cachejs-sem-testes-de-fallback)

---

## 1. Duplicidades

### 1.1 Middlewares duplicados entre lib/middleware.js e lib/api/middleware.js

**Arquivos:** `lib/middleware.js` (219 linhas) vs `lib/api/middleware.js` (486 linhas)

**Descrição:** Ambos implementam middlewares para autenticação (`withAuth` / `externalAuthMiddleware`), CORS (`cors` / `withCors`), rate limiting (`rateLimitMiddleware` / `withRateLimit`), tratamento de erros (`errorHandlingMiddleware` / `withErrorHandler`) e logging (`logger` / `withLogger`).

**Problema:** `lib/middleware.js` parece ser uma versão legada e mais simples, enquanto `lib/api/middleware.js` é mais moderna com sistema de composição (`composeMiddleware`). Manter ambas gera confusão sobre qual usar e duplica manutenção.

**Sugestão:** Depreciar `lib/middleware.js` e migrar seu uso para `lib/api/middleware.js`, que tem cobertura mais completa (timeout, body parser, cache, combinações prontas como `publicApi` e `protectedApi`).

---

### 1.2 Três implementações de Rate Limit

**Arquivos:** `lib/cache.js` (checkRateLimit), `lib/middleware.js` (rateLimitMiddleware), `lib/api/middleware.js` (withRateLimit)

**Comparativo:**

| Característica | cache.js | middleware.js | api/middleware.js |
|---|---|---|---|
| Armazenamento | Redis + fallback Map | Map local | Map local |
| IP whitelist | Sim (127.0.0.1, ::1, etc) | Não | Não |
| Limpeza periódica | A cada 1 minuto | Apenas sob demanda | A cada 5 minutos |
| Suporte a função dinâmica | Não | Não | Sim (maxRequests como função) |
| Headers informativos | Não | Não | Sim (X-RateLimit-Limit, X-RateLimit-Remaining) |

**Problema:** Três implementações diferentes sem um padrão unificado. A de `cache.js` é a mais robusta (Redis + fallback), mas não é usada pelos middlewares. As de `middleware.js` e `api/middleware.js` são conflitantes.

---

### 1.3 Autenticação replicada em três locais

**Arquivos:** `lib/auth.js` (withAuth), `lib/middleware.js` (externalAuthMiddleware, authenticatedApiMiddleware), `lib/api/middleware.js` (withAuth, withOptionalAuth)

**Descrição:** A lógica de verificação de token (extrair → verificar → anexar ao req) é repetida em:
- `lib/auth.js`: `withAuth(handler)` — protege handlers Next.js
- `lib/middleware.js`: `externalAuthMiddleware(handler)` — para APIs externas
- `lib/api/middleware.js`: `withAuth(options)` — composição moderna com roles

**Problema:** Além da duplicação, há diferenças sutis: `lib/auth.js` verifica apenas existência do token, enquanto `lib/api/middleware.js` também valida roles.

---

### 1.4 Função generateUUID duplicada

**Arquivos:** `lib/api/errors.js` (linha 16-22) e `lib/api/response.js` (linha 16-22)

**Descrição:** A mesma função `generateUUID` com implementação idêntica (geração de UUID v4 via regex) está copiada literalmente em ambos os arquivos.

**Sugestão:** Extrair para um utilitário compartilhado.

---

### 1.5 Re-exports em db.js criam acoplamento

**Arquivo:** `lib/db.js` (linhas 175-178)

```javascript
export { getSetting, updateSetting, setSetting, getAllSettings } from './domain/settings.js';
export { createRecord, updateRecords, deleteRecords } from './crud.js';
export { logActivity } from './domain/audit.js';
export { createPost, updatePost, deletePost, getPaginatedPosts, getRecentPosts, getAllPosts } from './domain/posts.js';
```

**Problema:** `db.js` (que deveria ser apenas gerenciamento de conexão) re-exporta funções de 4 módulos diferentes. Isso cria acoplamento desnecessário e polui o namespace. Além disso, cria uma dependência circular potencial (posts.js importa de `../db.js`, e `db.js` re-exporta de posts.js).

---

### 1.6 Tratamento de erros em dois padrões diferentes

**Arquivos:** `lib/middleware.js` (errorHandlingMiddleware) e `lib/api/response.js` (handleError)

**Descrição:**
- `errorHandlingMiddleware` (middleware.js): mapeia `error.name` para códigos HTTP manualmente (`ValidationError` → 400, `UnauthorizedError` → 401, etc.)
- `handleError` (response.js): detecta se o erro tem `toJSON()` (padrão ApiError) e usa, senão tenta inferir de `error.statusCode` / `error.code`

**Problema:** São duas estratégias diferentes para tratar o mesmo tipo de situação. Se um `ValidationError` for lançado e capturado pelo `errorHandlingMiddleware`, ele será tratado. Se for capturado pelo `handleError`, também será tratado, mas com formato de resposta diferente.

---

## 2. Performance

### 2.1 Verificação O(n) em Map.size no cache.js

**Arquivo:** `lib/cache.js` (linhas 33, 147)

```javascript
if (localRateLimitMap.size > 5000) {
  localRateLimitMap.clear();
}
```

**Problema:** Embora `Map.size` seja O(1) na maioria dos engines modernos, a verificação em todo request de rate limit e no setInterval pode ser otimizada. A limpeza completa (`clear()`) quando atinge o limite é agressiva demais — descarta todos os dados de rate limit de uma vez.

**Sugestão:** Usar um contador incremental que é resetado a cada limpeza, em vez de verificar `size` a cada operação.

---

### 2.2 Cálculo de posição com race condition em videos.js

**Arquivo:** `lib/domain/videos.js` (linhas 112-113)

```javascript
const maxPositionRes = await query('SELECT MAX(position) as max_pos FROM videos');
const maxPosition = maxPositionRes.rows[0]?.max_pos || 0;
dataToInsert.position = maxPosition + 1;
```

**Problema:** Em cenários de alta concorrência, duas requisições simultâneas podem ler o mesmo `MAX(position)` e criar registros com posições duplicadas. Não há lock ou uso de `SELECT ... FOR UPDATE`.

**Sugestão:** Usar uma subquery no INSERT ou uma transação com `FOR UPDATE` para atomicidade.

---

### 2.3 setInterval sem cleanup em cache.js e api/middleware.js

**Arquivos:** `lib/cache.js` (linha 16), `lib/api/middleware.js` (linha 194)

**Problema:** Ambos registram `setInterval` para limpeza periódica, mas nunca armazenam o identificador para limpeza (`clearInterval`). Em ambientes de teste (Jest) ou SSR (Serverless), esses timers podem:
- Impedir que o Node.js encerre o processo
- Causar memory leaks sutis
- Continuar executando após o término dos testes

**Sugestão:** Armazenar o timer e exportar função de cleanup para uso em testes e ciclo de vida.

---

### 2.4 Pool PostgreSQL recriado sem validação de saúde

**Arquivo:** `lib/db.js` (linhas 8-23)

**Problema:** Embora o pool tenha lazy initialization, não há validação de que uma conexão do pool ainda está saudável antes de usar. Em cenários de rede instável, o pool pode conter conexões mortas.

**Sugestão:** Configurar `statement_timeout` na conexão ou implementar validação periódica das conexões no pool.

---

### 2.5 clearAllCache silencia erros do Redis

**Arquivo:** `lib/cache.js` (linhas 111-123)

```javascript
try {
  await redis.flushdb();
} catch (error) {
  console.error('Erro ao executar FLUSHDB no Redis:', error);
  // Não relançamos o erro.
}
```

**Problema:** Se o `FLUSHDB` falhar, o erro é silenciado e o chamador acredita que o cache foi limpo. Em operações administrativas, isso pode dar uma falsa sensação de segurança.

---

### 2.6 Promises.all sem tratamento de erro parcial em reorderVideos

**Arquivo:** `lib/domain/videos.js` (linhas 147-152)

```javascript
return transaction(async (client) => {
  const promises = items.map(item => 
    query('UPDATE videos SET position = $1 WHERE id = $2', [item.position, item.id], { client })
  );
  await Promise.all(promises);
});
```

**Problema:** Se um dos updates falhar, o `Promise.all` rejeita e a transação faz rollback corretamente. Porém, se o array `items` for muito grande, muitas queries serão executadas em paralelo contra o mesmo banco, potencialmente sobrecarregando a conexão.

**Sugestão:** Considerar batch update com `UPDATE ... SET position = CASE WHEN ...` para reduzir o número de queries.

---

## 3. Segurança

### 3.1 JWT_SECRET com fallback inseguro em auth.js

**Arquivo:** `lib/auth.js` (linha 11)

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'caminhar-com-deus-secret-key-2026';
```

**Problema:** O fallback para uma string fixa no código é uma prática insegura. Em produção, se a variável de ambiente não estiver definida, qualquer um que tenha acesso ao código-fonte pode forjar tokens JWT.

**Sugestão:** Lançar um erro em produção se `JWT_SECRET` não estiver definido. Manter fallback apenas em desenvolvimento com aviso explícito.

---

### 3.2 CORS com origem '*' por padrão

**Arquivo:** `lib/middleware.js` (linha 7)

```javascript
origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
```

**Problema:** Em produção, se `ALLOWED_ORIGINS` não estiver definido, qualquer origem pode fazer requisições à API.

---

### 3.3 AdminUsername/Password podem vazar em logs de inicialização

**Arquivo:** `lib/auth.js` (linhas 148-157)

```javascript
if (!adminUsername || !adminPassword) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
}
```

**Problema:** Embora as credenciais não sejam logadas diretamente, o erro de inicialização pode expor em logs que as variáveis não foram definidas. Mensagens de log como `Admin user '...' created successfully` podem vazar o nome do admin.

---

### 3.4 Rate limit local não protege contra DDoS real

**Arquivos:** `lib/cache.js`, `lib/middleware.js`, `lib/api/middleware.js`

**Problema:** Todos os rate limits baseados em Map local (não-Redis) são perdidos se o servidor reiniciar. Um ataque distribuído que mude de IP a cada requisição não seria bloqueado, pois cada IP teria apenas algumas requisições.

---

## 4. Inconsistências de Código

### 4.1 validateParams usa req.query em vez de req.params

**Arquivo:** `lib/api/validate.js` (linha 132)

```javascript
req.params = schema.parse(req.query); // Next.js coloca params em req.query
```

**Problema:** O comentário diz que Next.js coloca params em `req.query`, o que não é verdade para versões modernas. Isso pode funcionar por coincidência em alguns cenários, mas é semanticamente incorreto e pode quebrar com atualizações do Next.js.

---

### 4.2 parseImages em localização incorreta (seo/helpers)

**Arquivo:** `lib/seo/helpers.js`

**Problema:** O arquivo `lib/seo/helpers.js` contém apenas a função `parseImages` que processa URLs de imagens, e seu próprio JSDoc diz `Helpers utilitários para componentes do módulo Products`. Claramente está no local errado.

**Sugestão:** Mover para um utilitário genérico ou para um módulo específico de produtos.

---

### 4.3 Mistura de idiomas em JSDoc (português/inglês)

**Arquivos:** Múltiplos

**Descrição:** Há uma mistura inconsistente de português e inglês em comentários e JSDoc:

- `lib/crud.js`: Comentários em inglês ("A unique symbol to identify raw SQL expressions")
- `lib/cache.js`: Comentários em português ("Limpeza periódica de entradas expiradas")
- `lib/middleware.js`: Comentários em português ("Helper method to wait for...")

Algumas funções têm descrição em inglês com parâmetros em português e vice-versa.

---

### 4.4 createVideo não aceita options (diferente de outras entidades)

**Arquivos:** `lib/domain/videos.js` (createVideo) vs `lib/domain/musicas.js` (createMusica), `lib/domain/posts.js` (createPost)

**Descrição:**
- `createMusica(musica, options)` — aceita options (para transaction client)
- `createPost(post, options)` — aceita options
- `createVideo(videoData)` — **NÃO** aceita options

**Problema:** Inconsistência na API. `createVideo` não pode ser usado dentro de transações, ao contrário das outras entidades.

---

### 4.5 Nomenclatura inconsistente em getPublicPaginatedVideos

**Arquivo:** `lib/domain/videos.js`

**Descrição:** A função `getPublicPaginatedVideos` tem nome inconsistente. Em `musicas.js`, o mesmo conceito é tratado via parâmetro `publishedOnly` em `getPaginatedMusicas`. Em `posts.js`, `getRecentPosts` filtra por `published = true`. Cada um usa uma abordagem diferente.

---

### 4.6 getRecentPosts em posts.js versus getPaginatedPosts

**Arquivo:** `lib/domain/posts.js`

**Descrição:** `getRecentPosts` (linha 10) e `getPaginatedPosts` (linha 70) têm implementações quase idênticas de paginação. A única diferença real é que `getRecentPosts` filtra por `published = true` e busca em `content`, enquanto `getPaginatedPosts` busca em `title`. A duplicação de código é desnecessária.

---

## 5. Manutenibilidade

### 5.1 Ausência de reorder em musicas.js e posts.js

**Arquivos:** `lib/domain/musicas.js`, `lib/domain/posts.js`

**Descrição:** `videos.js` possui `reorderVideos(items)` com suporte a transação. Não há funções equivalentes `reorderMusicas` ou `reorderPosts`, embora tanto `musicas` quanto `posts` tenham campo `position` na ordenação.

---

### 5.2 Logging inconsistente entre módulos

**Arquivos:** Múltiplos

**Descrição:** Cada módulo faz logging de forma diferente:
- `lib/db.js`: `console.log('Executando consulta SQL', { query: ..., params: ... })`
- `lib/middleware.js`: Objeto `logger` estruturado com info/error/warn
- `lib/cache.js`: `console.debug`, `console.warn`, `console.error` com emojis
- `lib/auth.js`: `console.log('[Auth] ...')` com prefixo manual

Não há um logger centralizado.

---

### 5.3 clearAllCache com FLUSHDB agressivo sem confirmação

**Arquivo:** `lib/cache.js` (linhas 110-123)

**Problema:** A função `clearAllCache` executa `FLUSHDB` que apaga **todo** o banco Redis, não apenas as chaves do projeto. Se várias aplicações compartilharem o mesmo Redis, isso pode causar danos. Além disso, não há confirmação do usuário ou verificação de ambiente.

---

### 5.4 settings.js com getSettings e getAllSettings confusos

**Arquivo:** `lib/domain/settings.js`

**Descrição:** 
- `getSettings()` retorna objeto chave-valor
- `getAllSettings()` retorna array de registros

**Problema:** A diferença entre os nomes não é intuitiva. `getSettings` (singular) e `getAllSettings` (plural) poderiam ser renomeados para `getSettingsAsMap` e `getAllSettings` para maior clareza.

---

### 5.5 cacheMetrics nunca é incrementado (redisHits/redisMisses)

**Arquivo:** `lib/cache.js`

**Problema:** O objeto `metrics` nas linhas 7-13 define `redisHits` e `redisMisses`, mas essas métricas **nunca são incrementadas** em lugar nenhum do código. Apenas `redisErrors` e `fallbackActivations` são atualizados.

---

### 5.6 Falta de validação de schema nos CRUDs genéricos

**Arquivo:** `lib/crud.js`

**Descrição:** As funções `createRecord`, `updateRecords`, `deleteRecords` e `upsertRecord` aceitam qualquer objeto `data` sem validação. Embora os identificadores sejam validados, os valores dos campos não passam por nenhuma verificação de tipo ou schema.

---

## 6. Possíveis Bugs

### 6.1 NotFoundError com formatação condicional incorreta

**Arquivo:** `lib/api/errors.js` (linha 150)

```javascript
const message = identifier 
  ? `${resource} não encontrado${typeof identifier === 'number' ? '' : `(id: ${identifier})`}`
  : `${resource} não encontrado`;
```

**Problema:** A lógica condicional tem um erro sutil. Para `identifier` numérico, a mensagem fica apenas "Recurso não encontrado" (sem o ID). Para string, fica "Recurso não encontrado(id: valor)". O formato deveria incluir o ID em ambos os casos:

- Correto: `"Música 123 não encontrada"` (número)
- Correto: `"Usuário 'admin' não encontrado"` (string)
- Atual (erro): `"Música não encontrado"` (número — sem ID!)

O mesmo bug existe em `lib/api/response.js` (linhas 293-295).

---

### 6.2 rateLimitMiddleware usa Map sem limite de crescimento

**Arquivo:** `lib/middleware.js` (linhas 135-166)

**Problema:** Diferente de `cache.js` (que limpa a cada 5000 entradas) e `api/middleware.js` (que faz cleanup periódico), o `rateLimitMiddleware` em `middleware.js` remove apenas a chave específica quando expira. Em um cenário com muitos IPs diferentes, o Map pode crescer indefinidamente.

---

### 6.3 withRateLimit em api cria Map novo a cada chamada

**Arquivo:** `lib/api/middleware.js` (linha 181)

```javascript
const requestCounts = new Map();
```

**Problema:** O `Map` é criado dentro da função `withRateLimit` e compartilhado por todas as chamadas do middleware (closure). Isso está correto **se** o middleware for configurado uma vez e reutilizado. Porém, se `withRateLimit` for chamado dentro de um handler (por engano), um novo Map será criado a cada requisição, e o rate limit nunca funcionará.

---

### 6.4 cacheMetrics.redisErrors incrementado mas nunca exposto

**Arquivo:** `lib/cache.js`

**Problema:** `metrics.redisErrors` é incrementado na linha 73, mas `getCacheMetrics()` (linha 43) retorna `...metrics` que inclui `redisErrors`. Isso está correto, mas `redisHits` e `redisMisses` nunca são atualizados (ver item 5.5), então essas métricas serão sempre 0.

---

## 7. Testes e Cobertura

### 7.1 Ausência de testes para a camada lib/api

**Descrição:** Os arquivos `lib/api/errors.js`, `lib/api/response.js`, `lib/api/validate.js` e `lib/api/middleware.js` totalizam ~1170 linhas de código, e não há testes unitários específicos para esses módulos (não foram encontrados na estrutura de `tests/`).

---

### 7.2 cache.js sem testes de fallback

**Descrição:** `lib/cache.js` tem lógica complexa de fallback (Redis → memória local) que não possui cobertura de testes específicos para:
- Falha de Redis com ativação de fallback
- Limpeza periódica do Map local
- Limpeza do Map quando excede 5000 entradas
- Rate limit com Redis vs sem Redis