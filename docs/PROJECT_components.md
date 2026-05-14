# Análise de Componentes - `/components`

> **Data:** 13/05/2026 (atualizado)
> **Objetivo:** Documentar todos os arquivos da pasta `components/`, descrevendo localização, propósito e funcionalidades.

---

## Índice

1. [Admin](#1-admin)
2. [Features](#2-features)
3. [Layout](#3-layout)
4. [Performance](#4-performance)
5. [SEO](#5-seo)
6. [UI (Design System)](#6-ui-design-system)

---

## 1. Admin

Sistema administrativo completo com CRUD reutilizável, autenticação, dashboard, gerenciamento de conteúdo e ferramentas de sistema.

### 1.1 AdminCrudBase.js
**Localização:** `components/Admin/AdminCrudBase.js`

**Propósito:** Componente base genérico para operações CRUD. Elimina duplicação de código entre AdminMusicas, AdminVideos, AdminPosts e demais gerenciadores. Oferece:
- Tabela com colunas configuráveis, ordenação e paginação
- Formulário dinâmico baseado em array de configuração de campos
- Suporte a Drag & Drop para reordenação
- Barra de busca local com filtro dinâmico
- Exportação para CSV
- Toggle de status (Publicado/Rascunho) com atualização otimista
- Skeletons de carregamento
- Validação via Zod ou função customizada
- Modo somente leitura

### 1.2 AdminDashboard.js
**Localização:** `components/Admin/AdminDashboard.js`

**Propósito:** Painel de visão geral do sistema. Exibe cards de estatísticas (posts, músicas, vídeos, produtos, dicas, usuários) com contagem de publicados/rascunhos. Inclui gráfico de barras horizontal CSS para distribuição de conteúdo. Cada card é clicável e direciona para a aba correspondente.

**Melhorias aplicadas:**
- Cache em `sessionStorage` com TTL de 30s para fetch de stats, evitando requisições desnecessárias
- Tratamento de resposta não-JSON com verificação de `Content-Type` e mensagem amigável
- Memoização de `allStatItems`, `statItems` e `maxVal` com `useMemo` para evitar recriação desnecessária

### 1.3 AdminAudit.js
**Localização:** `components/Admin/AdminAudit.js`

**Propósito:** Histórico global de auditoria. Exibe logs de ações realizadas no sistema com busca textual, filtro por data (início/fim), paginação (50 itens/página) e exportação para CSV. Trata sessão expirada (401) com reload da página.

### 1.4 AdminDicas.js
**Localização:** `components/Admin/AdminDicas.js`

**Propósito:** Gerenciamento de "Dicas do Dia". Implementa CRUD via `AdminCrudBase` com campos: nome, conteúdo e status de publicação.

### 1.5 AdminMusicas.js
**Localização:** `components/Admin/AdminMusicas.js`

**Propósito:** Gestão de músicas com integração Spotify. Usa `AdminCrudBase` com campos: título, artista, URL do Spotify, status. Inclui:
- Botão "Puxar Dados" via componente genérico `ExternalDataButton` que busca título/artista via API do Spotify
- Preview do embed Spotify na tabela
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`
- Validação Zod

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js`
- Botão "Puxar Dados" substituído pelo componente genérico `ExternalDataButton`
- Layout do botão alterado de `position: absolute` para flexbox responsivo

### 1.6 AdminPosts.js
**Localização:** `components/Admin/AdminPosts.js`

**Propósito:** Gerenciamento de posts/artigos do blog. Usa `AdminCrudBase` com campos: título, slug (geração automática), resumo, conteúdo, imagem de capa, status. Inclui:
- Geração automática de slug a partir do título
- Validação que impede publicação sem imagem de capa
- Upload de imagens
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js`

### 1.7 AdminProducts.js
**Localização:** `components/Admin/AdminProducts.js`

**Propósito:** Gestão de produtos com integração Mercado Livre. Usa `AdminCrudBase` com campos: nome, valor, URLs de imagens, descrição, links (ML, Shopee, Amazon). Inclui:
- Botão "Puxar Dados" via componente genérico `ExternalDataButton` que busca dados do Mercado Livre
- Validação Zod
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js` e movido para dentro do componente (padronização)
- Botão "Puxar Dados" substituído pelo componente genérico `ExternalDataButton`
- Layout do botão alterado de `position: absolute` para flexbox responsivo

### 1.8 AdminRolesTab.js
**Localização:** `components/Admin/AdminRolesTab.js`

**Propósito:** Gestão de cargos e permissões. Usa `AdminCrudBase` com campo customizado de seleção de permissões via checkboxes. Normaliza permissões antigas automaticamente.

### 1.9 AdminUsers.js
**Localização:** `components/Admin/AdminUsers.js`

**Propósito:** Container de abas para "Gestão de Usuários" e "Gestão de Cargos". Renderiza condicionalmente `AdminUsersTab` ou `AdminRolesTab`.

### 1.10 AdminUsersTab.js
**Localização:** `components/Admin/AdminUsersTab.js`

**Propósito:** Gestão de usuários e admins. Usa `AdminCrudBase` com campos: username, senha, cargo. Inclui:
- Campo customizado `RoleSelectField` que busca cargos da API dinamicamente
- Validação de senha (mínimo 6 caracteres) para novos usuários
- Formatação amigável de último login (ex: "há 2 horas")

### 1.11 AdminVideos.js
**Localização:** `components/Admin/AdminVideos.js`

**Propósito:** Gestão de vídeos com integração YouTube. Usa `AdminCrudBase` com campos: título, descrição, URL do YouTube, thumbnail, status. Inclui:
- Extração de ID do YouTube de múltiplos formatos de URL
- Botão "Puxar Dados" via componente genérico `ExternalDataButton` que busca título via API do YouTube
- Preview do embed na tabela
- Paginação habilitada
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js`
- Botão "Puxar Dados" substituído pelo componente genérico `ExternalDataButton`
- Layout do botão alterado de `position: absolute` para flexbox responsivo

### 1.12 index.js (Admin)
**Localização:** `components/Admin/index.js`

**Propósito:** Ponto de exportação centralizado para componentes Admin. Exporta `AdminCrudBase`, componentes refatorados (`AdminMusicasNew`, `AdminVideosNew`, `AdminPostsNew`), todos os campos de formulário e utilitários.

**Melhorias aplicadas (14/05/2026):**
- Adicionada exportação de `ExternalDataButton` para facilitar importação

### 1.13 withAdminAuth.js
**Localização:** `components/Admin/withAdminAuth.js`

**Propósito:** Higher-Order Component (HOC) para proteger páginas administrativas. Usa hook `useAdminAuth` para verificar autenticação. Exibe formulário de login ou renderiza o componente protegido.

### 1.14 Fields
**Localização:** `components/Admin/fields/`

Conjunto de componentes de campo de formulário reutilizáveis:

| Arquivo | Propósito |
|---------|-----------|
| `TextField.js` | Campo de texto padrão (suporta type: text, email, password, number, tel, search) |
| `TextAreaField.js` | Campo de textarea com contador de caracteres |
| `ImageUploadField.js` | Campo de upload de imagem com preview. Upload via input file ou URL manual |
| `ToggleField.js` | Checkbox estilizado com labels dinâmicos (Publicado/Rascunho) |
| `UrlField.js` | Campo de URL com validação e preview (YouTube, Spotify). Extrai IDs automaticamente |
| `ExternalDataButton.js` | Componente genérico para botão "Puxar Dados" de fontes externas. Elimina código duplicado entre AdminMusicas (Spotify), AdminVideos (YouTube) e AdminProducts (Mercado Livre). |

**Novo (14/05/2026):**
- `ExternalDataButton.js`: Componente que abstrai o padrão de botão "Puxar Dados". Recebe configuração de endpoint, validação de URL, mapeamento de campos e callback de sucesso. Usa layout flexbox responsivo, eliminando problemas de sobreposição do `position: absolute` anterior.

### 1.15 Managers

| Arquivo | Propósito |
|---------|-----------|
| `BackupManager.js` | Gerenciamento de backups do banco de dados. Exibe último backup e permite criar backup manual |
| `CacheManager.js` | Gerenciamento de cache Redis. Exibe métricas e permite limpeza do cache |

### 1.16 Tools

| Arquivo | Propósito |
|---------|-----------|
| `IntegrityCheck.js` | Placeholder para verificação de integridade do sistema |
| `RateLimitViewer.js` | Placeholder para visualização de rate limiting |

### 1.17 styles/Admin.module.css
**Localização:** `components/Admin/styles/Admin.module.css`

**Propósito:** Estilos CSS do módulo Admin. Contém classes para: layout de login, painel admin, formulários, tabelas, paginação, status badges, dashboard (stats grid e gráfico), navegação por abas, botões de ação e responsividade.

**Atualização (13/05/2026):** ~80 valores hardcoded substituídos por CSS Custom Properties (`var()`). Cores, espaçamentos, tipografia, bordas e sombras padronizados via tokens do Design System.

---

## 2. Features

Componentes de funcionalidades específicas do site público.

### 2.1 Blog

| Arquivo | Propósito |
|---------|-----------|
| `BlogSection.js` | Seção de blog na home. Consome `/api/posts`, exibe grid de cards. Com limitação opcional por prop `limit` |
| `PostCard.js` | Card individual de post. Usa `BaseCard` com imagem, metadados, categorias, título, resumo e link |
| `styles/Blog.module.css` | Estilos da seção Blog: grid, header, cards, categorias, footer responsivo |

### 2.2 ContentTabs

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Sistema de abas para conteúdo (Reflexões, Músicas, Vídeos, Produtos). Renderiza dinamicamente o componente correspondente à aba ativa. Aba "Em Desenvolvimento" desabilitada |
| `styles/ContentTabs.module.css` | Estilos das abas: navegação horizontal, indicador ativo, placeholder, responsividade |

### 2.3 Music

| Arquivo | Propósito |
|---------|-----------|
| `MusicCard.js` | Card de música com embed Spotify. Converte URL para embed, exibe player, título, artista e botão "Ouvir no Spotify" |
| `MusicGallery.js` | Galeria de músicas com busca (debounce 300ms), paginação e fallback de dados. Consome `/api/musicas` |
| `styles/MusicCard.module.css` | Estilos do card de música: embed wrapper, botão Spotify |
| `styles/MusicGallery.module.css` | Estilos da galeria: grid 3 colunas, busca, estados (loading/error/empty), paginação. Responsivo completo |

### 2.4 Products

| Arquivo | Propósito |
|---------|-----------|
| `ProductCard.js` | Card de produto com carrossel de imagens, lightbox, links para lojas (ML, Shopee, Amazon) com ícones SVG. Schema.org Product para SEO |
| `ProductList.js` | Listagem de produtos com busca textual, filtro por faixa de preço, paginação. Usa debounce (500ms) e ordenação por position |
| `styles.js` | Objetos de estilo compartilhados (inputStyle, buttonBaseStyle). Tokenizados com `var()` em 13/05/2026 |
| `styles/ProductCard.module.css` | Estilos do card de produto: media, navegação, lightbox, botões de loja com cores específicas |

### 2.5 Testimonials
**Localização:** `components/Features/Testimonials/index.js`

**Propósito:** Seção "Dicas do Dia". Carrossel/grid de depoimentos com fallback de dados estáticos. Scroll horizontal com detecção de posição para exibir setas de navegação.

**Atualização (13/05/2026):** Estilos inline tokenizados com `var()`. Cores, espaçamentos, bordas e sombras padronizados.

### 2.6 Video

| Arquivo | Propósito |
|---------|-----------|
| `VideoCard.js` | Card de vídeo com lazy loading via `LazyIframe`. Exibe título e descrição com truncamento. Tokenizado em 13/05/2026 |
| `VideoGallery.js` | Galeria de vídeos com busca (debounce 300ms), paginação, estados (loading/error/empty) e botão "Tentar novamente". Estilos inline tokenizados em 13/05/2026 |
| `styles/VideoGallery.module.css` | Estilos da galeria de vídeos: grid, busca, estados, responsividade. Tokenizado em 13/05/2026 |

---

## 3. Layout

Componentes de layout do Design System para construção de páginas.

### 3.1 Container.js
**Localização:** `components/Layout/Container.js`

**Propósito:** Container centralizado com max-width configurável (sm, md, lg, xl, 2xl, full). Suporta:
- Modo fluid (largura 100% com padding)
- Padding personalizado (none, sm, md, lg)
- Subcomponentes: `Container.Section`, `Container.Article`

### 3.2 Grid.js
**Localização:** `components/Layout/Grid.js`

**Propósito:** Sistema de grid flexível com 12 colunas. Suporta:
- Gap, rowGap, columnGap configuráveis
- Alinhamento vertical e horizontal
- Grid responsivo via CSS custom properties
- Subcomponentes: `Grid.Item`, `Grid.Auto`, `Grid.Responsive`

### 3.3 Stack.js
**Localização:** `components/Layout/Stack.js`

**Propósito:** Componente de empilhamento vertical/horizontal (Flexbox). Suporta:
- Spacing (gap) configurável entre itens
- Alinhamento e justificação
- Responsividade (horizontal vira vertical em mobile)
- Subcomponentes: `Stack.Item`, `Stack.Divider`, `Stack.Spacer`, `Stack.VStack`, `Stack.HStack`

### 3.4 Sidebar.js
**Localização:** `components/Layout/Sidebar.js`

**Propósito:** Layout com sidebar colapsável. Suporta:
- Posição left/right
- 3 tamanhos (sm, md, lg)
- Estado colapsado com persistência em localStorage
- Modo mobile com overlay
- Breakpoint configurável
- Subcomponentes: `Sidebar.Nav`, `Sidebar.NavItem`, `Sidebar.Section`, `Sidebar.Header`, `Sidebar.Footer`

### 3.5 index.js (Layout)
**Localização:** `components/Layout/index.js`

**Propósito:** Ponto de exportação centralizado para componentes de layout.

---

## 4. Performance

Componentes para otimização de performance do site.

### 4.1 CriticalCSS.js
**Localização:** `components/Performance/CriticalCSS.js`

**Propósito:** Inline de CSS crítico para renderização inicial. Inclui:
- Helper `extractCriticalCSS()` que gera CSS para above-the-fold
- Helper `removeCriticalCSS()` para remover após carregamento do CSS principal
- Reset básico, prevenção FOIT/FOUT, skeleton loading, prefers-reduced-motion

### 4.2 ImageOptimized.js
**Localização:** `components/Performance/ImageOptimized.js`

**Propósito:** Wrapper otimizado para `next/image`. Oferece:
- Fallback de imagem em caso de erro
- Skeleton loader durante carregamento
- Atributo `loading` e `priority` automáticos
- Placeholder blur via blurDataURL ou empty
- Controle de qualidade (default 75)

### 4.3 LazyIframe.js
**Localização:** `components/Performance/LazyIframe.js`

**Propósito:** Lazy loading de iframes (YouTube, Spotify). Oferece:
- Carregamento sob demanda (clique do usuário) para privacidade
- Thumbnail preview (YouTube automático ou customizado)
- IntersectionObserver para carregamento quando visível
- Conversão automática de URL para embed

### 4.4 PreloadResources.js
**Localização:** `components/Performance/PreloadResources.js`

**Propósito:** Preconnect e preload de recursos críticos. Inclui:
- Preconnect para domínios externos (Google Fonts, YouTube, Spotify)
- DNS Prefetch
- Preload de fontes, imagens LCP, scripts e CSS
- Helper `getCriticalResources()` por tipo de página

### 4.5 index.js (Performance)
**Localização:** `components/Performance/index.js`

**Propósito:** Ponto de exportação centralizado para componentes de performance.

---

## 5. SEO

Componentes para otimização de mecanismos de busca.

### 5.1 Head.js
**Localização:** `components/SEO/Head.js`

**Propósito:** Componente completo para meta tags SEO. Gera:
- Title, description, keywords, canonical URL
- Open Graph (og:) tags completas
- Twitter Cards (summary_large_image)
- Meta tags de artigo (published_time, author, section, tags)
- Favicons, manifest, apple-touch-icon
- Preconnect e DNS Prefetch
- Geo tags, theme-color, viewport
- Noindex/nofollow condicional

### 5.2 StructuredData

Conjunto de componentes para Schema.org JSON-LD:

| Arquivo | Propósito |
|---------|-----------|
| `OrganizationSchema.js` | Schema.org Organization. Inclui logo, contato, redes sociais, tipo adicional NGO |
| `WebsiteSchema.js` | Schema.org WebSite. Inclui SearchAction para busca no site |
| `ArticleSchema.js` | Schema.org Article + BlogPosting. Inclui headline, imagem, autor, publisher, datas |
| `BreadcrumbSchema.js` | Schema.org BreadcrumbList. Gera automaticamente URL absoluta e posição |
| `MusicSchema.js` | Schema.org MusicRecording + AudioObject. Inclui artista, álbum, duração, letra, links Spotify/YouTube |
| `VideoSchema.js` | Schema.org VideoObject. Inclui thumbnail, duração, uploadDate, views, transcrição |
| `index.js` | Ponto de exportação centralizado |

### 5.3 index.js (SEO)
**Localização:** `components/SEO/index.js`

**Propósito:** Ponto de exportação centralizado. Re-exporta `siteConfig`, `getCanonicalUrl`, `getImageUrl` do `lib/seo/config`.

---

## 6. UI (Design System)

Componentes base do Design System do projeto. Seguem padrão consistente de variantes, tamanhos e estados.

### 6.1 Button.js
**Localização:** `components/UI/Button.js`

**Propósito:** Botão com variantes (primary, secondary, ghost, danger, success, warning), tamanhos (sm, md, lg, xl), loading spinner, ícones esquerda/direita e efeito ripple.

**Atualização (13/05/2026):** `Button.module.css` tokenizado — cores, espaçamentos, border-radius, transitions e sombras substituídos por `var()`.

### 6.2 Input.js
**Localização:** `components/UI/Input.js`

**Propósito:** Input controlado/não-controlado com label, addons (ícones), variantes (default, filled, flushed), estados de erro, helper text, clearable. Suporta `forwardRef`.

**Atualização (13/05/2026):** `Input.module.css` tokenizado — cores, espaçamentos, border-radius e transitions substituídos por `var()`.

### 6.3 TextArea.js
**Localização:** `components/UI/TextArea.js`

**Propósito:** Textarea com auto-resize, contador de caracteres, bloqueio opcional em maxLength, estados de erro, helper text. Suporta `forwardRef`.

**Atualização (13/05/2026):** `TextArea.module.css` tokenizado — cores, espaçamentos, border-radius e transitions substituídos por `var()`.

### 6.4 Select.js
**Localização:** `components/UI/Select.js`

**Propósito:** Select nativo e custom combobox. Suporta busca (searchable), clearable, dropdown com scroll, opções desabilitadas, estados de erro.

**Atualização (13/05/2026):** `Select.module.css` tokenizado — cores, espaçamentos, border-radius, transitions e box-shadow substituídos por `var()`.

### 6.5 Modal.js
**Localização:** `components/UI/Modal.js`

**Propósito:** Modal em portal com focus trap, scroll lock (com contagem de referência para múltiplos modais), fechar por ESC e overlay. Tamanhos (sm, md, lg, xl, full).

**Atualização (13/05/2026):** `Modal.module.css` tokenizado — cores, espaçamentos, border-radius, z-index, box-shadow e transitions substituídos por `var()`.

### 6.6 Card.js
**Localização:** `components/UI/Card.js`

**Propósito:** Wrapper do `BaseCard` para compatibilidade. Preserva sub-componentes.

### 6.7 BaseCard.js
**Localização:** `components/UI/BaseCard.js`

**Propósito:** Card reutilizável com slots (media, header, content, footer). Variantes (default, outlined, filled, elevated), tamanhos (sm, md, lg), hoverable, clickable (com suporte a teclado), Schema.org.

**Atualização (13/05/2026):** `BaseCard.module.css` tokenizado — cores, espaçamentos, border-radius, transitions e box-shadow substituídos por `var()`.

### 6.8 Badge.js
**Localização:** `components/UI/Badge.js`

**Propósito:** Badge/insígnia com variantes, tamanhos, ícones, efeito pulse, dot indicator, posicionamento absoluto. Subcomponentes: `Badge.Counter`, `Badge.Dot`.

**Atualização (13/05/2026):** `Badge.module.css` tokenizado — cores, espaçamentos, border-radius e transitions substituídos por `var()`.

### 6.9 Alert.js
**Localização:** `components/UI/Alert.js`

**Propósito:** Alerta com status (info, success, warning, error), variantes de estilo (subtle, solid, left-accent, top-accent), ícones SVG, fechável, controlado/não-controlado. Exporta `defaultIcons`.

**Atualização (13/05/2026):** `Alert.module.css` tokenizado — cores de feedback (`info-50`, `success-50`, `warning-50`, `error-50`), espaçamentos e border-radius substituídos por `var()`.

### 6.10 Toast.js
**Localização:** `components/UI/Toast.js`

**Propósito:** Notificação temporária com auto-close, animações de entrada/saída por posição, barra de progresso, ícones via `defaultIcons`. Subcomponentes: `Toast.Container`. Hook `useToast` para gerenciamento.

**Atualização (13/05/2026):** `Toast.module.css` tokenizado — cores de status, espaçamentos, border-radius, z-index, box-shadow e transitions substituídos por `var()`.

### 6.11 Spinner.js
**Localização:** `components/UI/Spinner.js`

**Propósito:** Spinner de loading com variantes (border, grow, dots), tamanhos (xs-xl), cores. Subcomponentes: `Spinner.Container`, `Spinner.Overlay`.

**Atualização (13/05/2026):** `Spinner.module.css` tokenizado — cores (primary, secondary, white, dark) e z-index substituídos por `var()`.

### 6.12 StateMessages.js
**Localização:** `components/UI/StateMessages.js`

**Propósito:** Componentes padronizados para estados: `ErrorMessage`, `LoadingMessage`, `EmptyMessage`.

**Atualização (13/05/2026):** Estilos inline tokenizados — cores e espaçamentos substituídos por `var()`.

### 6.13 index.js (UI)
**Localização:** `components/UI/index.js`

**Propósito:** Ponto de exportação centralizado dos componentes UI.