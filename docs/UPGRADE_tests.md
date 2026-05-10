# Relatório de Upgrade — Testes (`/tests/`)

> **Objetivo:** Reportar correções, melhorias, problemas de performance e duplicidade de código identificados na análise dos arquivos de teste. Nenhuma correção ou melhoria foi aplicada — apenas reportada.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Problemas de Performance](#2-problemas-de-performance)
3. [Correções Necessárias](#3-correções-necessárias)
4. [Melhorias Recomendadas](#4-melhorias-recomendadas)
5. [Inconsistências e Padrões](#5-inconsistências-e-padrões)

---

## 1. Duplicidade de Código

### 1.1 Padrão CRUD Repetido em Testes de Integração

**Ocorrência:** `tests/integration/api/` — múltiplos arquivos

**Descrição:** Os testes de API para `musicas.test.js`, `videos.test.js`, `posts.test.js` e `products.test.js` seguem exatamente o mesmo padrão:
1. Mock de `db`, `auth`, `cache`
2. Testes de GET (público), POST (admin), PUT (admin), DELETE (admin)
3. Verificação de método não permitido (405)
4. Setup/teardown idêntico (`beforeEach` com `jest.clearAllMocks()`)

**Impacto:** Manutenção dificultada — qualquer mudança no padrão de handler requer alteração em múltiplos arquivos idênticos.

**Sugestão:** Criar um helper de testes de API que abstraia o padrão CRUD (ex: `testCrudEndpoint(handler, { list, create, update, delete })`) ou unificar em um único arquivo parametrizado.

---

### 1.2 Separação Edge Case vs. Teste Principal

**Ocorrência:**
- `AdminAudit.test.js` + `AdminAudit.edge.test.js`
- `AdminUsersTab.test.js` + `AdminUsersTab.edge.test.js`
- `products.edge.test.js` (em `tests/unit/pages/api/`) + `products.test.js` (em `tests/integration/api/`)

**Descrição:** Casos de borda foram separados em arquivos distintos dos testes principais. Isso fragmenta a compreensão do que um componente/teste cobre.

**Impacto:** Dificuldade em saber se um componente está completamente testado — é necessário verificar dois arquivos. Risco de duplicação de setup.

**Sugestão:** Mesclar arquivos de edge case com os respectivos testes principais, organizando em `describe('Casos de Borda', () => { ... })` dentro do mesmo arquivo.

---

### 1.3 API v1 com Sobreposição de Testes

**Ocorrência:** `tests/integration/api/v1/`

**Descrição:** Os testes da API versão 1 (`v1/posts.test.js`, `v1/settings.test.js`, `v1/status.test.js`) testam endpoints que possuem cobertura equivalente nos testes de API padrão (`api/posts.test.js`, `api/settings.test.js`).

**Impacto:** Duplicação de manutenção para versões diferentes do mesmo endpoint. Se a lógica de negócio for compartilhada, os testes podem estar testando o mesmo código duas vezes.

**Sugestão:** Avaliar se a API v1 é uma camada fina sobre a mesma lógica. Se sim, concentrar testes na camada de lógica e reduzir testes de integração duplicados para a v1.

---

### 1.4 Repetição de Setup/Teardown em Testes Unitários

**Ocorrência:** Presente na maioria dos arquivos em `tests/unit/components/Admin/`, `tests/unit/lib/`, `tests/unit/pages/api/`

**Descrição:** Quase todos os arquivos repetem o mesmo padrão de setup:
```javascript
beforeEach(() => {
  jest.clearAllMocks();
});
```
E vários repetem:
```javascript
const originalConsoleError = console.error;
beforeAll(() => { console.error = jest.fn(); });
afterAll(() => { console.error = originalConsoleError; });
```

**Impacto:** ~40+ arquivos contendo o mesmo boilerplate. Código verboso e difícil de manter.

**Sugestão:** Mover `jest.clearAllMocks()` para `setup.js` global. Criar um helper `suppressConsoleError()` importável para evitar repetição do padrão beforeAll/afterAll.

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

**Ocorrência:** Múltiplos arquivos — `AdminAudit.edge.test.js`, `AdminUsersTab.edge.test.js`, `products.edge.test.js`, `BackupManager.test.js`, `BlogSection.test.js`, etc.

**Código exemplar:**
```javascript
const originalConsoleError = console.error;
beforeAll(() => { console.error = jest.fn(); });
afterAll(() => { console.error = originalConsoleError; });
```

**Problema:** Cada arquivo substitui `console.error` globalmente, com Suppressão total (sem filtro) durante toda a execução da suite. Isso mascara warnings legítimos que poderiam indicar problemas reais.

**Impacto na Performance:** `jest.spyOn(console, 'error')` é mais performático que substituir a referência global diretamente, além de permitir restauração automática.

**Sugestão:** Substituir por `jest.spyOn(console, 'error').mockImplementation(() => {})` e usar `mockRestore()` no `afterAll`. Ou melhor: filtrar apenas warnings esperados (como feito no `setup.js`) em vez de silenciar tudo.

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

**Exemplo (produtos.edge.test.js):**
```javascript
jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  logActivity: jest.fn()
}));
```

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

**Ocorrência:** `tests/unit/pages/api/products.edge.test.js` e outros

**Problema:** Vários testes mockam `console.error` substituindo a implementação global, mas alguns podem não restaurar corretamente em caso de falha no teste.

**Código exemplar:**
```javascript
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... teste ...
consoleSpy.mockRestore();
```
Se o teste lançar uma exceção antes de `mockRestore()`, o console.error permanece mockado.

**Sugestão:** Envolver em `try/finally` ou usar `afterEach(() => consoleSpy?.mockRestore())`.

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

### 4.2 Unificação de Arquivos Edge Case

**Descrição:** Mesclar `AdminAudit.edge.test.js` em `AdminAudit.test.js` e `AdminUsersTab.edge.test.js` em `AdminUsersTab.test.js`, organizando em `describe('Casos de Borda', ...)`.

**Benefício:** Melhor legibilidade e navegação. Redução de 2 arquivos.

---

### 4.3 Centralização de Mocks no `setup.js`

**Descrição:** Mover padrões comuns como `jest.clearAllMocks()` e restauração de mocks para o `setup.js` global. Atualmente, o setup.js faz cleanup DOM via `afterEach(cleanup)` mas não limpa mocks.

**Código sugerido para setup.js:**
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

**Descrição:** Alguns testes usam `createMocks` de `node-mocks-http` (via helpers/api.js) enquanto outros constroem objetos `req`/`res` manualmente (ex: `products.edge.test.js`).

**Ocorrência em products.edge.test.js:**
```javascript
req = { method: 'GET', query: {}, body: {}, headers: {}, socket: {} };
res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn(), end: jest.fn() };
```

**Sugestão:** Unificar o uso de `node-mocks-http` em todos os testes de handler para consistência.

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

## Resumo das Ações Recomendadas

| Prioridade | Ação | Esforço | Impacto |
|:----------:|------|:-------:|:-------:|
| Alta | Centralizar `jest.clearAllMocks()` no setup.js | Baixo | Médio |
| Alta | Criar helper para suppressConsoleError | Baixo | Baixo |
| Alta | Unificar padrão de mock de fetch (spyOn vs assign) | Médio | Alto |
| Média | Abstrair testes CRUD de API | Alto | Alto |
| Média | Mesclar arquivos edge case com principais | Baixo | Médio |
| Média | Padronizar nomenclatura de arquivos | Médio | Médio |
| Média | Refatorar factories com base factory | Médio | Médio |
| Baixa | Remover testes de barrel export redundantes | Baixo | Baixo |
| Baixa | Adicionar testes com banco real | Alto | Alto |
| Baixa | Substituir dados inline por factories | Baixo | Baixo |

---

> **Nota:** Este documento é um relatório de análise. Nenhuma das alterações mencionadas foi implementada. Recomenda-se revisão e priorização antes de aplicar qualquer modificação.