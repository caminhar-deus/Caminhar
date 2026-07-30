# Análise dos Hooks — `/hooks/`

> **Data:** 28/06/2026
> **Objetivo:** Documentar a finalidade, localização e funcionamento de cada hook presente na pasta `/hooks`.
> **Base:** Análise direta dos arquivos fonte atuais do projeto.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [`/hooks/index.js`](#1-hooksindexjs) — Barrel de exportações
3. [`/hooks/AuthContext.js`](#2-hooksauthcontextjs) — Contexto de autenticação
4. [`/hooks/AuthProvider.js`](#3-hooksauthproviderjs) — Provider de autenticação
5. [`/hooks/useAdminAuth.js`](#4-hooksuseadminauthjs) — Autenticação para área administrativa
6. [`/hooks/useAdminCrud.js`](#5-hooksuseadmincrudjs) — Operações CRUD em painéis admin
7. [`/hooks/useApiFetch.js`](#6-hooksuseapifetchjs) — Fetch genérico com estados loading/error
8. [`/hooks/usePerformanceMetrics.js`](#7-hooksuseperformancemetricsjs) — Core Web Vitals e performance
9. [`/hooks/PerformanceContext.js`](#8-hooksperformancecontextjs) — Contexto de performance
10. [`/hooks/PerformanceProvider.js`](#9-hooksperformanceproviderjs) — Provider de performance
11. [`/hooks/usePerformance.js`](#10-hooksuseperformancejs) — Hook de consumo de performance
12. [`/hooks/useDebounce.js`](#11-hooksusedebouncejs) — Debounce utilitário
13. [`/hooks/useUnauthorized.js`](#12-hooksuseunauthorizedjs) — Tratamento de 401 no frontend
14. [Resumo Consolidado](#resumo-consolidado)

---

## Visão Geral

A pasta `/hooks` contém **12 arquivos** que implementam custom hooks React e seus componentes de contexto. Não há subpastas. Os hooks dividem-se em três categorias:

| Categoria | Hooks | Descrição |
|---|---|---|
| **Autenticação** | `useAdminAuth` | Gerenciamento de sessão, login/logout e controle de acesso administrativo |
| **Infraestrutura / Utilitários** | `useApiFetch`, `useDebounce`, `useAdminCrud`, `useUnauthorized` | Abstrações reutilizáveis para fetch, debounce, operações CRUD completas e tratamento de 401 |
| **Design & Performance** | `usePerformanceMetrics`, `PerformanceContext`, `PerformanceProvider`, `usePerformance` | Monitoramento de Core Web Vitals com wrapper de contexto |

---

## 1. `/hooks/index.js`

**Localização:** `/hooks/index.js`
**Propósito:** Arquivo de barreira (barrel file) que centraliza e reexporta os hooks do diretório que são efetivamente consumidos externamente, servindo como ponto único de importação.

**Funcionalidades:**
- Reexporta hooks nomeados: `PerformanceProvider`, `usePerformance`, `useApiFetch`, `useDebounce`, `useAdminAuth`.
- Re-exports removidos (por não terem consumidores externos): `useTheme`, `AuthContext`, `AuthProvider`, `useAuth`, `useAdminCrud`, `PerformanceContext`, `usePerformanceMetrics`, `useThrottle`, `useUnauthorized`.
- Os arquivos fonte que não estão no barrel foram preservados pois são usados internamente por outros hooks.
- Todos os hooks são reexportados diretamente como named exports com a sintaxe `export { Nome } from './arquivo'`.

---

## 2. `/hooks/AuthContext.js`

**Localização:** `/hooks/AuthContext.js`
**Propósito:** Definição do contexto de autenticação React, separado do provider e do hook para respeitar o princípio de responsabilidade única.

**Funcionalidades:**
- **`AuthContext`** — Contexto React criado via `createContext` com valor padrão (`user: null`, `isAuthenticated: false`, `loading: true`, `loginLoading: false`, funções `login`/`logout` vazias) para evitar erros de consumo fora do Provider.
- **`@typedef AuthContextValue`** — Documentação JSDoc do tipo do valor do contexto, definindo a interface esperada para consumidores.

---

## 3. `/hooks/AuthProvider.js`

**Localização:** `/hooks/AuthProvider.js`
**Propósito:** Componente provider de autenticação que gerencia o estado do usuário, verificação de sessão e operações de login/logout. Consome `AuthContext` de `AuthContext.js`.

**Funcionalidades:**
- Na montagem, realiza `GET /api/auth/check` com `credentials: 'include'` para verificar sessão existente.
- Usa `AbortController` para cancelar a verificação de sessão no desmonte do componente.
- `login(username, password)`: Envia `POST /api/auth/login` com JSON e `credentials: 'include'`. Retorna `{ success, error }`.
- `refreshSession()`: Envia `POST /api/auth/refresh` com `credentials: 'include'` para renovar o access token automaticamente. Retorna `true` se bem-sucedido, `false` caso contrário.
- `logout()`: Envia `POST /api/auth/logout` com `credentials: 'include'` e limpa o estado do usuário.
- Possui `loginLoading` separado de `loading` para evitar flicker visual durante operações de login.
- Usa `loginAbortRef` (`useRef`) com `AbortController` para abortar requisições de login anteriores se uma nova for disparada.
- **Renovação automática de sessão:** No `useEffect` de `checkAuth`, ao receber status 401, tenta renovar o token via `refreshSession()` antes de considerar o usuário não autenticado. Se a renovação for bem-sucedida, refaz a verificação (`GET /api/auth/check`).
- **Tratamento de erros:** `AbortError` é tratado silenciosamente. Erros de rede são convertidos em mensagem amigável. Erros da API são extraídos do corpo JSON da resposta.

---

## 4. `/hooks/useAdminAuth.js`

**Localização:** `/hooks/useAdminAuth.js`
**Propósito:** Hook de autenticação específico para a área administrativa. Consome o `AuthContext` de `AuthContext.js` e estende com funcionalidades de redirect opcional e estado isolado de erro para o login. Não possui dependência de framework.

**Funcionalidades:**
- **Base:** Consome `AuthContext` importando `isAuthenticated`, `loading` (renomeado para `isChecking`), `login`, `logout` e `loginLoading`.
- **`handleLogin(username, password)`:** Encapsula a função `login` do contexto com estado próprio de `loginError`, isolando o componente de erros externos. O `loginLoading` é consumido diretamente do `AuthContext`, eliminando estado local duplicado.
- **`handleLogout()`:** Executa `logout` do contexto com `try/catch`. Aceita parâmetro opcional `{ onLogoutRedirect }` na chamada do hook. Se fornecido, o callback é executado após o logout bem-sucedido, permitindo que o consumidor defina o redirect sem acoplar o hook ao Next.js.
- **Retorno:** Expõe `isAuthenticated`, `isChecking`, `handleLogin`, `handleLogout`, `loginLoading`, `loginError`.

---

## 5. `/hooks/useAdminCrud.js`

**Localização:** `/hooks/useAdminCrud.js`
**Propósito:** Hook reutilizável que centraliza operações CRUD completas para painéis administrativos: listagem, criação, edição, exclusão, paginação e toggle de campos booleanos.

**Funcionalidades:**
- **Configuração (`AdminCrudConfig`):** Recebe `apiEndpoint`, `initialFormData`, `usePagination` (padrão `false`), `itemsPerPage` (padrão 10), `autoFetch` (padrão `true`), `onSuccess`, `onError`, `onConfirmDelete`.
- **Listagem:** Usa `useApiFetch` internamente, construindo a URL dinamicamente com parâmetros de paginação via `buildUrl(page)`. A paginação é reativa: quando `currentPage` muda, o `useApiFetch` refaz o fetch automaticamente.
- **Formulário:** Gerencia estado `formData` com `handleInputChange` (para inputs nativos com `name`, `type`, `checked`) e `setFieldValue` (para definição programática).
- **`handleSubmit(e, customValidator?)`:** Envia `POST` (criação) ou `PUT` (edição) conforme `isEditing`. Suporta validação customizada via função opcional `customValidator` que lança `Error` se a validação falhar. Usa `react-hot-toast` para feedback visual (toast de loading, sucesso e erro).
- **`handleDelete(id)`:** Se `onConfirmDelete` for fornecido, aguarda a Promise resolver (`await onConfirmDelete()`). Se resolver com `true`, prossegue com o `DELETE`. Caso contrário, usa `window.confirm` como fallback. Envia `DELETE` com `{ id }` no corpo JSON, atualiza a lista via `refetch`.
- **`toggleField(item, key, currentValue, options?)`:** Alterna campo booleano enviando apenas `{ id, [key]: newValue }` via `PUT`. Aceita objeto opcional `{ onOptimisticUpdate, onRevert }` para atualização otimista na UI antes da resposta do servidor e reversão automática em caso de falha. Usa `react-hot-toast` e chama `refetch()` após sucesso para sincronizar com o servidor. Retorna a Promise resolvida com o resultado da API.
- **Paginação:** `goToPage(page)` navega respeitando limites (`totalPages`). `currentPage` e `totalPages` são extraídos automaticamente dos dados paginados da API.
- **`refetch()`:** Exposto diretamente do `useApiFetch` (hook genérico compartilhado com Features públicas) para recarga manual da listagem.

---

## 6. `/hooks/useApiFetch.js`

**Localização:** `/hooks/useApiFetch.js`
**Propósito:** Hook genérico para requisições HTTP com gerenciamento centralizado de estados `loading`/`error`, cache simples e suporte a transformação de dados. Compartilhado entre componentes públicos (Features) e administrativos.

**Funcionalidades:**
- **Configuração (`ApiFetchOptions`):** Aceita `url`, `options` (opções do fetch nativo), `deps` (dependências extras), `transform` (função de transformação), `initialData` (valor inicial), `staleTime` (cache em ms), `onError` (callback).
- **Estabilização de options:** Usa `optionsRef` (`useRef`) e um estado `optionsKey` (contador) que é incrementado via `useEffect` quando o conteúdo serializado de `options` muda. Isso evita que o `fetchData` seja recriado a cada render por mudanças de referência em `options`.
- **`fetchData()`:** Função memoizada via `useCallback` que:
  - Verifica `navigator.onLine` antes de executar o fetch. Se off-line, define erro "Sem conexão com a internet", chama `onError` e interrompe (early return).
  - Executa `fetch(url, options)`.
  - Trata HTTP 304 como resposta sem corpo (não lança erro).
  - Extrai mensagem de erro do corpo JSON da resposta quando o status não é ok.
  - Aplica `transform` se fornecida.
  - Retorna `{ data, loading, error, refetch, setData }`.
- **Reconexão automática:** Registra listener para evento `'online'` no `window`. Se o erro atual for de conectividade (mensagem contém "Sem conexão"), dispara `fetchData()` automaticamente ao restabelecer a conexão. O listener é removido no cleanup do `useEffect` e possui proteção SSR (`typeof window`).
- **Cache simples (`staleTime`):** Se configurado, compara o timestamp do último fetch com o tempo decorrido. Se estiver dentro do período fresco, pula a requisição e mantém os dados em cache.
- **`setData`:** Função exposta para definir dados manualmente (útil para atualizações otimistas fora do hook).
- **Documentação:** O JSDoc do hook inclui a tag `@note Hook compartilhado entre componentes públicos e administrativos — uso não se limita ao admin.`, explicitando que o hook não é exclusivo da área administrativa.

---

## 7. `/hooks/usePerformanceMetrics.js`

**Localização:** `/hooks/usePerformanceMetrics.js`
**Propósito:** Hook avançado para monitoramento de Core Web Vitals (LCP, CLS, INP, FCP, TTFB) e métricas adicionais de performance (TBT, recursos lentos).

**Funcionalidades:**
- **Biblioteca externa:** Importa dinamicamente `web-vitals` com promessa cacheada em nível de módulo (`const webVitalsPromise = import('web-vitals')`), executada apenas uma vez.
- **Métricas suportadas (`WEB_VITAL_METRICS`):** LCP, CLS, INP, FCP, TTFB, TBT.
- **Thresholds (`THRESHOLDS`):** Valores de classificação Google (`good` / `poor`) para cada métrica, com unidades (`ms` ou vazio para CLS).
- **`reportMetric(metric)`:** Função callback que:
  - Aplica cache de 1 minuto (`METRICS_CACHE_MS`) com threshold de variação de 5% (`METRICS_VARIANCE_THRESHOLD`): reports com variação percentual inferior a 5% em relação ao último valor reportado são suprimidos. Se o valor anterior for zero, usa diferença absoluta em vez de relativa para evitar divisão por zero.
  - Armazena no histórico local (máx. 50 entradas, com campos essenciais).
  - Mantém métrica atual com contexto completo (`url`, `userAgent`, `connection`, `deviceMemory`).
  - Envia para analytics via `navigator.sendBeacon` (preferencial) ou `fetch` com `keepalive`.
  - Exibe logs de debug em desenvolvimento.
- **PerformanceObserver:** Monitora `longtask` (para TBT) e `resource` (para recursos com duração > 1s). No resource observer, recursos de domínios de terceiros (youtube.com, ytimg.com, spotify.com, scdn.co, googleusercontent.com, googleapis.com, gstatic.com, facebook.com, instagram.com) são ignorados no `console.warn` para evitar falsos positivos, pois recursos cross-origin são naturalmente mais lentos. No longtask observer, se o navegador não suportar `PerformanceObserver` com `entryTypes: ['longtask']`, a exceção é capturada e, em modo `debug`, um `console.warn` é emitido com a mensagem `'[Performance] PerformanceObserver for longtask not supported in this browser — TBT metric unavailable'` e o erro original, permitindo diagnóstico rápido da indisponibilidade da métrica TBT. Os observers são desconectados no cleanup para evitar vazamentos.
- **Funções auxiliares exportadas:**
  - `getRating(name, value)` — Classifica como `good`, `needs-improvement` ou `poor`.
  - `formatMetric(name, value)` — Formata valor (ms arredondado, CLS com 3 casas decimais).
- **`getMetrics()`:** Retorna métricas atuais e sumário do histórico.

---

## 8. `/hooks/PerformanceContext.js`

**Localização:** `/hooks/PerformanceContext.js`
**Propósito:** Definição do contexto de performance React, seguindo o mesmo padrão de `AuthContext.js`. Armazena as métricas de Web Vitals e funções auxiliares para consumo por componentes da aplicação.

**Funcionalidades:**
- **`PerformanceContext`** — Contexto React criado via `createContext(null)`.
- **`@typedef PerformanceContextValue`** — Documentação JSDoc do tipo do valor do contexto, definindo a interface: `reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`.
- O valor padrão é `null` para forçar o uso dentro de um `PerformanceProvider` — o hook de consumo (`usePerformance`) lança erro se usado fora do provider.

---

## 9. `/hooks/PerformanceProvider.js`

**Localização:** `/hooks/PerformanceProvider.js`
**Propósito:** Componente provider de performance que instancia o `usePerformanceMetrics` uma única vez e compartilha as métricas via contexto, evitando múltiplas instâncias do `PerformanceObserver` em diferentes componentes.

**Funcionalidades:**
- **Instância única:** Chama `usePerformanceMetrics()` sem argumentos no corpo do provider, garantindo um único `PerformanceObserver` para toda a aplicação.
- **Estabilização com `useMemo`:** O valor do contexto é memoizado com dependências explícitas de todos os 7 campos retornados (`reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`).
- Envolve `children` com `<PerformanceContext.Provider>`.
- Segue o mesmo padrão arquitetural de `AuthProvider.js`.

---

## 10. `/hooks/usePerformance.js`

**Localização:** `/hooks/usePerformance.js`
**Propósito:** Hook que consome o `PerformanceContext` e expõe as métricas de performance para componentes React.

**Funcionalidades:**
- **`usePerformance()`** — Hook que acessa o `PerformanceContext` via `useContext`.
- **Proteção de uso:** Se o contexto for `null` (hook chamado fora de um `PerformanceProvider`), lança erro: `"usePerformance must be used within a PerformanceProvider"`.
- **Exportação:** Apenas named export (`export const usePerformance`), sem `export default`.

---

## 11. `/hooks/useDebounce.js`

**Localização:** `/hooks/useDebounce.js`
**Propósito:** Hook de debounce simples e reutilizável. Retorna o valor atualizado somente após um período de inatividade.

**Funcionalidades:**
- Recebe `value` (qualquer tipo) e `delay` (padrão 300ms).
- Usa `useState` + `useEffect` com `setTimeout`/`clearTimeout`.
- Retorna o valor "debounced", atualizado apenas após o delay sem novas alterações.
- Ideal para campos de busca, filtros e formulários que disparam requisições.

---

## 12. `/hooks/useUnauthorized.js`

**Localização:** `/hooks/useUnauthorized.js`
**Propósito:** Hook para tratamento padronizado de resposta 401 (não autorizado) no frontend. Exibe toast de sessão expirada e recarrega a página para redirecionar ao login.

**Funcionalidades:**
- **`useUnauthorized(router, delay, message)`:** Função assíncrona que:
  - Importa dinamicamente `react-hot-toast` e exibe toast de erro com a mensagem fornecida (padrão: "Sessão expirada. Faça login novamente.").
  - Aguarda delay opcional em ms (útil para o toast aparecer antes do reload).
  - Chama `router.reload()` para recarregar a página e redirecionar ao login.
  - Interrompe o fluxo com `await new Promise(() => {})` e lança `Error('Acesso não autorizado')`.
- **Origem:** Foi movida de `lib/handleUnauthorized.js` (removido) para `hooks/useUnauthorized.js`, com a função renomeada de `handleUnauthorized` para `useUnauthorized`, por ser código exclusivamente de frontend.
- **Consumidores:** Importada diretamente por `components/Admin/AdminAudit.js` e `components/Admin/AdminUsersTab.js` via `@/hooks/useUnauthorized`.
- **Exportação:** Não está no barrel `hooks/index.js` (o export foi removido por não ter consumidores via barrel — ambos os componentes importam diretamente do arquivo específico).

---

## Resumo Consolidado

| Arquivo | Localização | Tipo | Complexidade | Dependências Externas |
|---|---|---|---|---|
| `index.js` | `/hooks/index.js` | Barrel file | Baixa | Nenhuma |
| `AuthContext.js` | `/hooks/AuthContext.js` | Contexto React | Baixa | Nenhuma |
| `AuthProvider.js` | `/hooks/AuthProvider.js` | Provider React | Média | Nenhuma |
| `useAdminAuth.js` | `/hooks/useAdminAuth.js` | Hook de autenticação admin | Baixa | Nenhuma |
| `useAdminCrud.js` | `/hooks/useAdminCrud.js` | Hook de CRUD completo | Alta | `react-hot-toast` |
| `useApiFetch.js` | `/hooks/useApiFetch.js` | Hook de fetch genérico | Média | Nenhuma |
| `usePerformanceMetrics.js` | `/hooks/usePerformanceMetrics.js` | Hook de performance | Alta | `web-vitals` (dynamic import) |
| `PerformanceContext.js` | `/hooks/PerformanceContext.js` | Contexto React | Baixa | Nenhuma |
| `PerformanceProvider.js` | `/hooks/PerformanceProvider.js` | Provider React | Baixa | `usePerformanceMetrics` |
| `usePerformance.js` | `/hooks/usePerformance.js` | Hook de consumo de contexto | Baixa | Nenhuma |
| `useDebounce.js` | `/hooks/useDebounce.js` | Hook utilitário | Baixa | Nenhuma |
| `useUnauthorized.js` | `/hooks/useUnauthorized.js` | Hook de tratamento de 401 | Baixa | `react-hot-toast` (dynamic import) |

### Observações importantes

- **Relação entre hooks:** `useAdminAuth` depende do `AuthContext` (importado de `AuthContext.js`). `useAdminCrud` depende de `useApiFetch`. `PerformanceProvider` depende de `usePerformanceMetrics` para instanciar o monitoramento.
- **Exportações:** O barrel `index.js` exporta atualmente 5 hooks: `PerformanceProvider`, `usePerformance`, `useApiFetch`, `useDebounce` e `useAdminAuth`. Os re-exports removidos do barrel são: `useTheme`, `AuthContext`, `AuthProvider`, `useAuth`, `useAdminCrud`, `PerformanceContext`, `usePerformanceMetrics`, `useThrottle` e `useUnauthorized`.
- **Cobertura de uso:** `usePerformance` possui consumidor direto em `pages/_app.js` via `PerformanceMonitor`. `usePerformanceMetrics` é consumido indiretamente via `PerformanceProvider`, que o instancia uma única vez e compartilha as métricas através do `PerformanceContext`. `useApiFetch` e `useDebounce` são usados por 5 componentes públicos (Features). `useAdminAuth` é usado por `components/Admin/withAdminAuth.js`. `useUnauthorized` é usado por `components/Admin/AdminAudit.js` e `components/Admin/AdminUsersTab.js`.
- **Arquivos removidos:** Os hooks `useAuth.js`, `useTheme.js` e `useThrottle.js` foram removidos por não possuírem consumidores no projeto, conforme identificado pelo Knip.
- **Arquivos movidos para hooks:** O arquivo `lib/handleUnauthorized.js` foi movido para `hooks/useUnauthorized.js` (função renomeada para `useUnauthorized`), seguindo o mesmo padrão do `csvExport.js` que foi movido de `lib/` para `utils/`.