# Análise de Melhorias — `/components`

> **Data:** 24/09/2026  
> **Objetivo:** Levantamento analítico de possíveis melhorias, correções, ajustes estruturais e pontos de atenção identificados nos componentes. Nenhuma alteração será aplicada neste documento.

---

## 1. Painéis Administrativos (Admin)

### 1.1 AdminCrudBase.js

**Localização:** `components/Admin/AdminCrudBase.js`

Componente base genérico para CRUD administrativo. Elimina duplicação entre AdminMusicas, AdminVideos e AdminPosts.

**Arquivos acionados/relacionados:**
- `components/Admin/CrudForm.js` — subcomponente de formulário
- `components/Admin/CrudTable.js` — subcomponente de tabela
- `components/Admin/fields/*` — campos de formulário (TextField, TextAreaField, ToggleField, UrlField, ImageUploadField, ExternalDataButton)
- `components/UI/Modal.js` — modal de confirmação de exclusão
- `components/UI/Button.js` — botões do modal
- `utils/csvExport.js` — exportação CSV
- `hooks/useAdminCrud` — hook de CRUD

**Resumo:** Componente genérico que centraliza lógica de CRUD com suporte a paginação, busca, reordenação via Drag & Drop, exportação CSV, confirmação de exclusão em modal, validação via Zod e validação customizada. Usa `useAdminCrud` hook para gerenciar estado e chamadas API.

**Ajustes/Melhorias identificados:**
- Código comentado na linha 80: `toast.success('Operação realizada com sucesso!')` — remover código morto
- Estilos inline extensos no header (busca, botões) e container principal (`minHeight: '700px'`) — extrair para CSS Module
- Input de busca sem `aria-label` (usa apenas placeholder)

---

### 1.2 CrudForm.js

**Localização:** `components/Admin/CrudForm.js`

Subcomponente de formulário dinâmico para CRUD administrativo. Extraído de AdminCrudBase para reduzir complexidade.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/crud.module.css` — estilos do formulário
- `components/Admin/AdminCrudBase.js` — componente pai

**Resumo:** Renderiza campos dinamicamente a partir da configuração `fields`. Suporta `renderCustomFormField` para campos customizados. Contém formulário com botão de salvar/submit.

---

### 1.3 CrudTable.js

**Localização:** `components/Admin/CrudTable.js`

Subcomponente de tabela para CRUD administrativo. Extraído de AdminCrudBase.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/crud.module.css` — estilos da tabela
- `components/Admin/AdminCrudBase.js` — componente pai

**Resumo:** Renderiza tabela com suporte a: colunas customizadas (render, format), status booleanos com toggle via botão, Drag & Drop para reordenação (quando `reorderable`), paginação, estados de loading (skeletons), estado vazio.

**Ajustes/Melhorias identificados:**
- Drag & Drop via teclado é apenas placeholder (comentário "Placeholder para ativar o modo de arrasto via teclado") — sem implementação real de reordenação acessível
- Célula de reordenação usa `role="button"` e `tabIndex={0}` mas não tem handler funcional de teclado
- Estilos inline extensos no `<thead>` (sticky, zIndex, backgroundColor) — extrair para CSS Module
- Tabela sem `<caption>` ou `aria-label` descritivo (usa `aria-label={title}` no `<table>`)

---

### 1.4 AdminDashboard.js

**Localização:** `components/Admin/AdminDashboard.js`

Painel de estatísticas do sistema com gráficos de barras CSS e cache em sessionStorage.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/dashboard.module.css` — estilos do dashboard

**Resumo:** Exibe 6 cartões de estatísticas (Posts, Músicas, Vídeos, Produtos, Dicas, Usuários) com gráficos de barras horizontais CSS. Usa cache em sessionStorage com TTL de 30s. Filtra itens por permissões do usuário.

**Ajustes/Melhorias identificados:**
- Gráfico de barras com estilos inline extensos — extrair para CSS Module ou subcomponente
- Gráfico sem `role="img"` ou `aria-label` descritivo
- Cache em sessionStorage com chave fixa `admin_dashboard_stats` — pode conflitar entre múltiplas abas/sessões
- Sem tratamento específico de 401 (apenas erro genérico)

---

### 1.5 AdminPosts.js

**Localização:** `components/Admin/AdminPosts.js`

Gerenciamento de posts/artigos via AdminCrudBase com geração automática de slug.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `components/Admin/fields/TextAreaField.js`
- `components/Admin/fields/ImageUploadField.js`
- `components/Admin/fields/ToggleField.js`
- `utils/reorder.js` — reordenação

**Resumo:** Configuração de CRUD para posts com campos: título, slug (com geração automática via `generateSlug`), excerpt, content, image_url, published. Validação customizada exige imagem de capa para posts publicados.

**Ajustes/Melhorias identificados:**
- `renderCustomFormField` mescla lógica de title e slug — separar em funções distintas
- `slugGeneratedRef` controla toast único, mas não é resetado ao editar outro post — toast pode não aparecer em edições subsequentes

---

### 1.6 AdminVideos.js

**Localização:** `components/Admin/AdminVideos.js`

Gerenciamento de vídeos via AdminCrudBase com pré-visualização YouTube.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js` — usado incorretamente para descrição
- `components/Admin/fields/UrlField.js`
- `components/Admin/fields/ImageUploadField.js`
- `components/Admin/fields/ToggleField.js`
- `components/Admin/fields/ExternalDataButton.js`
- `components/Performance/LazyIframe.js` — pré-visualização
- `lib/media/youtube` — extrair ID YouTube

**Resumo:** CRUD para vídeos com campos: título, descrição, URL YouTube (com preview via LazyIframe), thumbnail, publicado. Suporte a "Puxar Dados" do YouTube via ExternalDataButton.

**Ajustes/Melhorias identificados:**
- Campo `descricao` usa `TextField(type='textarea')` — TextField não suporta nativamente `type="textarea"`. Deve usar `TextAreaField`

---

### 1.7 AdminMusicas.js

**Localização:** `components/Admin/AdminMusicas.js`

Gerenciamento de músicas via AdminCrudBase com integração Spotify.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `components/Admin/fields/UrlField.js`
- `components/Admin/fields/ToggleField.js`
- `components/Admin/fields/ExternalDataButton.js`
- `utils/reorder.js`

**Resumo:** CRUD para músicas com campos: título, artista, URL Spotify (com preview iframe), publicado. Validação Zod. Suporte a reordenação e exportação CSV.

**Ajustes/Melhorias identificados:**
- Import de `styles` (crud.module.css) subutilizado — usado só no link `.spotifyLink`

---

### 1.8 AdminProducts.js

**Localização:** `components/Admin/AdminProducts.js`

Gerenciamento de produtos via AdminCrudBase com integração Mercado Livre.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `components/Admin/fields/TextAreaField.js` — usado para image_url
- `components/Admin/fields/ToggleField.js`
- `components/Admin/fields/ExternalDataButton.js`
- `utils/reorder.js`

**Resumo:** CRUD para produtos com campos: nome, preço, URLs de imagens (TextAreaField com URLs separadas por newline), description, link, published. Integração com Mercado Livre via ExternalDataButton.

**Ajustes/Melhorias identificados:**
- Campo `image_url` armazena URLs separadas por `\n` em string única — considerar array ou upload múltiplo
- Campo `image_url` aceita qualquer URL sem validação adicional (apenas `min(1)`)
- `apiEndpoint` aponta para `/api/products` (público) em vez de `/api/admin/products` — verificar se é intencional

---

### 1.9 AdminDicas.js

**Localização:** `components/Admin/AdminDicas.js`

Gerenciamento de "Dicas do Dia" via AdminCrudBase.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `components/Admin/fields/TextAreaField.js`
- `components/Admin/fields/ToggleField.js`

**Resumo:** CRUD simples para dicas com campos: name, content (TextArea), published (Toggle). Placeholder de nome ajustado para "Ex: Mensagem de fé".

---

### 1.10 AdminUsers.js

**Localização:** `components/Admin/AdminUsers.js`

Container de abas para Gestão de Usuários e Cargos com lazy loading.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminUsersTab.js` — aba de usuários (lazy)
- `components/Admin/AdminRolesTab.js` — aba de cargos (lazy)
- `components/Admin/styles/tabs.module.css`
- `components/Admin/styles/misc.module.css`

**Resumo:** Componente container que gerencia navegação entre abas "Gestão de Usuários" e "Gestão de Cargos" com suporte a navegação por teclado (setas esquerda/direita) e lazy loading via Suspense.

---

### 1.11 AdminUsersTab.js

**Localização:** `components/Admin/AdminUsersTab.js`

Gerenciamento de usuários via AdminCrudBase com campo de cargo dinâmico.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `hooks/useUnauthorized` — tratamento de sessão expirada
- `date-fns` / `date-fns/locale/ptBR` — formatação de datas

**Resumo:** CRUD para usuários com campos: username, password, role (RoleSelectField custom que busca cargos via API e cacheia em sessionStorage por 5min). Validação Zod + custom (senha mínimo 6 caracteres). Formatação de last_login_at com `formatDistanceToNow`.

**Ajustes/Melhorias identificados:**
- Fetch com verificação de Content-Type repetido (padrão transversal)
- Tratamento de sessão expirada (401) — padrão transversal

---

### 1.12 AdminRolesTab.js

**Localização:** `components/Admin/AdminRolesTab.js`

Gerenciamento de cargos e permissões via AdminCrudBase.

**Arquivos acionados/relacionados:**
- `components/Admin/AdminCrudBase.js`
- `components/Admin/fields/TextField.js`
- `lib/domain/permissions` — lista de permissões
- `components/Admin/styles/permissions.module.css`

**Resumo:** CRUD para cargos com campo customizado `PermissionsSelectField` que renderiza checkboxes para cada permissão do sistema. Normaliza permissão "Dicas" para "Gestão de Dicas".

---

### 1.13 AdminAudit.js

**Localização:** `components/Admin/AdminAudit.js`

Histórico global de auditoria com busca, filtros de data e exportação CSV.

**Arquivos acionados/relacionados:**
- `hooks/useUnauthorized` — tratamento de sessão expirada
- `utils/csvExport.js` — exportação CSV
- `react-hot-toast` — notificações

**Resumo:** Exibe logs de auditoria com paginação (50 itens/page), busca por ação/usuário/detalhes, filtros de data inicial/final, exportação CSV dos logs filtrados.

**Ajustes/Melhorias identificados:**
- Tratamento de sessão expirada (401) — padrão transversal
- Fetch com verificação de Content-Type repetido — padrão transversal
- Estilos inline extensos no container principal e header — extrair para CSS Module
- Tabela sem `<caption>` ou `aria-label` descritivo

---

### 1.14 withAdminAuth.js

**Localização:** `components/Admin/withAdminAuth.js`

HOC para proteger páginas administrativas com formulário de login.

**Arquivos acionados/relacionados:**
- `hooks/useAdminAuth` — autenticação
- `components/Admin/styles/login.module.css`

**Resumo:** HOC que envolve componente administrativo. Quando não autenticado, exibe formulário de login. Quando autenticado, renderiza painel com header (título + botão sair) e navigation (link voltar ao painel).

**Ajustes/Melhorias identificados:**
- Formulário de login sem labels associados aos inputs (só placeholder)
- Botão "Sair" e link "Voltar ao Painel Principal" sem `aria-label` explícito

---

### 1.15 Tools — IntegrityCheck.js

**Localização:** `components/Admin/Tools/IntegrityCheck.js`

Verificação de integridade do sistema (banco, cache, storage, backup, sistema).

**Arquivos acionados/relacionados:**
- `components/Admin/styles/misc.module.css`
- `components/Admin/styles/crud.module.css` — skeletons

**Resumo:** Exibe cards de verificação para database, cache, storage, backup e system. Auto-refresh a cada 30s. Tratamento de 401 com reload.

**Ajustes/Melhorias identificados:**
- Tratamento de sessão expirada (401) — padrão transversal
- Fetch com verificação de Content-Type — padrão transversal
- Estilos inline extensos nos cards de status — extrair para CSS Module

---

### 1.16 Tools — RateLimitViewer.js

**Localização:** `components/Admin/Tools/RateLimitViewer.js`

Visualização e gestão de Rate Limiting (IPs bloqueados, whitelist, auditoria).

**Arquivos acionados/relacionados:**
- `components/Admin/styles/misc.module.css`

**Resumo:** Componente com 3 abas internas: IPs bloqueados (com desbloqueio), whitelist (com adição/remoção), logs de auditoria (com busca e paginação). Auto-refresh a cada 15s. Tratamento de 401 em fetchAuditLogs (adicionado recentemente).

**Ajustes/Melhorias identificados:**
- Abas internas sem `role="tablist"`/`role="tab"`/`aria-selected` — acessibilidade incompleta
- `fetchAuditLogs` agora trata 401 (implementado recentemente) — antes era a única rota sem tratamento
- 548 linhas — alto acoplamento. Considerar extração de subcomponentes
- Não faz verificação de Content-Type nas respostas JSON

---

### 1.17 Managers — BackupManager.js

**Localização:** `components/Admin/Managers/BackupManager.js`

Gerenciamento de backups do banco de dados.

**Arquivos acionados/relacionados:**
- `components/UI/Modal.js` — modal de confirmação

**Resumo:** Exibe info do último backup (nome, data, tamanho) e botão para criar backup manual com modal de confirmação.

**Ajustes/Melhorias identificados:**
- Modal de confirmação quase idêntico ao CacheManager — extrair `ConfirmModal`
- Mensagem de feedback condicional duplicada (padrão transversal)
- Estilos inline — extrair para CSS Module
- Não trata sessão expirada (401)

---

### 1.18 Managers — CacheManager.js

**Localização:** `components/Admin/Managers/CacheManager.js`

Gerenciamento de cache Redis com métricas de status.

**Arquivos acionados/relacionados:**
- `components/UI/Modal.js` — modal de confirmação
- `react-hot-toast` — notificações

**Resumo:** Exibe status do Redis (conectado/desconectado, erros, fallbacks, tamanho local) e botão para limpar cache com modal de confirmação.

**Ajustes/Melhorias identificados:**
- Modal de confirmação quase idêntico ao BackupManager — extrair `ConfirmModal`
- Estilos inline — extrair para CSS Module
- Não trata sessão expirada (401)

---

### 1.19 Fields — TextField.js

**Localização:** `components/Admin/fields/TextField.js`

Adaptador que delega para `Input` da UI, mantendo API específica do AdminCrudBase.

**Arquivos acionados/relacionados:**
- `components/UI/Input.js`

**Resumo:** Campo de texto reutilizável. Suporta tipos: text, email, password, number, tel, search.

---

### 1.20 Fields — TextAreaField.js

**Localização:** `components/Admin/fields/TextAreaField.js`

Adaptador que delega para `TextArea` da UI.

**Arquivos acionados/relacionados:**
- `components/UI/TextArea.js`

**Resumo:** Campo textarea reutilizável com suporte a rows, maxLength, showCount.

---

### 1.21 Fields — ToggleField.js

**Localização:** `components/Admin/fields/ToggleField.js`

Campo toggle (checkbox) com label e indicador visual de status.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/form.module.css`

**Resumo:** Renderiza checkbox com label e badge de status (Publicado/Rascunho ou customizado via activeLabel/inactiveLabel).

---

### 1.22 Fields — UrlField.js

**Localização:** `components/Admin/fields/UrlField.js`

Campo de URL com validação e preview para YouTube/Spotify.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/form.module.css`
- `lib/media/youtube` — extrair ID YouTube
- `lib/media/spotify` — extrair ID Spotify

**Resumo:** Input de URL com validação platform-specific (YouTube, Spotify, genérico). Suporta preview embutido (iframe YouTube/Spotify) quando `showPreview=true`.

---

### 1.23 Fields — ImageUploadField.js

**Localização:** `components/Admin/fields/ImageUploadField.js`

Campo de upload de imagem com preview e suporte a upload customizado.

**Arquivos acionados/relacionados:**
- `components/Admin/styles/form.module.css`
- `react-hot-toast` — notificações de erro

**Resumo:** Input de texto + botão de upload de arquivo. Suporta upload via endpoint padrão (`/api/upload-image`) ou handler customizado (`onUpload`). Mostra preview da imagem selecionada.

**Ajustes/Melhorias identificados:**
- Uso de `<label>` com `htmlFor` apontando para input de texto, mas input de arquivo está oculto dentro de outro `<label>` — verificar associação correta para acessibilidade

---

### 1.24 Fields — ExternalDataButton.js

**Localização:** `components/Admin/fields/ExternalDataButton.js`

Botão genérico para "Puxar Dados" de fontes externas (Spotify, YouTube, Mercado Livre).

**Arquivos acionados/relacionados:**
- `react-hot-toast` — notificações

**Resumo:** Componente que encapsula botão de busca externa, substituindo o padrão duplicado que existia em AdminMusicas.js, AdminVideos.js e AdminProducts.js. Suporta fieldMappings automáticos ou callback onSuccess customizado.

---

### 1.25 Admin/index.js

**Localização:** `components/Admin/index.js`

Barrel file de exportações do módulo Admin.

**Resumo:** Exporta AdminCrudBase, AdminMusicasNew, AdminVideosNew, AdminPostsNew e todos os fields. **Barrel incompleto** — não exporta AdminDashboard, AdminDicas, AdminAudit, AdminUsers, AdminUsersTab, AdminRolesTab, Managers, Tools, withAdminAuth.

---

### 1.26 Admin/styles (arquivos CSS)

- `crud.module.css` — estilos de tabela, formulário, botões, paginação, status badges, skeletons
- `dashboard.module.css` — estilos do dashboard (conteúdo, sectionHeader, statsGrid, statCard, chartSection)
- `form.module.css` — estilos de campos (formGroup, input, formHint, previewSection, videoPreview, saveButton)
- `login.module.css` — estilos de login (container, main, loginForm, loginInput, button, error, adminPanel, header, logoutButton, navigation, navLink)
- `misc.module.css` — estilos miscelâneos (button, subNavigation, placeholder styles, infoBox, messages, emptyState, preview, textarea, videoPreview, embedContainer, responsive)
- `permissions.module.css` — estilos de permissões (permissionsField, permissionsLabel, permissionsGrid, permissionsCheckbox, permissionsBadge, permissionsBadgeContainer, permissionsError)
- `tabs.module.css` — estilos de abas (adminPanel, tabs, tabButton, activeTab, icon)

---

## 2. Features

### 2.1 Blog — BlogSection.js

**Localização:** `components/Features/Blog/BlogSection.js`

**Arquivos acionados/relacionados:**
- `hooks/useApiFetch` — fetch de posts
- `components/Features/Blog/PostCard.js`
- `components/Features/Blog/styles/Blog.module.css`

**Resumo:** Busca posts via API `/api/posts?response=v1` com transform para adaptar diferentes formatos de resposta. Exibe grid de PostCards com limit opcional. Link "Ver todas as postagens" com estilos inline.

**Ajustes/Melhorias identificados:**
- Estilos inline no link "Ver todas as postagens" — extrair para CSS Module

---

### 2.2 Blog — PostCard.js

**Localização:** `components/Features/Blog/PostCard.js`

**Arquivos acionados/relacionados:**
- `components/UI/BaseCard.js`
- `components/Features/Blog/styles/Blog.module.css`

**Resumo:** Card de post com BaseCard, imagem (com fallback `/api/placeholder-image?text=Reflexão`), título, excerpt, data de criação e link "Ler mais".

**Ajustes/Melhorias identificados:**
- Imagem sem `alt` descritivo quando `post.title` está vazio — fallback `alt="Imagem ilustrativa do artigo"` pode não ser suficiente

---

### 2.3 Blog — Blog.module.css

**Localização:** `components/Features/Blog/styles/Blog.module.css`

CSS Module para BlogSection e PostCard. Define seção, container, header, title, subtitle, grid, category, cardTitle, excerpt, footer, date, readMore.

---

### 2.4 ContentTabs — index.js

**Localização:** `components/Features/ContentTabs/index.js`

**Arquivos acionados/relacionados:**
- `components/Features/Blog/BlogSection.js`
- `components/Features/Music/MusicGallery.js`
- `components/Features/Video/VideoGallery.js`
- `components/Features/Products/ProductList.js`
- `components/Features/ContentTabs/styles/ContentTabs.module.css`

**Resumo:** Componente de abas que alterna entre: Reflexões & Estudos (BlogSection), Em Desenvolvimento (PlaceholderContent), Músicas (MusicGallery), Vídeos (VideoGallery), Produtos (ProductList). Abas com `role="tablist"`/`role="tab"`/`aria-selected`. Aba "projeto1" desabilitada.

**Ajustes/Melhorias identificados:**
- Aba "projeto1" (Em Desenvolvimento) desabilitada via `disabled` no botão, mas o `onClick` também bloqueia — lógica duplicada
- Estilos placeholderContainer/placeholderCard similares aos de `misc.module.css` (Admin)

---

### 2.5 ContentTabs — ContentTabs.module.css

**Localização:** `components/Features/ContentTabs/styles/ContentTabs.module.css`

CSS Module para ContentTabs. Define tabsSection, container, tabsContainer, tabButton, tabIcon, contentContainer, loading, e estilos de placeholder.

---

### 2.6 Music — MusicCard.js

**Localização:** `components/Features/Music/MusicCard.js`

**Arquivos acionados/relacionados:**
- `components/UI/BaseCard.js`
- `components/Performance/LazyIframe.js`
- `lib/media/spotify` — conversão de URL
- `components/Features/Music/styles/MusicCard.module.css`

**Resumo:** Card de música com BaseCard, embed de Spotify via LazyIframe, título, artista e botão "Ouvir no Spotify" (abre em nova aba).

---

### 2.7 Music — MusicGallery.js

**Localização:** `components/Features/Music/MusicGallery.js`

**Arquivos acionados/relacionados:**
- `hooks/useApiFetch`, `hooks/useDebounce`
- `components/UI/StateMessages.js` — LoadingMessage, ErrorMessage
- `components/Features/Music/MusicCard.js`
- `components/Features/Music/styles/MusicGallery.module.css`

**Resumo:** Galeria de músicas com busca (debounce 300ms), ordenação (default/recent/alpha), paginação (6 itens/page). Extração robusta de dados de resposta (formatos direto, aninhado, fallback calculado).

**Melhorias identificadas:**
- Lógica de paginação/adaptação de resposta duplicada com VideoGallery

---

### 2.8 Music — MusicCard.module.css

**Localização:** `components/Features/Music/styles/MusicCard.module.css`

CSS Module para MusicCard. Define embedWrapper, musicTitle, musicArtist, spotifyButton, noEmbed.

---

### 2.9 Music — MusicGallery.module.css

**Localização:** `components/Features/Music/styles/MusicGallery.module.css`

CSS Module para MusicGallery. Define galleryContainer, galleryGrid, search styles, pagination, noResults. Muitas media queries fragmentadas (mobile, small mobile, medium mobile, large mobile, desktop, tablet).

---

### 2.10 Video — VideoCard.js

**Localização:** `components/Features/Video/VideoCard.js`

**Arquivos acionados/relacionados:**
- `components/UI/BaseCard.js`
- `components/Performance/LazyIframe.js`

**Resumo:** Card de vídeo com BaseCard e LazyIframe para pré-visualização YouTube. Título e descrição (com line clamp de 3 linhas via CSS inline).

**Ajustes/Melhorias identificados:**
- Estilos inline extensos no card (borderRadius, boxShadow, transition, height, título, descrição) — extrair para CSS Module

---

### 2.11 Video — VideoGallery.js

**Localização:** `components/Features/Video/VideoGallery.js`

**Arquivos acionados/relacionados:**
- `hooks/useApiFetch`, `hooks/useDebounce`
- `components/UI/StateMessages.js` — LoadingMessage, ErrorMessage
- `components/Features/Video/VideoCard.js`
- `components/Features/Video/styles/VideoGallery.module.css`

**Resumo:** Galeria de vídeos com busca (debounce 300ms), ordenação (recent/oldest/alpha/Z-A), paginação. Extração de dados via `responseData?.data` e `responseData?.pagination`.

**Melhoria identificada:**
- Lógica de paginação/adaptação de resposta duplicada com MusicGallery

---

### 2.12 Video — VideoGallery.module.css

**Localização:** `components/Features/Video/styles/VideoGallery.module.css`

CSS Module para VideoGallery. Define galleryContainer, search styles, galleryGrid, noResults, pagination. Similar em estrutura ao MusicGallery.module.css.

---

### 2.13 Products — ProductCard.js

**Localização:** `components/Features/Products/ProductCard.js`

**Arquivos acionados/relacionados:**
- `react`, `memo`, `useState`, `useEffect`, `useRef`
- `lib/api/utils` — parseImages
- `components/UI/BaseCard.js`
- `components/Features/Products/styles/ProductCard.module.css`

**Resumo:** Card de produto com memo. Exibe imagem com lightbox (navigação entre múltiplas imagens), nome, descrição (line clamp 3), preço e link de compra (Mercado Livre). Suporte a Schema.org (Product + Offer).

**Ajustes/Melhorias identificados:**
- `React.memo` pode ser anulado — `cardMedia` recriado a cada render (objeto novo)
- Lightbox sem focus trap completo (Tab não cicla entre elementos)
- `aria-hidden` no `#__next` pode não restaurar corretamente se múltiplos lightboxes/menus estiverem abertos

---

### 2.14 Products — ProductList.js

**Localização:** `components/Features/Products/ProductList.js`

**Arquivos acionados/relacionados:**
- `hooks/useApiFetch`, `hooks/useDebounce`
- `components/Features/Products/ProductCard.js`
- `components/Features/Products/styles.js` — inputStyle, buttonBaseStyle
- `components/Features/Products/styles/ProductList.module.css`
- `components/UI/StateMessages.js` — ErrorMessage, LoadingMessage, EmptyMessage
- `components/UI/Spinner.js`

**Resumo:** Listagem de produtos com busca, filtros de preço (min/max), paginação (12 itens/page), ordenação por position/ID. Botão "Limpar filtros" com contador de filtros ativos. Loading overlay para troca de página.

**Ajustes/Melhorias identificados:**
- Estilos inline extensos no container de filtros, input de busca, botões de paginação — grande parte já extraída para ProductList.module.css (item 7.4 resolvido)
- `React.memo` em ProductCard pode ser anulado (ver item 2.13)

---

### 2.15 Products — styles.js

**Localização:** `components/Features/Products/styles.js`

**Resumo:** Estilos compartilhados do módulo Products. Exporta `inputStyle` (com validação de paddingLeft) e `buttonBaseStyle` (estilo base de botões).

---

### 2.16 Products — ProductCard.module.css

**Localização:** `components/Features/Products/styles/ProductCard.module.css`

CSS Module para ProductCard. Define cardMedia, imageLoading, productImage, noImage, navButtons, imageCounter, productName, productDescription, productPrice, linksContainer, link buttons, lightbox, lightboxImage, lightboxCloseButton, lightboxNavButton, focus-visible styles.

---

### 2.17 Products — ProductList.module.css

**Localização:** `components/Features/Products/styles/ProductList.module.css`

CSS Module para ProductList (hover/foco dos botões). Substitui handlers inline de hover/foco (item 7.4 resolvido). Define filterButton, pageButton, pageButtonActive.

---

### 2.18 Testimonials — index.js

**Localização:** `components/Features/Testimonials/index.js`

**Arquivos acionados/relacionados:**
- `hooks/useApiFetch`, `hooks/useDebounce`
- `components/Features/Testimonials/Testimonials.module.css`

**Resumo:** Carrossel de "Dicas do Dia" com busca via API `/api/dicas`. Auto-refresh de scroll ao redimensionar janela. Oculta seção quando não há dicas (sem fallback estático — item 2.5.3 resolvido).

**Ajustes/Melhorias identificados:**
- `useEffect` de resize sem verificação de montagem — adiciona listener em montagem e remove na limpeza, mas o handleScroll é chamado imediatamente no useEffect (pode causar issue se ref null)
- Carrossel sem `aria-live="polite"` para anunciar mudanças
- Fallback estático removido (conteúdo apenas da API)

---

### 2.19 Testimonials — Testimonials.module.css

**Localização:** `components/Features/Testimonials/Testimonials.module.css`

CSS Module para Testimonials. Define testimonials-section, header, title, subtitle, dicas-container, grid, carousel, dica-card, dica-content, dica-author, dica-name, pagination, pag-btn, nav-button, left, right. Responsive até 1240px.

---

## 3. Layout

### 3.1 Container.js

**Localização:** `components/Layout/Container.js`

**Arquivos acionados/relacionados:**
- `components/Layout/Container.module.css`
- `components/Layout/index.js` — re-exportação

**Resumo:** Componente de container centralizado com max-width. Suporta tamanhos (sm/md/lg/xl/2xl/full), centralização, fluido, padding customizado (none/sm/md/lg), renderização como elemento HTML via prop `as`. Subcomponentes: `Container.Section` (section) e `Container.Article` (article).

---

### 3.2 Container.module.css

**Localização:** `components/Layout/Container.module.css`

CSS Module para Container. Define container base, sizes (sm/md/lg/xl/2xl/full), centered, fluid, padding personalizado (paddingNone/paddingSm/paddingMd/paddingLg), responsive padding (media queries 640px, 1024px), section (padding-top/bottom responsivo), article (max-width 768px, padding responsivo).

---

### 3.3 Grid.js

**Localização:** `components/Layout/Grid.js`

**Arquivos acionados/relacionados:**
- `components/Layout/Grid.module.css`
- `components/Layout/index.js` — re-exportação

**Resumo:** Sistema de grid flexível com colunas (1-12), gaps (gap, rowGap, columnGap), alinhamento (align, justify), responsividade via CSS custom properties (`--cols-*`). Subcomponentes: `Grid.Item` (span, start, rowSpan), `Grid.Auto` (auto-fit minmax), `Grid.Responsive` (breakpoints CSS).

**Ajustes/Melhorias identificados:**
- Export named + default causa confusão — o default export é Grid, mas o index.js faz re-exportações named e default
- `getColsValue` chamado múltiplas vezes por render (5 chamadas no Grid principal + 5 no Grid.Responsive) — poderia ser memoizado

---

### 3.4 Grid.module.css

**Localização:** `components/Layout/Grid.module.css`

CSS Module para Grid. Define grid base, cols1-12, gaps (gapNone até gap2xl), rowGap, columnGap, alignItems, justifyItems, item spans (span1-12), column start (start1-12), rowSpan1-6, auto grid, responsive grid com media queries (640px, 768px, 1024px, 1280px), item base.

---

### 3.5 Sidebar.js

**Localização:** `components/Layout/Sidebar.js`

**Arquivos acionados/relacionados:**
- `components/Layout/Sidebar.module.css`
- `components/Layout/index.js` — re-exportação

**Resumo:** Sidebar colapsável com posição left/right, larguras (sm/md/lg), persistência de estado em localStorage (com debounce 300ms), overlay mobile, toggle button. Subcomponentes: `Sidebar.Nav`, `Sidebar.NavItem` (link com icon, label, badge), `Sidebar.Section` (título + conteúdo), `Sidebar.Header`, `Sidebar.Footer`.

**Ajustes/Melhorias identificados:**
- Persistência localStorage com debounce pode causar escrita excessiva (a cada mudança de collapsed)
- Overlay mobile sem `role="presentation"` — sugerido para maior semântica
- `Sidebar.NavItem` renderiza `<a>` sem `href` quando não fornecido — pode quebrar navegação por teclado

---

### 3.6 Sidebar.module.css

**Localização:** `components/Layout/Sidebar.module.css`

CSS Module para Sidebar. Define container (flex, min-height 100vh), left/right, sidebar (fixed, transition width/transform), widths (sm/md/lg com collapsed), sidebarContent, collapseButton, main (margin dinâmico via CSS var), nav/navegação, navItem/navItemActive, navIcon/navLabel/navBadge, sections, header/footer, mobileToggle, overlay, mobile styles (max-width 1024px), print styles.

---

### 3.7 Stack.js

**Localização:** `components/Layout/Stack.js`

**Arquivos acionados/relacionados:**
- `components/Layout/Stack.module.css`
- `components/Layout/index.js` — re-exportação
- `prop-types`

**Resumo:** Componente para empilhamento vertical/horizontal. Direções: vertical, horizontal, row, column. Spacing via gap (none/xs/sm/md/lg/xl/2xl). Alias `gap` para `spacing` (spacing tem prioridade). Alinhamento, justify, wrap, inline, responsive. Subcomponentes: `Stack.Item` (grow, shrink, align), `Stack.Divider` (role="separator"), `Stack.Spacer`, `Stack.VStack`, `Stack.HStack`.

**Ajustes/Melhorias identificados:**
- Alias `gap` para `spacing` adiciona complexidade desnecessária — dois props para mesma funcionalidade

---

### 3.8 Stack.module.css

**Localização:** `components/Layout/Stack.module.css`

CSS Module para Stack. Define stack base (display flex, gap via CSS var), direction (column/row), display (inline-flex), spacing (via --stack-gap), align, justify, wrap, item (min-width/height 0), grow, shrink, itemAlign, spacer, divider, responsive (row vira column em mobile max-width 768px).

---

### 3.9 Layout/index.js

**Localização:** `components/Layout/index.js`

**Resumo:** Barrel file de exportações do Layout. Exporta Container, Grid, Stack, Sidebar como named exports e também como default exports (ContainerDefault, GridDefault, StackDefault, SidebarDefault). Exportações duplicadas (named + default) podem causar confusão.

---

## 4. Performance

### 4.1 CriticalCSS.js

**Localização:** `components/Performance/CriticalCSS.js`

**Arquivos acionados/relacionados:**
- `components/Performance/styles/criticalCSSRaw.js` — CSS crítico como string

**Resumo:** Componente para inline de CSS crítico via `<style>` tag. Aceita `css` prop ou usa `criticalStyles` do criticalCSSRaw.js. Exporta `extractCriticalCSS()` (helper de compatibilidade) e `removeCriticalCSS()` (remove CSS crítico após carregamento do CSS principal, com fallback de emergência se CSS principal falhar).

---

### 4.2 ImageOptimized.js

**Localização:** `components/Performance/ImageOptimized.js`

**Arquivos acionados/relacionados:**
- `next/image`
- `components/Performance/styles/ImageOptimized.module.css`

**Resumo:** Wrapper otimizado para next/image com: fallback de imagem em caso de erro, placeholder (blur/empty/color), skeleton loader enquanto carrega, aspect ratio style para evitar CLS, suporte a critical (priority) e loading strategy (lazy/eager/auto).

**Ajustes/Melhorias identificados:**
- Skeleton como div separada — usar `::before` CSS seria mais eficiente

---

### 4.3 LazyIframe.js

**Localização:** `components/Performance/LazyIframe.js`

**Arquivos acionados/relacionados:**
- `lib/media/youtube` — extractYoutubeId

**Resumo:** Componente para lazy loading de iframes (YouTube, Spotify, genérico) com: IntersectionObserver para detecção de visibilidade, fila global de carregamento (máx 2 simultâneos), thumbnail automática para YouTube (hqdefault), placeholder clicável com acessibilidade (role="button", tabIndex, aria-label, teclado Enter/Espaço).

**Ajustes/Melhorias identificadas:**
- Placeholder iframe com `aria-label` confuso (regex remove caracteres especiais dos emoticons)
- Iframe com `loading="lazy"` redundante com IntersectionObserver (o iframe só é montado quando canRender=true)

---

### 4.4 PreloadResources.js

**Localização:** `components/Performance/PreloadResources.js`

**Resumo:** Componente para preconnect e preload de recursos críticos (fonts, images, scripts, styles, domains). Exporta `getCriticalResources()` helper para definir recursos baseado no tipo de página (home/blog/musicas/videos) com fallbacks hardcoded.

**Ajustes/Melhorias identificadas:**
- Domínios padrão hardcoded — mover para config
- `getCriticalResources` com imagens hardcodeadas (`/hero-image.jpg`, `/blog-hero.jpg`, etc.) que podem não existir

---

### 4.5 Performance/index.js

**Localização:** `components/Performance/index.js`

**Resumo:** Barrel file. Exporta ImageOptimized, LazyIframe, PreloadResources (com getCriticalResources), CriticalCSS (com extractCriticalCSS, removeCriticalCSS).

---

### 4.6 Performance/styles/criticalCSSRaw.js

**Localização:** `components/Performance/styles/criticalCSSRaw.js`

**Resumo:** CSS crítico como string JavaScript. CSS inline para above-the-fold: reset básico, previne FOIT/FOUT, layout crítico, container principal, previne CLS em imagens, skip link para acessibilidade, loading states (skeleton animation), reduced motion. Arquivo separado para evitar conflitos com Turbopack.

---

### 4.7 Performance/styles/ImageOptimized.module.css

**Localização:** `components/Performance/styles/ImageOptimized.module.css`

CSS Module para ImageOptimized. Define keyframe pulse e skeletonLoader (background-color #f0f0f0 com animação pulse).

---

## 5. SEO

### 5.1 SEOHead.js

**Localização:** `components/SEO/Head.js`

**Arquivos acionados/relacionados:**
- `next/head`
- `next/router` — useRouter, asPath
- `lib/seo/config` — siteConfig

**Resumo:** Componente completo para meta tags SEO. Gera: title, description, keywords, canonical URL (normalizado, sem trailing slash), robots, theme-color, viewport, Open Graph completo (type, url, title, description, image, image:width/height, site_name, locale, article meta), Twitter Cards (summary_large_image, site, creator, title, description, image, article labels), favicons, Apple meta tags, format detection, geo tags. Suporta children para meta tags customizadas.

**Ajustes/Melhorias identificadas:**
- `router.asPath` em SEOHead pode causar hidratação incorreta SSR
- `router.asPath` usado sem `useMemo` — recalculado a cada render

---

### 5.2 SEO/index.js

**Localização:** `components/SEO/index.js`

**Resumo:** Barrel file do módulo SEO. Exporta SEOHead (default + named), todos os schemas (OrganizationSchema, WebsiteSchema, ArticleSchema, BreadcrumbSchema, MusicSchema, VideoSchema), e re-exporta siteConfig, getCanonicalUrl, getImageUrl do config.

---

### 5.3 StructuredData/StructuredDataBase.js

**Localização:** `components/SEO/StructuredData/StructuredDataBase.js`

**Arquivos acionados/relacionados:**
- `lib/seo/config` — sanitizeJsonLd

**Resumo:** Componente base para StructuredData. Renderiza `<script type="application/ld+json">` com JSON-LD sanitizado. Centraliza o padrão de renderização JSX e os imports do config.

---

### 5.4 StructuredData/WebsiteSchema.js

**Localização:** `components/SEO/StructuredData/WebsiteSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteConfig, siteUrl

**Resumo:** Schema.org WebSite com: name, description, url, potentialAction (SearchAction com EntryPoint e query-input), inLanguage, isAccessibleForFree, about (Thing: Fé Cristã).

---

### 5.5 StructuredData/ArticleSchema.js

**Localização:** `components/SEO/StructuredData/ArticleSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteConfig, formatSchemaDate, getImageUrl

**Resumo:** Schema.org Article + BlogPosting com: headline, description, image (ImageObject 1200x630), author (Person), publisher (Organization com logo 512x512), datePublished, dateModified, mainEntityOfPage, url, articleSection, keywords, inLanguage, isAccessibleForFree, wordCount (opcional), articleBody (opcional).

---

### 5.6 StructuredData/BreadcrumbSchema.js

**Localização:** `components/SEO/StructuredData/BreadcrumbSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteUrl

**Resumo:** Schema.org BreadcrumbList. Adiciona home automaticamente se o primeiro item não for a home. Gera URLs absolutas. Position gerado automaticamente se não fornecido.

---

### 5.7 StructuredData/MusicSchema.js

**Localização:** `components/SEO/StructuredData/MusicSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteConfig, formatSchemaDate, getImageUrl

**Resumo:** Schema.org MusicRecording com: name, byArtist (MusicGroup), inAlbum (opcional), duration, genre (default: Gospel Cristão), image, url, audio (AudioObject, opcional), datePublished (opcional), lyrics (opcional, via recordingOf MusicComposition), description, isAccessibleForFree, publisher, sameAs (Spotify, YouTube).

---

### 5.8 StructuredData/VideoSchema.js

**Localização:** `components/SEO/StructuredData/VideoSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteConfig, formatSchemaDate, getImageUrl

**Resumo:** Schema.org VideoObject com: name, description, thumbnailUrl, url, embedUrl/contentUrl (opcionais), duration, uploadDate/datePublished (opcionais), author (Person), publisher (Organization com logo), keywords, inLanguage, isAccessibleForFree, interactionStatistic (WatchAction, opcional), identifier/youtubeId (opcional), transcript (opcional), videoQuality: HD, about (Thing: Conteúdo Cristão).

---

### 5.9 StructuredData/OrganizationSchema.js

**Localização:** `components/SEO/StructuredData/OrganizationSchema.js`

**Arquivos acionados/relacionados:**
- `components/SEO/StructuredData/StructuredDataBase.js`
- `lib/seo/config` — siteConfig, siteUrl

**Resumo:** Schema.org Organization com: name, description, url, logo (ImageObject 512x512), sameAs, contactPoint, additionalType: NGO, knowsAbout (Fé Cristã, Espiritualidade, Reflexões Bíblicas, Ensinamentos Cristãos, Vida com Deus).

---

### 5.10 StructuredData/index.js

**Localização:** `components/SEO/StructuredData/index.js`

**Resumo:** Barrel file. Exporta todos os schemas como default exports (OrganizationSchema, WebsiteSchema, ArticleSchema, BreadcrumbSchema, MusicSchema, VideoSchema).

---

## 6. UI (Design System)

### 6.1 Alert.js

**Localização:** `components/UI/Alert.js`

**Arquivos acionados/relacionados:**
- `components/UI/Alert.module.css`
- `components/UI/icons.js` — defaultIcons

**Resumo:** Componente de alerta com status (info/success/warning/error), variant (subtle/solid/left-accent/top-accent), título, children, icon custom, closable. Role dinâmico: `alertdialog` + `aria-modal` para alertas críticos (error + closable), `alert` + `aria-live="polite"` para demais casos. Focus management para alertdialog.

---

### 6.2 BaseCard.js

**Localização:** `components/UI/BaseCard.js`

**Arquivos acionados/relacionados:**
- `components/UI/BaseCard.module.css`
- `prop-types`

**Resumo:** Componente de card reutilizável do Design System. Extraído da duplicidade entre ProductCard, MusicCard, VideoCard, PostCard. Suporta: media slot, header, footer, variant (default/outlined/filled/elevated), size (sm/md/lg), hoverable (elevação), clickable (cursor pointer + role button + teclado), fullWidth, Schema.org props (itemScope, itemType), onClick. Subcomponentes: `BaseCard.Header`, `BaseCard.Footer`.

---

### 6.3 Button.js

**Localização:** `components/UI/Button.js`

**Arquivos acionados/relacionados:**
- `components/UI/Button.module.css`
- `components/UI/Spinner.js`

**Resumo:** Componente de botão com variant (primary/secondary/ghost/danger/success/warning), size (sm/md/lg/xl), fullWidth, disabled, loading, leftIcon/rightIcon, ripple (useReducer + spans no DOM), className. ARIA: aria-disabled, aria-busy.

**Melhoria identificada:**
- Ripple com `useReducer` + spans no DOM — substituir por CSS animation seria mais performant

---

### 6.4 Input.js

**Localização:** `components/UI/Input.js`

**Arquivos acionados/relacionados:**
- `components/UI/Input.module.css`

**Resumo:** Componente base de input com forwardRef. size (sm/md/lg), variant (default/filled/flushed), error, errorMessage, leftAddon, rightAddon, label, required, helperText, clearable (botão X), onClear. Generated ID via useId. ARIA: aria-invalid, aria-describedby.

---

### 6.5 Modal.js

**Localização:** `components/UI/Modal.js`

**Arquivos acionados/relacionados:**
- `components/UI/Modal.module.css`
- `react-dom` — createPortal

**Resumo:** Componente de modal com: portal para document.body, focus trap (setTimeout 10ms), gerenciamento de teclado (ESC, Tab cycle), scroll lock via classe CSS (modalCount para múltiplos modais), overlay click, close button, size (sm/md/lg/xl/full), title/description (aria-labelledby/aria-describedby), footer. Subcomponente: `Modal.Footer`.

**Ajustes/Melhorias identificadas:**
- Focus trap com `setTimeout(10ms)` — usar `requestAnimationFrame` seria mais adequado
- `createPortal` condicional em SSR pode causar problemas (`typeof window !== 'undefined' && document.body`)

---

### 6.6 Select.js

**Localização:** `components/UI/Select.js`

**Arquivos acionados/relacionados:**
- `components/UI/Select.module.css`

**Resumo:** Componente de select com forwardRef. Modos: native (select element) e custom (dropdown estilizado, ativado por searchable ou clearable). Custom mode: combobox role, aria-expanded, aria-haspopup, aria-activedescendant ausente (problema de acessibilidade), listbox role, option role, aria-selected. Suporta: searchable (com debounce 300ms), clearable (botão X), placeholder, label, error, helperText.

**Ajustes/Melhorias identificadas:**
- Botão de limpar em modo custom com `aria-hidden={true}` mas `tabIndex={-1}` — inacessível por teclado (já corrigido: aria-hidden removido, mantido aria-label)
- Dropdown sem `aria-activedescendant` para navegação por teclado entre opções
- Label em modo custom: o `<div role="combobox">` recebe `id={selectId}` (corrigido — antes era id inexistente)

---

### 6.7 Spinner.js

**Localização:** `components/UI/Spinner.js`

**Arquivos acionados/relacionados:**
- `components/UI/Spinner.module.css`

**Resumo:** Componente de loading com size (xs/sm/md/lg/xl), color (primary/secondary/white/dark), variant (border/grow/dots), label (aria-label), centered. Subcomponentes: `Spinner.Container`, `Spinner.Overlay`.

---

### 6.8 StateMessages.js

**Localização:** `components/UI/StateMessages.js`

**Resumo:** Componentes padronizados para estados: ErrorMessage (variante error com emoji ❌), EmptyMessage (variante empty), LoadingMessage (spinner dots + texto). Exporta named exports e default object.

**Ajuste identificado:**
- Usa estilos inline para containerStyle — extrair para CSS Module

---

### 6.9 TextArea.js

**Localização:** `components/UI/TextArea.js`

**Arquivos acionados/relacionados:**
- `components/UI/TextArea.module.css`

**Resumo:** Componente base de textarea com forwardRef. rows, minRows, maxRows, resize, autoResize (com calculateHeight dinâmico), size (sm/md/lg), error, errorMessage, label, required, helperText, maxLength, showCount, blockOnLimit (bloqueia digitação ao atingir limite). Counter de caracteres. ARIA: aria-invalid, aria-describedby.

---

### 6.10 Toast.js

**Localização:** `components/UI/Toast.js`

**Arquivos acionados/relacionados:**
- `components/UI/Toast.module.css`
- `components/UI/icons.js` — defaultIcons

**Resumo:** Componente de notificação temporária com status (info/success/warning/error), title, description, isOpen, onClose, duration (default 5000ms), isClosable, position (top-right/bottom-right/top-left/bottom-left/top-center/bottom-center), progress bar. Animações de entrada/saída por posição. Subcomponentes: `Toast.Container`, `useToast` hook.

**Ajustes/Melhorias identificadas:**
- Hook `useToast` e componente Toast no mesmo arquivo — separar para melhor organização
- `generateId` com fallback `Math.random()` inseguro para SSR (pode gerar IDs duplicados em SSR)

---

### 6.11 icons.js

**Localização:** `components/UI/icons.js`

**Resumo:** Ícones SVG padrão (info, success, warning, error) extraídos de Alert.js para evitar duplicidade. Exportado como `defaultIcons` e re-exportado de Alert.js e Toast.js.

---

### 6.12 UI/index.js

**Localização:** `components/UI/index.js`

**Resumo:** Barrel file do Design System. Exporta Button, Input, TextArea, Select, BaseCard (com alias Card para compatibilidade), Modal, Spinner, Badge, Alert (com defaultIcons), Toast (com useToast), Icons (defaultIcons). Também exporta default exports com sufixo Default para compatibilidade.

---

### 6.13 UI/CSS Modules

- `Alert.module.css` — alert styles por status e variant
- `Badge.module.css` — badge styles
- `BaseCard.module.css` — card styles (card, variant, media, header, content, footer, hoverable, interactive, clickable, fullWidth, sizes)
- `Button.module.css` — button styles (button, variant, size, fullWidth, loading, disabled, ripple, spinner, leftIcon, rightIcon, content)
- `Input.module.css` — input styles (wrapper, size, hasError, input, variant, hasLeftAddon, hasClearable, hasRightAddon, label, required, inputWrapper, leftAddon, rightAddon, clearButton, errorMessage, helperText)
- `Modal.module.css` — modal styles (overlay, modal, sizes, header, title, closeButton, body, description, footer, footerContent)
- `Select.module.css` — select styles (wrapper, size, hasError, disabled, isOpen, selectWrapper, select, arrow, arrowOpen, selectText, placeholder, searchInput, clearButton, dropdown, option, optionSelected, optionDisabled, noOptions, label, required, errorMessage, helperText)
- `Spinner.module.css` — spinner styles (spinner, variants, sizes, colors, centered, container, overlay)
- `TextArea.module.css` — textarea styles (wrapper, size, hasError, noResize, label, required, textarea, footer, errorMessage, helperText, counter, overLimit)
- `Toast.module.css` — toast styles (toast, status, position, exit animations, icon, content, srOnly, title, description, closeButton, progress, progressBar, container)

---

## 7. Pontos de Atenção Transversais

### 7.1 Duplicidade — Tratamento de sessão expirada (401)
Tratamento de sessão expirada (401) repetido em múltiplos arquivos Admin:
- `AdminAudit.js` — usa `useUnauthorized(router, 500)`
- `AdminUsersTab.js` — RoleSelectField usa `useUnauthorized(router)` no fetch de roles
- `AdminDashboard.js` — não trata 401 especificamente (apenas erro genérico)
- `IntegrityCheck.js` — `window.location.reload()` direto
- `RateLimitViewer.js` — `window.location.reload()` direto (em fetchData e fetchAuditLogs)
- `AdminRolesTab.js` — não faz fetch direto (usa AdminCrudBase)

### 7.2 Duplicidade — Fetch com verificação de Content-Type
Verificação de Content-Type repetido em:
- `AdminAudit.js` — checa `application/json`
- `AdminDashboard.js` — checa `application/json`
- `IntegrityCheck.js` — checa `application/json`
- `AdminUsersTab.js` — RoleSelectField checa `application/json`
- `RateLimitViewer.js` — **não faz** verificação de Content-Type

### 7.3 Duplicidade — Estrutura Gallery (busca + ordenação + paginação)
Entre MusicGallery.js e VideoGallery.js:
- `useDebounce` com 300ms
- `useApiFetch` com `deps: [currentPage, debouncedSearchTerm, sortBy]`
- Extração de dados com fallback (Array.isArray, .data, .pagination)
- UI de busca, ordenação, paginação, estado vazio
- Diferenças: MusicGallery usa `getPaginationData` para extrair de formatos variados; VideoGallery usa `responseData?.pagination?.totalPages`

### 7.4 Duplicidade — Modal de confirmação
Modal de confirmação quase idêntico em:
- `BackupManager.js` — modal "Confirmar Backup Manual"
- `CacheManager.js` — modal "Confirmar Limpeza de Cache"
Ambos usam `Modal` da UI com estrutura similar de botões (Cancelar + Confirmar).

### 7.5 Manutenção — Estilos inline misturados com CSS Module
Vários componentes usam estilos inline extensos:
- Admin: AdminAudit.js, AdminDashboard.js, IntegrityCheck.js, RateLimitViewer.js, BackupManager.js, CacheManager.js
- Features: ProductList.js (em parte), VideoCard.js, BlogSection.js (link "Ver todas")
- UI: StateMessages.js

### 7.6 Acessibilidade — Tabelas sem `<caption>`
- `AdminAudit.js` — tabela sem `aria-label` (usa apenas estilo inline)
- `CrudTable.js` — tabela com `aria-label={title}` (melhor que Audit, mas sem caption)

### 7.7 Acessibilidade — Input de busca sem `aria-label`
- `AdminCrudBase.js` — input de busca com apenas placeholder
- `AdminAudit.js` — input de busca com apenas placeholder

### 7.8 Manutenção — Barrel files incompletos
- `Admin/index.js` — não exporta AdminDashboard, AdminDicas, AdminAudit, AdminUsers, AdminUsersTab, AdminRolesTab, Managers, Tools, withAdminAuth
- `Layout/index.js` — exportações named + default causam confusão

### 7.9 Manutenção — StructuredData reimporta config
Cada schema (WebsiteSchema, ArticleSchema, MusicSchema, VideoSchema, OrganizationSchema, BreadcrumbSchema) reimporta `siteConfig` e `siteUrl` de `StructuredDataBase` ou `lib/seo/config`, embora `StructuredDataBase` já os reexporte.

---

## 8. Implementações Aplicadas

### `components/Features/Testimonials/index.js` — remoção do fallback estático (`fallbackData`)

**Descrição:** Item 2.5.3 resolvido: o array `fallbackData` (conteúdo fictício hardcoded) foi removido do componente. A seção "Dicas do Dia" passou a exibir exclusivamente os dados retornados pela API `/api/dicas` e a ocultar-se por completo quando não há dicas cadastradas (retorno `null`). Em `AdminDicas.js`, o `placeholder` do campo "Nome da Dica" foi ajustado de `Ex: Palavra do dia` para `Ex: Mensagem de fé`, eliminando resíduo do conteúdo fictício no painel.

---

### `components/Admin/AdminCrudBase.js` — correção do fluxo de confirmação de exclusão (confirmação em 1 clique)

**Descrição:** O modal de confirmação de exclusão passou a ser aberto via `onConfirmDelete(id)` (callback injetado no `useAdminCrud`); o intermediário `handleDeleteWithConfirm` foi removido e a tabela passa a chamar `handleDelete` diretamente. No clique em "Sim, excluir", `handleConfirmDelete` apenas resolve a Promise com `true` e fecha o modal explicitamente — antes, o primeiro clique não resolvia Promise alguma (ela ainda não existia) e o segundo chamava `handleDelete` novamente, criando nova Promise pendente. Removido o `useEffect` de `loading` que fechava o modal e descartava a referência de resolução.

---

### `components/Admin/Tools/RateLimitViewer.js` — tratamento de sessão expirada (401) na aba de auditoria

**Descrição:** `fetchAuditLogs` passou a tratar `response.status === 401` com `window.location.reload()` e `return`, replicando o padrão já existente em `fetchData` (bloqueados/whitelist). Com isso, a expiração de sessão na aba de Logs de Auditoria também recarrega a página para o login, em vez de seguir para o `throw` e cair no `catch` com log de erro. Elimina a inconsistência interna do componente — a auditoria era a única rota de dados sem esse tratamento — e reduz parcialmente o ponto transversal 1 (tratamento de 401 repetido entre os componentes Admin).

---

### `components/Features/Products/ProductList.js` — migração de handlers inline de hover/foco a CSS Module

**Descrição:** Item 7.4 resolvido para este componente: os 8 handlers inline (`onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur`) que manipulavam `e.currentTarget.style` — 4 no botão "Limpar filtros" e 4 nos botões de página — foram removidos e substituídos por pseudo-classes CSS no novo `components/Features/Products/styles/ProductList.module.css` (`.filterButton`, `.pageButton`, `.pageButtonActive`). A classe condicional `pageNum === currentPage` preserva o fundo `--color-primary-50` da página ativa e `:hover:not(:disabled)` reproduz a guarda original `pageNum !== currentPage && !pageLoading`. Reduzida a quantidade de callbacks do componente e eliminada a manipulação imperativa de estilos.

---

### `components/UI/Select.js` — correções de acessibilidade no modo custom (label órfã e botão de limpar inacessível)

**Descrição:** O `<div role="combobox">` do modo custom passou a receber `id={selectId}` — antes, o label (com `htmlFor={selectId}`) apontava para um id inexistente nesse modo, deixando o combobox sem accessible name. Foi também removido o `aria-hidden={true}` do botão de limpar, mantendo o `aria-label="Limpar seleção"` — o botão passa a ser anunciável por leitores de tela (item 8 da seção 6 resolvido; o item 9 sobre `aria-activedescendant` permanece pendente). Nenhuma prop ou comportamento público foi alterado.

---

> 📝 Este documento é analítico — as seções 1–7 servem como guia para futuras refatorações e correções; a seção "Implementações Aplicadas" registra as implementações realizadas após a elaboração deste relatório.
