# 📁 Análise da Pasta `__mocks__/`

## Visão Geral

A pasta `__mocks__/` contém **mocks manuais** utilizados pelo Jest durante a execução dos testes. Quando um teste chama `jest.mock('pg')` ou `jest.mock('cookie')`, o Jest procura automaticamente por arquivos correspondentes dentro de `__mocks__/` e os utiliza como implementação falsa — dispensando a necessidade de criar mocks inline em cada arquivo de teste.

A pasta contém **3 arquivos**, cada um com um propósito específico descrito abaixo.

---

## 1. `__mocks__/cookie.js`

**Localização:** `__mocks__/cookie.js`

### 📌 Propósito

Mock da biblioteca `cookie` (pacote npm), responsável por serializar (`serialize`) e fazer o parsing (`parse`) de cabeçalhos HTTP `Set-Cookie` e `Cookie`.

### 🔍 O que faz

- **`serialize(name, value, options)`** — Simula a criação de um cookie HTTP. Concatena manualmente os atributos suportados (`HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`) com base no objeto `options` recebido. Retorna a string formatada do cookie.
- **`parse(cookieHeader)`** — Simula a leitura de um cabeçalho `Cookie`. Divide a string pelo separador `;`, extrai pares `nome=valor` e aplica `decodeURIComponent` no valor. Retorna um objeto com os cookies.

### 🧪 Utilização nos testes

Utilizado indiretamente. O arquivo de teste `tests/unit/lib/auth.test.js` faz **mock inline** da biblioteca `cookie` em vez de usar este mock automático:

```js
jest.mock('cookie', () => ({
  parse: (str) => { ... }
}));
```

Isso indica que o mock em `__mocks__/cookie.js` **pode não estar sendo utilizado** atualmente, servindo mais como um mock genérico disponível caso necessário.

### 🧩 Interface exportada

- `export const serialize` — função mockada via `jest.fn()`
- `export const parse` — função mockada via `jest.fn()`
- `export default cookieMock` — objeto agregador com ambas as funções

---

## 2. `__mocks__/pg.js`

**Localização:** `__mocks__/pg.js`

### 📌 Propósito

Mock da biblioteca `pg` (node-postgres), utilizada para conectar e executar consultas no banco de dados PostgreSQL. Este mock simula o comportamento do `Pool` de conexões, permitindo que testes unitários validem lógicas de acesso a dados sem depender de um banco real.

### 🔍 O que faz

- **`Pool`** — Classe mockada via `jest.fn()` que, ao ser instanciada, retorna um objeto com:
  - `query: mockQuery` — função `jest.fn()` que simula consultas SQL
  - `end()` — função `jest.fn()` que retorna `Promise.resolve(undefined)`
  - `on()` — função `jest.fn()` para registro de eventos
  - `connect()` — função `jest.fn()` que retorna um cliente mockado com `query` e `release()`
- **`mockQuery`** — Função mockada central que todos os testes usam para simular retornos de queries (`mockResolvedValue`, `mockRejectedValue`, etc.)
- **`restorePoolImplementation()`** — Função de utilidade que **re-restaura** a implementação do `Pool` após `jest.clearAllMocks()` ou `jest.resetAllMocks()` (que apagam a implementação interna dos mocks).

### ⚠️ Comportamento crítico

O arquivo inclui um mecanismo de **restauração de implementação**, pois os métodos `jest.clearAllMocks()` e `jest.resetAllMocks()` apagam a implementação original do `Pool`, fazendo com que `new Pool()` retorne `undefined`. A função `restorePoolImplementation()` é exposta para ser chamada nos `beforeEach` dos testes.

### 🧪 Utilização nos testes

Este mock é amplamente utilizado. Atualmente referenciado explicitamente em **10 arquivos de teste**:

- `tests/unit/lib/db/settings.test.js`
- `tests/unit/lib/db/createPost.test.js`
- `tests/unit/lib/db/deletePost.test.js`
- `tests/unit/lib/db/query.test.js`
- `tests/unit/lib/db/updatePost.test.js`
- `tests/unit/lib/db/getAllPosts.test.js`
- `tests/unit/lib/db/getPaginatedPosts.test.js`
- `tests/unit/lib/db/saveImage.test.js`
- `tests/unit/lib/db/musicas.test.js`
- `tests/unit/scripts/clean-orphaned-images.test.js`

Todos usam o padrão: `jest.mock('pg');` que ativa automaticamente o mock manual.

### 🧩 Interface exportada

- `export const mockQuery` — função `jest.fn()` para queries simuladas
- `export const Pool` — classe `jest.fn()` com implementação de pool
- `export function restorePoolImplementation()` — função restauradora
- `export default { Pool, mockQuery }` — exportação default para compatibilidade

---

## 3. `__mocks__/styleMock.js`

**Localização:** `__mocks__/styleMock.js`

### 📌 Propósito

Mock minimalista para arquivos de estilo CSS. Utilizado pelo Jest para substituir importações de arquivos `.css` durante a execução dos testes, evitando que o Jest tente processar CSS (o que geraria erros de parse).

### 🔍 O que faz

- Exporta um objeto vazio `{}`.

### 🧪 Utilização

Configurado no `jest.config.js` através do `moduleNameMapper`:

```js
'\\.css$': '<rootDir>/__mocks__/styleMock.js'
```

Isso faz com que qualquer importação de arquivo `.css` nos componentes seja substituída por este objeto vazio durante os testes.

### 🧩 Interface exportada

- `export default {}` — objeto vazio

---

## 📊 Resumo Geral

| Arquivo | Propósito | Status de Uso |
|---|---|---|
| `__mocks__/cookie.js` | Mock da lib `cookie` (parse/serialize) | ❓ Subutilizado — testes usam mock inline |
| `__mocks__/pg.js` | Mock do `pg.Pool` para consultas SQL | ✅ Ativo — referenciado por 10 testes |
| `__mocks__/styleMock.js` | Mock de arquivos `.css` | ✅ Ativo — via `moduleNameMapper` no Jest |

---

## 🔗 Relação com `tests/mocks/`

Além dos mocks em `__mocks__/`, o projeto também possui uma pasta `tests/mocks/` acessível via alias `@mocks`. Estes mocks são voltados para cenários mais específicos e complexos dos testes, diferente dos mocks automáticos em `__mocks__/` que são ativados globalmente pelo Jest.