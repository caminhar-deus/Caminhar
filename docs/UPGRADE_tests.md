# Relatório de Upgrade — Testes (`/tests/`)

> **Data:** 12/05/2026 (atualizado em 07/06/2026 — 13ª revisão)
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

### 1.6 `jest.clearAllMocks()` Removido do `crud-test.js` — **AJUSTADO (07/06/2026)**

**Ocorrência:** `tests/helpers/crud-test.js` — 3 funções (`testPublicGetEndpoint`, `testAdminCrudEndpoint`, `testAdminGetEndpoint`) com `beforeEach(() => jest.clearAllMocks())`.

**Descrição:** O `jest.config.js` já possui `clearMocks: true`, e o `tests/setup.js` já executa `jest.clearAllMocks()` no `afterEach` global. As chamadas nos helpers CRUD eram redundantes.

**O que foi feito (07/06/2026):**
- Removido `jest.clearAllMocks()` do `beforeEach` das 3 funções do `crud-test.js`
- **Impacto:** 0 — o comportamento de limpeza continua garantido pelo setup global

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

**Resultado:** 27 arquivos padronizados. Redução de ~120 linhas de código repetido.

---

### 2.4 Uso Excessivo de waitFor com Timeouts Curtos — **AJUSTADO (06/06/2026)**

**Ocorrência:** `tests/unit/components/Features/Blog/BlogSection.test.js`, `tests/unit/components/Admin/Managers/BackupManager.test.js`

**O que foi feito (06/06/2026):** 5 ocorrências de `waitFor` com verificação de ausência substituídas por `waitForElementToBeRemoved`.

**Resultado:** 5 ocorrências substituídas. Redução potencial no tempo de execução ao eliminar polling desnecessário.

---

## 3. Correções Necessárias

### 3.1 Vazamento de Mocks entre Testes (Race Conditions) — **RESOLVIDO (06/06/2026)**

**Ocorrência:** `tests/unit/components/Admin/Managers/BackupManager.test.js` — teste "deve exibir erros retornados pela API"

**O que foi feito (06/06/2026):**
- `mockResolvedValue` substituído por `mockResolvedValueOnce`
- `confirmSpy.mockReturnValue(true)` substituído por `mockReturnValueOnce(true)`
- Adicionado `await waitForElementToBeRemoved(...)` antes de interagir com botões

---

### 3.2 Uso de Require() em Ambiente ES Module — **RESOLVIDO (06/06/2026)**

**Ocorrência:** `tests/setup.js` — `require()` usado para polyfills condicionais.

**O que foi feito (06/06/2026):**
- 3 ocorrências de `require()` substituídas por `await import()` dinâmico dentro de IIFE async
- Polyfill do `undici` removido por ser desnecessário (Node.js v24 + JSDOM já fornecem nativamente)

---

### 3.3 Mock de Next.js Dinâmico Pode Quebrar — **AJUSTADO (06/06/2026)**

**Ocorrência:** `tests/mocks/next.js`

**O que foi feito (06/06/2026):**
- Criado `tests/mocks/next-setup.js` — Setup centralizado de mocks do Next.js
- Adicionados mocks faltantes: `next/navigation`, `next/headers`, `next/server`
- Removidos mocks duplicados de 10 arquivos de teste
- Criado `tests/mocks/next.test.js` — Teste de sanidade com 9 testes

---

### 3.4 Testes sem Verificação de Limpeza — **RESOLVIDO (05/06/2026)**

Todos os arquivos com `jest.spyOn` agora usam `afterEach` com `mockRestore()` garantido.

---

### 3.5 Teste de Exportação Redundante — **CONVERTIDO PARA SNAPSHOT (05/06/2026)**

5 arquivos convertidos de `expect(X).toBeDefined()` para snapshot + validação semântica crítica.

---

### 3.6 Testes com Cobertura Faltante — **AJUSTADO (06/06/2026)**

**O que foi feito (06/06/2026):**
- Criado `ContentTabs/index.test.js` — 2 testes de barrel
- Criado `ProductCard.test.js` — 12 testes
- Criado `ProductList.test.js` — 11 testes
- **25 novos testes.** Cobertura completa de `components/Features/`.

---

## 4. Melhorias Recomendadas

### 4.1 Abstração de Testes CRUD — **CONCLUÍDO (06/06/2026)**

Criado `tests/helpers/crud-test.js` com 3 funções: `testPublicGetEndpoint`, `testAdminCrudEndpoint`, `testAdminGetEndpoint`. 4 arquivos refatorados.

---

### 4.2 Unificação de Arquivos Edge Case — **AJUSTADO (04/06/2026)**

Mesclados 3 pares de arquivos edge+principal. Redução de 3 arquivos.

---

### 4.3 Centralização de Mocks no setup.js — **AJUSTADO (05/06/2026)**

`jest.clearAllMocks()` adicionado no `afterEach` global do `setup.js`.

---

### 4.4 Helper para Suppressão de console.error — **CONCLUÍDO (05/06/2026)**

Criado `tests/helpers/console.js` com 4 funções.

---

### 4.5 Refatoração de Factories com Base Factory — **CONCLUÍDO (05/06/2026)**

Criado `tests/factories/base.js`, refatoradas 4 factories. Redução de ~70 linhas.

---

### 4.6 Adicionar Testes de Integração com Banco Real (PostgreSQL) — **IMPLEMENTADO (06/06/2026)**

5 arquivos `.db.test.js` implementados: posts (15), musicas (17), videos (16), products (16), settings (12). **76 testes com banco real.**

---

### 4.7 Adicionar Testes de Componentes Faltantes — **CONCLUÍDO (06/06/2026)**

25 novos testes em ContentTabs, ProductCard e ProductList.

---

## 5. Inconsistências e Padrões

### 5.1 Nomenclatura Inconsistente — **RESOLVIDO (06/06/2026)**

9 arquivos renomeados/movidos para dot notation. 4 arquivos duplicados/obsoletos removidos.

---

### 5.2 Uso Misto de snake_case e kebab-case — **RESOLVIDO (06/06/2026)**

Todos os arquivos padronizados para dot notation.

---

### 5.3 Testes com Diferentes Níveis de Isolamento — **AJUSTADO (07/06/2026)**

**Descrição original:** Alguns testes mockam o mínimo necessário (apenas dependências diretas), enquanto outros mockam camadas inteiras (db, auth, cache) mesmo quando apenas uma é necessária.

**Ocorrência citada:** Em `tests/integration/api/musicas.test.js`, todas as camadas (db, auth, cache) são mockadas, mesmo que alguns testes só usem uma delas.

**Investigação técnica (07/06/2026):**

Após análise dos handlers reais e seus imports, constatou-se:

| Handler | Importa de | Mocks necessários |
|---------|-----------|------------------|
| `musicas.js` | `domain/musicas`, `cache` | `domain/musicas`, `cache` (auth NÃO é importado) |
| `videos.js` | `domain/videos`, `cache` | `domain/videos`, `cache` (auth NÃO é importado) |
| `posts.js` | `domain/posts`, `cache`, `auth` | `domain/posts`, `cache`, `auth` (auth importado para POST) |
| `products.js` | `domain/products`, `cache`, `auth`, `domain/audit`, `logger` | `domain/products`, `cache`, `auth`, `domain/audit`, `logger` |

**Conclusão:** A sugestão original do documento estava incorreta ao afirmar que `musicas.test.js` mockava auth desnecessariamente. O handler de musicas **não importa auth**. O mock de auth que estava em `posts.test.js` (e que foi removido em 07/06/2026) era do handler de posts, que de fato importa `withAuth` para o POST. Como o `posts.test.js` só testa GET, o mock era tecnicamente desnecessário — foi removido.

**Ajustes implementados (07/06/2026):**

| Arquivo | Removido | Motivo |
|---------|----------|--------|
| `posts.test.js` | Mock de `lib/auth.js` | Handler importa `withAuth` apenas para POST, mas os testes só cobrem GET. O mock não era usado — verificado com execução dos 4 testes. |
| `crud-test.js` | `beforeEach` com `jest.clearAllMocks()` | Redundante com `clearMocks: true` no `jest.config.js` + `clearAllMocks()` no `afterEach` do `setup.js` |

**Substituição de dados inline por factories (07/06/2026):**

| Arquivo | Dado Inline Substituído | Factory Utilizada |
|---------|------------------------|-------------------|
| `musicas.test.js` | `[{ id: 1, titulo: 'Hino' }]` | `musicFactory.list(1)` |
| `videos.test.js` | `[{ id: 1 }]` | `videoFactory.list(1)` |
| `posts.test.js` | `[{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }]` | `postFactory.list(2)` |
| `products.test.js` | `{ userId: 1, role: 'admin' }` | `userFactory({ role: 'admin' })` |

**Resultado:** 30/30 testes passando (4 arquivos). Mocks removidos que eram desnecessários. Dados inline substituídos por factories centralizadas. Comportamento inalterado.

---

### 5.4 Uso de node-mocks-http vs. Mocks Personalizados — **CONCLUÍDO (07/06/2026)**

**Descrição:** Alguns testes usavam `createMocks` de `node-mocks-http` (via helpers/api.js) enquanto outros construíam objetos `req`/`res` manualmente.

**Sugestão original:** Unificar o uso de `node-mocks-http` em todos os testes de handler para consistência.

**O que foi feito (07/06/2026):**

**Arquivos convertidos de req/res manual para `createMocks`:**

| # | Arquivo | Método Anterior | Método Novo |
|:-:|---------|----------------|-------------|
| 1 | `unit/pages/api/auth/login.edge.test.js` | `req = { method, headers, body, socket }` + `res = { setHeader, status, json }` | `createMocks({ method: 'POST', body })` |
| 2 | `unit/pages/api/admin/roles.edge.test.js` | `req = { method, headers, socket, body, query }` + `res = { setHeader, status, json, end }` | `createMocks({ method, query, body })` |
| 3 | `unit/pages/api/admin/rate-limit.test.js` | 18 ocorrências de `req = { method, query }` + `res = { status, json, ... }` | `createMocks({ method, query, body })` |
| 4 | `unit/pages/api/admin/fetch-spotify.edge.test.js` | `req = { method, body }` + `res = { setHeader, status, json, end }` | `createMocks({ method: 'POST', body })` |
| 5 | `unit/pages/api/admin/dicas.edge.test.js` | `req = { method, headers, socket, body, user }` + `res = { setHeader, status, json, end }` | `createMocks({ method, headers, socket, body })` |
| 6 | `unit/pages/api/admin/posts.edge.test.js` | `req = { method, headers, socket, body, query }` + `res = { setHeader, status, json, end }` | `createMocks({ method, headers, socket, body, query })` |
| 7 | `unit/pages/api/admin/stats.edge.test.js` | `req = { method }` + `res = { setHeader, status, json, end }` | `createMocks({ method })` |
| 8 | `unit/pages/api/admin/fetch-ml.edge.test.js` | `req = { method, body }` + função `mockRes()` manual | `createMocks({ method, body })` |
| 9 | `unit/pages/api/upload-image.edge.test.js` | `const req = { method: 'POST' }` + `res = { status, json }` | `createMocks({ method: 'POST' })` |

**Assertions migradas:**
- `expect(res.status).toHaveBeenCalledWith(N)` → `expect(res._getStatusCode()).toBe(N)`
- `expect(res.json).toHaveBeenCalledWith(data)` → `expect(res._getJSONData()).toEqual(data)`

**Arquivo mantido com req/res manual (justificado):**
| Arquivo | Justificativa |
|---------|---------------|
| `unit/lib/auth.test.js` | Testa as funções da biblioteca `auth.js` diretamente (`setAuthCookie`, `withAuth`, `getAuthToken`), não um handler de API. Objetos req/res manuais são necessários para testar casos específicos como extração de token de headers/cookies |
| `unit/lib/middleware.test.js` | Testa o middleware em si — req/res manual permite testar cenários específicos de tratamento |
| `unit/lib/api/middleware.test.js` | Idem |

**Helper `tests/helpers/api.js`:** Mantido no projeto pois é importado e utilizado por `tests/examples/simple-test.test.js`. Contém `createApiMocks`, `createGetRequest`, `createPostRequest`, etc. que wrappers úteis, embora nenhum teste de produção os utilize diretamente.

**Resultado:** 9 arquivos convertidos para `createMocks`. Consistência total no ecossistema de testes de handler. Todos os ~300+ usos de `createMocks` agora seguem o mesmo padrão.

---

### 5.5 Duplicação de Dados de Teste — **AJUSTADO (07/06/2026)**

**Descrição:** Muitos testes inline criam dados de teste manualmente em vez de usar as factories.

**O que foi feito (07/06/2026) — Aplicado em 4 arquivos de integração:**

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `musicas.test.js` | `{ data: [{ id: 1, titulo: 'Hino' }], ... }` | `{ data: musicFactory.list(1), ... }` |
| `videos.test.js` | `{ data: [{ id: 1 }], ... }` | `{ data: videoFactory.list(1), ... }` |
| `posts.test.js` | `{ data: [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }], ... }` | `{ data: postFactory.list(2), ... }` |
| `products.test.js` | `{ userId: 1, role: 'admin' }` | `userFactory({ role: 'admin' })` |

**Resultado:** 30/30 testes passando. Substituição gradual — mais arquivos podem ser convertidos seguindo o mesmo padrão.

---

## 6. Plano de Migração: `lib/middleware.js` → `lib/api/middleware.js` — **CONCLUÍDO (05/06/2026)**

A migração foi concluída. `lib/middleware.js` removido do projeto. Todos os 3 arquivos de teste impactados foram atualizados.

**Checklist:**
- [x] Arquivo 2 (A): upload-image.test.js — Mocks migrados
- [x] Arquivo 3 (A): upload-image.edge.test.js — Mocks migrados
- [x] Arquivo 1 (B): middleware.test.js — Reescrevido com 9/9 testes passando
- [x] `lib/middleware.js` removido do projeto

---

## Resumo das Ações Recomendadas — **ATUALIZADO (07/06/2026)**

| Prioridade | Ação | Esforço | Impacto | Status |
|:----------:|------|:-------:|:-------:|:------:|
| Alta | Centralizar `jest.clearAllMocks()` no setup.js | Baixo | Médio | ✅ **Concluído (05/06)** |
| Alta | Criar helper para suppressConsoleError | Baixo | Baixo | ✅ **Concluído (05/06)** |
| Alta | Unificar padrão de mock de fetch (spyOn vs assign) | Médio | Alto | ✅ **Concluído (05/06)** |
| 🔴 Crítica | Corrigir mock de Next.js (section 3.3) | Baixo | Médio | ✅ **Concluído (06/06)** |
| 🔴 Crítica | Migrar testes de upload-image (Grupo A) | Médio | Alto | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de middleware.error (Grupo B) | Alto | Alto | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de rate-limit (Grupo C) | Médio | Médio | ✅ **Concluído (05/06)** |
| 🟡 Média | Migrar testes de logger/api (Grupo D) | Alto | Médio | ✅ **Concluído (05/06)** |
| Média | Mesclar arquivos edge case com principais | Baixo | Médio | ✅ **Concluído (04/06)** |
| Média | Refatorar factories com base factory | Médio | Médio | ✅ **Concluído (05/06)** |
| 🟡 Média | Corrigir vazamento de mocks em BackupManager | Baixo | Médio | ✅ **Concluído (06/06)** |
| Média | Abstrair testes CRUD de API | Alto | Alto | ✅ **Concluído (06/06)** |
| Média | Padronizar nomenclatura de arquivos | Médio | Médio | ✅ **Concluído (06/06)** |
| 🟢 Baixa | Converter testes de barrel export redundantes para snapshot | Baixo | Baixo | ✅ **Concluído (05/06)** |
| 🟡 Média | Adicionar testes de integração com banco real (PostgreSQL) | Alto | Alto | ✅ **Implementado (06/06)** |
| 🟢 Baixa | Substituir dados inline por factories (parcial) | Baixo | Baixo | ✅ **Parcial (07/06)** — 4 arquivos de integração convertidos |
| 🟢 Baixa | Remover `jest.clearAllMocks()` redundante do crud-test.js | Muito Baixo | Nulo | ✅ **Concluído (07/06)** |
| 🟢 Baixa | Remover mock de auth desnecessário do posts.test.js | Muito Baixo | Nulo | ✅ **Concluído (07/06)** |
| 🟢 Baixa | Unificar req/res manual para createMocks em testes de handler | Baixo | Médio | ✅ **Concluído (07/06)** — 9 arquivos convertidos |

---

> **Nota:** Este documento é um relatório de análise. As ações marcadas como "AJUSTADO" ou "CONCLUÍDO" foram implementadas. As demais permanecem como recomendações pendentes de revisão e priorização.