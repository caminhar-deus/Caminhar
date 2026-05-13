# Análise da Pasta `/pages`

> **Data:** 13/05/2026 (atualizado)
> **Objetivo:** Documentar todos os arquivos da pasta `/pages`, descrevendo sua localização, propósito e funcionalidades.

---

## Índice

1. [Raiz `/pages`](#1-raiz-pages)
2. [`/pages/api`](#2-pagesapi)
3. [`/pages/api/helper`](#3-pagesapihelper)
4. [`/pages/api/admin`](#4-pagesapiadmin)
5. [`/pages/api/auth`](#5-pagesapiauth)
6. [`/pages/blog`](#6-pagesblog)
7. [`/pages/styles`](#7-pagesstyles)
8. [`/pages/styles/tokens`](#8-pagesstylestokens)

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
  - Paginação com `OFFSET`/`LIMIT` e `SELECT COUNT(*)` (adicionado 13/05/2026)
  - Cache key inclui página e limite (`dicas:public:published:${page}:${limit}`) (adicionado 13/05/2026)
  - Cache-Control header (`public, s-maxage=60, stale-while-revalidate=300`)
  - Resposta padronizada via `paginatedResponse()` (adicionado 13/05/2026)
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

> **Nota:** Endpoint unificado em 12/05/2026. O `/api/v1/posts` foi removido — GET e POST foram migrados para a raiz.

### `/pages/api/products.js`
- **Localização:** `/pages/api/products.js`
- **Propósito:** CRUD completo de produtos.
- **Funcionalidades:**
  - GET público (`?public=true`): Lista produtos sem autenticação, com paginação, formatação de moeda para Real (R$), cache via `getOrSetCache` e rate limiting
  - GET admin (sem `public`): Lista produtos com paginação, protegido por autenticação via `requireAuth()`
  - POST: Cria produto (protegido por `requireAuth()`) — delegado para `createProduct()` em `lib/domain/products.js` (adicionado 13/05/2026)
  - PUT: Atualiza produto (protegido por `requireAuth()`) — delegado para `updateProduct()` em `lib/domain/products.js` (adicionado 13/05/2026)
  - DELETE: Remove produto (protegido por `requireAuth()`) — delegado para `deleteProduct()` em `lib/domain/products.js` (adicionado 13/05/2026)
  - Paginação centralizada via helper `paginate()` em `/pages/api/helper/pagination.js` (adicionado 13/05/2026)
  - Cache e rate limiting em operações de criação/atualização/exclusão
  - Log de auditoria em todas as mutações
  - Respostas de erro padronizadas no formato `{ error, message }`
  - Tratamento de erro centralizado via try/catch no handler principal

> **Nota:** Em 13/05/2026, o `products.js` foi refatorado para usar a camada de domínio `lib/domain/products.js` e o helper de paginação. A duplicação de lógica entre `handlePublicGet` e `handleAdminGet` foi eliminada.

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

### `/pages/api/status.js`
- **Localização:** `/pages/api/status.js`
- **Propósito:** Endpoint de diagnóstico e health check do sistema. Substitui o antigo `/api/v1/status`.
- **Funcionalidades:**
  - **GET** (padrão): Retorna diagnóstico completo (versão, status do banco, Node.js, uptime, plataforma)
  - **GET** (`?mode=health`): Retorna apenas `{ status: 'ok' }` (compatível com health check)
  - Testa conexão com banco PostgreSQL

> **Nota:** Criado em 13/05/2026 para substituir `/api/v1/status`. O diretório `/pages/api/v1/` foi removido.

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

## 3. `/pages/api/helper`

### `/pages/api/helper/pagination.js`
- **Localização:** `/pages/api/helper/pagination.js`
- **Propósito:** Helper reutilizável de paginação para endpoints da API.
- **Funcionalidades:**
  - `paginate(rawPage, rawLimit)` — Parseia e valida parâmetros de paginação, retorna `{ page, limit, offset }`
  - `buildPaginationMeta(page, limit, total)` — Gera metadados de paginação
  - `paginatedResponse(data, pagination)` — Monta resposta padronizada `{ success, data, pagination }`
  - Lança erro `INVALID_PAGINATION_PARAMS` para parâmetros inválidos

> **Nota:** Criado em 13/05/2026 para centralizar e padronizar a paginação em todos os endpoints. Utilizado por `dicas.js` e `products.js`.

---

## 4. `/pages/api/admin`

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

## 5. `/pages/api/auth`

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

## 6. `/pages/blog`

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

## 7. `/pages/styles`

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
  - **Todos os valores hardcoded substituídos por CSS Custom Properties** (13/05/2026)
  - Agora serve como demonstração funcional do Design System usando os tokens

### `/pages/styles/globals.css`
- **Localização:** `/pages/styles/globals.css`
- **Propósito:** Estilos globais da aplicação.
- **Características:**
  - Importa `variables.css` via `@import`
  - Reset CSS (box-sizing, margin, padding)
  - Fonte padrão via token `var(--font-family-body)`
  - Background `var(--color-bg-secondary)`, texto `var(--color-text-primary)`
  - `overflow-y: auto` (13/05/2026 — substituído de `scroll !important`)
  - Todos os valores hardcoded substituídos por CSS Custom Properties (13/05/2026)
  - Classes utilitárias removidas em 13/05/2026 (`.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label`) — código morto sem referências no projeto

### `/pages/styles/variables.css`
- **Localização:** `/pages/styles/variables.css`
- **Propósito:** CSS Custom Properties geradas a partir dos Design Tokens JS.
- **Características:**
  - 386 variáveis CSS no `:root`
  - Cores: primary, secondary, neutral, feedback, semantic, state, spiritual
  - Spacing: escala completa (spacing, space, section, gap, padding, margin)
  - Tipografia: font-family, font-size, font-weight, line-height, letter-spacing
  - Borders: border-width, border-radius
  - Shadows: elevation, semantic, colored, drop
  - Breakpoints e containers
  - Animações: duration, easing, transition
  - Opacidade e z-index
- **Nota:** Gerado automaticamente a partir dos arquivos em `tokens/`. Pode ser regenerado via `generateTokensCSS.js`.

### `/pages/styles/generateTokensCSS.js`
- **Localização:** `/pages/styles/generateTokensCSS.js`
- **Propósito:** Gerador programático que transforma os Design Tokens JS em CSS Custom Properties.
- **Características:**
  - Importa todos os 11 arquivos de tokens
  - Exporta `generateTokensCSS()` que retorna string CSS completa
  - Exporta `tokensCSS` com o CSS pré-gerado

### `/pages/styles/Home.module.css`
- **Localização:** `/pages/styles/Home.module.css`
- **Propósito:** Estilos CSS Module para a página inicial.
- **Características:**
  - Layout flex column, min-height 100vh
  - Título grande uppercase com subtitle
  - Container de imagem com hover scale
  - Responsivo para 768px e 480px
  - **Todos os valores hardcoded substituídos por CSS Custom Properties** (13/05/2026)
  - Cores não-padronizadas (`#2c3e50`, `#7f8c8d`) substituídas por tokens semânticos

---

## 8. `/pages/styles/tokens`

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

## Arquivos Removidos

### `/pages/[slug].js` (12/05/2026)
- Rota catch-all removida para eliminar conflito de rotas.
- Conteúdo e SEO migrados para `/pages/blog/[slug].js`.

### `/pages/api/v1/` (13/05/2026)
- Diretório completo removido em 13/05/2026 como parte da estratégia de versionamento.
- Substituído por:
  - `/pages/api/status.js` — substitui `/api/v1/status`
  - `/pages/api/auth/check.js` — substitui `/api/v1/auth/check`
  - PUT/DELETE de vídeos já gerenciados por `/pages/api/admin/videos.js`
- Arquivos já removidos em 12/05/2026:
  - `/pages/api/v1/health.js` — unificado com `/api/status?mode=health`
  - `/pages/api/v1/posts.js` — unificado com `/api/posts?response=v1`
  - `/pages/api/v1/settings.js` — unificado com `/api/settings?response=v1`
  - `/pages/api/v1/auth/login.js` — unificado com `/api/auth/login?response=body`

---

## Resumo Quantitativo

| Categoria                    | Quantidade |
|------------------------------|:----------:|
| Páginas (raiz)               |     5*     |
| APIs (raiz)                  |     10     |
| APIs Helper                  |     1      |
| APIs Admin                   |     14     |
| APIs Auth                    |     3†     |
| Páginas Blog                 |     2      |
| CSS Modules Blog             |     1      |
| CSS Globais, Módulos e Variáveis |     5      |
| Tokens de Design             |     11     |
| **Total**                    |  **52**   |

> *\*Arquivo `/pages/[slug].js` removido em 12/05/2026.*
> *†Endpoint `/api/auth/check` criado em 13/05/2026 para substituir `/api/v1/auth/check`.*
> *‡Novos arquivos: `variables.css` e `generateTokensCSS.js` criados em 13/05/2026 como parte da tokenização CSS.*
