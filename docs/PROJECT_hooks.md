# Análise dos Hooks — `/hooks/`

> **Data:** 28/06/2026
> **Objetivo:** Documentar a finalidade, localização e funcionamento de cada hook presente na pasta `/hooks`.
> **Base:** Análise direta dos arquivos fonte atuais do projeto.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [`/hooks/index.js`](#1-hooksindexjs) — Barrel de exportações
3. [`/hooks/useAuth.js`](#2-hooksuseauthjs) — Autenticação global (Context + Provider)
4. [`/hooks/useAdminAuth.js`](#3-hooksuseadminauthjs) — Autenticação para área administrativa
5. [`/hooks/useAdminCrud.js`](#4-hooksuseadmincrudjs) — Operações CRUD em painéis admin
6. [`/hooks/useApiFetch.js`](#5-hooksuseapifetchjs) — Fetch genérico com estados loading/error
7. [`/hooks/useTheme.js`](#6-hooksusethemejs) — Gerenciamento de tema e tokens de design
8. [`/hooks/usePerformanceMetrics.js`](#7-hooksuseperformancemetricsjs) — Core Web Vitals e performance
9. [`/hooks/useDebounce.js`](#8-hooksusedebouncejs) — Debounce utilitário
10. [`/hooks/useThrottle.js`](#9-hooksusethrottlejs) — Throttle utilitário
11. [Resumo Consolidado](#resumo-consolidado)

---

## Visão Geral

A pasta `/hooks` contém **9 arquivos** que implementam custom hooks React. Não há subpastas. Os hooks dividem-se em três categorias:

| Categoria | Hooks | Descrição |
|---|---|---|
| **Autenticação** | `useAuth`, `useAdminAuth` | Gerenciamento de sessão, login/logout e controle de acesso administrativo |
| **Infraestrutura / Utilitários** | `useApiFetch`, `useDebounce`, `useThrottle`, `useAdminCrud` | Abstrações reutilizáveis para fetch, debounce, throttle e operações CRUD completas |
| **Design & Performance** | `useTheme`, `usePerformanceMetrics` | Gerenciamento de tema (light/dark) com tokens de design e monitoramento de Core Web Vitals |

---

## 1. `/hooks/index.js`

**Localização:** `/hooks/index.js`
**Propósito:** Arquivo de barreira (barrel file) que centraliza e reexporta todos os hooks do diretório, servindo como ponto único de importação.

**Funcionalidades:**
- Reexporta hooks nomeados: `useTheme`, `useAuth`, `useAdminCrud`, `usePerformanceMetrics`, `useApiFetch`, `useDebounce`, `useThrottle`, `useAdminAuth`.
- Exporta também `AuthContext` e `AuthProvider` (definidos em `useAuth.js`), permitindo que consumidores importem tudo de um único local.
- A reexportação de `usePerformanceMetrics` é feita com `export { default as usePerformanceMetrics }`, ou seja, o arquivo fonte (`usePerformanceMetrics.js`) usa `export default function` e o barrel reexporta esse default como um **named export**. Os demais hooks são reexportados diretamente como named exports.

---

## 2. `/hooks/useAuth.js`

**Localização:** `/hooks/useAuth.js`
**Propósito:** Contexto e hook de autenticação global para a aplicação. Gerencia estado do usuário, verificação de sessão e operações de login/logout.

**Funcionalidades:**
- **`AuthContext`** — Contexto React com valor padrão (`user: null`, `loading: true`, funções vazias) para evitar erros de consumo fora do Provider.
- **`AuthProvider`** — Componente provider que:
  - Na montagem, realiza `GET /api/auth/check` com `credentials: 'include'` para verificar sessão existente.
  - Usa `AbortController` para cancelar a verificação de sessão no desmonte do componente.
  - `login(username, password)`: Envia `POST /api/auth/login` com JSON e `credentials: 'include'`. Retorna `{ success, error }`.
  - `logout()`: Envia `POST /api/auth/logout` com `credentials: 'include'` e limpa o estado do usuário.
  - Possui `loginLoading` separado de `loading` para evitar flicker visual durante operações de login.
  - Usa `loginAbortRef` (`useRef`) com `AbortController` para abortar requisições de login anteriores se uma nova for disparada.
- **`useAuth()`** — Hook que consome o `AuthContext` e expõe `user`, `isAuthenticated`, `loading`, `loginLoading`, `login`, `logout`.
- **Tratamento de erros:** `AbortError` é tratado silenciosamente. Erros de rede são convertidos em mensagem amigável. Erros da API são extraídos do corpo JSON da resposta.

---

## 3. `/hooks/useAdminAuth.js`

**Localização:** `/hooks/useAdminAuth.js`
**Propósito:** Hook de autenticação específico para a área administrativa. Consome o `AuthContext` de `useAuth.js` e estende com funcionalidades de redirect e estados isolados de loading/erro para o login.

**Funcionalidades:**
- **Base:** Consome `AuthContext` importando `isAuthenticated`, `loading` (renomeado para `isChecking`), `login` e `logout`.
- **`handleLogin(username, password)`:** Encapsula a função `login` do contexto com estados próprios de `loginLoading` e `loginError`, isolando o componente de erros externos.
- **`handleLogout()`:** Executa `logout` do contexto com `try/catch` e redireciona para `/admin` via `router.push` do Next.js.
- **Retorno:** Expõe `isAuthenticated`, `isChecking`, `handleLogin`, `handleLogout`, `loginLoading`, `loginError`.

---

## 4. `/hooks/useAdminCrud.js`

**Localização:** `/hooks/useAdminCrud.js`
**Propósito:** Hook reutilizável que centraliza operações CRUD completas para painéis administrativos: listagem, criação, edição, exclusão, paginação e toggle de campos booleanos.

**Funcionalidades:**
- **Configuração (`AdminCrudConfig`):** Recebe `apiEndpoint`, `initialFormData`, `usePagination` (padrão `false`), `itemsPerPage` (padrão 10), `autoFetch` (padrão `true`), `onSuccess`, `onError`.
- **Listagem:** Usa `useApiFetch` internamente, construindo a URL dinamicamente com parâmetros de paginação via `buildUrl(page)`. A paginação é reativa: quando `currentPage` muda, o `useApiFetch` refaz o fetch automaticamente.
- **Formulário:** Gerencia estado `formData` com `handleInputChange` (para inputs nativos com `name`, `type`, `checked`) e `setFieldValue` (para definição programática).
- **`handleSubmit(e, customValidator?)`:** Envia `POST` (criação) ou `PUT` (edição) conforme `isEditing`. Suporta validação customizada via função opcional `customValidator` que lança `Error` se a validação falhar. Usa `react-hot-toast` para feedback visual (toast de loading, sucesso e erro).
- **`handleDelete(id)`:** Exibe `window.confirm`, envia `DELETE` com `{ id }` no corpo JSON, atualiza a lista via `refetch`.
- **`toggleField(item, key, currentValue)`:** Alterna campo booleano enviando apenas `{ id, [key]: newValue }` via `PUT`. Usa `react-hot-toast` e chama `refetch()` após sucesso para sincronizar com o servidor.
- **Paginação:** `goToPage(page)` navega respeitando limites (`totalPages`). `currentPage` e `totalPages` são extraídos automaticamente dos dados paginados da API.
- **`refetch()`:** Exposto diretamente do `useApiFetch` para recarga manual da listagem.

---

## 5. `/hooks/useApiFetch.js`

**Localização:** `/hooks/useApiFetch.js`
**Propósito:** Hook genérico para requisições HTTP com gerenciamento centralizado de estados `loading`/`error`, cache simples e suporte a transformação de dados.

**Funcionalidades:**
- **Configuração (`ApiFetchOptions`):** Aceita `url`, `options` (opções do fetch nativo), `deps` (dependências extras), `transform` (função de transformação), `initialData` (valor inicial), `staleTime` (cache em ms), `onError` (callback).
- **Estabilização de options:** Usa `optionsRef` (`useRef`) e um estado `optionsKey` (contador) que é incrementado via `useEffect` quando o conteúdo serializado de `options` muda. Isso evita que o `fetchData` seja recriado a cada render por mudanças de referência em `options`.
- **`fetchData()`:** Função memoizada via `useCallback` que:
  - Executa `fetch(url, options)`.
  - Trata HTTP 304 como resposta sem corpo (não lança erro).
  - Extrai mensagem de erro do corpo JSON da resposta quando o status não é ok.
  - Aplica `transform` se fornecida.
  - Retorna `{ data, loading, error, refetch, setData }`.
- **Cache simples (`staleTime`):** Se configurado, compara o timestamp do último fetch com o tempo decorrido. Se estiver dentro do período fresco, pula a requisição e mantém os dados em cache.
- **`setData`:** Função exposta para definir dados manualmente (útil para atualizações otimistas fora do hook).

---

## 6. `/hooks/useTheme.js`

**Localização:** `/hooks/useTheme.js`
**Propósito:** Hook principal para gerenciamento de tema (light/dark) e acesso centralizado a todos os tokens de design do sistema (cores, espaçamentos, tipografia, bordas, sombras, breakpoints, animações).

**Funcionalidades:**
- **Estado inicial e hidratação SSR:** Mantém `theme` ("light" | "dark") e `mounted` (flag de hidratação). Na montagem, lê `localStorage('theme')` e, se não existir, respeita `prefers-color-scheme: dark` do sistema.
- **Aplicação do tema:** Sincroniza `data-theme` no `<html>`, classe `.dark`, `localStorage` e dispara evento customizado `themeChange` no `window` para código fora do React.
- **`toggleTheme`:** Alterna entre light/dark com throttle de 300ms via hook `useThrottle`, prevenindo múltiplas trocas rápidas.
- **`setTheme`:** Exposto diretamente para definir tema específico.
- **Responsividade:** Monitora `window.innerWidth` via event listener `resize`. Fornece booleanos reativos `isMobile`, `isTablet` e `isDesktop` baseados nos breakpoints `md` e `lg` dos tokens.
- **Helpers de acesso a tokens (todos memoizados com `useCallback`):**
  - `getColor(path, alpha)` — Navega por `tokens.colors` com notação dot-path. Suporta opacidade via função `hexToRgba` (função utilitária pura definida **fora do hook**, testável e reutilizável independentemente). Exibe `console.warn` em desenvolvimento se o token não existir.
  - `getSpacing(key)` — Busca em `tokens.spacing.space` com fallback `tokens.spacing.spacing`. Retorna `null` se não encontrado.
  - `getFontSize(key)` — Busca em `tokens.typography.fontSize`. Retorna `null` se não encontrado.
  - `getShadow(key)` — Busca em `tokens.shadows.shadows` com fallback `tokens.shadows.shadow`. Retorna `null` se não encontrado.
  - `getRadius(key)` — Busca em `tokens.borders.radius` com fallback `tokens.borders.borderRadius`. Retorna `null` se não encontrado.
  - `getBreakpoint(key)` — Busca em `tokens.breakpoints.breakpoints`. Retorna `undefined` se não encontrado (sem fallback).
- **Performance:** O valor de retorno completo é memoizado com `useMemo` e dependências explícitas.

---

## 7. `/hooks/usePerformanceMetrics.js`

**Localização:** `/hooks/usePerformanceMetrics.js`
**Propósito:** Hook avançado para monitoramento de Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB) e métricas adicionais de performance (TBT, recursos lentos).

**Funcionalidades:**
- **Biblioteca externa:** Importa dinamicamente `web-vitals` com promessa cacheada em nível de módulo (`const webVitalsPromise = import('web-vitals')`), executada apenas uma vez.
- **Métricas suportadas (`WEB_VITAL_METRICS`):** LCP, FID, CLS, INP, FCP, TTFB, TBT, MPFID.
- **Thresholds (`THRESHOLDS`):** Valores de classificação Google (`good` / `poor`) para cada métrica, com unidades (`ms` ou vazio para CLS).
- **`reportMetric(metric)`:** Função callback que:
  - Aplica cache de 1 minuto (`METRICS_CACHE_MS`) para evitar reports duplicados da mesma métrica com o mesmo valor.
  - Armazena no histórico local (máx. 50 entradas, com campos essenciais).
  - Mantém métrica atual com contexto completo (`url`, `userAgent`, `connection`, `deviceMemory`).
  - Envia para analytics via `navigator.sendBeacon` (preferencial) ou `fetch` com `keepalive`.
  - Exibe logs de debug em desenvolvimento.
- **PerformanceObserver:** Monitora `longtask` (para TBT) e `resource` (para recursos com duração > 1s). Os observers são desconectados no cleanup para evitar vazamentos.
- **Funções auxiliares exportadas:**
  - `getRating(name, value)` — Classifica como `good`, `needs-improvement` ou `poor`.
  - `formatMetric(name, value)` — Formata valor (ms arredondado, CLS com 3 casas decimais).
- **`getMetrics()`:** Retorna métricas atuais e sumário do histórico.

---

## 8. `/hooks/useDebounce.js`

**Localização:** `/hooks/useDebounce.js`
**Propósito:** Hook de debounce simples e reutilizável. Retorna o valor atualizado somente após um período de inatividade.

**Funcionalidades:**
- Recebe `value` (qualquer tipo) e `delay` (padrão 300ms).
- Usa `useState` + `useEffect` com `setTimeout`/`clearTimeout`.
- Retorna o valor "debounced", atualizado apenas após o delay sem novas alterações.
- Ideal para campos de busca, filtros e formulários que disparam requisições.

---

## 9. `/hooks/useThrottle.js`

**Localização:** `/hooks/useThrottle.js`
**Propósito:** Hook de throttle reutilizável. Limita a frequência de chamada de uma função, ignorando chamadas dentro do intervalo especificado.

**Funcionalidades:**
- Recebe `fn` (função) e `delay` (padrão 300ms).
- Usa `useRef` para armazenar o timestamp da última execução e `useCallback` para memoizar a função com throttle.
- Diferença de debounce: debounce atrasa a execução; throttle ignora chamadas rápidas consecutivas.
- Utilizado internamente por `useTheme` no `toggleTheme`.

---

## Resumo Consolidado

| Arquivo | Localização | Tipo | Complexidade | Dependências Externas |
|---|---|---|---|---|
| `index.js` | `/hooks/index.js` | Barrel file | Baixa | Nenhuma |
| `useAuth.js` | `/hooks/useAuth.js` | Context + Provider + Hook | Média | Nenhuma |
| `useAdminAuth.js` | `/hooks/useAdminAuth.js` | Hook de autenticação admin | Baixa | `next/router` |
| `useAdminCrud.js` | `/hooks/useAdminCrud.js` | Hook de CRUD completo | Alta | `react-hot-toast` |
| `useApiFetch.js` | `/hooks/useApiFetch.js` | Hook de fetch genérico | Média | Nenhuma |
| `useTheme.js` | `/hooks/useTheme.js` | Hook de tema + tokens | Alta | `pages/styles/tokens`, `useThrottle` |
| `usePerformanceMetrics.js` | `/hooks/usePerformanceMetrics.js` | Hook de performance | Alta | `web-vitals` (dynamic import) |
| `useDebounce.js` | `/hooks/useDebounce.js` | Hook utilitário | Baixa | Nenhuma |
| `useThrottle.js` | `/hooks/useThrottle.js` | Hook utilitário | Baixa | Nenhuma |

### Observações importantes

- **Relação entre hooks:** `useAdminAuth` depende do `AuthContext` provido por `useAuth`. `useAdminCrud` depende de `useApiFetch`. `useTheme` depende de `useThrottle` e dos tokens de design importados de `pages/styles/tokens`.
- **Exportações:** O barrel `index.js` exporta `AuthContext` e `AuthProvider` além dos hooks. `usePerformanceMetrics` é reexportado do default do fonte como named export (`export { default as usePerformanceMetrics }`), enquanto os demais hooks são reexportados diretamente como named exports.
- **Cobertura de uso:** Todos os hooks são exportados via `index.js` e estão disponíveis para consumo, porém `useTheme` e `usePerformanceMetrics` possuem anotações `@todo` indicando que atualmente não possuem consumidores diretos confirmados na aplicação.