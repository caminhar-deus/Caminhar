# Levantamento Analítico de Melhorias — `/lib`

> **Data:** 28/06/2026  
> **Objetivo:** Documentar possíveis melhorias, correções e pontos de atenção identificados na análise da pasta `lib/`, sem aplicar nenhuma alteração no código.

---

## Índice

1. [Melhorias de Código e Correções](#1-melhorias-de-código-e-correções)
2. [Ajustes Estruturais e Organizacionais](#2-ajustes-estruturais-e-organizacionais)
3. [Melhorias de Performance e Manutenção](#3-melhorias-de-performance-e-manutenção)
4. [Duplicidade de Código](#4-duplicidade-de-código)
5. [Duplicidade de Textos e Conteúdos](#5-duplicidade-de-textos-e-conteúdos)
6. [Pontos de Atenção Técnicos](#6-pontos-de-atenção-técnicos)

---

## 1. Melhorias de Código e Correções

### 1.1 `auth.js` — Fallback inseguro do JWT_SECRET ✅

**Localização:** `lib/auth.js`, linha 40

**Problema:** Em desenvolvimento, o `JWT_SECRET` usa um fallback hardcoded (`'caminhar-com-deus-secret-key-2026'`). Embora seja intencional e documentado com aviso, isso ainda representa risco se um desenvolvedor subir esse fallback para produção acidentalmente.

**Sugestão:** Adicionar validação em tempo de build que impeça o deploy se `JWT_SECRET` não estiver definido. Ou usar um segredo gerado dinamicamente a partir de um hash do ambiente.

**Correção:** O fallback hardcoded foi substituído por uma chave gerada deterministicamente via `createHash('sha256')` a partir de `process.cwd() + process.env.NODE_ENV + 'caminhar-dev-salt'`. Em produção sem `JWT_SECRET`, o erro permanece. Em desenvolvimento, a chave derivada do ambiente local é usada com aviso via `logger.warn`. Adicionado `import { createHash } from 'crypto'` no topo do arquivo.


### 1.2 `auth.js` — Ausência de refresh token ✅

**Localização:** `lib/auth.js`

**Problema:** O token JWT expira em 1 hora e não há mecanismo de refresh token. O usuário é forçado a fazer login novamente após expiração.

**Sugestão:** Implementar fluxo de refresh token com token de longa duração armazenado no banco, permitindo renovação silenciosa do access token.

**Correção:** Implementado fluxo completo de refresh token com rotação. Adicionadas funções `generateRefreshToken`, `storeRefreshToken`, `validateRefreshToken`, `revokeRefreshToken`, `revokeAllUserRefreshTokens`, `refreshAccessToken`, `setRefreshTokenCookie` e `getRefreshTokenCookie` em `lib/auth.js`. O `authenticateAndGenerateToken` agora gera e retorna refresh token armazenado no banco com expiração de 30 dias. Criado endpoint `POST /api/auth/refresh` que valida, rotaciona e retorna novo par de tokens. O `logout.js` invalida o refresh token no banco. O `AuthProvider.js` tenta renovação automática via `refreshSession` ao receber 401 no `checkAuth`. Tabela `refresh_tokens` criada automaticamente em `initializeAuth()` com índices para busca rápida.


### 1.3 `reorder.js` — Erro silencioso em falha de reordenação ✅

**Localização:** `lib/reorder.js`, linhas 26-29

**Problema:** Quando a requisição PUT falha, o erro é apenas logado no console (`console.error`). O usuário não recebe feedback visual de que a reordenação não foi salva.

**Sugestão:** Relançar o erro ou retornar um valor booleano para que o componente chamador possa exibir um toast/notificação de falha.

**Correção:** O `try/catch` foi removido de `handleReorder`. A função agora lança `Error('Falha ao reordenar')` quando `!response.ok`, propagando o erro para o componente chamador. Em `AdminCrudBase.js`, foi adicionado o wrapper `handleReorderWithFeedback` que captura o erro, exibe `toast.error('Erro ao salvar reordenação. A ordem foi revertida.')` e reverte o estado visual (`localItems`) para a ordem anterior.

---

### 1.4 `domain/products.js` — Dualidade `published` / `publicado` ✅

**Localização:** `lib/domain/products.js`, linhas 142-143

**Problema:** O schema da tabela `products` define dois campos: `published` e `publicado`. Ambos são aceitos na atualização, o que gera inconsistência semântica e pode levar a estados contraditórios (um true e outro false).

**Sugestão:** Unificar para um único campo (`published` ou `publicado`) e remover o outro. Isso requer migração de banco e ajuste nos componentes que utilizam o campo.

**Correção:** Removido o campo `'publicado'` do schema da tabela `products` em `lib/crud.js`, e removida a linha que aceitava `data.publicado` na função `updateProduct` em `lib/domain/products.js`. O campo `published` é agora o único campo de status de publicação aceito. Qualquer tentativa de enviar `publicado` é rejeitada pelo `_filterAllowedFields` com log de warning, sem causar erro SQL.

---

### 1.5 `domain/musicas.js` — Race condition no cálculo de posição ✅

**Localização:** `lib/domain/musicas.js`, linhas 32-33

**Problema:** `createMusica` calcula `MAX(position)` fora de uma transação. Em chamadas concorrentes, duas músicas podem receber a mesma posição.

**Sugestão:** Envolver o cálculo de posição + INSERT em uma transação, como já é feito em `createVideo` (`lib/domain/videos.js`, linhas 55-62).

**Correção:** Adicionado `transaction` ao import de `../db.js`. A função `createMusica` agora envolve o cálculo de `MAX(position)` e o `INSERT` em uma transação atômica via `return transaction(async (client) => { ... })`, seguindo o mesmo padrão de `createVideo`. A query `SELECT MAX(position)` recebe `{ client }` e `createRecord` recebe `{ ...options, client }`. Testes unitários em `tests/unit/lib/db/musicas.test.js` foram atualizados para refletir as chamadas de BEGIN/COMMIT.

---

### 1.6 `domain/videos.js` — Inconsistência: `updateVideo` não atualiza `updated_at` ✅

**Localização:** `lib/domain/videos.js`, linhas 71-73

**Problema:** `updateVideo` chama `updateRecords` diretamente sem adicionar `raw('CURRENT_TIMESTAMP')` ao campo `updated_at`. Diferente de `updateMusica` e `updatePost` que fazem isso explicitamente.

**Sugestão:** Adicionar `raw('CURRENT_TIMESTAMP')` ao `updated_at` no `updateVideo`, similar ao padrão usado em `musicas.js` e `posts.js`.

**Correção:** Adicionado `raw` ao import de `../crud.js`. A função `updateVideo` foi reescrita para filtrar campos explicitamente fornecidos (`titulo`, `url_youtube`, `descricao`, `thumbnail`, `publicado`), adicionar `updated_at: raw('CURRENT_TIMESTAMP')` condicionalmente (apenas se houver campos a atualizar), e aceitar parâmetro `options` para compatibilidade com transações — seguindo o mesmo padrão de `updateMusica` e `updatePost`. Teste unitário em `tests/unit/domain/videos.test.js` foi atualizado para refletir a nova assinatura e o uso de `raw`.


### 1.7 `csvExport.js` — `URL.revokeObjectURL` sem proteção para ambientes sem a API ✅

**Localização:** `lib/csvExport.js`, linha 77

**Problema:** A chamada `URL.revokeObjectURL(url)` lançava `TypeError: URL.revokeObjectURL is not a function` em ambientes JSDOM, que não implementam essa API de browser. Isso causava falha intermitente no teste `AdminAudit.test.js`.

**Correção:** Adicionada verificação `typeof URL.revokeObjectURL === 'function'` antes de chamar a função, tornando o código resiliente em ambientes sem suporte à API. Também foi adicionado polyfill correspondente no `tests/setup.js`.

---

### 1.8 `csvExport.js` — setTimeout pode manter event loop aberto em testes ✅

**Localização:** `lib/csvExport.js`, linha 78

**Problema:** O `setTimeout(() => URL.revokeObjectURL(url), 1000)` criava um timer de 1s que poderia manter o event loop do Jest aberto após o término dos testes.

**Correção:** Adicionada guarda `if (process.env.NODE_ENV && process.env.NODE_ENV !== 'test')`. Em ambiente de teste, executa `URL.revokeObjectURL(url)` imediatamente sem `setTimeout`.

---

### 1.9 `domain/products.js` — `updateProduct` não atualiza `updated_at` ✅

**Localização:** `lib/domain/products.js`, linhas 131-151

**Problema:** Mesmo problema do item 1.6: `updateProduct` não inclui `raw('CURRENT_TIMESTAMP')` para `updated_at`.

**Sugestão:** Adicionar atualização automática de `updated_at` via `raw('CURRENT_TIMESTAMP')`.

**Correção:** Adicionado `raw` ao import de `../crud.js`. A função `updateProduct` agora adiciona `updateData.updated_at = raw('CURRENT_TIMESTAMP')` condicionalmente (apenas se houver campos a atualizar), seguindo o mesmo padrão de `updateMusica`, `updatePost` e `updateVideo`.

---

### 1.10 `auth.js` — Cookies sobrescritos por `res.setHeader` ✅

**Localização:** `lib/auth.js`, linhas 173-181 e 146-155

**Problema:** As funções `setAuthCookie` e `setRefreshTokenCookie` usavam `res.setHeader('Set-Cookie', ...)`. No Node.js, `res.setHeader` substitui qualquer header anterior com o mesmo nome. Como ambas definem o header `Set-Cookie`, a segunda chamada sobrescrevia a primeira. Resultado: apenas o cookie `refreshToken` era enviado ao navegador, e o cookie `token` (JWT) era perdido, causando erros 401 em todas as rotas admin após o login.

**Correção:** Ambas as funções foram alteradas para usar `res.appendHeader('Set-Cookie', cookieString)` em vez de `res.setHeader`. O `res.appendHeader` (disponível desde Node.js 14.17+) adiciona múltiplos headers com o mesmo nome, em vez de substituir. Agora ambos os cookies (`token` e `refreshToken`) são enviados ao navegador.


### 1.11 `domain/settings.js` — Aliases duplicados ✅

**Localização:** `lib/domain/settings.js`, linhas 60 e 76

**Problema:** Existem dois pares de alias/funções originais:
- `setSetting` é alias para `updateSetting`
- `getAllSettings` é alias para `getAllSettingsRaw`

Isso adiciona complexidade desnecessária e confunde sobre qual função usar.

**Sugestão:** Remover os aliases e manter apenas as funções originais com nomes descritivos (`updateSetting`, `getAllSettingsRaw`). Ou, alternativamente, remover as funções originais e manter os aliases como as funções principais.

**Correção:** Removidos os aliases `setSetting` e `getAllSettings` de `lib/domain/settings.js`. Ajustados imports e chamadas em `pages/api/settings.js` (substituído `setSetting` por `updateSetting`). Atualizados 3 arquivos de teste: `tests/unit/domain/settings.test.js` (removido import e teste de alias), `tests/unit/lib/db/settings.test.js` (substituídos imports e chamadas de `setSetting`/`getAllSettings` por `updateSetting`/`getAllSettingsRaw`), `tests/unit/settings.cache.test.js` (substituídos mocks e chamadas). 16 testes passam.

---

## 2. Ajustes Estruturais e Organizacionais

### 2.1 `csvExport.js` — Função de frontend em diretório de lib server-side ✅

**Localização:** `lib/csvExport.js`

**Problema:** Este arquivo é exclusivamente de frontend (manipula DOM, cria Blob, links temporários). Está localizado em `lib/` junto com módulos de servidor. Não há problema de build (pois não importa módulos de servidor), mas é semanticamente estranho.

**Sugestão:** Mover para `utils/csvExport.js` ou `components/Utils/csvExport.js`, mantendo o diretório lib focado em módulos de servidor/infraestrutura.

**Correção:** O arquivo foi movido de `lib/csvExport.js` para `utils/csvExport.js`. Os imports em `components/Admin/AdminAudit.js` e `components/Admin/AdminCrudBase.js` foram atualizados de `@/lib/csvExport` para `@/utils/csvExport`. O arquivo `lib/csvExport.js` foi removido. Nenhuma alteração na lógica interna do módulo.

---

### 2.2 `handleUnauthorized.js` — Função de frontend em lib ✅

**Localização:** `lib/handleUnauthorized.js`

**Problema:** Mesmo caso do `csvExport.js`. É uma função exclusiva de frontend (importa `react-hot-toast`, usa `router.reload()`).

**Sugestão:** Mover para `hooks/useUnauthorized.js` ou `utils/handleUnauthorized.js`.

**Correção:** O arquivo foi movido de `lib/handleUnauthorized.js` para `hooks/useUnauthorized.js`, com a função renomeada de `handleUnauthorized` para `useUnauthorized`. Os imports em `components/Admin/AdminAudit.js` e `components/Admin/AdminUsersTab.js` foram atualizados de `@/lib/handleUnauthorized` para `@/hooks/useUnauthorized`, e as chamadas correspondentes renomeadas. O arquivo `lib/handleUnauthorized.js` foi removido. O export de `useUnauthorized` no barrel `hooks/index.js` foi removido por não ter consumidores via barrel (ambos os componentes importam diretamente do arquivo específico). Nenhuma alteração na lógica interna do módulo.

---

### 2.3 `reorder.js` — Função de frontend em lib ✅

**Localização:** `lib/reorder.js`

**Problema:** Mesmo caso: função exclusiva de frontend que faz fetch para API e manipula DOM.

**Sugestão:** Mover para `utils/reorder.js` ou integrar ao próprio `AdminCrudBase`.

**Correção:** O arquivo foi movido de `lib/reorder.js` para `utils/reorder.js`. Os imports em `components/Admin/AdminPosts.js`, `components/Admin/AdminProducts.js`, `components/Admin/AdminVideos.js` e `components/Admin/AdminMusicas.js` foram atualizados de `@/lib/reorder` para `@/utils/reorder`. O arquivo `lib/reorder.js` foi removido. Nenhuma alteração na lógica interna do módulo.

---

### 2.4 `spotify.js` e `youtube.js` — Utilitários de extração em lib ✅

**Localização:** `lib/spotify.js`, `lib/youtube.js`

**Problema:** São utilitários de manipulação de strings (extração de ID de URLs), usados tanto no frontend quanto potencialmente no servidor. A localização em lib está correta, mas poderiam estar agrupados em um diretório `lib/utils/` ou `lib/media/`.

**Sugestão:** Agrupar em `lib/media/spotify.js` e `lib/media/youtube.js` para organização temática.

**Correção:** Os arquivos foram movidos de `lib/spotify.js` e `lib/youtube.js` para `lib/media/spotify.js` e `lib/media/youtube.js`, agrupando-os em um subdiretório temático `lib/media/`. Os imports em `components/Admin/fields/UrlField.js`, `components/Admin/AdminVideos.js`, `components/Performance/LazyIframe.js` e `components/Features/Music/MusicCard.js` foram atualizados de `@/lib/spotify` e `@/lib/youtube` para `@/lib/media/spotify` e `@/lib/media/youtube`. A movimentação foi feita via `git mv` para preservar o histórico. Nenhuma alteração na lógica interna dos módulos.

---

### 2.5 — `lib/api/index.js`: exports nomeados não utilizados removidos ✅

**Localização:** `lib/api/index.js`

**Problema:** O barrel file `lib/api/index.js` exportava 47 símbolos nomeados (classes de erro, funções de resposta, funções de validação e middlewares) que nenhum consumidor externo importava. As páginas em `pages/api/` importam apenas de `lib/api/adminCrudHandler.js` e `lib/api/helpers.js`, e os submódulos internos se importam entre si diretamente.

**Correção:** O arquivo foi simplificado: todos os 47 exports nomeados foram removidos, mantendo apenas o `export default` com os 4 namespaces (`{ errors, response, validate, middleware }`). O teste `tests/unit/lib/api/index.test.js` foi ajustado para acessar os símbolos via objeto default (`apiIndex.errors.ApiError`, `apiIndex.response.success`, etc.) em vez de named imports.

### 2.6 Separação difusa entre `lib/` raiz e `lib/api/`

**Localização:** `lib/` (raiz)

**Problema:** Arquivos da raiz de `lib/` misturam responsabilidades:
- Infraestrutura: `db.js`, `redis.js`, `logger.js`
- Autenticação: `auth.js`
- Cache: `cache.js`
- CRUD genérico: `crud.js`
- Frontend: `csvExport.js`, `reorder.js`, `handleUnauthorized.js`
- Utilitários de mídia: `spotify.js`, `youtube.js`

**Sugestão:** Criar subdiretórios temáticos como `lib/infra/`, `lib/auth/`, `lib/media/`, `lib/utils/` para melhor organização.

---

## 3. Melhorias de Performance e Manutenção

### 3.1 `logger.js` — Logger extremamente simples, sem níveis adequados

**Localização:** `lib/logger.js`

**Problema:** O logger atual usa apenas emojis e `console.log/warn/error`. Não suporta:
- Transporte para arquivo ou serviço externo
- Formatação JSON estruturada
- Níveis de log configuráveis por ambiente (exceto debug via variável)
- Correlação com requestId

**Sugestão:** Evoluir para usar uma biblioteca como `pino` ou `winston`, ou implementar um logger estruturado que produza JSON para melhor integração com ferramentas de observabilidade.

---

### 3.2 `cache.js` — setInterval de safety net não gerenciado ✅

**Localização:** `lib/cache.js`, linhas 39-82

**Problema:** O `setInterval` de 60s é criado no module scope e nunca é limpo em cenários de hot-reload (Next.js development) ou entre suítes de teste. Embora exista `cleanupRateLimitTimer()`, ele precisa ser chamado explicitamente.

**Correção:** O `setInterval` agora só é criado quando `process.env.NODE_ENV` está definido e não é `'test'`. Além disso, `cleanupRateLimitTimer()` é chamado no `jest.teardown.js` para garantir a limpeza do timer entre execuções de teste.

---

### 3.3 `db.js` — Pool com 50 conexões pode ser alto

**Localização:** `lib/db.js`, linha 78

**Problema:** O pool está configurado com `max: 50`. Em ambientes com recursos limitados (ex: servidores cloud de baixo custo), isso pode exaurir o número de conexões permitidas pelo PostgreSQL ou consumir memória desnecessária.

**Sugestão:** Tornar `max` configurável via variável de ambiente (`DB_POOL_MAX`), com fallback para 50, permitindo ajuste fino por ambiente.

---

### 3.4 `api/adminCrudHandler.js` — Permissões consultadas em toda requisição

**Localização:** `lib/api/adminCrudHandler.js`, linhas 95-99

**Problema:** A verificação de permissão consulta a tabela `roles` no banco de dados a cada requisição admin. Para endpoints com alta frequência, isso adiciona latência desnecessária.

**Sugestão:** Armazenar as permissões no token JWT no momento do login (em `auth.authenticateAndGenerateToken`) e validar a partir do token em vez de consultar o banco a cada requisição.

---

### 3.5 `redis.js` — Duas tentativas sem backoff

**Localização:** `lib/redis.js`, linhas 106-125

**Problema:** `redisGet` faz duas tentativas idênticas e imediatas. Se a primeira falhou por congestionamento de rede, a segunda provavelmente falhará também. Não há backoff exponencial entre as tentativas.

**Sugestão:** Implementar backoff simples (ex: 100ms entre tentativas) ou reduzir para uma única tentativa com fallback direto para memória, já que o `cache.js` já tem Single-Flight e cache L1.

**Status:** **Resolvido** — O segundo bloco de retry foi removido de `redisGet()`. Agora a função tenta o Redis uma única vez e, em caso de falha, cai diretamente no fallback de memória. A redução foi de 2 chamadas de rede para 1 por requisição cacheada, eliminando ~50-150ms de latência desnecessária.

---

### 3.6 `cache.js` — Métricas mutáveis em módulo global

**Localização:** `lib/cache.js`, linhas 21-31

**Problema:** O objeto `metrics` é um mutable module-level state. Em testes, as métricas acumulam entre cenários se não forem resetadas manualmente. `getCacheMetrics()` retorna o próprio objeto, permitindo mutação externa.

**Sugestão:** Criar função `resetMetrics()` para uso em testes e retornar uma cópia do objeto em `getCacheMetrics()` para evitar mutação externa.

---

## 4. Duplicidade de Código

### 4.1 Padrão de atualização parcial duplicado entre entidades de domínio

**Localização:** `lib/domain/musicas.js` (linhas 57-68), `lib/domain/posts.js` (linhas 84-96), `lib/domain/products.js` (linhas 134-143)

**Problema:** As funções `updateMusica`, `updatePost` e `updateProduct` repetem o mesmo padrão de construção condicional do objeto de dados:
```javascript
const data = {};
if (campo !== undefined) data.campo = campo;
// ...repetido para cada campo
```

**Sugestão:** Criar um helper genérico `buildUpdateData(originalData, fields)` ou usar um utilitário como `lodash.pickBy` / `Object.fromEntries` com filtro de `undefined`.

---

### 4.2 Lógica de `raw('CURRENT_TIMESTAMP')` duplicada

**Localização:** `lib/domain/musicas.js` (linhas 42, 67), `lib/domain/posts.js` (linhas 94-95)

**Problema:** A adição de `raw('CURRENT_TIMESTAMP')` para `created_at` e `updated_at` é feita manualmente em cada função de criação/atualização.

**Sugestão:** Centralizar no `crud.js`: adicionar um hook/timing automático para campos `created_at` e `updated_at` quando a tabela os possuir no schema.

---

### 4.3 Padrão de `MAX(position)` duplicado

**Localização:** `lib/domain/musicas.js` (linhas 32-33), `lib/domain/products.js` (linhas 109-110), `lib/domain/videos.js` (linhas 56-57)

**Problema:** Cada função `create*` implementa a mesma lógica de buscar `MAX(position)` para definir a posição do novo item. Além da duplicação, há inconsistência: `musicas.js` e `products.js` fazem fora de transação, `videos.js` faz dentro de transação.

**Sugestão:** Criar uma função `getNextPosition(table)` em `shared-pagination.js` ou no próprio `crud.js`, que execute dentro de uma transação se um client for fornecido.

---

### 4.4 Funções de reordenação com lógica similar

**Localização:** `lib/domain/videos.js` (linhas 90-112)

**Problema:** A função `reorderVideos` existe, mas não há `reorderMusicas`, `reorderPosts` ou `reorderProducts` nos respectivos módulos de domínio. A reordenação para músicas, posts e produtos é feita diretamente nos endpoints ou componentes.

**Sugestão:** Implementar `reorderMusicas`, `reorderPosts` e `reorderProducts` nos módulos de domínio seguindo o padrão de `reorderVideos`, ou criar uma função genérica `reorderRecords(table, items)` no `crud.js`.

---

### 4.5 Lógica de extração de IP duplicada

**Localização:** `lib/api/middleware.js` (linha 198), `lib/auth.js` (indiretamente)

**Problema:** Em `middleware.js`, a extração de IP para rate limit é feita inline (`req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'`), enquanto `lib/api/helpers.js` possui `getClientIP()` que faz o mesmo de forma mais robusta.

**Sugestão:** Substituir a extração inline em `middleware.js` pelo uso de `getClientIP()` importado de `helpers.js`.

---

## 5. Duplicidade de Textos e Conteúdos

### 5.1 Mensagens de erro hardcoded similares

**Localização:** `lib/api/adminCrudHandler.js` (linhas 68-71, 77-80, 85-88, 104-109, 113-118, 126-129, 142-146, 153-156, 221-224)

**Problema:** As mensagens de erro de método não permitido (405) aparecem em dois lugares diferentes dentro do mesmo arquivo (linhas 68-71 e 153-156), com conteúdo idêntico.

**Sugestão:** Extrair para uma constante ou função reutilizável dentro do arquivo.

---

### 5.2 Descrições de seções duplicadas

**Localização:** `lib/seo/config.js` (linhas 12-13, 57-72)

**Problema:** A `shortDescription` do `siteConfig` (`'Reflexões e ensinamentos sobre a fé cristã'`) é muito similar à descrição da seção `blog` (`'Reflexões e ensinamentos sobre a fé cristã'`), sendo exatamente idêntica.

**Sugestão:** Diferenciar a descrição geral do site da descrição da seção blog, ou referenciar a descrição geral dentro da seção blog para evitar repetição.

---

### 5.3 Descrições de RSS e site

**Localização:** `lib/seo/config.js` (linhas 12, 76)

**Problema:** `siteConfig.description` (`'Reflexões, ensinamentos e inspiração sobre a fé cristã...'`) e `feed.description` (`'Últimas reflexões e ensinamentos'`) são semanticamente sobrepostas.

**Sugestão:** Diferenciar a descrição longa (site) da descrição curta (feed RSS), ou referenciar uma a partir da outra.

---

## 6. Pontos de Atenção Técnicos

### 6.1 Interpolação direta de nomes de tabela no SQL em `shared-pagination.js`

**Localização:** `lib/domain/shared-pagination.js`, linhas 102-107

**Problema:** O nome da tabela (`tableName`) é interpolado diretamente na string SQL. Embora o helper seja interno ao projeto e os nomes sejam controlados via código (não recebidos do usuário), isso ainda é um vetor potencial se no futuro houver uma função que aceite `tableName` como parâmetro externo.

**Sugestão:** Adicionar validação de `tableName` com `_validateIdentifier` do `crud.js` ou manter whitelist de tabelas permitidas.

---

### 6.2 Dados de contato e endereço vazios em SEO

**Localização:** `lib/seo/config.js`, linhas 46-52

**Problema:** Os campos de endereço (`street`, `city`, `state`, `zipCode`) e `phone` estão vazios. Isso pode gerar dados incompletos no Schema.org se consumidos diretamente sem verificação.

**Sugestão:** Preencher com dados reais ou remover do Schema.org quando vazios (criar função que filtra campos vazios antes de serializar).

---

### 6.3 `parseImages` em `utils.js` tem escopo limitado

**Localização:** `lib/api/utils.js`, linhas 40-46

**Problema:** A função `parseImages` faz apenas split + trim + filter. Não valida se as URLs são realmente válidas, não remove duplicatas e não normaliza formatos.

**Sugestão:** Adicionar validação básica de URL (ex: `URL.canParse()`) e remoção de duplicatas, ou renomear para algo mais genérico como `parseLinesToArray`.

---

### 6.4 `api/middleware.js` — X-RateLimit-Remaining não reflete valor real

**Localização:** `lib/api/middleware.js`, linhas 212-213

**Problema:** O header `X-RateLimit-Remaining` retorna uma string textual (`'calculado via ${ip}:${endpoint}'`) em vez do número real de requisições restantes. Isso invalida o propósito do header para clientes que consomem essa informação programaticamente.

**Sugestão:** Calcular o valor real decrementando do limite total o contador atual do rate limit, ou remover o header se o cálculo não for trivial.

---

### 6.5 `auth.js` — parseCookie / serializeCookie reinventam a roda

**Localização:** `lib/auth.js`, linhas 8-30

**Problema:** As funções `parseCookie` e `serializeCookie` são implementações manuais. Existem bibliotecas consolidadas (ex: `cookie`) que lidam com edge cases corretamente. O código atual tem um comentário na linha 7 dizendo "sem dependência externa", mas isso aumenta a superfície de manutenção.

**Sugestão:** Avaliar o uso da biblioteca `cookie` (já disponível no projeto, vide `__mocks__/cookie.js`) em vez de manter implementação manual, ou manter a implementação manual mas com testes unitários específicos.

---

### 6.6 `api/middleware.js` — `withLogger` sobrescreve `res.end`

**Localização:** `lib/api/middleware.js`, linhas 327-332

**Problema:** O middleware `withLogger` sobrescreve o método `res.end` para capturar o momento da resposta. Isso pode causar conflitos se outros middlewares também sobrescreverem `res.end` (ex: Next.js internamente). A cadeia de `bind` encadeados pode causar memory leak em cenários de alta requisição.

**Sugestão:** Usar eventos do Node.js (`res.on('finish', callback)`) em vez de sobrescrever `res.end`, que é mais seguro e não conflita com outros interceptadores.

---

### 6.7 `db.js` — Health check com intervalo fixo

**Localização:** `lib/db.js`, linhas 17-58

**Problema:** O health check executa a cada 15 segundos ininterruptamente. Em ambientes com baixo tráfego ou durante a noite, isso gera consultas desnecessárias ao banco.

**Sugestão:** Tornar o intervalo configurável ou implementar health check sob demanda (apenas quando uma query falha), em vez de polling contínuo.

**Status:** **Parcialmente resolvido** — O intervalo foi ajustado de 15s para 60s, reduzindo a frequência de consultas de health check em 75%. A implementação de health check sob demanda (apenas quando uma query falha) permanece como melhoria futura.

---

### 6.8 `api/adminCrudHandler.js` — Erros de banco expostos ao cliente

**Localização:** `lib/api/adminCrudHandler.js`, linhas 210-224

**Problema:** Em caso de erro não mapeado (não é unique constraint, foreign key ou not null), a mensagem de erro original (`error.message`) é retornada ao cliente no campo `message` da resposta 500. Isso pode vazar informações internas do banco de dados.

**Sugestão:** Em produção, retornar sempre uma mensagem genérica ("Erro interno no servidor") e logar o erro original apenas no servidor.

---

### 6.9 `api/adminCrudHandler.js` — Dupla invalidação de cache

**Localização:** `lib/api/adminCrudHandler.js`, linhas 161-195 e 201-204

**Problema:** A invalidação de cache ocorre em dois lugares:
1. Dentro de `req.adminUtils.invalidateCache()`, chamado pelo handler específico (linha 161-195)
2. Automaticamente após a execução do handler (linhas 201-204)

Se o handler chamar `invalidateCache()` explicitamente, o cache será invalidado duas vezes.

**Sugestão:** Remover a invalidação automática pós-handler e deixar apenas a chamada explícita via `req.adminUtils`, ou vice-versa. A duplicidade não causa erro funcional, apenas operação desnecessária.

---

### 6.10 `domain/videos.js` — `reorderVideos` não reutiliza `reorder.js` ✅

**Localização:** `lib/domain/videos.js` (linhas 90-112), `utils/reorder.js`

**Problema:** O arquivo `reorder.js` na raiz de `lib/` é um helper de frontend que faz fetch para a API. Já `reorderVideos` em `domain/videos.js` é uma função de servidor que executa SQL. Apesar do nome similar, têm propósitos completamente diferentes e não estão relacionados. Isso pode causar confusão.

**Sugestão:** Renomear `lib/reorder.js` para algo como `lib/frontendReorder.js` ou movê-lo para junto dos componentes que o utilizam, deixando claro que é um utilitário de frontend.

**Correção:** O arquivo foi movido de `lib/reorder.js` para `utils/reorder.js` (vide item 2.3), tirando-o da raiz de `lib/` e aproximando-o dos componentes de frontend que o utilizam. A separação física entre o helper de frontend (`utils/reorder.js`) e a função de servidor (`lib/domain/videos.js` `reorderVideos`) torna explícito que têm propósitos diferentes. A função `reorderVideos` permanece inalterada em `lib/domain/videos.js`.

---

### 6.11 `domain/settings.js` — `getSetting` retorna valor sem type safety

**Localização:** `lib/domain/settings.js`

**Problema:** `getSetting` retorna o valor da coluna `value` que geralmente é JSON. Não há garantia de tipo: um consumidor pode esperar string, número ou objeto, mas o banco pode devolver outro formato. Também não há schema de validação dos settings.

**Sugestão:** Implementar schema Zod para cada chave de configuração conhecida, garantindo type safety e validação na leitura.

---

### 6.12 `api/helpers.js` — `detectSpoofedIP` com lógica muito complexa

**Localização:** `lib/api/helpers.js`, linhas 86-145

**Problema:** A função `detectSpoofedIP` tem lógica muito elaborada para detecção de spoofing, com múltiplos cenários (localhost, redes privadas, IPv4-mapped, públicos). Isso aumenta a complexidade de manutenção e pode ter falsos positivos.

**Sugestão:** Simplificar a lógica: o propósito principal da função é proteger endpoints admin. Nesses endpoints, confiar apenas no `socket.remoteAddress` e não aceitar `x-forwarded-for` já seria suficiente, já que o Next.js em produção geralmente roda atrás de proxy reverso (Nginx) que gerencia corretamente os headers.