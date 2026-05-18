# Análise de Componentes - `/components`

> **Data:** 18/05/2026 (atualizado)
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
- Geração automática de slug a partir do título com feedback visual via toast
- Validação Zod que impede publicação sem imagem de capa (via `.superRefine()`)
- Upload de imagens
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (18/05/2026):**
- Validação customizada `validatePost` migrada para `.superRefine()` no schema Zod, eliminando lógica acoplada ao componente
- Adicionado feedback visual com `toast.success()` na geração automática de slug, utilizando `useRef` para evitar notificações duplicadas

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

**Melhorias aplicadas (18/05/2026):**
- `CheckboxWrapper` inline substituído pelo componente reutilizável `ToggleField` com props `description`, `activeLabel` e `inactiveLabel`
- Preço agora armazenado como valor numérico decimal (`89.90`) em vez de string formatada (`R$ 89,90`), com formatação aplicada apenas na exibição via coluna `format`

### 1.8 AdminRolesTab.js
**Localização:** `components/Admin/AdminRolesTab.js`

**Propósito:** Gestão de cargos e permissões. Usa `AdminCrudBase` com campo customizado de seleção de permissões via checkboxes. Normaliza permissões antigas automaticamente.

**Melhorias aplicadas (18/05/2026):**
- Lista de permissões extraída para `lib/domain/permissions.js` com `Object.freeze`, garantindo imutabilidade e permitindo reuso em outros componentes

### 1.9 AdminUsers.js
**Localização:** `components/Admin/AdminUsers.js`

**Propósito:** Container de abas para "Gestão de Usuários e Admins" e "Gestão de Cargos". Utiliza `React.lazy()` + `<Suspense>` para lazy loading das abas inativas, e atributos ARIA completos para acessibilidade do sistema de abas.

**Melhorias aplicadas (18/05/2026):**
- Adicionados atributos ARIA completos: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby` e `tabIndex` para navegação por teclado
- Adicionada navegação por setas (ArrowLeft/ArrowRight) entre as abas
- Implementado lazy loading com `React.lazy()` e `<Suspense>` para carregar `AdminUsersTab` e `AdminRolesTab` sob demanda
- Estilos inline migrados para classes do `Admin.module.css` (`.adminPanel`, `.tabs`, `.tabButton`, `.activeTab`, `.icon`, `.tabPanel`)
- Adicionados JSDoc, PropTypes e `displayName` ao componente
- Ícones emoji encapsulados com `aria-hidden="true"` para leitores de tela
- Adicionada classe `.tabPanel` no CSS module com `min-height` e `focus-visible` outline

### 1.10 AdminUsersTab.js
**Localização:** `components/Admin/AdminUsersTab.js`

**Propósito:** Gestão de usuários e admins. Usa `AdminCrudBase` com campos: username, senha, cargo. Inclui:
- Campo customizado `RoleSelectField` que busca cargos da API dinamicamente com cache em sessionStorage
- Validação de senha (mínimo 6 caracteres) para novos usuários
- Formatação amigável de último login (ex: "há 2 horas")

**Melhorias aplicadas (18/05/2026):**
- Cache em `sessionStorage` com TTL de 5 minutos no `RoleSelectField`, evitando múltiplas requisições quando há vários usuários na página
- Lógica de verificação 401 extraída para função `handleUnauthorized` em `lib/auth.js`, eliminando duplicação com `AdminAudit.js`
- Adicionados atributos ARIA de acessibilidade: `aria-describedby`, `aria-errormessage`, `aria-invalid` no select, `htmlFor` no label, `role="alert"` no erro e IDs únicos nos spans de hint e erro
- Import do helper `handleUnauthorized` via alias `@/lib/auth`

### 1.11 AdminVideos.js
**Localização:** `components/Admin/AdminVideos.js`

**Propósito:** Gestão de vídeos com integração YouTube. Usa `AdminCrudBase` com campos: título, descrição, URL do YouTube, thumbnail, status. Inclui:
- Extração de ID do YouTube de múltiplos formatos de URL via helper centralizado `lib/youtube.js`
- Botão "Puxar Dados" via componente genérico `ExternalDataButton` que busca título via API do YouTube
- Preview do embed na tabela com carregamento lazy via `LazyIframe` (carrega sob demanda ao clicar)
- Paginação habilitada
- Reordenação Drag & Drop via helper compartilhado `lib/reorder.js`

**Melhorias aplicadas (14/05/2026):**
- `handleReorder` extraído para helper compartilhado `lib/reorder.js`
- Botão "Puxar Dados" substituído pelo componente genérico `ExternalDataButton`
- Layout do botão alterado de `position: absolute` para flexbox responsivo

**Melhorias aplicadas (18/05/2026):**
- Regex de extração de ID do YouTube extraída para helper centralizado `lib/youtube.js` com função `extractYoutubeId()`, eliminando duplicação em `AdminVideos.js`, `LazyIframe.js` e `UrlField.js`
- Embed de vídeo na tabela substituído pelo componente `LazyIframe`, que carrega via clique (thumbnail + carregamento sob demanda), evitando carregamento de múltiplos iframes do YouTube na listagem

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
| `TextField.js` | Campo de texto padrão (suporta type: text, email, password, number, tel, search). Delega internamente para `Input.js` (UI), mantendo API específica do Admin |
| `TextAreaField.js` | Campo de textarea com contador de caracteres. Delega internamente para `TextArea.js` (UI), mantendo API específica do Admin |
| `ImageUploadField.js` | Campo de upload de imagem com preview. Upload via input file ou URL manual. Usa `toast.error()` para notificações em vez de `alert()` |
| `ToggleField.js` | Checkbox estilizado com labels dinâmicos (Publicado/Rascunho) |
| `UrlField.js` | Campo de URL com validação e preview (YouTube, Spotify). Extrai IDs automaticamente |
| `ExternalDataButton.js` | Componente genérico para botão "Puxar Dados" de fontes externas. Elimina código duplicado entre AdminMusicas (Spotify), AdminVideos (YouTube) e AdminProducts (Mercado Livre). |

**Novo (14/05/2026):**
- `ExternalDataButton.js`: Componente que abstrai o padrão de botão "Puxar Dados". Recebe configuração de endpoint, validação de URL, mapeamento de campos e callback de sucesso. Usa layout flexbox responsivo, eliminando problemas de sobreposição do `position: absolute` anterior.

**Melhorias aplicadas (18/05/2026):**
- `TextField.js` e `TextAreaField.js` agora delegam internamente para `Input.js` e `TextArea.js` da UI respectivamente, eliminando a duplicidade funcional. Adaptam a API específica do Admin (erro como string, hint) para a API dos componentes base da UI (erro como boolean + errorMessage, helperText).
- `ImageUploadField.js`: substituído `alert()` por `toast.error()` do `react-hot-toast` para evitar bloqueio da UI; callback `onUpload` agora recebe `(file, uploadType)` para maior flexibilidade.

### 1.15 Managers

| Arquivo | Propósito |
|---------|-----------|
| `BackupManager.js` | Gerenciamento de backups do banco de dados. Exibe último backup e permite criar backup manual com modal de confirmação |
| `CacheManager.js` | Gerenciamento de cache Redis. Exibe métricas e permite limpeza do cache com modal de confirmação |

**Melhorias aplicadas (18/05/2026):**
- `BackupManager.js` e `CacheManager.js`: substituído `confirm()` e `window.confirm()` nativos pelo componente `Modal.js` do Design System, com estados `showConfirm` e botões Confirmar/Cancelar estilizados
- `CacheManager.js`: adicionado `credentials: 'include'` no fetch POST de limpeza do cache para enviar cookies de autenticação, alinhando com o padrão dos demais componentes Admin

### 1.16 Tools

| Arquivo | Propósito |
|---------|-----------|
| `IntegrityCheck.js` | Verificação de integridade do sistema. Consome endpoint `/api/admin/integrity` e exibe diagnóstico completo: banco de dados (status, latência, tamanho, conexões), cache/Redis (conectividade, tipo), armazenamento (arquivos, tamanho, disco livre/total), backup (total, último backup com data, tamanho e idade) e sistema (Node.js, uptime, RAM, CPU, plataforma, ambiente). Inclui status geral (Saudável/Degradado/Alertas), auto-refresh a cada 30s, botão "Atualizar" manual, loading state (skeleton), error state (com retry) e timestamp da última verificação. Endpoint protegido por RBAC (permissão "Segurança"). |
| `RateLimitViewer.js` | Visualização e gerenciamento de rate limiting. Consome endpoint `/api/admin/rate-limit` e exibe 3 abas: **(1)** IPs bloqueados — lista com tentativas e tempo restante para desbloqueio, com botão "Desbloquear"; **(2)** Whitelist — formulário para adicionar IP e lista com botão "Remover"; **(3)** Auditoria — logs de ações com busca textual e paginação. Inclui auto-refresh a cada 15s, botão "Atualizar" manual, loading state (skeleton), error state (com retry) e empty states com mensagens informativas. |

### 1.17 Styles (Admin)
**Localização:** `components/Admin/styles/`

Conjunto de **7 módulos CSS** organizados por domínio, substituindo o antigo arquivo monolítico `Admin.module.css` (1001 linhas). Cada módulo é importado apenas pelos componentes que o utilizam, melhorando a manutenibilidade e reduzindo o acoplamento.

| Módulo | Arquivo | Classes | Usado por |
|--------|---------|---------|-----------|
| **Login** | `login.module.css` | `.container`, `.main`, `.loginContainer`, `.loginForm`, `.loginInput`, `.button`, `.error`, `.adminPanel`, `.header`, `.logoutButton`, `.navigation`, `.navLink` | `withAdminAuth.js` |
| **CRUD** | `crud.module.css` | `.content`, `.sectionHeader`, `.table`, `.tableContainer`, `.tableImage`, `.actionButtons`, `.editButton`, `.deleteButton`, `.addButton`, `.exportButton`, `.pagination`, `.paginationButton`, `.paginationInfo`, `.statusBadge`, `.statusPublished`, `.statusDraft`, `.statusToggle`, `.skeletonBox`, `.emptyCell`, `.emptyStateRow`, `.link`, `.spotifyLink`, `.form`, `.formRow`, `.formSection`, `.formActions`, `.cancelButton`, `.saveButton` | `AdminCrudBase.js`, `AdminMusicas.js` |
| **Dashboard** | `dashboard.module.css` | `.content`, `.sectionHeader`, `.statsGrid`, `.statCard`, `.statIcon`, `.statInfo`, `.statNumber`, `.statLabel`, `.chartSection` | `AdminDashboard.js` |
| **Tabs** | `tabs.module.css` | `.adminPanel`, `.tabs`, `.tabButton`, `.activeTab`, `.tabPanel`, `.icon` | `AdminUsers.js` |
| **Permissions** | `permissions.module.css` | `.permissionsField`, `.permissionsLabel`, `.permissionsGrid`, `.permissionsGridError`, `.permissionsCheckbox`, `.permissionsCheckboxInput`, `.permissionsError`, `.permissionsBadgeContainer`, `.permissionsBadge` | `AdminRolesTab.js` |
| **Form Fields** | `form.module.css` | `.formGroup`, `.input`, `.formHint`, `.previewSection`, `.videoPreview`, `.saveButton` | `ToggleField.js`, `UrlField.js`, `ImageUploadField.js` |
| **Miscellaneous** | `misc.module.css` | `.button`, `.skeletonBox`, `.subNavigation`, `.subNavLinks`, `.subNavLink`, `.activeSubNavLink`, `.placeholderContainer`, `.placeholderCard`, `.placeholderIcon`, `.placeholderButton`, `.infoBox`, `.errorMessage`, `.successMessage`, `.emptyState`, `.preview`, `.previewContent`, `.previewImage`, `.previewSection`, `.textarea`, `.videoPreview`, `.noImage`, `.noPreview`, `.embedContainer`, `.spotifyEmbed` | `IntegrityCheck.js`, `RateLimitViewer.js` |

**Atualizações:**
- **(13/05/2026):** ~80 valores hardcoded substituídos por CSS Custom Properties (`var()`). Cores, espaçamentos, tipografia, bordas e sombras padronizados via tokens do Design System.
- **(18/05/2026):** `Admin.module.css` (1001 linhas) dividido em 7 módulos menores. `!important` removido de `.activeSubNavLink`. Classes `.formGroup` duplicadas unificadas. Classe `.input` renomeada para `.loginInput` no módulo de login. 12 componentes JS atualizados para importar apenas o módulo específico, com mapeamento explícito (sem spread) para evitar conflitos de nomes entre módulos. Arquivo original `Admin.module.css` removido.

---

## 2. Features

Componentes de funcionalidades específicas do site público.

### 2.1 Blog

| Arquivo | Propósito |
|---------|-----------|
| `BlogSection.js` | Seção de blog na home. Consome `/api/posts`, exibe grid de cards. Com limitação opcional por prop `limit` |
| `PostCard.js` | Card individual de post. Usa `BaseCard` com imagem, metadados, categorias, título, resumo e link |
| `styles/Blog.module.css` | Estilos da seção Blog: grid, header, cards, categorias, footer responsivo |

**Melhorias aplicadas (18/05/2026):**
- `BlogSection.js`: `displayedPosts` envolvido em `useMemo` com dependências `[posts, limit]` para evitar recálculo desnecessário a cada renderização
- `PostCard.js`: atributo `alt` da imagem agora possui fallback (`post.title || 'Imagem ilustrativa do artigo'`) para garantir descrição acessível mesmo quando o título estiver vazio
- `PostCard.js`: link `/blog/${post.slug}` agora possui `aria-label` descritivo (ex: "Ler mais sobre: {título}") e `title` com o título do post para melhor SEO e acessibilidade

### 2.2 ContentTabs

| Arquivo | Propósito |
|---------|-----------|
| `index.js` | Sistema de abas para conteúdo (Reflexões, Músicas, Vídeos, Produtos). Renderiza dinamicamente o componente correspondente à aba ativa via `React.lazy()`. Aba "Em Desenvolvimento" desabilitada. Segue padrão WAI-ARIA Tabs Pattern com roles e atributos acessíveis |
| `styles/ContentTabs.module.css` | Estilos das abas: navegação horizontal, indicador ativo, loading fallback, placeholder, responsividade |

**Melhorias aplicadas (18/05/2026):**
- `index.js`: imports estáticos substituídos por `React.lazy()` + `<Suspense>` para carregamento sob demanda dos componentes de aba, evitando fetch de API desnecessário para abas não visíveis
- `index.js`: componente `PlaceholderContent` simplificado — removido `contentMap` com entradas mortas (músicas, vídeos) que não eram mais utilizadas
- `index.js`: adicionados atributos ARIA para acessibilidade — `role="tablist"` no container, `role="tab"` e `aria-controls` nos botões, `role="tabpanel"` e `aria-labelledby` no conteúdo, IDs únicos para vínculo entre abas e painéis
- `ContentTabs.module.css`: adicionada classe `.loading` para fallback visual do `Suspense`
- Import não utilizado de `Link` (`next/link`) removido

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