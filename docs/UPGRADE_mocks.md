# 🔧 Relatório de Análise — Correções, Melhorias e Duplicidade

## `__mocks__/`

---

## Sumário das Ocorrências Encontradas

| # | Tipo | Arquivo | Descrição | Impacto |
|---|---|---|---|---|
| 01 | 🐛 Correção | `__mocks__/cookie.js` | `parse()` não lida com valores contendo `=` | Alto |
| 02 | 🐛 Correção | `__mocks__/cookie.js` | `serialize()` não trata `maxAge === 0` | Médio |
| 03 | ♻️ Duplicidade | `__mocks__/cookie.js` | Mock inline sobrescreve manual em `auth.test.js` | Alto |
| 04 | ♻️ Duplicidade | `styleMock.js` (raiz) vs `__mocks__/styleMock.js` | Dois arquivos idênticos | Médio |
| 05 | 🚀 Melhoria | `__mocks__/cookie.js` | `parse()` não utiliza `jest.fn()` com implementação pura | Baixo |
| 06 | 🚀 Melhoria | `__mocks__/pg.js` | `client` de `connect()` sem `on()` para eventos | Médio |
| 07 | 🚀 Melhoria | `__mocks__/pg.js` | Ausência de helpers para simular erros de conexão | Médio |
| 08 | 🚀 Melhoria | `__mocks__/pg.js` | `mockQuery` compartilhado pode gerar interferência entre testes | Alto |
| 09 | ♻️ Duplicidade | `jest.config.js` + `__mocks__/pg.js` | `resetMocks: true` apaga implementação, exigindo `restorePoolImplementation()` | Baixo |
| 10 | 🚀 Melhoria | `__mocks__/pg.js` | Ausência de simulação para `Pool.totalCount`, `Pool.idleCount`, `Pool.waitingCount` | Baixo |

---

## 🔴 01 — `cookie.js` — `parse()` não lida com valores contendo `=`

**Arquivo:** `__mocks__/cookie.js` — Linha 24

**Problema:**
```js
const [name, value] = pair.trim().split('=');
```

O operador `split('=')` com desestruturação captura apenas a primeira ocorrência de `=`. Se o valor do cookie contiver `=` (comum em tokens JWT, strings base64, dados serializados), o valor será truncado.

**Exemplo de falha:**
```js
parse('token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozw');
// Resultado esperado: { token: 'eyJhbGci...' }
// Resultado atual:   { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }
```

**Sugestão:** Usar `pair.trim().split(/=(.*)/s)` ou capturar o resto da string após o primeiro `=`.

---

## 🔴 02 — `cookie.js` — `serialize()` não trata `maxAge === 0`

**Arquivo:** `__mocks__/cookie.js` — Linha 11

**Problema:**
```js
if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
```

Quando `options.maxAge` é `0`, a condição é falsa e o atributo não é adicionado. Na especificação HTTP, `Max-Age=0` é válido e indica que o cookie deve ser expirado imediatamente.

**Sugestão:** Usar `if (options.maxAge !== undefined)`.

---

## 🔴 03 — Duplicidade: Mock inline sobrescreve mock manual em `auth.test.js`

**Arquivos envolvidos:** `__mocks__/cookie.js` e `tests/unit/lib/auth.test.js`

**Problema:**
O arquivo `tests/unit/lib/auth.test.js` define um mock inline completo:
```js
jest.mock('cookie', () => ({
  parse: (str) => { ... }
}));
```

Isso **substitui** o mock manual em `__mocks__/cookie.js`, tornando-o obsoleto e ignorado durante a execução desses testes. Há duplicação de lógica e manutenção de duas implementações similares que podem divergir com o tempo.

**Sugestão:** Remover o mock inline de `auth.test.js` e fazer apenas `jest.mock('cookie')` para ativar o mock manual, ou migrar o mock inline para `__mocks__/cookie.js` se a implementação do teste for mais adequada.

---

## 🔴 04 — Duplicidade: Dois arquivos `styleMock.js` idênticos

**Arquivos envolvidos:** `styleMock.js` (raiz) e `__mocks__/styleMock.js`

**Problema:**
Existem dois arquivos com o mesmo conteúdo (`export default {}`):

| Arquivo | Referenciado em |
|---|---|
| `__mocks__/styleMock.js` | `jest.config.js` → `moduleNameMapper` |
| `styleMock.js` (raiz) | ❓ Nenhuma referência encontrada |

O arquivo na raiz não é referenciado por nenhuma configuração do Jest e não é importado por nenhum teste. Trata-se de um **artefato não utilizado** que pode causar confusão.

**Sugestão:** Remover `styleMock.js` da raiz do projeto.

---

## 🟡 05 — `cookie.js` — `jest.fn()` com implementação real vs mock puro

**Arquivo:** `__mocks__/cookie.js`

**Problema:**
As funções `serialize` e `parse` são `jest.fn()` com implementação real. Isso é um padrão misto: a função registra chamadas (`mock.calls`) mas também executa lógica real. Dependendo do objetivo do teste, pode ser preferível separar:

- **Mock puro** (`jest.fn()`) quando apenas se quer verificar se foi chamada.
- **Implementação real** (`jest.fn().mockImplementation(...)`) quando se quer validar a saída.

**Sugestão:** Definir o mock com `jest.fn().mockImplementation(...)` explícito para deixar clara a intenção.

---

## 🟡 06 — `pg.js` — Cliente de `connect()` não possui `on()` para eventos

**Arquivo:** `__mocks__/pg.js` — Linhas 21–25

**Problema:**
O objeto retornado por `Pool.connect()` possui `query` e `release`, mas **não possui** um método `on()`:

```js
connect: jest.fn().mockResolvedValue({
  query: mockQuery,
  release: jest.fn(),
  // ❌ on: jest.fn() — ausente
}),
```

Códigos que façam `client.on('error', handler)` diretamente no cliente quebrarão em testes.

**Sugestão:** Adicionar `on: jest.fn()` ao cliente retornado por `connect()`.

---

## 🟡 07 — `pg.js` — Ausência de helpers para simular erros de conexão

**Arquivo:** `__mocks__/pg.js`

**Problema:**
O mock atualmente foca apenas em cenários de sucesso. Não há funções auxiliares ou configurações para simular:

- Falha de conexão (pool não conecta ao banco)
- Timeout de query
- Erro de sintaxe SQL
- Conexão perdida durante query

**Impacto:** Testes que precisam validar tratamento de erros de banco precisam criar suas próprias configurações de mock, pulverizando lógica.

**Sugestão:** Exportar funções auxiliares como `simulateConnectionError()`, `simulateQueryError(error)` ou expor `Pool.mockRejectedValue()` para cenários de falha.

---

## 🟡 08 — `pg.js` — `mockQuery` compartilhado gera interferência entre testes

**Arquivo:** `__mocks__/pg.js`

**Problema:**
`mockQuery` é um singleton: um único `jest.fn()` compartilhado entre todas as instâncias de `Pool` e todas as chamadas a `client.query()`.

Em testes paralelos ou testes que executam múltiplas queries, o `mockQuery` acumula chamadas de todas as queries executadas, podendo gerar interferência se não for restaurado corretamente entre testes.

Embora `resetMocks: true` e `clearMocks: true` no `jest.config.js` ajudem, essa dependência do `restorePoolImplementation()` adicional revela a fragilidade do padrão.

**Sugestão:** Considerar criar `mockQuery` como um `jest.fn()` por instância de pool, ou documentar explicitamente que todos os testes precisam chamar `mockQuery.mockClear()` + `restorePoolImplementation()` no `beforeEach`.

---

## 🟡 09 — Duplicidade: `resetMocks: true` conflita com implementação do `Pool`

**Arquivo:** `jest.config.js` (linha 67) + `__mocks__/pg.js`

**Problema:**
A configuração do Jest possui:

```js
resetMocks: true,   // ← apaga implementações de todos os jest.fn()
```

Isso é incompatível com `__mocks__/pg.js` que define uma implementação concreta para `Pool`. Cada `resetMocks` apaga a implementação, e o desenvolvedor é obrigado a chamar `restorePoolImplementation()` manualmente.

**Sugestão:** Avaliar se `resetMocks: true` é necessário globalmente. Alternativa: usar `clearMocks: true` (que limpa apenas chamadas, sem apagar implementações) e remover `resetMocks: true`.

---

## 🟢 10 — `pg.js` — Ausência de propriedades do Pool real

**Arquivo:** `__mocks__/pg.js`

**Problema:**
O `Pool` real do `pg` expõe propriedades como:
- `totalCount` — número total de conexões no pool
- `idleCount` — número de conexões ociosas
- `waitingCount` — número de conexões aguardando

O mock atual não expõe essas propriedades. Testes que precisem verificar o estado do pool (embora raro em testes unitários puros) podem falhar.

**Sugestão:** Adicionar essas propriedades como `jest.fn()` ou valores constantes, mesmo que não sejam implementadas funcionalmente.

---

## Conclusão

### 🔴 Prioridade Alta (Corrigir)

| Item | Descrição |
|---|---|
| 01 | `parse()` trunca valores com `=` |
| 02 | `maxAge === 0` ignorado |
| 03 | Mock duplicado entre `__mocks__/cookie.js` e `auth.test.js` |
| 04 | `styleMock.js` órfão na raiz |

### 🟡 Prioridade Média (Melhorar)

| Item | Descrição |
|---|---|
| 05 | Misto de implementação real vs mock em `cookie.js` |
| 06 | Cliente de `connect()` sem `on()` |
| 07 | Falta de helpers para simular erros |
| 08 | `mockQuery` singleton e interferência entre testes |
| 09 | Conflito `resetMocks: true` com implementação do `Pool` |

### 🟢 Prioridade Baixa (Opcional)

| Item | Descrição |
|---|---|
| 10 | Propriedades do Pool real ausentes |