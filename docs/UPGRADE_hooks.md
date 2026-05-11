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

**Solução aplicada:** Removidas as reexportações com sufixo `Default`. Mantidas apenas as exportações nomeadas.

---

### 1.2 `/hooks/useAuth.js` vs `/hooks/useAdminAuth.js` — Autenticação Duplicada ✅ CORRIGIDO

**Arquivos:** `/hooks/useAuth.js` e `/hooks/useAdminAuth.js`

**Problema:** Lógica de autenticação duplicada com sobreposição significativa.

**Solução aplicada:** `useAdminAuth` agora consome o `AuthContext` de `useAuth.js` e estende com funcionalidades específicas de admin. `credentials: 'include'` adicionado em `useAuth.js`.

---

### 1.3 `/hooks/useAdminCrud.js` — Lógica de Fetch Duplicada Internamente ✅ CORRIGIDO

**Arquivo:** `/hooks/useAdminCrud.js`

**Problema:** O hook possuía duas implementações de fetch com a mesma lógica.

**Solução aplicada:** O `useEffect` inicial agora simplesmente chama `fetchItems(1)` em vez de duplicar a lógica.

---

## 2. Problemas de Performance

### 2.1 `/hooks/useAdminCrud.js` — `apiEndpoint` como Dependência de `useEffect` ✅ CORRIGIDO

**Arquivo:** `/hooks/useAdminCrud.js`

**Solução aplicada:** Resolvido como parte da correção 1.3.

---

### 2.2 `/hooks/useApiFetch.js` — `JSON.stringify(options)` como Dependência ✅ CORRIGIDO

**Arquivo:** `/hooks/useApiFetch.js`

**Solução aplicada:** Substituído por estratégia com `useRef` (`optionsRef` + `depsKeyRef`).

---

### 2.3 `/hooks/usePerformanceMetrics.js` — Falta de Cleanup nos Observers ✅ CORRIGIDO

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Solução aplicada:** Adicionado `observer.disconnect()` no cleanup.

---

### 2.4 `/hooks/useTheme.js` — `toggleTheme` com Debounce Manual vs Hook `useThrottle` ✅ CORRIGIDO

**Arquivo:** `/hooks/useTheme.js`

**Solução aplicada:** Criado `useThrottle` e substituída implementação manual.

---

## 3. Correções Necessárias

### 3.1 `/hooks/useAdminAuth.js` — Chamada Condicional de Hook ✅ CORRIGIDO

**Solução aplicada:** `useRouter()` incondicional.

---

### 3.2 `/hooks/useAdminCrud.js` — DELETE com Query Parameter ✅ CORRIGIDO

**Solução aplicada:** DELETE agora envia ID no corpo (JSON), compatível com todas as API routes.

---

### 3.3 `/hooks/useAdminCrud.js` — `customValidator` sem Tratamento de Erro ✅ CORRIGIDO

**Solução aplicada:** Envolvido em `try/catch` específico com mensagem e interrupção do submit.

---

### 3.4 `/hooks/usePerformanceMetrics.js` — Referência a `window.LongTasks` ✅ CORRIGIDO

**Solução aplicada:** Bloco removido (código morto). Documentado que long tasks são monitoradas via `PerformanceObserver`.

---

### 3.5 `/hooks/useAuth.js` — `AbortController` sem Abort em `login` ✅ CORRIGIDO

**Solução aplicada:** `loginAbortRef` gerenciado via ref; `logout` simplificado.

---

## 4. Inconsistências e Anti-patterns

### 4.1 `/hooks/useTheme.js` — Funções de Responsividade Sem Reatividade ✅ CORRIGIDO

**Arquivo:** `/hooks/useTheme.js`

**Problema:** `isMobile()`, `isTablet()` e `isDesktop()` eram funções síncronas que leem `window.innerWidth` uma única vez. Não reagiam a mudanças de tamanho de tela.

**Solução aplicada:** Convertidas de funções para **valores booleanos reativos**:
- Adicionado estado `windowWidth` com `useState`
- Adicionado `useEffect` com event listener `resize` que atualiza `windowWidth`
- `isMobile`, `isTablet`, `isDesktop` agora são valores booleanos calculados a partir de `windowWidth`
- JSDoc atualizado: `@property {boolean} isMobile` (não mais `function`)
- Adicionadas as dependências `isMobile`, `isTablet`, `isDesktop` no `useMemo`

---

### 4.2 `/hooks/useTheme.js` — Fallbacks para Tokens Indicam Inconsistência Estrutural ⏳ PENDENTE

**Arquivo:** `/hooks/useTheme.js` + `/pages/styles/tokens.js`

**Problema:** Vários helpers possuem fallbacks com nomes alternativos (`space`/`spacing`, `shadows`/`shadow`, `radius`/`borderRadius`).

**Solução:** Pendente — será analisado em momento oportuno.

---

### 4.3 `/hooks/useTheme.js` — `setThemeValue` com `useCallback` Desnecessário ✅ CORRIGIDO

**Arquivo:** `/hooks/useTheme.js`

**Problema:** `setThemeValue` era um wrapper que chamava `setTheme`, sem adicionar valor.

**Solução aplicada:** Removido `setThemeValue`. Expondo `setTheme` diretamente no retorno do `useMemo`. Removido `setThemeValue` das dependências.

---

### 4.4 `/hooks/usePerformanceMetrics.js` — `reportAllMetrics` Não Reporta ✅ CORRIGIDO

**Arquivo:** `/hooks/usePerformanceMetrics.js`

**Problema:** `reportAllMetrics` tinha nome sugestivo de envio, mas apenas retornava dados (comportamento idêntico a `getMetrics`).

**Solução aplicada:** Removida a função `reportAllMetrics` e sua referência do retorno. JSDoc atualizado removendo a propriedade. `getMetrics` é a função canônica para obter métricas acumuladas.

---

### 4.5 `/hooks/useAuth.js` — `setLoading(true)` em `login` Causa Possível Flicker ✅ CORRIGIDO

**Arquivo:** `/hooks/useAuth.js`

**Problema:** `setLoading(true)` usava o mesmo estado `loading` da verificação inicial de sessão, podendo causar flicker visual em logins rápidos.

**Solução aplicada:** Adicionado estado `loginLoading` separado:
- Novo estado `loginLoading` no `AuthProvider`
- `login` agora usa `setLoginLoading(true/false)` em vez de `setLoading(true/false)`
- O estado `loading` (da verificação inicial) permanece inalterado
- `loginLoading` exposto no `AuthContext` para consumidores
- `AuthContext` padrão atualizado com `loginLoading: false`

---

## 5. Melhorias Gerais

### 5.1 Oportunidade de Padronização com `useApiFetch`

**Recomendação:** Avaliar adoção de `useApiFetch` como base.

---

### 5.2 Histórico de Métricas com Potencial de Memory Leak

**Recomendação:** Armazenar apenas campos essenciais no histórico.

---

### 5.3 Validação de `customValidator` — Falta de Tipagem

**Recomendação:** Documentar no JSDoc o comportamento esperado.

---

### 5.4 Dependência Externa `web-vitals` — Import Dinâmico sem Cache

**Recomendação:** Mover import dinâmico para nível de módulo.

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
| 1.2 | `hooks/useAdminAuth.js` + `hooks/useAuth.js` | `useAdminAuth` refatorado para consumir `AuthContext` | 10/05/2026 |
| 1.3 | `hooks/useAdminCrud.js` | `useEffect` inicial simplificado | 10/05/2026 |
| 2.1 | `hooks/useAdminCrud.js` | Resolvido como parte da correção 1.3 | 10/05/2026 |
| 2.2 | `hooks/useApiFetch.js` | `JSON.stringify(options)` substituído por estratégia `useRef` | 10/05/2026 |
| 2.3 | `hooks/usePerformanceMetrics.js` | `observer.disconnect()` no cleanup | 10/05/2026 |
| 2.4 | `hooks/useTheme.js` | Criado `useThrottle` e substituída implementação manual | 10/05/2026 |
| 3.1 | `hooks/useAdminAuth.js` | `useRouter()` incondicional | 10/05/2026 |
| 3.2 | `hooks/useAdminCrud.js` | DELETE com ID no body (JSON) | 10/05/2026 |
| 3.3 | `hooks/useAdminCrud.js` | `customValidator` com tratamento de erro | 10/05/2026 |
| 3.4 | `hooks/usePerformanceMetrics.js` | Bloco `window.LongTasks` removido | 10/05/2026 |
| 3.5 | `hooks/useAuth.js` | `AbortController` gerenciado via ref | 10/05/2026 |
| 4.1 | `hooks/useTheme.js` | `isMobile`/`isTablet`/`isDesktop` convertidos para valores reativos | 10/05/2026 |
| 4.3 | `hooks/useTheme.js` | `setThemeValue` removido; `setTheme` exposto diretamente | 10/05/2026 |
| 4.4 | `hooks/usePerformanceMetrics.js` | `reportAllMetrics` removido | 10/05/2026 |
| 4.5 | `hooks/useAuth.js` | `loginLoading` separado adicionado | 10/05/2026 |

### Ocorrências Pendentes

| # | Arquivo(s) | Descrição | Situação |
|---|---|---|---|
| 4.2 | `hooks/useTheme.js` + `tokens.js` | Fallbacks de tokens — aguardando análise | ⏳ Pendente |