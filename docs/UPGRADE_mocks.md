# 🔧 Relatório de Análise — Melhorias Possíveis

## `__mocks__/` (Mocks Manuais do Jest)

Este documento contém o levantamento analítico de melhorias possíveis para a pasta `__mocks__/`. Nenhuma alteração foi aplicada — apenas diagnóstico.

---

## 1. `__mocks__/cookie.js` — Mock Órfão (Crítico)

**Arquivo:** `/home/qa/Projeto/Caminhar/__mocks__/cookie.js`

### Problema

O arquivo `__mocks__/cookie.js` é um **mock órfão** — não é consumido por nenhum teste, e a biblioteca que ele simula (`cookie`) não é mais utilizada no projeto.

### Evidências

1. **`lib/auth.js` não importa a biblioteca `cookie`** — O código atual implementa funções próprias `parseCookie()` (linha 8) e `serializeCookie()` (linha 20), sem dependência externa.
2. **Nenhum arquivo de teste chama `jest.mock('cookie')`** — A pesquisa em toda a pasta `tests/` não encontrou ocorrências.
3. **O pacote `cookie` não está no `package.json`** — Ausente tanto em `dependencies` quanto em `devDependencies`.

### Sugestão

- **Remover o arquivo** `__mocks__/cookie.js` do projeto, eliminando código morto que não tem função.
- Alternativamente, se houver planos de voltar a usar a biblioteca `cookie` no futuro, deixar documentado de forma explícita no cabeçalho do arquivo.

### Impacto

Nenhum — o arquivo não é referenciado por nenhuma configuração, teste ou dependência.

---

## 2. `__mocks__/styleMock.js` — Cobertura Limitada de Classes CSS (Médio)

**Arquivo:** `/home/qa/Projeto/Caminhar/__mocks__/styleMock.js`

### Problema

O mock mapeia apenas **uma classe CSS Module** (`skeletonBox`). Componentes que importem arquivos `.css` e utilizem outras classes (ex.: `container`, `title`, `form`, `button`) receberão `undefined` ao acessar `styles.container`, `styles.title`, etc.

### Sugestões

- **Expandir o mapeamento** para incluir todas as classes CSS Module utilizadas nos componentes do projeto.
- Alternativamente, adotar uma abordagem **genérica via Proxy**:
  ```js
  export default new Proxy({}, { get: (target, prop) => prop });
  ```

### Impacto

Baixo atualmente, mas tende a crescer conforme novos componentes com CSS Module forem adicionados e testados.

---

## 3. `__mocks__/pg.js` — Propriedades do Pool Fixas em 0 (Baixo)

**Arquivo:** `/home/qa/Projeto/Caminhar/__mocks__/pg.js`

### Problema

As propriedades `totalCount`, `idleCount` e `waitingCount` do Pool retornam sempre `0`, impedindo testes de comportamentos condicionais baseados no estado do pool (ex.: health check que considera conexões ativas, vazamento de conexões).

### Sugestão

- Tornar essas propriedades configuráveis via função helper:
  ```js
  export function setPoolState(state) {
    // substitui valores retornados por poolImplementation()
  }
  ```

### Impacto

Baixo — nenhum teste atual depende dessas propriedades. Melhoria preventiva.

---

## 4. `__mocks__/pg.js` — Singleton `mockQuery` Compartilhado (Médio)

**Arquivo:** `/home/qa/Projeto/Caminhar/__mocks__/pg.js`

### Problema

`mockQuery` é um singleton compartilhado entre `Pool.query` e `connect().query`. Configurações de retorno afetam **todos os locais** que usam `Pool.query` ou `connect().query`, podendo gerar interferência entre testes consecutivos.

### Observação

Problema **conhecido e documentado**. Análises anteriores (`docs/resolvidos/UPGRADE_mocks.md`, item 08) concluíram que a separação por instância quebraria a compatibilidade com os 14+ arquivos de teste existentes.

### Sugestão

- Avaliar, em eventual reestruturação, a migração para `mockQuery` independentes por instância de `Pool`.
- Documentar de forma mais visível o padrão de uso correto nos `beforeEach` dos testes.

### Impacto

Médio — design singleton pode mascarar bugs sutis em testes mais complexos.

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

## 6. Duplicidade de Documentação Desatualizada (Baixo)

### Problema

`/home/qa/Projeto/Caminhar/docs/antigos/PROJECT_mocks.md` contém informações desatualizadas (cita `jest.mock('cookie')` em `auth.test.js`, o que não é mais verdade).

### Sugestão

- Arquivar ou remover documentos desatualizados da pasta `antigos/`.
- Manter o novo `docs/PROJECT_mocks.md` como fonte única e atualizada.

### Impacto

Baixo — não afeta o código, apenas a clareza da documentação.

---

## 7. Organização da Pasta (Informativo)

### Observação

A estrutura da pasta `__mocks__/` segue a convenção padrão do Jest. **Não há necessidade de alteração.**

---

## 🔴 Resumo de Prioridades

| Prioridade | Item | Tipo | Descrição |
|---|---|---|---|
| 🔴 **Crítico** | 1 | Código morto | `cookie.js` — mock órfão sem uso |
| 🟡 **Médio** | 2 | Manutenibilidade | `styleMock.js` — cobertura limitada de classes CSS |
| 🟡 **Médio** | 4 | Arquitetura | `mockQuery` singleton — interferência potencial entre testes |
| 🟡 **Médio** | 5 | Duplicidade | `__mocks__/pg.js` vs `tests/mocks/db.js` — sobreposição |
| 🟢 **Baixo** | 3 | Completude | Propriedades do Pool (`totalCount`, `idleCount`, `waitingCount`) fixas |
| 🟢 **Baixo** | 6 | Documentação | Documentação desatualizada em `docs/antigos/` |
| ⚪ **Informativo** | 7 | Organização | Estrutura adequada — sem alteração necessária |

