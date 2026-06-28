# 📁 Análise da Pasta `__mocks__/`

## Visão Geral

A pasta `__mocks__/` contém **mocks manuais** utilizados pelo Jest durante a execução dos testes. O Jest resolve automaticamente mocks manuais desta pasta quando um teste chama `jest.mock('<nome-do-modulo>')`, ou quando o mapeamento é configurado via `moduleNameMapper` no `jest.config.js`.

A pasta contém **3 arquivos** e **nenhuma subpasta**, cada um com um propósito distinto:

| Arquivo | Propósito | Mecanismo de Ativação |
|---|---|---|
| `__mocks__/pg.js` | Mock da biblioteca `pg` (node-postgres) | `jest.mock('pg')` em arquivos de teste |
| `__mocks__/cookie.js` | Mock da biblioteca `cookie` (npm) | `jest.mock('cookie')` — **atualmente não utilizado** |
| `__mocks__/styleMock.js` | Mock de arquivos CSS Module | `moduleNameMapper` no `jest.config.js` |

---

## 1. `__mocks__/pg.js`

**Localização:** `/home/qa/Projeto/Caminhar/__mocks__/pg.js`
**Tamanho:** 3.868 bytes (106 linhas)

### 📌 Propósito

Mock centralizado e compartilhado para a biblioteca `pg` (node-postgres). Simula o comportamento do `Pool` de conexões PostgreSQL, permitindo que testes unitários validem lógicas de acesso a dados sem depender de um banco real.

### 🔍 Funcionalidades

| Componente | Descrição |
|---|---|
| **`mockQuery`** | Função `jest.fn()` singleton compartilhada entre `Pool.query()` e `connect().query()`. Usada nos testes para simular retornos via `mockResolvedValue`, `mockRejectedValue`, etc. |
| **`Pool`** | Classe mockada via `jest.fn()` que, ao ser instanciada, retorna um objeto simulando o Pool real com: `query` (aponta para `mockQuery`), `end()` (retorna `undefined`), `on()` (registro de eventos), `connect()` (retorna cliente mockado com `query`, `release` e `on`), e propriedades `totalCount`, `idleCount`, `waitingCount` (valor `0`). |
| **`restorePoolImplementation()`** | Restaura a implementação do `Pool` após `jest.clearAllMocks()` ou `jest.resetAllMocks()`, que apagam a implementação interna dos mocks. |
| **`simulateQueryError(error)`** | Helper que configura `mockQuery` para rejeitar com um erro personalizado. |
| **`simulateConnectionError(error)`** | Helper que configura `Pool` para que `connect()` rejeite com um erro personalizado. |

### 🧪 Consumo nos Testes

Ativado via `jest.mock('pg')` nos seguintes **16 arquivos de teste**:

**Testes de banco de dados (`tests/unit/lib/db/`)** — 10 arquivos:
- `tests/unit/lib/db/createPost.test.js`
- `tests/unit/lib/db/deletePost.test.js`
- `tests/unit/lib/db/getAllPosts.test.js`
- `tests/unit/lib/db/getPaginatedPosts.test.js`
- `tests/unit/lib/db/musicas.test.js`
- `tests/unit/lib/db/query.test.js`
- `tests/unit/lib/db/saveImage.test.js`
- `tests/unit/lib/db/settings.test.js`
- `tests/unit/lib/db/updatePost.test.js`
- `tests/unit/lib/db.test.js`

**Testes de scripts (`tests/unit/scripts/`)** — 6 arquivos:
- `tests/unit/scripts/clean-orphaned-images.test.js`
- `tests/unit/scripts/clear-db.test.js`
- `tests/unit/scripts/clear-musicas.test.js`
- `tests/unit/scripts/reset-password.test.js`
- `tests/unit/scripts/seed-all.test.js`
- `tests/unit/scripts/utils/cleanup.test.js`

### 🧩 Interface Exportada

```js
export const mockQuery = jest.fn();                    // Singleton de query
export const Pool = jest.fn(poolImplementation);       // Classe Pool mockada
export function restorePoolImplementation() { ... }    // Restaura implementação
export function simulateQueryError(error) { ... }      // Simula erro em query
export function simulateConnectionError(error) { ... } // Simula erro de conexão
export default { Pool, mockQuery };                    // Exportação default
```

### ⚠️ Observações Técnicas

- O `mockQuery` é um **singleton** compartilhado entre `Pool.query` e `connect().query`. Isso garante que configurações como `mockResolvedValue` funcionem em ambas as rotas, mas pode gerar **interferência entre testes** se não for limpo adequadamente.
- O `jest.config.js` utiliza `clearMocks: true`, que limpa apenas chamadas (`calls`) entre testes, preservando implementações. Portanto, `restorePoolImplementation()` só é necessário se o teste usar `jest.clearAllMocks()` ou `jest.resetAllMocks()`.
- As propriedades `totalCount`, `idleCount` e `waitingCount` são fixas em `0` — não é possível simular estados diferentes do pool.

---

## 2. `__mocks__/cookie.js`

**Localização:** `/home/qa/Projeto/Caminhar/__mocks__/cookie.js`
**Tamanho:** 1.169 bytes (45 linhas)

### 📌 Propósito

Mock da biblioteca `cookie` (pacote npm), responsável por serializar (`serialize`) e fazer o parsing (`parse`) de cabeçalhos HTTP `Set-Cookie` e `Cookie`.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`serialize(name, value, options)`** | Simula a criação de um cookie HTTP. Concatena os atributos suportados (`HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`) com base no objeto `options`. Retorna a string formatada. |
| **`parse(cookieHeader)`** | Simula a leitura de um cabeçalho `Cookie`. Divide a string pelo separador `;`, extrai pares `nome=valor` usando `indexOf('=')` + `slice()` (corrigido para suportar valores com `=`), e decodifica o valor com `decodeURIComponent`. |

### 🧩 Interface Exportada

```js
export const serialize = jest.fn().mockImplementation(...);
export const parse = jest.fn().mockImplementation(...);
export default { serialize, parse };
```

### ⚠️ Orphan Mock — **Arquivo não utilizado atualmente**

Este mock foi analisado e **não está sendo consumido por nenhum arquivo de teste no projeto atual**. As evidências:

1. **`lib/auth.js` não utiliza a biblioteca `cookie`** — O arquivo implementa funções próprias `parseCookie()` e `serializeCookie()` nas linhas 8–30, sem dependência externa.
2. **Nenhum arquivo de teste chama `jest.mock('cookie')`** — A pesquisa não encontrou ocorrências em nenhum arquivo da pasta `tests/`.
3. **O pacote `cookie` não está nas dependências do projeto** — Não consta em `dependencies` nem em `devDependencies` no `package.json`.

**Conclusão:** O arquivo `__mocks__/cookie.js` é um **mock órfão** — resquício de uma versão anterior do projeto em que a autenticação dependia da biblioteca `cookie`. Permanece no repositório sem utilidade funcional.

---

## 3. `__mocks__/styleMock.js`

**Localização:** `/home/qa/Projeto/Caminhar/__mocks__/styleMock.js`
**Tamanho:** 49 bytes (3 linhas)

### 📌 Propósito

Mock para arquivos de estilo CSS Module. Utilizado pelo Jest para substituir importações de arquivos `.css` durante a execução dos testes, evitando erros de parse de CSS, ao mesmo tempo que mantém compatibilidade com seletores CSS usados nos testes de componentes.

### 🔍 Funcionalidades

- Mapeia a classe CSS Module `skeletonBox` para o nome de classe `'skeleton-box'`.
- Permite que testes encontrem elementos via seletores como `.skeleton-box` no DOM renderizado.

### ⚙️ Configuração

Ativado no `jest.config.js` através do `moduleNameMapper`:

```js
'\\.css$': '<rootDir>/__mocks__/styleMock.js'
```

Isso faz com que **qualquer importação de arquivo `.css`** nos componentes seja substituída por este objeto durante os testes.

### 🧩 Interface Exportada

```js
export default { skeletonBox: 'skeleton-box' };
```

### ⚠️ Observações Técnicas

- Apenas a classe `skeletonBox` é mapeada. Se outros componentes utilizarem classes CSS Module diferentes (ex.: `container`, `title`, `form`), elas retornarão `undefined` nos testes, o que pode gerar falsos negativos ou dificultar a escrita de testes baseados em seletores CSS.

---

## 📊 Resumo Geral

| # | Arquivo | Propósito | Status | Consumido por |
|---|---|---|---|---|
| 1 | `__mocks__/pg.js` | Mock do `pg.Pool` para consultas SQL | ✅ Ativo | 16 arquivos de teste |
| 2 | `__mocks__/cookie.js` | Mock da lib `cookie` (parse/serialize) | ⚠️ **Órfão** | Nenhum arquivo |
| 3 | `__mocks__/styleMock.js` | Mock de arquivos `.css` para CSS Modules | ✅ Ativo | `jest.config.js` (moduleNameMapper) |

**Total de arquivos:** 3 | **Subpastas:** Nenhuma
**Mocks ativos:** 2 (pg.js, styleMock.js)
**Mock órfão:** 1 (cookie.js)

---

## 🔗 Relação com `tests/mocks/`

Além dos mocks em `__mocks__/`, o projeto também possui uma pasta `tests/mocks/` acessível via alias `@mocks` (configurado no `jest.config.js`). Enquanto `__mocks__/` contém mocks **automáticos** (resolvidos pelo Jest por nome de módulo), a pasta `tests/mocks/` contém mocks de **mais alto nível** para cenários específicos dos testes (ex.: mocks de Next.js, fetch, cache, autenticação), geralmente importados manualmente pelos arquivos de teste.

