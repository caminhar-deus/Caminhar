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
| 05 | 🚀 Melhoria | `__mocks__/cookie.js` | `jest.fn()` com implementação inline | Baixo | ✅ Corrigido |
| 06 | 🚀 Melhoria | `__mocks__/pg.js` | `client` de `connect()` sem `on()` para eventos | Médio | ✅ Corrigido |
| 07 | 🚀 Melhoria | `__mocks__/pg.js` | Ausência de helpers para simular erros de conexão | Médio | ✅ Corrigido |
| 09 | ♻️ Duplicidade | `jest.config.js` + `__mocks__/pg.js` | `resetMocks: true` apaga implementação | Baixo | ✅ Corrigido |
| 10 | 🚀 Melhoria | `__mocks__/pg.js` | Propriedades do Pool real ausentes (`totalCount`, `idleCount`, `waitingCount`) | Baixo | ✅ Corrigido |

---

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

### 🟡 05 — `cookie.js` — `jest.fn()` com implementação real vs mock puro

**Arquivo:** `__mocks__/cookie.js`

**Problema original:** As funções `serialize` e `parse` usavam `jest.fn(...)` com implementação diretamente como argumento, padrão misto que não deixava explícita a intenção.

**Solução aplicada:** Alterado para `jest.fn().mockImplementation(...)` explícito, separando o conceito de função espiã da implementação real.

---

### 🟡 06 — `pg.js` — Cliente de `connect()` não possui `on()` para eventos

**Arquivo:** `__mocks__/pg.js`

**Problema original:** O objeto retornado por `Pool.connect()` possuía `query` e `release`, mas não possuía `on()`. Códigos que fizessem `client.on('error', handler)` quebrariam.

**Solução aplicada:** Adicionado `on: jest.fn()` ao cliente retornado por `connect()`.

---

### 🟡 07 — `pg.js` — Ausência de helpers para simular erros de conexão

**Arquivo:** `__mocks__/pg.js`

**Problema original:** O mock focava apenas em cenários de sucesso, sem funções auxiliares para simular falhas.

**Solução aplicada:** Adicionadas duas funções exportadas:
- `simulateQueryError(error)` — Configura `mockQuery` para rejeitar com erro personalizado.
- `simulateConnectionError(error)` — Configura `Pool` para que `connect()` rejeite.

---

### 🟡 09 — Duplicidade: `resetMocks: true` conflita com implementação do `Pool`

**Arquivo:** `jest.config.js` + `__mocks__/pg.js`

**Problema original:** `resetMocks: true` apagava as implementações de todos os `jest.fn()`, incluindo a implementação do `Pool`, exigindo `restorePoolImplementation()` manual.

**Solução aplicada:** Removido `resetMocks: true` do `jest.config.js`. Mantido `clearMocks: true` (limpa apenas chamadas, sem apagar implementações) e `restoreMocks: true`.

---

### 🟢 10 — `pg.js` — Ausência de propriedades do Pool real

**Arquivo:** `__mocks__/pg.js`

**Problema original:** O `Pool` real do `pg` expõe propriedades como `totalCount`, `idleCount` e `waitingCount`, ausentes no mock.

**Solução aplicada:** Adicionadas como valores constantes (`0`) no retorno de `poolImplementation()`.

---

## 📋 Itens Analisados sem Correção

| # | Tipo | Arquivo | Descrição | Impacto | Decisão |
|---|---|---|---|---|---|
| 08 | 🚀 Melhoria | `__mocks__/pg.js` | `mockQuery` compartilhado pode gerar interferência entre testes | Alto | ⚠️ Mantido singleton por incompatibilidade com arquitetura existente |

### 🟡 08 — `pg.js` — `mockQuery` singleton compartilhado

**Arquivo:** `__mocks__/pg.js`

**Problema:** `mockQuery` é um singleton compartilhado entre todas as instâncias de `Pool` e todas as chamadas a `client.query()`, podendo gerar interferência.

**Análise:** A separação de `mockQuery` por instância (Opção A) foi testada, mas a arquitetura dos 10 arquivos de teste que importam `mockQuery` de `'pg'` depende de uma referência única e estável. A implementação por Proxy ou instância por pool quebra a compatibilidade com padrões como `mockQuery.mockResolvedValue()`, `mockQuery.mockImplementation()` e `mockQuery.mock.calls`.

**Decisão:** Mantido como singleton. Documentação atualizada no topo do arquivo alertando sobre a necessidade de `mockQuery.mockClear()` + `restorePoolImplementation()` no `beforeEach` para evitar interferência entre testes.

---

## Resumo Final

| Status | Qtd | Itens |
|---|---|---|
| ✅ Corrigidos | 9 | 01, 02, 03, 04, 05, 06, 07, 09, 10 |
| ⚠️ Mantido (inviável) | 1 | 08 |