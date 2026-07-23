# Análise de Melhorias — `/components`

> **Data:** 27/06/2026  
> **Objetivo:** Levantamento analítico de possíveis melhorias, correções, ajustes estruturais e pontos de atenção identificados nos componentes. Nenhuma alteração será aplicada neste documento.

---

## 1. Admin

### 1.1 AdminCrudBase.js

**Localização:** `components/Admin/AdminCrudBase.js`

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Manutenção** | Componente com ~565 linhas. Avaliar extração do formulário dinâmico e tabela em subcomponentes. | **Resolvido** — Extraído CrudForm.js (102 linhas) e CrudTable.js (309 linhas). AdminCrudBase reduzido de 606 → 356 linhas (-41,3%). |
| 2 | **Performance** | Paginação calcula totalPages e faz slice local. Para grandes volumes, server-side é mais adequado. | **Resolvido** — Busca migrada para server-side via parâmetro `searchTerm` no hook `useAdminCrud`. Filtro local `displayedItems` substituído. |
| 3 | **Acessibilidade** | Tabela sem `<caption>` ou `aria-label` descritivo. | **Resolvido** — Adicionado `aria-label={title}` e `scope="col"` em todos os `<th>`. |
| 4 | **Duplicidade** | Animações skeleton duplicadas em crud.module.css, misc.module.css e AdminAudit.js. | **Resolvido** — Skeleton removido de misc.module.css; AdminAudit.js e IntegrityCheck.js redirecionados para crud.module.css. |

### 1.2 AdminDashboard.js

**Localização:** `components/Admin/AdminDashboard.js`

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Gráfico de barras com estilos inline extensos. Extrair para CSS Module ou subcomponente BarChart. |
| 2 | **Acessibilidade** | Gráfico sem `role="img"` ou `aria-label` descritivo. |

### 1.3 AdminPosts.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | `renderCustomFormField` mescla lógica de title e slug. Separar em funções distintas. |

### 1.4 AdminProducts.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Campo `images` armazena URLs separadas por `\n` em string única. Considere array ou upload múltiplo. |
| 2 | **Segurança** | Campo `images` aceita qualquer URL sem validação adicional. |

### 1.5 AdminVideos.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Campo `descricao` com `TextField(type='textarea')` — TextField não suporta nativamente `type="textarea"`. |

### 1.6 AdminMusicas.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Import de `styles` (crud.module.css) subutilizado (usado só no link .spotifyLink). |

### 1.7 Admin/index.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | Não exporta AdminDashboard, AdminDicas, AdminAudit, Tools, Managers. Exportar tudo. |

### 1.8 withAdminAuth.js

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | Formulário de login sem labels associados aos inputs (só placeholder). |

### 1.9 Tools

| # | Tipo | Descrição | Arq. |
|---|------|-----------|------|
| 1 | **Duplicidade** | Padrão fetch + tratamento 401 duplicado (AdminAudit, IntegrityCheck, RateLimitViewer). Extrair hook. | Tools |
| 2 | **Manutenção** | Estilos inline extensos em ambos. Extrair para CSS Module. | Tools |

### 1.10 Managers

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | Modal de confirmação quase idêntico. Extrair `ConfirmModal`. |
| 2 | **Duplicidade** | Mensagem de feedback condicional duplicada. |
| 3 | **Manutenção** | Estilos inline. Padronizar para CSS Module. |

### 1.11 Fields

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Manutenção** | TextField/TextAreaField são adaptadores finos. Avaliar uso direto dos componentes UI pelo AdminCrudBase. |

---

## 2. Features

### 2.1 Blog

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Acessibilidade** | PostCard: imagem sem `alt` descritivo quando URL inválida. Fallback pode não ter alt. |

### 2.2 ContentTabs

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | **Duplicidade** | Estilos placeholderContainer/placeholderCard similares aos de misc.module.css (Admin). | |
| 2 | **Performance** | Transição CSS órfã (`transition: var(--transition-opacity), var(--transition-transform)`) no `.contentContainer` sem lógica JS correspondente. Classes `.fade-*` não utilizadas. | **Resolvido** — Transição e classes `.fade-*` removidas. |
| 3 | **Layout** | Tremor (layout shift) ao trocar abas causado por `min-height` insuficiente (400px) no `.contentContainer` e fallback do Suspense com altura diferente (300px). | **Resolvido** — `min-height` do `.contentContainer` e do `.loading` ajustados para 600px. |
| 4 | **Layout** | Micro-movimento nos botões de aba ao clicar devido a `transform: scale(0.98)` no estado `:active`. | **Resolvido** — `scale(0.98)` substituído por `background-color` no `:active`. |
| 5 | **Compatibilidade** | `React.lazy` nos 4 componentes (BlogSection, MusicGallery, VideoGallery, ProductList) causava `ChunkLoadError` no Turbopack (Next.js 16.2.10) pois o bundler gerava chunks CSS separados para CSS Modules em imports dinâmicos, e o hash tornava-se inválido. | **Resolvido** — Substituído `React.lazy` + `lazy(() => import(...))` por imports estáticos convencionais. `<Suspense>` mantido para fallback visual. |

### 2.3 Music / Video

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Duplicidade** | MusicGallery.js e VideoGallery.js compartilham ~70% da estrutura. Extrair GalleryBase ou hook. |
| 2 | **Manutenção** | MusicGallery.module.css com muitas media queries fragmentadas. Unificar mobile-first. |
| 3 | **Manutenção** | VideoCard.js com estilos inline extensos. Extrair para CSS Module. |

### 2.4 Products

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | `React.memo` em ProductCard pode ser anulado — `cardMedia` recriado a cada render. |
| 2 | **Acessibilidade** | Lightbox sem focus trap completo (Tab não cicla entre elementos). |
| 3 | **Manutenção** | ProductList.js com estilos inline extensos. Extrair para CSS Module. |

### 2.5 Testimonials

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | **Performance** | `useEffect` de resize sem verificação de montagem. |
| 2 | **Acessibilidade** | Carrossel sem `aria-live="polite"` para anunciar mudanças. |

---

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

---

## 4. Performance

| # | Tipo | Descrição | Componente | Status |
|---|------|-----------|------------|--------|
| 1 | **Performance** | Skeleton como div separada — usar `::before` CSS. | ImageOptimized | |
| 2 | **Acessibilidade** | Placeholder iframe com `aria-label` confuso. | LazyIframe | |
| 3 | **Performance** | Iframe com `loading="lazy"` redundante com IO. | LazyIframe | |
| 4 | **Manutenção** | Domínios padrão hardcoded. Mover para config. | PreloadResources | |
| 5 | **Performance** | Thumbnail YouTube usava `maxresdefault.jpg` (1080p, ~200-400KB) para preview pré-play, resolução desnecessária para thumbnail não-interativa. | LazyIframe | **Resolvido** — Substituído para `hqdefault.jpg` (480×360, ~20-50KB), reduzindo tamanho em 5-10x. |
| 6 | **Performance** | Múltiplos iframes visíveis simultaneamente no viewport disparavam carregamento paralelo, causando contenção de banda (~1.100ms cada). | LazyIframe | **Resolvido** — Adicionado `iframeLoadingQueue`, gerenciador singleton que limita a 2 iframes carregando simultaneamente. Clique do usuário ignora a fila. |

---

## 5. SEO

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Duplicidade** | Cada schema reimporta siteConfig/siteUrl — StructuredDataBase já reexporta. | StructuredData |
| 2 | **Manutenção** | `@context: 'https://schema.org'` repetido em todos os schemas. Poderia ser herdado. | StructuredData |
| 3 | **Performance** | `router.asPath` em SEOHead pode causar hidratação incorreta SSR. | SEOHead |
| 4 | **Manutenção** | `export default` em StructuredData/index.js nunca era importado por nenhum consumidor. | StructuredData |

**Resolvido** — Removido `export { default } from './OrganizationSchema'` da linha 11. Os named exports (OrganizationSchema, WebsiteSchema, etc.) são importados por components/SEO/index.js e permanecem intactos. |

---

## 6. UI (Design System)

| # | Tipo | Descrição | Componente |
|---|------|-----------|------------|
| 1 | **Performance** | Ripple com `useReducer` + spans no DOM. Substituir por CSS animação. | Button |
| 2 | **Duplicidade** | Input, TextArea, Select compartilham estrutura de label/error/helper. Extrair `useField`. | Input/TxArea/Select |
| 3 | **Performance** | `createPortal` condicional em SSR pode causar problemas. | Modal |
| 4 | **Acessibilidade** | Focus trap com `setTimeout(10ms)` — usar `requestAnimationFrame`. | Modal |
| 5 | **Manutenção** | Hook `useToast` e componente Toast no mesmo arquivo. Separar. | Toast |
| 6 | **Performance** | `generateId` com fallback `Math.random()` inseguro para SSR. | Toast |
| 7 | **Acessibilidade** | Alert crítico sem focus trap para `role="alertdialog"`. | Alert |

---

## 7. Pontos de Atenção Transversais

| # | Tipo | Descrição | Módulos |
|---|------|-----------|---------|
| 1 | **Duplicidade** | Tratamento de sessão expirada (401) repetido em 5+ arquivos | Admin |
| 2 | **Duplicidade** | Fetch com verificação de Content-Type repetido em 6+ arquivos | Admin |
| 3 | **Duplicidade** | Estrutura Gallery (busca + ordenação + paginação) entre Music e Video | Features |
| 4 | **Manutenção** | Estilos inline misturados com CSS Module em vários Admin | Admin Tools/Managers |
| 5 | **Acessibilidade** | Tabelas sem `<caption>` ou `aria-label` (AdminAudit) | Admin |
| 6 | **Duplicidade** | Modal de confirmação idêntico em CacheManager e BackupManager | Admin/Managers |
| 7 | **Manutenção** | StructuredData: reimportação redundante de siteConfig/siteUrl | SEO/StructuredData |
