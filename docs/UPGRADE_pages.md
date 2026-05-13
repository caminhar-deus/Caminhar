# Relatório de Melhorias e Correções - `/pages`

> **Data:** 12/05/2026 (atualizado)
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

### 2.4 Paginação Implementada de Forma Diferente

**Problema:** Cada endpoint implementa paginação manualmente:
- `api/posts.js`: slice manual com `(page - 1) * limit`
- `api/musicas.js`: query SQL com `OFFSET` e `LIMIT`
- `api/videos.js`: slice manual
- `api/dicas.js`: sem paginação (limite fixo de 100)
- `api/products.js`: slice manual

**Impacto:** Código duplicado e comportamentos potencialmente diferentes.

**Sugestão:** Criar um helper de paginação reutilizável.

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

### 3.1 CSS Crítico Inline Chamado em Toda Requisição

**Arquivo:** `/pages/_document.js`

**Problema:** A função `extractCriticalCSS()` é chamada a cada renderização do lado do servidor, potencialmente executando lógica pesada de parsing de CSS.

**Impacto:** Aumenta o tempo de resposta de cada requisição.

**Sugestão:** Pré-calcular o CSS crítico em build time e armazenar em cache.

---

### 3.2 Pré-carregamento de Fontes sem Estratégia de Fallback

**Arquivo:** `/pages/_document.js`

**Problema:** As fontes Montserrat e Inter são pré-carregadas com `preload`, mas não há estratégia de fallback caso o download falhe.

**Impacto:** FOIT (Flash of Invisible Text) se as fontes não carregarem.

**Sugestão:** Implementar font-display: swap ou fallback com fontes do sistema.

---

### 3.3 Múltiplos Preconnects sem Verificação de Necessidade

**Arquivo:** `/pages/_document.js`

**Problema:** São feitos preconnects para 6 domínios diferentes (Google Fonts, YouTube, Spotify, etc.) mesmo que a página atual não utilize todos eles.

**Impacto:** Conexões desnecessárias consumindo recursos do navegador.

**Sugestão:** Aplicar preconnect condicional baseado no conteúdo da página.

---

### 3.4 Fetch para API Interna em Server-Side

**Arquivos:**
- `/pages/blog/index.js` - faz `fetch('http://.../api/posts')` no servidor

**Arquivo corrigido (12/05/2026):** `/pages/blog/[slug].js`
- Antes: `fetch('http://.../api/posts?slug=x')` no servidor
- Depois: Query direta ao banco (`SELECT ... WHERE slug = $1 AND published = true`)

**Pendente:** `/pages/blog/index.js` ainda faz `fetch('http://.../api/posts')` no servidor. Sugestão: chamar a função de banco de dados diretamente no `getServerSideProps` ou usar um helper compartilhado.

---

### 3.5 TagManager Inline (_document.js)

**Arquivo:** `/pages/_document.js`

**Problema:** Scripts do Google TagManager são injetados inline no HTML, bloqueando a renderização.

**Impacto:** Impacta negativamente o Core Web Vitals (LCP).

**Sugestão:** Usar `next/script` com estratégia `afterInteractive` ou `lazyOnload`.

---

## 4. Fragilidade e Falta de Validação

### 4.1 Ausência de Sanitização em Upload de Imagem

**Arquivo:** `/pages/api/upload-image.js`

**Problema:** O nome original do arquivo é preservado no nome salvo (com timestamp prefixado). Não há verificação de conteúdo real do arquivo (apenas extensão). Não há limite de resolução.

**Impacto:** Risco de upload de arquivos maliciosos com extensão falsa. Possível ataque de sobrescrita se nomes coincidirem.

**Sugestão:** Validar o tipo MIME real do arquivo, gerar nome aleatório seguro e verificar dimensões.

---

### 4.2 Fallback Silencioso sem Dados

**Arquivo:** `/pages/blog/index.js`

**Problema:** Se a API de posts falhar, o fallback retorna `posts: []`, `currentPage: 1` sem nenhum aviso ao usuário.

**Impacto:** Usuário vê uma página de blog vazia sem entender o motivo.

**Sugestão:** Adicionar um estado de erro ou mensagem amigável quando a API falhar.

---

### 4.3 Validação Zod Inconsistente

**Problema:** Alguns endpoints usam validação Zod (`api/musicas.js`, `api/settings.js`, `api/v1/posts.js`, `api/v1/settings.js`), mas a maioria dos endpoints admin **não** usa validação nos dados de entrada.

**Impacto:** Dados mal formatados podem corromper o banco de dados.

**Sugestão:** Aplicar validação Zod em todos os endpoints que recebem dados do usuário.

---

### 4.4 Query SQL sem Prepared Statements

**Arquivo:** ~~`/pages/[slug].js`~~ — **REMOVIDO** (rota catch-all eliminada em 12/05/2026)

**Problema:** A query `SELECT * FROM posts WHERE slug = '${slug}' AND published = true` usava interpolação de string, vulnerável a SQL injection.

**Resolução:** Arquivo removido. O conteúdo foi migrado para `/pages/blog/[slug].js`, que usa prepared statements (`$1`).

---

### 4.5 Ausência de Tratamento para Timeout de API Externa

**Arquivos:**
- `/pages/api/admin/fetch-ml.js`
- `/pages/api/admin/fetch-spotify.js`
- `/pages/api/admin/fetch-youtube.js`

**Problema:** As chamadas a APIs externas (Letras.mus.br, Spotify, YouTube) não têm configuração explícita de timeout.

**Impacto:** Uma API externa lenta pode travar o endpoint Next.js, consumindo recursos do servidor.

**Sugestão:** Adicionar timeout com `AbortController` (ex: 5-10 segundos).

---

## 5. Manutenibilidade e Padronização

### 5.1 Tags Padrão Repetidas nos Endpoints Admin

**Arquivos:** Todos em `/pages/api/admin/`

**Problema:** Praticamente todos os endpoints admin repetiam o bloco de verificação de método HTTP com retorno 405 e estrutura try/catch idêntica.

**Código repetido:**
```javascript
if (req.method !== 'GET') {
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: 'Método não permitido'
  });
}
```

**Resolução:** Resolvido via handler factory `createAdminHandler()` em `lib/api/adminCrudHandler.js` (item 1.6).

---

### 5.2 Endpoints sem Versionamento Consistente

**Problema:** O projeto mistura endpoints sem versão (`/api/posts`) e versionados (`/api/v1/posts`), mas a lógica é essencialmente a mesma.

**Impacto:** Dúvida sobre qual endpoint usar. Manutenção duplicada entre versões.

**Sugestão:** Definir uma estratégia clara de versionamento e migrar gradualmente.

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

### 5.4 Tokens de Design Subutilizados

**Arquivos:** `/pages/styles/tokens/*.js` (11 arquivos)

**Problema:** Os tokens de design são definidos em arquivos JavaScript, mas os CSS Modules (`Home.module.css`, `DesignSystem.module.css`, `globals.css`) usam valores hardcoded em vez de referenciar os tokens.

**Impacto:** Mudanças de design exigem alterações em múltiplos arquivos. Os tokens perdem seu propósito.

**Sugestão:** Utilizar CSS Custom Properties (variáveis CSS) geradas a partir dos tokens, ou usar os tokens JS nos componentes de página.

---

### 5.5 Classes Utilitárias no CSS Global

**Arquivo:** `/pages/styles/globals.css`

**Classes definidas:** `.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label`

**Problema:** Classes utilitárias em CSS global podem conflitar com CSS Modules ou bibliotecas de terceiros, causando estilos inesperados.

**Impacto:** Dificuldade de debug e possível vazamento de estilos.

**Sugestão:** Prefixar classes utilitárias (ex: `.g-container`, `.g-btn`) ou mover para um arquivo separado.

---

### 5.6 `overflow-y: scroll !important` Agressivo

**Arquivo:** `/pages/styles/globals.css`

**Problema:** `overflow-y: scroll !important` força a barra de rolagem vertical mesmo quando o conteúdo não ultrapassa a viewport, além do uso de `!important` que dificulta sobrescrita.

**Impacto:** Aparecimento desnecessário de barra de rolagem em páginas com pouco conteúdo.

**Sugestão:** Usar `overflow-y: auto` ou aplicar a regra seletivamente.

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
| 🔴 Crítico | 4.3 | Múltiplos | Validação Zod ausente em endpoints admin |
| 🟠 Alto | ~~1.1~~ ✅ | `api/auth/login.js`, `api/v1/auth/login.js` | Login duplicado sem rate limiting no v1 — **RESOLVIDO** |
| 🟠 Alto | ~~1.2~~ ✅ | `api/posts.js`, `api/v1/posts.js`, `api/admin/posts.js` | Posts duplicados (GET + POST) — **RESOLVIDO** |
| 🟠 Alto | ~~1.3~~ ✅ | `[slug].js`, `blog/[slug].js` | Conflito de rotas de página de post — **RESOLVIDO** |
| 🟠 Alto | ~~1.4~~ ✅ | `api/settings.js`, `api/v1/settings.js` | Configurações duplicadas (GET + POST + PUT) — **RESOLVIDO** |
| 🟠 Alto | ~~1.5~~ ✅ | `api/v1/health.js`, `api/v1/status.js` | Health Check vs Status duplicados — **RESOLVIDO** |
| 🟠 Alto | ~~1.6~~ ✅ | `/pages/api/admin/` (14 arquivos) | Padrão CRUD repetido nos endpoints admin — **RESOLVIDO** |
| 🟠 Alto | ~~3.4~~ ✅ | `blog/[slug].js` | Fetch HTTP para API interna em SSR (blog/[slug].js) — **RESOLVIDO** |
| 🟠 Alto | 3.4 | `blog/index.js` | Fetch HTTP para API interna em SSR (blog/index.js) |
| 🟠 Alto | 5.4 | `styles/tokens/*.js` | Tokens não utilizados nos CSS |
| 🟡 Médio | ~~2.1~~ ✅ | Múltiplos | Modelos de autenticação misturados — **RESOLVIDO** |
| 🟡 Médio | ~~2.2~~ ✅ | Múltiplos | Cache implementado de forma diferente — **RESOLVIDO** |
| 🟡 Médio | ~~2.3~~ ✅ | Múltiplos | Rate limiting aplicado de forma inconsistente — **RESOLVIDO** |
| 🟡 Médio | ~~2.5~~ ✅ | Múltiplos | Tratamento de erros sem padronização — **RESOLVIDO** |
| 🟡 Médio | 4.1 | `upload-image.js` | Sanitização de upload insuficiente |
| 🟡 Médio | 4.5 | `admin/fetch-*.js` | Timeout ausente em APIs externas |
| 🟢 Baixo | 5.5 | `globals.css` | Classes utilitárias sem prefixo |
| 🟢 Baixo | 5.6 | `globals.css` | `!important` agressivo no overflow |