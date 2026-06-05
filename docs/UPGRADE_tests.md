# Relatório de Upgrade — Testes (`/tests/`)

> **Data:** 12/05/2026 (atualizado em 05/06/2026)
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

### 1.4 Repetição de Setup/Teardown em Testes Unitários — **AJUSTADO (05/06/2026)**

**Ocorrência:** Presente na maioria dos arquivos em `tests/unit/components/Admin/`, `tests/unit/lib/`, `tests/unit/pages/api/`

**Descrição original:** Quase todos os arquivos repetiam o mesmo padrão de setup (`jest.clearAllMocks()` em `beforeEach`) e supressão de `console.error` via substituição global (`beforeAll`/`afterAll`).

**Impacto original:** ~40+ arquivos contendo o mesmo boilerplate. Código verboso e difícil de manter.

**O que foi feito (05/06/2026):**
- **`jest.clearAllMocks()` removido de ~41 arquivos** nos 3 diretórios — O `jest.config.js` já possui `clearMocks: true`, tornando essas chamadas redundantes
- **`tests/setup.js`** — Adicionado `jest.clearAllMocks()` no `afterEach` global como fallback explícito
- **`BackupManager.test.js` e `CacheManager.test.js`** — Substituído padrão `beforeAll/afterAll` com `console.error` por `jest.spyOn` com `mockRestore()` no `afterEach`
- **`auth.test.js`, `cache.test.js`, `middleware.test.js`, `db.test.js`** — Removida supressão global de `console.error` via substituição de referência, sem impacto nos testes
- **`admin/posts.edge.test.js`, `admin/fetch-spotify.edge.test.js`, `auth/login.edge.test.js`** — Substituído padrão `beforeAll/afterAll` com `console.error` por `jest.spyOn` com `mockRestore()` no `afterEach`

**Resultado:** 268 testes passando (mesmo resultado do baseline). Nenhuma regressão. Redução de ~41 chamadas redundantes e eliminação do padrão de substituição global de `console.error` em 10 arquivos.

---

### 1.5 Factories com Código Sobreposto

**Ocorrência:** `tests/factories/post.js`, `tests/factories/music.js`, `tests/factories/video.js`

**Descrição:** Todas as factories compartilham a mesma estrutura:
- Contador incremental (`let id = 1`)
- Função `reset*IdCounter()`
- Método `.list(n)` que cria múltiplos registros
- Geração de timestamps ISO
- Templates de dados com overrides via spread operator

**Impacto:** Cada factory reimplementa o mesmo padrão. Mudanças no formato de geração de IDs ou timestamps requerem alteração em 4 arquivos.

**Sugestão:** Criar uma `baseFactory` ou `createFactory(defaults)` que abstraia o padrão de contador, list() e reset.

---

## 2. Problemas de Performance

### 2.1 Supressão Global de console.error

**Ocorrência:** Múltiplos arquivos — `BackupManager.test.js`, `BlogSection.test.js`, etc.

**Código exemplar:**
```javascript
const originalConsoleError = console.error;
beforeAll(() => { console.error = jest.fn(); });
afterAll(() => { console.error = originalConsoleError; });
```

**Problema:** Cada arquivo substitui `console.error` globalmente, com Supressão total (sem filtro) durante toda a execução da suite. Isso mascara warnings legítimos que poderiam indicar problemas reais.

**Impacto na Performance:** `jest.spyOn(console, 'error')` é mais performático que substituir a referência global diretamente, além de permitir restauração automática.

**Sugestão:** Substituir por `jest.spyOn(console, 'error').mockImplementation(() => {})` e usar `mockRestore()` no `afterAll`. Ou melhor: filtrar apenas warnings esperados (como feito no `setup.js`) em vez de silenciar tudo.

**Aplicado parcialmente (04/06/2026):** Os arquivos mesclados (`AdminAudit.test.js`, `AdminUsersTab.test.js`, `products.test.js`) foram corrigidos para usar `jest.spyOn` com `mockRestore()` no `afterEach`, eliminando 3 ocorrências do padrão problemático.

---

### 2.2 Mock de fetch Global sem Isolamento

**Ocorrência:** `tests/unit/components/Features/Blog/BlogSection.test.js`, `tests/unit/components/Admin/Managers/BackupManager.test.js`, etc.

**Código exemplar:**
```javascript
global.fetch = jest.fn();
```

**Problema:** Atribuir `global.fetch` diretamente sobrescreve a implementação original. Se um teste falha antes de restaurar, o mock vaza para outros testes.

**Impacto:** Testes não determinísticos — ordem de execução pode afetar resultados.

**Sugestão:** Usar `jest.spyOn(global, 'fetch')` para permitir restauração automática via `jest.restoreAllMocks()`. Configurar `restoreMocks: true` no Jest config para limpeza automática.

---

### 2.3 Overhead de Módulos com jest.mock() no Topo

**Ocorrência:** Todos os arquivos de teste de integração e unitários que mockam dependências.

**Problema:** `jest.mock()` é hoisted e executado antes de qualquer import. Cada arquivo registra um novo mock module. Em ~157 arquivos de teste, isso gera recriação constante de módulos mockados no início de cada suite.

**Impacto:** Aumento no tempo total de execução dos testes devido à inicialização repetida de módulos.

**Sugestão:** Centralizar mocks mais comuns (db, auth, cache) em `__mocks__/` e usar `jest.mock('lib/db')` sem factory function, permitindo que o Jest use o mock automático. Ou criar módulos compartilhados de mock em `tests/mocks/` e importá-los.

---

### 2.4 Uso Excessivo de waitFor com Timeouts Curtos

**Ocorrência:** Vários testes em `tests/unit/components/Features/Blog/BlogSection.test.js`, `tests/unit/components/Admin/Managers/BackupManager.test.js`

**Código exemplar:**
```javascript
await waitFor(() => { ... });
```

**Problema:** O timeout padrão configurado no setup.js é 5000ms. Múltiplos `waitFor` em sequência, especialmente os que verificam ausência de elemento (`queryByText`), podem aumentar o tempo de teste desnecessariamente.

**Impacto:** Suite de testes lenta. Em testes que verificam "algo NÃO está presente", o `waitFor` espera o timeout inteiro ou a condição ser satisfeita.

**Sugestão:** Usar `findByText` (que é `waitFor` + `getByText`) para elementos que devem aparecer. Para elementos que devem sumir, considerar `waitForElementToBeRemoved` que é mais eficiente.

---

## 3. Correções Necessárias

### 3.1 Vazamento de Mocks entre Testes (Race Conditions)

**Ocorrência:** `tests/unit/components/Admin/Managers/BackupManager.test.js` — teste "deve exibir erros retornados pela API"

**Problema:** O teste usa `mockFetch.mockResolvedValue` com `mockResolvedValueOnce` na mesma instância. Se a ordem de resolução de Promises variar, o teste pode consumir o mock errado. Além disso, o teste não restaura `window.confirm` após execução.

**Código problemático:**
```javascript
global.fetch = mockFetch;
window.confirm = jest.fn();
```

---

### 3.2 Uso de Require() em Ambiente ES Module

**Ocorrência:** `tests/setup.js` — linhas 38, 48, 59

**Código exemplar:**
```javascript
const { ReadableStream } = require('node:stream/web');
```

**Problema:** O projeto usa `import/export` (ES Modules), mas `require()` é usado para polyfills condicionais. Embora funcione com Jest (que usa CommonJS), isso é inconsistente com o padrão ES Module definido.

**Sugestão:** Usar `await import()` dinâmico ou garantir que Jest trate esses polyfills de forma consistente com o restante do projeto.

---

### 3.3 Mock de Next.js Dinâmico Pode Quebrar

**Ocorrência:** `tests/mocks/next.js`

**Problema:** O mock do Next.js pode não acompanhar atualizações da versão do Next.js. Métodos como `useRouter`, `useSearchParams`, `headers` e `cookies` mudam entre versões do Next.js.

**Sugestão:** Usar pacotes oficiais como `next-router-mock` em vez de mock manual, ou manter o mock sincronizado com a versão do Next.js no `package.json`.

---

### 3.4 Testes sem Verificação de Limpeza

**Ocorrência:** Vários arquivos — `BackupManager.test.js`, `BlogSection.test.js`, etc.

**Problema:** Testes mockam `console.error` substituindo a implementação global, mas alguns podem não restaurar corretamente em caso de falha no teste.

**Código exemplar:**
```javascript
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... teste ...
consoleSpy.mockRestore();
```
Se o teste lançar uma exceção antes de `mockRestore()`, o console.error permanece mockado.

**Sugestão:** Envolver em `try/finally` ou usar `afterEach(() => consoleSpy?.mockRestore())`.

**Aplicado parcialmente (04/06/2026):** Os arquivos mesclados (`AdminAudit.test.js`, `AdminUsersTab.test.js`, `products.test.js`) foram corrigidos para usar `afterEach` com `mockRestore()`, garantindo restauração mesmo em caso de falha.

---

### 3.5 Teste de Exportação Redundante

**Ocorrência:** `tests/unit/components/UI/index.test.js`, `tests/unit/components/Admin/index.test.js`, `tests/unit/components/Layout/index.test.js`, `tests/unit/components/Performance/index.test.js`, `tests/unit/components/SEO/index.test.js`

**Problema:** Esses testes apenas verificam se as exportações do barrel existem:
```javascript
expect(UIComponents.Button).toBeDefined();
```
Isso essencialmente testa a declaração de importação do próprio teste, não o código real. Se o barrel export quebrar, os testes de componente individuais já falhariam com "Cannot find module".

**Sugestão:** Remover estes testes ou convertê-los para verificação de snapshot da estrutura de exportação, que teria mais valor.

---

### 3.6 Testes com Cobertura Faltante

**Ocorrência:** `tests/unit/components/Features/Video/` e `tests/unit/components/Features/Testimonials/`

**Problema:** Os subdiretórios existem, mas podem não ter testes ou ter cobertura insuficiente (confirmar se arquivos .test.js estão presentes).

**Sugestão:** Verificar se todos os componentes do diretório `components/Features/` possuem testes correspondentes. Adicionar testes faltantes se necessário.

---

## 4. Melhorias Recomendadas

### 4.1 Abstração de Testes CRUD

**Descrição:** Criar uma função utilitária `testCrudEndpoint(handler, resourceConfig)` que encapsule o padrão repetitivo de:
1. Mock de dependências (db, auth, cache)
2. Testes de GET público
3. Testes de POST/PUT/DELETE admin
4. Teste de método não permitido (405)

**Benefício:** Reduzir ~30 arquivos de teste de API para ~5-8 arquivos de configuração.

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

### 4.4 Helper para Suppressão de console.error

**Descrição:** Criar uma função em `tests/helpers/index.js`:
```javascript
export const suppressConsoleError = () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return spy;
};
```

**Benefício:** Eliminar repetição do padrão beforeAll/afterAll em ~20+ arquivos.

---

### 4.5 Refatoração de Factories com Base Factory

**Descrição:** Extrair a lógica comum de factories para um `createBaseFactory(defaultsGenerator)`:
```javascript
// tests/factories/base.js
export function createBaseFactory(defaults) {
  let id = 1;
  const factory = (overrides = {}) => ({
    id: id++,
    created_at: new Date().toISOString(),
    ...defaults,
    ...overrides,
  });
  factory.list = (n = 1) => Array.from({ length: n }, () => factory());
  factory.resetId = () => { id = 1; };
  return factory;
}
```

**Benefício:** Reduzir ~60 linhas por factory. Código mais limpo e consistente.

---

### 4.6 Adicionar Testes de Integração com Banco Real

**Descrição:** Atualmente todos os testes de integração mockam o banco de dados. Adicionar uma suite de testes que rode contra um banco SQLite em memória (ou PostgreSQL de teste) validaria as queries reais.

**Benefício:** Detecção de erros em queries SQL que mocks não capturam.

---

### 4.7 Adicionar Testes de Componentes Faltantes

**Descrição:** Verificar a cobertura de testes para:
- `components/Features/Video/*`
- `components/Features/Testimonials/*`
- Possíveis outros componentes sem testes

**Benefício:** Garantir cobertura mínima para todos os componentes.

---

## 5. Inconsistências e Padrões

### 5.1 Nomenclatura Inconsistente

**Descrição:** Os arquivos de teste seguem padrões de nome diferentes:

| Padrão | Exemplos |
|--------|----------|
| `recurso.test.js` | `musicas.test.js`, `posts.test.js` |
| `recurso.flow.test.js` | `musicas_flow.test.js`, `videos_flow.test.js` |
| `recurso.api.test.js` | `backups.api.test.js`, `status.api.test.js`, `settings.api.test.js` |
| `recurso.create.test.js` | `musicas.create.test.js`, `users.create.test.js` |
| `recurso.integration.test.js` | `posts.integration.test.js` |
| `recurso.pagination.test.js` | `musicas.pagination.test.js` |

**Impacto:** Dificuldade em encontrar testes relacionados a um recurso específico.

**Sugestão:** Adotar um padrão único como `{categoria}.{recurso}.{operacao}.test.js` (ex: `api.musicas.create.test.js`) e padronizar toda a suite.

---

### 5.2 Uso Misto de snake_case e kebab-case

**Descrição:** Nomes de arquivo usam snake_case (`musicas_flow.test.js`, `create-post-flow.test.js`) enquanto outros usam notação de pontos (`musicas.create.test.js`, `backups.api.test.js`).

**Sugestão:** Padronizar toda a nomenclatura para usar notação de pontos com categorias, facilitando busca e ordenação.

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

---

## 6. Plano de Migração: `lib/middleware.js` → `lib/api/middleware.js`

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

### Checklist Resumido

- [ ] **Arquivo 2 (A):** Atualizar mock de `lib/middleware.js` → `lib/auth.js` em `tests/integration/api/upload-image.test.js`
- [ ] **Arquivo 2 (A):** Atualizar mock de `lib/db.js` → `lib/domain/settings.js` em `tests/integration/api/upload-image.test.js`
- [ ] **Arquivo 2 (A):** Atualizar import de `updateSetting` em `tests/integration/api/upload-image.test.js`
- [ ] **Arquivo 3 (A):** Atualizar mock de `lib/middleware.js` → `lib/auth.js` em `tests/unit/pages/api/upload-image.edge.test.js`
- [ ] **Arquivo 3 (A):** Atualizar mock de `lib/db.js` → `lib/domain/settings.js` em `tests/unit/pages/api/upload-image.edge.test.js`
- [ ] **Arquivo 1 (B):** Remover imports de `authenticatedApiMiddleware` e `externalAuthMiddleware` de `middleware.test.js`
- [ ] **Arquivo 1 (B):** Substituir imports de `logger`, `apiMiddleware`, `rateLimitMiddleware`, `errorHandlingMiddleware` pelos equivalentes de `lib/api/middleware.js`
- [ ] **Arquivo 1 (B):** Reestruturar mocks para `response.js`, `cache.js`, `auth.js`
- [ ] **Arquivo 1 (C):** Adaptar teste de rate limit para usar `withRateLimit` e mock de `checkRateLimit`
- [ ] **Arquivo 1 (D):** Adaptar testes de error handler para usar `withErrorHandler` e mock de `handleError`
- [ ] **Arquivo 1 (D):** Adaptar/reescrever testes de logger e apiMiddleware
- [ ] **Opcional:** Dividir `middleware.test.js` em arquivos especializados em `tests/unit/lib/api/`
- [ ] **Validação:** Executar suite completa de testes após alterações
- [ ] **Limpeza:** Remover `lib/middleware.js` do projeto

---

## Resumo das Ações Recomendadas

| Prioridade | Ação | Esforço | Impacto | Status |
|:----------:|------|:-------:|:-------:|:------:|
| Alta | ~~Centralizar `jest.clearAllMocks()` no setup.js~~ | ~~Baixo~~ | ~~Médio~~ | ✅ **Concluído (05/06)** |
| Alta | Criar helper para suppressConsoleError | Baixo | Baixo | Pendente |
| Alta | Unificar padrão de mock de fetch (spyOn vs assign) | Médio | Alto | Pendente |
| 🔴 Crítica | Migrar testes de upload-image (Grupo A) | Médio | Alto | Pendente |
| 🟡 Média | Migrar testes de middleware.error (Grupo B) | Alto | Alto | Pendente |
| Média | Abstrair testes CRUD de API | Alto | Alto | Pendente |
| Média | ~~Mesclar arquivos edge case com principais~~ | ~~Baixo~~ | ~~Médio~~ | ✅ **Concluído (04/06)** |
| Média | Padronizar nomenclatura de arquivos | Médio | Médio | Pendente |
| Média | Refatorar factories com base factory | Médio | Médio | Pendente |
| 🟢 Baixa | Migrar testes de rate-limit (Grupo C) | Médio | Médio | Pendente |
| 🟢 Baixa | Migrar testes de logger/api (Grupo D) | Alto | Médio | Pendente |
| Baixa | Remover testes de barrel export redundantes | Baixo | Baixo | Pendente |
| Baixa | Adicionar testes com banco real | Alto | Alto | Pendente |
| Baixa | Substituir dados inline por factories | Baixo | Baixo | Pendente |

---

> **Nota:** Este documento é um relatório de análise. As ações marcadas como "AJUSTADO" ou "CONCLUÍDO" foram implementadas. As demais permanecem como recomendações pendentes de revisão e priorização.