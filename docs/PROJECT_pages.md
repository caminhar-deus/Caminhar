# Análise da Pasta `/pages`

> **Data:** 28/06/2026
> **Objetivo:** Documentar todos os arquivos da pasta `/pages`, descrevendo localização exata, propósito e funcionalidades de cada um.
> **Total de arquivos:** 53

---

## Índice

1. [Páginas Raiz (`/pages`)](#1-páginas-raiz)
2. [API Pública (`/pages/api`)](#2-api-pública)
3. [API Admin (`/pages/api/admin`)](#3-api-admin)
4. [API Autenticação (`/pages/api/auth`)](#4-api-autenticação)
5. [Helper de API (`/pages/api/helper`)](#5-helper-de-api)
6. [Blog (`/pages/blog`)](#6-blog)
7. [Estilos Globais (`/pages/styles`)](#7-estilos-globais)
8. [Design Tokens (`/pages/styles/tokens`)](#8-design-tokens)

---

## 1. Páginas Raiz

### `/pages/_app.js`

- **Localização:** `/pages/_app.js`
- **Propósito:** Componente raiz Next.js que envolve todas as páginas da aplicação.
- **Funcionalidades:**
  - Importa estilos globais (`globals.css`)
  - Configura o sistema de notificações `react-hot-toast` (Toaster) com estilos customizados para sucesso e erro, posicionado no canto superior direito com duração de 5 segundos
  - Monitora mudanças de rota via `router.events` — o log `[Router] Route changed to:` é ativado apenas quando a variável de ambiente `NEXT_PUBLIC_LOG_ROUTE_CHANGES=true` está definida
  - Realiza cleanup do event listener para evitar memory leaks
  - **Monitoramento de performance:** Envolve toda a aplicação com `<PerformanceProvider>` (de `hooks/PerformanceProvider.js`), que instancia o `usePerformanceMetrics` uma única vez e compartilha as métricas via contexto
  - **Consumidor de performance:** Inclui o componente `<PerformanceMonitor />` dentro do provider, que chama `usePerformance()` para ativar a coleta de Web Vitals em todas as páginas sem renderizar nada no DOM

### `/pages/_document.js`

- **Localização:** `/pages/_document.js`
- **Propósito:** Personaliza o HTML document raiz com otimizações de performance, segurança e SEO.
- **Funcionalidades:**
  - **CSS crítico inline** cacheado em nível de módulo (`cachedCriticalCSS`) — executado apenas 1x na primeira requisição SSR, evitando reprocessamento desnecessário
  - **Preconnect** para domínios essenciais: `fonts.googleapis.com` e `fonts.gstatic.com`
  - **DNS prefetch** para `fonts.googleapis.com`
  - **Google Fonts** com `font-display: swap`: Inter (400, 500, 600, 700) e Montserrat (400, 500, 600, 700) — elimina FOIT
  - **Content Security Policy (CSP)** restritiva: `default-src 'self'`, script de YouTube/Spotify, style de Google Fonts, img de data/blob/HTTPS, frame de YouTube/Spotify
  - **Permissions Policy** restritiva (geolocation, camera, microphone, payment, usb bloqueados)
  - Meta tags PWA: `theme-color` adaptável (light/dark), `apple-mobile-web-app-capable`, `msapplication-*`
  - Link canônico base
  - Script inline que remove o CSS crítico após o carregamento completo da página e registra `performance.mark('document_loaded')`

### `/pages/index.js`

- **Localização:** `/pages/index.js`
- **Propósito:** Página inicial pública do projeto "O Caminhar com Deus".
- **Funcionalidades:**
  - Carrega configurações (título, subtítulo) via fetch para `/api/settings` com cache em `sessionStorage` (TTL de 1 minuto)
  - Gerencia estado de `imageSrc` com timestamp para evitar Hydration Mismatch entre SSR e CSR
  - Exibe header com título, subtítulo e imagem hero (placeholder)
  - Renderiza os componentes `ContentTabs` (abas de conteúdo) e `Testimonials` (depoimentos)
  - SEO via `next/head` com title e description dinâmicos
  - **Feedback visual de erro:** estado `settingsError` é ativado quando a API de settings retorna HTTP não-OK ou lança exceção, exibindo mensagem "Configurações temporariamente indisponíveis" abaixo do subtítulo
  - **Fallback resiliente:** em caso de falha da API, mantém os valores padrão definidos no `useState` sem impacto visual negativo

### `/pages/admin.js`

- **Localização:** `/pages/admin.js`
- **Propósito:** Painel administrativo completo para gestão de todo o conteúdo do site.
- **Funcionalidades:**
  - **Autenticação**: login com username/senha, verificação de sessão via `/api/auth/check`, logout com limpeza de sessão
  - **Controle de permissões**: cada aba do admin é condicionada à permissão do usuário via `hasPermission()`
  - **Upload e crop de imagens**: utilizando `react-easy-crop` com proporção 1100:320, zoom ajustável, redimensionamento via canvas (máx. 1100px largura), preview com estatísticas de compressão
  - **Abas de gestão**: Visão Geral (dashboard), Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Dicas do Dia
  - **Configuração de Cabeçalho**: edição de título, subtítulo e imagem principal com preview em tempo real
  - **Segurança**: Verificação de Integridade, Backup do Sistema, Rate Limiting, Cache do Sistema
  - **Usuários**: gerenciamento de usuários e permissões
  - **Auditoria**: consulta de logs de ações administrativas

### `/pages/design-system.js`

- **Localização:** `/pages/design-system.js`
- **Propósito:** Página de demonstração e documentação visual do Design System da aplicação.
- **Funcionalidades:**
  - Exibe paleta de cores: primária (Azul Serenidade), secundária (Dourado Luz) e cores de feedback
  - Demonstração de todos os componentes UI: Button (6 variantes, 4 tamanhos, 3 estados), Input (4 variações), Select, TextArea
  - Cards em 3 variantes (default, elevated, outlined) + interativo + com header/footer + com mídia
  - Badges (8 variantes + Counter + Dot)
  - Alerts (4 variantes com opções closable, leftAccent, solid)
  - Spinners (5 variantes + Container)
  - Modal demonstrativo com overlay, fechamento via ESC e transições
  - Toast de notificação
  - Componentes de layout: Stack (vertical/horizontal), Grid Responsivo
  - Documentação textual do que compõe o Design System

---

## 2. API Pública

### `/pages/api/cleanup-test-data.js`

- **Localização:** `/pages/api/cleanup-test-data.js`
- **Propósito:** Endpoint para limpeza de dados de teste gerados durante desenvolvimento.
- **Funcionalidades:**
  - Método DELETE protegido por `withAuth`
  - Remove posts cujo slug contenha o padrão `post-carga-%`
  - Retorna contagem de registros deletados
  - Respostas de erro padronizadas no formato `{ error, message }`

### `/pages/api/dicas.js`

- **Localização:** `/pages/api/dicas.js`
- **Propósito:** Endpoint público para listagem de dicas com paginação.
- **Funcionalidades:**
  - Método GET com parâmetros `page` e `limit`
  - Cache via `getOrSetCache` com chave `dicas:public:published:${page}:${limit}`
  - Rate limiting via `checkRateLimit(ip, 'api:public:dicas', 60, 60000)`
  - Paginação com `OFFSET`/`LIMIT` e `SELECT COUNT(*)`
  - Cache-Control: `public, s-maxage=60, stale-while-revalidate=300`
  - Resposta padronizada via helper `paginatedResponse()`

### `/pages/api/musicas.js`

- **Localização:** `/pages/api/musicas.js`
- **Propósito:** Endpoint público para listagem de músicas com paginação.
- **Funcionalidades:**
  - Método GET com parâmetros `page`, `limit` e `search`
  - Validação de parâmetros via Zod
  - Cache via `getOrSetCache` com chave `musicas:${page}:${limit}:${search}`
  - Rate limiting via `checkRateLimit(ip, 'api:public:musicas', 60, 60000)`
  - Cache-Control: `public, s-maxage=60, stale-while-revalidate=300`
  - Paginação com total de registros

### `/pages/api/placeholder-image.js`

- **Localização:** `/pages/api/placeholder-image.js`
- **Propósito:** Endpoint para servir imagens placeholder, principalmente para a página inicial.
- **Funcionalidades:**
  - Método GET
  - Retorna imagem principal armazenada no banco de dados ou fallback via placeholder externo
  - Se não houver imagem configurada, retorna SVG placeholder inline
  - Cache de 1 hora via `Cache-Control`

### `/pages/api/posts.js`

- **Localização:** `/pages/api/posts.js`
- **Propósito:** Endpoint unificado de posts — listagem pública e criação autenticada.
- **Funcionalidades:**
  - **GET** (público): Lista posts publicados com paginação (`page`, `limit`, `search`), cache distribuído com chaves prefixadas (`posts:list:` e `posts:search:`), rate limiting verificado antes do cache (100 req para busca, 300 para listagem)
  - **POST** (autenticado via `withAuth`): Cria novo post com validação Zod (schema `postCreateSchema`), rate limiting em mutações (30 req/min), invalidação automática de cache após criação
  - Suporta `?response=v1` para compatibilidade com formato `{ success, data, pagination, timestamp }`
  - Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`

### `/pages/api/products.js`

- **Localização:** `/pages/api/products.js`
- **Propósito:** CRUD completo de produtos com endpoints público e administrativo.
- **Funcionalidades:**
  - **GET público** (`?public=true`): Lista produtos publicados, com formatação de moeda para Real (R$), cache via `getOrSetCache`, rate limiting via `checkRateLimit`
  - **GET admin** (autenticado): Lista todos os produtos com paginação via `requireAuth()`
  - **POST** (autenticado): Cria produto delegado para `createProduct()` em `lib/domain/products.js`
  - **PUT** (autenticado): Atualiza produto delegado para `updateProduct()` em `lib/domain/products.js`
  - **DELETE** (autenticado): Remove produto delegado para `deleteProduct()` em `lib/domain/products.js`
  - Paginação centralizada via helper `paginate()` em `helper/pagination.js`
  - Log de auditoria em todas as mutações

### `/pages/api/settings.js`

- **Localização:** `/pages/api/settings.js`
- **Propósito:** Endpoint unificado de configurações do sistema.
- **Funcionalidades:**
  - **GET** (público, sem `?key`): Retorna todas as configurações principais com cache-control e rate limiting (30 req/min)
  - **GET** (autenticado, com `?key`): Retorna configuração específica com cache via `getOrSetCache`, controle de permissões admin/editor
  - **POST** (autenticado, apenas admin): Cria nova configuração com validação Zod e invalidação de cache
  - **PUT** (autenticado via `withAuth`): Atualiza configuração com validação Zod e invalidação de cache
  - Suporta `?response=v1` para compatibilidade
  - **Rate limit isolado:** `checkRateLimit` é executado em fire-and-forget com `.catch()` silencioso, sem usar `Promise.all` — falhas no rate limit nunca abortam a resposta dos settings
  - **Log estruturado:** o catch do GET público registra `error.message`, `error.stack` e `ip` para facilitar debug de falhas
  - **Variável `ip` com escopo correto:** declarada como `let` fora do `try` para ser acessível também no `catch`, evitando `ReferenceError`

### `/pages/api/status.js`

- **Localização:** `/pages/api/status.js`
- **Propósito:** Endpoint de diagnóstico e health check do sistema.
- **Funcionalidades:**
  - **GET** (padrão): Retorna diagnóstico completo com versão, status do banco PostgreSQL, Node.js, uptime e plataforma
  - **GET** (`?mode=health`): Retorna apenas `{ status: 'ok' }` para health checks de infraestrutura

### `/pages/api/upload-image.js`

- **Localização:** `/pages/api/upload-image.js`
- **Propósito:** Endpoint para upload de imagens com múltiplas camadas de segurança.
- **Funcionalidades:**
  - Método POST protegido por `withAuth`
  - Parsing de formulários com `formidable`
  - Tamanho máximo: 5MB
  - Tipos permitidos: JPEG, PNG, GIF, WebP (validação de `mimetype`)
  - **Validação de conteúdo real** via `sharp.metadata()` — verifica magic bytes, impedindo upload de arquivos com extensão falsa
  - **Limite de dimensões**: 1920×1920px máximo
  - **Nome aleatório seguro**: gerado com `crypto.randomUUID()` — elimina previsibilidade e risco de sobrescrita
  - **Extensão validada**: contra lista de extensões permitidas, com fallback seguro para `.jpg`
  - Salva em `/public/uploads/` e retorna caminho

### `/pages/api/videos.js`

- **Localização:** `/pages/api/videos.js`
- **Propósito:** Endpoint público para listagem de vídeos com paginação.
- **Funcionalidades:**
  - Método GET com parâmetros `page` e `limit`
  - Cache distribuído com TTL de 5 minutos via `getOrSetCache`
  - Rate limiting via `checkRateLimit`
  - Paginação com total de registros
  - Cache-Control: `public, s-maxage=60, stale-while-revalidate=300`

---

## 3. API Admin

> Todos os endpoints admin utilizam o **handler factory `createAdminHandler()`** de `lib/api/adminCrudHandler.js`, que centraliza: verificação de método HTTP, autenticação via `withAuth`, RBAC, rate limiting, invalidação de cache e try/catch unificado.

### `/pages/api/admin/audit.js`

- **Localização:** `/pages/api/admin/audit.js`
- **Propósito:** Consulta de logs de auditoria do sistema.
- **Funcionalidades:**
  - GET protegido com paginação
  - Lista logs ordenados por data decrescente
  - Filtro por intervalo de datas

### `/pages/api/admin/backups.js`

- **Localização:** `/pages/api/admin/backups.js`
- **Propósito:** Gerenciamento de backups do banco de dados.
- **Funcionalidades:**
  - GET: Lista backups disponíveis
  - POST: Cria novo backup manualmente
  - Protegido por JWT

### `/pages/api/admin/cache.js`

- **Localização:** `/pages/api/admin/cache.js`
- **Propósito:** Gerenciamento e monitoramento do cache Redis.
- **Funcionalidades:**
  - GET: Obtém estatísticas e métricas do cache
  - DELETE: Limpa todo o cache do sistema
  - Protegido por autenticação

### `/pages/api/admin/dicas.js`

- **Localização:** `/pages/api/admin/dicas.js`
- **Propósito:** CRUD administrativo de dicas.
- **Funcionalidades:**
  - GET: Lista dicas (incluindo não publicadas)
  - POST: Cria dica com validação Zod (`dicaSchema`)
  - PUT: Atualiza dica com validação Zod (`dicaUpdateSchema`)
  - DELETE: Remove dica
  - Protegido por JWT

### `/pages/api/admin/fetch-ml.js`

- **Localização:** `/pages/api/admin/fetch-ml.js`
- **Propósito:** Busca dados de produtos do Mercado Livre para importação facilitada.
- **Funcionalidades:**
  - POST protegido: recebe URL do produto, decodifica e extrai códigos MLB
  - 3 estratégias de fallback: API de Items, API de Products, scraping HTML
  - Todas as chamadas usam `fetchWithTimeout()` com timeout de 8 segundos
  - Retorna título, preço, imagens e descrição do produto
  - Log de auditoria na operação

### `/pages/api/admin/fetch-spotify.js`

- **Localização:** `/pages/api/admin/fetch-spotify.js`
- **Propósito:** Busca metadados de músicas do Spotify.
- **Funcionalidades:**
  - POST protegido: recebe URL do Spotify
  - 3 estratégias de busca em cascata: oEmbed, Iframe Embed, Scraping Googlebot
  - Todas as chamadas usam `fetchWithTimeout()` com timeout de 8 segundos
  - Retorna título e artista da música
  - Log de auditoria na operação

### `/pages/api/admin/fetch-youtube.js`

- **Localização:** `/pages/api/admin/fetch-youtube.js`
- **Propósito:** Busca metadados de vídeos do YouTube.
- **Funcionalidades:**
  - POST protegido: recebe URL do YouTube
  - Busca via API oEmbed pública
  - Usa `fetchWithTimeout()` com timeout de 8 segundos
  - Retorna título do vídeo
  - Log de auditoria na operação

### `/pages/api/admin/integrity.js`

- **Localização:** `/pages/api/admin/integrity.js`
- **Propósito:** Diagnóstico completo de integridade do sistema.
- **Funcionalidades:**
  - GET protegido
  - Verifica: banco de dados (conexão e tabelas), Redis (conectividade), armazenamento de uploads, backups, sistema de arquivos
  - Retorna relatório consolidado de saúde do sistema

### `/pages/api/admin/musicas.js`

- **Localização:** `/pages/api/admin/musicas.js`
- **Propósito:** CRUD administrativo de músicas.
- **Funcionalidades:**
  - GET: Lista músicas (incluindo não publicadas)
  - POST: Cria música com validação Zod (`musicaSchema`)
  - PUT: Atualiza música com validação Zod (inclui reordenação via `reorderSchema`)
  - DELETE: Remove música
  - Protegido por JWT

### `/pages/api/admin/posts.js`

- **Localização:** `/pages/api/admin/posts.js`
- **Propósito:** CRUD administrativo de posts.
- **Funcionalidades:**
  - GET: Lista posts (incluindo não publicados)
  - POST: Cria post com validação Zod (`postCreateSchema`)
  - PUT: Atualiza post com validação Zod (`postUpdateDataSchema`) e reordenação via `reorderSchema`
  - DELETE: Remove post
  - Protegido por JWT

### `/pages/api/admin/rate-limit.js`

- **Localização:** `/pages/api/admin/rate-limit.js`
- **Propósito:** Gerenciamento completo de rate limiting no Redis.
- **Funcionalidades:**
  - **GET** (sem `type`): Lista IPs bloqueados combinando `keys()` e `pipeline`
  - **GET** (`type=current_ip`): Retorna IP atual do requisitante
  - **GET** (`type=whitelist`): Lista IPs na whitelist via `smembers()`
  - **GET** (`type=audit`): Lista logs de auditoria com paginação e filtros
  - **GET** (`type=export_csv`): Exporta logs de auditoria em CSV
  - **POST**: Adiciona IP à whitelist com validação Zod
  - **DELETE**: Remove IP da whitelist ou desbloqueia IP específico
  - Tratamento de erros Redis via função `redisSafe()` com fallback silencioso

### `/pages/api/admin/roles.js`

- **Localização:** `/pages/api/admin/roles.js`
- **Propósito:** Gerenciamento de papéis (roles) e permissões do sistema.
- **Funcionalidades:**
  - GET: Lista roles e permissões (cria tabela automaticamente se não existir)
  - POST: Cria nova role com validação Zod (`roleSchema`)
  - PUT: Atualiza permissões de uma role com validação Zod (`roleUpdateSchema`)
  - DELETE: Remove role
  - Protegido por JWT

### `/pages/api/admin/stats.js`

- **Localização:** `/pages/api/admin/stats.js`
- **Propósito:** Estatísticas do dashboard administrativo.
- **Funcionalidades:**
  - GET protegido
  - 19 consultas paralelas: contagens de posts, músicas, vídeos, produtos, dicas, backups, logs de auditoria, usuários por role
  - Retorna painel consolidado de métricas

### `/pages/api/admin/users.js`

- **Localização:** `/pages/api/admin/users.js`
- **Propósito:** CRUD administrativo de usuários.
- **Funcionalidades:**
  - GET: Lista usuários (nunca retorna senhas)
  - POST: Cria usuário com validação Zod (`userCreateSchema`)
  - PUT: Atualiza usuário com validação Zod (`userUpdateSchema`) e hash automático de senha
  - DELETE: Remove usuário (impede auto-exclusão)
  - Protegido por JWT

### `/pages/api/admin/videos.js`

- **Localização:** `/pages/api/admin/videos.js`
- **Propósito:** CRUD administrativo de vídeos.
- **Funcionalidades:**
  - GET: Lista vídeos (incluindo não publicados)
  - POST: Cria vídeo
  - PUT: Atualiza vídeo
  - DELETE: Remove vídeo
  - Protegido por JWT

---

## 4. API Autenticação

### `/pages/api/auth/check.js`

- **Localização:** `/pages/api/auth/check.js`
- **Propósito:** Verificação de token de autenticação JWT.
- **Funcionalidades:**
  - GET protegido via `withAuth`
  - Verifica validade do token JWT enviado via cookie
  - Retorna dados do usuário autenticado (username, role, permissões)
  - Respostas padronizadas `{ success, data: { user } }`

### `/pages/api/auth/login.js`

- **Localização:** `/pages/api/auth/login.js`
- **Propósito:** Endpoint de autenticação (login).
- **Funcionalidades:**
  - POST apenas (retorna 405 para outros métodos)
  - Detecção de IP spoofing antes da autenticação
  - Rate limiting por IP: 5 tentativas por 60 segundos
  - Autentica via `authenticateAndGenerateToken()` da lib
  - Atualiza `last_login_at` no banco
  - Busca permissões baseadas em role
  - Gera JWT e define cookie de autenticação (httpOnly, secure condicional, sameSite strict)
  - Retorna dados do usuário: `{ id, username, role, permissions }`
  - Suporta `?response=body` para retornar token no body (modo API externa)

### `/pages/api/auth/logout.js`

- **Localização:** `/pages/api/auth/logout.js`
- **Propósito:** Endpoint de logout.
- **Funcionalidades:**
  - Aceita qualquer método HTTP
  - Limpa o cookie `token` com `serialize()` do pacote `cookie`, mesmas opções seguras da criação
  - Flag `secure` aplicada apenas em produção
  - Retorna mensagem de sucesso

---

## 5. Helper de API

### `/pages/api/helper/pagination.js`

- **Localização:** `/pages/api/helper/pagination.js`
- **Propósito:** Helper reutilizável de paginação padronizada para todos os endpoints.
- **Funcionalidades:**
  - `paginate(rawPage, rawLimit)` — Parseia e valida parâmetros, retorna `{ page, limit, offset }`
  - `buildPaginationMeta(page, limit, total)` — Gera metadados de paginação
  - `paginatedResponse(data, pagination)` — Monta resposta padronizada `{ success, data, pagination }`
  - Lança erro `INVALID_PAGINATION_PARAMS` para parâmetros inválidos

---

## 6. Blog

### `/pages/blog/index.js`

- **Localização:** `/pages/blog/index.js`
- **Propósito:** Página de listagem de posts do blog com paginação SSR.
- **Funcionalidades:**
  - `getServerSideProps` com query direta ao banco (`SELECT ... WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2`) — sem fetch HTTP interno
  - Paginação nativa via `LIMIT/OFFSET` + `COUNT(*)` no banco de dados
  - Renderiza componente `PostCard` para cada post
  - Navegação entre páginas com links "Anterior" / "Próxima"
  - Estados diferenciados: erro de carregamento (mensagem visual amigável) vs lista vazia vs posts normais
  - SEO via `next/head`

### `/pages/blog/[slug].js`

- **Localização:** `/pages/blog/[slug].js`
- **Propósito:** Página de detalhe de post do blog (rota canônica).
- **Funcionalidades:**
  - `getServerSideProps` com query direta ao banco (`SELECT ... WHERE slug = $1 AND published = true`)
  - SEO completo com Open Graph (og:type, og:url, og:title, og:description, og:image, og:locale, article:published_time) e Twitter Cards (summary_large_image)
  - URLs absolutas para SEO de redes sociais (WhatsApp, Facebook)
  - Zoom de imagem com lightbox via estado `isImageZoomed`, fecha com tecla ESC, foco automático no lightbox
  - Botões de compartilhamento: Facebook, WhatsApp, Instagram/Copiar Link + Web Share API com fallback para clipboard
  - Renderiza conteúdo em `white-space: pre-wrap`
  - Retorna 404 se post não encontrado

### `/pages/blog/Blog.module.css`

- **Localização:** `/pages/blog/Blog.module.css`
- **Propósito:** Estilos CSS Module compartilhados entre as páginas do blog.
- **Estilos definidos:**
  - `.container`: largura máxima 1200px, centralizado
  - `.header`: fundo gradiente azul, padding 4rem, texto branco
  - `.title`: tamanho 2.5rem, peso 700
  - `.subtitle`: tamanho 1.2rem, opacidade 0.9
  - `.grid`: display grid com 3 colunas, gap 24px
  - Media query para 768px: 2 colunas
  - Media query para 480px: 1 coluna

---

## 7. Estilos Globais

### `/pages/styles/globals.css`

- **Localização:** `/pages/styles/globals.css`
- **Propósito:** Estilos globais da aplicação — reset CSS e base tipográfica.
- **Características:**
  - Importa `variables.css` via `@import`
  - Reset CSS (box-sizing, margin, padding)
  - Fonte padrão via token `var(--font-family-body)` com fallback 'Inter', sans-serif
  - Background `var(--color-bg-secondary)`, texto `var(--color-text-primary)`
  - `overflow-y: auto` (sem `!important`)
  - Classe `.scroll-lock` para modais (bloqueia scroll do body)

### `/pages/styles/variables.css`

- **Localização:** `/pages/styles/variables.css`
- **Propósito:** 386 CSS Custom Properties geradas automaticamente a partir dos Design Tokens JS.
- **Características:**
  - Cores: primary, secondary, neutral, feedback, semantic, state, spiritual
  - Spacing: escala completa (spacing, space, section, gap, padding, margin)
  - Tipografia: font-family, font-size, font-weight, line-height, letter-spacing
  - Borders: border-width, border-radius
  - Shadows: elevation, semantic, colored, drop
  - Breakpoints e containers
  - Animações: duration, easing, transition
  - Opacidade e z-index
- **Nota:** Arquivo gerado — pode ser regenerado via `generateTokensCSS.js`

### `/pages/styles/generateTokensCSS.js`

- **Localização:** `/pages/styles/generateTokensCSS.js`
- **Propósito:** Gerador programático que transforma os Design Tokens JS em CSS Custom Properties.
- **Funcionalidades:**
  - Importa 9 categorias de tokens (colors, spacing, typography, borders, shadows, breakpoints, animations, opacity, zIndex) — **nota:** `sizes.js` não é importado pelo gerador
  - Exporta `generateTokensCSS()` que retorna string CSS completa
  - Exporta `tokensCSS` com o CSS pré-gerado (para uso direto)

### `/pages/styles/Home.module.css`

- **Localização:** `/pages/styles/Home.module.css`
- **Propósito:** Estilos CSS Module específicos da página inicial.
- **Características:**
  - Layout flex column, min-height 100vh
  - Título uppercase com gradiente e subtitle
  - Container de imagem com hover scale
  - Responsivo para 768px e 480px
  - Classe `.settingsError` para feedback visual de falha na carga de configurações (fonte itálica, cor terciária, espaçamento superior)
  - **Todos os valores convertidos para CSS Custom Properties**

### `/pages/styles/DesignSystem.module.css`

- **Localização:** `/pages/styles/DesignSystem.module.css`
- **Propósito:** Estilos CSS Module da página de demonstração do Design System.
- **Características:**
  - Header com gradiente azul
  - Paleta de cores visuais (primárias, secundárias, feedback)
  - Seções de demonstração com grid para componentes
  - Footer escuro
  - Responsivo para 768px
  - **Todos os valores convertidos para CSS Custom Properties**

---

## 8. Design Tokens

Todos os tokens estão em `/pages/styles/tokens/` e seguem o padrão JS de objetos nomeados exportados como `default`.

| Arquivo | Localização | Propósito |
|---------|-------------|-----------|
| `index.js` | `/pages/styles/tokens/index.js` | Barrel que reexporta todos os tokens |
| `colors.js` | `/pages/styles/tokens/colors.js` | Paleta de cores (primárias, secundárias, feedback, neutras, semânticas, espirituais) |
| `typography.js` | `/pages/styles/tokens/typography.js` | Fontes, tamanhos, pesos, line-height, letter-spacing |
| `spacing.js` | `/pages/styles/tokens/spacing.js` | Escala de espaçamentos |
| `sizes.js` | `/pages/styles/tokens/sizes.js` | Tamanhos diversos |
| `breakpoints.js` | `/pages/styles/tokens/breakpoints.js` | Breakpoints de responsividade |
| `borders.js` | `/pages/styles/tokens/borders.js` | Larguras e raios de borda |
| `shadows.js` | `/pages/styles/tokens/shadows.js` | Sombras (elevation, colored, glow) |
| `opacity.js` | `/pages/styles/tokens/opacity.js` | Valores de opacidade |
| `zIndex.js` | `/pages/styles/tokens/zIndex.js` | Hierarquia de z-index |
| `animations.js` | `/pages/styles/tokens/animations.js` | Durações, easings e transições |

---

## Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| Páginas raiz | 5 |
| APIs públicas | 10 |
| APIs admin | 15 |
| APIs autenticação | 3 |
| Helper de API | 1 |
| Páginas blog | 2 |
| CSS Module blog | 1 |
| Estilos globais e módulos | 5 |
| Design Tokens | 11 |
| **Total** | **53** |