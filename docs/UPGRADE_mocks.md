# 📋 Documentação de Análise — Mocks Manuais Automáticos

## `__mocks__/`

Este documento registra a análise individual de cada arquivo na pasta `__mocks__/`, identificando finalidade, relações, problemas, melhorias, duplicidades e possíveis códigos mortos.

---

## 1. Nome do documento

**Documentação de Análise dos Mocks Manuais Automáticos (`__mocks__/`)**

---

## 2. Descrição geral

**Finalidade:** Documentar a análise técnica dos arquivos de mock manual automático do Jest localizados em `__mocks__/`.

**Objetivo:** Identificar a finalidade de cada mock, seus arquivos relacionados, problemas, melhorias, duplicidades e código morto.

**Escopo:** Todos os arquivos existentes em `/home/gus/Projetos/Caminhar/__mocks__/`:
- `cookie.js`
- `styleMock.js`
- `pg.js`

---

## 3. Estrutura de arquivos e pastas

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `__mocks__/cookie.js` | Arquivo | Mock da biblioteca `cookie` (npm) |
| `__mocks__/styleMock.js` | Arquivo | Mock de arquivos CSS Module |
| `__mocks__/pg.js` | Arquivo | Mock da biblioteca `pg` (node-postgres) |

---

## 4. Análise individual de cada arquivo

---

### 4.1. `cookie.js`

**Caminho:** `/home/gus/Projetos/Caminhar/__mocks__/cookie.js`

#### Arquivos acionados ou relacionados

**Nenhum.** O arquivo não é importado, referenciado ou consumido por nenhum outro arquivo no projeto.

#### Resumo do arquivo

Mock da biblioteca `cookie` (npm) para simulação de operações de parse e serialize de cookies HTTP em testes Jest.

- Exporta `serialize(name, value, options)` — Monta string de cookie com atributos (HttpOnly, Secure, SameSite, Max-Age, Path)
- Exporta `parse(cookieHeader)` — Separa string de cookie em objeto chave/valor
- Exporta objeto `cookieMock` como default

#### Contexto

A biblioteca `cookie` não é mais utilizada no projeto. O arquivo `lib/auth/auth.js` implementa funções próprias `parseCookie()` e `serializeCookie()` sem dependência externa. O pacote `cookie` não está listado no `package.json`.

---

### 4.2. `styleMock.js`

**Caminho:** `/home/gus/Projetos/Caminhar/__mocks__/styleMock.js`

#### Arquivos acionados ou relacionados

| Arquivo | Relação |
|---------|---------|
| `jest.config.js` | Referenciado via `moduleNameMapper` para `\\.css$` |

#### Resumo do arquivo

Mock para arquivos CSS Module, ativado automaticamente pelo Jest via configuração `moduleNameMapper` no `jest.config.js`.

- Exporta objeto com mapeamento `skeletonBox: 'skeleton-box'`
- Substitui imports de arquivos `.css` durante execução de testes

---

### 4.3. `pg.js`

**Caminho:** `/home/gus/Projetos/Caminhar/__mocks__/pg.js`

#### Arquivos acionados ou relacionados

| Arquivo | Relação |
|---------|---------|
| `lib/infra/db.js` | Importa `Pool` de `pg` |
| `jest.config.base.js` | Configuração `clearMocks: true` e `restoreMocks: true` |
| `tests/unit/lib/db/createPost.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/deletePost.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/updatePost.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/query.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/getAllPosts.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/getPaginatedPosts.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/settings.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/musicas.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db/saveImage.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery, restorePoolImplementation }` |
| `tests/unit/lib/db.test.js` | Usa `jest.mock('pg')` e importa `{ Pool, restorePoolImplementation }` |
| `tests/unit/scripts/clean-orphaned-images.test.js` | Usa `jest.mock('pg')` e importa `{ mockQuery }` |
| `tests/helpers/db-test.js` | Importa `pg` como default |
| `tests/unit/scripts/validate-schema.test.js` | Usa `jest.unstable_mockModule('pg')` com mock inline |

#### Resumo do arquivo

Mock manual compartilhado para a biblioteca `pg` (node-postgres), automaticamente ativado quando testes chamam `jest.mock('pg')`.

Simula o Pool de conexões PostgreSQL com:

- **`mockQuery`** — Singleton `jest.fn()` compartilhado entre `Pool.query` e `connect().query`
- **`Pool`** — Função mock que retorna objeto com `query`, `end`, `on`, `connect` e propriedades de estado (`totalCount`, `idleCount`, `waitingCount`)
- **`restorePoolImplementation()`** — Restaura implementação do Pool após `jest.clearAllMocks()` ou `jest.resetAllMocks()`
- **`simulateQueryError(error)`** — Configura `mockQuery` para rejeitar com erro
- **`simulateConnectionError(error)`** — Configura `connect()` para rejeitar com erro

**Nota:** `simulateQueryError` e `simulateConnectionError` não são utilizados por nenhum teste no projeto, apenas documentados via JSDoc.

---

## 5. Ajustes e correções

### 5.1. `cookie.js` — Mock órfão (Crítico)

| Item | Detalhe |
|------|---------|
| **O que foi encontrado** | Mock da biblioteca `cookie` sem nenhum consumidor |
| **Onde foi encontrado** | `/home/gus/Projetos/Caminhar/__mocks__/cookie.js` |
| **Qual é o problema** | Código morto — arquivo não é referenciado por nenhum teste, código ou configuração |
| **Correção necessária** | Remover o arquivo do projeto |

### 5.2. `styleMock.js` — Cobertura limitada (Médio)

| Item | Detalhe |
|------|---------|
| **O que foi encontrado** | Mapeamento de classes CSS restrito a `skeletonBox` |
| **Onde foi encontrado** | `/home/gus/Projetos/Caminhar/__mocks__/styleMock.js` (linha 2) |
| **Qual é o problema** | Componentes que utilizam outras classes CSS Module (ex.: `container`, `title`, `form`) recebem `undefined` ao acessar `styles.container`, `styles.title`, etc. |
| **Correção necessária** | Expandir mapeamento para todas as classes CSS Module utilizadas ou adotar abordagem genérica via Proxy |

### 5.3. `pg.js` — Propriedades do Pool fixas (Baixo)

| Item | Detalhe |
|------|---------|
| **O que foi encontrado** | Propriedades `totalCount`, `idleCount`, `waitingCount` retornam sempre `0` |
| **Onde foi encontrado** | `/home/gus/Projetos/Caminhar/__mocks__/pg.js` (linhas 42-44) |
| **Qual é o problema** | Impede testes de comportamentos condicionais baseados no estado do pool (ex.: health check que considera conexões ativas) |
| **Correção necessária** | Tornar propriedades configuráveis via função helper |

---

## 6. Melhorias

### 6.1. `styleMock.js` — Abordagem genérica via Proxy

**Justificativa técnica:** Em vez de manter mapeamento manual de classes CSS, utilizar Proxy que retorna a própria propriedade como string, evitando `undefined` para qualquer classe não mapeada.

```js
export default new Proxy({}, { get: (target, prop) => prop });
```

### 6.2. `pg.js` — Helper de configuração de estado do Pool

**Justificativa técnica:** Permitir simulação de estados diferentes do pool para testes de health check e cenários de vazamento de conexões.

```js
export function setPoolState(state) {
  // substitui valores retornados por poolImplementation()
}
```





---

## 8. Código morto

### 8.1. `cookie.js` — Arquivo completo (Crítico)

| Item | Detalhe |
|------|---------|
| **Arquivo** | `/home/gus/Projetos/Caminhar/__mocks__/cookie.js` |
| **Tipo** | Arquivo órfão |
| **Evidências** | Nenhum arquivo de teste chama `jest.mock('cookie')`; biblioteca `cookie` não está no `package.json`; `lib/auth/auth.js` implementa funções próprias |
| **Recomendação** | Remover arquivo |

### 8.2. `pg.js` — `simulateQueryError` e `simulateConnectionError` (Baixo)

| Item | Detalhe |
|------|---------|
| **Arquivo** | `/home/gus/Projetos/Caminhar/__mocks__/pg.js` |
| **Tipo** | Funções exportadas sem consumo identificado |
| **Evidências** | Busca em `/tests/` não encontrou importações ou chamadas a essas funções. Apenas documentadas via JSDoc no próprio arquivo e em documentação (`docs/PROJECT_mocks.md`, `docs/resolvidos/UPGRADE_mocks.md`) |
| **Recomendação** | Considerar remoção se não houver planos de uso, ou documentar explicitamente como helpers futuros |

---

## Controle do processo

- [x] `cookie.js` — Identificado, lido, analisado, documentado, relido, validado
- [x] `styleMock.js` — Identificado, lido, analisado, documentado, relido, validado
- [x] `pg.js` — Identificado, lido, analisado, documentado, relido, validado

---

# Parte 2 — `tests/mocks/` (Mocks de Alto Nível)

---

## 5. Duplicidade: `__mocks__/pg.js` vs `tests/mocks/db.js` (Médio)

**Arquivos envolvidos:**
- `/home/qa/Projeto/Caminhar/__mocks__/pg.js`
- `/home/qa/Projeto/Caminhar/tests/mocks/db.js`

### Problema

Existem **duas camadas de mocks** para banco de dados. Embora com propósitos distintos (mock de biblioteca vs mock de módulo), a sobreposição pode gerar confusão sobre qual usar em cada cenário.

### Sugestão

- Documentar claramente a **responsabilidade de cada mock**.
- Avaliar se `tests/mocks/db.js` poderia depender do `mockQuery` de `__mocks__/pg.js`.

### Impacto

Médio — confusão pode levar ao uso do mock errado para o cenário certo.

---

## 6. Duplicidade: `tests/mocks/db.js` vs `tests/mocks/db-module.js` (Médio)

**Arquivos envolvidos:**
- `/home/qa/Projeto/Caminhar/tests/mocks/db.js`
- `/home/qa/Projeto/Caminhar/tests/mocks/db-module.js`

### Problema

Existem **dois mocks de banco de dados** em `tests/mocks/` com propósitos sobrepostos:

- **`db.js`** — Mocks de operações de banco em nível de query (SELECT, INSERT, UPDATE, DELETE, transaction, pool).
- **`db-module.js`** — Mock do módulo `lib/infra/db.js` completo (query, resetPool, closeDatabase, transaction, healthCheck, getDatabaseInfo).

Ambos exportam funções com nomes semelhantes (`mockQuery`, `mockDbModule`, `mockTransaction`, `mockPool`), o que pode gerar confusão sobre qual importar.

### Sugestão

- Consolidar em um único arquivo ou documentar claramente a responsabilidade de cada um.
- Avaliar se `db-module.js` poderia reutilizar helpers de `db.js` para reduzir duplicação de lógica (ex.: `mockTransaction` é implementado de forma quase idêntica em ambos).

### Impacto

Médio — duplicação de lógica e confusão potencial na escolha do mock correto.

---

## 7. Duplicidade de Lógica: `mockTransaction` em `db.js` e `db-module.js` (Baixo)

**Arquivos envolvidos:**
- `/home/qa/Projeto/Caminhar/tests/mocks/db.js` (linhas 103–120)
- `/home/qa/Projeto/Caminhar/tests/mocks/db-module.js` (linhas 19–35)

### Problema

A lógica de `mockTransaction` é implementada de forma **quase idêntica** em ambos os arquivos (BEGIN → callback → COMMIT/ROLLBACK → release). Isso representa duplicação de código que pode divergir no futuro.

### Sugestão

- Extrair a lógica de transaction para um helper compartilhado e reutilizar em ambos os mocks.

### Impacto

Baixo — duplicação pequena, mas risco de divergência futura.

---

## 8. `tests/mocks/next.js` — Função `setupNextMocks()` Deprecated (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/next.js` (linhas 194–213)

### Problema

A função `setupNextMocks()` está marcada como `@deprecated` e foi substituída pelo `next-setup.js`. No entanto, ela ainda permanece no código, podendo ser usada por engano em novos testes.

### Sugestão

- **Remover** a função `setupNextMocks()` do arquivo, já que o `next-setup.js` é a abordagem recomendada.
- Ou manter apenas com um aviso mais explícito de depreciação.

### Impacto

Baixo — código morto/deprecated que pode causar confusão.

---

## 9. `tests/mocks/next.js` — Duplicidade de Configuração do Router (Baixo)

**Arquivos envolvidos:**
- `/home/qa/Projeto/Caminhar/tests/mocks/next.js` (função `mockUseRouter`, linhas 13–42)
- `/home/qa/Projeto/Caminhar/tests/mocks/next-setup.js` (mock de `next/router`, linhas 26–48)

### Problema

A configuração do objeto de router (pathname, query, push, replace, reload, back, prefetch, events, etc.) é **duplicada** entre `mockUseRouter` em `next.js` e o mock inline de `next/router` em `next-setup.js`. Alterações em um não refletem no outro.

### Sugestão

- Fazer o `next-setup.js` reutilizar `mockUseRouter` do `next.js` para o mock de `next/router`, eliminando a duplicação.

### Impacto

Baixo — risco de divergência entre as duas implementações.

---

## 10. `tests/mocks/next.js` — Duplicidade de Configuração de Headers/Cookies (Baixo)

**Arquivos envolvidos:**
- `/home/qa/Projeto/Caminhar/tests/mocks/next.js` (funções `mockNextHeaders` e `mockNextCookies`, linhas 157–191)
- `/home/qa/Projeto/Caminhar/tests/mocks/next-setup.js` (mock de `next/headers`, linhas 113–131)

### Problema

As implementações de `mockNextHeaders` e `mockNextCookies` em `next.js` são **mais completas** (com iteradores e suporte a dados), mas o `next-setup.js` usa implementações **inline simplificadas** para o mock de `next/headers`. Isso gera duas versões diferentes da mesma funcionalidade.

### Sugestão

- Fazer o `next-setup.js` reutilizar `mockNextHeaders` e `mockNextCookies` do `next.js` para o mock de `next/headers`, eliminando a duplicação e unificando o comportamento.

### Impacto

Baixo — comportamento divergente entre as duas implementações.

---

## 11. `tests/mocks/next.test.js` — Cobertura Parcial dos Mocks (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/next.test.js`

### Problema

O teste de sanidade cobre `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script` e `next/headers`, mas **não cobre**:

- `next/dynamic` — não há teste para o mock de dynamic import.
- `next/server` — não há teste para o mock de `NextResponse`.
- `mockNextHeaders` e `mockNextCookies` — as funções individuais de `next.js` não são testadas diretamente.

### Sugestão

- Adicionar testes para `next/dynamic`, `next/server` e as funções individuais de headers/cookies.

### Impacto

Baixo — o teste de sanidade é preventivo; ampliar a cobertura aumenta a confiança.

---

## 12. `tests/mocks/fetch.js` — `mockFetch` não suporta `Response` nativo (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/fetch.js`

### Problema

O `mockFetch` retorna um objeto manual que imita `Response`, mas não é uma instância real de `Response`. Código que verifica `response instanceof Response` ou usa métodos específicos do `Response` nativo pode falhar.

### Sugestão

- Avaliar se os testes precisam de uma instância real de `Response` (via `new Response()`) ou se o objeto manual é suficiente.
- Se necessário, criar um helper que retorne uma instância real de `Response`.

### Impacto

Baixo — depende do uso atual nos testes.

---

## 13. `tests/mocks/fetch.js` — `mockFetchWithRoutes` não suporta status/headers customizados (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/fetch.js` (linhas 92–111)

### Problema

O `mockFetchWithRoutes` sempre retorna `ok: true` e `status: 200`, sem permitir configurar status HTTP ou headers por rota. Isso limita o uso em cenários de erro por rota.

### Sugestão

- Permitir que cada rota do `urlMap` possa especificar `status`, `ok` e `headers` além dos dados.

### Impacto

Baixo — melhoria de flexibilidade.

---

## 14. `tests/mocks/auth.js` — `mockAuthFailure` não cobre todos os cenários de falha (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/auth.js`

### Problema

O `mockAuthFailure` cobre falha de token, credenciais inválidas e 401, mas não cobre outros cenários como:

- Token expirado.
- Usuário sem permissão (403).
- Erro de servidor (500).

### Sugestão

- Adicionar variantes de falha específicas (ex.: `mockAuthExpiredToken`, `mockAuthForbidden`, `mockAuthServerError`).

### Impacto

Baixo — melhoria de cobertura de cenários.

---

## 15. `tests/mocks/cache.js` — Cobertura Limitada de Cenários (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/cache.js`

### Problema

O `mockCacheModule` cobre apenas `getOrSetCache`, `checkRateLimit` e `invalidateCache`. Não cobre cenários como:

- Cache hit (retorno direto do cache sem executar fetch).
- Rate limit excedido (`checkRateLimit` retornando `true`).
- Erro de cache.

### Sugestão

- Adicionar variantes de cenário (ex.: `mockCacheHit`, `mockRateLimitExceeded`, `mockCacheError`).

### Impacto

Baixo — melhoria de cobertura de cenários.

---

## 16. `tests/mocks/auth.js` — Mock Órfão (Crítico)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/auth.js`

### Problema

O arquivo `tests/mocks/auth.js` é um **mock órfão** — não é consumido por nenhum teste. A busca em todos os arquivos `.test.js` e `.js` da pasta `tests/` não encontrou referências a `mockAuthModule` ou `mockAuthFailure` fora do próprio arquivo.

### Evidências

1. **Nenhum arquivo de teste importa `mockAuthModule` ou `mockAuthFailure`** — A busca não encontrou ocorrências.
2. **Nenhum arquivo de teste chama `jest.mock('../../../lib/auth/auth.js', () => require('../../mocks/auth').mockAuthModule())`** — A busca não encontrou ocorrências.
3. **O `index.js` reexporta o módulo, mas o consumo é indireto e não utilizado** — Embora `tests/mocks/index.js` reexporte `auth.js`, nenhum teste importa de `index.js` as funções de auth.

### Sugestão

- **Remover o arquivo** `tests/mocks/auth.js` do projeto, eliminando código morto que não tem função.
- Alternativamente, se houver planos de usar mocks de autenticação no futuro, deixar documentado de forma explícita no cabeçalho do arquivo.

### Impacto

Nenhum — o arquivo não é referenciado por nenhuma configuração, teste ou dependência.

---

## 17. `tests/mocks/db.js` — Consumo Mínimo (Médio)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/db.js`

### Problema

O arquivo `tests/mocks/db.js` (235 linhas) tem **consumo mínimo** no projeto. As funções específicas (`mockInsert`, `mockUpdate`, `mockDelete`, `mockTransaction`, `mockPool`, `mockPaginatedResult`, `mockQuerySequence`) **não são usadas diretamente** em nenhum teste. Apenas `mockQuery` é consumido via `tests/examples/simple-test.test.js` (importando de `../mocks/index.js`).

### Sugestão

- Avaliar se o arquivo justifica sua complexidade (235 linhas) dado o consumo mínimo.
- Considerar consolidar com `db-module.js` (que é o mock de banco mais utilizado) para reduzir duplicidade e confusão.
- Ou documentar claramente o propósito de cada função para incentivar o uso.

### Impacto

Médio — arquivo grande com baixo consumo pode indicar código subutilizado.

---

## 18. `tests/mocks/next.js` — Consumo Apenas Indireto (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/next.js`

### Problema

O arquivo `tests/mocks/next.js` (213 linhas) é consumido **apenas indiretamente** via `next-setup.js`. As funções individuais (`mockUseRouter`, `mockNextImage`, `mockNextLink`, etc.) **não são importadas diretamente** por nenhum teste. O `mockUseRouter` encontrado em `Head.test.js` é uma definição local, não importada de `tests/mocks/next.js`.

### Sugestão

- Avaliar se as funções individuais de `next.js` precisam ser exportadas publicamente ou se poderiam ser internas ao `next-setup.js`.
- Documentar claramente que o consumo é apenas via `next-setup.js`.

### Impacto

Baixo — o arquivo é funcional via `next-setup.js`, mas a API pública pode ser desnecessariamente ampla.

---

## 19. `tests/mocks/index.js` — Consumo Mínimo (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/tests/mocks/index.js`

### Problema

O arquivo `tests/mocks/index.js` (ponto de entrada que reexporta todos os mocks) tem **consumo mínimo** — apenas `tests/examples/simple-test.test.js` importa de `../mocks/index.js`.

### Sugestão

- Avaliar se o `index.js` justifica sua existência dado o consumo mínimo.
- Considerar se os testes deveriam importar diretamente dos arquivos específicos (como fazem a maioria) em vez de usar o `index.js`.

### Impacto

Baixo — o arquivo é funcional, mas pode ser desnecessário dado o padrão de importação direta usado pela maioria dos testes.

---

# Parte 3 — Documentação e Organização

---

## 20. Duplicidade de Documentação Desatualizada (Baixo)

### Problema

`/home/qa/Projeto/Caminhar/docs/antigos/PROJECT_mocks.md` contém informações desatualizadas (cita `jest.mock('cookie')` em `auth.test.js`, o que não é mais verdade).

### Sugestão

- Arquivar ou remover documentos desatualizados da pasta `antigos/`.
- Manter o novo `docs/PROJECT_mocks.md` como fonte única e atualizada.

### Impacto

Baixo — não afeta o código, apenas a clareza da documentação.

---

## 21. Organização da Pasta (Informativo)

### Observação

A estrutura das pastas `__mocks__/` e `tests/mocks/` segue a convenção padrão do Jest. **Não há necessidade de alteração estrutural.**

---

# Resumo de Prioridades

| Prioridade | Item | Tipo | Descrição |
|---|---|---|---|
| 🔴 **Crítico** | 5.1 | Código morto | `cookie.js` — mock órfão sem uso |
| 🔴 **Crítico** | 16 | Código morto | `auth.js` — mock órfão sem uso |
| 🟡 **Médio** | 5.2 | Manutenibilidade | `styleMock.js` — cobertura limitada de classes CSS |
| 🟡 **Médio** | 6.3 | Arquitetura | `mockQuery` singleton — interferência potencial entre testes |
| 🟡 **Médio** | 7.1 | Duplicidade | `__mocks__/pg.js` vs `tests/mocks/db.js` — sobreposição |
| 🟡 **Médio** | 7.2 | Duplicidade | `pg.js` vs mock inline em `validate-schema.test.js` |
| 🟡 **Médio** | 6 | Duplicidade | `tests/mocks/db.js` vs `tests/mocks/db-module.js` — sobreposição |
| 🟡 **Médio** | 17 | Código subutilizado | `db.js` — consumo mínimo (235 linhas, 1 exemplo) |
| 🟢 **Baixo** | 5.3 | Completude | Propriedades do Pool (`totalCount`, `idleCount`, `waitingCount`) fixas |
| 🟢 **Baixo** | 8.2 | Código morto | `simulateQueryError`/`simulateConnectionError` sem consumo |
| 🟢 **Baixo** | 7 | Duplicidade | `mockTransaction` duplicado em `db.js` e `db-module.js` |
| 🟢 **Baixo** | 8 | Código morto | `setupNextMocks()` deprecated em `next.js` |
| 🟢 **Baixo** | 9 | Duplicidade | Configuração do router duplicada em `next.js` e `next-setup.js` |
| 🟢 **Baixo** | 10 | Duplicidade | Headers/Cookies duplicados em `next.js` e `next-setup.js` |
| 🟢 **Baixo** | 11 | Completude | `next.test.js` — cobertura parcial dos mocks |
| 🟢 **Baixo** | 12 | Completude | `fetch.js` — `mockFetch` não suporta `Response` nativo |
| 🟢 **Baixo** | 13 | Completude | `fetch.js` — `mockFetchWithRoutes` sem status/headers customizados |
| 🟢 **Baixo** | 14 | Completude | `auth.js` — `mockAuthFailure` não cobre todos os cenários |
| 🟢 **Baixo** | 15 | Completude | `cache.js` — cobertura limitada de cenários |
| 🟢 **Baixo** | 18 | Código subutilizado | `next.js` — consumo apenas indireto via `next-setup.js` |
| 🟢 **Baixo** | 19 | Código subutilizado | `index.js` — consumo mínimo (1 exemplo) |
| 🟢 **Baixo** | 20 | Documentação | Documentação desatualizada em `docs/antigos/` |

