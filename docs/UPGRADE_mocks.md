# 🔧 Relatório de Análise — Correções, Melhorias e Duplicidade

## `__mocks__/`

---

## ✅ Itens Corrigidos

| # | Tipo | Arquivo | Descrição | Impacto | Resolução |
|---|---|---|---|---|---|
| 01 | 🐛 Correção | `__mocks__/cookie.js` | `parse()` não lida com valores contendo `=` | Alto | ✅ Corrigido |
| 02 | 🐛 Correção | `__mocks__/cookie.js` | `serialize()` não trata `maxAge === 0` | Médio | ✅ Corrigido |
| 03 | ♻️ Duplicidade | `__mocks__/cookie.js` | Mock inline sobrescreve manual em `auth.test.js` | Alto | ✅ Corrigido |
| 04 | ♻️ Duplicidade | `styleMock.js` (raiz) vs `__mocks__/styleMock.js` | Dois arquivos idênticos | Médio | ✅ Resolvido (arquivo já não existia) |
| 09 | ♻️ Duplicidade | `jest.config.js` + `__mocks__/pg.js` | `resetMocks: true` apaga implementação, exigindo `restorePoolImplementation()` | Baixo | ✅ Corrigido |

### 🔴 01 — `cookie.js` — `parse()` não lida com valores contendo `=`

**Arquivo:** `__mocks__/cookie.js`

**Problema original:**
```js
const [name, value] = pair.trim().split('=');
```

O operador `split('=')` com desestruturação capturava apenas a primeira ocorrência de `=`, truncando valores como JWT tokens ou base64.

**Solução aplicada:** Substituído por `indexOf('=')` + `slice()` para capturar o restante da string após o primeiro `=`:

```js
const sepIndex = trimmed.indexOf('=');
if (sepIndex === -1) continue;

const name = trimmed.slice(0, sepIndex);
const value = trimmed.slice(sepIndex + 1);
```

---

### 🔴 02 — `cookie.js` — `serialize()` não trata `maxAge === 0`

**Arquivo:** `__mocks__/cookie.js`

**Problema original:**
```js
if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
```

Quando `options.maxAge` era `0`, a condição era falsa e o atributo não era adicionado.

**Solução aplicada:** Alterado para:
```js
if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
```

---

### 🔴 03 — Duplicidade: Mock inline sobrescreve mock manual em `auth.test.js`

**Arquivos envolvidos:** `__mocks__/cookie.js` e `tests/unit/lib/auth.test.js`

**Problema original:** O arquivo `tests/unit/lib/auth.test.js` definia um mock inline completo que substituía o mock manual em `__mocks__/cookie.js`, gerando duplicação de lógica.

**Solução aplicada:** Substituído o mock inline por `jest.mock('cookie')`, ativando o mock manual em `__mocks__/cookie.js`.

---

### 🔴 04 — Duplicidade: Dois arquivos `styleMock.js` idênticos

**Arquivos envolvidos:** `styleMock.js` (raiz) e `__mocks__/styleMock.js`

**Problema original:** Existiam dois arquivos com o mesmo conteúdo (`export default {}`). O arquivo na raiz não era referenciado por nenhuma configuração.

**Resolução:** O arquivo `styleMock.js` na raiz já não existe mais no projeto, restando apenas `__mocks__/styleMock.js` que é o referenciado pelo `jest.config.js`.

---

### 🟡 09 — Duplicidade: `resetMocks: true` conflita com implementação do `Pool`

**Arquivo:** `jest.config.js` + `__mocks__/pg.js`

**Problema original:** `resetMocks: true` apagava as implementações de todos os `jest.fn()`, incluindo a implementação do `Pool` em `__mocks__/pg.js`, exigindo `restorePoolImplementation()` manual.

**Solução aplicada:** Removido `resetMocks: true` do `jest.config.js`. Mantido `clearMocks: true` (limpa apenas chamadas, sem apagar implementações) e `restoreMocks: true`.

---

## 📋 Itens Pendentes (Não corrigidos)

| # | Tipo | Arquivo | Descrição | Impacto |
|---|---|---|---|---|
| 05 | 🚀 Melhoria | `__mocks__/cookie.js` | `parse()` não utiliza `jest.fn()` com implementação pura | Baixo |
| 06 | 🚀 Melhoria | `__mocks__/pg.js` | `client` de `connect()` sem `on()` para eventos | Médio |
| 07 | 🚀 Melhoria | `__mocks__/pg.js` | Ausência de helpers para simular erros de conexão | Médio |
| 08 | 🚀 Melhoria | `__mocks__/pg.js` | `mockQuery` compartilhado pode gerar interferência entre testes | Alto |
| 10 | 🚀 Melhoria | `__mocks__/pg.js` | Ausência de simulação para `Pool.totalCount`, `Pool.idleCount`, `Pool.waitingCount` | Baixo |

---

### 🟡 05 — `cookie.js` — `jest.fn()` com implementação real vs mock puro

**Arquivo:** `__mocks__/cookie.js`

**Problema:**
As funções `serialize` e `parse` são `jest.fn()` com implementação real. Isso é um padrão misto: a função registra chamadas (`mock.calls`) mas também executa lógica real.

**Sugestão:** Definir o mock com `jest.fn().mockImplementation(...)` explícito para deixar clara a intenção.

---

### 🟡 06 — `pg.js` — Cliente de `connect()` não possui `on()` para eventos

**Arquivo:** `__mocks__/pg.js`

**Problema:**
O objeto retornado por `Pool.connect()` possui `query` e `release`, mas **não possui** um método `on()`.

**Sugestão:** Adicionar `on: jest.fn()` ao cliente retornado por `connect()`.

---

### 🟡 07 — `pg.js` — Ausência de helpers para simular erros de conexão

**Arquivo:** `__mocks__/pg.js`

**Problema:**
O mock atualmente foca apenas em cenários de sucesso. Não há funções auxiliares para simular falhas.

**Sugestão:** Exportar funções auxiliares como `simulateConnectionError()`, `simulateQueryError(error)` ou expor `Pool.mockRejectedValue()` para cenários de falha.

---

### 🟡 08 — `pg.js` — `mockQuery` compartilhado gera interferência entre testes

**Arquivo:** `__mocks__/pg.js`

**Problema:**
`mockQuery` é um singleton compartilhado entre todas as instâncias de `Pool` e todas as chamadas a `client.query()`, podendo gerar interferência.

**Sugestão:** Considerar criar `mockQuery` como um `jest.fn()` por instância de pool, ou documentar explicitamente que todos os testes precisam chamar `mockQuery.mockClear()` + `restorePoolImplementation()` no `beforeEach`.

---

### 🟢 10 — `pg.js` — Ausência de propriedades do Pool real

**Arquivo:** `__mocks__/pg.js`

**Problema:**
O `Pool` real do `pg` expõe propriedades como `totalCount`, `idleCount` e `waitingCount` que não estão no mock atual.

**Sugestão:** Adicionar essas propriedades como `jest.fn()` ou valores constantes.

---

## Resumo Geral

| Status | Qtd | Itens |
|---|---|---|
| ✅ Corrigidos | 5 | 01, 02, 03, 04, 09 |
| 📋 Pendentes | 5 | 05, 06, 07, 08, 10 |