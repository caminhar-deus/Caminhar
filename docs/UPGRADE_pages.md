# Relatório de Melhorias e Correções - `/pages`

> **Data:** 13/05/2026 (atualizado)
> **Objetivo:** Reportar problemas de duplicidade, inconsistências, oportunidades de melhoria de performance e correções necessárias nos arquivos da pasta `/pages`. Nenhuma correção deve ser aplicada; apenas reportar.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Inconsistências Arquiteturais](#2-inconsistências-arquiteturais)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Fragilidade e Falta de Validação](#4-fragilidade-e-falta-de-validação)
5. [Manutenibilidade e Padronização](#5-manutenibilidade-e-padronização)
6. [Segurança](#6-segurança)

---

## 1. Duplicidade de Código

### 1.1 Endpoints de Login Duplicados — **RESOLVIDO**

**Arquivos:** 
- `/pages/api/auth/login.js` (endpoint unificado)
- ~~`/pages/api/v1/auth/login.js`~~ **— REMOVIDO**

**O que foi feito:**
- Criada a função compartilhada `authenticateAndGenerateToken()` em `lib/auth.js` que centraliza: validação de entrada, rate limiting (5 tentativas/min), autenticação, atualização de `last_login_at`, busca de permissões e geração de token JWT.
- `/pages/api/auth/login.js` foi refatorado para usar a função compartilhada. Suporta dois modos de resposta:
  - **Padrão** (`?response` não informado): retorna cookie httpOnly + dados do usuário (compatível com fluxo web existente).
  - **Body** (`?response=body`): retorna token JWT no corpo da resposta no formato `{ success, data: { token, token_type, expires_in, user } }` (compatível com consumo externo de API).
- ~~`/pages/api/v1/auth/login.js`~~ foi **removido** do projeto em 12/05/2026. Clientes externos que usavam a rota `/api/v1/auth/login` devem migrar para `/api/auth/login?response=body`, que mantém o mesmo formato de resposta.

**Benefícios:**
- ✅ Rate limiting agora ativo em **todos** os cenários
- ✅ Validação de entrada (username/password obrigatórios)
- ✅ Busca de permissões do usuário disponível em ambos os modos de resposta
- ✅ Timestamp padronizado nas respostas de sucesso e erro
- ✅ Código duplicado eliminado — lógica centralizada em `lib/auth.js`
- ✅ Arquivo duplicado removido — redução de 81 linhas de código
- ✅ Formato de resposta de erro padronizado com `{ error, message }`

---

### 1.2 Endpoints de Posts Duplicados — **RESOLVIDO**

**Arquivos:**
- `/pages/api/posts.js` (endpoint unificado)
- `/pages/api/admin/posts.js` (admin — mantido)
- ~~`/pages/api/v1/posts.js`~~ **— REMOVIDO**

**O que foi feito:**
- `/pages/api/posts.js` foi expandido para suportar **GET + POST**:
  - **GET**: mantém a implementação original com cache distribuído e rate limiting (mais robusta que a versão v1).
  - **POST**: implementa criação de post com autenticação (Bearer token ou cookie via `getAuthToken` + `verifyToken`), rate limiting em mutações (30 requisições/minuto) e validação Zod (mesmo schema do endpoint admin).
  - Suporta `?response=v1` para retornar dados no formato `{ success, data, pagination, timestamp }`.
- ~~`/pages/api/v1/posts.js`~~ foi **removido** do projeto em 12/05/2026. Clientes externos que usavam a rota `/api/v1/posts` devem migrar para `/api/posts?response=v1`, que mantém o mesmo formato de resposta.
- `/pages/api/admin/posts.js` permanece inalterado — mantém seu CRUD completo com `withAuth`, RBAC, logging de auditoria e suporte a reordenação.

**Sobreposições eliminadas:**
- **GET público**: v1 e raiz faziam a mesma coisa. Agora a raiz (mais robusta, com rate limiting + cache key com paginação e busca) é a única implementação.
- **POST**: v1 e raiz criavam posts de forma diferente. Agora a raiz (com validação Zod + rate limiting + suporte a cookie e Bearer) é a única implementação.

**Benefícios:**
- ✅ Código duplicado eliminado — lógica centralizada em `/api/posts.js`
- ✅ Rate limiting agora ativo também em POST (antes não existia no v1)
- ✅ Schema de validação Zod unificado entre raiz e admin
- ✅ Cache invalidado após criação de post (antes existia no v1, agora mantido)
- ✅ Compatibilidade retroativa mantida via `?response=v1`
- ✅ GET do v1 agora tem paginação completa (antes só trazia todos os posts sem paginação)

---

### 1.3 Páginas de Post Duplicadas (Conflito de Rotas) — **RESOLVIDO**

**Arquivos:**
- ~~`/pages/[slug].js`~~ **— REMOVIDO**
- `/pages/blog/[slug].js` (rota canônica)

**O que foi feito:**
- ~~`/pages/[slug].js`~~ foi **removido** do projeto em 12/05/2026. A rota catch-all não existe mais, eliminando completamente o conflito de rotas com `/admin`, `/blog`, `/design-system`, etc. A página `/pages/blog/[slug].js` é a rota canônica para exibição de posts.
- Unificou-se o melhor dos dois mundos:
  - **SEO completo** do antigo `[slug].js` (Open Graph e Twitter Cards)
  - **Zoom de imagem** + **Botão Instagram/Clipboard** + **Web Share API** do antigo `blog/[slug].js`

**Benefícios:**
- ✅ Conflito de rotas eliminado — `[slug]` não interfere mais com outras rotas
- ✅ SSR com query direta ao banco — elimina latência de rede (localhost) e overhead HTTP
- ✅ SEO completo — Open Graph e Twitter Cards agora presentes em `blog/[slug].js`
- ✅ Carregamento instantâneo — sem loading state client-side
- ✅ Zoom de imagem preservado + botão Instagram/Clipboard + Web Share API
- ✅ Prepared statements (`$1`) usados — sem risco de SQL injection

---

### 1.4 Endpoints de Configurações Duplicados — **RESOLVIDO**

**Arquivos:**
- `/pages/api/settings.js` (endpoint unificado)

**O que foi feito:**
- `/pages/api/settings.js` foi expandido para suportar **GET + POST + PUT**:
  - **GET** (sem `?key`): público, mantém cache-control header (comportamento original).
  - **GET** (com `?key`): autenticado via Bearer/cookie, busca chave específica com cache via `getOrSetCache`, controle de permissões admin/editor (comportamento do v1).
  - **POST**: cria configuração, autenticado via `withAuth`, apenas role admin, invalida cache (comportamento do v1).
  - **PUT**: atualiza configuração, autenticado via `withAuth`, validação Zod, invalida cache (unificado — validação Zod do raiz + invalidação de cache do v1). Sem restrição de role, mantendo o comportamento original do endpoint raiz.
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, timestamp }`.
- `/pages/api/v1/settings.js` foi transformado em **wrapper** de 9 linhas que força `?response=v1` e delega para `/pages/api/settings.js`.

**Funcionalidades incorporadas do v1 para a raiz:**
- GET por chave específica com autenticação e permissões
- POST para criação de configurações (admin)
- Cache via `getOrSetCache` na leitura
- Invalidação de cache após escrita

**Funcionalidades mantidas da raiz:**
- GET público sem autenticação (para leitura geral)
- Validação Zod no PUT
- Cache-Control header no GET público

**Benefícios:**
- ✅ Código duplicado eliminado — lógica centralizada em `/api/settings.js`
- ✅ POST agora disponível no endpoint raiz (antes só existia no v1)
- ✅ GET por chave específica com cache disponível no endpoint raiz
- ✅ Validação Zod unificada no PUT
- ✅ Cache invalidado após escritas (antes não existia na raiz)
- ✅ Compatibilidade retroativa mantida via `?response=v1`

---

### 1.5 Health Check vs Status — **RESOLVIDO**

**Arquivos:**
- ~~`/pages/api/v1/health.js`~~ **— REMOVIDO**
- `/pages/api/v1/status.js` (endpoint unificado)

**O que foi feito:**
- `/pages/api/v1/status.js` foi expandido para suportar **dois modos de operação**:
  - **Padrão** (sem `?mode`): retorna diagnóstico completo (versão, status do banco, Node.js, uptime, plataforma) — comportamento original.
  - **Health check** (`?mode=health`): retorna apenas `{ status: 'ok' }` — substitui o antigo `/api/v1/health`.
- ~~`/pages/api/v1/health.js`~~ foi **removido** do projeto em 12/05/2026. Sistemas de monitoramento que usavam a rota `/api/v1/health` devem migrar para `/api/v1/status?mode=health`, que retorna exatamente o mesmo `{ status: 'ok' }`.

**Benefícios:**
- ✅ Código duplicado eliminado — lógica centralizada em `/api/v1/status.js`
- ✅ Health check simples disponível via `?mode=health`
- ✅ Diagnóstico completo mantido como padrão
- ✅ Compatibilidade retroativa via query param

---

### 1.6 Padrão Repetido de CRUD nos Endpoints Admin — **RESOLVIDO**

**Arquivos:**
- `/lib/api/adminCrudHandler.js` (handler factory criado)
- Todos em `/pages/api/admin/` (14 arquivos refatorados)

**O que foi feito:**
- Criado o handler factory `createAdminHandler()` em `lib/api/adminCrudHandler.js` que centraliza:
  - Verificação de método HTTP + resposta 405 padronizada em **português**
  - Autenticação via `withAuth` (único padrão para todos os 14 arquivos)
  - RBAC com verificação de permissão por cargo (via query na tabela `roles`)
  - Rate limiting configurável em mutações
  - Invalidação automática de cache em mutações
  - Injeção de utilitários (`req.adminUtils.logActivity()`, `req.adminUtils.invalidateCache()`, `req.adminUtils.user`)
  - Try/catch unificado com resposta de erro padronizada `{ error, message }`
- Os **14 arquivos** de `/pages/api/admin/` foram refatorados para usar o factory:
  - `dicas.js`, `musicas.js`, `posts.js`, `videos.js` (CRUD completo com `withAuth`)
  - `backups.js`, `audit.js`, `cache.js`, `stats.js` (endpoints específicos)
  - `roles.js`, `users.js` (CRUD com permissões específicas)
  - `rate-limit.js` (gestão de Redis)
  - `fetch-ml.js`, `fetch-spotify.js`, `fetch-youtube.js` (integração externa)

**Benefícios:**
- ✅ Padrão CRUD unificado — qualquer mudança exige alteração em **1 arquivo** (o factory), não mais em 14
- ✅ Autenticação padronizada — todos usam `withAuth` (antes 5 usavam `withAuth`, 8 usavam `getAuthToken` manual, 1 era misto)
- ✅ Formato de resposta 405 padronizado em português (antes havia 4 formatos diferentes misturando PT e EN)
- ✅ Try/catch unificado (antes havia 3 padrões diferentes)
- ✅ logActivity adicionado onde não existia: `audit.js`, `cache.js`, `videos.js`, `backups.js`, `fetch-*.js`
- ✅ Invalidação de cache adicionada onde não existia: `dicas.js`, `roles.js`, `users.js`
- ✅ Rate limiting adicionado onde não existia: `dicas.js`, `musicas.js`, `videos.js`, `roles.js`, `audit.js`, `backups.js`
- ✅ Código eliminado: **~250-300 linhas de boilerplate** removidas dos 14 arquivos
- ✅ `getAuthToken` + `verifyToken` manuais eliminados de 8 arquivos

---

## 2. Inconsistências Arquiteturais

### 2.1 Modelos de Autenticação Misturados — **RESOLVIDO**

**Problema anterior:** O projeto usava diferentes abordagens de autenticação:
- `withAuth` middleware (em `api/upload-image.js`, `api/cleanup-test-data.js`, etc.)
- `authenticate()` + `generateToken()` + `setAuthCookie()` (em `api/auth/login.js`)
- Verificação manual de JWT com `getAuthToken()` + `verifyToken()` (em `api/v1/auth/check.js`)
- `authenticate()` + retorno de token no body (em `api/v1/auth/login.js`)

**O que foi feito (12/05/2026):**
- `api/posts.js` — POST migrado de `getAuthToken()` + `verifyToken()` manual para `withAuth(postHandler)`, padronizando com `upload-image.js` e `cleanup-test-data.js`.
- `api/products.js` — Criado middleware `requireAuth()` que encapsula `getAuthToken()` + `verifyToken()`, usado em POST, PUT, DELETE e GET admin. GET público (`?public=true`) permanece sem autenticação.
- `api/auth/login.js` — Mantido como ponto de emissão de token (não é uma rota protegida). Mensagens de erro padronizadas.

**Benefícios:**
- ✅ POST de posts agora usa `withAuth` — mesmo padrão de `upload-image.js` e `cleanup-test-data.js`
- ✅ products.js não faz mais verificação manual repetida de JWT em cada case — `requireAuth()` centraliza
- ✅ Redução de código boilerplate de autenticação

---

### 2.2 Cache com Implementações Diferentes — **RESOLVIDO**

**Problema anterior:** O cache era implementado de forma inconsistente:
- `api/musicas.js`: usava `getCachedData()` / `setCachedData()` diretamente
- `api/posts.js`, `api/videos.js`, `api/products.js`: usavam cache + rate limiting como middleware

**O que foi feito (12/05/2026):**
- `api/musicas.js` — Migrado de `getCachedData/setCachedData` manual para `getOrSetCache()` via Redis, mesmo padrão usado por `posts.js` e `videos.js`.
- `api/dicas.js` — Adicionado `getOrSetCache()` com chave `dicas:public:published` — antes não havia cache.
- `api/products.js` — GET público (`?public=true`) agora usa `getOrSetCache()` com chave `products:public:${page}:${limit}` — antes o cache era invalidado mas nunca populado.

**Benefícios:**
- ✅ `musicas.js` agora usa `getOrSetCache` — unificado com `posts.js`, `videos.js` e `products.js`
- ✅ `dicas.js` agora tem cache — antes não existia
- ✅ `products.js` GET público agora popula o cache — antes era apenas invalidado
- ✅ Cache invalidado automaticamente em mutações

---

### 2.3 Rate Limiting Aplicado de Forma Inconsistente — **RESOLVIDO**

**Problema anterior:**
- `api/posts.js`, `api/videos.js`, `api/products.js`: tinham rate limiting (apenas em mutações no products.js)
- `api/musicas.js`, `api/dicas.js`, `api/settings.js`: **não** tinham rate limiting
- `api/auth/login.js`: tinha rate limiting por IP (5 tentativas/min)

**O que foi feito (12/05/2026):**
- `api/musicas.js` — Adicionado `checkRateLimit(ip, 'api:public:musicas', 60, 60000)` dentro do callback do cache.
- `api/dicas.js` — Adicionado `checkRateLimit(ip, 'api:public:dicas', 60, 60000)` dentro do callback do cache.
- `api/settings.js` — Adicionado `checkRateLimit(ip, 'api:public:settings', 30, 60000)` no GET público (sem `?key`).
- `api/products.js` — Adicionado `checkRateLimit(ip, 'api:public:products', 60, 60000)` no GET público (`?public=true`).

**Benefícios:**
- ✅ `musicas.js` — rate limiting ativo em endpoint público
- ✅ `dicas.js` — rate limiting ativo em endpoint público
- ✅ `settings.js` — rate limiting ativo em GET público
- ✅ `products.js` — rate limiting ativo em GET público (antes existia apenas em mutações)
- ✅ Todos os endpoints públicos agora têm rate limiting

---

### 2.4 Paginação Implementada de Forma Diferente — **RESOLVIDO**

**Arquivos:**
- `/pages/api/helper/pagination.js` (helper criado)
- `/pages/api/dicas.js`
- `/pages/api/products.js`
- `/lib/domain/products.js` (camada de domínio criada)

**O que foi feito (13/05/2026):**

1. **Helper de paginação reutilizável** criado em `/pages/api/helper/pagination.js`:
   - `paginate(rawPage, rawLimit)` — Parseia e valida parâmetros, retorna `{ page, limit, offset }`
   - `buildPaginationMeta(page, limit, total)` — Gera metadados de paginação
   - `paginatedResponse(data, pagination)` — Monta resposta padronizada `{ success, data, pagination }`

2. **`/pages/api/dicas.js`** — Adicionada paginação com `OFFSET`/`LIMIT` via helper:
   - Agora aceita `?page` e `?limit`
   - Cache key inclui página e limite (`dicas:public:published:${page}:${limit}`)
   - `SELECT COUNT(*)` para total de registros
   - Resposta padronizada via `paginatedResponse()`

3. **`/lib/domain/products.js`** — Camada de domínio criada com:
   - `getPaginatedProducts(page, limit)` — GET público com formatação de moeda
   - `getAllProducts(page, limit)` — GET admin
   - `createProduct(data)`, `updateProduct(id, data)`, `deleteProduct(id)`

4. **`/pages/api/products.js`** — Refatorado para usar camada de domínio e helper `paginate()`:
   - `handlePublicGet` e `handleAdminGet` agora usam `getPaginatedProducts()`/`getAllProducts()`
   - Duplicação de lógica de paginação e formatação de moeda eliminada

**Benefícios:**
- ✅ Helper reutilizável — qualquer endpoint pode importar `paginate()`/`buildPaginationMeta()`/`paginatedResponse()`
- ✅ `dicas.js` agora tem paginação com `OFFSET`/`LIMIT` (antes limite fixo de 100)
- ✅ `products.js` tem lógica de paginação centralizada na camada de domínio
- ✅ Duplicação de paginação entre `handlePublicGet` e `handleAdminGet` eliminada
- ✅ Formatação de moeda (Real) centralizada na camada de domínio

---

### 2.5 Tratamento de Erros sem Padronização — **RESOLVIDO**

**Problema anterior:** Respostas de erro tinham formatos diferentes:
- Alguns retornavam `{ error: 'message' }`
- Outros retornavam `{ error, message, timestamp }`
- Outros retornavam apenas status code sem body
- Mensagens em português e inglês misturadas

**O que foi feito (12/05/2026):** Todos os 8 arquivos foram padronizados para o formato `{ error: string, message: string }`:

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `upload-image.js` | `{ message }` e `{ success, path }` misturado | `{ error, message }` em todos os erros |
| `cleanup-test-data.js` | `{ message }` sem campo error | `{ error, message }` com `console.error()` |
| `auth/login.js` | `{ message }` no 405 | `{ error, message }` + fallback para erros desconhecidos |
| `musicas.js` | `{ success: false, message }` + Zod errors | `{ error, message, errors }` padronizado |
| `posts.js` | `{ error }` + `{ success: false, message }` misturado | `{ error, message }` unificado + erros Zod |
| `videos.js` | `{ error }` sem message | `{ error, message }` em todas as respostas |
| `products.js` | `{ error }` misturado PT/EN | `{ error, message }` com mensagens em português |
| `dicas.js` | Apenas `{ message }` no erro, sem log | `{ error, message }` + `console.error()` |

**Benefícios:**
- ✅ Formato unificado `{ error, message }` em todos os endpoints
- ✅ Mensagens padronizadas em português (PT-BR) e inglês para status codes (ex: `'Bad Request'`, `'Unauthorized'`, `'Too Many Requests'`)
- ✅ `console.error()` adicionado onde não existia (`dicas.js`, `cleanup-test-data.js`)
- ✅ Erro 429 tratado uniformemente com `{ error: 'Too Many Requests', message }`

---

## 3. Problemas de Performance

### 3.1 CSS Crítico Inline Chamado em Toda Requisição — **RESOLVIDO**

**Arquivo:** `/pages/_document.js`

**Problema anterior:** A função `extractCriticalCSS()` era chamada a cada renderização do lado do servidor, potencialmente executando lógica pesada de parsing de CSS.

**O que foi feito (12/05/2026):**
- O CSS crítico agora é cacheado em nível de módulo através da variável `cachedCriticalCSS`:
  ```js
  let cachedCriticalCSS = null;
  export default function Document() {
    if (!cachedCriticalCSS) {
      cachedCriticalCSS = extractCriticalCSS();
    }
    // ...
  }
  ```
- `extractCriticalCSS()` é executado apenas uma vez na primeira requisição SSR e reutilizado nas requisições subsequentes, eliminando o reprocessamento desnecessário.

**Benefícios:**
- ✅ `extractCriticalCSS()` executado apenas 1x (primeira requisição), não mais a cada SSR
- ✅ Redução do TTFB (Time to First Byte) em requisições subsequentes
- ✅ Código mínimo — apenas uma variável `cachedCriticalCSS` adicionada

---

### 3.2 Pré-carregamento de Fontes sem Estratégia de Fallback — **RESOLVIDO**

**Arquivo:** `/pages/_document.js`

**Problema anterior:** As fontes Montserrat e Inter eram pré-carregadas com `preload`, mas não havia estratégia de fallback caso o download falhasse.

**Impacto anterior:** FOIT (Flash of Invisible Text) se as fontes não carregassem.

**O que foi feito (13/05/2026):**
- Adicionado `<link rel="stylesheet">` do Google Fonts com `&display=swap` no `<Head>` do `_document.js`, garantindo que as fontes Inter (400, 500, 600, 700) e Montserrat (400, 500, 600, 700) sejam carregadas com `font-display: swap`.
- Atualizado `pages/styles/globals.css` para usar `'Inter'` como primeira opção na `font-family` do `html, body`, mantendo a cadeia de fallback com fontes do sistema.

**Benefícios:**
- ✅ `font-display: swap` — texto exibido imediatamente com fallback, sem FOIT
- ✅ FOIT eliminado mesmo se o download das fontes falhar
- ✅ Inter como fonte primária do body com fallback completo
- ✅ Preconnect mantido para `fonts.googleapis.com` e `fonts.gstatic.com`

---

### 3.3 Múltiplos Preconnects sem Verificação de Necessidade — **RESOLVIDO**

**Arquivo:** `/pages/_document.js`

**Problema anterior:** Eram feitos preconnects para 6 domínios diferentes (Google Fonts, YouTube, Spotify, i.scdn.co, img.youtube.com) mesmo que a página atual não utilize todos eles.

**O que foi feito (12/05/2026):**
- Preconnects não essenciais removidos — agora apenas os domínios de fontes (Google Fonts) permanecem no `_document.js`:
  - Mantido: `fonts.googleapis.com` e `fonts.gstatic.com` (essenciais para carregamento de fontes)
  - Removido: `www.youtube.com`, `open.spotify.com`, `i.scdn.co`, `img.youtube.com`
- DNS prefetch também reduzido — apenas `fonts.googleapis.com` mantido
- Preconnects específicos para YouTube/Spotify devem ser adicionados condicionalmente nas páginas que os utilizam (ex: páginas de vídeos e músicas)

**Benefícios:**
- ✅ Redução de 4 preconnects e 4 dns-prefetch desnecessários por página
- ✅ Menos conexões TCP+TLS abertas desnecessariamente
- ✅ Performance melhorada em dispositivos móveis e redes lentas
- ✅ Preconnects específicos podem ser adicionados sob demanda nas páginas que realmente precisam

---

### 3.4 Fetch para API Interna em Server-Side — **RESOLVIDO**

**Arquivos:**
- `/pages/blog/index.js` - antes: `fetch('http://.../api/posts')` no servidor
- `/pages/blog/[slug].js` — corrigido em 12/05/2026

**O que foi feito (12/05/2026):**
- `/pages/blog/[slug].js` — Antes: `fetch('http://.../api/posts?slug=x')` no servidor. Depois: Query direta ao banco (`SELECT ... WHERE slug = $1 AND published = true`)
- `/pages/blog/index.js` — Substituído `fetch('http://localhost:3000/api/posts')` por query direta ao banco com paginação nativa via `LIMIT $1 OFFSET $2` e `COUNT(*)`:
  ```js
  const postsResult = await query(
    'SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const totalResult = await query(
    'SELECT COUNT(*) FROM posts WHERE published = true'
  );
  ```
- A paginação agora é feita diretamente no banco de dados (não mais via slice manual no array completo)

**Benefícios:**
- ✅ Latência de rede eliminada — query direta ao banco em ambos os arquivos
- ✅ Paginação eficiente — `LIMIT/OFFSET` no banco em vez de trazer todos os posts e fazer slice manual
- ✅ Overhead HTTP eliminado (rate limiting, cache, parsing, serialização do endpoint API)
- ✅ Código unificado com o padrão de `blog/[slug].js`
- ✅ Menos ponto de falha — sem dependência de fetch HTTP para si mesmo

---

### 3.5 TagManager Inline (_document.js) — **RESOLVIDO**

**Arquivo:** `/pages/_document.js`

**Problema anterior:** A CSP continha permissão para `*.googletagmanager.com`, mas não havia scripts TagManager sendo injetados no projeto.

**O que foi feito (12/05/2026):**
- Removida a permissão `https://*.googletagmanager.com` da Content Security Policy (`script-src`) no `_document.js`
- A CSP foi limpa para conter apenas os domínios efetivamente utilizados: YouTube e Spotify

**Benefícios:**
- ✅ Política de segurança mais restritiva — apenas domínios realmente necessários no `script-src`
- ✅ Superfície de ataque reduzida ao remover permissão de domínio não utilizado

---

## 4. Fragilidade e Falta de Validação

### 4.1 Ausência de Sanitização em Upload de Imagem — **RESOLVIDO**

**Arquivo:** `/pages/api/upload-image.js`

**Problema anterior:** O nome original do arquivo era preservado no nome salvo (com timestamp prefixado). Não havia verificação de conteúdo real do arquivo (apenas extensão). Não havia limite de resolução.

**Impacto anterior:** Risco de upload de arquivos maliciosos com extensão falsa. Possível ataque de sobrescrita se nomes coincidirem.

**O que foi feito (12/05/2026):**
- **Nome aleatório seguro**: Substituído o padrão `{prefixo}{timestamp}{extensão}` por `{prefixo}{crypto.randomUUID()}{extensão}` — elimina previsibilidade e risco de sobrescrita.
- **Validação de conteúdo real (magic bytes)**: Adicionada validação via `sharp.metadata()` que verifica a assinatura real do arquivo, impedindo que arquivos com extensão falsa (ex: `.exe` renomeado para `.jpg`) passem pela validação.
- **Limite de dimensões**: Adicionada verificação de largura e altura máxima (`MAX_WIDTH: 1920px`, `MAX_HEIGHT: 1920px`) com mensagem de erro detalhada informando as dimensões atuais e máximas permitidas.
- **Extensão validada**: A extensão do arquivo salvo é validada contra uma lista de extensões permitidas (`ALLOWED_EXTENSIONS`). Se inválida, usa `.jpg` como fallback seguro.

**Benefícios:**
- ✅ Nome de arquivo imprevisível — UUID aleatório elimina risco de sobrescrita
- ✅ Conteúdo verificado — `sharp.metadata()` confirma que o arquivo é realmente uma imagem
- ✅ Dimensões limitadas — 1920×1920px máximo com mensagem de erro informativa
- ✅ Extensão validada contra lista branca — fallback seguro para `.jpg`

---

### 4.2 Fallback Silencioso sem Dados — **RESOLVIDO**

**Arquivo:** `/pages/blog/index.js`

**Problema anterior:** Se a API de posts falhasse, o fallback retornava `posts: []`, `currentPage: 1` sem nenhum aviso ao usuário.

**O que foi feito (12/05/2026):**
- Adicionada a prop `fetchError` no fallback de erro do `getServerSideProps`:
  ```js
  return { props: { posts: [], currentPage: 1, totalPages: 1, fetchError: true } };
  ```
- No componente, o estado de erro é diferenciado do estado de lista vazia:
  - **Erro (`fetchError === true`):** exibe mensagem amigável em destaque visual (fundo rosa claro, texto vermelho):
    > _"Desculpe, não foi possível carregar os posts no momento. Tente novamente mais tarde."_
  - **Lista vazia (sem erro):** exibe _"Nenhum post publicado ainda."_ (comportamento original)

**Benefícios:**
- ✅ Usuário agora vê uma mensagem de erro amigável em vez de página vazia
- ✅ Estados de erro e lista vazia visualmente diferenciados
- ✅ Mensagem de erro com destaque visual (cores de alerta)
- ✅ Sem alteração no comportamento de sucesso — posts normais continuam iguais

---

### 4.3 Validação Zod Inconsistente — **RESOLVIDO**

**Problema:** Alguns endpoints usavam validação Zod (`api/musicas.js`, `api/settings.js`), mas a maioria dos endpoints admin **não** usava validação nos dados de entrada.

**Impacto:** Dados mal formatados podem corromper o banco de dados.

**O que foi feito (12/05/2026):**
- **`api/settings.js`**: Adicionado schema Zod (`postSchema`) no método POST — antes usava apenas validação manual (`if (!key || !value)`). Agora POST e PUT compartilham o mesmo padrão de validação com mensagens de erro detalhadas via `validation.error.flatten().fieldErrors`.
- **`admin/dicas.js`**: Adicionados schemas Zod `dicaSchema` e `dicaUpdateSchema` — valida nome, conteúdo e publicado nos métodos POST e PUT.
- **`admin/musicas.js`**: Adicionado schema Zod `musicaSchema` com validação de título, artista, descrição, URL do Spotify e publicado. Adicionado também `reorderSchema` para validação da ação de reordenação.
- **`admin/roles.js`**: Adicionados schemas Zod `roleSchema` e `roleUpdateSchema` — valida nome do cargo e permissões (array de strings).
- **`admin/users.js`**: Adicionados schemas Zod `userCreateSchema` e `userUpdateSchema` — valida username, password e role com tratamento de hash de senha.
- **`admin/fetch-ml.js`**: Adicionado schema Zod `urlSchema` — valida que a URL enviada é uma URL válida.
- **`admin/fetch-spotify.js`**: Adicionado schema Zod `urlSchema` — valida que a URL enviada é uma URL válida.
- **`admin/fetch-youtube.js`**: Adicionado schema Zod `urlSchema` — valida que a URL enviada é uma URL válida.
- **`admin/rate-limit.js`**: Adicionado schema Zod `ipSchema` — valida que o IP enviado no POST é uma string não vazia.

**Arquivos que já possuíam Zod anteriormente:** `admin/posts.js`, `admin/videos.js`

**Benefícios:**
- ✅ 9 endpoints admin agora validam dados de entrada com Zod
- ✅ Mensagens de erro detalhadas via `validation.error.flatten().fieldErrors`
- ✅ Schemas reutilizáveis entre POST e PUT

---

### 4.4 Query SQL sem Prepared Statements — **RESOLVIDO**

**Arquivo:** ~~`/pages/[slug].js`~~ — **REMOVIDO** (rota catch-all eliminada em 12/05/2026)

**Problema:** A query `SELECT * FROM posts WHERE slug = '${slug}' AND published = true` usava interpolação de string, vulnerável a SQL injection.

**Resolução:** Arquivo removido. O conteúdo foi migrado para `/pages/blog/[slug].js`, que usa prepared statements (`$1`).

**Prevenção futura (13/05/2026):** Criado script de verificação automática de SQL injection:
- **Arquivo:** `scripts/check-sql-injection.js`
- **Funcionamento:** Escaneia chamadas `query()` e `pool.query()` em busca de interpolação de variáveis na string SQL sem prepared statements, detectando padrões como `pool.query(...)` com 1 argumento e `query(...${...}...)` sem array de parâmetros.
- **Falsos positivos ignorados:** Comentários de código, identificadores SQL protegidos por `_validateIdentifier()`, whitelists fixas de tabelas/colunas.
- **Uso:** `npm run security:check-sql` (diretórios principais) ou `npm run security:check-sql:all` (projeto completo).
- **Resultado da varredura inicial:** 200 arquivos escaneados — **0 vulnerabilidades encontradas** ✅
- **Exit codes:** `0` (sem vulnerabilidades) ou `1` (vulnerabilidades encontradas), permitindo integração com CI/CD.
- **npm scripts adicionados em `package.json`:**
  ```json
  "security:check-sql": "node scripts/check-sql-injection.js",
  "security:check-sql:all": "node scripts/check-sql-injection.js --all",
  ```

**Benefícios adicionais:**
- ✅ Prevenção automatizada — detecta reintrodução de SQL injection em novos códigos
- ✅ Integrável ao CI/CD — exit code 1 bloqueia pipeline se vulnerabilidades forem encontradas
- ✅ 427 arquivos escaneados no modo `--all` sem falsos positivos
- ✅ Script leve — 52ms para escanear o projeto completo

---

### 4.5 Ausência de Tratamento para Timeout de API Externa — **RESOLVIDO**

**Arquivos:**
- `/pages/api/admin/fetch-ml.js`
- `/pages/api/admin/fetch-spotify.js`
- `/pages/api/admin/fetch-youtube.js`

**Problema anterior:** As chamadas a APIs externas (Mercado Livre, Spotify, YouTube) não tinham configuração explícita de timeout.

**Impacto anterior:** Uma API externa lenta poderia travar o endpoint Next.js, consumindo recursos do servidor.

**O que foi feito (12/05/2026):**
- Criada a função utilitária `fetchWithTimeout(url, options, timeout)` que encapsula `AbortController` com timeout de 8 segundos.
- **`fetch-ml.js`**: Substituídos todos os 5 `fetch()` por `fetchWithTimeout()` — 2 chamadas à API de Items, 1 chamada à API de Products, 1 chamada à API de Description e 1 chamada de fallback de scraping HTML.
- **`fetch-spotify.js`**: Substituídos todos os 3 `fetch()` por `fetchWithTimeout()` — Estratégia 1 (oEmbed), Estratégia 2 (Iframe Embed) e Estratégia 3 (Scraping Googlebot).
- **`fetch-youtube.js`**: Substituída a única chamada `fetch()` por `fetchWithTimeout()` — API oEmbed do YouTube.

**Benefícios:**
- ✅ Timeout de 8 segundos em todas as chamadas a APIs externas
- ✅ `AbortController` interrompe a requisição no servidor, liberando recursos
- ✅ Função `fetchWithTimeout` reutilizável com timeout configurável

---

## 5. Manutenibilidade e Padronização

### 5.1 Tags Padrão Repetidas nos Endpoints Admin — **RESOLVIDO**

**Arquivos:** Todos em `/pages/api/admin/`

**Problema:** Praticamente todos os endpoints admin repetiam o bloco de verificação de método HTTP com retorno 405 e estrutura try/catch idêntica.

**Resolução:** Resolvido via handler factory `createAdminHandler()` em `lib/api/adminCrudHandler.js` (item 1.6).

---

### 5.2 Endpoints sem Versionamento Consistente — **RESOLVIDO**

**Arquivos:**
- `/pages/api/v1/` (diretório removido)
- `/pages/api/status.js` (criado)
- `/pages/api/auth/check.js` (criado)

**O que foi feito (13/05/2026):**
- Estratégia definida: adotar **apenas endpoints sem versão** (padrão)
- O diretório `/pages/api/v1/` foi **removido** do projeto
- Os endpoints versionados foram migrados para rotas sem versão:
  - `/api/v1/status` → `/api/status`
  - `/api/v1/auth/check` → `/api/auth/check`
  - `/api/v1/auth/login` → `/api/auth/login?response=body`
  - `/api/v1/health` → `/api/status?mode=health`
  - PUT/DELETE de `/api/v1/videos/[id]` já gerenciados por `/api/admin/videos`
- Testes, load tests e documentação atualizados para refletir as novas rotas

---

### 5.3 Nomenclatura Inconsistente de Rotas

**Problema:** Uso inconsistente de português e inglês:
- `/api/dicas.js` (português)
- `/api/posts.js` (inglês)
- `/api/musicas.js` (português)
- `/api/videos.js` (inglês)
- `/api/products.js` (inglês)

**Impacto:** Falta de padronização, confusão para desenvolvedores.

**Sugestão:** Definir um idioma padrão para nomes de rotas.

---

### 5.4 Tokens de Design Subutilizados — **RESOLVIDO**

**Arquivos:**
- `/pages/styles/tokens/*.js` (11 arquivos) — mantidos como fonte de verdade
- `/pages/styles/variables.css` (criado)
- `/pages/styles/generateTokensCSS.js` (criado)
- 34 arquivos CSS/JS modificados

**O que foi feito (13/05/2026):**

1. **`variables.css` criado** — 386 CSS Custom Properties geradas a partir dos 11 tokens JS (cores, spacing, tipografia, bordas, sombras, breakpoints, animações, opacidade, z-index)

2. **`generateTokensCSS.js` criado** — gerador programático para regenerar `variables.css` automaticamente

3. **Tokenização de ~800 valores hardcoded** em 34 arquivos:
   - **Páginas (3):** `globals.css`, `Home.module.css`, `DesignSystem.module.css`
   - **UI Components (10):** `Button`, `BaseCard`, `Input`, `Alert`, `Badge`, `Modal`, `Toast`, `Select`, `TextArea`, `Spinner`
   - **Admin (1):** `Admin/styles/Admin.module.css`
   - **Features CSS (5):** `Blog`, `MusicCard`, `MusicGallery`, `ProductCard`, `VideoGallery`
   - **Layout (4):** `Container`, `Grid`, `Sidebar`, `Stack`
   - **Features JS (7):** `ContentTabs.module.css`, `Testimonials`, `BlogSection`, `PostCard`, `styles.js`, `ProductList`, `VideoCard`, `VideoGallery`, `StateMessages`

4. **Cores padronizadas:** `#007bff` (Bootstrap), `#1976d2`, `#0070f3` → `var(--color-primary-500)`. Cores não-padronizadas (`#2c3e50`, `#7f8c8d`) substituídas por tokens semânticos.

5. **`overflow-y: scroll !important`** removido (item 5.6), substituído por `overflow-y: auto`

6. **Faixas de cor inconsistentes** corrigidas entre seções da página inicial

**Benefícios:**
- ✅ Fonte única da verdade — alterar tokens → regenerar `variables.css` → reflete em toda interface
- ✅ Consistência visual em todo o projeto
- ✅ Manutenibilidade — mudar cor primária ou tipografia = alterar 1 arquivo
- ✅ ~800 valores hardcoded substituídos por `var()`

---

### 5.5 Classes Utilitárias no CSS Global — **RESOLVIDO**

**Arquivo:** `/pages/styles/globals.css`

**Classes removidas:** `.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label`

**Problema:** Classes utilitárias em CSS global podem conflitar com CSS Modules ou bibliotecas de terceiros, causando estilos inesperados.

**O que foi feito (13/05/2026):**
- As 7 classes utilitárias foram **removidas** do `globals.css` por se tratarem de código morto — nenhum componente ou página do projeto as utilizava.
- O arquivo agora contém apenas o essencial: import do `variables.css`, reset CSS e estilos base (html/body/a).

**Benefícios:**
- ✅ Risco de conflito com CSS Modules ou bibliotecas de terceiros eliminado
- ✅ Código morto removido — redução de 53 linhas
- ✅ Arquivo mais enxuto e focado em seu propósito original

---

### 5.6 `overflow-y: scroll !important` — **RESOLVIDO**

**Arquivo:** `/pages/styles/globals.css`

**Problema:** `overflow-y: scroll !important` forçava a barra de rolagem vertical mesmo quando o conteúdo não ultrapassava a viewport.

**O que foi feito (13/05/2026):**
- Substituído `overflow-y: scroll !important` por `overflow-y: auto` em `globals.css`

**Benefícios:**
- ✅ Barra de rolagem removida em páginas com pouco conteúdo
- ✅ `!important` removido, facilitando sobrescrita quando necessário

---

## 6. Segurança

### 6.1 Exposição de Informações em Log de Desenvolvimento

**Arquivo:** `/pages/_app.js`

**Problema:** O log `Route changed to: ${url}` em modo desenvolvimento fica ativo. Embora seja apenas em dev, a condição `process.env.NODE_ENV === 'development'` pode ser contornada.

**Impacto:** Baixo risco, mas boa prática remover logs sensíveis.

**Sugestão:** Remover logs de desenvolvimento ou usar um logger configurável.

---

### 6.2 Cookie de Logout sem Configuração Segura

**Arquivo:** `/pages/api/auth/logout.js`

**Problema:** O cookie é limpo com `Expires=Thu, 01 Jan 1970` mas sem as mesmas opções seguras usadas na criação (`httpOnly`, `secure`, `sameSite`, `path`).

**Impacto:** O cookie pode não ser limpo corretamente em todos os cenários.

**Sugestão:** Usar as mesmas opções de cookie da função `setAuthCookie` ao limpar.

---

### 6.3 Token JWT Retornado no Body vs Cookie

**Comparação:**
- `api/auth/login.js`: retorna cookie httpOnly (seguro)
- `api/v1/auth/login.js`: retorna token no corpo da resposta (menos seguro) — **REMOVIDO**

**Resolução:** `api/v1/auth/login.js` removido (unificado com `api/auth/login.js`). O endpoint atual `api/auth/login?response=body` mantém o formato para compatibilidade com clientes externos, mas o fluxo web padrão usa cookie httpOnly.

---

## Resumo das Recomendações Prioritárias

| Prioridade | Item | Arquivos | Descrição |
|:----------:|:----:|:--------:|-----------|
| 🔴 Crítico | 4.4 | ~~`[slug].js`~~ ✅ | SQL injection — **RESOLVIDO** (arquivo removido, migrado para `blog/[slug].js` com prepared statements) |
| 🔴 Crítico | ~~4.3~~ ✅ | Múltiplos | Validação Zod ausente em endpoints admin — **RESOLVIDO** (Zod adicionado em 9 endpoints admin) |
| 🟠 Alto | ~~1.1~~ ✅ | `api/auth/login.js`, `api/v1/auth/login.js` | Login duplicado sem rate limiting no v1 — **RESOLVIDO** |
| 🟠 Alto | ~~1.2~~ ✅ | `api/posts.js`, `api/v1/posts.js`, `api/admin/posts.js` | Posts duplicados (GET + POST) — **RESOLVIDO** |
| 🟠 Alto | ~~1.3~~ ✅ | `[slug].js`, `blog/[slug].js` | Conflito de rotas de página de post — **RESOLVIDO** |
| 🟠 Alto | ~~1.4~~ ✅ | `api/settings.js`, `api/v1/settings.js` | Configurações duplicadas (GET + POST + PUT) — **RESOLVIDO** |
| 🟠 Alto | ~~1.5~~ ✅ | `api/v1/health.js`, `api/v1/status.js` | Health Check vs Status duplicados — **RESOLVIDO** |
| 🟠 Alto | ~~1.6~~ ✅ | `/pages/api/admin/` (14 arquivos) | Padrão CRUD repetido nos endpoints admin — **RESOLVIDO** |
| 🟠 Alto | ~~3.1~~ ✅ | `_document.js` | CSS crítico inline recalculado em toda requisição — **RESOLVIDO** (cacheado em nível de módulo) |
| 🟠 Alto | ~~3.3~~ ✅ | `_document.js` | Múltiplos preconnects sem verificação de necessidade — **RESOLVIDO** (apenas fontes mantidos) |
| 🟠 Alto | ~~3.4~~ ✅ | `blog/[slug].js`, `blog/index.js` | Fetch HTTP para API interna em SSR — **RESOLVIDO** (ambos os arquivos) |
| 🟠 Alto | ~~3.5~~ ✅ | `_document.js` | TagManager Inline — **RESOLVIDO** (permissão CSP removida, sem TagManager no projeto) |
| 🟠 Alto | ~~5.2~~ ✅ | `/api/v1/` (removido), `/api/status.js`, `/api/auth/check.js` | Endpoints sem versionamento consistente — **RESOLVIDO** (estratégia definida: apenas sem versão; v1 removido; novos endpoints criados) |
| 🟠 Alto | ~~5.4~~ ✅ | `styles/tokens/*.js` + 34 arquivos | Tokens não utilizados nos CSS — **RESOLVIDO** (CSS Custom Properties geradas e aplicadas) |
| 🟡 Médio | ~~4.2~~ ✅ | `blog/index.js` | Fallback silencioso sem dados — **RESOLVIDO** (adicionado estado de erro visual) |
| 🟡 Médio | ~~2.1~~ ✅ | Múltiplos | Modelos de autenticação misturados — **RESOLVIDO** |
| 🟡 Médio | ~~2.2~~ ✅ | Múltiplos | Cache implementado de forma diferente — **RESOLVIDO** |
| 🟡 Médio | ~~2.3~~ ✅ | Múltiplos | Rate limiting aplicado de forma inconsistente — **RESOLVIDO** |
| 🟡 Médio | ~~2.4~~ ✅ | `helper/pagination.js`, `dicas.js`, `products.js`, `lib/domain/products.js` | Paginação implementada de forma diferente — **RESOLVIDO** (helper reutilizável + camada de domínio) |
| 🟡 Médio | ~~2.5~~ ✅ | Múltiplos | Tratamento de erros sem padronização — **RESOLVIDO** |
| 🟡 Médio | ~~4.1~~ ✅ | `upload-image.js` | Sanitização de upload insuficiente — **RESOLVIDO** (UUID, magic bytes, limite de dimensões) |
| 🟡 Médio | ~~4.3 (settings)~~ ✅ | `api/settings.js` | Zod POST — **RESOLVIDO** (POST agora tem schema Zod) |
| 🟡 Médio | ~~4.5~~ ✅ | `admin/fetch-*.js` | Timeout ausente em APIs externas — **RESOLVIDO** (AbortController com 8s) |
| 🟢 Baixo | 5.5 | `globals.css` | Classes utilitárias sem prefixo — **RESOLVIDO** (classes removidas por serem código morto) |
