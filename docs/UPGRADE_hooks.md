# Relatório de Melhorias — `/hooks/`

> **Data:** 11/05/2026
> **Objetivo:** Reportar correções, melhorias de performance, duplicidades e problemas identificados nos hooks. **Nenhuma alteração foi aplicada** — apenas análise documentada.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Problemas de Performance](#2-problemas-de-performance)
3. [Correções Necessárias](#3-correções-necessárias)
4. [Inconsistências e Anti-patterns](#4-inconsistências-e-anti-patterns)
5. [Melhorias Gerais](#5-melhorias-gerais)

---

## 1. Duplicidade de Código

### 1.1 `/hooks/index.js` — Duplicidade de Exportações ✅ CORRIGIDO

**Solução aplicada:** Removidas as reexportações com sufixo `Default`.

---

### 1.2 `/hooks/useAuth.js` vs `/hooks/useAdminAuth.js` — Autenticação Duplicada ✅ CORRIGIDO

**Solução aplicada:** `useAdminAuth` consome `AuthContext`; `credentials: 'include'` adicionado em `useAuth.js`.

---

### 1.3 `/hooks/useAdminCrud.js` — Lógica de Fetch Duplicada Internamente ✅ CORRIGIDO

**Solução aplicada:** `useEffect` inicial substituído por `useApiFetch`.

---

## 2. Problemas de Performance

### 2.1 `/hooks/useAdminCrud.js` — `apiEndpoint` como Dependência ✅ CORRIGIDO

**Solução aplicada:** Resolvido como parte da correção 1.3 e 5.1.

---

### 2.2 `/hooks/useApiFetch.js` — `JSON.stringify(options)` como Dependência ✅ CORRIGIDO

**Solução aplicada:** Substituído por estratégia com `useRef` (`optionsRef` + `depsKeyRef`).

---

### 2.3 `/hooks/usePerformanceMetrics.js` — Falta de Cleanup nos Observers ✅ CORRIGIDO

**Solução aplicada:** `observer.disconnect()` no cleanup.

---

### 2.4 `/hooks/useTheme.js` — `toggleTheme` com Debounce Manual vs Hook `useThrottle` ✅ CORRIGIDO

**Solução aplicada:** Criado `useThrottle` e substituída implementação manual.

---

## 3. Correções Necessárias

### 3.1 `/hooks/useAdminAuth.js` — Chamada Condicional de Hook ✅ CORRIGIDO

---

### 3.2 `/hooks/useAdminCrud.js` — DELETE com Query Parameter ✅ CORRIGIDO

**Solução aplicada:** DELETE com ID no body (JSON).

---

### 3.3 `/hooks/useAdminCrud.js` — `customValidator` sem Tratamento de Erro ✅ CORRIGIDO

**Solução aplicada:** `try/catch` específico com mensagem e interrupção.

---

### 3.4 `/hooks/usePerformanceMetrics.js` — Referência a `window.LongTasks` ✅ CORRIGIDO

**Solução aplicada:** Bloco removido (código morto).

---

### 3.5 `/hooks/useAuth.js` — `AbortController` sem Abort em `login` ✅ CORRIGIDO

**Solução aplicada:** `loginAbortRef` gerenciado via ref; `logout` simplificado.

---

## 4. Inconsistências e Anti-patterns

### 4.1 `/hooks/useTheme.js` — Funções de Responsividade Sem Reatividade ✅ CORRIGIDO

### 4.2 `/hooks/useTheme.js` — Fallbacks para Tokens ⏳ PENDENTE

### 4.3 `/hooks/useTheme.js` — `setThemeValue` com `useCallback` Desnecessário ✅ CORRIGIDO

### 4.4 `/hooks/usePerformanceMetrics.js` — `reportAllMetrics` Não Reporta ✅ CORRIGIDO

### 4.5 `/hooks/useAuth.js` — `setLoading(true)` em `login` Causa Flicker ✅ CORRIGIDO

---

## 5. Melhorias Gerais

### 5.1 Oportunidade de Padronização com `useApiFetch` ✅ CORRIGIDO

**Arquivo envolvido:** `useAdminCrud.js`

**Problema:** O hook `useAdminCrud` implementava lógica de fetch manual para listagem (GET) através da função `fetchItemsFromAPI`, com estados próprios de `items`, `loading` e `error`, duplicando o que `useApiFetch` já oferece de forma centralizada.

**Solução aplicada:** `useAdminCrud` agora usa `useApiFetch` como base para o fetch de listagem:
- `items`, `loading` e `error` são gerenciados pelo `useApiFetch`
- A URL é construída dinamicamente com `buildUrl(page)` conforme a página atual
- `currentPage` é gerenciado por estado e, quando alterado, o `useApiFetch` reage automaticamente via mudança na URL
- A função `fetchItemsFromAPI` foi removida (não é mais necessária)
- As operações de escrita (POST/PUT/DELETE) permanecem com lógica própria de `react-hot-toast`
- A função `setError` foi removida de `resetForm` e `handleEdit`, pois o estado `error` agora é gerenciado pelo `useApiFetch`

**Benefícios:**
- Elimina lógica duplicada de fetch/loading/error/resposta
- Unifica o tratamento de erros de rede via `useApiFetch`
- Reduz o número de estados gerenciados manualmente no hook

---

### 5.2 Histórico de Métricas — Otimização de Memória ✅ CORRIGIDO

**Arquivo envolvido:** `usePerformanceMetrics.js`

**Solução aplicada:** Histórico agora armazena apenas campos essenciais (`name`, `value`, `rating`, `delta`, `timestamp`). Dados contextuais mantidos apenas na entrada mais recente.

---

### 5.3 Validação de `customValidator` — Documentação ✅ CORRIGIDO

**Arquivo envolvido:** `useAdminCrud.js`

**Solução aplicada:** `@callback CustomValidator` documentado com contrato claro.

---

### 5.4 Dependência `web-vitals` — Import Cacheado ✅ CORRIGIDO

**Arquivo envolvido:** `usePerformanceMetrics.js`

**Solução aplicada:** Promessa cacheada em nível de módulo.

---

## Resumo das Ocorrências

| Categoria | Total | Arquivos Afetados |
|---|---|---|
| Duplicidade de código | 3 | `index.js`, `useAuth.js`/`useAdminAuth.js`, `useAdminCrud.js` |
| Problemas de performance | 4 | `useAdminCrud.js`, `useApiFetch.js`, `usePerformanceMetrics.js`, `useTheme.js` |
| Correções necessárias | 5 | `useAdminAuth.js`, `useAdminCrud.js` (2), `usePerformanceMetrics.js`, `useAuth.js` |
| Inconsistências | 5 | `useTheme.js` (3), `usePerformanceMetrics.js`, `useAuth.js` |
| Melhorias gerais | 4 | Diversos |

---

### Todas as Ocorrências Corrigidas

| # | Arquivo(s) | Descrição | Data |
|---|---|---|---|
| 1.1 | `hooks/index.js` | Exportações `*Default` removidas | 10/05/2026 |
| 1.2 | `hooks/useAdminAuth.js` + `useAuth.js` | `useAdminAuth` refatorado | 10/05/2026 |
| 1.3 | `hooks/useAdminCrud.js` | `useEffect` simplificado | 10/05/2026 |
| 2.1 | `hooks/useAdminCrud.js` | Resolvido nas correções 1.3 e 5.1 | 10/05/2026 |
| 2.2 | `hooks/useApiFetch.js` | `JSON.stringify(options)` substituído | 10/05/2026 |
| 2.3 | `hooks/usePerformanceMetrics.js` | `observer.disconnect()` | 10/05/2026 |
| 2.4 | `hooks/useTheme.js` | `useThrottle` criado | 10/05/2026 |
| 3.1 | `hooks/useAdminAuth.js` | `useRouter()` incondicional | 10/05/2026 |
| 3.2 | `hooks/useAdminCrud.js` | DELETE com ID no body | 10/05/2026 |
| 3.3 | `hooks/useAdminCrud.js` | `customValidator` com try/catch | 10/05/2026 |
| 3.4 | `hooks/usePerformanceMetrics.js` | `window.LongTasks` removido | 10/05/2026 |
| 3.5 | `hooks/useAuth.js` | `AbortController` via ref | 10/05/2026 |
| 4.1 | `hooks/useTheme.js` | Viewport reativa | 10/05/2026 |
| 4.3 | `hooks/useTheme.js` | `setTheme` direto | 10/05/2026 |
| 4.4 | `hooks/usePerformanceMetrics.js` | `reportAllMetrics` removido | 10/05/2026 |
| 4.5 | `hooks/useAuth.js` | `loginLoading` separado | 10/05/2026 |
| 5.1 | `hooks/useAdminCrud.js` | `useApiFetch` integrado | 11/05/2026 |
| 5.2 | `hooks/usePerformanceMetrics.js` | Histórico leve | 10/05/2026 |
| 5.3 | `hooks/useAdminCrud.js` | Contrato documentado | 10/05/2026 |
| 5.4 | `hooks/usePerformanceMetrics.js` | Import cacheado | 10/05/2026 |

### Ocorrência Pendente

| # | Arquivo(s) | Descrição | Situação |
|---|---|---|---|
| 4.2 | `hooks/useTheme.js` + `tokens.js` | Fallbacks de tokens | ⏳ Pendente |