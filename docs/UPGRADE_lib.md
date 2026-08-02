# Levantamento Analítico de Melhorias — `/lib`

> **Data da análise:** 01/08/2026
> **Objetivo:** Documentar o levantamento analítico das melhorias, correções possíveis e pontos de atenção identificados na análise atual dos arquivos da pasta `lib/`. Nenhuma alteração foi aplicada — apenas análise.
> **Escopo:** Consolida apenas itens **pendentes** identificados na análise atual. Itens já resolvidos em análises anteriores (documentados em `docs/antigos/UPGRADE_lib.md` e `docs/resolvidos/UPGRADE_lib.md`) não são repetidos.

---

## Índice

1. [Possíveis Correções de Código](#1-possíveis-correções-de-código)
2. [Ajustes Estruturais e Organizacionais](#2-ajustes-estruturais-e-organizacionais)
3. [Melhorias de Ferramenta, Manutenção e Performance](#3-melhorias-de-ferramenta-manutenção-e-performance)
4. [Duplicidade de Código](#4-duplicidade-de-código)
5. [Duplicidade de Textos, Descrições e Conteúdos](#5-duplicidade-de-textos-descrições-e-conteúdos)
6. [Pontos de Atenção Técnicos](#6-pontos-de-atenção-técnicos)

---

## 1. Possíveis Correções de Código

### 1.1 `api/adminCrudHandler.js` — Erros de banco não mapeados expostos ao cliente

**Localização:** `lib/api/adminCrudHandler.js`, linhas 210-224

**Problema:** No catch centralizado, apenas 3 tipos de erro do banco são traduzidos para mensagens amigáveis (unique constraint, foreign key, not null). Para qualquer outro erro, a mensagem original (`error.message`) é retornada ao cliente no campo `message` da resposta 500. Isso pode vazar informações internas do banco (nome de tabelas, colunas, detalhes de constraint, stack traces).

**Sugestão:** Em produção, retornar sempre mensagem genérica ("Erro interno no servidor") e logar o erro original apenas no servidor via `logger`. Em desenvolvimento, manter a mensagem original para facilitar debugging.

---

### 1.2 `api/adminCrudHandler.js` — Dupla invalidação de cache em mutações

**Localização:** `lib/api/adminCrudHandler.js`, linhas 161-195 e 201-204

**Problema:** A invalidação de cache ocorre em dois pontos:
1. Dentro de `req.adminUtils.invalidateCache()`, quando o handler específico chama explicitamente (linhas 161-195)
2. Automaticamente após a execução do handler, se `cacheKeys` estiver configurado e `res.statusCode < 400` (linhas 201-204)

Se o handler chamar `invalidateCache()` explicitamente **e** a config tiver `cacheKeys`, a invalidação ocorre duas vezes. Não causa erro funcional, mas gera operações de SCAN/DEL no Redis desnecessárias.

**Sugestão:** Unificar: ou remover a invalidação automática pós-handler (deixando apenas a chamada explícita via `req.adminUtils`), ou documentar que handlers não devem chamar `invalidateCache` quando `cacheKeys` está configurado. A invalidação automática é a mais segura (garante comportamento consistente mesmo se o handler esquecer de invalidar).

---

### 1.3 `api/middleware.js` — `withBodyParser` retorna 500 em vez de 413

**Localização:** `lib/api/middleware.js`, linhas 377-390

**Problema:** Quando o body excede o limite de tamanho, a função retorna `serverError(res, ...)` que gera HTTP 500. Semanticamente, o código correto para "payload muito grande" é **413 Payload Too Large**.

**Sugestão:** Criar função de resposta `payloadTooLarge` em `lib/api/response.js` (413) ou retornar `badRequest` com código específico, e usá-la no `withBodyParser`.

---

### 1.4 `api/middleware.js` — `withErrorHandler` usa `console.error` em vez do logger estruturado

**Localização:** `lib/api/middleware.js`, linha 299

**Problema:** O catch do `withErrorHandler` usa `console.error('API Error:', error)` diretamente, ignorando o `logger` estruturado de `lib/infra/logger.js` (que tem níveis, JSON em produção, requestId e file transport). Perde-se correlação de logs e formatação padronizada.

**Sugestão:** Substituir por `logger.error('API', 'Erro na requisição:', error)` ou similar, seguindo o contrato `logger.<method>(module, message, ...args)`.

---

### 1.5 `api/middleware.js` — Header `X-RateLimit-Remaining` não reflete valor real

**Localização:** `lib/api/middleware.js`, linhas 212-213

**Problema:** O header `X-RateLimit-Remaining` retorna a string textual `'calculado via ${ip}:${endpoint}'` em vez do número real de requisições restantes. Clientes que consomem esse header programaticamente (padrão dos rate limiters HTTP) recebem dados inúteis.

**Sugestão:** Calcular o valor real ou remover o header. Para calcular: o `checkRateLimit` de `lib/cache/cache.js` poderia retornar também o contador atual (ex: `{ isLimited, count, limit }`), permitindo que o middleware calcule `limit - count`. Alternativamente, remover o header para não enganar consumidores.

---

### 1.6 `api/middleware.js` — `withLogger` sobrescreve `res.end` em vez de usar eventos

**Localização:** `lib/api/middleware.js`, linhas 317-336

**Problema:** O `withLogger` sobrescreve `res.end` para capturar o término da resposta. Isso pode conflitar com outros interceptadores de `res.end` (internos do Next.js ou outros middlewares) e encadear `bind` repetidamente, potencialmente causando problemas de memória em cenários de alta requisição.

**Sugestão:** Usar `res.on('finish', callback)` (evento nativo do Node.js http.ServerResponse) em vez de sobrescrever `res.end`. É mais seguro, não conflita com outros interceptadores e captura o momento correto da resposta.

---

### 1.7 `api/utils.js` — `generateUUID` usa `Math.random` (não criptográfica)

**Localização:** `lib/api/utils.js`, linhas 14-20

**Problema:** O `generateUUID` usa `Math.random()`, que não é criptograficamente seguro. Para `requestId` de rastreamento isso é aceitável, mas se essa função for usada para tokens, refresh tokens ou qualquer valor sensível, seria vulnerável. O Node.js possui `crypto.randomUUID()` nativo (desde v14.17).

**Sugestão:** Usar `crypto.randomUUID()` do Node.js quando disponível (com fallback para `Math.random` apenas em ambientes sem suporte). Isso elimina a implementação manual e garante entropia adequada.

---

### 1.8 `cache/cache.js` — Whitelist de IPs privados testa o IP original, não o normalizado

**Localização:** `lib/cache/cache.js`, linhas 333-345

**Problema:** A normalização IPv4-mapped IPv6 é aplicada em `normalizedIp` apenas para a whitelist permanente (linha 334). Porém, a whitelist dinâmica de redes privadas (linhas 340-345) testa o `ip` original com regex (`/^10\./`, `/^192\.168\./`, etc.). Um IP como `::ffff:192.168.1.10` (IPv4-mapped de IP privado) escaparia da whitelist privada e poderia ser rate-limited indevidamente — mesmo sendo um cliente interno legítimo.

**Sugestão:** Aplicar as regex de redes privadas também sobre `normalizedIp` (ou usar `normalizedIp` para todos os testes de whitelist). Melhor ainda: extrair o IP real primeiro e usar uma única variável normalizada para todas as verificações.

---

### 1.9 `cache/cache.js` — Métricas retornadas por referência (mutáveis externamente)

**Localização:** `lib/cache/cache.js`, linhas 110-117

**Problema:** `getCacheMetrics()` retorna `{ ...metrics, ... }` — o spread cria um novo objeto, mas os valores numéricos são primitivos (imutáveis), então não há risco de mutação externa do objeto `metrics` em si. **Correção de entendimento:** o spread é seguro. Entretanto, as métricas acumulam entre cenários de teste sem função de reset.

**Sugestão:** Adicionar `resetMetrics()` para uso em testes (zerando `redisHits`, `redisMisses`, `redisErrors`, `memoryHits`, `memoryMisses`, `fallbackActivations`, `totalGetOrSetCalls`, `singleFlightHits`). Evita que métricas de um cenário contaminem asserções de outro.

---

### 1.10 `auth/auth.js` — `withAuth` retorna formato de erro divergente do padrão da API

**Localização:** `lib/auth/auth.js`, linhas 302-317

**Problema:** O `withAuth` deste módulo retorna `res.status(401).json({ message: 'Não autenticado' })` — formato `{ message }` simples. O padrão do projeto (definido em `lib/api/response.js`) é `{ success: false, error: { code, message }, meta: { timestamp, requestId } }`. O `api/middleware.js` `withAuth` usa `unauthorized()` (padrão), mas este `withAuth` (usado pelo `adminCrudHandler` e por 11+ consumidores) não.

**Sugestão:** Alinhar o retorno de `withAuth` de `lib/auth/auth.js` ao formato padronizado (`unauthorized(res, ...)` de `response.js`), ou documentar explicitamente a divergência se a compatibilidade com consumidores existentes for prioridade.

---

### 1.11 `domain/musicas.js` — `getPaginatedMusicas` retorna `musicas` e `data` duplicados

**Localização:** `lib/domain/musicas.js`, linhas 113-118

**Problema:** A função retorna `{ musicas, data, pagination }` onde `musicas` e `data` são a **mesma referência de array**. Isso duplica dados no payload JSON da API (o objeto é serializado com a mesma array em duas propriedades), aumentando o tamanho da resposta desnecessariamente.

**Sugestão:** Verificar se os consumidores realmente precisam do alias `musicas` (compatibilidade com `AdminCrudBase`). Se sim, manter como está (é intencional). Caso contrário, remover o alias e usar apenas `data` — ou inverter e padronizar todos os módulos para retornarem apenas `data`.

---

### 1.12 `api/validate.js` — Verificação `error.issues` sem verificação de `error instanceof z.ZodError`

**Localização:** `lib/api/validate.js`, linhas 71, 104, 147, 183

**Problema:** A verificação `if (error.issues)` é robusta para erros Zod (mais que `instanceof`), mas um erro de qualquer outra origem que possua a propriedade `issues` seria classificado erroneamente como erro de validação Zod.

**Sugestão:** Combinar ambas as verificações: `error.issues && error instanceof z.ZodError` para máxima precisão.

---

## 2. Ajustes Estruturais e Organizacionais

### 2.1 `domain/products.js` — Não utiliza `shared-pagination.js` (paginação inline)

**Localização:** `lib/domain/products.js`, linhas 15-98

**Problema:** `getPaginatedProducts` e `getAllProducts` implementam paginação manual com queries SQL inline, enquanto `musicas.js`, `videos.js` e `posts.js` usam o helper `shared-pagination.js`. Isso cria inconsistência de padrão e duplicidade de lógica (cálculo de offset, count, totalPages).

**Sugestão:** Migrar `products.js` para usar `paginate()` do `shared-pagination.js`, mantendo os filtros de preço (`minPrice`/`maxPrice`) como condições adicionais. A formatação de moeda seria aplicada no pós-processamento, como já é feito hoje.

---

### 2.2 `domain/products.js` — `createProduct` não aceita `options` nem usa transação

**Localização:** `lib/domain/products.js`, linhas 105-123

**Problema:** `createProduct(data)` não aceita `options` (padrão de `createMusica`, `createVideo`, `createPost` que aceitam `options = {}` para transações). Além disso, o cálculo de `MAX(position)` é feito **fora de transação**, sujeito a race condition em chamadas concorrentes — igual ao bug que já foi corrigido em `musicas.js` e `videos.js`.

**Sugestão:** Alinhar com os demais módulos: aceitar `options = {}` como segundo parâmetro, envolver cálculo de `MAX(position)` + `INSERT` em `transaction()`, repassar `{ ...options, client }` ao `createRecord`.

---

### 2.3 `domain/videos.js` — `deleteVideo` não aceita `options`

**Localização:** `lib/domain/videos.js`, linhas 93-96

**Problema:** `deleteVideo(id)` não aceita `options`, diferente de `updateVideo(id, videoData, options)` e dos demais módulos (`deleteMusica(id, options)`, `deletePost(id, options)`). Um consumidor não pode executar a deleção dentro de uma transação existente.

**Sugestão:** Adicionar `options = {}` como segundo parâmetro e repassar ao `deleteRecords('videos', { id }, options)`.

---

### 2.4 `domain/products.js` — Formatação de moeda duplicada entre funções

**Localização:** `lib/domain/products.js`, linhas 56-61 e 87-92

**Problema:** O `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` é instanciado e aplicado em `getPaginatedProducts` e `getAllProducts` separadamente. A formatação é uma responsabilidade de apresentação que pode evoluir (ex: moeda configurável, locale dinâmico).

**Sugestão:** Extrair uma função interna `formatPrice(price)` (ou `formatProducts(rows)`) para centralizar a formatação. Se a configuração de moeda for dinâmica (via settings), o `Intl.NumberFormat` poderia ser instanciado com a configuração atual.

---

### 2.5 `domain/musicas.js` — Sem função de reordenação (`reorderMusicas`)

**Localização:** `lib/domain/musicas.js`

**Problema:** `lib/domain/videos.js` possui `reorderVideos(items)`, mas `musicas.js`, `posts.js` e `products.js` não possuem função equivalente no domínio. A reordenação de músicas, posts e produtos é feita nos endpoints diretamente (ou via `utils/reorder.js` no frontend), sem a camada de domínio intermediária com transação e tratamento de erro parcial.

**Sugestão:** Implementar `reorderMusicas`, `reorderPosts` e `reorderProducts` nos módulos de domínio seguindo o padrão de `reorderVideos` (transação + `Promise.allSettled` + log de falhas + rollback), ou criar uma função genérica `reorderRecords(table, items)` no `crud.js`.

---

### 2.6 `infra/logger.js` — `EMOJIS` e `LEVELS` não exportados

**Localização:** `lib/infra/logger.js`, linhas 27-28

**Problema:** As constantes `LEVELS` e `EMOJIS` são internas ao módulo. Não há como tê-las referenciadas por ferramentas externas (ex: um script de diagnóstico que queira conhecer os níveis suportados).

**Sugestão:** Exportar `LEVELS` (ou uma API como `getLevels()`) para permitir que ferramentas de diagnóstico/integração conheçam os níveis configuráveis. Baixa prioridade.

---

## 3. Melhorias de Ferramenta, Manutenção e Performance

### 3.1 `infra/db.js` — Pool `max: 50` hardcoded, sem configuração via env

**Localização:** `lib/infra/db.js`, linhas 83-88

**Problema:** O pool está configurado com valores fixos (`max: 50`, `min: 5`, `idleTimeoutMillis: 60000`, `connectionTimeoutMillis: 15000`). Em ambientes com recursos limitados (ex: servidor cloud de baixo custo, banco com limite de conexões), 50 conexões podem exaurir o PostgreSQL ou consumir memória desnecessária.

**Sugestão:** Tornar configuração via variáveis de ambiente com fallback: `DB_POOL_MAX` (default 50), `DB_POOL_MIN` (default 5), `DB_IDLE_TIMEOUT_MS` (default 60000), `DB_CONNECTION_TIMEOUT_MS` (default 15000). Permite ajuste fino por ambiente sem alterar código.

---

### 3.2 `infra/db.js` — Health check periódico contínuo (polling)

**Localização:** `lib/infra/db.js`, linhas 17-64

**Problema:** O health check executa a cada 60s ininterruptamente, independentemente do tráfego. Em ambientes com baixa atividade ou durante a madrugada, gera consultas `SELECT 1` desnecessárias ao banco.

**Sugestão:** Implementar health check **reativo** — apenas quando uma query falha, ou com intervalo configurável via env. Alternativa: aumentar o intervalo em ambientes de baixa atividade.

---

### 3.3 `api/adminCrudHandler.js` — Permissões consultadas no banco a cada requisição

**Localização:** `lib/api/adminCrudHandler.js`, linhas 95-99

**Problema:** A verificação de permissão consulta a tabela `roles` no banco a cada requisição admin (`SELECT permissions FROM roles WHERE name = $1`). Endpoints com alta frequência adicionam latência de banco desnecessária.

**Sugestão:** Armazenar as permissões do cargo no payload do JWT no momento do login (`authenticateAndGenerateToken` já busca as permissões em `lib/auth/auth.js` linhas 277-284, mas não as inclui no token). Validar a partir do token em vez de consultar o banco. Atenção: permissões alteradas não refletiriam até o token expirar (1h) — aceitável para este contexto.

---

### 3.4 `api/errors.js` — `generateUUID` com `Math.random` em `ApiError`

**Localização:** `lib/api/errors.js`, linhas 27-39 (herda de `utils.js`)

**Problema:** O `requestId` de cada erro usa `String.prototype.replace` com `Math.random`. Em Node.js >= 14.17, `crypto.randomUUID()` está disponível nativamente e é mais seguro e performático.

**Sugestão:** Substituir a implementação em `utils.js` por `crypto.randomUUID()` (com try/catch para fallback em ambientes sem suporte). Também evita colisões teóricas de UUID em picos de erro.

---

### 3.5 `infra/redis.js` — Fallback em memória sem `redisExpire` correspondente

**Localização:** `lib/infra/redis.js`, linhas 206-214

**Problema:** `redisExpire` (usado pelo rate limit para definir TTL) não tem implementação de fallback em memória — quando Redis está offline, a função simplesmente não faz nada. Porém, o `redisIncr` de fallback já salva com TTL de 60s no `setInMemory`, então o comportamento do rate limit em memória é razoável. A divergência é que o `checkRateLimit` do `cache.js` chama `redisExpire` apenas quando Redis está conectado, então não há impacto funcional real.

**Sugestão:** Documentar o comportamento ou adicionar comentário explicando que `redisExpire` é no-op quando Redis offline (o fallback do `redisIncr` já define TTL). Baixa prioridade.

---

### 3.6 `cache/cache.js` — `redisScan` e `invalidateCache` com wildcard em memória limitados

**Localização:** `lib/cache/cache.js`, linhas 149-160 e `lib/infra/redis.js`, linhas 149-161

**Problema:** A deleção por wildcard no cache em memória (`delAppMemoryCache` e `redisDel`) usa `key.replace(/\*/g, '')` e `startsWith(pattern)`. Isso limpa chaves que **começam** com o padrão, mas não chaves que contêm o padrão no meio. Para padrões como `posts:*`, funciona; mas para padrões como `*:public` (sufixo), não. O Redis SCAN trata isso corretamente apenas no Redis, não na memória.

**Sugestão:** Se padrões com wildcard no meio/fim forem usados, implementar glob-to-regex para o fallback em memória. Caso a convenção seja sempre prefixo (`chave:*`), adicionar comentário documentando a limitação.

---

## 4. Duplicidade de Código

### 4.1 Padrão de atualização parcial duplicado entre `updateMusica`, `updatePost`, `updateProduct`, `updateVideo`

**Localização:**
- `lib/domain/musicas.js`, linhas 57-73
- `lib/domain/posts.js`, linhas 83-99
- `lib/domain/products.js`, linhas 133-154
- `lib/domain/videos.js`, linhas 72-85

**Problema:** As quatro funções repetem o mesmo padrão:
```javascript
const data = {};
if (campo !== undefined) data.campo = campo;
// ...repetido para cada campo
if (Object.keys(data).length > 0) data.updated_at = raw('CURRENT_TIMESTAMP');
const [record] = await updateRecords('tabela', data, { id }, options);
```

A única diferença são os campos de cada entidade e o nome da tabela.

**Sugestão:** Criar helper genérico em `crud.js` ou `domain/shared-pagination.js`:
```javascript
buildUpdateData(originalData, allowedFields) // filtra campos !== undefined e adiciona updated_at
```
Reduziria ~80 linhas de código duplicado nos 4 módulos.

---

### 4.2 Lógica de `MAX(position) + 1` duplicada em `createMusica`, `createProduct`, `createVideo`

**Localização:**
- `lib/domain/musicas.js`, linhas 31-34
- `lib/domain/products.js`, linhas 108-110
- `lib/domain/videos.js`, linhas 55-58

**Problema:** As três funções implementam a mesma lógica de buscar `MAX(position)` e incrementar. Há inconsistência: `musicas.js` e `videos.js` fazem dentro de transação; `products.js` faz fora (ver item 2.2).

**Sugestão:** Criar função `getNextPosition(table, client?)` no `crud.js` ou módulo de domínio compartilhado, executando `SELECT COALESCE(MAX(position), 0) + 1 FROM table` com o `client` se fornecido. Também elimina a duplicação do COALESCE.

---

### 4.3 Adição manual de `raw('CURRENT_TIMESTAMP')` para `created_at`/`updated_at`

**Localização:**
- `lib/domain/musicas.js`, linhas 43, 69
- `lib/domain/posts.js`, linhas 93-96
- `lib/domain/products.js`, linhas 149-151
- `lib/domain/videos.js`, linhas 80-82
- `lib/domain/settings.js`, linha 52

**Problema:** Cada função de criação/atualização adiciona manualmente `raw('CURRENT_TIMESTAMP')` para os campos de timestamp. Isso é propenso a esquecimento (ex: `createPost` não adiciona `created_at` — depende do default do banco).

**Sugestão:** Centralizar no `crud.js`: ao detectar que a tabela possui `created_at`/`updated_at` no schema (`tableSchemas`), adicionar automaticamente `raw('CURRENT_TIMESTAMP')` quando o campo não for fornecido pelo chamador.

---

### 4.4 `formatted_price` duplicado entre `getPaginatedProducts` e `getAllProducts`

**Localização:** `lib/domain/products.js`, linhas 56-61 e 87-92

**Problema:** A formatação de moeda está duplicada em ambas as funções (ver item 2.4). Além da duplicação, se a formatação evoluir (ex: moeda dinâmica), são dois pontos de manutenção.

**Sugestão:** Extrair `formatProductRows(rows)` ou `formatPrice(value)`.

---

### 4.5 Mensagens de erro 405 duplicadas dentro de `adminCrudHandler.js`

**Localização:** `lib/api/adminCrudHandler.js`, linhas 66-72 e 152-158

**Problema:** A resposta 405 de "Método não permitido" é construída em dois lugares, com código quase idêntico (header `Allow` + JSON `{ error, message }`). A única diferença é que a primeira checa `allowedMethods.includes(method)` e a segunda checa `handlers[method]` — mas a resposta é a mesma.

**Sugestão:** Extrair para uma constante ou função local `methodNotAllowedResponse(res, method, allowedMethods)`.

---

### 4.6 Extração de IP com estratégias diferentes

**Localização:**
- `lib/api/middleware.js`, linha 198 — `req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'`
- `lib/api/helpers.js`, linhas 21-45 — `getClientIP(req)` com `trustProxy` opcional
- `lib/api/adminCrudHandler.js`, linha 62 — `getClientIP(req)` sem `trustProxy` (usa socket)
- `lib/cache/cache.js`, linhas 320-345 — `checkRateLimit(ip, ...)` recebe IP do chamador

**Problema:** O `withRateLimit` de `middleware.js` faz extração inline (confia no header `x-forwarded-for` primeiro), enquanto o `adminCrudHandler` usa `getClientIP` sem `trustProxy` (usa socket primeiro). Resultado: um endpoint protegido por `withRateLimit` pode identificar o cliente por um header falsificável, enquanto o admin identifica pelo socket confiável.

**Sugestão:** Substituir a extração inline no `withRateLimit` pelo `getClientIP(req, { trustProxy: true })` importado de `helpers.js` (ou `false`, alinhado com o admin). Unifica a estratégia e elimina a lógica inline.

---

## 5. Duplicidade de Textos, Descrições e Conteúdos

### 5.1 Descrição do site duplicada na seção `blog` do `seo/config.js`

**Localização:** `lib/seo/config.js`, linhas 12-13 e 57-72

**Problema:** `siteConfig.shortDescription` é `'Reflexões e ensinamentos sobre a fé cristã'` e `siteConfig.sections.blog.description` é **exatamente a mesma string**. O conteúdo se repete em dois contextos diferentes (descrição geral do site vs. descrição da seção blog).

**Sugestão:** Diferenciar as descrições (ex: seção blog com foco em artigos/estudos) ou referenciar a descrição geral dentro da seção blog para evitar duplicação literal.

---

### 5.2 Descrições de RSS e descrições de seção sobrepostas

**Localização:** `lib/seo/config.js`, linhas 12, 58-72, 76-77

**Problema:** `siteConfig.description` (`'Reflexões, ensinamentos e inspiração sobre a fé cristã, espiritualidade e a jornada de caminhar com Deus no dia a dia.'`), `feed.description` (`'Últimas reflexões e ensinamentos'`) e as descrições de seções (`'Reflexões e ensinamentos sobre a fé cristã'`, `'Músicas gospel e cristãs para edificar sua fé'`) são semanticamente sobrepostas e usam as mesmas palavras-chave.

**Sugestão:** Definir cada descrição com um ângulo único: site (geral/longo), blog (artigos/estudos), feed (resumo recente), músicas (gospel/adoração), vídeos (pregações/testemunhos). Diferenciar as descrições ajuda no SEO ao evitar conteúdo duplicado entre páginas.

---

### 5.3 Nome "O Caminhar com Deus" repetido em múltiplas propriedades

**Localização:** `lib/seo/config.js`, linhas 11-12, 78, 121-122, 147

**Problema:** O nome do site aparece em: `siteConfig.name`, `feed.title`, `organization.name`, `website.name`. Em `feed.title` e `website.name`, é usado sem variação (`'O Caminhar com Deus - Feed RSS'` apenas adiciona sufixo). Isso não é um bug (é intencional para SEO), mas a repetição literal pode ser centralizada.

**Sugestão:** Baixa prioridade. Referenciar `siteConfig.name` nas demais propriedades (ex: `` `${siteConfig.name} - Feed RSS` ``) para manutenção centralizada.

---

## 6. Pontos de Atenção Técnicos

### 6.1 `domain/shared-pagination.js` — Interpolação direta de `tableName` no SQL

**Localização:** `lib/domain/shared-pagination.js`, linhas 125-130

**Problema:** O nome da tabela (`tableName`) é interpolado diretamente na string SQL (`FROM ${tableName}`) e no `selectFields` (`PUBLIC_SELECT_FIELDS[tableName] || '*'`). Embora o helper seja interno e os nomes sejam passados por código controlado (não pelo usuário), qualquer futuro uso com entrada externa seria vulnerável a SQL injection.

**Sugestão:** Validar `tableName` com regex `^[a-zA-Z0-9_]+$` (mesmo padrão de `_validateIdentifier` de `lib/crud/crud.js`) ou manter um whitelist de tabelas permitidas no próprio módulo. Também documentar explicitamente que o parâmetro deve ser sempre código controlado.

---

### 6.2 `seo/config.js` — Dados de contato e endereço vazios

**Localização:** `lib/seo/config.js`, linhas 46-52

**Problema:** `phone` é `''` e `address` tem `street`, `city`, `state`, `zipCode` vazios. Se consumidos diretamente para gerar Schema.org ou contatos de página, gerariam dados incompletos/inválidos.

**Sugestão:** Preencher com dados reais quando disponíveis, ou criar função utilitária que filtre campos vazios antes de serializar o Schema.org.

---

### 6.3 `api/utils.js` — `parseImages` com escopo limitado

**Localização:** `lib/api/utils.js`, linhas 40-46

**Problema:** `parseImages` faz split + trim + filter apenas. Não valida se as strings são URLs válidas, não remove duplicatas e não normaliza formatos (ex: protocolo ausente, URLs relativas).

**Sugestão:** Adicionar validação básica (ex: `URL.canParse()` ou regex simples de URL) e remoção de duplicatas, **apenas se** um cenário de uso exigir. Caso contrário, renomear para algo mais genérico como `parseLinesToArray` para não implicar validação que não faz.

---

### 6.4 `api/helpers.js` — `detectSpoofedIP` com lógica complexa

**Localização:** `lib/api/helpers.js`, linhas 81-141

**Problema:** A função tem múltiplos cenários (localhost, IPv4-mapped, privado vs público, `::` prefix), o que aumenta a superfície de manutenção e risco de falsos positivos. Alguns ramos são redundantes (ex: o early return de localhost na linha 96-98 torna o caso 1 das linhas 114-117 inalcançável para `127.0.0.1`).

**Sugestão:** Simplificar: para endpoints admin, confiar apenas em `socket.remoteAddress` (não aceitar `x-forwarded-for`) já seria a medida mais segura. Documentar os cenários suportados e reduzir ramos redundantes (ex: remover o caso 1 da linha 114-117 que é inalcançável após o early return).

---

### 6.5 `domain/settings.js` — `getSetting` sem garantia de tipo

**Localização:** `lib/domain/settings.js`, linhas 10-20

**Problema:** `getSetting` retorna o valor armazenado na coluna `value`, que "geralmente é JSON" (comentário no código). Não há validação de schema nem garantia de tipo — um consumidor pode esperar string, número ou objeto e receber outro formato.

**Sugestão:** Implementar schema Zod por chave de configuração conhecida (ex: header settings, SEO settings) ou ao menos documentar os tipos esperados de cada chave no módulo. Para chaves desconhecidas, retornar o valor bruto com nota de que o tipo não é garantido.

---

### 6.6 `auth/auth.js` — `initializeAuth` executa DDL diretamente no código

**Localização:** `lib/auth/auth.js`, linhas 320-387

**Problema:** `initializeAuth` executa `CREATE TABLE IF NOT EXISTS users`, `ALTER TABLE users ADD COLUMN IF NOT EXISTS role`, `CREATE TABLE IF NOT EXISTS refresh_tokens` e `CREATE INDEX` diretamente. Isso duplica/compete com `scripts/migrations/` como fonte de schema. Em produção, migrações deveriam ser a única fonte canônica de estrutura de banco.

**Sugestão:** Revisar a estratégia: manter `initializeAuth` apenas para bootstrap (criar admin se não existir) e mover a criação de tabelas/índices para scripts de migração. Se mantido, garantir idempotência e compatibilidade com a fonte de migração.

---

### 6.7 `auth/auth.js` — Cookies manuais (`parseCookie`/`serializeCookie`)

**Localização:** `lib/auth/auth.js`, linhas 8-31

**Problema:** As funções de cookie são implementações manuais. O projeto já possui a biblioteca `cookie` referenciada em `__mocks__/cookie.js` (e provavelmente como dependência de outra lib). Cookies têm edge cases (valores com `;`, `=`, encoding de caracteres especiais) que implementações manuais podem não cobrir.

**Sugestão:** Avaliar o uso da biblioteca `cookie` consolidada, ou manter a implementação manual **com testes unitários específicos** para edge cases (valores com caracteres especiais, múltiplos cookies, expiração). Se mantido, documentar os limites.

---

### 6.8 `domain/settings.js` — `getSettings` usa `json_object_agg` que exige permissão de função de agregação

**Localização:** `lib/domain/settings.js`, linhas 28-41

**Problema:** `json_object_agg` é uma função de agregação do PostgreSQL. Em ambientes onde o usuário do banco tem permissões limitadas (ex: RLS, functions restritas), pode falhar. Se a tabela `settings` for grande, a agregação também carrega tudo em memória do Postgres.

**Sugestão:** Verificar se o usuário de produção tem permissão para `json_object_agg`. Considerar fallback com query simples (SELECT key, value) e agregação em JS para bancos pequenos. Baixa prioridade se o ambiente já funciona.

---

### 6.9 `domain/shared-pagination.js` — Mapa `PUBLIC_SELECT_FIELDS` cresce manualmente

**Localização:** `lib/domain/shared-pagination.js`, linhas 25-30

**Problema:** O mapa de seleção otimizada para listagens públicas precisa ser atualizado manualmente a cada nova tabela pública. Se uma nova entidade pública não for adicionada, cairá em `'*'` (SELECT completo) silenciosamente.

**Sugestão:** Documentar no módulo que novas tabelas públicas devem ser adicionadas ao mapa. Alternativa: derivar o mapa a partir do `tableSchemas` de `lib/crud/crud.js`, filtrando colunas pesadas (`content`, `embed_code`) automaticamente.

---

### 6.10 `api/index.js` — Barrel não exporta `helpers`, `utils` e `adminCrudHandler`

**Localização:** `lib/api/index.js`, linhas 11-22

**Problema:** O barrel exporta apenas 4 namespaces (`errors`, `response`, `validate`, `middleware`). `helpers.js`, `utils.js` e `adminCrudHandler.js` não são re-exportados — consumidores precisam importá-los diretamente. Isso é **intencional** (documentado na análise PROJECT_lib.md), mas cria um padrão inconsistente: parte da API é acessível via barrel, parte não.

**Sugestão:** Documentar no barrel quais módulos são exportados e por quê, ou adicionar os módulos restantes para consistência (mesmo que os consumidores atuais importem diretamente).

---

### 6.11 `infra/logger.js` — `safeSerialize` com limite de profundidade de 10 níveis

**Localização:** `lib/infra/logger.js`, linhas 59-99

**Problema:** Objetos profundamente aninhados (> 10 níveis) são truncados com `[MaxDepth]`. Isso é intencional para evitar logs gigantes, mas pode omitir dados úteis em debug de erros complexos (ex: erros de ORM ou objetos de request muito aninhados).

**Sugestão:** Documentar o limite de profundidade ou tornar configurável via `LOG_MAX_DEPTH`. Baixa prioridade — o limite atual é razoável para a maioria dos casos.

---

### 6.12 `infra/redis.js` — `initializationAttempted` impede re-tentativa após falha

**Localização:** `lib/infra/redis.js`, linhas 14-22

**Problema:** O guard `if (initializationAttempted) return redisInstance` impede que uma nova tentativa de inicialização ocorra após a primeira falha (ex: variáveis não configuradas no boot, mas configuradas depois em runtime). Em runtime normal isso é aceitável (env vars não mudam), mas em testes que alternam entre cenários com/sem Redis, o estado persiste.

**Sugestão:** Em ambiente de teste, permitir resetar `initializationAttempted = false` e `redisInstance = null` via função de teste (ex: `resetRedisForTests()`), similar ao `resetPool()` de `db.js`. Ou simplesmente documentar que mudanças em env vars exigem restart.

---

### Resumo de Prioridades

| Prioridade | Itens |
|------------|-------|
| **Alta** | 1.1 (erros de banco expostos), 1.2 (dupla invalidação de cache), 1.3 (413 vs 500), 2.2 (createProduct sem transação), 2.1 (products fora do padrão de paginação), 6.1 (interpolação de tableName), 6.4 (detectSpoofedIP complexo) |
| **Média** | 1.4, 1.5, 1.6, 1.8, 2.3, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.5, 6.6, 6.7 |
| **Baixa** | 1.7, 1.9, 1.10, 1.11, 1.12, 2.4, 2.6, 3.4, 3.5, 3.6, 4.4, 4.6, 5.1, 5.2, 5.3, 6.2, 6.3, 6.5, 6.8, 6.9, 6.10, 6.11, 6.12 |