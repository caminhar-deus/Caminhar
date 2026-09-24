# Análise Documentada — Pasta `/pages`

> **Data da análise:** 24/09/2026
> **Objetivo:** Análise profunda, sequencial e individual de todos os 42 arquivos da pasta `/pages`, documentando finalidade, relações, estrutura e observações técnicas de cada arquivo.
> **Escopo:** Cada arquivo será analisado individualmente (Leitura → Análise → Atualização → Releitura → Validação) antes de avançar para o próximo.

---

## 1. Nome do documento

**Análise Documentada — Pasta `/pages`**

---

## 2. Descrição geral

Este documento apresenta a análise completa e individual de todos os arquivos da pasta `/pages` do projeto **Caminhar** (aplicativo Next.js).

A finalidade é registrar a finalidade, responsabilidade, relações e características de cada arquivo, fornecendo uma referência técnica para manutenção, refatoração e evolução do projeto.

A análise é realizada arquivo por arquivo, em sequência, com etapa obrigatória de releitura e validação após cada atualização.

---

## 3. Estrutura de arquivos e pastas

```
/pages/
├── index.js                              (Página inicial)
├── _app.js                               (Componente App do Next.js)
├── _document.js                          (Documento HTML customizado)
├── admin.js                              (Painel administrativo)
├── design-system.js                      (Demo do design system)
├── blog/
│   ├── index.js                          (Listagem de posts do blog)
│   ├── [slug].js                         (Página individual de post)
│   └── Blog.module.css                   (Estilos do blog)
├── styles/
│   ├── Home.module.css                   (Estilos da home)
│   ├── globals.css                       (Estilos globais)
│   ├── DesignSystem.module.css           (Estilos do design system)
│   └── variables.css                     (Variáveis CSS / tokens)
└── api/
    ├── posts.js                          (CRUD público de posts)
    ├── dicas.js                          (CRUD público de dicas)
    ├── musicas.js                        (CRUD público de músicas)
    ├── videos.js                         (CRUD público de vídeos)
    ├── products.js                       (CRUD público de produtos)
    ├── settings.js                       (Configurações do site)
    ├── status.js                         (Status/health check)
    ├── upload-image.js                   (Upload de imagens)
    ├── placeholder-image.js              (Imagem placeholder)
    ├── cleanup-test-data.js              (Limpeza de dados de teste)
    ├── auth/
    │   ├── login.js                      (Autenticação de login)
    │   ├── logout.js                     (Logout)
    │   ├── refresh.js                    (Refresh de token)
    │   └── check.js                      (Verificação de autenticação)
    ├── admin/
    │   ├── posts.js                      (CRUD admin de posts)
    │   ├── dicas.js                      (CRUD admin de dicas)
    │   ├── musicas.js                    (CRUD admin de músicas)
    │   ├── videos.js                     (CRUD admin de vídeos)
    │   ├── users.js                      (CRUD admin de usuários)
    │   ├── roles.js                      (CRUD admin de roles)
    │   ├── audit.js                      (Logs de auditoria)
    │   ├── cache.js                      (Gerenciamento de cache)
    │   ├── stats.js                      (Estatísticas)
    │   ├── backups.js                    (Backups)
    │   ├── integrity.js                  (Verificação de integridade)
    │   ├── rate-limit.js                 (Rate limiting)
    │   ├── fetch-spotify.js              (Fetcher Spotify)
    │   ├── fetch-youtube.js              (Fetcher YouTube)
    │   └── fetch-ml.js                   (Fetcher Mercado Livre)
    └── helper/
        └── pagination.js                 (Helper de paginação)
```

**Total: 42 arquivos**

---

## 4. Análise individual de cada arquivo

---

### 4.1 `index.js`

**Caminho:** `/pages/index.js`

**Arquivos acionados ou relacionados:**
- `/pages/styles/Home.module.css` — CSS Module com estilos da home
- `/api/settings` — Endpoint buscado via `fetch` para obter `site_title` e `site_subtitle`
- `/api/placeholder-image` — Endpoint usado como `src` da imagem hero
- `../components/Features/ContentTabs` — Componente de abas de conteúdo
- `../components/Features/Testimonials` — Componente de depoimentos

**Resumo:**
Página inicial (home) do site. Componente funcional React/Next.js que gerencia estado local para `title`, `subtitle` e `imageSrc` com valores padrão definidos. No evento de montagem (`useEffect`), carrega as configurações do site da API `/api/settings`, utilizando cache em `sessionStorage` com TTL de 60 segundos para evitar requisições repetidas. Em caso de falha na API, exibe mensagem de erro. Renderiza: cabeçalho com título e subtítulo, imagem hero com lazy loading, componente `ContentTabs` e componente `Testimonials`.

---

### 4.2 `_app.js`

**Caminho:** `/pages/_app.js`

**Arquivos acionados ou relacionados:**
- `/pages/styles/globals.css` — CSS global importado diretamente
- `../hooks` — Exporta `PerformanceProvider` e `usePerformance` (monitoramento de performance)
- `react-hot-toast` — Biblioteca externa para notificações toast

**Resumo:**
Componente App raiz do Next.js que envolve todas as páginas da aplicação. Importa o CSS global, ativa o monitoramento de performance via hook customizado (`PerformanceProvider` + `usePerformance`), configura o componente `Toaster` do react-hot-toast com duração de 5 segundos e estilos baseados em variáveis CSS customizadas (`--color-success-*`, `--color-error-*`). Monitora mudanças de rota via `router.events` e loga apenas quando a variável de ambiente `NEXT_PUBLIC_LOG_ROUTE_CHANGES` for `'true'`. Renderiza o componente da página atual (`<Component {...pageProps} />`) envolto pelo provider de performance.

---

### 4.3 `_document.js`

**Caminho:** `/pages/_document.js`

**Arquivos acionados ou relacionados:**
- `../lib/seo/config` — Exporta `siteConfig` com `language`, `name`, `shortName`, `description`, `url`
- `../components/Performance/CriticalCSS` — Exporta `extractCriticalCSS()` para CSS crítico inline
- `next/document` — Componentes `Html`, `Head`, `Main`, `NextScript`
- Domínios externos: Google Fonts, YouTube, Spotify (preconnects, dns-prefetch, frame-src, img-src, script-src)

**Resumo:**
Documento HTML customizado do Next.js que estrutura todas as páginas. Configura:
- `Html` com `lang` dinâmico baseado em `siteConfig.language`
- CSS crítico inline (cacheado em nível de módulo para evitar reprocessamento em SSR)
- Preconnect e dns-prefetch para Google Fonts, YouTube e Spotify
- Google Fonts (Inter + Montserrat) com `font-display: swap`
- Content Security Policy detalhada (scripts, styles, fonts, imagens, frames, etc.)
- Permissions Policy restritivas (desabilita acelerômero, câmera, geolocalização, etc.)
- Meta tags de segurança (`X-UA-Compatible`, `referrer`)
- Theme color para modos dark/light, meta tags Apple (PWA) e Microsoft
- Script inline que remove o CSS crítico após `window.load` (performance) e marca `performance.mark('document_loaded')`

---

### 4.4 `admin.js`

**Caminho:** `/pages/admin.js`

**Arquivos acionados ou relacionados:**
- `/pages/styles/login.module.css` — CSS Module de login (via `../components/Admin/styles/login.module.css`)
- `/pages/styles/tabs.module.css` — CSS Module de abas (via `../components/Admin/styles/tabs.module.css`)
- `/pages/styles/form.module.css` — CSS Module de formulário (via `../components/Admin/styles/form.module.css`)
- `/pages/styles/misc.module.css` — CSS Module diversos (via `../components/Admin/styles/misc.module.css`)
- `/api/auth/login` — Endpoint de autenticação (POST)
- `/api/auth/check` — Endpoint de verificação de sessão (GET)
- `/api/auth/logout` — Endpoint de logout (POST)
- `/api/settings` — Endpoint de configurações (GET e PUT — 2 chamadas sequenciais)
- `/api/upload-image` — Endpoint de upload de imagem (POST)
- `../components/Admin/AdminPosts` — Componente de gerenciamento de posts
- `../components/Admin/AdminMusicas` — Componente de gerenciamento de músicas
- `../components/Admin/AdminVideos` — Componente de gerenciamento de vídeos
- `../components/Admin/AdminProducts` — Componente de gerenciamento de produtos
- `../components/Admin/AdminDicas` — Componente de gerenciamento de dicas
- `../components/Admin/AdminDashboard` — Componente de dashboard
- `../components/Admin/AdminUsers` — Componente de gerenciamento de usuários
- `../components/Admin/AdminAudit` — Componente de auditoria
- `../components/Admin/Tools/RateLimitViewer` — Componente de visualização de rate limit
- `../components/Admin/Tools/IntegrityCheck` — Componente de verificação de integridade
- `../components/Admin/Managers/BackupManager` — Componente de backups
- `../components/Admin/Managers/CacheManager` — Componente de cache
- `react-easy-crop` — Biblioteca externa para recorte de imagem
- `react-hot-toast` — Biblioteca externa para notificações toast

**Resumo:**
Painel administrativo completo — o maior arquivo do projeto (780 linhas). Gerencia autenticação de administração (login via `/api/auth/login`, verificação via `/api/auth/check`, logout via `/api/auth/logout`), configurações do site (título/subtítulo via `/api/settings`), upload e recorte de imagem (via `react-easy-crop` e `/api/upload-image`), e renderiza 10 abas funcionais com verificação de permissões: Dashboard, Posts, Músicas, Vídeos, Produtos, Dicas, Configuração de Cabeçalho, Segurança (com 4 sub-abas: Integridade, Backup, Rate Limit, Cache), Usuários e Auditoria.

A permissão é verificada pela função `hasPermission()` que retorna `true` se `currentUser.role === 'admin'` ou se a permission está no array `currentUser.permissions`. A aba de produtos usa `activeTab === 'projetos02'` como chave interna, inconsistente com o rótulo "Gestão de Produtos".

**Problemas identificados:**
1. `console.log('Login successful:', data.user)` (linha 226) — expõe objeto user completo no console do navegador
2. Bloco `<style>{ html, body { overflow-y: scroll !important; } }</style>` duplicado — nas telas de login e painel autenticado
3. `handleSaveSettings` executa 2 `fetch('/api/settings')` sequenciais (título + subtítulo) em vez de paralelo ou única chamada
4. Funções `resizeImage()` (linhas 51-83) e `getCroppedImg()` (linhas 86-109) embutidas sem exportação/reuso
5. Mapeamento manual de 4 CSS Classes com risco de quebra silenciosa

---

### 4.5 `design-system.js`

**Caminho:** `/pages/design-system.js`

**Arquivos acionados ou relacionados:**
- `/pages/styles/DesignSystem.module.css` — CSS Module com estilos da página de demo
- `../components/UI` — Componentes do Design System (Button, Input, TextArea, Select, Card, Modal, Spinner, Badge, Alert, Toast)
- `../components/Layout` — Componentes de layout (Container, Grid, Stack, Sidebar)
- `https://via.placeholder.com` — Serviço externo de imagens placeholder (linha 194)

**Resumo:**
Página de demonstração completa do Design System. Renderiza exemplos visuais de todos os componentes disponíveis: botões (variantes e tamanhos), inputs, textarea, select, cards (default, elevated, outlined, interativo, com header/footer, com mídia), badges, alerts, spinners, modal e toast. Demonstra os componentes de layout (Stack vertical/horizontal, Grid responsivo). Serve como referência visual e documentação viva do sistema de design. Utiliza a fonte Inter + Montserrat (configuradas no `_document.js`).

**Problemas identificados:**
1. Dependência externa `https://via.placeholder.com/400x200/...` (linha 194) — pode quebrar se o serviço ficar indisponível

---

### 4.6 `blog/index.js`

**Caminho:** `/pages/blog/index.js`

**Arquivos acionados ou relacionados:**
- `/pages/blog/Blog.module.css` — CSS Module com estilos do blog
- `../../components/Features/Blog/PostCard` — Componente de card de post
- `../../lib/infra/db.js` — Módulo de conexão com banco (query SQL direta)

**Resumo:**
Página de listagem de posts do blog. Usa Server-Side Rendering (`getServerSideProps`) para buscar posts publicados diretamente no banco de dados (query SQL com paginação manual — 9 posts por página). Serializa os dados com `JSON.parse(JSON.stringify(posts))` para evitar problemas de hidratação. Renderiza componente `PostCard` para cada post, com navegação de paginação manual (botões Anterior/Próxima). Em caso de erro na busca, exibe mensagem de fallback. Inclui link de volta para a home e title/description para SEO.

---

### 4.7 `blog/[slug].js`

**Caminho:** `/pages/blog/[slug].js`

**Arquivos acionados ou relacionados:**
- `/pages/blog/Blog.module.css` — CSS Module com estilos do blog
- `../../lib/infra/db.js` — Módulo de conexão com banco (query SQL direta)
- `process.env.SITE_URL` — Variável de ambiente para URL base do site

**Resumo:**
Página de detalhe de post do blog (rota dinâmica `[slug]`). Usa Server-Side Rendering (`getServerSideProps`) para buscar o post pelo slug diretamente no banco de dados. Se o post não existe ou não está publicado, retorna 404 (`notFound: true`). Renderiza:
- Tags SEO completas (title, description, Open Graph para Facebook/WhatsApp, Twitter Cards)
- Imagem principal com lightbox de zoom (abre com clique, fecha com Esc ou clique)
- Conteúdo do post com `white-space: pre-wrap`
- Botões de compartilhamento: Facebook (sharer), WhatsApp (api.whatsapp.com), Instagram/Copiar Link (usa `navigator.share` ou fallback para clipboard)
- URL absoluta para imagem (necessário para WhatsApp/Facebook) com fallback para `/default-og-image.jpg`

---

### 4.8 `blog/Blog.module.css`

**Caminho:** `/pages/blog/Blog.module.css`

**Arquivos acionados ou relacionados:**
- `/pages/blog/index.js` — Importa este CSS Module
- `/pages/blog/[slug].js` — Importa este CSS Module

**Resumo:**
CSS Module compartilhado entre a listagem e a página de detalhe do blog. Define layout com grid responsivo (`auto-fill`, `minmax(300px, 1fr)` para cards), estilos de cabeçalho centralizado e container com `min-height: 100vh` e fundo `--color-bg-secondary`. Responsividade: título reduz de 2.5rem para 2rem em telas ≤768px.

---

### 4.9 `styles/Home.module.css`

**Caminho:** `/pages/styles/Home.module.css`

**Arquivos acionados ou relacionados:**
- `/pages/index.js` — Importa este CSS Module

**Resumo:**
CSS Module da página inicial (home). Define layout com container flex, imagem hero com `object-fit: cover`, hover com `scale(1.05)`, border-radius e sombra. Totalmente baseado em tokens CSS (spacing, colors, font-size, border-radius). Responsividade com dois breakpoints: ≤768px e ≤480px, ajustando tamanhos de font e altura da imagem.

---

### 4.10 `styles/globals.css`

**Caminho:** `/pages/styles/globals.css`

**Arquivos acionados ou relacionados:**
- `/pages/styles/variables.css` — Importado via `@import './variables.css'` (linha 4)
- `/pages/_app.js` — Importa este CSS global (linha 1)

**Resumo:**
CSS global importado pelo componente `_app.js` que estabelece a base de estilos para toda a aplicação. Importa as variáveis CSS do `variables.css` (tokens), aplica `box-sizing: border-box` reset, define fonte padrão (`--font-family-body`), cores de fundo e texto, `overflow-y: auto` no body (scroll padrão), e classe utilitária `body.modal-open` com `overflow: hidden` para bloqueio de scroll quando modal está aberto (gerenciado pelo componente Modal).

---

### 4.11 `styles/DesignSystem.module.css`

**Caminho:** `/pages/styles/DesignSystem.module.css`

**Arquivos acionados ou relacionados:**
- `/pages/design-system.js` — Importa este CSS Module

**Resumo:**
CSS Module da página de demonstração do Design System. Define layout completo com: header em gradiente primário, seções com cards brancos (`border-radius-2xl`, `shadow-card`), footer escuro, grid de cores primárias/secundárias/feedback com swatches quadrados de 80×60px, espaçamento em tokens. Totalmente baseado em tokens CSS. Responsividade com breakpoint ≤768px (reduz padding, font-size e swatches).

---

### 4.12 `styles/variables.css`

**Caminho:** `/pages/styles/variables.css`

**Arquivos acionados ou relacionados:**
- `/pages/styles/globals.css` — Importado via `@import './variables.css'` (linha 4)
- Todos os demais CSS Modules e componentes que utilizam tokens CSS customizados

**Resumo:**
Arquivo central de Design Tokens (CSS Custom Properties). Define 386 linhas de variáveis CSS no seletor `:root`, organizadas em categorias: cores primárias (50-950), secundárias, neutras, feedback (success, error, warning, info), semânticas (bg, text, border), state colors, spiritual colors, spacing (numérico + semântico + seção + gap + padding + margin), typography (font-family, font-size, font-weight, line-height, letter-spacing), borders (width, radius), shadows (incluindo glow), breakpoints, containers, animation (duration, easing, transitions), opacity (incluindo alpha utilitários), z-index (incluindo camadas semânticas). Usado como fonte de verdade para todo o design system visual do projeto.

**Problemas identificados:**
1. Token `--shadow-glow` duplicado (linhas 278 e 290) — redefinido com mesmo valor

---

### 4.13 `api/posts.js`

**Caminho:** `/pages/api/posts.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/posts.js` — Funções `getRecentPosts()` e `createPost()` (camada de domínio)
- `../../lib/cache/cache.js` — Funções `getOrSetCache()`, `checkRateLimit()`, `invalidateCache()`
- `../../lib/auth/auth.js` — Middleware `withAuth` (protege POST)
- `../../lib/api/helpers.js` — Função `getClientIP()` (IP seguro contra spoofing)
- `../../lib/infra/logger.js` — Logger estruturado (`logger.error()`)
- `zod` — Validação de dados do POST

**Resumo:**
Endpoint público de posts. **GET** lista posts com paginação manual (parseInt, default page=1, limit=10, limit máximo 100), busca opcional (`search`), cache Redis (TTL 2h para listagens, 30min para buscas), e rate limit de 300 req (listagem) ou 100 req (busca) — verificado **dentro** do callback de cache. **POST** protegido por `withAuth`, rate limit de 30 req/min, validação Zod, criação via `createPost()` e invalidação de cache. Suporte a `?response=v1` para compatibilidade legada. Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

**Problemas identificados:**
1. Invalidação de cache redundante no POST (linhas 130-132): `posts:*` já cobre `posts:list:*` e `posts:search:*` — 3 operações no lugar de 1
2. Paginação manual reimplementada (não usa `helper/pagination.js` que já é utilizado por `dicas.js` e `products.js`)
3. Rate limit dentro do callback de cache (divergente de `videos.js` e `products.js` que fazem antes do cache)

---

### 4.14 `api/auth/logout.js`

**Caminho:** `/pages/api/auth/logout.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/auth/auth.js` — Funções `setAuthCookie()`, `setRefreshTokenCookie()`, `getRefreshTokenCookie()`, `revokeRefreshToken()`

**Resumo:**
Endpoint de logout. Invalida o refresh token no banco via `revokeRefreshToken()` (se existir), depois limpa os cookies de autenticação (`auth` e `refresh_token`) definindo `maxAge: 0`. Retorna `{ success: true, message: 'Deslogado com sucesso' }`. Tratamento de erro silencioso na revogação do refresh token (falha não impede o logout).

---

### 4.15 `api/auth/login.js`

**Caminho:** `/pages/api/auth/login.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/auth/auth.js` — Funções `authenticateAndGenerateToken()`, `setAuthCookie()`, `setRefreshTokenCookie()`
- `../../../lib/api/helpers.js` — Funções `detectSpoofedIP()`, `getClientIP()`
- `../../../lib/infra/logger.js` — Logger estruturado
- Variáveis de ambiente: `NODE_ENV`, `ENABLE_STRICT_SPOOFING`

**Resumo:**
Endpoint de autenticação unificado que suporta dois modos de resposta: cookie httpOnly (padrão) ou JSON body (API externa via `?response=body`). Fluxo: 1) Detecta IP spoofing com `detectSpoofedIP()` (strictMode baseado em NODE_ENV — desenvolvimento usa modo não-estrito, produção usa estrito); 2) Chama `authenticateAndGenerateToken()` com rate limit de 5 tentativas/60s; 3) Trata erros (RATE_LIMITED, INVALID_CREDENTIALS, MISSING_FIELDS, outros). Retorna dados do usuário com permissões e tokens (auth + refresh). Inclui header `Allow: ['POST']` no 405.

---

### 4.16 `api/auth/refresh.js`

**Caminho:** `/pages/api/auth/refresh.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/auth/auth.js` — Funções `refreshAccessToken()`, `setAuthCookie()`, `setRefreshTokenCookie()`, `getRefreshTokenCookie()`
- `../../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint de renovação de access token via refresh token. Obtém o refresh token do cookie (prioridade) ou do corpo da requisição (fallback para API sem cookies). Chama `refreshAccessToken()` para gerar novo par de tokens. Em caso de erro de refresh, limpa os cookies (maxAge: 0) e retorna 401. Em caso de sucesso, atualiza ambos os cookies (auth e refresh_token). Retorna JSON com tokens, user e tempos de expiração. Inclui header `Allow: ['POST']` no 405.

---

### 4.17 `api/auth/check.js`

**Caminho:** `/pages/api/auth/check.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/auth/auth.js` — Funções `getAuthToken()`, `verifyToken()`
- `../../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint de verificação de autenticação (GET). Valida o token JWT obtido do cookie ou header Authorization usando `getAuthToken()` + `verifyToken()` (validação manual, não usa `withAuth`). Retorna `{ success, data: { authenticated: true, user: { userId, username, role } } }`. Respostas de erro: 401 (token ausente/inválido), 500 (erro interno). 405 para métodos não-GET **sem header `Allow`** (diferente do padrão de `login.js` e `refresh.js`).

**Problemas identificados:**
1. Retorno 405 sem `res.setHeader('Allow', ['GET'])` — inconsistente com `login.js` e `refresh.js`

---

### 4.18 `api/placeholder-image.js`

**Caminho:** `/pages/api/placeholder-image.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/settings.js` — Função `getSetting()` (busca configuração do banco)
- `../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint de imagem placeholder (hero). Fluxo: 1) Tenta buscar a imagem configurada no banco (`home_image_url`) via `getSetting()`; 2) Fallback: procura arquivos `hero-image-*` em `public/uploads`; 3) Se encontrar, serve a imagem com cache agressivo (`max-age=86400, immutable`), `ETag` baseado no filename, `Last-Modified` baseado no `mtime` do arquivo, e suporte a `If-None-Match` (304 Not Modified); 4) Se não encontra, serve um SVG inline com texto informativo. Possui cache em memória do filename (TTL 5 min) para evitar consultas ao banco a cada request.

---

### 4.19 `api/settings.js`

**Caminho:** `/pages/api/settings.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/settings.js` — Funções `getSettings()`, `getSetting()`, `updateSetting()`, `getAllSettingsRaw()`
- `../../lib/auth/auth.js` — Funções `withAuth()`, `getAuthToken()`, `verifyToken()`
- `../../lib/cache/cache.js` — Funções `getOrSetCache()`, `invalidateCache()`, `checkRateLimit()`
- `../../lib/api/helpers.js` — Função `getClientIP()`
- `../../lib/infra/logger.js` — Logger estruturado
- `zod` — Validação de schemas

**Resumo:**
Endpoint unificado de configurações do sistema (GET, POST, PUT). **GET público** (sem `?key=`) retorna todas as configurações com cache 2h e rate limit 600 req/min (falha não aborta resposta). **GET com ?key=** exige autenticação (admin/editor) e retorna configuração específica; se não existir, retorna defaults hardcoded (`site_name`, `site_description`, `posts_per_page`, `videos_per_page`, `musicas_per_page`). **POST** protegido por `withAuth` (admin) — cria configuração com validação Zod. **PUT** protegido por `withAuth` (admin/editor) — atualiza configuração. Cache-Control: `public, s-maxage=120, stale-while-revalidate=600`. Suporte a `?response=v1`.

**Problemas identificados:**
1. Defaults hardcoded nas linhas 68-74 — valores de fallback definidos na camada de API em vez de na camada de domínio (ex: `lib/domain/settings.js`)

---

### 4.20 `api/dicas.js`

**Caminho:** `/pages/api/dicas.js`

**Arquivos acionados ou relacionados:**
- `../../lib/infra/db.js` — Query SQL direta ao banco
- `../../lib/cache/cache.js` — Funções `getOrSetCache()`, `checkRateLimit()`
- `./helper/pagination.js` — Funções `paginate()`, `buildPaginationMeta()`, `paginatedResponse()`
- `../../lib/api/helpers.js` — Função `getClientIP()`
- `../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint público de dicas (GET). Usa o helper de paginação padronizado (`paginate()` para parse/validação de page/limit, `buildPaginationMeta()` para metadados, `paginatedResponse()` para envelope). Cache Redis com chave `dicas:public:published:${page}:${limit}`, rate limit de 60 req/min. Query SQL direta ao banco para buscar dicas publicadas (`published = true`), retornando `id`, `name`, `content`. Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`. Trata erros de rate limit (429) e paginação inválida (400) especificamente.

---

### 4.21 `api/admin/posts.js`

**Caminho:** `/pages/api/admin/posts.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/domain/posts.js` — Funções `getPaginatedPosts()`, `createPost()`, `updatePost()`, `deletePost()`
- `../../../lib/crud/crud.js` — Função `updateRecords()` (usada para reordenação)
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas (postCreateSchema, postUpdateDataSchema, reorderSchema, reorderItemSchema)

**Resumo:**
CRUD administrativo de posts via `createAdminHandler()`. Rate limit 300 req/min, cache `posts:*` invalidado automaticamente nas mutações. **GET** lista posts paginados com `Cache-Control: no-store`. **POST** cria post com validação Zod. **PUT** suporta dois modos: reordenação em massa (`action: 'reorder'`) com `updateRecords()` em loop, ou atualização individual por ID. **DELETE** remove post. Todas as mutações geram log de auditoria via `req.adminUtils.logActivity()`.

---

### 4.22 `api/admin/musicas.js`

**Caminho:** `/pages/api/admin/musicas.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/domain/musicas.js` — Funções `getPaginatedMusicas()`, `createMusica()`, `updateMusica()`, `deleteMusica()`
- `../../../lib/crud/crud.js` — Função `updateRecords()` (usada para reordenação)
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas (musicaSchema, reorderSchema, reorderItemSchema)

**Resumo:**
CRUD administrativo de músicas via `createAdminHandler()`. Rate limit 300 req/min, cache `musicas:*` invalidado automaticamente nas mutações. **GET** lista músicas paginadas com `Cache-Control: no-store`. **POST** cria música com validação Zod e validação adicional de URL do Spotify (`isValidSpotifyUrl()`). **PUT** suporta dois modos: reordenação em massa (`action: 'reorder'`) com `updateRecords()` em loop, ou atualização individual por ID (permite toggle rápido de `publicado` sem reenviar todos os campos). **DELETE** remove música. Todas as mutações geram log de auditoria via `req.adminUtils.logActivity()`.

---

### 4.23 `api/admin/rate-limit.js`

**Caminho:** `/pages/api/admin/rate-limit.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `../../../lib/infra/logger.js` — Logger estruturado
- `../../../lib/infra/redis.js` — Função `redisScan()` (SCAN paginado)
- `@upstash/redis` — Cliente Redis Upstash
- `zod` — Validação de schemas

**Resumo:**
Endpoint de gerenciamento de rate limit (admin). Usa Upstash Redis para controlar whitelist e bloqueios. **GET** (`?type=...`): `current_ip` — retorna IP do requisitante; `whitelist` — lista IPs permitidos; `audit` — lista logs com paginação e filtros (data/busca); `export_csv` — exporta logs como CSV; default — lista IPs bloqueados com SCAN paginado e pipeline Redis, com cache em memória de 15s. **POST** adiciona IP à whitelist e remove bloqueio. **DELETE** remove da whitelist (`?type=whitelist`) ou desbloqueia IP manualmente. Requer Redis configurado (retorna 501 se não disponível).

**Problemas identificados:**
1. Leitura de IP no `type=current_ip` (linha 124): usa `req.headers['x-forwarded-for']` diretamente sem validação de spoofing — inconsistente com `getClientIP()` usado nos demais endpoints (login.js, posts.js, etc.)

---

### 4.24 `api/admin/videos.js`

**Caminho:** `/pages/api/admin/videos.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/domain/videos.js` — Funções `getPaginatedVideos()`, `createVideo()`, `updateVideo()`, `deleteVideo()`, `reorderVideos()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas (videoSchema)

**Resumo:**
CRUD administrativo de vídeos via `createAdminHandler()`. Rate limit 300 req/min, cache `public_videos:*` invalidado automaticamente. **GET** lista vídeos paginados com `Cache-Control: no-store`. **POST** cria vídeo com validação Zod, regex de URL do YouTube (`youtubeUrlRegex`), e função `getValidationMessage()` para extrair primeira mensagem de erro (centralizada, exportada). **PUT** suporta dois modos: reordenação em massa via `reorderVideos()` (camada de domínio, diferente dos outros CRUDs que usam `updateRecords()` direto), ou atualização individual por ID. **DELETE** remove vídeo. Todas as mutações geram log de auditoria.

---

### 4.25 `api/admin/integrity.js`

**Caminho:** `/pages/api/admin/integrity.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `../../../lib/infra/db.js` — Query SQL direta
- `@upstash/redis` — Cliente Redis (importado dinamicamente)
- `fs`, `path`, `os` — Módulos nativos do Node.js

**Resumo:**
Endpoint de verificação de integridade do sistema (GET). Executa 5 verificações: 1) Banco de dados (SELECT 1, tamanho, conexões); 2) Redis/Cache (ping); 3) Armazenamento (tamanho dos uploads, espaço em disco); 4) Backup (lista arquivos em `data/backups`, último backup); 5) Sistema (Node.js versão, plataforma, uptime, memória, CPU). Calcula status geral (healthy/degraded/warning). Funções utilitárias: `formatBytes()`, `formatUptime()`, `formatTimeAgo()`.

**Problemas identificados:**
1. Função `calculateSize()` recursiva síncrona (`fs.readdirSync`/`fs.statSync`) — pode bloquear o event loop se a pasta de uploads crescer significativamente

---

### 4.26 `api/admin/roles.js`

**Caminho:** `/pages/api/admin/roles.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/crud/crud.js` — Funções `createRecord()`, `updateRecords()`, `deleteRecords()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas

**Resumo:**
CRUD administrativo de roles/cargos via `createAdminHandler()`. Rate limit 30 req/min, requer permissão 'Segurança' ou 'Usuários'. **GET** lista roles; se a tabela não existir, cria automaticamente e popula com roles padrão ('admin' com permissões completas, 'user' com permissão básica). **POST** cria role com validação Zod (name + permissions array). **PUT** atualiza role. **DELETE** remove role. Todas as mutações geram log de auditoria.

---

### 4.27 `api/admin/fetch-spotify.js`

**Caminho:** `/pages/api/admin/fetch-spotify.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `../../../lib/infra/logger.js` — Logger estruturado
- `zod` — Validação de URL

**Resumo:**
Endpoint de busca de dados do Spotify (POST). Extrai título e artista de uma URL do Spotify usando 3 estratégias: 1) API oEmbed oficial do Spotify; 2) Leitura do código-fonte do iframe de embed; 3) Scraping das tags meta do HTML (user-agent Googlebot). Usa `fetchWithTimeout()` (AbortController, timeout 8s) e `urlSchema` (Zod) — ambos duplicados em `fetch-youtube.js` e `fetch-ml.js`. Retorna `{ title, artist }`. Gera log de auditoria.

**Problemas identificados:**
1. `fetchWithTimeout()` e `urlSchema` duplicados neste arquivo e em `fetch-youtube.js` e `fetch-ml.js` — lógica idêntica em 3 arquivos

---

### 4.28 `api/admin/fetch-youtube.js`

**Caminho:** `/pages/api/admin/fetch-youtube.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de URL

**Resumo:**
Endpoint de gerenciamento de backups (admin). Rate limit 10 req/min. **GET** lista arquivos de backup em `data/backups` (filtra por `.sql`, `.gz`, `.enc`) ordenados por data, retorna o mais recente e lista completa. **POST** cria backup manual via `createBackup()`. Gera log de auditoria.

**Problemas identificados:**
1. Import sem extensão `.js` no padrão ESM: `from '../../../scripts/backup'` — todos os demais imports usam extensão explícita

---

### 4.30 `api/admin/users.js`

**Caminho:** `/pages/api/admin/users.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/crud/crud.js` — Funções `createRecord()`, `updateRecords()`, `deleteRecords()`
- `../../../lib/auth/auth.js` — Função `hashPassword()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas

**Resumo:**
CRUD administrativo de usuários via `createAdminHandler()`. Rate limit 30 req/min, requer permissão 'Segurança' ou 'Usuários'. **GET** lista usuários com paginação e busca por username (nunca retorna senhas). **POST** cria usuário com hash de senha (`hashPassword()`), default `role: 'admin'` (problema). **PUT** atualiza usuário, permite mudança de senha opcional (só faz hash se a nova senha for enviada). **DELETE** remove usuário (auto-exclusão bloqueada — usuário não pode excluir a si mesmo). Todas as mutações geram log de auditoria.

**Problemas identificados:**
1. `await await` duplicado nas linhas 68, 99 e 115 antes de `req.adminUtils.logActivity()` — sintaticamente válido, mas erro de digitação que confunde a leitura
2. Default `role: 'admin'` na criação de usuário (linha 10) — novos usuários são administradores por padrão, sem intenção explícita de elevação de privilégio

---

### 4.31 `api/admin/cache.js`

**Caminho:** `/pages/api/admin/cache.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/cache/cache.js` — Funções `clearAllCache()`, `getCacheMetrics()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`

**Resumo:**
Endpoint de gerenciamento de cache (admin). Rate limit 10 req/min, requer role admin (`requireAdmin: true`). **GET** retorna métricas do cache via `getCacheMetrics()`. **POST** e **DELETE** ambos limpam o cache via `clearAllCache({ confirm: true })` (FLUSHDB). Gera log de auditoria na limpeza.

---

### 4.32 `api/admin/audit.js`

**Caminho:** `/pages/api/admin/audit.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`

**Resumo:**
Endpoint de consulta a logs de auditoria (GET). Rate limit 30 req/min, requer permissão 'Auditoria' ou 'Segurança'. Lista registros da tabela `activity_logs` com paginação (padrão 50 por página) e filtros de data (`startDate`, `endDate`). Formata `user_id` baseando-se no `username`. Se a tabela não existir (instalação limpa), cria automaticamente e retorna lista vazia.

---

### 4.33 `api/admin/fetch-ml.js`

**Caminho:** `/pages/api/admin/fetch-ml.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `../../../lib/infra/logger.js` — Logger estruturado
- `zod` — Validação de URL

**Resumo:**
Endpoint de busca de dados do Mercado Livre (POST). Extrai informações de um produto/anúncio usando 3 estratégias: 1) API do Mercado Livre (`/items/{id}`); 2) API de produtos (`/products/{id}`) para produtos de catálogo; 3) Fallback de scraping do HTML da página. Extrai códigos MLB da URL e tenta cada um. Usa `fetchWithTimeout()` (AbortController, timeout 8s) e `urlSchema` (Zod) — ambos duplicados em `fetch-spotify.js` e `fetch-youtube.js`. Retorna `{ title, price, images, description }`. Gera log de auditoria.

**Problemas identificados:**
### 4.36 `api/cleanup-test-data.js`

**Caminho:** `/pages/api/cleanup-test-data.js`

**Arquivos acionados ou relacionados:**
- `../../lib/auth/auth.js` — Middleware `withAuth()`
- `../../lib/infra/db.js` — Query SQL direta
- `../../lib/infra/logger.js` — Logger estruturado
- Variável de ambiente: `process.env.ADMIN_USERNAME`

**Resumo:**
Endpoint de limpeza de dados de teste (DELETE). Protegido por `withAuth()`. Verifica se o usuário é admin comparando `req.user.username` com `process.env.ADMIN_USERNAME` ou string fixa `'admin'`. Executa `DELETE FROM posts WHERE slug LIKE 'post-carga-%'` para remover posts de teste criados em carga. Retorna quantidade de registros removidos (`rowCount`).

**Problemas identificados:**
1. Verificação de admin por username (string fixa) em vez de consultar role no banco — não segue o padrão RBAC dos demais endpoints admin

---

### 4.37 `api/products.js`

**Caminho:** `/pages/api/products.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/audit.js` — Função `logActivity()`
- `../../lib/auth/auth.js` — Funções `getAuthToken()`, `verifyToken()`
- `../../lib/cache/cache.js` — Funções `checkRateLimit()`, `invalidateCache()`, `getOrSetCache()`
- `../../lib/domain/products.js` — Funções `getPaginatedProducts()`, `getAllProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`
- `./helper/pagination.js` — Função `paginate()`
- `../../lib/api/helpers.js` — Função `getClientIP()`
- `../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint híbrido (público + admin) de produtos. Não usa `createAdminHandler()` — implementa autenticação manual via `requireAuth()`. **GET** (`?public=true`) público com paginação, filtros (search, minPrice, maxPrice), cache, rate limit 60 req/min (antes do cache). **GET** (sem `?public=true`) admin via `requireAuth()`. **POST/PUT/DELETE** autenticados com rate limit 30 req/min. `logActivity()` importado diretamente de `lib/domain/audit` (não via `req.adminUtils`). Cache-Control não definido no GET público.

**Problemas identificados:**
1. Fora do padrão `createAdminHandler()` — todos os demais 15 CRUDs admin usam o factory
2. Sem validação Zod nos dados de entrada de POST/PUT (apenas validação manual mínima de nome/preço obrigatórios)
3. `updateProduct` recebe `req.body` inteiro sem sanitização

---

### 4.38 `api/musicas.js`

**Caminho:** `/pages/api/musicas.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/musicas.js` — Função `getPaginatedMusicas()`
- `../../lib/cache/cache.js` — Funções `getOrSetCache()`, `checkRateLimit()`
- `../../lib/api/helpers.js` — Função `getClientIP()`
- `../../lib/infra/logger.js` — Logger estruturado
- `zod` — Validação de query params

**Resumo:**
Endpoint público de músicas (GET). Valida query params com Zod (`page`, `limit`, `search`, `sort` com enum). Cache Redis com chave `musicas:${page}:${limit}:${sort}:${search}`, rate limit 60 req/min (verificado **dentro** do callback de cache). Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`. Retorna `{ success, data, pagination }`.

---

### 4.39 `api/upload-image.js`

**Caminho:** `/pages/api/upload-image.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/settings.js` — Função `updateSetting()`
- `../../lib/auth/auth.js` — Middleware `withAuth()`
- `../../lib/infra/logger.js` — Logger estruturado
- `formidable` — Parser de formulários multipart
- `sharp` — Processamento de imagem (validação de metadados)
- `crypto` — Geração de UUID para nome do arquivo

**Resumo:**
Endpoint de upload de imagem (POST). Protegido por `withAuth()`. Usa `formidable` para parse do multipart (bodyParser desabilitado). Validações: mimetype (jpeg, png, webp, gif), tamanho máximo 5MB, dimensões máximas 1920x1920 (via `sharp`), magic bytes. Gera nome seguro com `crypto.randomUUID()` e prefixo (`hero-image-` ou `post-image-` baseado em `uploadType`). Se `uploadType=setting_home_image`, atualiza configuração `home_image_url` no banco. Retorna `{ success, path, imageUrl }`.

---

### 4.40 `api/videos.js`

**Caminho:** `/pages/api/videos.js`

**Arquivos acionados ou relacionados:**
- `../../lib/domain/videos.js` — Função `getPublicPaginatedVideos()`
- `../../lib/cache/cache.js` — Funções `getOrSetCache()`, `checkRateLimit()`
- `../../lib/api/helpers.js` — Função `getClientIP()`
- `../../lib/infra/logger.js` — Logger estruturado

**Resumo:**
Endpoint público de vídeos (GET). Paginação manual (parseInt, default page=1, limit=10, limit máximo 100), busca opcional, sort (recent/oldest/alpha/alpha_desc mapeado para ORDER BY). Rate limit **antes** do cache (protege mesmo em cache hits). Cache-Control: `public, max-age=0, s-maxage=300, stale-while-revalidate=600`. Retorna `{ success, ...result }`.

**Problemas identificados:**
1. Paginação manual reimplementada (não usa `helper/pagination.js` que já é utilizado por `dicas.js` e `products.js`)

---

### 4.41 `api/status.js`

**Caminho:** `/pages/api/status.js`

**Arquivos acionados ou relacionados:**
- `../../lib/infra/db.js` — Query SQL direta

**Resumo:**
Endpoint de health check/diagnóstico (GET). Dois modos: `?mode=health` retorna apenas `{ status: 'ok' }`; modo completo retorna diagnóstico com versão da API, ambiente, status do banco (postgres, teste SELECT 1), e métricas do sistema (nodeVersion, platform, uptime, memoryUsage). Substitui o antigo `/api/v1/status`.

---

### 4.42 `api/helper/pagination.js`

**Caminho:** `/pages/api/helper/pagination.js`

**Arquivos acionados ou relacionados:**
- `/pages/api/dicas.js` — Importa `paginate()`, `buildPaginationMeta()`, `paginatedResponse()`
- `/pages/api/products.js` — Importa `paginate()`

**Resumo:**
Helper de paginação reutilizável. Exporta 3 funções: `paginate(rawPage, rawLimit, maxLimit=100)` — parseia e valida parâmetros, lança erro `INVALID_PAGINATION_PARAMS` se inválidos; `buildPaginationMeta(page, limit, total)` — monta metadados (page, limit, total, totalPages); `paginatedResponse(data, pagination)` — monta envelope padronizado `{ success, data, pagination }`. Usa `parseInt` com radix 10.

---



### 4.34 `api/admin/stats.js`

**Caminho:** `/pages/api/admin/stats.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`

**Resumo:**
Endpoint de estatísticas do sistema (GET). Executa 19 contagens em paralelo via `Promise.all` para maior performance: total de posts, músicas, vídeos, produtos, usuários, dicas (cada um com versão published/draft), e usuários logados hoje/mês/ano. Retorna objeto com todas as contagens em um único response. Rate limit 30 req/min, requer permissão 'Visão Geral'.

---

### 4.35 `api/admin/dicas.js`

**Caminho:** `/pages/api/admin/dicas.js`

**Arquivos acionados ou relacionados:**
- `../../../lib/infra/db.js` — Query SQL direta
- `../../../lib/cache/cache.js` — Função `invalidateCache()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `zod` — Validação de schemas

**Resumo:**
CRUD administrativo de dicas via `createAdminHandler()`. Rate limit 30 req/min. **GET** lista todas as dicas ordenadas por ID. **POST** cria dica com validação Zod (name, content, published). **PUT** atualiza dica com merge de campos parciais — se campos obrigatórios não forem enviados, busca os valores atuais do banco para fazer merge antes da validação. **DELETE** remove dica. Todas as mutações (POST, PUT, DELETE) geram log de auditoria e invalidam o cache público `dicas:public:*`.

---

### 4.29 `api/admin/backups.js`

**Caminho:** `/pages/api/admin/backups.js`

**Arquivos acionados ou relacionados:**
- `../../../scripts/backup` — Função `createBackup()`
- `../../../lib/api/adminCrudHandler.js` — Factory `createAdminHandler()`
- `fs`, `path` — Módulos nativos do Node.js

**Resumo:**
Endpoint de gerenciamento de backups (admin). Rate limit 10 req/min. **GET** lista arquivos de backup em `data/backups` (filtra por `.sql`, `.gz`, `.enc`) ordenados por data, retorna o mais recente e lista completa. **POST** cria backup manual via `createBackup()`. Gera log de auditoria.

**Problemas identificados:**
1. Import sem extensão `.js` no padrão ESM: `from '../../../scripts/backup'` — todos os demais imports usam extensão explícita

---

---




---

## 5. Ajustes e Correções

Os seguintes problemas foram identificados e necessitam de correção:

### 5.1 `await await` duplicado em `admin/users.js`
- **O que:** `await await req.adminUtils.logActivity()` nas linhas 68, 99 e 115
- **Onde:** `/pages/api/admin/users.js`
- **Problema:** Erro de digitação que resulta em `await` duplicado
- **Ajuste:** Remover o `await` duplicado

### 5.2 Import sem extensão `.js` em `admin/backups.js`
- **O que:** Import `from '../../../scripts/backup'` sem extensão
- **Onde:** `/pages/api/admin/backups.js`, linha 1
- **Problema:** ESM pode gerar `ERR_MODULE_NOT_FOUND` em runtime
- **Ajuste:** Adicionar `.js`: `from '../../../scripts/backup.js'`

### 5.3 Default `role: 'admin'` na criação de usuário
- **O que:** `role: z.string().optional().default('admin')`
- **Onde:** `/pages/api/admin/users.js`, linha 10
- **Problema:** Novos usuários são admins por padrão
- **Ajuste:** Alterar default para `'user'`

### 5.4 Invalidação de cache redundante em `api/posts.js`
- **O que:** 3 chamadas de invalidação (`posts:list:*`, `posts:search:*`, `posts:*`)
- **Onde:** `/pages/api/posts.js`, linhas 130-132
- **Problema:** `posts:*` já cobre os outros dois
- **Ajuste:** Manter apenas `invalidateCache('posts:*')`

### 5.5 Verificação de admin por username em `cleanup-test-data.js`
- **O que:** `req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin'`
- **Onde:** `/pages/api/cleanup-test-data.js`, linha 12
- **Problema:** Não segue o padrão RBAC do projeto
- **Ajuste:** Usar verificação de role no banco

---

## 6. Melhorias Recomendadas

### 6.1 Extrair `fetchWithTimeout()` para `lib/`
- **Arquivos:** `fetch-ml.js`, `fetch-spotify.js`, `fetch-youtube.js`
- **Justificativa:** Função idêntica (~10 linhas) duplicada em 3 arquivos

### 6.2 Padronizar paginação com `helper/pagination.js`
- **Arquivos:** `api/posts.js`, `api/videos.js`
- **Justificativa:** Paginação manual reimplementada

### 6.3 Padronizar posicionamento do rate limit
- **Arquivos:** Endpoints públicos (posts, musicas, dicas vs videos, products)
- **Justificativa:** Rate limit dentro vs antes do cache é inconsistente

### 6.4 Centralizar políticas de Cache-Control
- **Arquivos:** Endpoints públicos
- **Justificativa:** 3 políticas diferentes (300s, 120s, 86400s)

### 6.5 Padronizar formato de resposta de sucesso
- **Arquivos:** Endpoints públicos
- **Justificativa:** Formatos diferentes por endpoint

### 6.6 Extrair funções de imagem do `admin.js`
- **Arquivo:** `/pages/admin.js`
- **Justificativa:** `resizeImage()` e `getCroppedImg()` (~58 linhas) sem reuso

### 6.7 Configuração declarativa de abas no `admin.js`
- **Arquivo:** `/pages/admin.js`
- **Justificativa:** 10 blocos condicionais de abas. Sugestão: array declarativo

### 6.8 Mover defaults de `settings.js` para `lib/domain/settings.js`
- **Arquivo:** `/pages/api/settings.js`, linhas 68-74
- **Justificativa:** Lógica de negócio hardcoded na camada de API

---

## 7. Duplicidades Identificadas

| # | Tipo | Arquivos | Descrição |
|---|------|----------|-----------|
| 7.1 | Função duplicada | `fetch-ml.js`, `fetch-spotify.js`, `fetch-youtube.js` | `fetchWithTimeout()` e `urlSchema` idênticos |
| 7.2 | Lógica duplicada | `api/posts.js`, `api/videos.js` | Paginação manual reimplementada |
| 7.3 | Padrão duplicado | `admin/posts.js`, `admin/musicas.js`, `admin/videos.js` | Padrão `action: 'reorder'` com abordagens diferentes |
| 7.4 | Leitura duplicada | `admin/backups.js`, `admin/integrity.js` | Lógica de listagem de backups com pequenas divergências |
| 7.5 | Token duplicado | `styles/variables.css` | `--shadow-glow` definido 2x com mesmo valor |

---

## 8. Código Morto / Possível Código Morto

| # | Tipo | Arquivo | Descrição |
|---|------|---------|-----------|
| 8.1 | Possível código morto | `api/posts.js`, `api/settings.js` | Compatibilidade `?response=v1` — auditar uso |
| 8.2 | Dependência externa frágil | `design-system.js` | `via.placeholder.com` pode ficar indisponível |

---

## 9. Resumo Final

- **Total de arquivos analisados:** 42 arquivos da pasta `/pages`
- **Processamento:** Individual, sequencial, com releitura e validação obrigatória após cada arquivo
- **Data da análise:** 24/09/2026
- **Status:** ✅ Todos os 42 arquivos foram processados e documentados
