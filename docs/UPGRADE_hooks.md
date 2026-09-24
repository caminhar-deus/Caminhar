# Análise da Pasta `/hooks/`

> **Data:** 24/09/2026
> **Objetivo:** Documentação analítica individual de todos os arquivos da pasta `/hooks/`.
> **Base:** Análise direta dos arquivos fonte atuais do projeto.

---

## 1. Nome do documento

Análise da Pasta `/hooks/`

---

## 2. Descrição geral

Este documento apresenta a análise individual e sequencial de todos os arquivos da pasta `/hooks/` do projeto Caminhar. A finalidade é registrar a finalidade, responsabilidades, relações entre arquivos, possíveis problemas, melhorias, duplicidades e códigos mortos identificados em cada arquivo, com base no conteúdo real encontrado no código-fonte.

O escopo abrange os 12 arquivos existentes na pasta `/hooks/`, organizados conforme a estrutura definida neste documento.

---

## 3. Estrutura de arquivos e pastas

```
/home/gus/Projetos/Caminhar/hooks/
├── AuthContext.js
├── AuthProvider.js
├── PerformanceContext.js
├── PerformanceProvider.js
├── index.js
├── useAdminAuth.js
├── useAdminCrud.js
├── useApiFetch.js
├── useDebounce.js
├── usePerformance.js
├── usePerformanceMetrics.js
└── useUnauthorized.js
```

Total de arquivos: **12**

---

## 4. Análise individual de cada arquivo

### 4.1 `AuthContext.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/AuthContext.js`

**Arquivos acionados ou relacionados:**
- `AuthProvider.js` — implementa o contexto definido neste arquivo
- Componentes que consomem `AuthContext` via `useContext`

**Resumo do arquivo:**
Define o contexto de autenticação da aplicação. Exporta `AuthContext` criado com `createContext` do React, contendo valores padrão para: `user` (null), `isAuthenticated` (false), `loading` (true), `loginLoading` (false), `login` (função assíncrona vazia) e `logout` (função assíncrona vazia). Documenta a estrutura via JSDoc `@typedef AuthContextValue`.

---

### 4.2 `AuthProvider.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/AuthProvider.js`

**Arquivos acionados ou relacionados:**
- `AuthContext.js`
- `/api/auth/login` (POST), `/api/auth/check` (GET), `/api/auth/logout` (POST), `/api/auth/refresh` (POST)

**Resumo do arquivo:**
Implementa o provider de autenticação via `AuthContext.Provider`. Gerencia `user`, `isAuthenticated`, `loading` e `loginLoading` com `useState`. Funções: `login` (POST com `credentials: 'include'` e `AbortController`), `refreshSession` (POST que retorna boolean), `logout` (POST e `setUser(null)` — **sem `try/catch`**), `checkAuth` (verifica sessão no mount; em 401 chama `refreshSession()` que **não recebe o `signal`** do `AbortController`).

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | `logout` (linhas 64–67) | `await fetch(...)` sem `try/catch`. Se falhar, `setUser(null)` não executa. | Envolver em `try/catch/finally` com `setUser(null)` no `finally`. |
| 2 | `checkAuth` → `refreshSession` (linhas 78–88) | `refreshSession()` não recebe o `signal` do `AbortController`. | Passar `signal` para `refreshSession()`. |

**Melhorias identificadas:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | `logout` | `try/catch/finally` com `setUser(null)` no `finally`. | Garantir limpeza do estado. |
| 2 | `refreshSession` | Receber `signal` para cancelamento. | Cancelamento completo no desmonte. |

---

### 4.3 `PerformanceContext.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/PerformanceContext.js`

**Arquivos acionados ou relacionados:**
- `PerformanceProvider.js`
- Componentes que consomem `PerformanceContext` via `useContext`

**Resumo do arquivo:**
Define o contexto de métricas de performance via `createContext(null)`. Documenta estrutura via `@typedef PerformanceContextValue` com propriedades: `reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`.

**Duplicidades identificadas:**

| # | Onde | Duplicidade | Justificativa |
|---|---|---|---|
| 1 | Estrutura | Padrão `createContext` + `@typedef` similar ao `AuthContext.js`. | Estrutural, mas pode ser padronizado. |
| 2 | `@typedef PerformanceContextValue` | Definido também em `PerformanceProvider.js` e `usePerformanceMetrics.js`. | Centralizar tipos. |

---

### 4.4 `PerformanceProvider.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/PerformanceProvider.js`

**Arquivos acionados ou relacionados:**
- `PerformanceContext.js`, `usePerformanceMetrics.js`
- Componentes que consomem `PerformanceContext`

**Resumo do arquivo:**
Instancia `usePerformanceMetrics` uma vez e compartilha via `PerformanceContext.Provider`. Valor memoizado com `useMemo` dependendo de: `reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`.

**Pontos de atenção:**

| # | Onde | Ponto de atenção | Justificativa |
|---|---|---|---|
| 1 | `useMemo` (linhas 13–21) | Dependências incluem `getMetrics` e `reportMetric` que podem ser instáveis se `usePerformanceMetrics` não estabilizar com `useCallback`. | Instabilidade anula o `useMemo`. |

---

### 4.5 `index.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/index.js`

**Arquivos acionados ou relacionados:**
- `PerformanceProvider.js`, `usePerformance.js`, `useApiFetch.js`, `useDebounce.js`, `useAdminAuth.js`

**Resumo do arquivo:**
Barrel que exporta 5 dos 12 arquivos. Não exporta: `useAdminCrud`, `useUnauthorized`, `AuthProvider`, `AuthContext`, `PerformanceContext`, `usePerformanceMetrics`.

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | Exportações (linhas 6–10) | Dois padrões de importação no projeto (barrel vs path direto). | Documentar política de exportação do barrel. |

**Melhorias:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | Exportações | Documentar política. | Consistência futura. |

---

### 4.6 `useAdminAuth.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/useAdminAuth.js`

**Arquivos acionados ou relacionados:**
- `AuthContext.js` (via `useContext`)
- Componentes de login/painel admin

**Resumo do arquivo:**
Encapsula lógica de autenticação para admin. Fornece `isAuthenticated`, `isChecking`, `handleLogin`, `handleLogout`, `loginLoading`, `loginError`. `handleLogout` silencia erro com `console.error` e executa `onLogoutRedirect` mesmo em falha.

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | `handleLogout` (linhas 48–57) | Erro silenciado; `onLogoutRedirect` executa mesmo em falha. | Repassar erro ou condicionar ao sucesso. |

**Melhorias:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | `handleLogout` | Condicionar `onLogoutRedirect` ao sucesso. | Evitar mascarar falhas. |

---

### 4.7 `useAdminCrud.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/useAdminCrud.js`

**Arquivos acionados ou relacionados:**
- `useApiFetch.js` (listagem GET com `credentials: 'include'`)
- `react-hot-toast`
- Componentes de CRUD administrativo

**Resumo do arquivo:**
Hook reutilizável para CRUD admin. Usa `useApiFetch` para GET e `fetch` próprio para escrita. Funções: `handleSubmit` (POST/PUT — **sem `credentials: 'include'`**), `handleDelete` (DELETE com `AbortController` correto, envia `{ id }`), `toggleField` (PUT — **sem `credentials: 'include'`**, com atualização otimista).

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | `handleSubmit` (linhas 173–177) | `fetch` sem `credentials: 'include'`. | Adicionar `credentials: 'include'`. |
| 2 | `toggleField` (linhas 256–260) | `fetch` sem `credentials: 'include'`. | Adicionar `credentials: 'include'`. |

**Duplicidades identificadas:**

| # | Onde | Duplicidade | Justificativa |
|---|---|---|---|
| 1 | `handleSubmit`, `handleDelete`, `toggleField` | Padrão `fetch` + erro + toast + `refetch` repetido 3x. | Avaliar abstração de mutação. |

---

### 4.8 `useApiFetch.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/useApiFetch.js`

**Arquivos acionados ou relacionados:**
- `useAdminCrud.js`

**Resumo do arquivo:**
Hook genérico para GET com cache, stale time e refetch. Exporta `data`, `loading`, `error`, `refetch`, `setData`. Usa `useRef` para `optionsRef` e `lastFetch`, e `useEffect` para estabilizar `options` via `JSON.stringify`. `fetchData` trata erros de rede e respostas não-JSON.

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | `useEffect` estabilização (linhas 50–56) | Dependência serializada vs comparação por referência (`optionsRef.current !== options`). | Alinhar: comparar por conteúdo serializado na condição. |
| 2 | `fetchData` (linhas 58–103) | Sem `AbortController`. | Criar por execução e abortar no cleanup. |

**Melhorias:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | `fetchData` | Adicionar `AbortController`. | Evitar estado em componente desmontado. |

**Pontos de atenção:**

| # | Onde | Ponto de atenção | Justificativa |
|---|---|---|---|
| 1 | `staleTime` + `lastFetchRef` (linhas 92, 116–122) | `setData` manual não atualiza `lastFetchRef`. | Pode pular fetch incorretamente. |

---

### 4.9 `useDebounce.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/useDebounce.js`

**Arquivos acionados ou relacionados:**
- Hooks que usam debounce (ex.: buscas com `useApiFetch`)

**Resumo do arquivo:**
Hook utilitário de debounce. Retorna valor após delay (padrão 300ms). Usa `useState`, `useEffect`, `setTimeout` com cleanup.

---

### 4.10 `usePerformance.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/usePerformance.js`

**Arquivos acionados ou relacionados:**
- `PerformanceContext.js`, `PerformanceProvider.js`

**Resumo do arquivo:**
Consome `PerformanceContext` via `useContext`. Valida se contexto existe (não `null`) e lança erro se usado fora de `PerformanceProvider`.

---

### 4.11 `usePerformanceMetrics.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/usePerformanceMetrics.js`

**Arquivos acionados ou relacionados:**
- `PerformanceProvider.js`, `PerformanceContext.js`
- `web-vitals` (import dinâmico cacheado em `webVitalsPromise`)
- `/api/analytics/web-vitals`

**Resumo do arquivo:**
Coleta Web Vitals (LCP, CLS, INP, FCP, TTFB) e recursos (TBT, resource timing). Fornece `reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`. `getMetrics` em `useCallback` **sem dependências**. Objetos `WEB_VITAL_METRICS`/`THRESHOLDS` mutáveis no módulo. Envia via `sendBeacon` (sem verificação) ou `fetch` com `keepalive`.

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | `getMetrics` (linhas 194–200) | `useCallback` sem array de dependências. | Adicionar `[]`. |
| 2 | `sendBeacon` (linha 176) | Sem verificação de retorno. | Verificar e fazer fallback. |
| 3 | `reportMetric` (linha 105) | `onReport` instável pode re-registrar observers. | `useRef` para `onReport`. |
| 4 | `WEB_VITAL_METRICS`/`THRESHOLDS` (linhas 39–59) | Objetos mutáveis. | `Object.freeze`. |

**Melhorias:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | `getMetrics` | Adicionar `[]`. | Estabilizar referência. |
| 2 | `sendBeacon` | Fallback para `fetch`. | Evitar perda de métricas. |
| 3 | `reportMetric` | `useRef` para `onReport`. | Evitar re-registro. |
| 4 | Constantes | `Object.freeze`. | Prevenir mutação. |

**Duplicidades:**

| # | Onde | Duplicidade | Justificativa |
|---|---|---|---|
| 1 | `@typedef PerformanceContextValue` | Definido em 3 arquivos. | Centralizar tipos. |

---

### 4.12 `useUnauthorized.js`

**Caminho:** `/home/gus/Projetos/Caminhar/hooks/useUnauthorized.js`

**Arquivos acionados ou relacionados:**
- `next/router` (parâmetro `router`)
- `react-hot-toast` (import dinâmico)
- Componentes com verificação de 401

**Resumo do arquivo:**
Interrompe fluxo em acesso não autorizado. Exibe toast, aguarda delay, chama `router.reload()` e suspende via `await new Promise(() => {})`. O `throw` na linha 28 é **inalcançável**.

**Problemas identificados:**

| # | Onde | Problema | Correção necessária |
|---|---|---|---|
| 1 | Linhas 27–28 | `throw` inalcançável após `await new Promise(() => {})`. | Remover `throw` e documentar. |

**Melhorias:**

| # | Onde | Melhoria | Justificativa |
|---|---|---|---|
| 1 | Padrão | Remover `throw` inalcançável. | Clareza. |

**Pontos de atenção:**

| # | Onde | Ponto de atenção | Justificativa |
|---|---|---|---|
| 1 | `router.reload()` | Acoplamento ao Next.js. | Migração exige revisão. |

**Código morto:**

| # | Onde | Código morto | Justificativa |
|---|---|---|---|
| 1 | Linha 28 | `throw new Error(...)`. | Inalcançável. |

---

## 5. Ajustes e correções

| Arquivo | Onde | Problema | Correção |
|---|---|---|---|
| `AuthProvider.js` | `logout` (linhas 64–67) | Sem `try/catch`. `setUser(null)` não executa em falha. | `try/catch/finally` com `setUser(null)` no `finally`. |
| `AuthProvider.js` | `checkAuth` → `refreshSession` (linhas 78–88) | `refreshSession()` sem `signal`. | Passar `signal`. |
| `index.js` | Exportações (linhas 6–10) | Dois padrões de importação. | Documentar política. |
| `useAdminAuth.js` | `handleLogout` (linhas 48–57) | Erro silenciado; callback executa em falha. | Condicionar ao sucesso. |
| `useAdminCrud.js` | `handleSubmit` (linhas 173–177) | Sem `credentials: 'include'`. | Adicionar `credentials: 'include'`. |
| `useAdminCrud.js` | `toggleField` (linhas 256–260) | Sem `credentials: 'include'`. | Adicionar `credentials: 'include'`. |
| `useApiFetch.js` | Estabilização (linhas 50–56) | Inconsistência serialized vs referência. | Alinhar comparação. |
| `useApiFetch.js` | `fetchData` (linhas 58–103) | Sem `AbortController`. | Criar por execução. |
| `usePerformanceMetrics.js` | `getMetrics` (linhas 194–200) | Sem array de dependências. | Adicionar `[]`. |
| `usePerformanceMetrics.js` | `sendBeacon` (linha 176) | Sem verificação. | Fallback para `fetch`. |
| `usePerformanceMetrics.js` | `reportMetric` (linha 105) | `onReport` instável. | `useRef` para `onReport`. |
| `usePerformanceMetrics.js` | Constantes (linhas 39–59) | Objetos mutáveis. | `Object.freeze`. |
| `useUnauthorized.js` | Linhas 27–28 | `throw` inalcançável. | Remover `throw`. |

---

## 6. Melhorias

| Arquivo | Onde | Melhoria | Justificativa |
|---|---|---|---|
| `AuthProvider.js` | `logout` | `try/catch/finally` com `setUser(null)` no `finally`. | Limpeza garantida do estado. |
| `AuthProvider.js` | `refreshSession` | Receber `signal`. | Cancelamento no desmonte. |
| `index.js` | Exportações | Documentar política. | Consistência de imports. |
| `useAdminAuth.js` | `handleLogout` | Condicionar ao sucesso. | Evitar mascarar falhas. |
| `useAdminCrud.js` | `handleSubmit`, `handleDelete`, `toggleField` | Abstração de mutação. | Reduzir duplicação. |
| `useApiFetch.js` | `fetchData` | `AbortController`. | Evitar estado em componente desmontado. |
| `usePerformanceMetrics.js` | `getMetrics` | Array de dependências `[]`. | Estabilizar referência. |
| `usePerformanceMetrics.js` | `sendBeacon` | Fallback para `fetch`. | Evitar perda de métricas. |
| `usePerformanceMetrics.js` | `reportMetric` | `useRef` para `onReport`. | Evitar re-registro. |
| `usePerformanceMetrics.js` | Constantes | `Object.freeze`. | Prevenir mutação. |
| `useUnauthorized.js` | Padrão | Remover `throw` inalcançável. | Clareza. |

---

## 7. Duplicidades

| Arquivo(s) | Onde | Duplicidade | Justificativa |
|---|---|---|---|
| `AuthContext.js` / `PerformanceContext.js` | Estrutura | Padrão idêntico `createContext` + `@typedef`. | Pode ser padronizado. |
| `PerformanceContext.js` / `PerformanceProvider.js` / `usePerformanceMetrics.js` | `@typedef PerformanceContextValue` | Definido em 3 arquivos. | Centralizar tipos. |
| `useAdminCrud.js` | `handleSubmit`, `handleDelete`, `toggleField` | Padrão `fetch` + erro + toast + `refetch` repetido. | Avaliar abstração. |

---

## 8. Código morto

| Arquivo | Onde | Código morto | Justificativa |
|---|---|---|---|
| `useUnauthorized.js` | Linha 28 | `throw new Error('Acesso não autorizado')` após `await new Promise(() => {})`. | Inalcançável. |

---

## Controle do processo

| # | Arquivo | Identificado | Lido | Analisado | Atualizado | Relido | Validado |
|---|---|---|---|---|---|---|---|
| 1 | `AuthContext.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `AuthProvider.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `PerformanceContext.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | `PerformanceProvider.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | `index.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | `useAdminAuth.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | `useAdminCrud.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | `useApiFetch.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9 | `useDebounce.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 | `usePerformance.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11 | `usePerformanceMetrics.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 | `useUnauthorized.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Validação final

Todos os 12 arquivos da pasta `/hooks/` foram individualmente analisados, documentados, relidos e validado. O documento final está objetivo, claro, consistente e fiel ao conteúdo real do projeto.

### Resumo do processamento

- **Total de arquivos analisados:** 12
- **Total de problemas identificados:** 13
- **Total de melhorias sugeridas:** 11
- **Total de duplicidades identificadas:** 3
- **Total de códigos mortos identificados:** 1
- **Arquivos sem problemas identificados:** `AuthContext.js`, `PerformanceContext.js`, `PerformanceProvider.js`, `useDebounce.js`, `usePerformance.js`
