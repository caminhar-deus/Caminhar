# Análise de Componentes — `/components`

> **Data:** 31/07/2026  
> **Objetivo:** Documentar todos os arquivos da pasta `components/`, descrevendo localização, propósito, funcionalidades e responsabilidades de cada módulo, com base na análise atual do código.

---

## Visão Geral

A pasta `components/` é o coração da interface do projeto, organizada por **módulo/domínio**:

| Pasta | Responsabilidade |
|-------|------------------|
| `Admin/` | Painel administrativo (CRUD, dashboard, auditoria, ferramentas, gerenciadores) |
| `Features/` | Funcionalidades públicas do site (Blog, Músicas, Vídeos, Produtos, Dicas, Abas) |
| `Layout/` | Design System de layout (Container, Grid, Stack, Sidebar) |
| `Performance/` | Otimizações de performance (imagens, iframes, preload, CSS crítico) |
| `SEO/` | Meta tags e dados estruturados (JSON-LD) |
| `UI/` | Design System base (Button, Input, Modal, Toast, etc.) |

Todos os componentes usam **CSS Modules** para escopo de estilos e **variáveis CSS** (`var(--color-*)`, `var(--spacing-*)`) para tema consistente. Há uso extensivo de `PropTypes` e documentação JSDoc.

---

## 1. Admin (Painel Administrativo)

**Localização raiz:** `components/Admin/`

Sistema administrativo completo construído sobre um **CRUD genérico reutilizável** (`AdminCrudBase` + `CrudForm` + `CrudTable` + hook `useAdminCrud`), com autenticação via HOC `withAdminAuth`, dashboard, gerenciamento de conteúdo, usuários/cargos, auditoria, ferramentas de sistema e gerenciadores de backup/cache.

### 1.1 Núcleo do CRUD

**AdminCrudBase.js** (`AdminCrudBase.js`) — Componente base genérico e reutilizável para todas as operações CRUD. Elimina duplicação entre gerenciadores de conteúdo. Funcionalidades: tabela configurável, formulário dinâmico, Drag & Drop com reversão automática em caso de falha, busca server-side, exportação CSV, toggle de status com rollback otimista, paginação, modo somente leitura, skeletons, validação Zod, modal de confirmação assíncrono para exclusão (via `Modal` da UI). Delega o formulário para `CrudForm` e a tabela para `CrudTable`. ~434 linhas.

**CrudForm.js** (`CrudForm.js`) — Subcomponente de formulário dinâmico extraído do `AdminCrudBase`. Renderiza campos configuráveis com suporte a `renderCustomFormField`, validação Zod e callback de submit. 102 linhas.

**CrudTable.js** (`CrudTable.js`) — Subcomponente de tabela com paginação, skeleton loading, drag & drop, toggle de status, células customizáveis e estado vazio. 309 linhas.

### 1.2 Gerenciadores de Conteúdo

Todos delegam ao `AdminCrudBase`, configurando campos, colunas e validação.

**AdminPosts.js** (`AdminPosts.js`) — Gestão de posts. Geração automática de slug a partir do título (com feedback via toast), validação Zod, imagem de capa obrigatória para publicação, reordenação e exportação CSV. 251 linhas.

**AdminMusicas.js** (`AdminMusicas.js`) — Gestão de músicas com integração Spotify. Botão "Puxar Dados" via `ExternalDataButton`, preview embed na tabela, validação Zod. 193 linhas.

**AdminVideos.js** (`AdminVideos.js`) — Gestão de vídeos com integração YouTube. Botão "Puxar Dados", preview com `LazyIframe`, paginação (10 itens/página), capa personalizada opcional. 226 linhas.

**AdminProducts.js** (`AdminProducts.js`) — Gestão de produtos com integração Mercado Livre. Botão "Puxar Dados", campo `image_url` com múltiplas URLs (uma por linha, suporta carrossel), validação Zod. 169 linhas.

**AdminDicas.js** (`AdminDicas.js`) — Gerenciamento de "Dicas do Dia". Delega ao `AdminCrudBase`. Documentação JSDoc detalhada. 123 linhas.

### 1.3 Usuários e Cargos

**AdminUsers.js** (`AdminUsers.js`) — Container de abas para "Gestão de Usuários" e "Gestão de Cargos". Lazy loading das abas inativas, navegação por teclado (setas), ARIA completo. 114 linhas.

**AdminUsersTab.js** (`AdminUsersTab.js`) — CRUD de usuários. Senha com validação (mín. 6 caracteres, obrigatória para novos), select de cargos dinâmico com cache em `sessionStorage` (5 min), formatação de último login relativa (date-fns). 185 linhas.

**AdminRolesTab.js** (`AdminRolesTab.js`) — CRUD de cargos. Checkboxes de permissões, normalização de nomes antigos (ex: 'Dicas' → 'Gestão de Dicas'), validação Zod. 85 linhas.

### 1.4 Dashboard e Auditoria

**AdminDashboard.js** (`AdminDashboard.js`) — Painel de visão geral. Cards de estatísticas com cache em `sessionStorage` (30s), gráfico de barras CSS, filtro por permissões do usuário, tratamento de resposta não-JSON. 213 linhas.

**AdminAudit.js** (`AdminAudit.js`) — Histórico global de auditoria. Busca local, filtro por data (datetime-local), paginação server-side (50 itens/página), exportação CSV, tratamento de sessão expirada (401). 179 linhas.

### 1.5 Autenticação

**withAdminAuth.js** (`withAdminAuth.js`) — HOC de autenticação. Exibe formulário de login ou o componente protegido. Usa o hook `useAdminAuth`. 82 linhas.

### 1.6 Campos de Formulário (fields/)

Adaptadores que delegam para os componentes base da UI, mantendo a API específica do Admin.

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| TextField | `fields/TextField.js` | Adaptador para `Input` da UI |
| TextAreaField | `fields/TextAreaField.js` | Adaptador para `TextArea` da UI |
| UrlField | `fields/UrlField.js` | URL com validação e preview (YouTube/Spotify) |
| ToggleField | `fields/ToggleField.js` | Toggle "Publicado"/"Rascunho" |
| ImageUploadField | `fields/ImageUploadField.js` | Upload de imagem com preview |
| ExternalDataButton | `fields/ExternalDataButton.js` | Botão "Puxar Dados" genérico (Spotify/YouTube/ML) |

### 1.7 Ferramentas (Tools/)

**IntegrityCheck.js** (`Tools/IntegrityCheck.js`) — Verificação de integridade do sistema (banco, cache, storage, backup, sistema). Auto-refresh 30s, cards por status (ok, error, warning, degraded). 281 linhas.

**RateLimitViewer.js** (`Tools/RateLimitViewer.js`) — Visualização de rate limiting. Três abas (IPs Bloqueados, Whitelist, Logs de Auditoria), auto-refresh 15s, desbloqueio de IPs e adição à whitelist. 543 linhas.

### 1.8 Gerenciadores (Managers/)

**BackupManager.js** (`Managers/BackupManager.js`) — Gerenciamento de backups. Exibe último backup, criação manual com modal de confirmação. 153 linhas.

**CacheManager.js** (`Managers/CacheManager.js`) — Gerenciamento de cache Redis. Limpeza com confirmação, métricas de status (conexão, erros, fallbacks). 144 linhas.

### 1.9 Barrel e Estilos

**index.js** (`index.js`) — Barrel export. Exporta `AdminCrudBase`, `AdminMusicasNew`, `AdminVideosNew`, `AdminPostsNew` e os campos de formulário. **Não exporta** AdminDashboard, AdminDicas, AdminAudit, Tools, Managers, AdminUsers, AdminRolesTab, AdminUsersTab, withAdminAuth.

**styles/** — 7 arquivos CSS Module: `login.module.css`, `dashboard.module.css`, `crud.module.css`, `tabs.module.css`, `permissions.module.css`, `form.module.css`, `misc.module.css`.

---

## 2. Features (Funcionalidades Públicas)

**Localização raiz:** `components/Features/`

Componentes de funcionalidades públicas do site, agrupados por domínio.

### 2.1 Blog

**BlogSection.js** (`Blog/BlogSection.js`) — Seção pública de listagem de posts. Consome `/api/posts?response=v1`, parâmetro `limit`, adaptação de formato de resposta (com fallbacks), cache 1 min. 78 linhas.

**PostCard.js** (`Blog/PostCard.js`) — Card de post usando `BaseCard`. Imagem, categorias, data, link com `aria-label`. 52 linhas.

**Blog.module.css** (`Blog/styles/`) — Grid responsivo, categorias, título, excerpt, footer.

### 2.2 ContentTabs

**index.js** (`ContentTabs/index.js`) — Sistema de abas organizando Blog, Músicas, Vídeos, Produtos. Imports estáticos (substituiu `React.lazy` para evitar erro de chunk CSS no Turbopack), ARIA completo, aba placeholder "Em Desenvolvimento". 92 linhas.

**ContentTabs.module.css** (`ContentTabs/styles/`) — Estilos de abas, container com `min-height: 600px` para evitar layout shift, responsivo.

### 2.3 Music

**MusicGallery.js** (`Music/MusicGallery.js`) — Galeria de músicas. Busca com debounce (300ms), ordenação, paginação (6 itens/página), adaptação de formato de resposta. 193 linhas.

**MusicCard.js** (`Music/MusicCard.js`) — Card com player Spotify via `LazyIframe`. Botão "Ouvir no Spotify". 63 linhas.

**MusicCard.module.css / MusicGallery.module.css** (`Music/styles/`) — Grid 3 colunas, search, sort, pagination, responsivo.

### 2.4 Video

**VideoGallery.js** (`Video/VideoGallery.js`) — Galeria de vídeos. Busca com debounce, ordenação (4 opções), paginação, botão "Tentar novamente" (refetch). 175 linhas.

**VideoCard.js** (`Video/VideoCard.js`) — Card com player YouTube via `LazyIframe`. Thumbnail personalizada ou padrão, descrição truncada (3 linhas). 53 linhas.

**VideoGallery.module.css** (`Video/styles/`) — Grid, search, sort, pagination, responsivo.

### 2.5 Products

**ProductList.js** (`Products/ProductList.js`) — Vitrine de produtos. Busca e filtro de preço com debounce único (500ms), paginação numerada (até 5 páginas visíveis), scroll suave, loading overlay para troca de página. 319 linhas.

**ProductCard.js** (`Products/ProductCard.js`) — Card com carrossel de imagens, lightbox, link de compra. Otimizado com `React.memo`, Schema.org Product. 171 linhas.

**ProductCard.module.css** (`Products/styles/`) — Card media, navegação, lightbox, links de loja.

**styles.js** (`Products/styles.js`) — Estilos compartilhados JS (`inputStyle`, `buttonBaseStyle`).

### 2.6 Testimonials (Dicas do Dia)

**index.js** (`Testimonials/index.js`) — Seção "Dicas do Dia". Carrossel ou grid, navegação com setas, paginação, scroll detection com debounce; exibe apenas os dados retornados pela API `/api/dicas` e oculta a seção quando não há dicas cadastradas. 157 linhas.

**Testimonials.module.css** (`Testimonials/`) — Estilos da seção, cards, navegação, hover effects, responsivo.

---

## 3. Layout (Design System — Layout)

**Localização raiz:** `components/Layout/`

### 3.1 Container.js

**Localização:** `Layout/Container.js`

**Propósito:** Container centralizado com max-width configurável. Tamanhos: sm, md, lg, xl, 2xl, full. Modo `fluid`, prop `as`, padding personalizado. Subcomponentes: `Container.Section`, `Container.Article`. 79 linhas.

### 3.2 Grid.js

**Localização:** `Layout/Grid.js`

**Propósito:** Sistema de grid flexível. Colunas 1-12, gaps configuráveis, responsivo via objeto `{default, sm, md, lg, xl}`. Subcomponentes: `Grid.Item`, `Grid.Auto`, `Grid.Responsive`. 192 linhas.

### 3.3 Stack.js

**Localização:** `Layout/Stack.js`

**Propósito:** Empilhamento vertical/horizontal. Direção, spacing (com alias `gap`), align, justify, wrap, inline, responsivo. Subcomponentes: `Stack.Item`, `Stack.Divider`, `Stack.Spacer`, `Stack.VStack`, `Stack.HStack`. 199 linhas.

### 3.4 Sidebar.js

**Localização:** `Layout/Sidebar.js`

**Propósito:** Sidebar colapsável (esquerda/direita). Larguras sm/md/lg, persistência em localStorage (com debounce 300ms), modo mobile com overlay que aplica o atributo `inert` no container (valor booleano `true`) para bloqueio de foco do teclado atrás do overlay, breakpoint configurável. Subcomponentes: `Sidebar.Nav`, `Sidebar.NavItem`, `Sidebar.Section`, `Sidebar.Header`, `Sidebar.Footer`. 250 linhas.

### 3.5 index.js

**Localização:** `Layout/index.js`

**Propósito:** Barrel export. Exporta named + default (com sufixo `Default`) para todos os componentes de layout.

---

## 4. Performance

**Localização raiz:** `components/Performance/`

### 4.1 ImageOptimized.js

**Localização:** `Performance/ImageOptimized.js`

**Propósito:** Wrapper para `next/image` com fallback, skeleton loader, controle de loading. Prop `critical` para LCP, placeholder blur, aspect ratio para evitar CLS. 121 linhas.

### 4.2 LazyIframe.js

**Localização:** `Performance/LazyIframe.js`

**Propósito:** Lazy loading de iframes (YouTube, Spotify). IntersectionObserver, thumbnail preview, clique para carregar, conversão automática de URL YouTube, **sequenciamento de carregamento via fila global** (máx. 2 iframes simultâneos). 252 linhas.

**Funcionalidades-chave:**
- **IntersectionObserver:** Detecta quando o iframe entra no viewport e ativa o carregamento automático.
- **Thumbnail preview:** Usa `hqdefault.jpg` (480×360, ~20-50KB) para YouTube em vez de `maxresdefault.jpg` (1080p, ~200-400KB), reduzindo o tamanho pré-play em 5-10x. Se `thumbnail` for fornecida como prop, esta tem prioridade.
- **Clique para carregar:** O usuário pode clicar no placeholder para carregar imediatamente (ignora a fila).
- **Conversão automática de URL YouTube:** Normaliza `youtube.com/watch?v=ID` e `youtu.be/ID` para `youtube.com/embed/ID`.
- **Fila global (`iframeLoadingQueue`):** Gerenciador singleton que limita a 2 iframes carregando simultaneamente, evitando contenção de banda.

### 4.3 PreloadResources.js

**Localização:** `Performance/PreloadResources.js`

**Propósito:** Preconnect e preload de recursos críticos. Domínios padrão (Google Fonts, YouTube, Spotify), helper `getCriticalResources` com fallbacks por tipo de página. 145 linhas.

### 4.4 CriticalCSS.js

**Localização:** `Performance/CriticalCSS.js`

**Propósito:** Inline de CSS crítico. Helpers `extractCriticalCSS` e `removeCriticalCSS` com fallback (não remove se o CSS principal falhar). CSS armazenado em `styles/criticalCSSRaw.js` (string JS para evitar conflito com Turbopack). 70 linhas.

### 4.5 index.js

**Localização:** `Performance/index.js`

**Propósito:** Barrel export. Exporta `ImageOptimized`, `LazyIframe`, `PreloadResources` (+ `getCriticalResources`), `CriticalCSS` (+ `extractCriticalCSS`, `removeCriticalCSS`).

---

## 5. SEO

**Localização raiz:** `components/SEO/`

### 5.1 Head.js

**Localização:** `SEO/Head.js`

**Propósito:** Meta tags SEO completas. Title, description, keywords, canonical (normalizada), Open Graph, Twitter Cards, favicons, manifest, geo tags, controle de indexação. 164 linhas.

### 5.2 StructuredData

**Localização:** `SEO/StructuredData/`

- **StructuredDataBase.js:** Componente base para JSON-LD. Sanitização via `sanitizeJsonLd`. Reexporta `siteConfig`, `siteUrl`, `formatSchemaDate`, `getImageUrl`.
- **OrganizationSchema.js:** Schema.org Organization (ONG religiosa). Logo, contato, `knowsAbout`.
- **WebsiteSchema.js:** Schema.org WebSite. `SearchAction`, `isAccessibleForFree`.
- **ArticleSchema.js:** Schema.org Article + BlogPosting. Author, publisher, dates, keywords.
- **BreadcrumbSchema.js:** Schema.org BreadcrumbList. Gera "Início" automaticamente.
- **MusicSchema.js:** Schema.org MusicRecording. Artista, álbum, duração, letra, Spotify/YouTube.
- **VideoSchema.js:** Schema.org VideoObject. Thumbnail, duração, views, transcrição.
- **index.js:** Barrel file. Exporta apenas named exports (`OrganizationSchema`, `WebsiteSchema`, `ArticleSchema`, `BreadcrumbSchema`, `MusicSchema`, `VideoSchema`). O `export default` foi removido por não ser utilizado.

### 5.3 index.js

**Localização:** `SEO/index.js`

**Propósito:** Barrel export. Exporta `SEOHead`, os schemas de StructuredData e reexporta `siteConfig`, `getCanonicalUrl`, `getImageUrl` da lib/seo/config.

---

## 6. UI (Design System — Base)

**Localização raiz:** `components/UI/`

### 6.1 Button.js

**Localização:** `UI/Button.js`

**Propósito:** Botão com variantes (primary, secondary, ghost, danger, success, warning), tamanhos (sm, md, lg, xl), efeito ripple, loading com spinner, ícones. 111 linhas.

### 6.2 Input.js

**Localização:** `UI/Input.js`

**Propósito:** Campo de texto. Tamanhos sm/md/lg, variantes (default, filled, flushed), addons, clearable, erro com mensagem, helper text, `forwardRef`. 145 linhas.

### 6.3 TextArea.js

**Localização:** `UI/TextArea.js`

**Propósito:** Área de texto. Auto-resize, contador, bloqueio no limite, erro, helper text. Tamanhos sm/md/lg. 179 linhas.

### 6.4 Select.js

**Localização:** `UI/Select.js`

**Propósito:** Select com modo nativo e modo custom (searchable + clearable). Dropdown estilizado, busca textual com debounce, teclado. 304 linhas.

### 6.5 Modal.js

**Localização:** `UI/Modal.js`

**Propósito:** Modal em portal. Focus trap, scroll lock (com contador para múltiplos modais), fechar por ESC/overlay. Tamanhos sm/md/lg/xl/full. ARIA completo. Subcomponente: `Modal.Footer`. 214 linhas.

### 6.6 Toast.js

**Localização:** `UI/Toast.js`

**Propósito:** Notificação temporária. Status (info, success, warning, error), posições, animações, barra de progresso, hook `useToast`. Subcomponente: `Toast.Container`. 172 linhas.

### 6.7 Alert.js

**Localização:** `UI/Alert.js`

**Propósito:** Alerta. Status, variantes (subtle, solid, left-accent, top-accent), role dinâmico (`alertdialog` para erros críticos), `onBeforeClose`. 114 linhas.

### 6.8 Badge.js

**Localização:** `UI/Badge.js`

**Propósito:** Badge/insígnia. Variantes (default, primary, outline, soft, etc.), tamanhos, dot com pulse, posicionamento absoluto. Subcomponentes: `Badge.Counter`, `Badge.Dot`. 103 linhas.

### 6.9 BaseCard.js

**Localização:** `UI/BaseCard.js`

**Propósito:** Card reutilizável. Slots (media, header, content, footer), variantes, tamanhos, hoverable, clickable, Schema.org, ariaLabel. Subcomponentes: `BaseCard.Header`, `BaseCard.Footer`. 157 linhas.

### 6.10 Spinner.js

**Localização:** `UI/Spinner.js`

**Propósito:** Loading spinner. Variantes (border, grow, dots), tamanhos, cores, centered. Subcomponentes: `Spinner.Container`, `Spinner.Overlay`. 88 linhas.

### 6.11 StateMessages.js

**Localização:** `UI/StateMessages.js`

**Propósito:** Estados padronizados: `LoadingMessage` (spinner dots), `ErrorMessage` (❌), `EmptyMessage`. 69 linhas.

### 6.12 icons.js

**Localização:** `UI/icons.js`

**Propósito:** Ícones SVG compartilhados (info, success, warning, error). Extraído de Alert.js para evitar duplicidade. 30 linhas.

### 6.13 index.js

**Localização:** `UI/index.js`

**Propósito:** Barrel export. Exporta named + default (com sufixo `Default`) para todos os componentes UI. Mantém alias `Card` para `BaseCard` (compatibilidade com `pages/design-system.js`).

### 6.14 __tests__/

**Localização:** `UI/__tests__/`

**Status:** Pasta **vazia** (sem arquivos de teste).

---

## Observações Finais

- A pasta `components/` está organizada por módulo/domínio: Admin, Features, Layout, Performance, SEO, UI.
- `BaseCard` unificado com antigo `Card.js` (removido), mantendo ambos os nomes via barrel export.
- Admin Fields são adaptadores que delegam para componentes base da UI.
- Uso extensivo de `PropTypes` com documentação JSDoc detalhada.
- A pasta `UI/__tests__/` está vazia (sem arquivos de teste).
- `Admin/index.js` é um barrel **incompleto** (não exporta todos os componentes Admin).