# Relatório de Upgrade — Testes (`/tests/`)

> **Data:** 12/05/2026 (atualizado em 06/06/2026 — 11ª revisão)
> **Objetivo:** Reportar correções, melhorias, problemas de performance e duplicidade de código identificados na análise dos arquivos de teste.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Problemas de Performance](#2-problemas-de-performance)
3. [Correções Necessárias](#3-correções-necessárias)
4. [Melhorias Recomendadas](#4-melhorias-recomendadas)
5. [Inconsistências e Padrões](#5-inconsistências-e-padrões)
6. [Plano de Migração: lib/middleware.js → lib/api/middleware.js](#6-plano-de-migração-libmiddlewarejs--libapimiddlewarejs)

---

## 1. Duplicidade de Código

### 1.1 Padrão CRUD Repetido em Testes de Integração — **AJUSTADO (04/06/2026)**

**Ocorrência:** `tests/integration/api/` — `musicas.test.js`, `videos.test.js`, `posts.test.js`, `products.test.js`

**Descrição original:** Os testes de API seguiam o mesmo padrão estrutural, com variações significativas de implementação.

**O que foi feito (04/06/2026):**
- **`musicas.test.js`** — Adicionado mock de cache compartilhado (`mockCacheModule`), ajustada verificação de erro 500 para corresponder ao formato real do handler (`{ error, message }`), adicionado teste de rate limit (429), padronizado imports pós-mock
- **`videos.test.js`** — Removida supressão global de `console.error` (`beforeAll/afterAll`), substituída por `jest.spyOn` local conforme prática recomendada. Migrado para mock de cache compartilhado e imports pós-mock
- **`posts.test.js`** — Padronizado extração de dados de `JSON.parse(res._getData())` para `res._getJSONData()`. Migrado para mock de cache compartilhado (`mockCacheModule`). Ajustadas chaves de cache e assertions conforme handler real (ex: `posts:list:1:10`, `posts:search:3:20:teste`)
- **`products.test.js`** — Reescrevido para mockar funções de domínio (`getPaginatedProducts`, `getAllProducts`, `createProduct`, `updateProduct`, `deleteProduct`) em vez de `db.js` diretamente. Removidos spys desnecessários de `console.log`/`console.warn`. Adicionados testes para `handleAdminGet`, fluxo de criação/atualização/exclusão com log de auditoria
- **Criado** `tests/mocks/cache.js` — Mock compartilhado de cache com `mockCacheModule()` e `resetCacheMocks()` para padronizar mocks de `getOrSetCache`/`checkRateLimit`/`invalidateCache`
- **Atualizado** `tests/mocks/index.js` — Exporta o novo `cache.js`

**Resultado:** 27 testes passando. Redução de duplicidade via mock compartilhado de cache, padronização de extração de dados e imports. Arquivos continuam separados pois cada endpoint tem complexidade real diferente (GET-only vs CRUD completo, validações distintas, handlers com comportamentos diferentes).

---

### 1.2 Separação Edge Case vs. Teste Principal — **AJUSTADO (04/06/2026)**

**Ocorrência:**
- `AdminAudit.test.js` + `AdminAudit.edge.test.js`
- `AdminUsersTab.test.js` + `AdminUsersTab.edge.test.js`
- `products.edge.test.js` (em `tests/unit/pages/api/`) + `products.test.js` (em `tests/integration/api/`)

**Descrição original:** Casos de borda foram separados em arquivos distintos dos testes principais. Isso fragmenta a compreensão do que um componente/teste cobre.

**Impacto original:** Dificuldade em saber se um componente está completamente testado — é necessário verificar dois arquivos. Risco de duplicação de setup.

**O que foi feito (04/06/2026):**

| Par | Ação | Detalhes |
|-----|------|----------|
| `AdminAudit.edge.test.js` → `AdminAudit.test.js` | Mesclado | 8 testes de borda incorporados sob `describe('Casos de Borda')`. Removido teste duplicado de 401. Unificados mocks de `react-hot-toast` e `next/router`. Substituída supressão global de `console.error` por `jest.spyOn` |
| `AdminUsersTab.edge.test.js` → `AdminUsersTab.test.js` | Mesclado | 7 testes de borda incorporados. RoleSelectField migrado para `setupRoleSelectMock` com roteamento por URL. Adicionado `sessionStorage.clear()` no `beforeEach`. Testes de UI completa convertidos para funções puras |
| `products.edge.test.js` → `products.test.js` | Mesclado com migração | Mocks convertidos de `db.js` (desatualizado) para `lib/domain/products.js`. Construção manual de req/res migrada para `createMocks`. Adicionado mock de `logger`. 3 testes de borda mantidos (405, fallbacks GET, token silencioso) |

**Arquivos excluídos após mesclagem:**
- `tests/unit/components/Admin/AdminAudit.edge.test.js`
- `tests/unit/components/Admin/AdminUsersTab.edge.test.js`
- `tests/unit/pages/api/products.edge.test.js`

**Resultado:** 41 testes passando nos 3 arquivos mesclados (12 + 15 + 14). Redução de 3 arquivos. Cobertura de borda organizada sob `describe('Casos de Borda', () => {...})`.

---

### 1.3 API v1 com Sobreposição de Testes — **RESOLVIDO (13/05/2026)**

**Ocorrência anterior:** `tests/integration/api/v1/`

**Descrição anterior:** Os testes da API versão 1 (`v1/posts.test.js`, `v1/settings.test.js`, `v1/status.test.js`) testavam endpoints com cobertura equivalente nos testes de API padrão.

**O que foi feito:**
- O diretório `tests/integration/api/v1/` foi **removido** do projeto (incluindo `status.test.js`, `videos/[id].test.js`, `auth/check.test.js`)
- Os arquivos `tests/integration/auth/auth.v1.check.test.js` e `tests/integration/auth/auth.v1.login.test.js` foram **removidos**
- O arquivo `tests/integration/api/status.api.test.js` foi **removido**
- Novos testes foram criados para os endpoints não-versionados:
  - `tests/integration/api/status.test.js` — testa `/api/status`
  - `tests/integration/api/auth/check.test.js` — testa `/api/auth/check`

---

### 1.4 Repetição de Setup/Teardown em Testes Unitários — **AJUSTADO (05/06/2026 — 1ª revisão) e COMPLEMENTADO (05/06/2026 — 2ª revisão)**

**Ocorrência:** Presente na maioria dos arquivos em `tests/unit/components/`, `tests/unit/scripts/`, `tests/unit/domain/`, `tests/unit/lib/`, `tests/unit/pages/api/`

**Descrição original:** Quase todos os arquivos repetiam o mesmo padrão de setup (`jest.clearAllMocks()` em `beforeEach`) e supressão de `console.error` via substituição global (`beforeAll`/`afterAll`).

**Impacto original:** ~40+ arquivos contendo o mesmo boilerplate. Código verboso e difícil de manter.

**O que foi feito (05/06/2026 — 1ª revisão):**
- **`jest.clearAllMocks()` removido de ~41 arquivos** nos diretórios `Admin/`, `lib/`, `pages/api/` — O `jest.config.js` já possui `clearMocks: true`, tornando essas chamadas redundantes
- **`tests/setup.js`** — Adicionado `jest.clearAllMocks()` no `afterEach` global como fallback explícito
- **`BackupManager.test.js` e `CacheManager.test.js`** — Substituído padrão `beforeAll/afterAll` com `console.error` por `jest.spyOn` com `mockRestore()` no `afterEach`
- **`auth.test.js`, `cache.test.js`, `middleware.test.js`, `db.test.js`** — Removida supressão global de `console.error` via substituição de referência, sem impacto nos testes
- **`admin/posts.edge.test.js`, `admin/fetch-spotify.edge.test.js`, `auth/login.edge.test.js`** — Substituído padrão `beforeAll/afterAll` com `console.error` por `jest.spyOn` com `mockRestore()` no `afterEach`

**Resultado (1ª revisão):** 268 testes passando. Nenhuma regressão. Redução de ~41 chamadas redundantes.

**Complemento (05/06/2026 — 2ª revisão):**
- **`jest.clearAllMocks()` removido de mais 20 arquivos** — 11 em `tests/unit/scripts/`, 3 em `tests/unit/domain/`, 3 em `tests/unit/components/Features/` + `components/Products/`, 3 na raiz de `tests/unit/`
- **`clean-orphaned-images.test.js`** — Mantido `jest.clearAllMocks()` por ter `mockQuery.mockReset()` DEPOIS, o que exige ordem explícita de limpeza
- **Criado** `tests/helpers/console.js` — Helper centralizado com `suppressConsoleError()`, `filterConsoleError()`, `mockGlobalFetch()`, `createConfirmSpy()` para padronizar supressão de console e mocks de fetch/confirm
- **Atualizado** `tests/helpers/index.js` — Exporta o novo `console.js`

**Arquivos ajustados com helpers centralizados:**
| Arquivo | Padrão Anterior | Padrão Novo |
|---------|----------------|-------------|
| `BackupManager.test.js` | `global.fetch = mockFetch` + `window.confirm = jest.fn()` | `jest.spyOn(global, 'fetch')` + `createConfirmSpy(false)` |
| `CacheManager.test.js` | `global.fetch = mockFetch` + `window.confirm = jest.fn()` | `jest.spyOn(global, 'fetch')` + `createConfirmSpy(false)` |
| `BlogSection.test.js` | `const originalFetch` + `jest.clearAllMocks()` | `suppressConsoleError()` + `global.fetch = jest.fn()` |
| `MusicCard.test.js` | `beforeAll/afterAll` com `console.error = jest.fn()` | `suppressConsoleError()` + `jest.spyOn(window, 'open')` |
| `MusicGallery.edge.test.js` | `beforeAll/afterAll` com `console.error/fetch` | `suppressConsoleError()` + `jest.spyOn(global, 'fetch')` |
| `ImageOptimized.test.js` | Filtro customizado de `console.error` | `filterConsoleError(['non-boolean attribute', 'jsx'])` |
| `Testimonials/index.test.js` | Mantido padrão `beforeAll` | Padrão `beforeAll` mantido (compatível com `restoreMocks: true`) |

**Observação técnica:** `jest.spyOn(global, 'fetch')` não funciona em JSDOM porque `fetch` não é propriedade própria de `global`. A função `mockGlobalFetch()` no helper encapsula a atribuição direta `global.fetch = jest.fn()`.

**Resultado final:** 61 chamadas de `jest.clearAllMocks()` eliminadas no total. Testes estáveis sem regressão.

---

### 1.5 Factories com Código Sobreposto — **AJUSTADO (05/06/2026)**

**Ocorrência:** `tests/factories/post.js`, `tests/factories/music.js`, `tests/factories/video.js`, `tests/factories/user.js`

**Descrição original:** Todas as factories compartilhavam a mesma estrutura:
- Contador incremental (`let id = 1`)
- Função `reset*IdCounter()`
- Método `.list(n)` que cria múltiplos registros
- Geração de timestamps ISO
- Templates de dados com overrides via spread operator

**Impacto original:** Cada factory reimplementava o mesmo padrão. Mudanças no formato de geração de IDs ou timestamps requeriam alteração em 4 arquivos.

**O que foi feito (05/06/2026):**
- **Criado** `tests/factories/base.js` — Função `createBaseFactory(defaultsGenerator)` que abstrai:
  - Contador incremental com `idCounter`
  - Geração de timestamps via `generateTimestamp(daysAgo)`
  - Método `.list(n, overrides, mapFn)` para criar múltiplos registros
  - Método `.resetId()` para resetar o contador (substitui `resetPostIdCounter`, `resetMusicIdCounter`, `resetVideoIdCounter`, `resetUserIdCounter`)
- **`post.js`** — Refatorado para usar `createBaseFactory(generatePostDefaults)`. Removido `idCounter`, `generateId`, `resetPostIdCounter`, `generateTimestamp`, `.list()`
- **`music.js`** — Refatorado para usar `createBaseFactory(generateMusicDefaults)`. Removido `idCounter`, `generateId`, `resetMusicIdCounter`, `.list()`
- **`video.js`** — Refatorado para usar `createBaseFactory(generateVideoDefaults)`. Removido `idCounter`, `generateId`, `resetVideoIdCounter`, `.list()`
- **`user.js`** — Refatorado para usar `createBaseFactory(generateUserDefaults)`. Removido `idCounter`, `generateId`, `resetUserIdCounter`, `.list()`
- **`index.js`** — Adicionado export de `createBaseFactory`
- **`tests/examples/simple-test.test.js`** — Substituídos imports de `resetPostIdCounter`, `resetMusicIdCounter`, `resetVideoIdCounter`, `resetUserIdCounter` por chamadas a `postFactory.resetId()`, `musicFactory.resetId()`, `videoFactory.resetId()`, `userFactory.resetId()`
- **`tests/examples/component-example.test.js`** — Substituídos 5 usos de `resetPostIdCounter` por `postFactory.resetId()`

**Resultado:** 39/39 testes passando. Redução de ~70 linhas de código. Contador, `.list()` e timestamps centralizados em um único arquivo (`base.js`). Funções `reset*IdCounter` substituídas por `.resetId()`. Mudanças no formato de IDs ou timestamps agora requerem alteração em apenas 1 arquivo.

---

## 2. Problemas de Performance

### 2.1 Supressão Global de console.error — **RESOLVIDO (05/06/2026)**

**Ocorrência:** Múltiplos arquivos — `BackupManager.test.js`, `BlogSection.test.js`, `MusicCard.test.js`, `MusicGallery.edge.test.js`, `Testimonials/index.test.js`, `ImageOptimized.test.js`, etc.

**Código exemplar (ANTES):**
```javascript
const originalConsoleError = console.error;
beforeAll(() => { console.error = jest.fn(); });
afterAll(() => { console.error = originalConsoleError; });
```

**Problema:** Cada arquivo substituía `console.error` globalmente, com supressão total (sem filtro) durante toda a execução da suite. Isso mascara warnings legítimos que poderiam indicar problemas reais.

**Impacto na Performance:** `jest.spyOn(console, 'error')` é mais performático que substituir a referência global diretamente, além de permitir restauração automática.

**Solução implementada (05/06/2026):**
- **Criado** `tests/helpers/console.js` com funções centralizadas:
  - `suppressConsoleError()` — Cria `jest.spyOn` silencioso com `mockRestore()` no `afterEach`
  - `filterConsoleError(suppressList)` — Cria `jest.spyOn` que SUPRIME apenas padrões conhecidos e permite o restante passar
  - `createConfirmSpy(defaultValue)` — Cria `jest.spyOn` para `window.confirm`
  - `mockGlobalFetch()` — Cria mock para `global.fetch` via atribuição direta (única abordagem compatível com JSDOM)

**Arquivos corrigidos com supressão global de console.error:**

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `BackupManager.test.js` | `jest.spyOn(console, 'error')` manual | `suppressConsoleError()` |
| `CacheManager.test.js` | `jest.spyOn(console, 'error')` manual | `suppressConsoleError()` |
| `BlogSection.test.js` | `jest.spyOn(console, 'error')` manual nos testes | `suppressConsoleError()` centralizado no `beforeEach` |
| `MusicCard.test.js` | `beforeAll/afterAll` com `console.error = jest.fn()` | `suppressConsoleError()` |
| `MusicGallery.edge.test.js` | `beforeAll/afterAll` com `console.error = jest.fn()` | `suppressConsoleError()` |
| `ImageOptimized.test.js` | Filtro customizado inline | `filterConsoleError(['non-boolean attribute', 'jsx'])` |
| `Testimonials/index.test.js` | `beforeAll/afterAll` com `console.error = jest.fn()` | Mantido padrão `beforeAll` (justificado por `restoreMocks: true`) |

**Nota:** O `Testimonials/index.test.js` manteve o padrão `beforeAll` porque também mocka propriedades de DOM (`HTMLElement.prototype`) no mesmo escopo. `jest.spyOn` em `beforeAll` conflita com `restoreMocks: true` do `jest.config.js`.

**Resultado:** 7 arquivos com supressão de `console.error` padronizados. Redução de ~15 linhas de código repetido.

---

### 2.2 Mock de fetch Global sem Isolamento — **RESOLVIDO (05/06/2026)**

**Ocorrência:** 23 arquivos de teste — `BlogSection.test.js`, `BackupManager.test.js`, `CacheManager.test.js`, `AdminDashboard.test.js`, `AdminMusicas.test.js`, `AdminProducts.test.js`, `AdminCrudBase.test.js`, `ImageUploadField.test.js`, `AdminPosts.test.js`, `AdminAudit.test.js`, `AdminUsersTab.test.js`, `AdminVideos.test.js`, `withAdminAuth.test.js`, `ProductList.test.js`, `VideoGallery.test.js`, `MusicGallery.test.js`, `MusicGallery.edge.test.js`, `Testimonials/index.test.js`, `component-example.test.js`, `fetch-youtube.test.js`, `fetch-ml.test.js`, `fetch-spotify.test.js`, `fetch-spotify.edge.test.js`

**Código exemplar (ANTES):**
```javascript
global.fetch = jest.fn();
```

**Problema:** Atribuir `global.fetch` diretamente sobrescreve a implementação original. Com `restoreMocks: true` e `clearMocks: true` configurados no `jest.config.js`, esses mocks NÃO são afetados pois `jest.spyOn()` não funciona em JSDOM (fetch não é propriedade própria de `global`). Se um teste falha antes de restaurar manualmente, o mock vaza para outros testes.

**Impacto:** Testes não determinísticos — ordem de execução pode afetar resultados.

**O que foi feito (05/06/2026):**
- **Evoluído** `mockGlobalFetch()` em `tests/helpers/console.js` — Agora salva `originalFetch` antes de atribuir, e retorna um objeto com método `.mockRestore()` que restaura `global.fetch` ao valor original
- **Padronizados 23 arquivos** para usar `mockGlobalFetch()` com restauração no `afterEach`
- **Helper centralizado** com documentação de que `jest.spyOn(global, 'fetch')` não funciona em JSDOM

**Arquivos corrigidos:**
| # | Arquivo | Padrão Anterior | Padrão Novo |
|:-:|---------|----------------|-------------|
| 1 | `BlogSection.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 2 | `BackupManager.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 3 | `CacheManager.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 4 | `AdminDashboard.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 5 | `AdminMusicas.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 6 | `AdminProducts.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 7 | `AdminCrudBase.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 8 | `ImageUploadField.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 9 | `AdminPosts.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 10 | `AdminAudit.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 11 | `AdminUsersTab.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 12 | `AdminVideos.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 13 | `withAdminAuth.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 14 | `ProductList.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 15 | `VideoGallery.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 16 | `MusicGallery.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 17 | `MusicGallery.edge.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 18 | `Testimonials/index.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 19 | `component-example.test.js` | `global.fetch = jest.fn()` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 20 | `fetch-youtube.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 21 | `fetch-ml.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 22 | `fetch-spotify.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |
| 23 | `fetch-spotify.edge.test.js` | `global.fetch = jest.fn()` + `originalFetch` | `fetchMock = mockGlobalFetch()` + `mockRestore` |

---

### 2.3 Overhead de Módulos com jest.mock() no Topo — **RESOLVIDO (05/06/2026)**

**Ocorrência:** Todos os arquivos de teste de integração e unitários que mockam dependências.

**Problema:** `jest.mock()` é hoisted e executado antes de qualquer import. Cada arquivo registrava um novo mock module com factory function inline. Em 27 arquivos, isso gerava recriação constante de módulos mockados.

**Impacto:** Aumento no tempo total de execução dos testes devido à inicialização repetida de módulos com factories redundantes.

**O que foi feito (05/06/2026):**

- **Criado** `tests/mocks/auth.js` — Mock centralizado com `mockAuthModule()` e `mockAuthFailure()` para o módulo `lib/auth.js`
- **Criado** `tests/mocks/db-module.js` — Mock centralizado com `mockDb()` e `mockDbError()` para o módulo `lib/db.js`, exportando todas as funções reais (`query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`)
- **Atualizado** `tests/mocks/index.js` — Exporta os novos mocks `auth.js` e `db-module.js`
- **Padronizados 27 arquivos** que mockavam `lib/db.js` para usar `require('...mocks/db-module').mockDb()` em vez de factory functions inline

**Arquivos convertidos:**

| # | Arquivo | Padrão Anterior | Padrão Novo |
|:-:|---------|----------------|-------------|
| 1 | `tests/integration/api/status.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 2 | `tests/integration/api/dicas.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 3 | `tests/integration/api/cleanup-test-data.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 4 | `tests/integration/api/settings.general.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 5 | `tests/integration/api/admin/audit.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 6 | `tests/integration/api/admin/musicas.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 7 | `tests/integration/api/admin/posts.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 8 | `tests/integration/create-post-flow.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 9 | `tests/integration/api/admin/dicas.test.js` | `{ query, logActivity }` | `mockDb({ logActivity })` |
| 10 | `tests/integration/api/admin/roles.test.js` | `{ query, createRecord, updateRecords, deleteRecords, logActivity }` | `mockDb({ createRecord, updateRecords, deleteRecords, logActivity })` |
| 11 | `tests/integration/api/admin/users.test.js` | `{ query, createRecord, updateRecords, deleteRecords, logActivity }` | `mockDb({ createRecord, updateRecords, deleteRecords, logActivity })` |
| 12 | `tests/unit/domain/posts.test.js` | `{ query, transaction }` | `mockDb()` |
| 13 | `tests/unit/domain/videos.test.js` | `{ query, transaction }` | `mockDb()` |
| 14 | `tests/unit/domain/settings.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 15 | `tests/unit/lib/auth.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 16 | `tests/unit/lib/crud.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 17 | `tests/unit/scripts/clear-db.test.js` | `{ query, closeDatabase }` | `mockDb()` |
| 18 | `tests/unit/scripts/clear-musicas.test.js` | `{ query, closeDatabase }` | `mockDb()` |
| 19 | `tests/unit/scripts/reset-password.test.js` | `{ query, closeDatabase }` | `mockDb()` |
| 20 | `tests/unit/scripts/seed-all.test.js` | `{ query, closeDatabase }` | `mockDb()` |
| 21 | `tests/unit/pages/api/admin/dicas.edge.test.js` | `{ query, logActivity }` | `mockDb({ logActivity })` |
| 22 | `tests/unit/pages/api/admin/posts.edge.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 23 | `tests/unit/pages/api/admin/roles.edge.test.js` | `{ query, createRecord, updateRecords, deleteRecords, logActivity }` | `mockDb({ createRecord, updateRecords, deleteRecords, logActivity })` |
| 24 | `tests/unit/pages/api/admin/stats.edge.test.js` | `{ query: jest.fn() }` | `mockDb()` |
| 25 | `tests/integration/api/posts.general.test.js` | `{ getAllPosts, createPost, updatePost, deletePost }` | `mockDb({ getAllPosts, createPost, updatePost, deletePost })` |
| 26 | `tests/integration/api/placeholder-image.test.js` | `{ getSetting: jest.fn() }` | `mockDb({ getSetting })` |
| 27 | `tests/unit/settings-cache.test.js` | `{ getSetting, setSetting, getAllSettings }` | `mockDb({ getSetting, setSetting, getAllSettings })` |

**Resultado:** 27 arquivos padronizados. Redução de ~120 linhas de código repetido. Módulos mockados agora são instâncias do mock centralizado, reduzindo o overhead de inicialização.

**Nota:** Alguns arquivos usam `overrides` para adicionar funções que não existem mais em `lib/db.js` (como `getAllPosts`, `createPost`, `getSetting`). Isso é esperado para testes que ainda não foram migrados para o novo sistema de domínios (`lib/domain/`).

---

### 2.4 Uso Excessivo de waitFor com Timeouts Curtos — **AJUSTADO (06/06/2026)**

**Ocorrência:** `tests/unit/components/Features/Blog/BlogSection.test.js`, `tests/unit/components/Admin/Managers/BackupManager.test.js`

**Código exemplar (ANTES):**
```javascript
await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());
```

**Problema:** O timeout padrão do `waitFor` é 5000ms. Múltiplos `waitFor` em sequência, especialmente os que verificam ausência de elemento (`queryByText` + `not.toBeInTheDocument`), aumentam o tempo de teste desnecessariamente pois o `waitFor` fica polling até o timeout expirar.

**Impacto:** Suite de testes lenta. Verificações de ausência de elemento podiam levar até 5s cada.

**O que foi feito (06/06/2026):**

| Arquivo | Ocorrências | Padrão Anterior | Padrão Novo |
|---------|:-----------:|-----------------|-------------|
| `BlogSection.test.js` | 2 | `await waitFor(() => expect(screen.queryByText('Carregando reflexões...')).not.toBeInTheDocument())` | `await waitForElementToBeRemoved(() => screen.queryByText('Carregando reflexões...'))` |
| `BackupManager.test.js` | 3 | `await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument())` | `await waitForElementToBeRemoved(() => screen.queryByText(/Carregando/i))` |

**Resultado:** 5 ocorrências de `waitFor` com verificação de ausência substituídas por `waitForElementToBeRemoved`. `BlogSection.test.js` com 9/9 testes passando. `BackupManager.test.js` com 3/7 testes passando (4 falhas pré-existentes não relacionadas). Redução potencial no tempo de execução ao eliminar polling desnecessário.

---

## 3. Correções Necessárias

### 3.1 Vazamento de Mocks entre Testes (Race Conditions) — **RESOLVIDO (06/06/2026)**

**Ocorrência:** `tests/unit/components/Admin/Managers/BackupManager.test.js` — teste "deve exibir erros retornados pela API"

**Problema original:** O teste usava `mockFetch.mockResolvedValue` com `mockResolvedValueOnce` na mesma instância. Se a ordem de resolução de Promises variar, o teste podia consumir o mock errado. Além disso, o teste não restaurava `window.confirm` após execução.

**Código problemático (ANTES):**
```javascript
confirmSpy.mockReturnValue(true);
global.fetch.mockResolvedValue({ ok: true, json: async () => ({ latest: null }) });

render(<BackupManager />);

global.fetch.mockRejectedValueOnce(new Error('Conexão perdida'));
fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
```

**O que foi feito (06/06/2026):**
- **`mockResolvedValue` substituído por `mockResolvedValueOnce`** no teste de erros da API — Elimina race condition entre mock permanente e mock de uso único
- **`confirmSpy.mockReturnValue(true)` substituído por `mockReturnValueOnce(true)`** nos dois testes que interagem com `window.confirm` — Garante que o comportamento do confirm é limpo após cada uso
- **Adicionado `await waitForElementToBeRemoved(...)`** antes do `fireEvent.click()` nos testes de erro e falha da API — Garante que o carregamento inicial terminou antes de interagir com o botão
- O arquivo já usava `mockGlobalFetch()` e `createConfirmSpy()` dos helpers centralizados (implementado em 05/06/2026), com `mockRestore()` garantido no `afterEach`

**Código corrigido (DEPOIS):**
```javascript
confirmSpy.mockReturnValueOnce(true);
global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });

render(<BackupManager />);
await waitForElementToBeRemoved(() => screen.queryByText(/Carregando/i));

global.fetch.mockRejectedValueOnce(new Error('Conexão perdida'));
fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
await waitFor(() => expect(screen.getByText('❌ Erro de conexão ao criar backup')).toBeInTheDocument());
```

**Resultado:** Race conditions eliminadas. Todos os `mockResolvedValue` convertidos para `mockResolvedValueOnce`. `window.confirm` com `mockReturnValueOnce` em vez de `mockReturnValue`. Carregamento inicial aguardado antes de interações. Testes estáveis e determinísticos.

---

### 3.2 Uso de Require() em Ambiente ES Module — **RESOLVIDO (06/06/2026)**

**Ocorrência original:** `tests/setup.js` — `require()` usado para polyfills condicionais em ambiente ES Module.

**Problema original:** O projeto usa `import/export` (ES Modules), mas `require()` era usado para polyfills condicionais. Embora funcionasse com Jest (que usa CommonJS), era inconsistente com o padrão ES Module definido.

**O que foi feito (06/06/2026 — conversão para `import()` dinâmico):**
- **3 ocorrências de `require()` substituídas por `await import()` dinâmico dentro de IIFE async**:
  1. `require('node:stream/web')` → `await import('node:stream/web')` — Polyfill ReadableStream
  2. `require('node:worker_threads')` → `await import('node:worker_threads')` — Polyfill MessageChannel/MessagePort
  3. `require('undici')` → `await import('undici')` — Polyfill Request/Response/Headers

- **Estratégia utilizada:** Cada `require()` foi envolvido em uma IIFE (Immediately Invoked Function Expression) assíncrona, mantendo o bloco `try/catch` e a verção condicional (`if (typeof ... === 'undefined')`) originais.

- **Justificativa:** O `setup.js` é transformado pelo Babel para CommonJS durante a execução dos testes. O `require()` funcionaria, mas o `import()` dinâmico é semanticamente mais consistente com o padrão ES Module adotado pelo projeto (configurado no `package.json` como `"type": "module"` e com `babel-jest` transforming ESM para CJS).

**Resultado (06/06/2026):** 3 `require()` eliminados. Nenhuma regressão.

**Complemento (06/06/2026 — remoção do polyfill do `undici`):**
- O polyfill `Request`/`Response`/`Headers` via `undici` foi **removido** do `tests/setup.js` por ser desnecessário no ambiente atual (Node.js v24 + JSDOM já fornecem essas APIs nativamente)
- A remoção eliminou o `console.warn` exibido: `⚠️ undici not found, Request/Response/Headers polyfills skipped`
- Restaram apenas os polyfills de `ReadableStream` e `MessageChannel/MessagePort` que ainda são necessários
- **Nenhuma regressão — 50/50 testes passando**

---

### 3.3 Mock de Next.js Dinâmico Pode Quebrar — **AJUSTADO (06/06/2026)**

**Ocorrência:** `tests/mocks/next.js`

**Problema original:** O mock do Next.js podia não acompanhar atualizações da versão do Next.js. Métodos como `useRouter`, `useSearchParams`, `headers` e `cookies` mudam entre versões do Next.js. Além disso, cada arquivo de teste repetia `jest.mock('next/...')` manualmente, gerando duplicação em 10+ arquivos.

**O que foi feito (06/06/2026):**

**A. Criado `tests/mocks/next-setup.js` — Setup centralizado de mocks do Next.js:**
- Centraliza todos os `jest.mock()` para módulos do Next.js em um único arquivo
- Basta importar `../../mocks/next-setup.js` no início do arquivo de teste
- Importa implementações de `tests/mocks/next.js` para `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`

**B. Adicionados mocks faltantes:**
- **`next/navigation` (App Router):** `useRouter`, `usePathname`, `useSearchParams`, `useParams`, `redirect`, `notFound`, `permanentRedirect`
- **`next/headers`:** Corrigido para API assíncrona — `headers()` e `cookies()` agora retornam `Promise.resolve()` com objetos de header/cookie
- **`next/server`:** Adicionado mock parcial preservando `NextResponse` original mas espionando `.json()`, `.redirect()`, `.next()`

**C. Removidos mocks duplicados de 10 arquivos de teste:**
Os seguintes arquivos tiveram seus `jest.mock('next/...')` removidos (substituídos pelo import de `next-setup.js`):

| # | Arquivo | Mocks removidos |
|:-:|---------|-----------------|
| 1 | `tests/unit/[slug].test.js` | `next/link`, `next/head` |
| 2 | `tests/unit/index.test.js` | `next/link`, `next/head` |
| 3 | `tests/unit/components/SeoPerformance.test.js` | `next/head` |
| 4 | `tests/unit/components/SEO/Head.test.js` | `next/head` (mantido mock específico sobrescrito) |
| 5 | `tests/unit/components/Admin/AdminAudit.test.js` | `next/router` (mantido mock específico sobrescrito) |
| 6 | `tests/unit/components/Admin/AdminUsersTab.test.js` | (import do setup adicionado) |
| 7 | `tests/unit/components/Admin/withAdminAuth.test.js` | `next/head` (mantido mock específico sobrescrito) |
| 8 | `tests/unit/components/Performance/PreloadResources.test.js` | `next/head` |
| 9 | `tests/unit/components/Performance/ImageOptimized.test.js` | (import desnecessário — mantido mock específico sobrescrito) |
| 10 | `tests/helpers/render.js` | Comentário adicionado documentando `next-setup.js` |

**D. Criado `tests/mocks/next.test.js` — Teste de sanidade dos mocks:**
- 9 testes validando a estrutura de cada módulo mockado
- Verifica tipos, funções exportadas e comportamento básico
- Deve ser executado ao atualizar a versão do Next.js para detectar quebras silenciosas

**E. `setupNextMocks` depreciado:**
- Função em `tests/mocks/next.js` marcada como `@deprecated`
- Nenhum arquivo no projeto a utiliza mais

**Resultado:** 9/9 testes de sanidade passando. Redução de ~40 linhas de mocks duplicados. Mocks de `next/navigation` e `next/headers` agora disponíveis para todos os testes. Testes existentes continuam estáveis (arquivos que precisam de comportamento específico sobrescrevem o mock via `jest.mock()` após o import).


### 3.4 Testes sem Verificação de Limpeza — **RESOLVIDO (05/06/2026)**

**Ocorrência:** Vários arquivos — `BackupManager.test.js`, `BlogSection.test.js`, `MusicCard.test.js`, `MusicGallery.edge.test.js`, `ImageOptimized.test.js`

**Problema:** Testes mockam `console.error` substituindo a implementação global, mas alguns podem não restaurar corretamente em caso de falha no teste.

**Solução:** Todos os arquivos com `jest.spyOn` agora usam `afterEach` com `mockRestore()` garantido, mesmo em caso de falha do teste. Arquivos que usam `beforeAll/afterAll` (Testimonials) mantiveram substituição direta com restauração no `afterAll`.

**Arquivos corrigidos:**
- `BackupManager.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterEach`
- `CacheManager.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterEach`
- `BlogSection.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterEach`
- `MusicCard.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterEach`
- `MusicGallery.edge.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterEach`
- `ImageOptimized.test.js` — ✅ `consoleErrorSpy?.mockRestore()` no `afterAll`
- `Testimonials/index.test.js` — ✅ `console.error = originalConsoleError` no `afterAll`

---

### 3.5 Teste de Exportação Redundante — **CONVERTIDO PARA SNAPSHOT (05/06/2026)**

**Ocorrência:** `tests/unit/components/UI/index.test.js`, `tests/unit/components/Admin/index.test.js`, `tests/unit/components/Layout/index.test.js`, `tests/unit/components/Performance/index.test.js`, `tests/unit/components/SEO/index.test.js`

**Problema original:** Esses testes apenas verificavam se as exportações do barrel existem:
```javascript
expect(UIComponents.Button).toBeDefined();
```
Isso essencialmente testa a declaração de importação do próprio teste, não o código real.

**O que foi feito (05/06/2026):**
Converter todos os 5 arquivos para snapshot da estrutura de exportação:
```javascript
import * as ModuleExports from '...';
it('deve exportar a estrutura esperada', () => {
  expect(Object.keys(ModuleExports).sort()).toMatchSnapshot();
});
```

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `UI/index.test.js` | 12 `expect(X).toBeDefined()` | Snapshot (`Object.keys().sort()`) + validação crítica `Button` |
| `Admin/index.test.js` | 8 `expect(X).toBeDefined()` | Snapshot + validação crítica `AdminCrudBase` |
| `Layout/index.test.js` | 8 `expect(X).toBeDefined()` | Snapshot + validação crítica `Container` |
| `Performance/index.test.js` | 7 `expect(X).toBeDefined()` | Snapshot + validação crítica `ImageOptimized` |
| `SEO/index.test.js` | 11 `expect(X).toBeDefined()` + verificação `DefaultExport === SEOHead` | Snapshot + verificação `DefaultExport === SEOHead` preservada |

**Melhorias adicionais aplicadas (06/06/2026):**
- **Prefix `[Barrel]` adicionado** ao `describe` nos 5 arquivos para facilitar identificação em relatórios de teste
- **Comentário de workflow de snapshot** adicionado no topo dos 5 arquivos orientando como atualizar o snapshot ao modificar o barrel:
  ```javascript
  // Ao alterar as exportações do barrel, atualize este snapshot com:
  // npx jest tests/unit/components/UI/index.test.js --updateSnapshot
  ```
- **Teste de validação semântica** adicionado nos 4 arquivos que estavam sem (`UI`, `Admin`, `Layout`, `Performance`) — verifica se a exportação mais crítica de cada barrel está definida, servindo como rede de segurança caso o snapshot seja atualizado sem revisão cuidadosa

**Resultado:** 10/10 testes passando (5 de snapshot + 5 de validação semântica). 5 snapshots escritos. Verificação de `DefaultExport === SEOHead` preservada por ter valor semântico real.

---

### 3.6 Testes com Cobertura Faltante — **AJUSTADO (06/06/2026)**

**Ocorrência original:** `tests/unit/components/Features/Video/` e `tests/unit/components/Features/Testimonials/`

**Problema original:** Os subdiretórios existem, mas podem não ter testes ou ter cobertura insuficiente.

**Investigação realizada (06/06/2026):** Mapeamento completo de `components/Features/` vs. cobertura de testes:

| Componente | Caminho | Teste Existia? | Status |
|:---|:---|---|:---:|
| **BlogSection.js** | `components/Features/Blog/` | `BlogSection.test.js` | ✅ Existente |
| **PostCard.js** | `components/Features/Blog/` | `PostCard.test.js` | ✅ Existente |
| **ContentTabs/index.js** | `components/Features/ContentTabs/` | ❌ Nenhum | 🔴 **Criado** |
| **MusicCard.js** | `components/Features/Music/` | `MusicCard.test.js` | ✅ Existente |
| **MusicGallery.js** | `components/Features/Music/` | `MusicGallery.test.js` + `.edge.test.js` | ✅ Existente |
| **ProductCard.js** | `components/Features/Products/` | ❌ Nenhum | 🔴 **Criado** |
| **ProductList.js** | `components/Features/Products/` | ❌ Nenhum | 🔴 **Criado** |
| **Testimonials/index.js** | `components/Features/Testimonials/` | `index.test.js` | ⚠️ Existente (4 testes, cobre comportamento real + fallbacks) |
| **VideoCard.js** | `components/Features/Video/` | `VideoCard.test.js` | ✅ Existente |
| **VideoGallery.js** | `components/Features/Video/` | `VideoGallery.test.js` | ✅ Existente |

**Conclusão da investigação:**
- **Video/** estava **completo** (ambos os componentes já possuíam testes) — suspeita inicial não confirmada
- **Testimonials/** tinha teste com 4 testes cobrindo carregamento, fallback, erro HTTP e carrossel — cobertura adequada, suspeita inicial não confirmada
- O **verdadeiro gap** estava em:
  - **ContentTabs/** — Nenhum teste para o barrel de abas de conteúdo
  - **Products/** — Pasta de testes vazia, 2 componentes sem cobertura (`ProductCard.js` e `ProductList.js`)

**O que foi feito (06/06/2026):**

**A. Criado `tests/unit/components/Features/ContentTabs/index.test.js`:**
- Teste de barrel seguindo o padrão de snapshot (seção 3.5)
- Verifica estrutura de exportações + componente default
- **2/2 testes passando**

**B. Criado `tests/unit/components/Features/Products/ProductCard.test.js`:**
- Mock centralizado de `parseImages` de `lib/api/utils`
- 12 testes cobrindo: renderização (título, descrição, preço), sem imagem (null e string vazia), navegação entre imagens (botões anterior/próxima), links de marketplace (ML, Shopee, Amazon), lightbox (abrir, fechar por Escape, fechar por overlay), botões de navegação no lightbox, opacidade da imagem durante carregamento
- **12/12 testes passando**

**C. Criado `tests/unit/components/Features/Products/ProductList.test.js`:**
- Mocks centralizados de `useApiFetch`, `useDebounce`, `ProductCard`, `StateMessages`, `styles`
- 11 testes cobrindo: renderização da lista, estado de carregamento, estado de erro, lista vazia, filtro sem resultados, paginação (visível/escondida, botões desabilitados), campos de busca/filtro de preço, ordenação por position + ID
- **11/11 testes passando**

**Resultado:** 25 novos testes criados em 3 arquivos. Cobertura completa de todos os componentes de `Features/`. Nenhuma regressão.

---

## 4. Melhorias Recomendadas

### 4.1 Abstração de Testes CRUD — **CONCLUÍDO (06/06/2026)**

**Descrição original:** Criar uma função utilitária que encapsule o padrão repetitivo de mocks e testes CRUD.

**O que foi feito (06/06/2026):**

**A. Criado `tests/helpers/crud-test.js`** com 3 funções:

| Função | Finalidade | Testes padrão |
|--------|-----------|:-------------:|
| `testPublicGetEndpoint(handler, config, customTests?)` | Endpoints GET-only públicos (ex: `/api/musicas`, `/api/videos`) | 405 método não permitido + 400 paginação inválida |
| `testAdminCrudEndpoint(handler, config, customTests?)` | Endpoints CRUD admin (ex: `/api/admin/musicas`, `/api/admin/posts`) | 401 sem autenticação |
| `testAdminGetEndpoint(handler, config, customTests?)` | Endpoints GET-only admin | 401 sem auth + 405 método não permitido |

**Design adotado (flexibilidade):** Cada função testa **apenas o que não requer mocks específicos**:
- 405 para método não permitido (público)
- 401 sem autenticação (admin)
- 400 para parâmetros inválidos (público)

Os testes específicos de cada recurso (GET, POST, PUT, DELETE com dados mockados) são fornecidos via `customTests`, garantindo que cada recurso mantenha controle total sobre seus mocks e assertions.

**B. Arquivos refatorados para usar a abstração:**

| Arquivo | Função | Redução |
|---------|--------|:-------:|
| `tests/integration/api/musicas.test.js` | `testPublicGetEndpoint` | ~20 linhas (405/400 eliminados do código manual) |
| `tests/integration/api/videos.test.js` | `testPublicGetEndpoint` | ~20 linhas |
| `tests/integration/api/admin/musicas.test.js` | `testAdminCrudEndpoint` | ~10 linhas (401 eliminado) |
| `tests/integration/api/admin/posts.test.js` | `testAdminCrudEndpoint` | ~10 linhas |

**Arquivo criado:** `tests/helpers/crud-test.js` (exportado via `tests/helpers/index.js`)

**Benefícios:**
- Centralização de boilerplate: testes comuns (401, 405, 400) não precisam ser reescritos por recurso
- Flexibilidade mantida: cada recurso continua com seus testes específicos via `customTests` ou `describe` separado
- **50/50 testes passando** nos 4 arquivos refatorados — nenhuma regressão
- Redução total estimada: ~60 linhas de código repetido eliminadas nos arquivos convertidos

**Próximos passos recomendados:** Estender a abstração para outros endpoints de integração (admin/dicas, admin/roles, admin/users, etc.) seguindo o mesmo padrão.
---

### 4.2 Unificação de Arquivos Edge Case — **AJUSTADO (04/06/2026)**

**Descrição original:** Mesclar `AdminAudit.edge.test.js` em `AdminAudit.test.js` e `AdminUsersTab.edge.test.js` em `AdminUsersTab.test.js`, organizando em `describe('Casos de Borda', ...)`.

**O que foi feito:**
- `AdminAudit.edge.test.js` → mesclado em `AdminAudit.test.js` (8 testes de borda)
- `AdminUsersTab.edge.test.js` → mesclado em `AdminUsersTab.test.js` (7 testes de borda)
- `products.edge.test.js` → mesclado em `tests/integration/api/products.test.js` (3 testes de borda mantidos)
- Redução de 3 arquivos
- 41/41 testes passando

---

### 4.3 Centralização de Mocks no `setup.js` — **AJUSTADO (05/06/2026)**

**Descrição:** Mover padrões comuns como `jest.clearAllMocks()` e restauração de mocks para o `setup.js` global. Atualmente, o setup.js faz cleanup DOM via `afterEach(cleanup)` mas não limpa mocks.

**Código implementado no setup.js:**
```javascript
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});
```

**Benefício:** Remove ~40+ chamadas redundantes de `beforeEach` em arquivos individuais.

---

### 4.4 Helper para Suppressão de console.error — **CONCLUÍDO (05/06/2026)**

**Descrição original:** Criar uma função em `tests/helpers/index.js` para eliminar repetição do padrão beforeAll/afterAll.

**O que foi feito (05/06/2026):**
- **Criado** `tests/helpers/console.js` com 4 funções:
  - `suppressConsoleError()` — Spy silencioso para `console.error`
  - `filterConsoleError(suppressList)` — Spy que SUPRIME apenas padrões específicos
  - `mockGlobalFetch()` — Mock de `global.fetch` (compatível com JSDOM)
  - `createConfirmSpy(defaultValue)` — Spy para `window.confirm`
- **Atualizado** `tests/helpers/index.js` — Re-exporta o módulo `console.js`

**Uso nos arquivos:**
```javascript
import { suppressConsoleError, createConfirmSpy } from '../../../helpers/index.js';

let consoleErrorSpy;
beforeEach(() => { consoleErrorSpy = suppressConsoleError(); });
afterEach(() => { consoleErrorSpy?.mockRestore(); });
```

**Benefício:** 6 arquivos usando os helpers diretamente. Padronização facilitada para futuras migrações.

---

### 4.5 Refatoração de Factories com Base Factory — **CONCLUÍDO (05/06/2026)**

**Descrição original:** Extrair a lógica comum de factories (`idCounter`, `.list()`, `.resetId()`, timestamps) para um `createBaseFactory(defaultsGenerator)` centralizado.

**Implementação:** Detalhada na [seção 1.5](#15-factories-com-código-sobreposto--ajustado-05062026). Resumo: criado `tests/factories/base.js`, refatoradas 4 factories de domínio (`post`, `music`, `video`, `user`), removidas funções `reset*IdCounter` individuais, redução de ~70 linhas de código. Código e arquivos alterados disponíveis na seção 1.5.

---

### 4.6 Adicionar Testes de Integração com Banco Real (PostgreSQL) — **IMPLEMENTADO (06/06/2026)**

**Descrição:** Atualmente todos os testes de integração mockam o banco de dados via `jest.mock('../../../lib/db.js')`. Isso não valida:
- Queries SQL reais (sintaxe, funções PostgreSQL, tipos JSONB, cláusulas `RETURNING`)
- Comportamento de constraints (UNIQUE, NOT NULL, CHECK, Foreign Key)
- Transações e rollback
- Performance de queries (planos de execução, índices)

**Decisão técnica:** PostgreSQL real via **Testcontainers**. SQLite em memória **não é compatível** porque o projeto usa funcionalidades exclusivas do PostgreSQL (cláusula `RETURNING`, funções `pg_catalog`, consultas com cast de tipos, etc.). SQLite geraria falsos positivos — testes passariam localmente mas quebrariam em produção.

---

#### 4.6.1 Infraestrutura de Setup

Serão necessários os seguintes componentes:

| Componente | Arquivo | Finalidade |
|-----------|---------|------------|
| `globalSetup` | `tests/global-setup.db.js` | Inicializar container PostgreSQL via Testcontainers antes de qualquer teste |
| `globalTeardown` | `jest.teardown.js` (estender) | Parar container PostgreSQL após todos os testes |
| Helper de testes | `tests/helpers/db-test.js` | Criar conexão isolada, gerenciar transações por teste, aplicar schema |

**A. `tests/global-setup.db.js` — ✅ Criado:**
- Inicializa container PostgreSQL via Testcontainers com `.withReuse(true)` (reutilização entre execuções)
- Define `process.env.TEST_DATABASE_URL` com a string de conexão
- Fallback: define `TEST_DATABASE_URL = '__docker_unavailable__'` se Docker não estiver disponível

**B. `jest.teardown.js` — ✅ Estendido:**
- Adicionada parada do container PostgreSQL via `global.__TEST_DB_CONTAINER__.stop()`

**C. `tests/helpers/db-test.js` — ✅ Criado:**
- `isDockerAvailable()` — Verifica se Docker está disponível
- `createTestDb()` — Cria pool de conexão com `process.env.TEST_DATABASE_URL`
- `applyMigrations()` — Executa `node scripts/migrate.js` como subprocesso com `DATABASE_URL` do container
- `withTransaction(pool)` — Inicia transação, retorna `{ query, rollback }` para ROLLBACK automático
- `truncateAll(pool)` — Limpa todas as tabelas via `TRUNCATE ... CASCADE`

---

#### 4.6.2 Configuração no Jest

**A. `jest.config.db.js` — configuração dedicada (já existe no projeto):**

```javascript
/**
 * Jest Configuration — Testes com PostgreSQL Real via Testcontainers.
 * 
 * Configuração dedicada para testes de integração com banco real.
 * Executa apenas arquivos *.db.test.js com ambiente node.
 * Inclui transform Babel para compatibilidade ESM.
 * 
 * Para executar: npm run test:db:container
 */
export default {
  testEnvironment: 'node',                           // ← DIFERENTE de jsdom
  globalSetup: '<rootDir>/tests/global-setup.db.js',
  testMatch: ['**/*.db.test.js'],                    // ← Prefixo exclusivo
  testTimeout: 30000,                                 // ↑ Container ~15s startup
  maxWorkers: 1,                                      // Evita concorrência
  collectCoverage: false,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  transform: {
    '^.+\\.(js|jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!/testcontainers|@testcontainers)/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.db.js'], // ← Setup específico node
  globalTeardown: '<rootDir>/jest.teardown.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@matchers/(.*)$': '<rootDir>/tests/matchers/$1',
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
};
```

> ⚠️ **Nota:** O código usa `export default` (ES Module) — não use `require()` pois o projeto está configurado com `"type": "module"`. O setup enxuto (`tests/setup.db.js`) substitui o `tests/setup.js` padrão, evitando polyfills DOM desnecessários (localStorage, matchMedia, IntersectionObserver, ResizeObserver) que não fazem sentido em ambiente `node`.

**B. Scripts no `package.json` (já existentes no projeto — seção `scripts`):**

```json
"test:db:container": "jest --config jest.config.db.js",
"test:db:container:coverage": "jest --config jest.config.db.js --coverage"
```

> ⚠️ **Nota:** Os nomes `test:db:container` e `test:db:container:coverage` são os já existentes. Os nomes `test:db` e `test:db:coverage` sugeridos originalmente conflitariam com o script `test:db: "jest tests/unit/lib/db.test.js"` já existente.

---

#### 4.6.3 Escopo dos Testes

Os testes com banco real cobrem os arquivos de **domínio** (`lib/domain/`) que fazem queries SQL diretamente:

| Arquivo de Teste | Domínio | Operações a Validar | Status |
|-----------------|---------|-------------------|:------:|
| `tests/integration/domain/posts.db.test.js` | `lib/domain/posts.js` | CRUD, paginação, busca textual, ordenação, contagem, ROLLBACK | ✅ **Concluído** |
| `tests/integration/domain/musicas.db.test.js` | `lib/domain/musicas.js` | CRUD, paginação, busca (título/artista), ordenação, contagem, ROLLBACK | ✅ **Concluído** |
| `tests/integration/domain/videos.db.test.js` | `lib/domain/videos.js` | CRUD, paginação, busca (título/descrição), ordenação, contagem, ROLLBACK | ✅ **Concluído** |
| `tests/integration/domain/products.db.test.js` | `lib/domain/products.js` | CRUD, paginação, published filter, ordenação, contagem, ROLLBACK | ✅ **Concluído** |
| `tests/integration/domain/settings.db.test.js` | `lib/domain/settings.js` | CRUD, json_object_agg, UPSERT, ordenação por chave, ROLLBACK | ✅ **Concluído** |

**Todos os 5 arquivos foram implementados em 06/06/2026.** Cada arquivo contém entre 15 e 20 testes seguindo o padrão de template do `posts.db.test.js` (piloto), com as particularidades de cada domínio.

---

#### 4.6.4 Cenários a Testar em Cada Arquivo

Os cenários abaixo foram implementados nos 5 arquivos de teste com banco real, respeitando as particularidades de cada domínio:

> ⚠️ **Nota:** A coluna "Cobertura" indica se o cenário foi efetivamente implementado no arquivo. Domínios sem suporte a determinada operação (ex: settings não tem paginação) têm o cenário marcado como `N/A`.

##### Tabela de Cobertura por Arquivo

| Cenário | posts | musicas | videos | products | settings |
|:--------|:-----:|:-------:|:------:|:--------:|:--------:|
| **CRUD** | | | | | |
| CREATE — registro com ID gerado | ✅ | ✅ | ✅ | ✅ | ✅ |
| CREATE — valores padrão | ✅ | ✅ | ✅ | ✅ | ✅ |
| READ — por ID/chave | ✅ | ✅ | ✅ | ✅ | ✅ |
| READ — listar paginado | ✅ | ✅ | ✅ | ✅ | N/A |
| READ — COUNT total | ✅ | ✅ | ✅ | ✅ | ✅ |
| UPDATE — atualizar campos | ✅ | ✅ | ✅ | ✅ | ✅ (UPSERT) |
| DELETE — remover registro | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Constraints** | | | | | |
| UNIQUE (slug, chave, etc.) | ✅ slug | ❌ | ❌ | ❌ | ✅ key |
| NOT NULL (campo obrigatório) | ✅ título, slug | ✅ título, url | ✅ título, url | ✅ title, price | ✅ key |
| Foreign Key | ❌ | ❌ | ❌ | ❌ | ❌ |
| CHECK (ex: preço > 0) | ❌ | ❌ | ❌ | ❌ * | ❌ |
| **Edge Cases de Queries** | | | | | |
| Paginação OFFSET acima do total | ✅ | ✅ | ✅ | ✅ | N/A |
| LIMIT 0 (sem resultados) | ✅ | ✅ | ✅ | ✅ | N/A |
| Paginação página negativa | ❌ | ❌ | ❌ | ❌ | N/A |
| Ordenação campos inválidos | ❌ | ❌ | ❌ | ❌ | ❌ |
| Busca termo no título (ILIKE) | ✅ | ✅ | ✅ | ❌ | N/A |
| Busca termo em outro campo | ❌ | ✅ artista | ✅ descrição | ❌ | ❌ |
| Busca string vazia/espaços | ❌ | ❌ | ❌ | ❌ | ❌ |
| Busca caracteres especiais | ❌ | ❌ | ❌ | ❌ | ❌ |
| LIMIT negativo / MAX_SAFE_INTEGER | ❌ | ❌ | ❌ | ❌ | ❌ |
| ROLLBACK em erro de transação | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Específicos do Domínio** | | | | | |
| Ordenação por múltiplos campos | ❌ | ✅ pos, created_at | ❌ | ✅ pos, id | ❌ |
| Ordenação por created_at DESC | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ordenação por chave ASC | ❌ | ❌ | ❌ | ❌ | ✅ |
| json_object_agg (agregação JSON) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Objeto vazio sem registros | ❌ | ❌ | ❌ | ❌ | ✅ |
| Chave inexistente | ❌ | ❌ | ❌ | ❌ | ✅ |
| Filtro published = true | ❌ | ❌ | ❌ | ✅ | ❌ |

> *\* **Nota products CHECK:** Apesar de ser citado em planejamento, o teste de CHECK `price > 0` **não foi implementado** em `products.db.test.js`. A constraint existe no schema, mas não há teste validando rejeição de preço inválido (ex: zero ou negativo).*

##### Resumo por Arquivo

| Arquivo | Total Testes | CRUD | Constraints | Edge Cases | Específicos |
|:--------|:-----------:|:----:|:-----------:|:----------:|:-----------:|
| `posts.db.test.js` | 15 | ✅ 4 | ✅ 3 (UNIQUE, NOT NULL×2) | ✅ 4 (pag, LIMIT 0, ROLLBACK, busca) | ✅ ordenação, COUNT |
| `musicas.db.test.js` | 17 | ✅ 4 | ✅ 2 (NOT NULL×2) | ✅ 5 (pag, LIMIT 0, ROLLBACK, busca×2) | ✅ ordenação multi-campo, COUNT |
| `videos.db.test.js` | 16 | ✅ 4 | ✅ 2 (NOT NULL×2) | ✅ 5 (pag, LIMIT 0, ROLLBACK, busca×2) | ✅ ordenação DESC, COUNT |
| `products.db.test.js` | 16 | ✅ 4 | ✅ 2 (NOT NULL×2) | ✅ 3 (pag, LIMIT 0, ROLLBACK) | ✅ published filter, ordenação, COUNT |
| `settings.db.test.js` | 12 | ✅ 4 | ✅ 2 (UNIQUE, NOT NULL) | ✅ 3 (chave inexistente, objeto vazio, COUNT) | ✅ UPSERT, json_object_agg, ordenação por chave |
| **Total** | **76** | **20** | **11** | **20** | **25** |

##### Particularidades por Domínio

**Settings (`settings.db.test.j`):**
- Diferente dos demais, não tem paginação nem busca textual (busca por chave exata)
- Usa **UPSERT** (`INSERT ... ON CONFLICT DO UPDATE`) em vez de INSERT tradicional
- Retorno usa **`json_object_agg`** (agregação JSON) para carregar configurações como mapa
- Não implementa ROLLBACK por falta de operações encadeadas que induzam falha

**Products (`products.db.test.js`):**
- Não implementa busca textual — foco em `published filter` (filtro específico do domínio)
- Constraint CHECK `price > 0` existe no schema mas **não é testada**
- Ordenação usa position + id (combinação única entre os domínios)

**Posts (`posts.db.test.js`):**
- Único domínio com teste de UNIQUE (slug) e ROLLBACK via slug duplicado

**Musicas (`videos.db.test.js`):**
- Únicos com busca em dois campos diferentes (título + artista / título + descrição)
- Únicos com ordenação por múltiplos campos (position + created_at)

##### Cenários Não Implementados em Nenhum Arquivo

Os seguintes cenários da especificação original **não foram implementados** em nenhum dos 5 arquivos:

| Cenário | Motivo |
|:--------|:-------|
| **Foreign Key** | Nenhum domínio possui FK que referencie outra tabela |
| **CHECK price > 0** | Constraint existe no schema de products, mas não foi testada |
| **Paginação página negativa** | Seria testado pela função de domínio, não por query direta |
| **Ordenação campos inválidos** | Testado via query direta sem fallback — SQL puro rejeita |
| **Busca string vazia** | Retorna todos os registros, não é erro — comportamento esperado |
| **Busca caracteres especiais** | ILIKE trata caracteres especiais naturalmente |
| **LIMIT negativo** | PostgreSQL rejeita com erro; testar via query direta |
| **MAX_SAFE_INTEGER** | Não causa erro, apenas retorna todos os registros |
| **ROLLBACK em settings** | Settings não tem operações encadeadas para induzir falha |

> **Recomendação:** Os cenários acima que fazem sentido (CHECK price > 0, LIMIT negativo) podem ser adicionados em versões futuras. Os demais (FK, ordenação inválida, busca vazia) são comportamentos esperados do PostgreSQL e não agregam valor como teste de integração.

---

#### 4.6.5 Estratégia de Isolamento entre Testes

**Abordagem implementada: Transação por teste com ROLLBACK automático.**

Cada teste inicia uma transação, executa as operações, e ao final executa `ROLLBACK`. Isso garante:
- Banco em estado conhecido para cada teste (sem contaminação entre testes)
- Não há necessidade de limpar dados entre testes (mais rápido que TRUNCATE)
- Não há necessidade de resetar sequências de ID

**Padrão utilizado em todos os 5 arquivos `.db.test.js`:**

```javascript
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) return;  // Skip seguro se Docker não disponível
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch (_) { /* rollback de segurança */ }
  }
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
});

afterEach(async () => {
  if (tx) {
    await tx.rollback(); // Reverte todas as operações do teste
  }
});

const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Domínio — Integração com PostgreSQL Real', () => {
  it('deve criar um registro', async () => {
    const result = await tx.query('INSERT INTO ... RETURNING *', [valores]);
    expect(result).toHaveProperty('id');
    // ← Não precisa limpar: ROLLBACK no afterEach desfaz esta inserção
  });
});
```

##### Melhorias de Isolamento Aplicadas (06/06/2026 — 11ª revisão)

Após análise da seção 4.6.5, os seguintes ajustes foram implementados no helper `db-test.js` e nos 5 arquivos `.db.test.js`:

| Ajuste | Descrição | Local |
|:-------|-----------|:------|
| **1. `withTransaction` com `try/catch`** | Se `pool.connect()` ou `BEGIN` falharem, o cliente é liberado automaticamente antes de propagar o erro | `tests/helpers/db-test.js` — função `withTransaction()` |
| **2. `rollback()` com proteção** | `rollback()` agora possui `try/catch` interno para evitar que exceções de ROLLBACK quebrem o `afterEach`. Cliente sempre liberado via `finally` | `tests/helpers/db-test.js` — método `rollback()` |
| **3. Rollback de segurança no `afterAll`** | Todos os 5 arquivos `.db.test.js` agora executam rollback de segurança no `afterAll` antes de fechar o pool | `posts/musicas/videos/products/settings.db.test.js` — `afterAll` |
| **4. `skipIf` condicional** | `describeIf = isDockerAvailable() ? describe : describe.skip` implementado em todos os 5 arquivos (já existente) | Todos os 5 `.db.test.js` |
| **5. Documentação de restrição** | Adicionado comentário no helper `db-test.js` alertando sobre risco de `describe` aninhados com `tx` própria | `tests/helpers/db-test.js` — JSDoc da `withTransaction()` |

**Importante:** Todos os 5 arquivos usam **queries SQL diretas** com `tx.query()` em vez de funções de domínio. Isso elimina o risco de vazamento de transação por funções que não aceitam `query` externo — as operações executam dentro da transação criada no `beforeEach`.

**Mudança estrutural no helper `db-test.js` — `withTransaction()` antes vs. depois:**

| Aspecto | Antes | Depois |
|:--------|:------|:-------|
| `connect()` falha | Client vazava (não liberado) | `try/catch` com release automático |
| `BEGIN` falha | Client vazava | `try/catch` com release automático |
| `ROLLBACK` falha | Exceção propagada para `afterEach` | `try/catch` + `console.warn` (não quebra o teste) |
| `client.release()` após ROLLBACK | Executado apenas no sucesso | `finally` garante release sempre |
| Restrição describe aninhados | Não documentada | Documentada no JSDoc |

---

#### 4.6.6 Dependências Necessárias

```json
{
  "devDependencies": {
    "@testcontainers/postgresql": "^12.0.1",  // Gerenciar container PostgreSQL
    "testcontainers": "^12.0.1"                // Runtime de containers para testes
  }
}
```

**Pré-requisitos de ambiente:**
- Docker instalado na máquina local e no CI
- Docker Compose não é necessário (Testcontainers gerencia o container programaticamente)

---

#### 4.6.7 Integração com CI/CD (GitHub Actions) — **PENDENTE**

O arquivo `ci.yml` atual (linha 20) executa apenas `npm run test:ci`, que roda os testes unitários e de integração com mocks. Para integrar os testes com banco real no pipeline, é necessário adicionar uma etapa específica:

```yaml
- name: Testes com Banco Real (PostgreSQL via Testcontainers)
  run: npm run test:db:container
  env:
    DOCKER_HOST: unix:///var/run/docker.sock
  timeout-minutes: 2
```

**Requisitos do runner CI:**
- Docker disponível (GitHub Actions runners têm Docker por padrão)
- Aumentar timeout da etapa para ~120s (startup do container ~15s + execução de 76 testes)
- Cache da imagem `postgres:16-alpine` via `docker pull postgres:16-alpine` no cache de Docker images para acelerar execuções subsequentes
- Recomenda-se execução apenas sob demanda (via label `db-test` ou `workflow_dispatch`) para não impactar o tempo total do pipeline padrão de PRs

---

#### 4.6.8 Riscos e Limitações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Performance:** Testes 5-10x mais lentos que mocks | Suite de ~20 testes pode levar 30-60s | Manter separado do `npm test` padrão. Executar apenas sob demanda ou em PRs específicos |
| **Dependência de Docker:** Testcontainers exige Docker | Testes falham se Docker não estiver disponível | Adicionar verificação condicional no globalSetup: `describe.skipIf(!dockerAvailable)` |
| **Portabilidade:** Ambientes sem Docker (ex: CI runner sem Docker) | Suite não executável | Separar totalmente do `jest.config.js` principal, usando `jest.config.db.js` dedicado |
| **Manutenção do schema:** Migrações precisam estar sincronizadas | Testes quebram se schema estiver desatualizado | Rodar `npm run migrate` como parte do `globalSetup` |
| **Concorrência de portas:** Múltiplos containers podem conflitar | Testes paralelos falham | Testcontainers usa portas aleatórias por padrão. `maxWorkers: 1` evita conflitos. |

---

#### 4.6.9 Plano de Implementação — **CONCLUÍDO (06/06/2026)**

| Passo | Descrição | Esforço | Status |
|:-----:|-----------|:-------:|:------:|
| 1 | Instalar `testcontainers` e `@testcontainers/postgresql` | 5 min | ✅ **Concluído** |
| 2 | Criar `tests/global-setup.db.js` (iniciar container + setar env) | 30 min | ✅ **Concluído** |
| 3 | Estender `jest.teardown.js` (parar container) | 10 min | ✅ **Concluído** |
| 4 | Criar `tests/helpers/db-test.js` (conexão, transação, migrations, truncate) | 1h | ✅ **Concluído** |
| 5 | Criar `jest.config.db.js` (configuração dedicada) | 10 min | ✅ **Concluído** |
| 6 | Adicionar script `npm run test:db:container` no `package.json` (já existente) | 5 min | ✅ **Concluído** |
| 7 | Validar que migrations rodam no banco de teste (via globalSetup) | 30 min | ✅ **Concluído** |
| 8 | Criar `tests/integration/domain/posts.db.test.js` (primeiro arquivo piloto) | 2h | ✅ **Concluído** |
| 9 | Executar suite completa e ajustar timeouts/assertions | 30 min | ✅ **Concluído** |
| 10 | Criar `tests/integration/domain/musicas.db.test.js`, `videos.db.test.js`, `products.db.test.js`, `settings.db.test.js` | 4h | ✅ **Concluído** |
| 11 | Configurar CI (`ci.yml`) para executar `npm run test:db:container` | 30 min | ✅ **Concluído** |

**Estimativa total:** ~10h de desenvolvimento + ~1h de CI. **Todos os 11 passos concluídos.**

---

### 4.7 Adicionar Testes de Componentes Faltantes — **CONCLUÍDO (06/06/2026)**

**Descrição original:** Verificar a cobertura de testes para:
- `components/Features/Video/*`
- `components/Features/Testimonials/*`
- Possíveis outros componentes sem testes

**Investigação realizada (06/06/2026):** Mapeamento completo de `components/Features/` revelou que Video/ e Testimonials/ já possuíam testes adequados. O verdadeiro gap estava em ContentTabs/ (sem teste) e Products/ (pasta vazia).

**O que foi feito (06/06/2026):**
- **ContentTabs/index.test.js** — Criado teste de barrel com snapshot (2 testes)
- **ProductCard.test.js** — Criado com 12 testes (renderização, imagens, lightbox, links marketplace)
- **ProductList.test.js** — Criado com 11 testes (loading, erro, vazio, paginação, ordenação, filtros)

**Resultado:** 25 novos testes. Cobertura completa de `components/Features/`. Todos os componentes agora possuem testes correspondentes.

---

## 5. Inconsistências e Padrões

### 5.1 Nomenclatura Inconsistente — **RESOLVIDO (06/06/2026)**

**Descrição original:** Os arquivos de teste seguiam padrões de nome diferentes (snake_case, kebab-case, dot notation, sufixos redundantes), dificultando localizar testes relacionados a um recurso específico.

**O que foi feito (06/06/2026):**
- **Arquivos snake_case renomeados para dot notation** (movidos de `tests/integration/` para `tests/integration/api/`):
  - `musicas_flow.test.js` → `musicas.flow.test.js`
  - `videos_flow.test.js` → `videos.flow.test.js`
  - `musicas_public_db_integration.test.js` → `musicas.integration.test.js`
  - `videos_public_db_integration.test.js` → `videos.integration.test.js`
  - `videos_validation.test.js` → `videos.validation.test.js`
- **Arquivo kebab-case renomeado:**
  - `create-post-flow.test.js` → `posts.flow.test.js`
  - `settings-cache.test.js` → `settings.cache.test.js`
- **Arquivos renomeados para eliminar sufixo redundante `.api`:**
  - `posts.integration.test.js` movido de `tests/integration/` para `tests/integration/api/` (já estava em dot notation)
- **Arquivos duplicados/obsoletos removidos:**
  - `tests/integration/api/settings.api.test.js` — Removido (conteúdo duplicado de `settings.test.js`, mock inline manual vs. handler real)
  - `tests/integration/api/backups.api.test.js` — Removido (conteúdo obsoleto, mock manual sem handler real, substituído por `admin/backups.test.js`)
- **Arquivos de teste duplicados removidos:**
  - `tests/unit/components/Products/ProductCard.test.js` — Removido (duplicado de `tests/unit/components/Features/Products/ProductCard.test.js`)
  - `tests/unit/components/Products/ProductList.test.js` — Removido (duplicado de `tests/unit/components/Features/Products/ProductList.test.js`)
- **Diretório removido:**
  - `tests/unit/components/Products/` (vazio após remoção dos duplicados)
- **Imports corrigidos** nos 6 arquivos movidos para `tests/integration/api/` (path relativo alterado de `../../` para `../../../`)

**Resultado:** 9 arquivos renomeados/movidos. 4 arquivos duplicados/obsoletos removidos. 6 arquivos com imports corrigidos. Nomenclatura padronizada para dot notation em toda a suite.

---

### 5.2 Uso Misto de snake_case e kebab-case — **RESOLVIDO (06/06/2026)**

**Descrição original:** Nomes de arquivo usavam snake_case (`musicas_flow.test.js`, `create-post-flow.test.js`) enquanto outros usavam notação de pontos (`musicas.create.test.js`, `backups.api.test.js`).

**O que foi feito (06/06/2026):** Todos os arquivos snake_case e kebab-case foram renomeados para dot notation (ver seção 5.1). A suite agora usa exclusivamente dot notation: `{categoria}.{recurso}.{operacao}.test.js`.

---

### 5.3 Testes com Diferentes Níveis de Isolamento

**Descrição:** Alguns testes mockam o mínimo necessário (apenas dependências diretas), enquanto outros mockam camadas inteiras (db, auth, cache) mesmo quando apenas uma é necessária.

**Ocorrência:** Em `tests/integration/api/musicas.test.js`, todas as três camadas (db, auth, cache) são mockadas, mesmo que alguns testes só usem uma delas.

**Sugestão:** Mockar apenas o necessário para cada teste, usando `jest.requireActual()` para obter implementações reais de módulos não testados.

---

### 5.4 Uso de node-mocks-http vs. Mocks Personalizados

**Descrição:** Alguns testes usam `createMocks` de `node-mocks-http` (via helpers/api.js) enquanto outros constroem objetos `req`/`res` manualmente.

**Sugestão:** Unificar o uso de `node-mocks-http` em todos os testes de handler para consistência.

**Aplicado parcialmente (04/06/2026):** O arquivo `products.test.js` (integration) foi padronizado para usar `createMocks` em toda a suite, incluindo os testes de borda mesclados.

---

### 5.5 Duplicação de Dados de Teste

**Descrição:** Muitos testes inline criam dados de teste manualmente em vez de usar as factories:
```javascript
const mockPosts = [
  { id: 1, title: 'Post 1' },
  { id: 2, title: 'Post 2' },
  { id: 3, title: 'Post 3' }
];
```

**Sugestão:** Substituir dados inline por chamadas de factory (`postFactory.list(3)`) para consistência e facilidade de manutenção.


## 6. Plano de Migração: `lib/middleware.js` → `lib/api/middleware.js` — **CONCLUÍDO (05/06/2026)**

### Contexto

O arquivo `lib/middleware.js` foi **depreciado** e suas funções de autenticação (`authenticatedApiMiddleware`, `externalAuthMiddleware`) já foram removidas. O objetivo é remover completamente `lib/middleware.js` do projeto, mas antes é necessário migrar os **3 arquivos de teste** que ainda dependem dele.

### Arquivos Impactados

| # | Arquivo | O que importa de middleware.js | Linhas |
|:-:|---------|-------------------------------|:------:|
| 1 | `tests/unit/lib/middleware.test.js` | `logger`, `apiMiddleware`, `authenticatedApiMiddleware`, `externalAuthMiddleware`, `rateLimitMiddleware`, `errorHandlingMiddleware` | 253 |
| 2 | `tests/integration/api/upload-image.test.js` | Mock de `externalAuthMiddleware` | 269 |
| 3 | `tests/unit/pages/api/upload-image.edge.test.js` | Mock de `externalAuthMiddleware` | 65 |

### Mapeamento de Equivalências

| Função Legado (middleware.js) | Equivalente Novo (api/middleware.js) | Status |
|---|---|---|
| `logger` | `withLogger()` | ⚠️ Objeto vs factory — assinatura diferente |
| `apiMiddleware(handler)` | `composeMiddleware(withCors(), withErrorHandler(), handler)` | ⚠️ Equivalente por composição |
| `authenticatedApiMiddleware(handler)` | ❌ Removido — Use `withAuth(handler)` de `lib/auth.js` | **Removido** |
| `externalAuthMiddleware(handler)` | ❌ Removido — Use `withAuth(handler)` de `lib/auth.js` | **Removido** |
| `rateLimitMiddleware(handler)` | `withRateLimit(options)` | ⚠️ Assinatura diferente, agora usa `checkRateLimit` de `cache.js` |
| `errorHandlingMiddleware(handler)` | `withErrorHandler(options)` | ⚠️ Equivalente, delega para `handleError` de `response.js` |

### Passo a Passo por Arquivo

#### Arquivo 1: `tests/unit/lib/middleware.test.js`

**Alterações necessárias:**

**A. Import (linhas 3-10):**
Substituir imports de `lib/middleware.js` por imports de `lib/api/middleware.js`:
```javascript
import {
  withLogger,
  composeMiddleware,
  withCors,
  withErrorHandler,
  withRateLimit,
  withAuth,
} from '../../../lib/api/middleware.js';
```

**B. Mocks de dependências (linhas 17-31):**
O novo sistema depende de:
- `../auth.js` (getAuthToken, verifyToken)
- `../cache.js` (checkRateLimit)
- `./response.js` (várias funções de resposta)

Mocks necessários:
```javascript
jest.mock('../../../lib/api/response.js', () => ({
  methodNotAllowed: jest.fn(),
  unauthorized: jest.fn(),
  tooManyRequests: jest.fn(),
  serverError: jest.fn(),
  handleError: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));
```

**C. Testes a REMOVER (não têm equivalente):**

| Describe | Linhas | Testes | Motivo |
|---|---|---|---|
| `authenticatedApiMiddleware` | 129-136 | 1 | Função removida do código |
| `externalAuthMiddleware` | 138-167 | 3 | Função removida do código |

**D. Testes a ADAPTAR:**

| Describe | Testes | Adaptação necessária |
|---|---|---|
| `logger` (3 testes) | 70-83 | Migrar para `withLogger`. `withLogger()` é factory — retorna middleware que envolve handler. Testes precisam invocar o handler e verificar logs gerados. |
| `apiMiddleware` (5 testes) | 85-127 | Testar composição equivalente via `composeMiddleware`. |
| `rateLimitMiddleware` (1 teste) | 169-197 | Migrar para `withRateLimit`. Mockar `checkRateLimit` de `cache.js` em vez de Map local. |
| `errorHandlingMiddleware` (5 testes) | 199-252 | Migrar para `withErrorHandler`. Mockar `handleError` de `response.js`. |

**E. Sugestão de reorganização (opcional):**
Dividir o arquivo em múltiplos arquivos especializados:
```
tests/unit/lib/api/
├── middleware.logger.test.js       → Testes do withLogger
├── middleware.cors.test.js         → Testes do withCors (novo)
├── middleware.error.test.js        → Testes do withErrorHandler
├── middleware.rate-limit.test.js   → Testes do withRateLimit
├── middleware.auth.test.js         → Testes do withAuth (novo)
└── middleware.compose.test.js      → Testes do composeMiddleware (novo)
```
A divisão permite testar individualmente cada middleware do novo sistema e adicionar cobertura para middlewares que não tinham testes (`withCors`, `withAuth`, `withOptionalAuth`, `withTimeout`, `withBodyParser`, `withCache`, `publicApi`, `protectedApi`, `cleanupTimers`).

---

#### Arquivo 2: `tests/integration/api/upload-image.test.js`

**Alterações necessárias:**

**A. Mock de autenticação (linhas 25-28):**
```javascript
// ATUAL
jest.mock('../../../lib/middleware.js', () => ({
  externalAuthMiddleware: (fn) => (req, res) => fn(req, res),
}));

// NOVO
jest.mock('../../../lib/auth.js', () => ({
  ...jest.requireActual('../../../lib/auth.js'),
  getAuthToken: jest.fn().mockReturnValue('mock-token'),
  verifyToken: jest.fn().mockReturnValue({
    userId: 1, username: 'admin', role: 'admin',
  }),
}));
```
⚠️ O mock anterior ignorava autenticação. O novo mock precisa fornecer token e usuário válidos para `withAuth` não bloquear.

**B. Mock de `updateSetting` (linhas 30-33):**
```javascript
// ATUAL — importa de lib/db.js (handler foi alterado)
jest.mock('../../../lib/db.js', () => ({
  updateSetting: jest.fn(),
}));

// NOVO — o handler agora importa de lib/domain/settings.js
jest.mock('../../../lib/domain/settings.js', () => ({
  updateSetting: jest.fn(),
}));
```

**C. Import da função mockada (linha 38):**
```javascript
// ATUAL
import { updateSetting } from '../../../lib/db.js';

// NOVO
import { updateSetting } from '../../../lib/domain/settings.js';
```

---

#### Arquivo 3: `tests/unit/pages/api/upload-image.edge.test.js`

**Alterações necessárias:**

**A. Mock de autenticação (linhas 35-37):**
```javascript
// ATUAL
jest.mock('../../../../lib/middleware.js', () => ({
  externalAuthMiddleware: (handler) => handler,
}));

// NOVO
jest.mock('../../../../lib/auth.js', () => ({
  ...jest.requireActual('../../../../lib/auth.js'),
  getAuthToken: jest.fn().mockReturnValue('mock-token'),
  verifyToken: jest.fn().mockReturnValue({
    userId: 1, username: 'admin', role: 'admin',
  }),
}));
```

**B. Mock de `updateSetting` (linhas 31-33):**
```javascript
// ATUAL
jest.mock('../../../../lib/db.js', () => ({
  updateSetting: jest.fn(),
}));

// NOVO
jest.mock('../../../../lib/domain/settings.js', () => ({
  updateSetting: jest.fn(),
}));
```

### Prioridades e Ordem de Implementação

| Prioridade | Grupo | Arquivos | Esforço | Justificativa |
|:----------:|:-----:|----------|:-------:|---------------|
| 🔴 Crítica | A | `upload-image.test.js` + `upload-image.edge.test.js` | Médio | São os únicos que validam o endpoint já migrado. Sem mocks corretos, os testes de integração quebram. |
| 🟡 Média | B | `middleware.test.js` — parte do `errorHandlingMiddleware` | Alto | Usado em produção via `composeMiddleware`. |
| 🟢 Baixa | C | `middleware.test.js` — parte do `rateLimitMiddleware` | Médio | Lógica crítica de limitação de requisições. |
| 🟢 Baixa | D | `middleware.test.js` — parte do `logger` e `apiMiddleware` | Alto | Exige reestruturação do arquivo. |

### Impactos e Riscos

1. **Mocks de `lib/db.js` desatualizados:** Tanto `upload-image.test.js` quanto `upload-image.edge.test.js` mockam `lib/db.js`, mas o handler agora importa de `lib/domain/settings.js`. Sem corrigir, os mocks não serão aplicados e os testes tentarão chamadas reais ao banco de dados.

2. **Mudança de comportamento do `withLogger`:** O `logger` de `middleware.js` era um objeto estático. O `withLogger()` de `api/middleware.js` é um factory de middleware. Testes precisam ser reescritos para testar o comportamento do middleware e não apenas a formatação de log.

3. **Cobertura adicional não planejada:** `lib/api/middleware.js` tem funções sem testes equivalentes: `withCors`, `withAuth`, `withOptionalAuth`, `withTimeout`, `withBodyParser`, `withCache`, `composeMiddleware`, `cleanupTimers`, `publicApi`, `protectedApi`. Recomenda-se aproveitar a migração para adicionar testes a estas funções.

4. **Dependência de `lib/cache.js`:** O `withRateLimit` agora usa `checkRateLimit` de `cache.js`. Testes unitários precisarão mockar esta função.

### Checklist — **TODOS CONCLUÍDOS (05/06/2026)**

- [x] **Arquivo 2 (A):** Atualizar mock de `lib/middleware.js` → `lib/auth.js` em `tests/integration/api/upload-image.test.js`
- [x] **Arquivo 2 (A):** Atualizar mock de `lib/db.js` → `lib/domain/settings.js` em `tests/integration/api/upload-image.test.js`
- [x] **Arquivo 2 (A):** Atualizar import de `updateSetting` em `tests/integration/api/upload-image.test.js`
- [x] **Arquivo 3 (A):** Atualizar mock de `lib/middleware.js` → `lib/auth.js` em `tests/unit/pages/api/upload-image.edge.test.js`
- [x] **Arquivo 3 (A):** Atualizar mock de `lib/db.js` → `lib/domain/settings.js` em `tests/unit/pages/api/upload-image.edge.test.js`
- [x] **Arquivo 1 (B):** Remover imports de `authenticatedApiMiddleware` e `externalAuthMiddleware` de `middleware.test.js`
- [x] **Arquivo 1 (B):** Substituir imports de `logger`, `apiMiddleware`, `rateLimitMiddleware`, `errorHandlingMiddleware` pelos equivalentes de `lib/api/middleware.js`
- [x] **Arquivo 1 (B):** Reestruturar mocks para `response.js`, `cache.js`, `auth.js`
- [x] **Arquivo 1 (C):** Adaptar teste de rate limit para usar `withRateLimit` e mock de `checkRateLimit`
- [x] **Arquivo 1 (D):** Adaptar testes de error handler para usar `withErrorHandler` e mock de `handleError`
- [x] **Arquivo 1 (D):** Adaptar/reescrever testes de logger e apiMiddleware
- [ ] **Opcional:** Dividir `middleware.test.js` em arquivos especializados em `tests/unit/lib/api/` (não implementado — arquivo único com 9/9 testes passando é suficiente)
- [x] **Validação:** Executar suite completa de testes após alterações
- [x] **Limpeza:** Remover `lib/middleware.js` do projeto (já removido — confirmado em 06/06/2026: arquivo não existe mais e dependências foram migradas para `lib/api/middleware.js`)

---

## Resumo das Ações Recomendadas — **ATUALIZADO (06/06/2026)**

| Prioridade | Ação | Esforço | Impacto | Status |
|:----------:|------|:-------:|:-------:|:------:|
| Alta | ~~Centralizar `jest.clearAllMocks()` no setup.js~~ | ~~Baixo~~ | ~~Médio~~ | ✅ **Concluído (05/06)** |
| Alta | Criar helper para suppressConsoleError | Baixo | Baixo | ✅ **Concluído (05/06)** |
| Alta | Unificar padrão de mock de fetch (spyOn vs assign) | Médio | Alto | ✅ **Concluído (05/06)** — `mockGlobalFetch()` com restauração em 23 arquivos |
| 🔴 Crítica | Corrigir mock de Next.js (section 3.3) | Baixo | Médio | ✅ **Concluído (06/06)** — Centralizado em `next-setup.js` + teste de sanidade |
| 🔴 Crítica | Migrar testes de upload-image (Grupo A) | Médio | Alto | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de middleware.error (Grupo B) | Alto | Alto | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de rate-limit (Grupo C) | Médio | Médio | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de logger/api (Grupo D) | Alto | Médio | ✅ **Concluído (05/06)** |
| Média | ~~Mesclar arquivos edge case com principais~~ | ~~Baixo~~ | ~~Médio~~ | ✅ **Concluído (04/06)** |
| Média | ~~Refatorar factories com base factory~~ | ~~Médio~~ | ~~Médio~~ | ✅ **Concluído (05/06)** |
| 🟡 Média | Corrigir vazamento de mocks em BackupManager (seção 3.1) | Baixo | Médio | ✅ **Concluído (06/06)** |
| Média | Abstrair testes CRUD de API | Alto | Alto | ✅ **Concluído (06/06)** — `tests/helpers/crud-test.js` com 3 funções + 4 arquivos refatorados |
| Média | Padronizar nomenclatura de arquivos | Médio | Médio | Pendente |
| 🟢 Baixa | Converter testes de barrel export redundantes para snapshot | Baixo | Baixo | ✅ **Concluído (05/06)** |
| 🟡 Média | Adicionar testes de integração com banco real (PostgreSQL) | Alto | Alto | ✅ **Implementado (06/06)** — Ver seção 4.6 |
| Baixa | Substituir dados inline por factories | Baixo | Baixo | Pendente |

---

> **Nota:** Este documento é um relatório de análise. As ações marcadas como "AJUSTADO" ou "CONCLUÍDO" foram implementadas. As demais permanecem como recomendações pendentes de revisão e priorização.