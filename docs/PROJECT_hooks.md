# Análise dos Hooks — `/hooks/`

> **Data:** 10/05/2026
> **Objetivo:** Documentar a finalidade, localização e funcionamento de cada hook presente na pasta `/hooks`.

---

## Índice

1. [`/hooks/index.js`](#1-hooksindexjs)
2. [`/hooks/useTheme.js`](#2-hooksusethemejs)
3. [`/hooks/useAuth.js`](#3-hooksuseauthjs)
4. [`/hooks/useAdminAuth.js`](#4-hooksuseadminauthjs)
5. [`/hooks/useAdminCrud.js`](#5-hooksuseadmincrudjs)
6. [`/hooks/useApiFetch.js`](#6-hooksuseapifetchjs)
7. [`/hooks/useDebounce.js`](#7-hooksusedebouncejs)
8. [`/hooks/useThrottle.js`](#8-hooksusethrottlejs)
9. [`/hooks/usePerformanceMetrics.js`](#9-hooksuseperformancemetricsjs)

---

## 1. `/hooks/index.js`

**Propósito:** Arquivo de barreira (barrel file) que centraliza e reexporta todos os hooks do diretório. Serve como ponto único de importação para consumidores externos.

**Funcionamento:**
- Reexporta hooks nomeados: `useTheme`, `useAuth`, `useAdminCrud`, `usePerformanceMetrics`, `useApiFetch`, `useDebounce`, `useThrottle`, `useAdminAuth`.
- Também exporta `AuthContext` e `AuthProvider` (definidos em `useAuth.js`).
- Possui reexportação descrita como "Design System", indicando que estes hooks são parte integrante de um sistema de design.
- **Nota:** As reexportações padrão com sufixo `Default` foram removidas para eliminar duplicidade na API pública.

---

## 2. `/hooks/useTheme.js`

**Propósito:** Hook principal para gerenciamento de tema (light/dark) e acesso centralizado aos tokens de design do sistema. Fornece utilitários de leitura de cores, espaçamentos, tipografia, bordas, sombras, breakpoints e animações.

**Funcionamento:**
- **Estado:** Mantém `theme` ("light" | "dark") e `mounted` (indicador de hidratação SSR).
- **Inicialização:** Na montagem, lê `localStorage('theme')`. Se não existir, respeita `prefers-color-scheme: dark` do sistema.
- **Aplicação do tema:** Sincroniza `data-theme` no `<html>`, classe `.dark`, `localStorage` e dispara evento customizado `themeChange` no `window`.
- **toggleTheme:** Alterna entre light/dark com throttle de 300ms via hook `useThrottle` para evitar múltiplas trocas rápidas.
- **Helpers de tokens:**
  - `getColor(path, alpha)` — Navega por `tokens.colors` usando notação dot-path, com suporte a opacidade via `hexToRgba`.
  - `getSpacing(key)` — Busca em `tokens.spacing.space` e fallback `tokens.spacing.spacing`.
  - `getFontSize(key)` — Busca em `tokens.typography.fontSize`.
  - `getShadow(key)` — Busca em `tokens.shadows.shadows` e fallback `tokens.shadows.shadow`.
  - `getRadius(key)` — Busca em `tokens.borders.radius` e fallback `tokens.borders.borderRadius`.
  - `getBreakpoint(key)` — Busca em `tokens.breakpoints.breakpoints`.
  - `isMobile()`, `isTablet()`, `isDesktop()` — Verificações síncronas de viewport.
- **Performance:** Todo o retorno é memoizado com `useMemo` e dependências explícitas.
- **Warnings em desenvolvimento:** Exibe `console.warn` quando tokens não são encontrados.
- **Dependências:** `pages/styles/tokens`, `useThrottle`.

---

## 3. `/hooks/useAuth.js`

**Propósito:** Hook e Contexto de autenticação global para componentes React. Gerencia estado do usuário, sessão e operações de login/logout.

**Funcionamento:**
- **AuthContext:** Contexto com valor padrão (`user: null`, `loading: true`, funções vazias).
- **AuthProvider:**
  - Ao montar, faz `GET /api/auth/check` para verificar sessão. Usa `AbortController` para cancelamento e `credentials: 'include'`.
  - `login(username, password)`: `POST /api/auth/login` com `credentials: 'include'`. Retorna `{ success, error }`.
  - `logout()`: `POST /api/auth/logout` com `credentials: 'include'`. Limpa estado do usuário.
- **useAuth():** Consome o contexto e expõe `user`, `isAuthenticated`, `loading`, `login`, `logout`.
- **Tratamento de erros:** Lida com `AbortError` silenciosamente. Converte erros de rede em mensagem amigável.

---

## 4. `/hooks/useAdminAuth.js`

**Propósito:** Hook de autenticação específico para a área administrativa. Consome o `AuthContext` de `useAuth.js` e estende com funcionalidades de redirect e estados isolados de loading/erro.

**Funcionamento:**
- **Base de autenticação:** Consome `AuthContext` de `useAuth.js`, herdando a verificação de sessão, login e logout. Não reimplementa chamadas de API.
- **handleLogin:** Encapsula a função `login` do `AuthContext` com estados isolados de `loginLoading` e `loginError`.
- **handleLogout:** Encapsula a função `logout` do `AuthContext` e redireciona para `/admin` via `router.push`.
- **Estado exposto:** `isAuthenticated` (via contexto), `isChecking` (alias para `loading` do contexto), `handleLogin`, `handleLogout`, `loginLoading`, `loginError`.
- **Dependências:** `next/router` (para redirect pós-logout).

---

## 5. `/hooks/useAdminCrud.js`

**Propósito:** Hook reutilizável para operações CRUD em painéis administrativos. Centraliza fetch, criação, edição, exclusão, paginação e estado de formulário.

**Funcionamento:**
- **Configuração:** Recebe `apiEndpoint`, `initialFormData`, `usePagination`, `itemsPerPage`, `autoFetch`, `onSuccess`, `onError`.
- **Estado:** `items`, `loading`, `error`, `formData`, `isEditing`, `currentPage`, `totalPages`.
- **Fetch inicial:** Executa na montagem (se `autoFetch: true`) via chamada a `fetchItems(1)`. O cancelamento é gerenciado pelo `AbortController` em `fetchItemsFromAPI`.
- **handleSubmit:** Envia POST (criação) ou PUT (edição) conforme `isEditing`. Usa `react-hot-toast` para feedback. Suporta validador customizado `customValidator`.
- **handleDelete:** Confirma com `window.confirm`, envia DELETE, atualiza lista.
- **goToPage:** Navega para página específica, respeitando `totalPages`.
- **Função pura:** `fetchItemsFromAPI` é separada do hook para ser testável independentemente.

---

## 6. `/hooks/useApiFetch.js`

**Propósito:** Hook genérico para requisições fetch com estados de loading/error. Centraliza o padrão `useState + useEffect + fetch` para eliminar repetição.

**Funcionamento:**
- **Configuração:** Aceita `url`, `options`, `deps`, `transform`, `initialData`, `staleTime`, `onError`.
- **Estabilização de options:** Usa `optionsRef` + `depsKeyRef` para comparar serializações e evitar recriação desnecessária da função `fetchData` (substitui `JSON.stringify(options)` direto na dependência).
- **fetchData:** Função memoizada via `useCallback`. Lida com códigos HTTP (inclusive 304), extrai mensagens de erro do corpo da resposta, aplica função `transform` se fornecida.
- **Cache simples (staleTime):** Se `staleTime` é definido e passou menos tempo que o configurado desde o último fetch, pula a requisição.
- **Dependências:** Inclui `url`, `depsKeyRef.current` e `deps` fornecidas pelo usuário.
- **Retorno:** `{ data, loading, error, refetch, setData }`.

---

## 7. `/hooks/useDebounce.js`

**Propósito:** Hook de debounce simples e reutilizável. Aguarda um período de inatividade antes de atualizar o valor retornado.

**Funcionamento:**
- Recebe `value` (qualquer tipo) e `delay` (default 300ms).
- Internamente usa `useState` + `useEffect` com `setTimeout`/`clearTimeout`.
- Retorna o valor "debounced", que só é atualizado após o delay sem novas alterações.
- Útil para campos de busca, filtros e formulários que disparam requisições.

---

## 8. `/hooks/useThrottle.js`

**Propósito:** Hook de throttle reutilizável. Limita a frequência de chamada de uma função, ignorando chamadas que ocorrerem dentro do intervalo especificado.

**Funcionamento:**
- Recebe `fn` (função a ser throttled) e `delay` (default 300ms).
- Internamente usa `useRef` para armazenar timestamp da última chamada e `useCallback` para memoizar a função com throttle.
- Diferença de debounce: debounce atrasa a execução, throttle ignora chamadas rápidas consecutivas.
- Útil para eventos de clique, scroll, resize e toggle de tema.

---

## 9. `/hooks/usePerformanceMetrics.js`

**Propósito:** Hook avançado para monitoramento de Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB, TBT) e métricas de performance adicionais.

**Funcionamento:**
- **Biblioteca externa:** Importa dinamicamente `web-vitals` para registrar callbacks das métricas oficiais.
- **PerformanceObserver:** Monitora `longtask` (para TBT) e `resource` (para recursos lentos > 1s). Os observers são desconectados explicitamente no cleanup para evitar vazamentos.
- **Cache de métricas:** Evita reportar a mesma métrica em menos de 1 minuto (`METRICS_CACHE_MS`).
- **Histórico limitado:** Armazena até 50 entradas no histórico (`MAX_HISTORY_SIZE`).
- **Envio para analytics:** Usa `navigator.sendBeacon` (preferencial) ou `fetch` com `keepalive`.
- **Funções auxiliares:**
  - `getRating(name, value)` — Classifica como `good`, `needs-improvement`, `poor`.
  - `formatMetric(name, value)` — Formata valor (ms arredondado, CLS com 3 casas).
- **Funções exportadas standalone:**
  - `reportWebVitals(metric)` — Função para uso direto em `_app.js` ou `_document.js`.
  - `detectPerformanceIssues()` — Detecta pressão de memória, long tasks e conexão lenta.
- **Debug:** Em desenvolvimento, logs detalhados no console.

---

## Resumo Geral

| Arquivo | Localização | Tipo | Complexidade | Dependências Externas |
|---|---|---|---|---|
| `index.js` | `/hooks/index.js` | Barrel | Baixa | Nenhuma |
| `useTheme.js` | `/hooks/useTheme.js` | Hook de estado + tokens | Alta | `pages/styles/tokens`, `useThrottle` |
| `useAuth.js` | `/hooks/useAuth.js` | Context + Hook | Média | Nenhuma |
| `useAdminAuth.js` | `/hooks/useAdminAuth.js` | Hook de autenticação | Média | `next/router` |
| `useAdminCrud.js` | `/hooks/useAdminCrud.js` | Hook de CRUD | Alta | `react-hot-toast` |
| `useApiFetch.js` | `/hooks/useApiFetch.js` | Hook de fetch | Média | Nenhuma |
| `useDebounce.js` | `/hooks/useDebounce.js` | Hook utilitário | Baixa | Nenhuma |
| `useThrottle.js` | `/hooks/useThrottle.js` | Hook utilitário | Baixa | Nenhuma |
| `usePerformanceMetrics.js` | `/hooks/usePerformanceMetrics.js` | Hook de performance | Alta | `web-vitals` (dynamic import) |