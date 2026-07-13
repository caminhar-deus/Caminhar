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
5. [`/hooks/useAuth.js`](#4-hooksuseauthjs) — Hook de autenticação
6. [`/hooks/useAdminAuth.js`](#5-hooksuseadminauthjs) — Autenticação para área administrativa
7. [`/hooks/useAdminCrud.js`](#6-hooksuseadmincrudjs) — Operações CRUD em painéis admin
8. [`/hooks/useApiFetch.js`](#7-hooksuseapifetchjs) — Fetch genérico com estados loading/error
9. [`/hooks/useTheme.js`](#8-hooksusethemejs) — Gerenciamento de tema e tokens de design
10. [`/hooks/usePerformanceMetrics.js`](#9-hooksuseperformancemetricsjs) — Core Web Vitals e performance
11. [`/hooks/PerformanceContext.js`](#10-hooksperformancecontextjs) — Contexto de performance
12. [`/hooks/PerformanceProvider.js`](#11-hooksperformanceproviderjs) — Provider de performance
13. [`/hooks/usePerformance.js`](#12-hooksuseperformancejs) — Hook de consumo de performance
14. [`/hooks/useDebounce.js`](#13-hooksusedebouncejs) — Debounce utilitário
15. [`/hooks/useThrottle.js`](#14-hooksusethrottlejs) — Throttle utilitário
16. [Resumo Consolidado](#resumo-consolidado)

---

## Visão Geral

A pasta `/hooks` contém **14 arquivos** que implementam custom hooks React e seus componentes de contexto. Não há subpastas. Os hooks dividem-se em três categorias:

| Categoria | Hooks | Descrição |
|---|---|---|
| **Autenticação** | `useAuth`, `useAdminAuth` | Gerenciamento de sessão, login/logout e controle de acesso administrativo |
| **Infraestrutura / Utilitários** | `useApiFetch`, `useDebounce`, `useThrottle`, `useAdminCrud` | Abstrações reutilizáveis para fetch, debounce, throttle e operações CRUD completas |
| **Design & Performance** | `useTheme`, `usePerformanceMetrics`, `PerformanceContext`, `PerformanceProvider`, `usePerformance` | Gerenciamento de tema (light/dark) com tokens de design e monitoramento de Core Web Vitals com wrapper de contexto |

---

## 1. `/hooks/index.js`

**Localização:** `/hooks/index.js`
**Propósito:** Arquivo de barreira (barrel file) que centraliza e reexporta todos os hooks do diretório, servindo como ponto único de importação.

**Funcionalidades:**
- Reexporta hooks nomeados: `useTheme`, `useAuth`, `useAdminCrud`, `usePerformanceMetrics`, `useApiFetch`, `useDebounce`, `useThrottle`, `useAdminAuth`.
- Exporta também `AuthContext` e `AuthProvider` (definidos em `AuthContext.js` e `AuthProvider.js` respectivamente), permitindo que consumidores importem tudo de um único local.
- Exporta também os artefatos de performance: `PerformanceContext`, `PerformanceProvider` e `usePerformance`.
- Todos os hooks são reexportados diretamente como named exports com a sintaxe `export { Nome } from './arquivo'`, incluindo `usePerformanceMetrics` que anteriormente usava `export { default as usePerformanceMetrics }`.

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
- `logout()`: Envia `POST /api/auth/logout` com `credentials: 'include'` e limpa o estado do usuário.
- Possui `loginLoading` separado de `loading` para evitar flicker visual durante operações de login.
- Usa `loginAbortRef` (`useRef`) com `AbortController` para abortar requisições de login anteriores se uma nova for disparada.
- **Tratamento de erros:** `AbortError` é tratado silenciosamente. Erros de rede são convertidos em mensagem amigável. Erros da API são extraídos do corpo JSON da resposta.

---

## 4. `/hooks/useAuth.js`

**Localização:** `/hooks/useAuth.js`
**Propósito:** Hook que consome o `AuthContext` e expõe os dados de autenticação para componentes React. Contém apenas o hook, sem a definição do contexto ou do provider.

**Funcionalidades:**
- **`useAuth()`** — Hook que consome o `AuthContext` via `useContext` e retorna `user`, `isAuthenticated`, `loading`, `loginLoading`, `login`, `logout`.
- **Exportação:** Apenas named export (`export const useAuth`), sem `export default`.

---

## 5. `/hooks/useAdminAuth.js`

**Localização:** `/hooks/useAdminAuth.js`
**Propósito:** Hook de autenticação específico para a área administrativa. Consome o `AuthContext` de `AuthContext.js` e estende com funcionalidades de redirect opcional e estado isolado de erro para o login. Não possui dependência de framework.

**Funcionalidades:**
- **Base:** Consome `AuthContext` importando `isAuthenticated`, `loading` (renomeado para `isChecking`), `login`, `logout` e `loginLoading`.
- **`handleLogin(username, password)`:** Encapsula a função `login` do contexto com estado próprio de `loginError`, isolando o componente de erros externos. O `loginLoading` é consumido diretamente do `AuthContext`, eliminando estado local duplicado.
- **`handleLogout()`:** Executa `logout` do contexto com `try/catch`. Aceita parâmetro opcional `{ onLogoutRedirect }` na chamada do hook. Se fornecido, o callback é executado após o logout bem-sucedido, permitindo que o consumidor defina o redirect sem acoplar o hook ao Next.js.
- **Retorno:** Expõe `isAuthenticated`, `isChecking`, `handleLogin`, `handleLogout`, `loginLoading`, `loginError`.

---

## 6. `/hooks/useAdminCrud.js`

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

## 7. `/hooks/useApiFetch.js`

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

## 8. `/hooks/useTheme.js`

**Localização:** `/hooks/useTheme.js`
**Propósito:** Hook principal para gerenciamento de tema (light/dark) e acesso centralizado a todos os tokens de design do sistema (cores, espaçamentos, tipografia, bordas, sombras, breakpoints, animações).

**Funcionalidades:**
- **Estado inicial e hidratação SSR:** Mantém `theme` ("light" | "dark") e `mounted` (flag de hidratação). Na montagem, lê `localStorage('theme')` e, se não existir, respeita `prefers-color-scheme: dark` do sistema.
- **Aplicação do tema:** Sincroniza `data-theme` no `<html>`, classe `.dark`, `localStorage` e dispara evento customizado `themeChange` no `window` para código fora do React.
- **`toggleTheme`:** Alterna entre light/dark com throttle de 300ms via hook `useThrottle`, prevenindo múltiplas trocas rápidas.
- **`setTheme`:** Define tema específico ("light" | "dark"). Valores inválidos são ignorados com `console.warn` em desenvolvimento. Internamente, o valor é validado contra o conjunto `['light', 'dark']` antes de atualizar o estado; se inválido, o estado não é alterado. O `toggleTheme` usa o setter raw diretamente para evitar a validação, já que sempre produz valores válidos.
- **Responsividade:** Monitora `window.innerWidth` via event listener `resize` com throttle de 100ms (via `useThrottle`), evitando re-renderizações excessivas durante redimensionamento rápido. Fornece booleanos reativos `isMobile`, `isTablet` e `isDesktop` baseados nos breakpoints `md` e `lg` dos tokens.
- **Helpers de acesso a tokens (todos memoizados com `useCallback`):**
  - `getColor(path, alpha)` — Navega por `tokens.colors` com notação dot-path. Suporta opacidade via função `hexToRgba` (função utilitária pura definida **fora do hook**, testável e reutilizável independentemente). Exibe `console.warn` em desenvolvimento se o token não existir.
  - `getSpacing(key)` — Busca no objeto mesclado `allSpacing` que unifica `tokens.spacing.spacing` (numérico) e `tokens.spacing.space` (semântico). Retorna `null` se não encontrado.
  - `getFontSize(key)` — Busca em `tokens.typography.fontSize`. Retorna `null` se não encontrado.
  - `getShadow(key)` — Busca no objeto mesclado `allShadows` que unifica `tokens.shadows.shadow` (base) e `tokens.shadows.shadows` (semântico). Retorna `null` se não encontrado.
  - `getRadius(key)` — Busca no objeto mesclado `allRadius` que unifica `tokens.borders.borderRadius` (base) e `tokens.borders.radius` (semântico). Retorna `null` se não encontrado.
  - `getBreakpoint(key)` — Busca em `tokens.breakpoints.breakpoints`. Retorna `undefined` se não encontrado (sem fallback).
- **Performance:** O valor de retorno completo é memoizado com `useMemo` e dependências explícitas.

---

## 9. `/hooks/usePerformanceMetrics.js`

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

## 10. `/hooks/PerformanceContext.js`

**Localização:** `/hooks/PerformanceContext.js`
**Propósito:** Definição do contexto de performance React, seguindo o mesmo padrão de `AuthContext.js`. Armazena as métricas de Web Vitals e funções auxiliares para consumo por componentes da aplicação.

**Funcionalidades:**
- **`PerformanceContext`** — Contexto React criado via `createContext(null)`.
- **`@typedef PerformanceContextValue`** — Documentação JSDoc do tipo do valor do contexto, definindo a interface: `reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`.
- O valor padrão é `null` para forçar o uso dentro de um `PerformanceProvider` — o hook de consumo (`usePerformance`) lança erro se usado fora do provider.

---

## 11. `/hooks/PerformanceProvider.js`

**Localização:** `/hooks/PerformanceProvider.js`
**Propósito:** Componente provider de performance que instancia o `usePerformanceMetrics` uma única vez e compartilha as métricas via contexto, evitando múltiplas instâncias do `PerformanceObserver` em diferentes componentes.

**Funcionalidades:**
- **Instância única:** Chama `usePerformanceMetrics()` sem argumentos no corpo do provider, garantindo um único `PerformanceObserver` para toda a aplicação.
- **Estabilização com `useMemo`:** O valor do contexto é memoizado com dependências explícitas de todos os 7 campos retornados (`reportMetric`, `getMetrics`, `metrics`, `WEB_VITAL_METRICS`, `THRESHOLDS`, `getRating`, `formatMetric`).
- Envolve `children` com `<PerformanceContext.Provider>`.
- Segue o mesmo padrão arquitetural de `AuthProvider.js`.

---

## 12. `/hooks/usePerformance.js`

**Localização:** `/hooks/usePerformance.js`
**Propósito:** Hook que consome o `PerformanceContext` e expõe as métricas de performance para componentes React.

**Funcionalidades:**
- **`usePerformance()`** — Hook que acessa o `PerformanceContext` via `useContext`.
- **Proteção de uso:** Se o contexto for `null` (hook chamado fora de um `PerformanceProvider`), lança erro: `"usePerformance must be used within a PerformanceProvider"`.
- **Exportação:** Apenas named export (`export const usePerformance`), sem `export default`.

---

## 13. `/hooks/useDebounce.js`

**Localização:** `/hooks/useDebounce.js`
**Propósito:** Hook de debounce simples e reutilizável. Retorna o valor atualizado somente após um período de inatividade.

**Funcionalidades:**
- Recebe `value` (qualquer tipo) e `delay` (padrão 300ms).
- Usa `useState` + `useEffect` com `setTimeout`/`clearTimeout`.
- Retorna o valor "debounced", atualizado apenas após o delay sem novas alterações.
- Ideal para campos de busca, filtros e formulários que disparam requisições.

---

## 14. `/hooks/useThrottle.js`

**Localização:** `/hooks/useThrottle.js`
**Propósito:** Hook de throttle reutilizável. Limita a frequência de chamada de uma função, ignorando chamadas dentro do intervalo especificado.

**Funcionalidades:**
- Recebe `fn` (função) e `delay` (padrão 300ms).
- Usa `useRef` para armazenar o timestamp da última execução e `useCallback` para memoizar a função com throttle.
- Diferença de debounce: debounce atrasa a execução; throttle ignora chamadas rápidas consecutivas.
- Utilizado internamente por `useTheme` no `toggleTheme` (300ms) e no handler de `resize` (100ms).

---

## Resumo Consolidado

| Arquivo | Localização | Tipo | Complexidade | Dependências Externas |
|---|---|---|---|---|
| `index.js` | `/hooks/index.js` | Barrel file | Baixa | Nenhuma |
| `AuthContext.js` | `/hooks/AuthContext.js` | Contexto React | Baixa | Nenhuma |
| `AuthProvider.js` | `/hooks/AuthProvider.js` | Provider React | Média | Nenhuma |
| `useAuth.js` | `/hooks/useAuth.js` | Hook de consumo de contexto | Baixa | Nenhuma |
| `useAdminAuth.js` | `/hooks/useAdminAuth.js` | Hook de autenticação admin | Baixa | Nenhuma |
| `useAdminCrud.js` | `/hooks/useAdminCrud.js` | Hook de CRUD completo | Alta | `react-hot-toast` |
| `useApiFetch.js` | `/hooks/useApiFetch.js` | Hook de fetch genérico | Média | Nenhuma |
| `useTheme.js` | `/hooks/useTheme.js` | Hook de tema + tokens | Alta | `pages/styles/tokens`, `useThrottle` |
| `usePerformanceMetrics.js` | `/hooks/usePerformanceMetrics.js` | Hook de performance | Alta | `web-vitals` (dynamic import) |
| `PerformanceContext.js` | `/hooks/PerformanceContext.js` | Contexto React | Baixa | Nenhuma |
| `PerformanceProvider.js` | `/hooks/PerformanceProvider.js` | Provider React | Baixa | `usePerformanceMetrics` |
| `usePerformance.js` | `/hooks/usePerformance.js` | Hook de consumo de contexto | Baixa | Nenhuma |
| `useDebounce.js` | `/hooks/useDebounce.js` | Hook utilitário | Baixa | Nenhuma |
| `useThrottle.js` | `/hooks/useThrottle.js` | Hook utilitário | Baixa | Nenhuma |

### Observações importantes

- **Relação entre hooks:** `useAdminAuth` depende do `AuthContext` (importado de `AuthContext.js`). `useAdminCrud` depende de `useApiFetch`. `useTheme` depende de `useThrottle` e dos tokens de design importados de `pages/styles/tokens`. `PerformanceProvider` depende de `usePerformanceMetrics` para instanciar o monitoramento.
- **Exportações:** O barrel `index.js` exporta `AuthContext` (de `AuthContext.js`), `AuthProvider` (de `AuthProvider.js`) e `useAuth` (de `useAuth.js`) como exports individuais. Também exporta `PerformanceContext`, `PerformanceProvider` e `usePerformance`. Todos os hooks são reexportados diretamente como named exports com a sintaxe `export { Nome } from './arquivo'`, incluindo `usePerformanceMetrics`.
- **Cobertura de uso:** Todos os hooks são exportados via `index.js` e estão disponíveis para consumo. `usePerformance` possui consumidor direto em `pages/_app.js` via `PerformanceMonitor`. `usePerformanceMetrics` é consumido indiretamente via `PerformanceProvider`, que o instancia uma única vez e compartilha as métricas através do `PerformanceContext`. `useTheme` possui anotação `@todo` indicando que atualmente não possui consumidores diretos confirmados na aplicação.
