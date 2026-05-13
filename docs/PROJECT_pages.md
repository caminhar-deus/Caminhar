# Análise da Pasta `/pages`

> **Data:** 12/05/2026 (atualizado)
> **Objetivo:** Documentar todos os arquivos da pasta `/pages`, descrevendo sua localização, propósito e funcionalidades.

---

## Índice

1. [Raiz `/pages`](#1-raiz-pages)
2. [`/pages/api`](#2-pagesapi)
3. [`/pages/api/admin`](#3-pagesapiadmin)
4. [`/pages/api/auth`](#4-pagesapiauth)
5. [`/pages/api/v1`](#5-pagesapiv1)
6. [`/pages/api/v1/auth`](#6-pagesapiv1auth)
7. [`/pages/api/v1/videos`](#7-pagesapiv1videos)
8. [`/pages/blog`](#8-pagesblog)
9. [`/pages/styles`](#9-pagesstyles)
10. [`/pages/styles/tokens`](#10-pagesstylestokens)

---

## 1. Raiz `/pages`

### `/pages/_app.js`
- **Localização:** `/pages/_app.js`
- **Propósito:** Componente raiz da aplicação Next.js. Envolve todas as páginas.
- **Funcionalidades:**
  - Importa estilos globais (`globals.css`)
  - Monitora navegação via `router.events` (apenas em desenvolvimento)
  - Renderiza o componente `Toaster` (react-hot-toast) no canto superior direito com configurações de estilo para sucesso, erro e loading
  - Configuração de 5 segundos de duração para toasts

### `/pages/_document.js`
- **Localização:** `/pages/_document.js`
- **Propósito:** Personaliza o HTML document da aplicação Next.js.
- **Funcionalidades:**
  - Preconnect apenas para domínios essenciais globais (Google Fonts: `fonts.googleapis.com` e `fonts.gstatic.com`)
  - DNS prefetch para Google Fonts
  - Carregamento de fontes Google Fonts com `&display=swap` para evitar FOIT: Inter (400, 500, 600, 700) e Montserrat (400, 500, 600, 700) (adicionado 13/05/2026)
  - CSS crítico inline cacheado em nível de módulo (`cachedCriticalCSS`) — evita reprocessamento a cada SSR
  - Meta tags de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `referrer`)
  - Meta tag de color-scheme
  - Script para remover CSS crítico após carregamento completo

> **Nota:** Preconnects para YouTube, Spotify e imagens (i.scdn.co, img.youtube.com) removidos em 12/05/2026 — devem ser adicionados condicionalmente nas páginas que os utilizam.

### `/pages/index.js`
- **Localização:** `/pages/index.js`
- **Propósito:** Página inicial do projeto.
- **Funcionalidades:**
  - Carrega configurações (título, subtítulo, imagem) via fetch para `/api/settings`
  - Gerencia estado de `title`, `subtitle`, `imageSrc` com timestamp para evitar Hydration Mismatch
  - Exibe header com imagem hero, `ContentTabs` e `Testimonials`
  - SEO com Open Graph via `next/head`

**Arquivo removido (12/05/2026):** `/pages/[slug].js`
- Rota catch-all removida para eliminar conflito de rotas com `/admin`, `/blog`, `/design-system`, etc.
- O conteúdo e SEO foram migrados para `/pages/blog/[slug].js`, que é a rota canônica para exibição de posts.

### `/pages/admin.js`
- **Localização:** `/pages/admin.js`
- **Propósito:** Painel administrativo completo do projeto.
- **Funcionalidades:**
  - Sistema de autenticação (login/logout) com verificação de permissões por role
  - Upload e crop de imagens com `react-easy-crop`
  - Redimensionamento de imagens via canvas
  - Gerenciamento de Posts, Músicas, Vídeos, Produtos, Dicas
  - Configuração de cabeçalho (título, subtítulo, imagem)
  - Abas de Segurança: RateLimit, IntegrityCheck, Backup, Cache
  - Gerenciamento de Usuários e Roles
  - Auditoria de ações
  - Dashboard com estatísticas

### `/pages/design-system.js`
- **Localização:** `/pages/design-system.js`
- **Propósito:** Página de demonstração e documentação do Design System.
- **Funcionalidades:**
  - Exibe paletas de cores (primárias, secundárias, feedback)
  - Demonstração de botões, inputs, cards, badges, alerts
  - Spinners, modal, toasts
  - Componentes de layout
  - Header com gradiente e footer

---

## 2. `/pages/api`

### `/pages/api/cleanup-test-data.js`
- **Localização:** `/pages/api/cleanup-test-data.js`
- **Propósito:** Endpoint para limpeza de dados de teste.
- **Funcionalidades:**
  - Método DELETE protegido por `withAuth`
  - Remove posts de teste cujo slug contenha o padrão `post-carga-%`
  - Retorna contagem de registros deletados
  - Respostas de erro padronizadas no formato `{ error, message }` com `console.error()` (alteração 12/05/2026)

### `/pages/api/dicas.js`
- **Localização:** `/pages/api/dicas.js`
- **Propósito:** Endpoint público para dicas.
- **Funcionalidades:**
  - Método GET
  - Cache via `getOrSetCache` com chave `dicas:public:published` (adicionado 12/05/2026)
  - Rate limiting via `checkRateLimit(ip, 'api:public:dicas', 60, 60000)` (adicionado 12/05/2026)
  - Cache-Control header (`public, s-maxage=60, stale-while-revalidate=300`)
  - Retorna dicas publicadas ordenadas por `id ASC` no formato `{ success: true, data, count }`
  - Respostas de erro padronizadas com `{ error, message }` e `console.error()`

### `/pages/api/musicas.js`
- **Localização:** `/pages/api/musicas.js`
- **Propósito:** Endpoint público para músicas com paginação.
- **Funcionalidades:**
  - Método GET com parâmetros `page` e `limit`
  - Validação Zod para parâmetros de consulta
  - Cache via `getOrSetCache` com chave `musicas:${page}:${limit}:${search}` (alterado 12/05/2026 — antes usava `getCachedData/setCachedData` manual)
  - Rate limiting via `checkRateLimit(ip, 'api:public:musicas', 60, 60000)` (adicionado 12/05/2026)
  - Cache-Control header (`public, s-maxage=60, stale-while-revalidate=300`)
  - Paginação com total de registros
  - Respostas de erro padronizadas no formato `{ error, message }`

### `/pages/api/placeholder-image.js`
- **Localização:** `/pages/api/placeholder-image.js`
- **Propósito:** Endpoint para servir imagens placeholder.
- **Funcionalidades:**
  - Método GET
  - Retorna imagem principal do banco de dados ou fallback via `fetch`
  - Se não houver imagem, retorna SVG placeholder inline
  - Cache de 1 hora via `Cache-Control`

### `/pages/api/posts.js`
- **Localização:** `/pages/api/posts.js`
- **Propósito:** Endpoint unificado de posts (público e criação autenticada).
- **Funcionalidades:**
  - **GET** (público): Lista posts publicados com paginação (`page`, `limit`, `search`), cache distribuído e rate limiting.
  - **POST** (autenticado): Cria novo post com validação Zod, rate limiting em mutações (30 requisições/min), autenticação via `withAuth` (alterado 12/05/2026 — antes usava `getAuthToken()` + `verifyToken()` manual), e invalidação de cache automática.
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, pagination, timestamp }`.
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026).

> **Nota:** Endpoint unificado em 12/05/2026. O `/api/v1/posts` agora é um wrapper que delega para este endpoint. O `POST` foi migrado do v1 para a raiz, unificando a lógica de criação de posts. Em 12/05/2026 o POST foi migrado de autenticação manual para `withAuth`.

### `/pages/api/products.js`
- **Localização:** `/pages/api/products.js`
- **Propósito:** CRUD completo de produtos.
- **Funcionalidades:**
  - GET público (`?public=true`): Lista produtos sem autenticação, com paginação, formatação de moeda para Real (R$), cache via `getOrSetCache` (adicionado 12/05/2026) e rate limiting (adicionado 12/05/2026)
  - GET admin (sem `public`): Lista produtos com paginação, protegido por autenticação via `requireAuth()` (alterado 12/05/2026)
  - POST: Cria produto (protegido por `requireAuth()`) com validação de campos obrigatórios e cálculo automático de posição
  - PUT: Atualiza produto (protegido por `requireAuth()`)
  - DELETE: Remove produto (protegido por `requireAuth()`)
  - Cache e rate limiting em operações de criação/atualização/exclusão
  - Log de auditoria em todas as mutações
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026)
  - Tratamento de erro centralizado via try/catch no handler principal (alterado 12/05/2026)

> **Nota:** Em 12/05/2026, o `products.js` foi reestruturado: (1) autenticação manual `getAuthToken()` + `verifyToken()` repetida em cada case foi substituída pelo middleware `requireAuth()`; (2) GET público agora usa `getOrSetCache` para cache; (3) GET público agora tem `checkRateLimit`; (4) erros padronizados com `{ error, message }`.

### `/pages/api/settings.js`
- **Localização:** `/pages/api/settings.js`
- **Propósito:** Endpoint unificado de configurações do sistema.
- **Funcionalidades:**
  - **GET** (sem `?key`): Retorna configurações principais (público), com cache-control header e rate limiting (adicionado 12/05/2026).
  - **GET** (com `?key`): Retorna configuração específica com cache via `getOrSetCache` (autenticado, permissões admin/editor).
  - **POST**: Cria nova configuração (autenticado, apenas role admin), invalida cache.
  - **PUT**: Atualiza configuração (autenticado via `withAuth`), validação Zod, invalida cache.
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, timestamp }`.
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026).

> **Nota:** Endpoint unificado em 12/05/2026. O `/api/v1/settings` foi removido — GET (com e sem key), POST e PUT foram incorporados à raiz. Em 12/05/2026 foi adicionado rate limiting no GET público.

### `/pages/api/upload-image.js`
- **Localização:** `/pages/api/upload-image.js`
- **Propósito:** Endpoint para upload de imagens.
- **Funcionalidades:**
  - Método POST protegido por `withAuth`
  - Usa `formidable` para parsing de formulários
  - Tamanho máximo: 5MB
  - Tipos permitidos: JPEG, PNG, GIF, WebP (validação de `mimetype`)
  - **Validação de conteúdo real (magic bytes)**: Usa `sharp.metadata()` para verificar a assinatura do arquivo, impedindo upload de arquivos com extensão falsa (adicionado 12/05/2026)
  - **Limite de dimensões**: Verifica largura e altura máxima (1920×1920px) com mensagem de erro informativa (adicionado 12/05/2026)
  - **Nome aleatório seguro**: Gera nome único com `crypto.randomUUID()` em vez de timestamp, eliminando previsibilidade e risco de sobrescrita (adicionado 12/05/2026)
  - **Extensão validada**: Extensão do arquivo validada contra lista de extensões permitidas; fallback seguro para `.jpg` (adicionado 12/05/2026)
  - Salva em `/public/uploads/`
  - Retorna caminho da imagem
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026)

### `/pages/api/videos.js`
- **Localização:** `/pages/api/videos.js`
- **Propósito:** Endpoint público para vídeos com paginação.
- **Funcionalidades:**
  - Método GET com parâmetros `page` e `limit`
  - Cache distribuído com TTL de 5 minutos via `getOrSetCache`
  - Rate limiting via `checkRateLimit`
  - Paginação com total de registros
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026)

---

## 3. `/pages/api/admin`

> **Atualização (12/05/2026):** Todos os 14 endpoints admin foram refatorados para usar o handler factory `createAdminHandler()` em `lib/api/adminCrudHandler.js`, que centraliza verificação de método HTTP, autenticação via `withAuth`, RBAC, rate limiting, invalidação de cache e try/catch unificado.

### `/pages/api/admin/audit.js`
- **Localização:** `/pages/api/admin/audit.js`
- **Propósito:** Endpoint de consulta de logs de auditoria.
- **Funcionalidades:**
  - Método GET protegido por autenticação
  - Lista logs de auditoria com paginação
  - Ordenação por data decrescente

### `/pages/api/admin/backups.js`
- **Localização:** `/pages/api/admin/backups.js`
- **Propósito:** Endpoint para gerenciamento de backups do banco de dados.
- **Funcionalidades:**
  - GET: Lista backups disponíveis
  - POST: Cria novo backup manualmente
  - Protegido por JWT

### `/pages/api/admin/cache.js`
- **Localização:** `/pages/api/admin/cache.js`
- **Propósito:** Endpoint para gerenciamento de cache.
- **Funcionalidades:**
  - GET: Obtém estatísticas do cache
  - DELETE: Limpa todo o cache
  - Protegido por autenticação

### `/pages/api/admin/dicas.js`
- **Localização:** `/pages/api/admin/dicas.js`
- **Propósito:** Endpoint CRUD de dicas para administração.
- **Funcionalidades:**
  - GET: Lista dicas (incluindo não publicadas)
  - POST: Cria dica com validação Zod (`dicaSchema`) — nome e conteúdo obrigatórios (adicionado 12/05/2026)
  - PUT: Atualiza dica com validação Zod (`dicaUpdateSchema`) — id, nome e conteúdo obrigatórios (adicionado 12/05/2026)
  - DELETE: Remove dica
  - Protegido por JWT

### `/pages/api/admin/fetch-ml.js`
- **Localização:** `/pages/api/admin/fetch-ml.js`
- **Propósito:** Endpoint para buscar dados de produtos do Mercado Livre.
- **Funcionalidades:**
  - Método POST protegido
  - Recebe `url` do produto no body
  - Decodifica URL e extrai códigos MLB
  - Busca dados via API de Items, Products ou fallback de scraping HTML
  - **Timeout de 8 segundos**: Todas as 5 chamadas `fetch` usam `fetchWithTimeout()` com `AbortController` (adicionado 12/05/2026)
  - Retorna título, preço, imagens e descrição do produto
  - Log de auditoria na operação

### `/pages/api/admin/fetch-spotify.js`
- **Localização:** `/pages/api/admin/fetch-spotify.js`
- **Propósito:** Endpoint para buscar dados do Spotify.
- **Funcionalidades:**
  - Método POST protegido
  - 3 estratégias de busca em cascata: oEmbed, Iframe Embed e Scraping Googlebot
  - **Timeout de 8 segundos**: Todas as 3 estratégias usam `fetchWithTimeout()` com `AbortController` (adicionado 12/05/2026)
  - Retorna título e artista da música
  - Log de auditoria na operação

### `/pages/api/admin/fetch-youtube.js`
- **Localização:** `/pages/api/admin/fetch-youtube.js`
- **Propósito:** Endpoint para buscar dados do YouTube.
- **Funcionalidades:**
  - Método POST protegido
  - Busca informações de vídeo via API oEmbed pública
  - **Timeout de 8 segundos**: Usa `fetchWithTimeout()` com `AbortController` (adicionado 12/05/2026)
  - Retorna título do vídeo
  - Log de auditoria na operação

### `/pages/api/admin/musicas.js`
- **Localização:** `/pages/api/admin/musicas.js`
- **Propósito:** Endpoint CRUD de músicas para administração.
- **Funcionalidades:**
  - GET: Lista músicas (incluindo não publicadas)
  - POST: Cria música com validação Zod (`musicaSchema`) — título, artista e URL do Spotify obrigatórios (adicionado 12/05/2026)
  - PUT: Atualiza música com validação Zod — inclui validação de reordenação via `reorderSchema` (adicionado 12/05/2026)
  - DELETE: Remove música
  - Protegido por JWT

### `/pages/api/admin/posts.js`
- **Localização:** `/pages/api/admin/posts.js`
- **Propósito:** Endpoint CRUD de posts para administração.
- **Funcionalidades:**
  - GET: Lista posts (incluindo não publicados)
  - POST: Cria post com validação Zod (`postCreateSchema`) (já existente)
  - PUT: Atualiza post com validação Zod (`postUpdateDataSchema`) e reordenação via `reorderSchema` (já existente)
  - DELETE: Remove post
  - Protegido por JWT

### `/pages/api/admin/rate-limit.js`
- **Localização:** `/pages/api/admin/rate-limit.js`
- **Propósito:** Endpoint para gerenciamento de rate limiting.
- **Funcionalidades:**
  - GET: Obtém status/configurações do rate limit
  - POST: Adiciona IP à whitelist com validação Zod (`ipSchema`) (adicionado 12/05/2026)
  - DELETE: Remove IP da whitelist ou desbloqueia IP
  - Protegido por autenticação

### `/pages/api/admin/roles.js`
- **Localização:** `/pages/api/admin/roles.js`
- **Propósito:** Endpoint para gerenciamento de papéis (roles) e permissões.
- **Funcionalidades:**
  - GET: Lista roles e permissões (cria tabela automaticamente se não existir)
  - POST: Cria nova role com validação Zod (`roleSchema`) — nome obrigatório e permissões como array opcional (adicionado 12/05/2026)
  - PUT: Atualiza permissões de uma role com validação Zod (`roleUpdateSchema`) (adicionado 12/05/2026)
  - DELETE: Remove role
  - Protegido por JWT

### `/pages/api/admin/stats.js`
- **Localização:** `/pages/api/admin/stats.js`
- **Propósito:** Endpoint de estatísticas do dashboard.
- **Funcionalidades:**
  - Método GET protegido
  - Retorna contagens de: posts, músicas, vídeos, produtos, dicas, backups, auditoria

### `/pages/api/admin/users.js`
- **Localização:** `/pages/api/admin/users.js`
- **Propósito:** Endpoint CRUD de usuários para administração.
- **Funcionalidades:**
  - GET: Lista usuários (nunca retorna senhas)
  - POST: Cria usuário com validação Zod (`userCreateSchema`) — username e password obrigatórios, role opcional (adicionado 12/05/2026)
  - PUT: Atualiza usuário com validação Zod (`userUpdateSchema`) — hash automático de senha (adicionado 12/05/2026)
  - DELETE: Remove usuário (impede auto-exclusão)
  - Protegido por JWT

### `/pages/api/admin/videos.js`
- **Localização:** `/pages/api/admin/videos.js`
- **Propósito:** Endpoint CRUD de vídeos para administração.
- **Funcionalidades:**
  - GET: Lista vídeos (incluindo não publicados)
  - POST: Cria vídeo
  - PUT: Atualiza vídeo
  - DELETE: Remove vídeo
  - Protegido por JWT

---

## 4. `/pages/api/auth`

### `/pages/api/auth/login.js`
- **Localização:** `/pages/api/auth/login.js`
- **Propósito:** Endpoint de autenticação (login).
- **Funcionalidades:**
  - Método POST apenas (retorna 405 padronizado para outros)
  - Rate limiting por IP: 5 tentativas por 60 segundos
  - Autentica via `authenticateAndGenerateToken()` da lib
  - Atualiza `last_login_at` no banco
  - Busca permissões baseadas em role
  - Gera JWT e define cookie de autenticação
  - Retorna dados do usuário: `{ id, username, role, permissions }`
  - Respostas de erro padronizadas no formato `{ error, message }` (alterado 12/05/2026)

### `/pages/api/auth/logout.js`
- **Localização:** `/pages/api/auth/logout.js`
- **Propósito:** Endpoint de logout.
- **Funcionalidades:**
  - Aceita qualquer método HTTP
  - Limpa o cookie `token` (Expires no passado)
  - Retorna mensagem de sucesso

---

## 5. `/pages/api/v1`

**Arquivo removido (12/05/2026):** `/pages/api/v1/health.js`
- Unificado com `/api/v1/status?mode=health` — o health check simples { status: 'ok' } agora é servido pelo endpoint `/api/v1/status` através do parâmetro `?mode=health`.
- Sistemas de monitoramento que usavam a rota `/api/v1/health` devem migrar para `/api/v1/status?mode=health`.

**Arquivo removido (12/05/2026):** `/pages/api/v1/posts.js`
- Unificado com `/pages/api/posts` — GET e POST foram migrados para o endpoint raiz com suporte a `?response=v1` para compatibilidade.
- O endpoint `/api/posts?response=v1` substitui o antigo `/api/v1/posts` com o mesmo formato de resposta `{ success, data, pagination, timestamp }`, além de incluir rate limiting em POST e paginação completa em GET que não existiam no v1.
- Clientes que usavam a rota v1 devem migrar para `/api/posts?response=v1`.

**Arquivo removido (12/05/2026):** `/pages/api/v1/settings.js`
- Unificado com `/pages/api/settings` — GET (com e sem key), POST e PUT foram migrados para o endpoint raiz com suporte a `?response=v1` para compatibilidade.
- O endpoint `/api/settings?response=v1` substitui o antigo `/api/v1/settings` com o mesmo formato de resposta `{ success, data, timestamp }`, além de incluir validação Zod e invalidação de cache.
- Clientes que usavam a rota v1 devem migrar para `/api/settings?response=v1`.

### `/pages/api/v1/status.js`
- **Localização:** `/pages/api/v1/status.js`
- **Propósito:** Endpoint de diagnóstico do sistema.
- **Funcionalidades:**
  - Retorna status da API, versão Node.js, plataforma, uptime
  - Testa conexão com banco PostgreSQL
  - Suporta `?mode=health` para health check simples (`{ status: 'ok' }`)

> **Nota:** Endpoint unificado em 12/05/2026. O `/api/v1/health` foi removido — health check disponível via `?mode=health`.

---

## 6. `/pages/api/v1/auth`

### `/pages/api/v1/auth/check.js`
- **Localização:** `/pages/api/v1/auth/check.js`
- **Propósito:** Endpoint v1 para verificação de token JWT.
- **Funcionalidades:**
  - Método GET apenas
  - Extrai token do header `Authorization` ou cookie
  - Verifica validade do token via `verifyToken()`
  - Retorna dados do usuário decodificados: `{ id, username, role, iat, exp }`

---

**Arquivo removido (12/05/2026):** `/pages/api/v1/auth/login.js`
- Unificado com `/pages/api/auth/login` — a lógica foi centralizada na função `authenticateAndGenerateToken()` em `lib/auth.js`.
- O endpoint `/api/auth/login?response=body` substitui o antigo `/api/v1/auth/login` com o mesmo formato de resposta `{ success, data: { token, token_type, expires_in, user } }`, além de incluir rate limiting, validação de entrada e busca de permissões que não existiam no v1.
- Clientes que usavam a rota v1 devem migrar para `/api/auth/login?response=body`.

## 7. `/pages/api/v1/videos`

### `/pages/api/v1/videos/[id].js`
- **Localização:** `/pages/api/v1/videos/[id].js`
- **Propósito:** Endpoint v1 para operações em vídeo específico.
- **Funcionalidades:**
  - PUT: Atualiza vídeo por ID (autenticado JWT)
  - DELETE: Remove vídeo por ID (autenticado JWT)
  - Invalida cache após operações
  - Valida ID do vídeo

---

## 8. `/pages/blog`

### `/pages/blog/index.js`
- **Localização:** `/pages/blog/index.js`
- **Propósito:** Página de listagem de posts do blog.
- **Funcionalidades:**
  - `getServerSideProps` com query direta ao banco (`SELECT ... WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2`) — sem fetch HTTP interno
  - Paginação nativa via `LIMIT/OFFSET` no banco de dados + `COUNT(*)` para total de páginas
  - Renderiza `PostCard` para cada post
  - Navegação entre páginas com links
  - Estados diferenciados: erro (`fetchError`) vs lista vazia vs posts normais
  - SEO via `next/head`

> **Nota:** Convertido para SSR com query direta ao banco em 12/05/2026, substituindo o antigo fetch HTTP para `/api/posts`. Paginação agora é feita diretamente no banco (não mais via slice manual). Adicionado estado de erro visual com mensagem amigável.

### `/pages/blog/[slug].js`
- **Localização:** `/pages/blog/[slug].js`
- **Propósito:** Página de detalhe de post do blog (rota canônica).
- **Funcionalidades:**
  - `getServerSideProps` com query direta ao banco (`SELECT ... WHERE slug = $1 AND published = true`) — sem fetch HTTP interno
  - SEO completo com Open Graph e Twitter Cards (URLs absolutas)
  - Exibe imagem com zoom via estado `isZoomed` (fecha com tecla Esc)
  - Botões de compartilhamento: Facebook, WhatsApp, Instagram/Copiar Link + Web Share API
  - Renderiza conteúdo em `white-space: pre-wrap`
  - Link de volta para a página inicial
  - Retorna 404 se post não encontrado

> **Nota:** Convertido para SSR com query direta ao banco em 12/05/2026, substituindo o antigo fetch HTTP para `/api/posts`. O SEO completo foi migrado de `/pages/[slug].js`.

### `/pages/blog/Blog.module.css`
- **Localização:** `/pages/blog/Blog.module.css`
- **Propósito:** Estilos CSS Module para as páginas do blog.
- **Estilos definidos:**
  - `.container`: largura máxima 1200px, centralizado
  - `.header`: fundo gradiente azul, padding 4rem, texto branco
  - `.title`: tamanho 2.5rem, peso 700
  - `.subtitle`: tamanho 1.2rem, opacidade 0.9
  - `.grid`: display grid com 3 colunas, gap 24px
  - Media query para 768px: 2 colunas
  - Media query para 480px: 1 coluna

---

## 9. `/pages/styles`

### `/pages/styles/DesignSystem.module.css`
- **Localização:** `/pages/styles/DesignSystem.module.css`
- **Propósito:** Estilos CSS Module para a página de Design System.
- **Características:**
  - 180 linhas de CSS
  - Header com gradiente azul gradient
  - Seções de demonstração com grid
  - Paleta de cores (primárias, secundárias, feedback)
  - Componentes de demonstração (buttons, inputs, cards, badges, alerts, spinners, modal)
  - Footer escuro
  - Responsivo para 768px

### `/pages/styles/globals.css`
- **Localização:** `/pages/styles/globals.css`
- **Propósito:** Estilos globais da aplicação.
- **Características:**
  - Reset CSS (box-sizing, margin, padding)
  - Fonte padrão `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (13/05/2026 — Inter adicionada como primária com fallback)
  - Background `#f8f9fa`, cor de texto `#333`
  - `overflow-y: scroll !important` para evitar layout shift
  - Classes utilitárias: `.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label`

### `/pages/styles/Home.module.css`
- **Localização:** `/pages/styles/Home.module.css`
- **Propósito:** Estilos CSS Module para a página inicial.
- **Características:**
  - Layout flex column, min-height 100vh
  - Título grande (3rem) uppercase com subtitle
  - Container de imagem com hover scale
  - Responsivo para 768px e 480px
  - Footer fixo no final da página

---

## 10. `/pages/styles/tokens`

### `/pages/styles/tokens/index.js`
- **Localização:** `/pages/styles/tokens/index.js`
- **Propósito:** Arquivo barrel que exporta todos os tokens de design.

### `/pages/styles/tokens/colors.js`
- **Localização:** `/pages/styles/tokens/colors.js`
- **Propósito:** Definição de cores do design system.
- **Conteúdo:** Paleta de cores primárias, secundárias e de feedback.

### `/pages/styles/tokens/typography.js`
- **Localização:** `/pages/styles/tokens/typography.js`
- **Propósito:** Definição de tipografia do design system.
- **Conteúdo:** Fontes, tamanhos, pesos, line-height.

### `/pages/styles/tokens/spacing.js`
- **Localização:** `/pages/styles/tokens/spacing.js`
- **Propósito:** Definição de espaçamentos do design system.

### `/pages/styles/tokens/sizes.js`
- **Localização:** `/pages/styles/tokens/sizes.js`
- **Propósito:** Definição de tamanhos do design system.

### `/pages/styles/tokens/breakpoints.js`
- **Localização:** `/pages/styles/tokens/breakpoints.js`
- **Propósito:** Definição de breakpoints de responsividade.

### `/pages/styles/tokens/borders.js`
- **Localização:** `/pages/styles/tokens/borders.js`
- **Propósito:** Definição de bordas e border-radius do design system.

### `/pages/styles/tokens/shadows.js`
- **Localização:** `/pages/styles/tokens/shadows.js`
- **Propósito:** Definição de sombras do design system.

### `/pages/styles/tokens/opacity.js`
- **Localização:** `/pages/styles/tokens/opacity.js`
- **Propósito:** Definição de opacidades do design system.

### `/pages/styles/tokens/zIndex.js`
- **Localização:** `/pages/styles/tokens/zIndex.js`
- **Propósito:** Definição de índices z (z-index) do design system.

### `/pages/styles/tokens/animations.js`
- **Localização:** `/pages/styles/tokens/animations.js`
- **Propósito:** Definição de animações e transições do design system.

---

## Resumo Quantitativo

| Categoria                    | Quantidade |
|------------------------------|:----------:|
| Páginas (raiz)               |     5*     |
| APIs (raiz)                  |     9      |
| APIs Admin                   |     14     |
| APIs Auth                    |     2      |
| APIs v1                      |     1†     |
| APIs v1/auth                 |     1‡     |
| APIs v1/videos               |     1      |
| Páginas Blog                 |     2      |
| CSS Modules Blog             |     1      |
| CSS Globais e Módulos        |     3      |
| Tokens de Design             |     11     |
| **Total**                    |  **50**   |

> *\*Arquivo `/pages/[slug].js` removido em 12/05/2026 — rota catch-all eliminada, conteúdo e SEO migrados para `/pages/blog/[slug].js`.*
> *†Arquivos `/pages/api/v1/health.js`, `/pages/api/v1/posts.js` e `/pages/api/v1/settings.js` removidos em 12/05/2026 — unificados com `/pages/api/v1/status.js`, `/pages/api/posts.js` e `/pages/api/settings.js` respectivamente.*
> *‡Arquivo `/pages/api/v1/auth/login.js` removido em 12/05/2026 — unificado com `/pages/api/auth/login.js`.*