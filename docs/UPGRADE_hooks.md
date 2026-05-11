# Relatório de Melhorias — `/hooks/`

> **Data:** 10/05/2026
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

**Arquivo:** `/hooks/index.js`

**Problema:** Cada hook era reexportado duas vezes: uma como exportação nomeada e outra como exportação padrão com sufixo `Default`. Isso poluía a API pública e podia confundir consumidores.

**Exemplo (antes):**
```js
export { useTheme } from './useTheme';
export { default as useThemeDefault } from './useTheme';
// Mesmo padrão para useAuth, useApiFetch, useDebounce, useAdminAuth
```

**Solução aplicada:** Removidas as reexportações com sufixo `Default`. Mantidas apenas as exportações nomeadas.

---

### 1.2 `/hooks/useAuth.js` vs `/hooks/useAdminAuth.js` — Autenticação Duplicada ✅ CORRIGIDO

**Arquivos:** `/hooks/useAuth.js` e `/hooks/useAdminAuth.js`

**Problema:** Lógica de autenticação duplicada com sobreposição significativa:

| Funcionalidade | `useAuth.js` | `useAdminAuth.js` |
|---|---|---|
| Verificação de sessão (`GET /api/auth/check`) | ✅ | ✅ |
| Login (`POST /api/auth/login`) | ✅ | ✅ |
| Logout (`POST /api/auth/logout`) | ✅ | ✅ |
| AbortController para cancelamento | ✅ | ❌ |
| Redirect pós-logout | ❌ | ✅ |
| Estado de loading específico | Apenas `loading` genérico | `loginLoading` separado |

Ambos hooks faziam as mesmas chamadas de API e gerenciavam o mesmo estado de autenticação, mas de forma independente.

**Solução aplicada:** `useAdminAuth` agora consome o `AuthContext` de `useAuth.js` e estende com funcionalidades específicas de admin (redirect, estados de loading/error isolados). Também foi adicionado `credentials: 'include'` nas requisições de `useAuth.js` para consistência.

---

### 1.3 `/hooks/useAdminCrud.js` — Lógica de Fetch Duplicada Internamente ✅ CORRIGIDO

**Arquivo:** `/hooks/useAdminCrud.js`

**Problema:** O hook possuía duas implementações de fetch com a mesma lógica:
- `useEffect` inicial — fetch automático na montagem
- `fetchItems` — função para re-fetch manual

Ambas chamavam `fetchItemsFromAPI`, tratavam loading, paginação e erros de forma idêntica.

**Solução aplicada:** O `useEffect` inicial agora simplesmente chama `fetchItems(1)` em vez de duplicar a lógica.

---

## 2. Problemas de Performance

### 2.1 `/hooks/useAdminCrud.js` — `apiEndpoint` como Dependência de `useEffect` ✅ CORRIGIDO

**Arquivo:** `/hooks/useAdminCrud.js`

**Problema:** `apiEndpoint` era dependência do `useEffect` com lógica de fetch duplicada. Com a refatoração da seção 1.3 (que substituiu o `useEffect` por uma chamada a `fetchItems(1)`), o impacto dessa dependência foi mitigado.

**Solução aplicada:** Resolvido como parte da correção de duplicidade de código (seção 1.3).

---

### 2.2 `/hooks/useApiFetch.js` — `JSON.stringify(options)` como Dependência ✅ CORRIGIDO

**Arquivo:** `/hooks/useApiFetch.js`

**Problema:** `JSON.stringify(options)` como dependência do `useCallback` forçava a recriação da função `fetchData` sempre que `options` mudava, mesmo que o conteúdo serializado fosse idêntico (objetos recriados com mesmas propriedades a cada render do pai).

```js
const fetchData = useCallback(async () => {
  // ...
}, [url, JSON.stringify(options), ...deps]);
```

**Solução aplicada:** Substituído por estratégia com `useRef`:
- `optionsRef` armazena a referência estável de `options`
- `depsKeyRef` compara serializações via `useEffect`
- `fetchData` depende de `depsKeyRef.current` em vez de `JSON.stringify(options)`
- O callback usa `optionsRef.current` no corpo da função

---

### 2.3 `/hooks/usePerformanceMetrics.js` — Falta de Cleanup nos Observers ✅ CORRIGIDO

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Problema:** Os `PerformanceObserver` para `longtask` e `resource` não eram desconectados no cleanup do `useEffect`. Embora observers sejam limpos quando o componente desmonta em alguns navegadores, a especificação não garante.

```js
return () => {
  // Observers são automaticamente limpos quando o componente desmonta
};
```

**Solução aplicada:** Adicionado array `observers` que coleta as referências dos observers criados. No cleanup, todos são desconectados explicitamente:

```js
const observers = [];
// ... criação dos observers com observers.push(...)
return () => {
  observers.forEach((observer) => observer.disconnect());
};
```

---

### 2.4 `/hooks/useTheme.js` — `toggleTheme` com Debounce Manual vs Hook `useThrottle` ✅ CORRIGIDO

**Arquivo:** `/hooks/useTheme.js`

**Problema:** O throttle do `toggleTheme` era implementado manualmente com `useRef` e timestamp, enquanto o projeto já possuía um hook `useDebounce` dedicado. A implementação manual era um **throttle** (ignora chamadas rápidas), mas era chamada incorretamente de "debounce" (que atrasa a execução). Isso causava inconsistência e confusão em revisões de código.

**Solução aplicada:** 
- Criado hook `useThrottle` em `/hooks/useThrottle.js` seguindo o mesmo padrão de `useDebounce`
- `toggleTheme` agora usa `useThrottle` em vez da implementação manual
- Comentário corrigido de "debounce" para "throttle"
- `useThrottle` exportado em `/hooks/index.js`

---

## 3. Correções Necessárias

### 3.1 `/hooks/useAdminAuth.js` — Chamada Condicional de Hook ✅ CORRIGIDO

**Arquivo:** `/hooks/useAdminAuth.js`

**Problema:** `useRouter()` era chamado condicionalmente dentro de um `if ternário`, o que violava as regras do React para hooks:

```js
const router = typeof window !== 'undefined' ? useRouter() : null;
```

Hooks não podem ser chamados dentro de condições, loops ou funções aninhadas.

**Solução aplicada:** `useRouter()` agora é chamado incondicionalmente. O Next.js lida com SSR internamente.

---

### 3.2 `/hooks/useAdminCrud.js` — DELETE com Método GET e Query Parameter

**Arquivo:** `/hooks/useAdminCrud.js`

**Problema:** A operação de exclusão usa método `GET` com `?id=` na URL em vez do método `DELETE` convencional:

```js
const response = await fetch(`${apiEndpoint}?id=${id}`, { method: 'DELETE', signal: abortController.signal });
```

Isso é incomum e pode causar:
- **Cache indevido:** Proxies e CDNs podem cachear requisições GET, impedindo a exclusão.
- **Violação de convenção REST:** O esperado seria `DELETE /api/endpoint/:id`.
- **Segurança:** Logs e referências podem expor o ID na URL.

**Recomendação:** Alterar para `DELETE /api/endpoint/:id` ou enviar o ID no corpo da requisição.

---

### 3.3 `/hooks/useAdminCrud.js` — `customValidator` sem Tratamento de Erro

**Arquivo:** `/hooks/useAdminCrud.js`

**Problema:** `customValidator()` é chamado dentro do bloco `try`, sem validação de retorno. Se o validador lançar uma exceção, ela é capturada pelo `catch` geral, resultando em mensagem de erro genérica:

```js
if (customValidator) customValidator();
```

**Recomendação:** Envolver a chamada em um bloco `try/catch` específico ou fazer o validador retornar um booleano com mensagens de erro estruturadas.

---

### 3.4 `/hooks/usePerformanceMetrics.js` — Referência a `window.LongTasks` Inexistente

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Problema:** A função `detectPerformanceIssues` referencia `window.LongTasks`, que **não existe** na API nativa do navegador:

```js
if (window.LongTasks?.length > 10) {
```

Parece ser uma variável global esperada de alguma biblioteca externa, mas não é declarada em lugar nenhum no projeto. Isso sempre resultará em `undefined` e o bloco nunca será executado.

**Recomendação:** Remover a verificação ou implementar corretamente com `PerformanceObserver` (similar ao feito no hook).

---

### 3.5 `/hooks/useAuth.js` — `AbortController` sem Abort em `login` e `logout`

**Arquivo:** `/hooks/useAuth.js`

**Problema:** `AbortController` é criado dentro de `login` e `logout`, mas nunca é abortado. O controller só é usado para passar o `signal` ao fetch. Se o componente desmontar durante a requisição, não há cancelamento.

```js
const abortController = new AbortController();
// ... signal é passado, mas nunca abortado
```

**Recomendação:**
- Em `login`: usar `useRef` para armazenar o controller ou confiar que o ciclo de vida do fetch lida com isso.
- Em `logout` (chamado intencionalmente pelo usuário): o abort pode nem ser necessário.

---

## 4. Inconsistências e Anti-patterns

### 4.1 `/hooks/useTheme.js` — Funções de Responsividade Sem Reatividade

**Arquivo:** `/hooks/useTheme.js`

**Problema:** `isMobile()`, `isTablet()` e `isDesktop()` são funções síncronas que leem `window.innerWidth` uma única vez no momento da chamada. Elas **não reagem a mudanças de tamanho de tela**:

```js
const isMobile = useCallback(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < tokens.breakpoints.breakpoints.md;
}, []);
```

**Recomendação:** Adicionar um event listener `resize` ou usar hooks como `useMediaQuery` para fornecer valores booleanos reativos, em vez de funções de leitura única.

---

### 4.2 `/hooks/useTheme.js` — Fallbacks para Tokens Indicam Inconsistência Estrutural

**Arquivo:** `/hooks/useTheme.js`

**Problema:** Vários helpers possuem fallbacks com nomes alternativos, indicando que a estrutura dos tokens não é consistente:

```js
const value = tokens.spacing.space[key] || tokens.spacing.spacing[key];
const value = tokens.shadows.shadows[key] || tokens.shadows.shadow[key];
const value = tokens.borders.radius[key] || tokens.borders.borderRadius[key];
```

**Recomendação:** Unificar a estrutura dos tokens para eliminar a necessidade de fallbacks duplicados. Cada token deve ter um caminho único e previsível.

---

### 4.3 `/hooks/useTheme.js` — `setThemeValue` com `useCallback` Desnecessário

**Arquivo:** `/hooks/useTheme.js`

**Problema:** `setThemeValue` é apenas um wrapper que chama `setTheme`:

```js
const setThemeValue = useCallback((newTheme) => {
  setTheme(newTheme);
}, []);
```

Como `setTheme` do `useState` já é estável (garantia do React), este wrapper não adiciona valor.

**Recomendação:** Expor `setTheme` diretamente em vez de criar um wrapper.

---

### 4.4 `/hooks/usePerformanceMetrics.js` — `reportAllMetrics` Não Reporta

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Problema:** A função `reportAllMetrics` simplesmente retorna `getMetrics()` sem de fato reportar nada para analytics ou callback:

```js
const reportAllMetrics = useCallback(() => {
  return getMetrics();
}, [getMetrics]);
```

O nome sugere que forçaria o envio de todas as métricas, mas apenas retorna os dados atuais.

**Recomendação:** Renomear para `getAllMetrics` ou implementar o envio real para analytics.

---

### 4.5 `/hooks/useAuth.js` — `setLoading(true)` em `login` Causa Possível Flicker

**Arquivo:** `/hooks/useAuth.js`

**Problema:** `setLoading(true)` é chamado no início de cada `login`, mesmo que o login seja subsequente e rápido. Se o usuário já está autenticado e o login for instantâneo, pode causar flicker visual.

**Recomendação:** Considerar um estado de loading específico para login (similar ao que `useAdminAuth` faz com `loginLoading`).

---

## 5. Melhorias Gerais

### 5.1 Oportunidade de Padronização com `useApiFetch`

**Arquivos envolvidos:** `useAuth.js`, `useAdminAuth.js`, `useAdminCrud.js`, `usePerformanceMetrics.js`

**Observação:** Múltiplos hooks implementam lógica de fetch manual com `AbortController`, estados de loading/error e tratamento de respostas. O hook `useApiFetch` foi criado exatamente para centralizar esse padrão.

**Recomendação:** Avaliar a adoção de `useApiFetch` como base para os demais hooks que fazem fetch, reduzindo duplicidade e unificando o tratamento de erros e cancelamento.

---

### 5.2 Histórico de Métricas com Potencial de Memory Leak

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Observação:** O histórico é limitado a 50 entradas, o que é bom. Porém, cada entrada armazena `window.location.href`, `userAgent`, e dados de conexão — objetos que podem ser relativamente grandes. Em páginas SPA com muitas navegações, 50 entradas podem acumular dados significativos.

**Recomendação:** Considerar armazenar apenas os campos essenciais no histórico (`name`, `value`, `rating`, `timestamp`) e manter dados contextuais apenas na entrada mais recente.

---

### 5.3 Validação de `customValidator` no `useAdminCrud` — Falta de Tipagem

**Arquivo:** `/hooks/useAdminCrud.js`

**Observação:** O parâmetro `customValidator` não tem contrato definido (não fica claro se deve retornar booleano, lançar erro, ou modificar o formData).

**Recomendação:** Documentar no JSDoc o comportamento esperado da validação (ex: lançar erro com mensagens específicas, ou retornar array de erros).

---

### 5.4 Dependência Externa `web-vitals` — Import Dinâmico sem Cache

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Observação:** O `import('web-vitals')` é feito a cada montagem do hook. Embora módulos ES sejam cacheados pelo navegador, a promessa é recriada.

**Recomendação:** Mover o import dinâmico para fora do hook (em nível de módulo) ou usar um singleton, desde que o módulo seja leve e compatível com SSR.

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

### Ocorrências Corrigidas

| # | Arquivo(s) | Descrição | Data |
|---|---|---|---|
| 1.1 | `hooks/index.js` | Removidas exportações duplicadas com sufixo `Default` | 10/05/2026 |
| 1.2 | `hooks/useAdminAuth.js` + `hooks/useAuth.js` | `useAdminAuth` refatorado para consumir `AuthContext`; `credentials: 'include'` adicionado em `useAuth` | 10/05/2026 |
| 1.3 | `hooks/useAdminCrud.js` | `useEffect` inicial simplificado para chamar `fetchItems(1)` | 10/05/2026 |
| 2.1 | `hooks/useAdminCrud.js` | Resolvido como parte da correção 1.3 | 10/05/2026 |
| 2.2 | `hooks/useApiFetch.js` | `JSON.stringify(options)` substituído por estratégia com `useRef` | 10/05/2026 |
| 2.3 | `hooks/usePerformanceMetrics.js` | Adicionado `observer.disconnect()` no cleanup | 10/05/2026 |
| 2.4 | `hooks/useTheme.js` | Criado `useThrottle` e substituída implementação manual | 10/05/2026 |
| 3.1 | `hooks/useAdminAuth.js` | `useRouter()` movido para fora de condicional | 10/05/2026 |