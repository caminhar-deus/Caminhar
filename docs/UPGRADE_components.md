# Análise de Melhorias - `/components`

> **Data:** 18/05/2026 (atualizado)
> **Objetivo:** Reportar correções, melhorias, problemas de performance e duplicidade de código identificados na análise dos componentes, com o status atual de cada item.

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

### 1.1 AdminCrudBase.js

**Localização:** `components/Admin/AdminCrudBase.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | A lógica de exportação CSV em `AdminCrudBase.js` (linhas 133-171) é **quase idêntica** à encontrada em `AdminAudit.js` (linhas 61-94). Ambos geram CSV com BOM, criam Blob, link temporário e download. Extraído para `lib/csvExport.js` | ✅ **RESOLVIDO** |
| 2 | **Duplicidade** | O CSS de animação skeleton (`@keyframes skeleton-pulse` e classe `.skeleton-box`) está duplicado em `AdminCrudBase.js` (linhas 326-335) e `AdminAudit.js` (linhas 98-108). Centralizado no `Admin.module.css` com classe `.skeletonBox`. | ✅ **RESOLVIDO** |
| 3 | **Performance** | O toggle de status (`handleToggleBoolean`, linha 174) envia o objeto `item` completo no body da requisição PUT, incluindo campos desnecessários. Poderia enviar apenas `{ id, [key]: newValue }`. — *Já enviava apenas { id, [key] }.* | ✅ **JÁ RESOLVIDO** |
| 4 | **Manutenção** | A função `handleToggleBoolean` (linha 174) faz fetch direto para o endpoint, ignorando o hook `useAdminCrud` que já encapsula chamadas à API. Agora delega ao `toggleField` do hook `useAdminCrud`. | ✅ **RESOLVIDO** |
| 5 | **PropTypes** | O campo `apiEndpoint` não está documentado como PropTypes.string.isRequired no JSDoc, embora esteja nas PropTypes. | ⬜️ **MANTIDO** — já estava correto, adicionados parâmetros faltantes (`exportable`, `showItemCount`, `itemNameSingular`, `itemNamePlural`, `readOnly`, `onReorder`) |
| 6 | **Segurança** | A validação customizada (`validate`, linha 211) é chamada sem try/catch em `validateForm()`. Adicionado try/catch envolvendo `validate(formData)`. | ✅ **RESOLVIDO** |
| 7 | **Acessibilidade** | O botão de ordenação Drag & Drop não possui `aria-grabbed` ou descrição adequada para leitores de tela. Adicionados `aria-grabbed`, `aria-roledescription`, `role="button"` e `tabIndex`. | ✅ **RESOLVIDO** |
| 8 | **Manutenção** | Caminhos de import relativos (`../../hooks/useAdminCrud`, `../../lib/csvExport`) substituídos pelo alias `@` (`@/hooks/useAdminCrud`, `@/lib/csvExport`) para consistência com o padrão do projeto. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.2 AdminDashboard.js

**Localização:** `components/Admin/AdminDashboard.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | O fetch de stats (`/api/admin/stats`) não possui cache ou debounce. Em toda montagem do componente, uma requisição é feita. Se o dashboard for remontado, há chamada desnecessária. Adicionado cache em `sessionStorage` com TTL de 30s. | ✅ **RESOLVIDO** |
| 2 | **Resiliência** | Não há tratamento para resposta não-JSON da API (ex: erro 500 HTML). Verifica `Content-Type` antes de fazer parsing JSON e exibe mensagem amigável. | ✅ **RESOLVIDO** |
| 3 | **Manutenção** | O array `statItems` (linha 42) é recriado a cada renderização. Poderia ser memoizado com `useMemo`. Envolvidos `allStatItems`, `statItems` e `maxVal` em `useMemo`. | ✅ **RESOLVIDO** |

### 1.3 AdminAudit.js

**Localização:** `components/Admin/AdminAudit.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | Lógica de exportação CSV duplicada com `AdminCrudBase` (ver item 1.1 #1). Extraído para `lib/csvExport.js` | ✅ **RESOLVIDO** |
| 2 | **Performance** | O filtro local (`filteredLogs`, linha 54) é executado a cada renderização, mesmo quando `logs` ou `search` não mudam. Envolto em `useMemo`. | ✅ **RESOLVIDO** |
| 3 | **UX** | O botão "Atualizar" não desabilita durante o loading, permitindo múltiplos cliques e múltiplas requisições simultâneas. Adicionado `disabled={loading}`. | ✅ **RESOLVIDO** |
| 4 | **Tratamento de erro** | Se o servidor retornar status 401 com corpo JSON inválido, o `router.reload()` era chamado mesmo após o `throw`, mas a mensagem de toast podia não aparecer. Agora usa `setTimeout` + `return` para evitar toast duplicado no `.catch`. | ✅ **RESOLVIDO** |
| 5 | **Manutenção** | Caminhos de import relativos (`../../lib/csvExport`, `../../lib/handleUnauthorized`) substituídos pelo alias `@` (`@/lib/csvExport`, `@/lib/handleUnauthorized`) para consistência com o padrão do projeto. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.4 AdminDicas.js

**Localização:** `components/Admin/AdminDicas.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | Componente bem estruturado, sem problemas significativos. Adicionados JSDoc, PropTypes e alias `@` nos imports para alinhamento com padrões do projeto. | ✅ **RESOLVIDO (14/05/2026)** |

### 1.5 AdminMusicas.js

**Localização:** `components/Admin/AdminMusicas.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | A função `handleReorder` (linha 127) é **quase idêntica** em `AdminMusicas.js`, `AdminPosts.js`, `AdminVideos.js` e `AdminProducts.js`. Todos calculam offset, constroem payload e fazem PUT no endpoint. Extraído para `lib/reorder.js` como helper compartilhado `handleReorder(endpoint, items, page, perPage)`. | ✅ **RESOLVIDO (14/05/2026)** |
| 2 | **Duplicidade** | O padrão `renderCustomFormField` com botão "Puxar Dados" (linhas 180-199) se repete em `AdminMusicas.js`, `AdminVideos.js` e `AdminProducts.js`. As únicas diferenças são: endpoint da API, cor do botão e campos preenchidos. Extraído para componente genérico `ExternalDataButton.js` em `Admin/fields/`. | ✅ **RESOLVIDO (14/05/2026)** |
| 3 | **UX** | O botão "Puxar Dados" do Spotify (linha 185) está posicionado com `position: absolute`, que pode sobrepor o label do campo em telas menores. Substituído pelo componente `ExternalDataButton` que usa layout flexbox responsivo. | ✅ **RESOLVIDO (14/05/2026)** |

### 1.6 AdminPosts.js

**Localização:** `components/Admin/AdminPosts.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | `handleReorder` duplicado (idem item 1.5 #1). Extraído para `lib/reorder.js`. | ✅ **RESOLVIDO (14/05/2026)** |
| 2 | **Manutenção** | A função `validatePost` (linha 179) tinha lógica acoplada ao componente. A regra de negócio "post publicado precisa de imagem" foi migrada para `.superRefine()` no schema Zod, e a função `validatePost` removida. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Acessibilidade** | O campo slug editável com geração automática não sinalizava ao usuário que o slug foi gerado. Adicionado `toast.success()` com feedback visual "Slug gerado automaticamente a partir do título", utilizando `useRef` para evitar toasts duplicados. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.7 AdminProducts.js

**Localização:** `components/Admin/AdminProducts.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | `handleReorder` duplicado (idem item 1.5 #1). Extraído para `lib/reorder.js`. `handleReorder` movido para dentro do componente (padronizado). | ✅ **RESOLVIDO (14/05/2026)** |
| 2 | **Duplicidade** | `renderCustomFormField` duplicado (idem item 1.5 #2). Extraído para `ExternalDataButton.js`. | ✅ **RESOLVIDO (14/05/2026)** |
| 3 | **Manutenção** | O endpoint da API de produtos é `/api/products`, enquanto os demais usam `/api/admin/*`. Inconsistência na URL. | ⬜️ **MANTIDO** — a rota `pages/api/products.js` é o endpoint padrão e funcional do Next.js, sem necessidade de mover para `/api/admin/products`. |
| 4 | **Manutenção** | `handleReorder` de Products (linha 130) estava **fora** do componente (export default na linha 146), diferentemente dos outros. Agora está dentro do componente, como os demais. | ✅ **RESOLVIDO (14/05/2026)** |
| 5 | **Manutenção** | O componente `CheckboxWrapper` (linha 21) é definido inline, mas é equivalente funcional ao `ToggleField` já existente em `Admin/fields/ToggleField.js`. Duplicidade de componente. Substituído por `ToggleField` com props `description`, `activeLabel` e `inactiveLabel`. | ✅ **RESOLVIDO (18/05/2026)** |
| 6 | **Performance** | O preço era armazenado como string formatada (`R$ 89,90`) vinda da API do ML. Agora armazenado como valor numérico decimal (`89.90`) e formatado apenas na exibição (coluna `format`). | ✅ **RESOLVIDO (18/05/2026)** |

### 1.8 AdminRolesTab.js

**Localização:** `components/Admin/AdminRolesTab.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | O array `permissionsList` (linha 7) era recriado a cada importação. Extraído para `lib/domain/permissions.js` com `Object.freeze`. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Manutenção** | Estilos inline no `PermissionsSelectField` e na coluna de permissões. Migrados para CSS Modules utilizando classes do `Admin.module.css`. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Manutenção** | Cores hardcoded (`#374151`, `#ef4444`, `#d1d5db`, `#2563eb`, `#e0f2fe`, `#0369a1`, `#bae6fd`) substituídas por CSS Custom Properties (`var(--color-*)`). | ✅ **RESOLVIDO (18/05/2026)** |

### 1.9 AdminUsers.js

**Localização:** `components/Admin/AdminUsers.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Acessibilidade** | O sistema de abas não possuía `role="tablist"`, `role="tab"` ou `aria-selected` nos botões, prejudicando navegação por leitores de tela. Adicionados: `role="tablist"` no container, `role="tab"` e `aria-selected` nos botões, `aria-controls` vinculando ao painel, `role="tabpanel"` e `aria-labelledby` no conteúdo, `tabIndex` para foco via teclado, e navegação por setas (ArrowLeft/ArrowRight). | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Performance** | `AdminUsersTab` e `AdminRolesTab` eram importados estaticamente e renderizados mesmo quando a aba não estava ativa. Substituído por `React.lazy()` + `<Suspense>` com fallback placeholder. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Manutenção** | Estilos inline (display, gap, padding, cores, etc.) substituídos por classes do `Admin.module.css` (`.adminPanel`, `.tabs`, `.tabButton`, `.activeTab`, `.icon`, `.tabPanel`). | ✅ **RESOLVIDO (18/05/2026)** |
| 4 | **Manutenção** | Componente não possuía JSDoc, PropTypes ou `displayName`. Adicionados documentação JSDoc com descrição do componente, PropTypes vazio (componente container sem props) e `displayName`. | ✅ **RESOLVIDO (18/05/2026)** |
| 5 | **UX** | Ícones de aba (`👤`, `🛡️`) mantidos como emoji por simplicidade, mas agora utilizando a classe `.icon` do CSS Module para padronização e com `aria-hidden="true"` para leitores de tela. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.10 AdminUsersTab.js

**Localização:** `components/Admin/AdminUsersTab.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | O `RoleSelectField` (linha 52) faz fetch dos cargos a cada montagem. Se houver múltiplos usuários na página, múltiplas requisições são feitas. Adicionado cache em `sessionStorage` com TTL de 5 minutos, verificando antes de fazer fetch. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | A lógica de verificação de 401 e reload (linhas 60-63) é duplicada em `AdminAudit.js` (linhas 27-29). Extraída para função `handleUnauthorized` em `lib/handleUnauthorized.js` (arquivo separado de módulos cliente, sem dependências de servidor) e utilizada em ambos os componentes. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Acessibilidade** | O `select` customizado (linha 83) não possui `aria-describedby` linkado ao hint. Adicionados `aria-describedby`, `aria-errormessage`, `aria-invalid`, `htmlFor` no label, `role="alert"` no erro e IDs únicos nos spans de hint e erro. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.11 AdminVideos.js

**Localização:** `components/Admin/AdminVideos.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | A regex de extração de ID do YouTube (linha 28) era duplicada em `LazyIframe.js` (linha 84) e `UrlField.js` (linha 39). Criado helper centralizado em `lib/youtube.js` com `extractYoutubeId()` e atualizados os 3 arquivos para usá-lo. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | `handleReorder` duplicado (idem item 1.5 #1). Extraído para `lib/reorder.js`. | ✅ **RESOLVIDO (14/05/2026)** |
| 3 | **Duplicidade** | `renderCustomFormField` duplicado (idem item 1.5 #2). Extraído para `ExternalDataButton.js`. | ✅ **RESOLVIDO (14/05/2026)** |
| 4 | **Performance** | O embed de vídeo na tabela carregava iframe do YouTube já na listagem. Substituído pelo componente `LazyIframe` que carrega via clique (thumbnail + carregamento sob demanda). | ✅ **RESOLVIDO (18/05/2026)** |

### 1.12 withAdminAuth.js

**Localização:** `components/Admin/withAdminAuth.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | O HOC usa `import { useAdminAuth } from '@/hooks'` com alias `@`, mas alguns componentes usam caminhos relativos. Inconsistência. | ✅ **RESOLVIDO (18/05/2026)** — `AdminCrudBase.js` e `AdminAudit.js` atualizados para usar `@` |
| 2 | **Performance** | O componente `LoginForm` é redefinido dentro do escopo do HOC a cada renderização. Poderia ser definido fora. | ✅ **RESOLVIDO** — já estava fora do escopo do HOC |

### 1.13 Fields (Admin)

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | `TextAreaField.js` (Admin/fields) e `TextArea.js` (UI) são funcionalmente equivalentes: ambos têm label, placeholder, required, error, hint, maxLength. Diferenças mínimas (estilo, rows default). Deveriam ser unificados. | ✅ **RESOLVIDO (18/05/2026)** — `TextAreaField.js` agora delega internamente para o componente `TextArea.js` (UI), mantendo a API específica do Admin. |
| 2 | **Duplicidade** | `TextField.js` (Admin/fields) e `Input.js` (UI) também são muito similares. Ambos fornecem input com label, error, hint, required. A versão Admin tem menos funcionalidades (sem addons, sem clearable). | ✅ **RESOLVIDO (18/05/2026)** — `TextField.js` agora delega internamente para o componente `Input.js` (UI), mantendo a API específica do Admin. |
| 3 | **Segurança** | `ImageUploadField.js` (linha 72): usa `alert()` para erros de upload. Em produção, `alert()` bloqueia a UI e não é estilizável. Deveria usar o sistema de toasts. | ✅ **RESOLVIDO (18/05/2026)** — Substituído `alert()` por `toast.error()` do `react-hot-toast`, padrão já utilizado no restante do Admin. |
| 4 | **Manutenção** | O `onUpload` customizado (linhas 42-50) recebe o File, mas o callback não recebe o `uploadType`, limitando a flexibilidade. | ✅ **RESOLVIDO (18/05/2026)** — `onUpload` agora recebe `(file, uploadType)`. |

### 1.14 Managers

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **UX** | `BackupManager.js` (linha 29): usa `confirm()` nativo, que bloqueia a UI. Deveria usar modal confirmação do design system. | ✅ **RESOLVIDO (18/05/2026)** — Substituído `confirm()` por modal `components/UI/Modal.js` com botões Confirmar/Cancelar e estado `showConfirm`. |
| 2 | **UX** | `CacheManager.js` (linha 26): também usa `window.confirm()`. | ✅ **RESOLVIDO (18/05/2026)** — Substituído `window.confirm()` por modal `components/UI/Modal.js` com botões Confirmar/Cancelar e estado `showConfirm`. |
| 3 | **Manutenção** | `CacheManager.js`: o fetch das métricas (linha 12) não aponta `credentials: 'include'` explicitamente, ao contrário dos demais componentes. | ✅ **RESOLVIDO (18/05/2026)** — O fetch GET de métricas já possuía `credentials: 'include'`. Adicionado `credentials: 'include'` no fetch POST de limpeza do cache (era o verdadeiro problema). |

### 1.16 Tools

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | `IntegrityCheck.js` e `RateLimitViewer.js` eram placeholders sem funcionalidade real. Podiam dar falsa impressão de funcionalidade implementada. Ambos agora implementados com funcionalidade real, JSDoc, PropTypes, `displayName`, loading/error/empty/success states e auto-refresh periódico. | ✅ **RESOLVIDO (18/05/2026)** |

### 1.17 Admin.module.css — **RESOLVIDO (18/05/2026)**

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | O CSS (1001 linhas) foi dividido em **7 módulos menores** organizados por domínio, eliminando o arquivo monolítico e facilitando a manutenção. | ✅ **RESOLVIDO** |
| 2 | **Performance** | ~~Algumas classes utilizam `!important` — ver item 1.16 #2.~~ | ✅ **RESOLVIDO** |
| 3 | **Manutenção** | Classes `.formGroup` e `.input` eram definidas duas vezes, causando sobrescrita. Unificadas em módulo específico. | ✅ **RESOLVIDO** |

**O que foi feito (13/05/2026):**
- Todos os valores hardcoded (~80) substituídos por CSS Custom Properties (`var()`)
- Cores padronizadas (`#007bff` → `var(--color-primary-500)`, `#2c3e50` → `var(--color-text-primary)`, etc.)
- Espaçamentos, border-radius, font-size, font-weight, box-shadow e transitions tokenizados
- Seções de Form Styles, Messages, Status/Stats tokenizadas
- Responsivo ajustado para usar tokens de spacing

**O que foi feito (18/05/2026):**
- `styles/Admin.module.css` (1001 linhas) dividido em **7 módulos menores**:
  - `styles/login.module.css` — Login + Header/Navigation (usado por `withAdminAuth.js`)
  - `styles/crud.module.css` — CRUD: tabela, formulário, paginação, status badges, skeleton, botões de ação (usado por `AdminCrudBase.js`, `AdminMusicas.js`)
  - `styles/dashboard.module.css` — Dashboard: stats grid, gráfico (usado por `AdminDashboard.js`)
  - `styles/tabs.module.css` — Abas: tablist, tabButton, activeTab, tabPanel (usado por `AdminUsers.js`)
  - `styles/permissions.module.css` — Permissões: checkbox grid, badges (usado por `AdminRolesTab.js`)
  - `styles/form.module.css` — Campos de formulário: formGroup, input, formHint, saveButton, preview (usado por fields: `ToggleField.js`, `UrlField.js`, `ImageUploadField.js`)
  - `styles/misc.module.css` — Miscelânea: placeholders, mensagens, preview, infoBox, subNavigation, embed, responsivo (usado por `IntegrityCheck.js`, `RateLimitViewer.js`)
- `!important` removido de `.activeSubNavLink` (substituído por `.subNavLink.activeSubNavLink` com especificidade maior)
- Classes `.formGroup` duplicadas unificadas (login usa `login.module.css`, campos de formulário usam `form.module.css`)
- Classe `.input` renomeada para `.loginInput` no módulo de login para evitar ambiguidade
- Todos os 11 componentes JS que importavam `Admin.module.css` atualizados para importar apenas o módulo específico:
  - `withAdminAuth.js` → `login.module.css`
  - `AdminUsers.js` → `tabs.module.css` + `misc.module.css` (via mapeamento explícito)
  - `AdminRolesTab.js` → `permissions.module.css`
  - `AdminCrudBase.js` → `crud.module.css`
  - `AdminDashboard.js` → `dashboard.module.css`
  - `AdminMusicas.js` → `crud.module.css`
  - `ToggleField.js`, `UrlField.js`, `ImageUploadField.js` → `form.module.css`
  - `IntegrityCheck.js`, `RateLimitViewer.js` → `misc.module.css`
  - `pages/admin.js` → `login.module.css` + `tabs.module.css` + `form.module.css` + `misc.module.css` (via mapeamento explícito)
- Arquivo `styles/Admin.module.css` removido (18/05/2026) — sem nenhum import ativo após a migração


---

## 2. Features

### 2.1 Blog

**Localização:** `components/Features/Blog/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | `BlogSection.js` não tem `useMemo` para `displayedPosts`. O `slice` é recalculado a cada render. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Acessibilidade** | `PostCard.js` (linha 11): a imagem não tem `alt` descritivo (usa `post.title` como alt, mas o atributo está vazio). | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **SEO** | `PostCard.js` (linha 41): o link para `/blog/${post.slug}` não possui `aria-label` ou `title` descritivo. | ✅ **RESOLVIDO (18/05/2026)** |

### 2.2 ContentTabs

**Localização:** `components/Features/ContentTabs/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | `BlogSection`, `MusicGallery`, `VideoGallery` e `ProductList` são importados estaticamente e todos fazem fetch de API ao montar, mesmo que a aba não esteja visível. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | O componente `PlaceholderContent` (linha 69) é inline e tem fallbacks que não são mais usados (já que as abas música/vídeo/produtos estão ativas). Pode ser removido ou simplificado. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Acessibilidade** | As abas não possuem `aria-controls` vinculando o botão ao painel de conteúdo correspondente. | ✅ **RESOLVIDO (18/05/2026)** |

### 2.3 Music

**Localização:** `components/Features/Music/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Resiliência** | `MusicGallery.js` (linhas 28-31): a lógica de paginação com múltiplos fallbacks encadeados foi substituída por função `getPaginationData` com validação explícita e formatos de resposta consistentes. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | `MusicCard.js` (linhas 10-21) e `UrlField.js` (linhas 44-47) tinham quase a mesma regex de extração de ID do Spotify. Centralizado em `lib/spotify.js` com `extractSpotifyId()` e `getSpotifyEmbedUrl()`, eliminando a duplicidade. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Performance** | O embed Spotify carregava o player mesmo sem interação do usuário. Substituído por `LazyIframe` com carregamento sob demanda (clique do usuário), similar ao que já foi feito no componente VideoCard. | ✅ **RESOLVIDO (18/05/2026)** |

### 2.4 Products

**Localização:** `components/Features/Products/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | `ProductCard.js` (linha 41): o lightbox adiciona/remove event listener de `keydown` a cada abertura/fechamento. Poderia usar abordagem com ref. — Substituído `useEffect` + `addEventListener` por `onKeyDown` diretamente no JSX do lightbox via `ref`. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Performance** | `ProductList.js` (linha 14): usa `useDebounce` triplo (search, minPrice, maxPrice). Três debounces separados podem causar requisições desnecessárias. — Unificados em um único `useDebounce` sobre objeto de filtros com `useMemo`. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Acessibilidade** | O lightbox (linhas 129-158) não tem `aria-hidden="true"` nos elementos atrás do modal quando aberto (apenas no overlay). — Adicionado `useEffect` que seta/remove `aria-hidden` no container `#__next`. | ✅ **RESOLVIDO (18/05/2026)** |
| 4 | **Manutenção** | `styles.js` (linha 10): `inputStyle` usa `paddingLeft` como string template direto, sem validação de segurança. — Adicionada whitelist `VALID_PADDING_LEFT` com fallback seguro para token padrão. | ✅ **RESOLVIDO (18/05/2026)** |

### 2.5 Testimonials

**Localização:** `components/Features/Testimonials/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | O CSS está inline via `<style jsx>` (linhas 115-182) e não como CSS module, diferentemente do restante do projeto. Inconsistência. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Performance** | O event listener `resize` (linha 51) não tem debounce, podendo causar chamadas excessivas em redimensionamento. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Acessibilidade** | Os botões de navegação do carrossel (linhas 78, 109) não têm `aria-controls` ou referência ao container. | ✅ **RESOLVIDO (18/05/2026)** |
| 4 | **Performance** | Fetch de `/api/dicas` sem staleTime, executado a cada montagem do componente. | ✅ **RESOLVIDO (18/05/2026)** — Adicionado `staleTime: 60000` no `useApiFetch` |

### 2.6 Video

**Localização:** `components/Features/Video/`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | `VideoGallery.js` (linhas 99-129): os estilos dos botões de paginação estavam inline, diferentemente do padrão do projeto que usa CSS modules. Migrados para classes CSS `.pagination`, `.pageButton`, `.pageInfo` em `VideoGallery.module.css`. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | A estrutura de `MusicGallery.js` e `VideoGallery.js` é similar (busca, paginação, estados). Em `MusicGallery.js`, os blocos de loading/error foram substituídos pelos componentes padronizados `LoadingMessage` e `ErrorMessage` de `StateMessages.js`, reduzindo duplicação parcial. | ✅ **RESOLVIDO (18/05/2026)** |

---

## 3. Layout

### 3.1 Container.js

**Localização:** `components/Layout/Container.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | BEM estruturado, sem problemas significativos. | ⬜️ **MANTIDO** — já estava correto |
| 2 | **Manutenção** | Componente não possuía PropTypes para validação de tipos em runtime. Adicionados `Container.propTypes` com tipagem completa de todas as props. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Manutenção** | Subcomponentes `Container.Section` e `Container.Article` não possuíam `displayName`, dificultando debugging em React DevTools. Adicionados `Container.Section.displayName` e `Container.Article.displayName`. | ✅ **RESOLVIDO (18/05/2026)** |

### 3.2 Grid.js

**Localização:** `components/Layout/Grid.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | A lógica de fallback para CSS custom properties (linhas 36-41) era repetitiva e difícil de manter. Criada função auxiliar `getColsValue(breakpoint, responsive, fallbackCols)` que centraliza a lógica de cascata de breakpoints, eliminando a repetição de `typeof responsive === 'object'` e encadeamentos manuais. | ✅ **RESOLVIDO (18/05/2026)** |
| 2 | **Duplicidade** | Os `responsiveStyle` em `Grid.js` (linhas 34-42) e `Grid.Responsive` (linhas 149-155) calculavam a mesma lógica de cascata de breakpoints de formas diferentes. Ambos agora compartilham a função auxiliar `getColsValue`, eliminando a duplicidade. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Manutenção** | Adicionado JSDoc completo na função auxiliar `getColsValue` com descrição de parâmetros e retorno. | ✅ **RESOLVIDO (18/05/2026)** |

### 3.3 Stack.js

**Localização:** `components/Layout/Stack.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | Componente bem estruturado. Sem problemas significativos. | ⬜️ **MANTIDO** — já estava correto |
| 2 | **Manutenção** | Componente não possuía PropTypes para validação de tipos em runtime. Adicionados `Stack.propTypes` com tipagem completa de todas as props, e `Stack.Item.propTypes`, `Stack.Divider.propTypes`, `Stack.Spacer.propTypes`, `Stack.VStack.propTypes`, `Stack.HStack.propTypes`. | ✅ **RESOLVIDO (18/05/2026)** |
| 3 | **Manutenção** | Subcomponentes `Stack.Item`, `Stack.Divider`, `Stack.Spacer`, `Stack.VStack` e `Stack.HStack` não possuíam `displayName`, dificultando debugging em React DevTools. Adicionados `displayName` em todos os subcomponentes. | ✅ **RESOLVIDO (18/05/2026)** |

### 3.4 Sidebar.js

**Localização:** `components/Layout/Sidebar.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | O `useEffect` que persiste collapsed (linha 55-63) executa a cada mudança de `collapsed`. Como `localStorage.setItem` é síncrono, pode causar pequenos delays. Poderia ser debounced. |
| 2 | **Acessibilidade** | O overlay mobile (linha 121) tem `aria-hidden="true"`, mas o conteúdo principal atrás do overlay ainda pode receber foco via Tab. Deveria usar `inert` ou `aria-hidden` no container pai. |
| 3 | **Manutenção** | O seletor CSS `+ .main` e `~ .main` (Sidebar.module.css, linhas 124-145) pode causar problemas de especificidade. A margem do main é controlada por seletores de irmãos, o que é frágil. |

### 3.5 Stack.module.css ✅ **RESOLVIDO (18/05/2026)**

**Localização:** `components/Layout/Stack.module.css`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Performance** | O spacing usava seletor `> * + *` (adjacent sibling), que é funcional mas pode ter impacto em performance com muitos filhos animados. Substituído por `gap` via CSS Custom Property `--stack-gap`, eliminando ~50 linhas de código duplicado e os seletores adjacentes. Bloco responsivo simplificado (apenas `flex-direction: column`). | ✅ **RESOLVIDO (18/05/2026)** |

---

## 4. Performance

### 4.1 CriticalCSS.js

**Localização:** `components/Performance/CriticalCSS.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | O CSS inline (linhas 26-94) está em formato de string não minificada dentro do JS. Difícil de manter e debugar. |
| 2 | **Manutenção** | O helper `removeCriticalCSS` (linha 101) remove o style pelo ID, mas não há fallback se o CSS principal falhar ao carregar. |

### 4.2 ImageOptimized.js

**Localização:** `components/Performance/ImageOptimized.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | O skeleton loader (linhas 88-97) renderiza um div `absolute` com `inset: 0`. Se a imagem falhar, o skeleton permanece visível junto com o fallback. |
| 2 | **Manutenção** | O CSS da animação pulse (linhas 121-130) usa `<style jsx>` do Next.js, que gera hash único. Isso impede cache de CSS compartilhado. |

### 4.3 LazyIframe.js

**Localização:** `components/Performance/LazyIframe.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | A regex de extração de ID do YouTube (linha 84) é duplicada em `AdminVideos.js` (linha 28) e `UrlField.js` (linha 39). |
| 2 | **UX** | O placeholder de thumbnail (linhas 122-147) exibe um fundo escuro com overlay, mas não tem botão de "play" visível para o usuário saber que pode clicar. |
| 3 | **Acessibilidade** | O placeholder (linha 124) é um `div` com `onClick`, mas não tem `role="button"` ou `tabIndex`. Não é acessível por teclado. |

### 4.4 PreloadResources.js

**Localização:** `components/Performance/PreloadResources.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | Gera tags `dns-prefetch` e `preconnect` para os mesmos domínios simultaneamente. `preconnect` já inclui `dns-prefetch`, então `dns-prefetch` é redundante. |
| 2 | **Manutenção** | A função `getCriticalResources` (linha 103) retorna dados estáticos que podem ficar desatualizados conforme a página muda. |

---

## 5. SEO

### 5.1 Head.js

**Localização:** `components/SEO/Head.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | Gera tags `preconnect` e `dns-prefetch` para YouTube e Spotify em TODAS as páginas, mesmo quando não há conteúdo dessas plataformas. |
| 2 | **Manutenção** | Os `preconnect` e `dns-prefetch` (linhas 147-155) duplicam a funcionalidade de `PreloadResources.js`, causando potencial duplicidade de tags no `<head>`. |
| 3 | **SEO** | A URL canônica (linha 49) não remove trailing slash. Isso pode causar conteúdo duplicado se a página for acessada com/sem barra. |

### 5.2 StructuredData

**Localização:** `components/SEO/StructuredData/`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | Todos os componentes de StructuredData repetem `sanitizeJsonLd`, `siteConfig`, `siteUrl`, `formatSchemaDate`, `getImageUrl` importados de `lib/seo/config`. Código boilerplate alto. |
| 2 | **Manutenção** | Todos esses componentes importam de `../../../lib/seo/config`, que é um caminho relativo longo. Poderia usar alias `@/lib/seo/config`. |

---

## 6. UI (Design System)

### 6.1 Button.js

**Localização:** `components/UI/Button.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | O efeito ripple (linhas 37-48) adiciona elementos `span` ao DOM que não são ocultos de leitores de tela. Deveriam ter `aria-hidden="true"`. |
| 2 | **Performance** | O estado `ripples` (useState) armazena objetos de ripple que são removidos após 600ms via `setTimeout`. Se muitos cliques forem feitos rapidamente, pode causar acúmulo. |
| 3 | **Manutenção** | `Button` importa `Spinner` de `./Spinner.js` diretamente, mas o `index.js` também exporta Spinner. Inconsistência de import. |

### 6.2 Input.js

**Localização:** `components/UI/Input.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | O campo `Input` gera IDs aleatórios (linha 36) se nenhum ID for fornecido. Isso quebra a hidratação SSR (Next.js), pois o ID gerado no servidor difere do cliente. |

### 6.3 TextArea.js

**Localização:** `components/UI/TextArea.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Mesmo problema de ID aleatório que `Input.js` (linha 43). Quebra hidratação SSR. |
| 2 | **Performance** | `useEffect` (linha 117) recalcula altura em cada mudança de `value`. Se `autoResize` estiver desativado, ainda executa lógica desnecessária. |

### 6.4 Select.js

**Localização:** `components/UI/Select.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Mesmo problema de ID aleatório (linha 36). Quebra hidratação SSR. |
| 2 | **Performance** | O modo custom renderiza um `input` de busca quando `searchable` está ativo, mas não corta a busca assíncrona se o usuário fechar o dropdown rapidamente. |
| 3 | **Manutenção** | O componente alterna entre render nativo e custom dependendo de `searchable || clearable`, mas o modo nativo não suporta `clearable`. |

### 6.5 Modal.js

**Localização:** `components/UI/Modal.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | O modal não usa `aria-labelledby` ou `aria-describedby` para associar título e descrição. |
| 2 | **Performance** | O focus trap usa `querySelectorAll` com seletor complexo a cada Tab (linhas 96-113). Poderia ser cacheado. |
| 3 | **Manutenção** | O seletor de foco (linhas 69, 96) está duplicado. Deveria ser uma constante ou hook. |
| 4 | **Segurança** | O `document.body.style.overflow` (linha 44) sobrescreve qualquer estilo inline preexistente. `originalBodyOverflow` captura apenas o primeiro valor. |

### 6.6 Card.js / BaseCard.js

**Localização:** `components/UI/Card.js` e `components/UI/BaseCard.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | `Card.js` é apenas um wrapper que passa props para `BaseCard`. A existência de ambos pode causar confusão sobre qual usar. |
| 2 | **Acessibilidade** | `BaseCard.js` (linha 69): quando `onClick` é fornecido, o card recebe `role="button"` e `tabIndex={0}`, mas não há indicação visual de foco via teclado. |
| 3 | **Acessibilidade** | O `role="button"` em um `<div>` pode não ser anunciado corretamente por todos os leitores de tela como elemento interativo. |

### 6.7 Badge.js

**Localização:** `components/UI/Badge.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | A função `kebabToCamel` (linha 10) é simples e poderia ser substituída por CSS diretamente (ex: `top-right` → classe CSS). |
| 2 | **Acessibilidade** | `Badge.Dot` (linha 97) usa `aria-label="Notificação"` genérico, sem contexto do que a notificação significa. |

### 6.8 Alert.js

**Localização:** `components/UI/Alert.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | A variável `icons` (linha 84) recebe `defaultIcons` desnecessariamente (já importada). |
| 2 | **Acessibilidade** | O alerta usa `role="alert"` com `aria-live="polite"`. Para alertas críticos, `role="alertdialog"` seria mais apropriado. |

### 6.9 Toast.js

**Localização:** `components/UI/Toast.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | O hook `useToast` (linha 127) gera IDs com `crypto.randomUUID()`. Esse método não está disponível em ambientes sem crypto (ex: alguns navegadores antigos). |
| 2 | **Acessibilidade** | O toast usa `role="status"` com `aria-live="polite"`, mas não anuncia o status (ex: "sucesso", "erro") de forma clara para leitores de tela. |
| 3 | **Duplicidade** | `Toast` e `Alert` compartilham a mesma estrutura (ícone, título, descrição, close). Diferença principal é temporário vs. permanente. |

### 6.10 Spinner.js

**Localização:** `components/UI/Spinner.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | O `role="status"` e `aria-label` estão no container, mas o texto do label (linha 34) é passado corretamente para `aria-label`. Sem problemas graves. |

### 6.11 StateMessages.js

**Localização:** `components/UI/StateMessages.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | `LoadingMessage` usa emoji ⏳ como indicador visual. Leitores de tela podem anunciar isso, o que pode ser confuso. |
| 2 | **Duplicidade** | `EmptyMessage` e `ErrorMessage` são similares, diferindo apenas na cor. Poderiam ser um único componente configurável. |

---

## Resumo Consolidado

| Categoria | Quantidade | Principais Ocorrências |
|-----------|-----------|------------------------|
| **Duplicidade** | ~12 ocorrências | CSV export, reorder ✅, renderCustomFormField ✅, regex YouTube/Spotify, TextArea vs TextAreaField, CSS skeleton, alert() vs modal |
| **Performance** | ~12 ocorrências | Fetch sem cache, filtros sem useMemo, debounce excessivo, imports estáticos de conteúdo não-visível, ripple acumulado |
| **Acessibilidade** | ~10 ocorrências | Abas sem aria, lightbox focus, modal sem labelledby, ripple não oculto, placeholder sem role button |
| **Manutenção** | ~14 ocorrências | IDs aleatórios quebrando SSR, endpoints inconsistentes, CSS inline vs modules, placeholders não-funcionais, estilos duplicados no CSS module |
| **Segurança** | ~2 ocorrências | Uso de `alert()`, overflow inline sobrescrito |
| **UX** | ~3 ocorrências | Botão "Puxar Dados" sobreposto, uso de `confirm()` nativo, embed pesado na tabela |