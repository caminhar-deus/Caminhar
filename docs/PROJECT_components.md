# Análise de Componentes — `/components`

> **Data:** 27/06/2026  
> **Objetivo:** Documentar todos os arquivos da pasta `components/`, descrevendo localização, propósito, funcionalidades e responsabilidades de cada módulo.

---

## 1. Admin (Painel Administrativo)

**Localização raiz:** `components/Admin/`

Sistema administrativo completo com CRUD reutilizável via `AdminCrudBase`, autenticação via HOC `withAdminAuth`, dashboard com estatísticas, gerenciamento de conteúdo (posts, músicas, vídeos, produtos, dicas), usuários/cargos, auditoria, ferramentas de sistema e backup.

### 1.1 AdminCrudBase.js

**Localização:** `components/Admin/AdminCrudBase.js`

**Propósito:** Componente base genérico e reutilizável para todas as operações CRUD do admin. Elimina duplicação de código entre gerenciadores de conteúdo.

**Funcionalidades:** Tabela configurável, formulário dinâmico, Drag & Drop, busca server-side, exportação CSV, toggle de status, paginação, modo somente leitura, skeletons, validação Zod, rollback automático.

**Subcomponentes:** Delega formulário dinâmico para `CrudForm` e tabela com paginação para `CrudTable`.

### 1.2 AdminDashboard.js

**Localização:** `components/Admin/AdminDashboard.js`

**Propósito:** Painel de visão geral do sistema. Cards de estatísticas com cache, gráfico de barras CSS, filtro por permissões, tratamento de resposta não-JSON.

### 1.3 AdminPosts.js

**Localização:** `components/Admin/AdminPosts.js`

**Propósito:** Gerenciamento de posts. Geração automática de slug, validação Zod, imagem de capa obrigatória para publicação.

### 1.4 AdminProducts.js

**Localização:** `components/Admin/AdminProducts.js`

**Propósito:** Gestão de produtos com integração Mercado Livre via `ExternalDataButton`. Links para ML, Shopee, Amazon.

### 1.5 AdminVideos.js

**Localização:** `components/Admin/AdminVideos.js`

**Propósito:** Gestão de vídeos com integração YouTube. Preview com `LazyIframe`, paginação (10 itens/página).

### 1.6 AdminMusicas.js

**Localização:** `components/Admin/AdminMusicas.js`

**Propósito:** Gestão de músicas com integração Spotify. Preview embed, botão "Puxar Dados".

### 1.7 AdminDicas.js

**Localização:** `components/Admin/AdminDicas.js`

**Propósito:** Gerenciamento de "Dicas do Dia". Delega ao `AdminCrudBase`. Documentação JSDoc detalhada.

### 1.8 AdminUsers / AdminUsersTab / AdminRolesTab

**AdminUsers:** `components/Admin/AdminUsers.js` — Container de abas com lazy loading, navegação por teclado, ARIA.  
**AdminUsersTab:** `components/Admin/AdminUsersTab.js` — CRUD de usuários, senha com validação, select de cargos com cache.  
**AdminRolesTab:** `components/Admin/AdminRolesTab.js` — CRUD de cargos, checkboxes de permissões, normalização de nomes.

### 1.9 AdminAudit.js

**Localização:** `components/Admin/AdminAudit.js`

**Propósito:** Histórico de auditoria com busca, filtro por data, paginação (50 itens/página), exportação CSV.

### 1.10 Admin/index.js

**Localização:** `components/Admin/index.js`

**Propósito:** Barrel export. Exporta AdminCrudBase, AdminMusicasNew, AdminVideosNew, AdminPostsNew, TextField, TextAreaField, ImageUploadField, ToggleField, UrlField, ExternalDataButton.

### 1.11 withAdminAuth.js

**Localização:** `components/Admin/withAdminAuth.js`

**Propósito:** HOC de autenticação. Exibe login ou componente protegido. Usa hook `useAdminAuth`.

### 1.12 Tools

**IntegrityCheck.js** (`Tools/IntegrityCheck.js`): Verificação de integridade do sistema. Auto-refresh 30s, cards por status (ok, error, warning, degraded).

**RateLimitViewer.js** (`Tools/RateLimitViewer.js`): Visualização de rate limiting. Três abas (IPs Bloqueados, Whitelist, Logs), auto-refresh 15s.

### 1.13 Managers

**CacheManager.js** (`Managers/CacheManager.js`): Gerenciamento de cache Redis. Limpeza com confirmação, métricas de status.

**BackupManager.js** (`Managers/BackupManager.js`): Gerenciamento de backups. Último backup, criação manual.

### 1.14 Fields

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| TextField | `fields/TextField.js` | Adaptador para `Input` da UI |
| TextAreaField | `fields/TextAreaField.js` | Adaptador para `TextArea` da UI |
| UrlField | `fields/UrlField.js` | URL com validação e preview (YouTube/Spotify) |
| ToggleField | `fields/ToggleField.js` | Toggle "Publicado"/"Rascunho" |
| ImageUploadField | `fields/ImageUploadField.js` | Upload de imagem com preview |
| ExternalDataButton | `fields/ExternalDataButton.js` | Botão "Puxar Dados" genérico |

### 1.15 Subcomponentes do CRUD

**CrudForm.js** (`CrudForm.js`): Subcomponente de formulário dinâmico extraído do AdminCrudBase. Renderiza campos configuráveis com suporte a `renderCustomFormField`, validação Zod e callback de submit. 102 linhas.

**CrudTable.js** (`CrudTable.js`): Subcomponente de tabela com paginação, skeleton loading, drag & drop, toggle de status, células customizáveis e estado vazio. 309 linhas.

### 1.16 Styles (Admin)

7 arquivos CSS Module: `login.module.css`, `dashboard.module.css`, `crud.module.css`, `tabs.module.css`, `permissions.module.css`, `form.module.css`, `misc.module.css`.


---

## 2. Features (Funcionalidades Públicas)

**Localização raiz:** `components/Features/`

Componentes de funcionalidades públicas do site, agrupados por domínio: Blog, Músicas, Vídeos, Produtos, Testemunhos e Abas de Conteúdo.

### 2.1 Blog

**BlogSection.js** (`Features/Blog/BlogSection.js`): Seção pública de listagem de posts. Consome `/api/posts`, parâmetro `limit`, adaptação de formato de resposta, cache 1 min.

**PostCard.js** (`Features/Blog/PostCard.js`): Card de post usando `BaseCard`. Imagem, categorias, data, link com aria-label.

**Blog.module.css** (`Features/Blog/styles/Blog.module.css`): Grid responsivo, categorias, título, excerpt, footer.

### 2.2 ContentTabs

**index.js** (`Features/ContentTabs/index.js`): Sistema de abas organizando Blog, Músicas, Vídeos, Produtos. Lazy loading via `React.lazy`, ARIA, aba placeholder "Em Desenvolvimento".

**ContentTabs.module.css** (`Features/ContentTabs/styles/`): Estilos de abas, animações, responsivo.

### 2.3 Music

**MusicGallery.js** (`Features/Music/MusicGallery.js`): Galeria de músicas. Busca com debounce (300ms), ordenação, paginação (6 itens/página), adaptação de formato de resposta.

**MusicCard.js** (`Features/Music/MusicCard.js`): Card com player Spotify via `LazyIframe`. Botão "Ouvir no Spotify".

**MusicCard.module.css / MusicGallery.module.css** (`Features/Music/styles/`): Grid 3 colunas, search, sort, pagination, responsivo.

### 2.4 Video


---

## 3. Layout (Design System — Layout)

**Localização raiz:** `components/Layout/`

### 3.1 Container.js

**Localização:** `components/Layout/Container.js`

**Propósito:** Container centralizado com max-width configurável. Tamanhos: sm, md, lg, xl, 2xl, full. Modo `fluid`, prop `as`, padding personalizado. Subcomponentes: `Container.Section`, `Container.Article`.

### 3.2 Grid.js

**Localização:** `components/Layout/Grid.js`

**Propósito:** Sistema de grid flexível. Colunas 1-12, gaps configuráveis, responsivo via objeto `{default, sm, md, lg, xl}`. Subcomponentes: `Grid.Item`, `Grid.Auto`, `Grid.Responsive`.

### 3.3 Stack.js

**Localização:** `components/Layout/Stack.js`

**Propósito:** Empilhamento vertical/horizontal. Direção, spacing (com alias `gap`), align, justify, wrap, inline, responsivo. Subcomponentes: `Stack.Item`, `Stack.Divider`, `Stack.Spacer`, `Stack.VStack`, `Stack.HStack`.

### 3.4 Sidebar.js

**Localização:** `components/Layout/Sidebar.js`

**Propósito:** Sidebar colapsável (esquerda/direita). Larguras sm/md/lg, persistência em localStorage, modo mobile com overlay, breakpoint configurável. Subcomponentes: `Sidebar.Nav`, `Sidebar.NavItem`, `Sidebar.Section`, `Sidebar.Header`, `Sidebar.Footer`.

---

## 4. Performance

**Localização raiz:** `components/Performance/`

### 4.1 ImageOptimized.js

**Localização:** `components/Performance/ImageOptimized.js`

**Propósito:** Wrapper para `next/image` com fallback, skeleton loader, controle de loading. Prop `critical` para LCP, placeholder blur, aspect ratio.

### 4.2 LazyIframe.js

**Localização:** `components/Performance/LazyIframe.js`

**Propósito:** Lazy loading de iframes (YouTube, Spotify). IntersectionObserver, thumbnail preview, clique para carregar, conversão automática de URL YouTube.

### 4.3 PreloadResources.js

**Localização:** `components/Performance/PreloadResources.js`

**Propósito:** Preconnect e preload de recursos críticos. Domínios padrão (Google Fonts, YouTube, Spotify), helper `getCriticalResources`.

### 4.4 CriticalCSS.js

**Localização:** `components/Performance/CriticalCSS.js`

**Propósito:** Inline de CSS crítico. Helpers `extractCriticalCSS` e `removeCriticalCSS` com fallback. CSS armazenado em `styles/criticalCSSRaw.js`.

---

## 5. SEO

**Localização raiz:** `components/SEO/`

### 5.1 SEOHead.js

**Localização:** `components/SEO/Head.js`

**Propósito:** Meta tags SEO completas. Title, description, keywords, canonical, Open Graph, Twitter Cards, favicons, manifest, geo tags. Controle de indexação.

### 5.2 StructuredData

**Localização:** `components/SEO/StructuredData/`

- **StructuredDataBase.js:** Componente base para JSON-LD. Sanitização.
- **OrganizationSchema.js:** Schema.org Organization (ONG religiosa). Logo, contato, `knowsAbout`.
- **WebsiteSchema.js:** Schema.org WebSite. `SearchAction`, `isAccessibleForFree`.
- **ArticleSchema.js:** Schema.org Article + BlogPosting. Author, publisher, dates, keywords.
- **BreadcrumbSchema.js:** Schema.org BreadcrumbList. Gera "Início" automaticamente.
- **MusicSchema.js:** Schema.org MusicRecording. Artista, álbum, duração, letra, Spotify/YouTube.
- **VideoSchema.js:** Schema.org VideoObject. Thumbnail, duração, views, transcrição.


**VideoGallery.js** (`Features/Video/VideoGallery.js`): Galeria de vídeos. Busca com debounce, ordenação (4 opções), paginação, botão "Tentar novamente".

**VideoCard.js** (`Features/Video/VideoCard.js`): Card com player YouTube via `LazyIframe`. Thumbnail personalizada ou padrão, descrição truncada.

**VideoGallery.module.css** (`Features/Video/styles/`): Grid, search, sort, pagination, responsivo.

### 2.5 Products

**ProductList.js** (`Features/Products/ProductList.js`): Vitrine de produtos. Busca e filtro de preço com debounce único (500ms), paginação numerada, scroll suave.

**ProductCard.js** (`Features/Products/ProductCard.js`): Card com carrossel de imagens, lightbox, links ML/Shopee/Amazon. Otimizado com `React.memo`.

**ProductCard.module.css** (`Features/Products/styles/`): Card media, navegação, lightbox, links de loja.

**styles.js** (`Features/Products/styles.js`): Estilos compartilhados JS (inputStyle, buttonBaseStyle).

### 2.6 Testimonials

**index.js** (`Features/Testimonials/index.js`): Seção "Dicas do Dia". Carrossel ou grid, fallback estático, navegação com setas, paginação, scroll detection com debounce.

**Testimonials.module.css** (`Features/Testimonials/`): Estilos da seção, cards, navegação, hover effects, responsivo.



---

## 6. UI (Design System — Base)

**Localização raiz:** `components/UI/`

### 6.1 Button.js

**Localização:** `components/UI/Button.js`

**Propósito:** Botão com variantes (primary, secondary, ghost, danger, success, warning), tamanhos (sm, md, lg, xl), efeito ripple, loading com spinner, ícones.

### 6.2 Input.js

**Localização:** `components/UI/Input.js`

**Propósito:** Campo de texto. Tamanhos sm/md/lg, variantes (default, filled, flushed), addons, clearable, erro com mensagem, helper text, `forwardRef`.

### 6.3 TextArea.js

**Localização:** `components/UI/TextArea.js`

**Propósito:** Área de texto. Auto-resize, contador, bloqueio no limite, erro, helper text. Tamanhos sm/md/lg.

### 6.4 Select.js

**Localização:** `components/UI/Select.js`

**Propósito:** Select com modo nativo e modo custom (searchable + clearable). Dropdown estilizado, busca textual, teclado.

### 6.5 Modal.js

**Localização:** `components/UI/Modal.js`

**Propósito:** Modal em portal. Focus trap, scroll lock, fechar por ESC/overlay. Tamanhos sm/md/lg/xl/full. ARIA completo. Subcomponente: `Modal.Footer`.

### 6.6 Toast.js

**Localização:** `components/UI/Toast.js`

**Propósito:** Notificação temporária. Status (info, success, warning, error), posições, animações, barra de progresso, hook `useToast`. Subcomponente: `Toast.Container`.

### 6.7 Alert.js

**Localização:** `components/UI/Alert.js`

**Propósito:** Alerta. Status, variantes (subtle, solid, left-accent, top-accent), role dinâmico (`alertdialog` para erros críticos), `onBeforeClose`.

### 6.8 Badge.js

**Localização:** `components/UI/Badge.js`

**Propósito:** Badge/insígnia. Variantes (default, primary, outline, soft, etc.), tamanhos, dot com pulse, posicionamento absoluto. Subcomponentes: `Badge.Counter`, `Badge.Dot`.

### 6.9 BaseCard.js

**Localização:** `components/UI/BaseCard.js`

**Propósito:** Card reutilizável. Slots (media, header, content, footer), variantes, tamanhos, hoverable, clickable, Schema.org, ariaLabel. Subcomponentes: `BaseCard.Header`, `BaseCard.Footer`.

### 6.10 Spinner.js

**Localização:** `components/UI/Spinner.js`

**Propósito:** Loading spinner. Variantes (border, grow, dots), tamanhos, cores, centered. Subcomponentes: `Spinner.Container`, `Spinner.Overlay`.

### 6.11 StateMessages.js

**Localização:** `components/UI/StateMessages.js`

**Propósito:** Estados padronizados: `LoadingMessage` (spinner dots), `ErrorMessage` (❌), `EmptyMessage`.

### 6.12 icons.js

**Localização:** `components/UI/icons.js`

**Propósito:** Ícones SVG compartilhados (info, success, warning, error). Extraído de Alert.js para evitar duplicidade.

### 6.13 UI/index.js

**Localização:** `components/UI/index.js`

**Propósito:** Barrel export. Exporta nomeados e default para todos os componentes UI.

---

## Observações Finais

- Todos os componentes utilizam **CSS Modules** para escopo de estilos.
- O projeto utiliza variáveis CSS (`var(--color-*)`, `var(--spacing-*)`) para tema consistente.
- A pasta `UI/__tests__/` está vazia (sem arquivos de teste).
- A pasta `components/` está organizada por módulo/domínio: Admin, Features, Layout, Performance, SEO, UI.
- `BaseCard` unificado com antigo `Card.js` (removido), mantendo ambos os nomes via barrel export.
- Admin Fields são adaptadores que delegam para componentes base da UI.
- Uso extensivo de `PropTypes` com documentação JSDoc detalhada.

