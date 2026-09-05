# Levantamento Analítico de Melhorias — `/hooks/`

> **Data:** 01/08/2026
> **Objetivo:** Identificar oportunidades de melhoria nos hooks da pasta `/hooks` **sem aplicá-las ao código**.
> **Base:** Análise direta dos arquivos fonte atuais do projeto.

---

## Índice

1. [Correções de Código](#1-correções-de-código)
2. [Ajustes Estruturais e Organizacionais](#2-ajustes-estruturais-e-organizacionais)
3. [Melhorias de Performance e Manutenção](#3-melhorias-de-performance-e-manutenção)
4. [Duplicidades e Redundâncias](#4-duplicidades-e-redundâncias)
5. [Pontos de Atenção Técnica](#5-pontos-de-atenção-técnica)

---

## 1. Correções de Código

### 1.1 — `useApiFetch.js`: inconsistência entre dependência serializada e comparação por referência

**Arquivo:** `/hooks/useApiFetch.js` (linhas 50–56)
**Problema:** O `useEffect` de estabilização de `options` usa `JSON.stringify(options)` como dependência, mas a condição interna compara `optionsRef.current !== options` (comparação por referência). Se o componente pai criar um novo objeto `options` a cada render com o mesmo conteúdo serializado, a dependência `serializedOptions` não muda, o efeito não executa e `optionsRef.current` permanece com a referência antiga. O `fetchData` continuará usando a referência antiga de `options`, mesmo que o conteúdo seja o mesmo. Isso é uma inconsistência lógica que pode causar comportamento inesperado em cenários de re-render com objetos `options` recriados.

**Sugestão:** Alinhar a lógica — ou comparar por referência na dependência (usando `options` diretamente), ou comparar por conteúdo serializado na condição interna (`optionsRef.current !== serializedOptions`).

---

### 1.2 — `useAdminCrud.js`: `handleSubmit` não envia `credentials: 'include'`

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 172–176)
**Problema:** O `handleSubmit` (POST/PUT) faz `fetch(apiEndpoint, { method, headers, body })` **sem** `credentials: 'include'`. Já o `useApiFetch` (usado para a listagem) envia `credentials: 'include'` (linha 99). Essa inconsistência pode causar falhas de autenticação em operações de criação/edição quando a sessão depende de cookies, enquanto a listagem funciona normalmente.

**Sugestão:** Adicionar `credentials: 'include'` ao fetch de `handleSubmit` (e verificar `handleDelete` e `toggleField`).

---

### 1.3 — `useAdminCrud.js`: `AbortController` criado mas não utilizado no `handleDelete`

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 214–220)
**Problema:** O `handleDelete` cria `const abortController = new AbortController()` (linha 214) mas **não** passa `signal: abortController.signal` no fetch do DELETE (linha 216). O `AbortController` é instanciado e descartado sem uso, e o fetch não é cancelável. Isso é código morto e uma oportunidade perdida de cancelamento.

**Sugestão:** Passar `signal: abortController.signal` no fetch do DELETE, ou remover a criação do `AbortController` se o cancelamento não for necessário.

---

### 1.4 — `AuthProvider.js`: `logout` sem `try/catch` pode impedir limpeza do estado

**Arquivo:** `/hooks/AuthProvider.js` (linhas 64–67)
**Problema:** A função `logout` faz `await fetch('/api/auth/logout', ...)` sem `try/catch`. Se o fetch falhar (rede indisponível, servidor fora do ar), a Promise rejeita e `setUser(null)` **não** é executado. O usuário permanece "autenticado" no estado mesmo após tentar sair.

**Sugestão:** Envolver o fetch em `try/catch` e garantir que `setUser(null)` seja executado no `finally`, independentemente do sucesso da requisição.

---

### 1.5 — `useAdminAuth.js`: erro de logout silenciado

**Arquivo:** `/hooks/useAdminAuth.js` (linhas 48–57)
**Problema:** O `handleLogout` captura o erro do `logout` com `try/catch` e apenas registra `console.error('Logout error:', err)`. O erro é silenciado para o consumidor — o callback `onLogoutRedirect` é executado mesmo se o logout falhar no servidor. Isso pode mascarar falhas reais de logout (ex.: token não invalidado no servidor).

**Sugestão:** Considerar repassar o erro ao consumidor (ex.: retornar `{ success: false, error }`) ou executar o `onLogoutRedirect` apenas em caso de sucesso, deixando a decisão para o consumidor.

---

## 2. Ajustes Estruturais e Organizacionais

### 2.1 — `useUnauthorized.js`: padrão incomum de interrupção de fluxo

**Arquivo:** `/hooks/useUnauthorized.js` (linhas 26–28)
**Problema:** A função usa `await new Promise(() => {})` seguido de `throw new Error('Acesso não autorizado')`. Como a Promise nunca resolve, o `throw` é **inalcançável** — o código após o `await` nunca executa. O comportamento é intencional (interromper o fluxo), mas o `throw` é código morto e o padrão pode confundir leitores.

**Sugestão:** Remover o `throw` inalcançável e documentar claramente que a função interrompe o fluxo via `await new Promise(() => {})` (ou usar um padrão mais explícito, como retornar uma Promise que nunca resolve).

---

### 2.2 — `index.js`: barrel não exporta hooks de uso interno

**Arquivo:** `/hooks/index.js`
**Problema:** O barrel exporta apenas 5 hooks (`PerformanceProvider`, `usePerformance`, `useApiFetch`, `useDebounce`, `useAdminAuth`). Hooks como `useAdminCrud`, `useUnauthorized`, `AuthProvider`, `AuthContext`, `PerformanceContext` e `usePerformanceMetrics` são importados diretamente pelos consumidores. Isso é intencional (evita poluição do barrel), mas cria dois padrões de importação no projeto: via barrel e via path direto.

**Sugestão:** Documentar claramente a política de exportação do barrel (quais hooks devem ser exportados e quais devem ser importados diretamente) para manter consistência futura.

---

## 3. Melhorias de Performance e Manutenção

### 3.1 — `useApiFetch.js`: ausência de `AbortController` para cancelar fetches

**Arquivo:** `/hooks/useApiFetch.js`
**Problema:** O `fetchData` não usa `AbortController`. Quando o componente desmonta ou a URL muda rapidamente (ex.: busca com debounce), fetches anteriores continuam em andamento e podem atualizar o estado de um componente desmontado (causando warnings do React) ou sobrescrever dados mais recentes com respostas atrasadas.

**Sugestão:** Criar um `AbortController` por execução de `fetchData`, abortar no cleanup do `useEffect` e tratar `AbortError` silenciosamente (como já é feito em `AuthProvider.js`).

---

### 3.2 — `usePerformanceMetrics.js`: `getMetrics` sem dependências no `useCallback`

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 193–199)
**Problema:** A função `getMetrics` é envolvida em `useCallback` **sem array de dependências**. Isso significa que uma nova referência de função é criada a cada render, anulando o propósito do `useCallback`. O `PerformanceProvider` (que memoiza o valor do contexto com `useMemo`) depende de `getMetrics` como dependência — a referência instável pode causar re-renders desnecessários do provider.

**Sugestão:** Adicionar `[]` como array de dependências do `useCallback` de `getMetrics` (a função não depende de props/state, apenas de `metricsStore` que é um ref estável).

---

### 3.3 — `usePerformanceMetrics.js`: `sendBeacon` sem verificação de retorno

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 174–175)
**Problema:** O `navigator.sendBeacon` retorna `true` se o dado foi enfileirado com sucesso e `false` caso contrário. O código não verifica o retorno — se `sendBeacon` falhar (ex.: payload muito grande, quota excedida), a métrica é silenciosamente perdida sem fallback para `fetch`.

**Sugestão:** Verificar o retorno de `sendBeacon` e, se `false`, fazer fallback para `fetch` com `keepalive` (que já está implementado no `else`).

---

### 3.4 — `AuthProvider.js`: `refreshSession` sem `AbortController` no retry

**Arquivo:** `/hooks/AuthProvider.js` (linhas 80–88)
**Problema:** No `checkAuth`, quando o status é 401, o código chama `refreshSession()` e depois refaz `GET /api/auth/check` com `signal: abortController.signal`. Porém, o `refreshSession()` em si não recebe o `signal` — se o componente desmontar durante a renovação, a requisição de refresh continua em andamento.

**Sugestão:** Passar o `signal` do `AbortController` para o `refreshSession()` também, garantindo cancelamento completo no desmonte.

---

## 4. Duplicidades e Redundâncias

### 4.1 — Padrão de Contexto duplicado entre `AuthContext.js` e `PerformanceContext.js`

**Arquivos:** `/hooks/AuthContext.js`, `/hooks/PerformanceContext.js`
**Problema:** Ambos os arquivos seguem exatamente o mesmo padrão: `createContext` + `@typedef` JSDoc. A duplicidade é estrutural e aceitável (cada contexto tem seu propósito), mas a documentação JSDoc (`@typedef`) é repetida em `AuthContext.js`, `PerformanceContext.js`, `usePerformanceMetrics.js` e `PerformanceProvider.js` (o `PerformanceContextValue` é definido em 3 lugares).

**Sugestão:** Considerar centralizar os `@typedef` em um único arquivo de tipos (ex.: `hooks/types.js`) e importá-los nos arquivos que os usam, reduzindo a manutenção de documentação duplicada.

---

### 4.2 — Lógica de fetch de escrita duplicada em `useAdminCrud.js`

**Arquivo:** `/hooks/useAdminCrud.js`
**Problema:** O `handleSubmit`, `handleDelete` e `toggleField` implementam cada um sua própria lógica de `fetch` + tratamento de erro + toast. Embora cada operação tenha particularidades (método, corpo, callbacks), o padrão de `fetch` + `response.ok` + `toast` + `refetch` é repetido 3 vezes. O `useApiFetch` é usado apenas para a listagem (GET).

**Sugestão:** Avaliar se uma abstração de "mutação" (ex.: `useMutation` ou uma função helper interna) poderia unificar o tratamento de erro/toast/refetch das operações de escrita, reduzindo a repetição. **Nota:** Isso é uma sugestão de arquitetura — a implementação atual é funcional e correta.

---

## 5. Pontos de Atenção Técnica

### 5.1 — `useAdminCrud.js`: `handleSubmit` e `handleDelete` sem `credentials: 'include'`

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 172, 216, 254)
**Ponto de atenção:** Conforme detalhado na seção 1.2, as operações de escrita (POST/PUT/DELETE) não enviam `credentials: 'include'`, enquanto a listagem (via `useApiFetch`) envia. Se o backend depender de cookies de sessão para autorização, as operações de escrita podem falhar com 401 em produção, mesmo com a listagem funcionando. **Recomenda-se verificar o comportamento real em produção antes de considerar correção.**

---

### 5.2 — `usePerformanceMetrics.js`: `WEB_VITAL_METRICS` e `THRESHOLDS` como constantes de módulo

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 39–59)
**Ponto de atenção:** As constantes `WEB_VITAL_METRICS` e `THRESHOLDS` são definidas no escopo do módulo e retornadas pelo hook. Como são objetos mutáveis, um consumidor poderia alterá-las acidentalmente, afetando o comportamento global do hook (ex.: modificar `THRESHOLDS.LCP.good`). Considerar congelar os objetos (`Object.freeze`) ou retornar cópias.

---

### 5.3 — `usePerformanceMetrics.js`: `reportMetric` com `onReport` instável

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 104–190)
**Ponto de atenção:** O `reportMetric` é memoizado com `useCallback` dependendo de `onReport`, `reportToAnalytics`, `analyticsEndpoint` e `debug`. Se o consumidor passar um `onReport` inline (nova referência a cada render), o `reportMetric` será recriado, o que pode re-registrar os `PerformanceObserver` no `useEffect` (que depende de `reportMetric`). Isso pode causar observers duplicados em cenários de re-render frequente.

**Sugestão:** Considerar usar um `useRef` para `onReport` (estabilizando a referência) ou documentar que `onReport` deve ser memoizado pelo consumidor.

---

### 5.4 — `useUnauthorized.js`: dependência de `router.reload()`

**Arquivo:** `/hooks/useUnauthorized.js` (linha 25)
**Ponto de atenção:** O hook depende de `router.reload()` do Next.js para redirecionar ao login. Isso acopla o hook ao Next.js. Se o projeto migrar de framework ou precisar de uma abordagem diferente (ex.: redirect via `window.location`), o hook precisará ser revisto. A assinatura atual (`router` como parâmetro) já reduz o acoplamento, mas a implementação interna é específica do Next.js.

---

### 5.5 — `useApiFetch.js`: `staleTime` e `lastFetchRef` não resetados em `setData`

**Arquivo:** `/hooks/useApiFetch.js` (linhas 92, 132)
**Ponto de atenção:** Quando `setData` é chamado manualmente (atualização otimista), o `lastFetchRef.current` não é atualizado. Se `staleTime` estiver configurado, um fetch subsequente pode ser pulado incorretamente (considerando dados "frescos" quando na verdade foram definidos manualmente). O comportamento depende do caso de uso, mas merece atenção.

---

## Implementações Aplicadas

### `usePerformanceMetrics.js` — janela de cold start no report de recursos lentos

**Arquivo:** `/hooks/usePerformanceMetrics.js` (`resourceObserver`)

**Descrição:** Adicionada a constante `COLD_START_GRACE_MS` (15s). Recursos iniciados dentro dessa janela (comparação `entry.startTime >= coldStartEnd`) têm o `console.warn` `[Performance] Slow resource` suprimido em desenvolvimento (`debug`), pois a compilação sob demanda do Turbopack e o pool/Redis frios podem ultrapassar 1s no primeiro carregamento sem indicar lentidão real. Em produção (`debug=false`) o comportamento sem logs permanece inalterado, e o alerta continua ativo para recursos iniciados após a janela.

---

## Resumo das Ocorrências

| Categoria | Total | Arquivos Afetados |
|---|---|---|
| Correções de código | 5 | `useApiFetch.js`, `useAdminCrud.js` (2), `AuthProvider.js`, `useAdminAuth.js` |
| Ajustes estruturais | 2 | `useUnauthorized.js`, `index.js` |
| Melhorias de performance | 4 | `useApiFetch.js`, `usePerformanceMetrics.js` (2), `AuthProvider.js` |
| Duplicidades | 2 | `AuthContext.js`/`PerformanceContext.js`, `useAdminCrud.js` |
| Pontos de atenção | 5 | `useAdminCrud.js`, `usePerformanceMetrics.js` (2), `useUnauthorized.js`, `useApiFetch.js` |

> **Nota:** Este documento é um levantamento analítico. As sugestões das seções acima são recomendações para avaliação antes de qualquer implementação; a seção "Implementações Aplicadas" registra as implementações realizadas após a elaboração deste relatório.