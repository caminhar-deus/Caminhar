# Análise de Melhorias — `/components`

> **Data:** 31/07/2026  
> **Objetivo:** Levantamento analítico de possíveis melhorias, correções, ajustes estruturais e pontos de atenção identificados nos componentes. Nenhuma alteração será aplicada neste documento.

---

## 1. Admin

### 1.1 AdminCrudBase.js

**Localização:** `components/Admin/AdminCrudBase.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Import `toast` de `react-hot-toast` ainda é necessário (usado no `useEffect` de erro), mas há código comentado de notificação de sucesso em `handleSuccessWrapper`. Remover código morto. |
| 2 | **Manutenção** | Estilos inline extensos no header (busca, botões) e no container principal (`minHeight: '700px'`). Extrair para CSS Module. |
| 3 | **Acessibilidade** | Input de busca sem `aria-label` (usa apenas placeholder). |

### 1.2 CrudTable.js

**Localização:** `components/Admin/CrudTable.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | Drag & Drop via teclado é apenas um placeholder (comentário "Placeholder para ativar o modo de arrasto via teclado"). Não há implementação real de reordenação acessível. |
| 2 | **Acessibilidade** | Célula de reordenação usa `role="button"` e `tabIndex={0}` mas não tem handler funcional de teclado. |
| 3 | **Manutenção** | Estilos inline extensos no `<thead>` (sticky, zIndex, backgroundColor). Extrair para CSS Module. |

### 1.3 AdminDashboard.js

**Localização:** `components/Admin/AdminDashboard.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Gráfico de barras com estilos inline extensos. Extrair para CSS Module ou subcomponente BarChart. |
| 2 | **Acessibilidade** | Gráfico sem `role="img"` ou `aria-label` descritivo. |
| 3 | **Manutenção** | Cache em `sessionStorage` com chave fixa `admin_dashboard_stats` — pode conflitar entre múltiplas abas/sessões. |

### 1.4 AdminPosts.js

**Localização:** `components/Admin/AdminPosts.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | `renderCustomFormField` mescla lógica de title e slug. Separar em funções distintas. |
| 2 | **Manutenção** | `slugGeneratedRef` controla toast único, mas não é resetado ao editar outro post — o toast pode não aparecer em edições subsequentes. |

### 1.5 AdminVideos.js

**Localização:** `components/Admin/AdminVideos.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Campo `descricao` com `TextField(type='textarea')` — TextField não suporta nativamente `type="textarea"`. Usar `TextAreaField`. |

### 1.6 AdminMusicas.js

**Localização:** `components/Admin/AdminMusicas.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Import de `styles` (crud.module.css) subutilizado (usado só no link `.spotifyLink`). |

### 1.7 AdminProducts.js

**Localização:** `components/Admin/AdminProducts.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Campo `image_url` armazena URLs separadas por `\n` em string única. Considere array ou upload múltiplo. |
| 2 | **Segurança** | Campo `image_url` aceita qualquer URL sem validação adicional (apenas `min(1)`). |
| 3 | **Manutenção** | `apiEndpoint` aponta para `/api/products` (público) em vez de `/api/admin/products` — verificar se é intencional. |

### 1.8 Admin/index.js

**Localização:** `components/Admin/index.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Barrel incompleto. Não exporta AdminDashboard, AdminDicas, AdminAudit, AdminUsers, AdminUsersTab, AdminRolesTab, Tools, Managers, withAdminAuth. Exportar tudo para consistência. |

### 1.9 withAdminAuth.js

**Localização:** `components/Admin/withAdminAuth.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | Formulário de login sem labels associados aos inputs (só placeholder). |
| 2 | **Acessibilidade** | Botão "Sair" e link "Voltar ao Painel Principal" sem `aria-label` explícito (texto é suficiente, mas verificar contexto). |

### 1.10 Tools

| # | Tipo | Descrição | Arq. |
|---|------|-----------|------|
| 1 | **Duplicidade** | Padrão fetch + tratamento 401 duplicado (AdminAudit, IntegrityCheck, RateLimitViewer, AdminUsersTab). RateLimitViewer não faz verificação de Content-Type. Extrair hook. | Tools |
| 2 | **Manutenção** | Estilos inline extensos em ambos. Extrair para CSS Module. | Tools |
| 3 | **Manutenção** | `RateLimitViewer.js` com 548 linhas — alto acoplamento. Considerar extração de subcomponentes (tabs, listas). | RateLimitViewer |
| 4 | **Acessibilidade** | Abas internas do RateLimitViewer sem `role="tablist"`/`role="tab"`/`aria-selected`. | RateLimitViewer |

### 1.11 Managers

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | Modal de confirmação quase idêntico em BackupManager e CacheManager. Extrair `ConfirmModal`. |
| 2 | **Duplicidade** | Mensagem de feedback condicional duplicada. |
| 3 | **Manutenção** | Estilos inline. Padronizar para CSS Module. |
| 4 | **Manutenção** | `BackupManager` e `CacheManager` não tratam sessão expirada (401) — apenas verificam `res.ok` e falham silenciosamente, sem exibir erro ao usuário. |

### 1.12 Fields

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | TextField/TextAreaField são adaptadores finos. Avaliar uso direto dos componentes UI pelo AdminCrudBase. |
| 2 | **Acessibilidade** | `ImageUploadField` usa `<label>` com `htmlFor` apontando para input de texto, mas o input de arquivo está oculto dentro de outro `<label>` — verificar associação correta. |
| 3 | **Manutenção** | `UrlField` e `ImageUploadField` usam estilos inline extensos. Extrair para CSS Module. |

---

## 2. Features

### 2.1 Blog

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | PostCard: imagem sem `alt` descritivo quando URL inválida. Fallback pode não ter alt. |
| 2 | **Manutenção** | BlogSection: estilos inline no link "Ver todas as postagens". Extrair para CSS Module. |

### 2.2 ContentTabs

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | Estilos placeholderContainer/placeholderCard similares aos de misc.module.css (Admin). |
| 2 | **Manutenção** | Aba "projeto1" (Em Desenvolvimento) é desabilitada via `disabled` no botão, mas o `onClick` também bloqueia. Lógica duplicada. |

### 2.3 Music / Video

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | MusicGallery.js e VideoGallery.js compartilham ~70% da estrutura (busca + ordenação + paginação + estados). Extrair GalleryBase ou hook. |
| 2 | **Manutenção** | MusicGallery.module.css com muitas media queries fragmentadas. Unificar mobile-first. |
| 3 | **Manutenção** | VideoCard.js com estilos inline extensos. Extrair para CSS Module. |
| 4 | **Manutenção** | MusicGallery e VideoGallery têm lógica de paginação/adaptação de resposta duplicada. |

### 2.4 Products

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | `React.memo` em ProductCard pode ser anulado — `cardMedia` recriado a cada render. |
| 2 | **Acessibilidade** | Lightbox sem focus trap completo (Tab não cicla entre elementos). |
| 3 | **Manutenção** | ProductList.js com estilos inline extensos. Extrair para CSS Module. |
| 4 | **Acessibilidade** | Lightbox: `aria-hidden` no `#__next` pode não restaurar corretamente se múltiplos lightboxes/menus estiverem abertos. |

### 2.5 Testimonials

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | `useEffect` de resize sem verificação de montagem. |
| 2 | **Acessibilidade** | Carrossel sem `aria-live="polite"` para anunciar mudanças. |
| 3 | **Manutenção** | Fallback estático (`fallbackData`) com conteúdo hardcoded — considerar mover para config. |

---

## 3. Layout

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Manutenção** | Export named + default causa confusão. Padronizar. | Geral |
| 2 | **Manutenção** | Grid.Responsive e prop `responsive` sobrepostos. | Grid |
| 3 | **Performance** | `getColsValue` chamado múltiplas vezes por render. | Grid |
| 4 | **Manutenção** | Alias `gap` para `spacing` adiciona complexidade. | Stack |
| 5 | **Performance** | Persistência localStorage com debounce pode causar escrita excessiva. | Sidebar |
| 6 | **Acessibilidade** | Overlay mobile sem `role="presentation"`. | Sidebar |
| 7 | **Acessibilidade** | `Sidebar.NavItem` renderiza `<a>` sem `href` quando não fornecido — pode quebrar navegação por teclado. | Sidebar |

---

## 4. Performance

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Performance** | Skeleton como div separada — usar `::before` CSS. | ImageOptimized |
| 2 | **Acessibilidade** | Placeholder iframe com `aria-label` confuso (regex remove caracteres especiais). | LazyIframe |
| 3 | **Performance** | Iframe com `loading="lazy"` redundante com IntersectionObserver. | LazyIframe |
| 4 | **Manutenção** | Domínios padrão hardcoded. Mover para config. | PreloadResources |
| 5 | **Manutenção** | `getCriticalResources` com fallbacks de imagens hardcoded (`/hero-image.jpg`, etc.) que podem não existir. | PreloadResources |

---

## 5. SEO

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Duplicidade** | Cada schema reimporta siteConfig/siteUrl — StructuredDataBase já reexporta. | StructuredData |
| 2 | **Manutenção** | `@context: 'https://schema.org'` repetido em todos os schemas. Poderia ser herdado. | StructuredData |
| 3 | **Performance** | `router.asPath` em SEOHead pode causar hidratação incorreta SSR. | SEOHead |
| 4 | **Manutenção** | `SEOHead` usa `router.asPath` sem `useMemo` — recalculado a cada render. | SEOHead |

---

## 6. UI (Design System)

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Performance** | Ripple com `useReducer` + spans no DOM. Substituir por CSS animação. | Button |
| 2 | **Duplicidade** | Input, TextArea, Select compartilham estrutura de label/error/helper. Extrair `useField`. | Input/TextArea/Select |
| 3 | **Performance** | `createPortal` condicional em SSR pode causar problemas. | Modal |
| 4 | **Acessibilidade** | Focus trap com `setTimeout(10ms)` — usar `requestAnimationFrame`. | Modal |
| 5 | **Manutenção** | Hook `useToast` e componente Toast no mesmo arquivo. Separar. | Toast |
| 6 | **Performance** | `generateId` com fallback `Math.random()` inseguro para SSR. | Toast |
| 7 | **Acessibilidade** | Alert crítico sem focus trap para `role="alertdialog"`. | Alert |
| 8 | **Acessibilidade** | Select custom: botão de limpar com `aria-hidden={true}` mas `tabIndex={-1}` — inacessível por teclado. | Select |
| 9 | **Acessibilidade** | Select custom: dropdown sem `aria-activedescendant` para navegação por teclado entre opções. | Select |
| 10 | **Manutenção** | `StateMessages.js` usa estilos inline. Extrair para CSS Module. | StateMessages |

---

## 7. Pontos de Atenção Transversais

| # | Tipo | Descrição | Módulos |
|---|------|-----------|---------|
| 1 | **Duplicidade** | Tratamento de sessão expirada (401) repetido em 4 arquivos (AdminAudit, IntegrityCheck, RateLimitViewer, AdminUsersTab). AdminDashboard não trata 401 especificamente (apenas erro genérico). | Admin |
| 2 | **Duplicidade** | Fetch com verificação de Content-Type repetido em 4 arquivos (AdminAudit, AdminDashboard, IntegrityCheck, AdminUsersTab). RateLimitViewer não faz essa verificação. | Admin |
| 3 | **Duplicidade** | Estrutura Gallery (busca + ordenação + paginação) entre Music e Video. | Features |
| 4 | **Manutenção** | Estilos inline misturados com CSS Module em vários Admin (Tools, Managers, Dashboard, Audit) e Features (ProductList, VideoCard, BlogSection). | Admin/Features |
| 5 | **Acessibilidade** | Tabelas sem `<caption>` ou `aria-label` descritivo (AdminAudit usa `<table>` sem `aria-label`). | Admin |
| 6 | **Duplicidade** | Modal de confirmação idêntico em CacheManager e BackupManager. | Admin/Managers |
| 7 | **Manutenção** | StructuredData: reimportação redundante de siteConfig/siteUrl. | SEO/StructuredData |
| 8 | **Manutenção** | `UI/__tests__/` vazia — sem cobertura de testes para o Design System base. | UI |
| 9 | **Manutenção** | `Admin/index.js` barrel incompleto — inconsistência de exportações. | Admin |

---

## Implementações Aplicadas

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

**Descrição:** Item 7.4 resolvido para este componente: os 8 handlers inline (`onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur`) que manipulavam `e.currentTarget.style` — 4 no botão "Limpar filtros" e 4 nos botões de página — foram removidos e substituídos por pseudo-classes CSS no novo `components/Features/Products/styles/ProductList.module.css` (`.filterButton`, `.pageButton`, `.pageButtonActive`). A classe condicional `pageNum === currentPage` preserva o fundo `--color-primary-50` da página ativa e `:hover:not(:disabled)` reproduz a guarda original `pageNum !== currentPage && !pageLoading`. Reducida a quantidade de callbacks do componente e eliminada a manipulação imperativa de estilos.

> 📝 Este documento é analítico — as seções 1–7 servem como guia para futuras refatorações e correções; a seção "Implementações Aplicadas" registra as implementações realizadas após a elaboração deste relatório.
