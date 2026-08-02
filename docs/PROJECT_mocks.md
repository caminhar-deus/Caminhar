# 📁 Análise da Pasta de Mocks do Projeto

## Visão Geral

O projeto possui **duas pastas de mocks** com responsabilidades distintas, ambas utilizadas pelo Jest durante a execução dos testes:

| Pasta | Tipo | Mecanismo de Ativação | Propósito |
|---|---|---|---|
| `__mocks__/` | Mocks manuais automáticos | `jest.mock('<módulo>')` ou `moduleNameMapper` | Simular bibliotecas externas (`pg`, `cookie`) e arquivos de estilo (`.css`) |
| `tests/mocks/` | Mocks de alto nível | Importação manual via alias `@mocks` | Simular módulos internos do projeto (Next.js, fetch, cache, auth, db) |

A pasta `tests/mocks/` é acessível via alias `@mocks` configurado no `jest.config.base.js`:

```js
'^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
```

---

# Parte 1 — `__mocks__/` (Mocks Manuais Automáticos)

A pasta `__mocks__/` contém **3 arquivos** e **nenhuma subpasta**. O Jest resolve automaticamente mocks manuais desta pasta quando um teste chama `jest.mock('<nome-do-modulo>')`, ou quando o mapeamento é configurado via `moduleNameMapper` no `jest.config.js`.

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

1. **`lib/auth/auth.js` não utiliza a biblioteca `cookie`** — O arquivo implementa funções próprias `parseCookie()` e `serializeCookie()` nas linhas 8–30, sem dependência externa.
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

# Parte 2 — `tests/mocks/` (Mocks de Alto Nível)

A pasta `tests/mocks/` contém **9 arquivos** e **nenhuma subpasta**. Diferente de `__mocks__/`, estes mocks são **importados manualmente** pelos arquivos de teste, geralmente via alias `@mocks` ou caminho relativo. Eles simulam módulos internos do projeto e bibliotecas do Next.js.

| Arquivo | Propósito | Consumido por |
|---|---|---|
| `tests/mocks/index.js` | Ponto de entrada que reexporta todos os mocks | Uso mínimo (1 exemplo) |
| `tests/mocks/next.js` | Implementações individuais dos mocks do Next.js | Apenas indireto via `next-setup.js` |
| `tests/mocks/next-setup.js` | Setup automático dos `jest.mock()` do Next.js | Testes de componentes/páginas |
| `tests/mocks/next.test.js` | Teste de sanidade dos mocks do Next.js | Execução própria |
| `tests/mocks/fetch.js` | Mocks para requisições `fetch` | Testes de API e componentes |
| `tests/mocks/db.js` | Mocks de operações de banco de dados (query, transaction, pool) | Uso mínimo (1 exemplo) |
| `tests/mocks/db-module.js` | Mock do módulo `lib/infra/db.js` | Testes de API, scripts e domínio |
| `tests/mocks/cache.js` | Mock do módulo de cache | Testes de API |
| `tests/mocks/auth.js` | Mock do módulo `lib/auth/auth.js` | ⚠️ **Nenhum arquivo (órfão)** |

---

## 1. `tests/mocks/index.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/index.js`
**Tamanho:** 14 linhas

### 📌 Propósito

Ponto de entrada centralizado que reexporta todos os mocks reutilizáveis da pasta. Permite importação simplificada:

```js
import { mockUseRouter, mockFetch, mockQuery } from '../mocks';
```

### 🔍 Funcionalidades

- Reexporta todos os módulos de mocks: `next.js`, `fetch.js`, `db.js`, `cache.js`, `auth.js`, `db-module.js`.
- Facilita o consumo dos mocks em testes com uma única importação.

---

## 2. `tests/mocks/next.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/next.js`
**Tamanho:** 213 linhas

### 📌 Propósito

Contém as **implementações individuais** dos mocks para componentes e hooks do Next.js. É a base para o `next-setup.js` e também pode ser usado diretamente em testes.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockUseRouter(options)`** | Cria um objeto de router mockado com todas as propriedades do `useRouter` do Pages Router (`pathname`, `query`, `push`, `replace`, `reload`, `back`, `prefetch`, `events`, etc.). |
| **`mockNextImage(props)`** | Renderiza o componente `Image` do Next.js como um elemento `<img>` simples. |
| **`mockNextLink(props)`** | Renderiza o componente `Link` do Next.js como um elemento `<a>` simples. |
| **`mockNextHead(props)`** | Renderiza o componente `Head` do Next.js como um `React.Fragment`. |
| **`mockNextScript(props)`** | Renderiza o componente `Script` do Next.js como um elemento `<script>` simples. |
| **`mockNextDynamic(importFunc, options)`** | Simula o `dynamic` do Next.js, carregando o componente via `importFunc()` e renderizando após o carregamento. |
| **`mockGetServerSideProps(data)`** | Retorna um objeto `{ props: { ...data } }` simulando o retorno do `getServerSideProps`. |
| **`mockGetStaticProps(data)`** | Retorna um objeto `{ props: { ...data }, revalidate: 60 }` simulando o retorno do `getStaticProps`. |
| **`mockGetStaticPaths(paths)`** | Retorna um objeto `{ paths, fallback: false }` simulando o retorno do `getStaticPaths`. |
| **`mockNextHeaders(headers)`** | Cria um objeto de headers mockado para o App Router (`get`, `set`, `delete`, `has`, `forEach`, `entries`, `keys`, `values`, iterador). |
| **`mockNextCookies(cookies)`** | Cria um objeto de cookies mockado para o App Router (`get`, `set`, `delete`, `has`, `getAll`, iterador). |
| **`setupNextMocks()`** | **⚠️ Deprecated** — Configura todos os mocks do Next.js via `jest.mock()`. Substituído pelo `next-setup.js`. |

---

## 3. `tests/mocks/next-setup.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/next-setup.js`
**Tamanho:** 147 linhas

### 📌 Propósito

Centraliza os `jest.mock()` para módulos do Next.js, eliminando duplicação em dezenas de arquivos de teste. Basta importar este arquivo no início de qualquer arquivo de teste:

```js
import '../../mocks/next-setup.js';
```

### 🔍 Funcionalidades

Registra automaticamente os `jest.mock()` para os seguintes módulos do Next.js:

| Módulo | Mock registrado |
|---|---|
| **`next/router`** (Pages Router) | `useRouter` retornando objeto de router completo com valores padrão (`pathname: '/'`, `locale: 'pt-BR'`, etc.) |
| **`next/navigation`** (App Router) | `useRouter`, `usePathname`, `useSearchParams`, `useParams`, `redirect`, `notFound`, `permanentRedirect` |
| **`next/image`** | `default` → `mockNextImage` |
| **`next/link`** | `default` → `mockNextLink` |
| **`next/head`** | `default` → `mockNextHead` |
| **`next/script`** | `default` → `mockNextScript` |
| **`next/dynamic`** | `default` → `mockNextDynamic` |
| **`next/headers`** (App Router) | `headers()` e `cookies()` como funções assíncronas |
| **`next/server`** | Preserva o módulo original, mas mocka `NextResponse.json`, `NextResponse.redirect`, `NextResponse.next` |

### ⚠️ Observações Técnicas

- Para sobrescrever um mock específico, declare `jest.mock()` local **APÓS** o import do `next-setup.js`.
- O `next/server` usa `jest.requireActual` para preservar o módulo original, mockando apenas os métodos de `NextResponse`.

---

## 4. `tests/mocks/next.test.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/next.test.js`
**Tamanho:** 146 linhas

### 📌 Propósito

Teste de sanidade para os mocks do Next.js. Verifica se os mocks centralizados em `next-setup.js` e as implementações em `next.js` estão funcionando corretamente.

### 🔍 Funcionalidades

- **`next/router`**: Verifica se `useRouter` é função e retorna objeto com propriedades esperadas.
- **`next/navigation`**: Verifica se hooks e funções do App Router são exportados e retornam valores padrão.
- **`next/image`**: Verifica se renderiza como elemento `<img>` com atributos corretos.
- **`next/link`**: Verifica se renderiza como elemento `<a>` com `href` correto.
- **`next/head`**: Verifica se renderiza children (ex.: `<title>`).
- **`next/script`**: Verifica se renderiza como elemento `<script>` com `src` correto.
- **`next/headers`**: Verifica se `headers` e `cookies` são funções assíncronas.

### ⚠️ Observações Técnicas

- Deve ser executado sempre que a versão do Next.js for atualizada para detectar quebras silenciosas na API mockada.

---

## 5. `tests/mocks/fetch.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/fetch.js`
**Tamanho:** 181 linhas

### 📌 Propósito

Mocks para requisições `fetch`, permitindo simular respostas HTTP de APIs externas e internas nos testes.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockFetch(response, options)`** | Cria um mock de fetch que retorna uma resposta completa (com `ok`, `status`, `headers`, `json`, `text`, `blob`, `arrayBuffer`, `formData`, `clone`). |
| **`mockFetchSuccess(data, options)`** | Mock de fetch que retorna sucesso (`ok: true`, `status: 200`). |
| **`mockFetchError(status, error, options)`** | Mock de fetch que retorna erro HTTP. |
| **`mockFetchNotFound(options)`** | Mock de fetch que retorna 404. |
| **`mockFetchUnauthorized(options)`** | Mock de fetch que retorna 401. |
| **`mockFetchServerError(options)`** | Mock de fetch que retorna 500. |
| **`mockFetchNetworkError(message)`** | Mock de fetch que simula erro de rede (rejeita com `Error`). |
| **`mockFetchWithRoutes(urlMap, defaultResponse)`** | Mock de fetch com respostas baseadas em URL (suporta strings e RegExp). |
| **`mockFetchSequence(responses)`** | Mock de fetch que retorna respostas em sequência. |
| **`fetchDelay(ms)`** | Cria um delay simulado para fetch. |
| **`setupFetchMock(mockImpl)`** | Configura o mock global de fetch (`global.fetch`). |
| **`clearFetchMock()`** | Limpa o mock global de fetch. |
| **`fetchWasCalledWith(fetchMock, url)`** | Verifica se fetch foi chamado com URL específica. |
| **`getLastFetchCall(fetchMock)`** | Obtém o último call do fetch. |

---

## 6. `tests/mocks/db.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/db.js`
**Tamanho:** 235 linhas

### 📌 Propósito

Mocks para operações de banco de dados em nível de query, oferecendo helpers para simular SELECT, INSERT, UPDATE, DELETE, transactions e pool de conexões.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockQuery(returnValue)`** | Cria um mock de query que retorna valores (aceita objeto, array ou função). |
| **`mockQueryOne(row)`** | Cria um mock de query que retorna um único resultado. |
| **`mockQueryMany(rows)`** | Cria um mock de query que retorna múltiplos resultados. |
| **`mockQueryError(error)`** | Cria um mock de query que retorna erro. |
| **`mockInsert(insertedRow)`** | Cria um mock de query que simula INSERT. |
| **`mockUpdate(updatedRow)`** | Cria um mock de query que simula UPDATE. |
| **`mockDelete(deletedId)`** | Cria um mock de query que simula DELETE. |
| **`mockTransaction(callback)`** | Cria um mock de transaction (BEGIN/COMMIT/ROLLBACK). |
| **`mockPool(options)`** | Cria um mock de pool de conexões. |
| **`queryWasCalledWith(queryMock, pattern)`** | Verifica se uma query SQL foi chamada (suporta string e RegExp). |
| **`getQueryParams(queryMock, callIndex)`** | Obtém os parâmetros de uma query. |
| **`mockDbModule(options)`** | Cria um mock completo do módulo db. |
| **`mockPaginatedResult(data, page, limit)`** | Simula um resultado de paginação. |
| **`clearQueryMocks(...queryMocks)`** | Limpa todos os mocks de query. |
| **`mockQuerySequence(responses)`** | Cria respostas sequenciais para query. |

---

## 7. `tests/mocks/db-module.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/db-module.js`
**Tamanho:** 63 linhas

### 📌 Propósito

Mock centralizado para o módulo `lib/infra/db.js`, exportando exatamente as mesmas funções do módulo real. É o mock mais utilizado no projeto, consumido por dezenas de testes de API, scripts e domínio.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockDb(overrides)`** | Cria um módulo db.js mockado completo com: `query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`. |
| **`mockDbError(error)`** | Cria um módulo db.js que simula erro de conexão (`query` rejeita, `healthCheck` retorna `false`). |
| **`resetDbMocks(dbMock)`** | Reseta os mocks de db para comportamento padrão. |

### 🧪 Consumo nos Testes

Utilizado via `jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb())` em dezenas de arquivos de teste, incluindo:

- **Testes de API** (`tests/integration/api/`): `posts`, `musicas`, `videos`, `dicas`, `settings`, `stats`, `roles`, `users`, `audit`, `backups`, `status`, `login`, `cleanup-test-data`, etc.
- **Testes de scripts** (`tests/unit/scripts/`): `clear-db`, `clear-musicas`, `seed-all`, `reset-password`, `clean-orphaned-images`.
- **Testes de domínio** (`tests/unit/domain/`): `settings`, `videos`, `posts`.
- **Testes de lib** (`tests/unit/lib/`): `crud`, `auth`.

---

## 8. `tests/mocks/cache.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/cache.js`
**Tamanho:** 29 linhas

### 📌 Propósito

Mocks para operações de cache (Redis/memória), simulando o módulo `lib/cache/cache.js`.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockCacheModule(overrides)`** | Cria um módulo de cache mockado com: `getOrSetCache` (executa a função de fetch), `checkRateLimit` (retorna `false`), `invalidateCache`. |
| **`resetCacheMocks(cacheMock)`** | Reseta os mocks de cache para seus comportamentos padrão. |

### 🧪 Consumo nos Testes

Utilizado via `jest.mock('../../../lib/cache/cache.js', () => require('../../mocks/cache').mockCacheModule())` em testes de API como `posts`, `videos`, `musicas`.

---

## 9. `tests/mocks/auth.js`

**Localização:** `/home/qa/Projeto/Caminhar/tests/mocks/auth.js`
**Tamanho:** 67 linhas

### 📌 Propósito

Mocks centralizados para o módulo `lib/auth/auth.js`, simulando funções de autenticação.

### 🔍 Funcionalidades

| Função | Descrição |
|---|---|
| **`mockAuthModule(overrides)`** | Cria um módulo de autenticação mockado completo com: `hashPassword`, `verifyPassword`, `generateToken`, `verifyToken`, `setAuthCookie`, `getAuthCookie`, `getAuthToken`, `authenticate`, `authenticateAndGenerateToken`, `withAuth`, `initializeAuth`. |
| **`mockAuthFailure()`** | Cria um módulo de autenticação que simula falha de autenticação (token nulo, credenciais inválidas, 401). |
| **`resetAuthMocks(authMock)`** | Reseta todos os mocks de auth para comportamento padrão. |

### ⚠️ Orphan Mock — **Arquivo não utilizado atualmente**

Este mock foi analisado e **não está sendo consumido por nenhum arquivo de teste no projeto atual**. As evidências:

1. **Nenhum arquivo de teste importa `mockAuthModule` ou `mockAuthFailure`** — A busca em todos os arquivos `.test.js` e `.js` da pasta `tests/` não encontrou referências a estas funções fora do próprio arquivo.
2. **Nenhum arquivo de teste chama `jest.mock('../../../lib/auth/auth.js', () => require('../../mocks/auth').mockAuthModule())`** — A busca não encontrou ocorrências em nenhum arquivo da pasta `tests/`.
3. **O `index.js` reexporta o módulo, mas o consumo é indireto e não utilizado** — Embora `tests/mocks/index.js` reexporte `auth.js`, nenhum teste importa de `index.js` as funções de auth.

**Conclusão:** O arquivo `tests/mocks/auth.js` é um **mock órfão** — foi criado para centralizar mocks de autenticação, mas não é consumido por nenhum teste atualmente. Permanece no repositório sem utilidade funcional.

---

# 📊 Resumo Geral

## `__mocks__/`

| # | Arquivo | Propósito | Status | Consumido por |
|---|---|---|---|---|
| 1 | `__mocks__/pg.js` | Mock do `pg.Pool` para consultas SQL | ✅ Ativo | 16 arquivos de teste |
| 2 | `__mocks__/cookie.js` | Mock da lib `cookie` (parse/serialize) | ⚠️ **Órfão** | Nenhum arquivo |
| 3 | `__mocks__/styleMock.js` | Mock de arquivos `.css` para CSS Modules | ✅ Ativo | `jest.config.js` (moduleNameMapper) |

**Total de arquivos:** 3 | **Subpastas:** Nenhuma
**Mocks ativos:** 2 (pg.js, styleMock.js)
**Mock órfão:** 1 (cookie.js)

## `tests/mocks/`

| # | Arquivo | Propósito | Status | Consumido por |
|---|---|---|---|---|
| 1 | `tests/mocks/index.js` | Reexporta todos os mocks | ✅ Ativo | Uso mínimo (1 exemplo) |
| 2 | `tests/mocks/next.js` | Implementações dos mocks do Next.js | ✅ Ativo | Apenas indireto via `next-setup.js` |
| 3 | `tests/mocks/next-setup.js` | Setup automático dos `jest.mock()` do Next.js | ✅ Ativo | Testes de componentes/páginas |
| 4 | `tests/mocks/next.test.js` | Teste de sanidade dos mocks do Next.js | ✅ Ativo | Execução própria |
| 5 | `tests/mocks/fetch.js` | Mocks para requisições `fetch` | ✅ Ativo | Testes de API e componentes |
| 6 | `tests/mocks/db.js` | Mocks de operações de banco de dados | ✅ Ativo | Uso mínimo (1 exemplo) |
| 7 | `tests/mocks/db-module.js` | Mock do módulo `lib/infra/db.js` | ✅ Ativo | Dezenas de testes de API, scripts e domínio |
| 8 | `tests/mocks/cache.js` | Mock do módulo de cache | ✅ Ativo | Testes de API |
| 9 | `tests/mocks/auth.js` | Mock do módulo `lib/auth/auth.js` | ⚠️ **Órfão** | Nenhum arquivo |

**Total de arquivos:** 9 | **Subpastas:** Nenhuma
**Mocks ativos:** 8 (index.js, next.js, next-setup.js, next.test.js, fetch.js, db.js, db-module.js, cache.js)
**Mock órfão:** 1 (auth.js)

---

# 🔗 Relação entre as Pastas

As duas pastas de mocks têm **responsabilidades complementares**:

- **`__mocks__/`** — Mocks **automáticos** de bibliotecas externas (`pg`, `cookie`) e arquivos de estilo (`.css`). Resolvidos pelo Jest por nome de módulo ou via `moduleNameMapper`.
- **`tests/mocks/`** — Mocks de **alto nível** para módulos internos do projeto (Next.js, fetch, cache, auth, db) e cenários específicos dos testes. Importados manualmente pelos arquivos de teste.

A separação segue a convenção padrão do Jest e mantém a arquitetura de testes organizada e escalável.