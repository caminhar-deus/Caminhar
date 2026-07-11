# Levantamento Analítico de Melhorias — `/hooks/`

> **Data:** 28/06/2026
> **Objetivo:** Identificar oportunidades de melhoria nos hooks da pasta `/hooks` sem aplicá-las ao código.
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

### 1.1 — `useAdminCrud.js`: corpo da requisição DELETE sem Content-Type desnecessário ✅

**Arquivo:** `/hooks/useAdminCrud.js` (linha 196)
**Problema:** O método `handleDelete` envia `headers: { 'Content-Type': 'application/json' }` mesmo quando o corpo da requisição DELETE contém apenas um `{ id }`. Embora não seja um erro funcional, o `Content-Type` é desnecessário para requisições DELETE sem corpo ou com corpo simples. Não há prejuízo real, mas é uma imprecisão técnica.
**Situação:** Implementado. O `Content-Type` foi removido do `handleDelete` (linha 203). A requisição DELETE agora envia apenas `{ id }` sem header desnecessário. Nenhum consumidor ou fluxo foi impactado.

### 1.2 — `useApiFetch.js`: falta de tratamento para rede off-line ✅

**Arquivo:** `/hooks/useApiFetch.js` (linhas 57–93)
**Problema:** O hook não verifica `navigator.onLine` antes de executar o fetch. Em cenários de rede indisponível, o fetch lançará um `TypeError` genérico (`Failed to fetch`), que é capturado como mensagem "Erro desconhecido ao buscar dados". Uma verificação prévia permitiria uma mensagem mais clara ("Sem conexão com a internet").
**Situação:** Implementado. Adicionada verificação `navigator.onLine` no início do `fetchData` com early return, mensagem "Sem conexão com a internet" e chamada do `onError`. Adicionado também listener para evento `'online'` que dispara refetch automático ao reconectar, com cleanup adequado e proteção SSR (`typeof navigator`/`typeof window`). Nenhum consumidor ou fluxo foi impactado.

### 1.3 — `usePerformanceMetrics.js`: métrica MPFID definida mas não implementada ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linha 49)
**Problema:** A constante `WEB_VITAL_METRICS` inclui `MPFID` (Max Potential First Input Delay), com threshold definido, mas não há implementação para coletá-la via `PerformanceObserver` ou `web-vitals`. Também não é registrada como métrica no `useEffect`. MPFID é uma métrica obsoleta desde 2023 e pode ser removida sem impacto.
**Situação:** Implementado. As entradas `MPFID: 'MPFID'` em `WEB_VITAL_METRICS` e `MPFID: { good: 130, poor: 250, unit: 'ms' }` em `THRESHOLDS` foram removidas. O objeto `WEB_VITAL_METRICS` passou a conter 7 métricas (LCP, FID, CLS, INP, FCP, TTFB, TBT) e `THRESHOLDS` contém 7 thresholds correspondentes. Nenhum consumidor ou fluxo foi impactado, conforme confirmado por busca global que não encontrou referências a MPFID no projeto.

### 1.4 — `useAdminCrud.js`: `toggleField` não faz atualização otimista de fato ✅

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 218–251)
**Problema:** A descrição do JSDoc menciona "atualização otimista na UI", porém a implementação não altera o estado local antes da resposta do servidor. Ela atualiza apenas após o retorno bem-sucedido do `PUT` e então chama `refetch()` para sincronizar. Isso não é uma atualização otimista — é uma atualização síncrona com revalidação. O comportamento é correto, mas a documentação (`@description`) está imprecisa.
**Situação:** Implementado. O JSDoc do método `toggleField` (linha 217) e a descrição no `@typedef AdminCrudReturn` (linha 44) foram corrigidos para remover a menção a "atualização otimista". As novas descrições refletem com precisão o comportamento real: requisição PUT com revalidação via `refetch()`. Nenhum consumidor ou fluxo foi impactado.

### 1.5 — `useApiFetch.js`: dependência `error` no `useEffect` causa loop infinito em cenários de erro HTTP ✅

**Arquivo:** `/hooks/useApiFetch.js` (linha 129)
**Problema:** O `useEffect` que dispara o fetch tinha `error` como dependência. Quando o fetch falhava (ex: status 500), `setError()` era chamado, o que alterava `error`, re-executava o `useEffect`, que chamava `fetchData` novamente, que falhava e chamava `setError` novamente — criando um loop infinito de renderizações. Isso impedia que componentes como `VideoGallery` exibissem a mensagem de erro, resultando em timeout nos testes.
**Situação:** Implementado. A dependência `error` foi removida do array de dependências do `useEffect` (linha 129). O `useEffect` agora depende apenas de `fetchData` e `staleTime`. O event listener `online` continua funcional, pois a verificação `if (error && error.includes('Sem conexão'))` dentro do `handleOnline` ainda protege contra re-fetches indevidos. Nenhum consumidor ou fluxo foi impactado.

---

## 2. Ajustes Estruturais e Organizacionais

### 2.1 — Inconsistência no padrão de exportação ✅

**Arquivo:** `/hooks/index.js`
**Problema:** A maioria dos hooks é exportada como named export no barrel (`export { ... }`), mas `usePerformanceMetrics` é reexportado como `export { default as usePerformanceMetrics }`. Enquanto em `usePerformanceMetrics.js` o export é `export default function`, os demais hooks usam `export const ...` ou `export function ...`. Essa inconsistência não quebra funcionalidade, mas dificulta a padronização de imports no projeto.
**Situação:** Implementado. O export em `usePerformanceMetrics.js` foi alterado de `export default function` para `export function` (linha 91). O barrel `index.js` foi ajustado de `export { default as usePerformanceMetrics }` para `export { usePerformanceMetrics }` (linha 9). Os imports default nos arquivos `examples/blog-post-seo-example.js` e `examples/homepage-seo-example.js` foram convertidos para named import para manter compatibilidade. Nenhum consumidor ou fluxo foi impactado.

### 2.2 — Ausência de separação entre Context e Hook em `useAuth.js` ✅

**Arquivo:** `/hooks/useAuth.js`
**Problema:** O arquivo `useAuth.js` define três elementos no mesmo módulo: `AuthContext`, `AuthProvider` e `useAuth`. Embora funcione, isso mistura responsabilidades. Uma separação em `AuthContext.js` + `AuthProvider.js` + `useAuth.js` (ou um único arquivo `AuthContext.js` com tudo) traria mais clareza estrutural, sem prejuízo às exportações do barrel.
**Situação:** Implementado. O `AuthContext` foi movido para `hooks/AuthContext.js`, o `AuthProvider` para `hooks/AuthProvider.js`, e `useAuth.js` foi reescrito contendo apenas o hook `useAuth` (sem `export default`). O barrel `index.js` foi atualizado com exports individuais de cada arquivo. Os imports em `useAdminAuth.js`, `tests/helpers/render.js` e `tests/unit/components/Admin/withAdminAuth.test.js` foram atualizados para os novos paths. Nenhum consumidor ou fluxo foi impactado.

### 2.3 — `usePerformanceMetrics` sem um wrapper de contexto

**Arquivo:** `/hooks/usePerformanceMetrics.js`
**Problema:** O hook é funcional, mas para ser integrado na aplicação de forma padronizada, seria necessário um `PerformanceProvider` que instancie o hook uma vez e compartilhe as métricas via contexto, evitando múltiplas instâncias do `PerformanceObserver` em diferentes componentes.

---

## 3. Melhorias de Performance e Manutenção

### 3.1 — `useTheme.js`: listener `resize` não utiliza `useThrottle` nem `useDebounce`

**Arquivo:** `/hooks/useTheme.js` (linhas 78–83)
**Problema:** O event listener `resize` no `window` é registrado sem throttle ou debounce. O evento `resize` pode disparar dezenas de vezes por segundo em janelas redimensionadas rapidamente, atualizando o estado `windowWidth` a cada frame. Isso pode causar re-renderizações desnecessárias. Embora o impacto seja pequeno, o próprio hook já importa `useThrottle`, que poderia ser aplicado aqui.

### 3.2 — `useTheme.js`: acesso a tokens com fallbacks duplicados

**Arquivo:** `/hooks/useTheme.js` (linhas 141–179)
**Problema:** Os helpers `getSpacing`, `getShadow` e `getRadius` implementam fallbacks manuais (ex.: `tokens.spacing.space[key] || tokens.spacing.spacing[key]`). Esses fallbacks sugerem que os tokens de design podem ter múltiplos caminhos para o mesmo valor (singular vs. plural). Isso é uma fragilidade — idealmente, os tokens deveriam ter uma estrutura consistente e sem duplicação, tornando os fallbacks desnecessários.

### 3.3 — `useAdminCrud.js`: `fetchItems` com possível loop de re-render

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 110–116)
**Problema:** A função `fetchItems` compara `page !== currentPage` para decidir se atualiza a página ou chama `refetch()`. Como `currentPage` está nas dependências do `useCallback`, e `fetchItems` modifica `currentPage` via `setCurrentPage`, há risco de loop se `page` for `undefined` e `currentPage` for `1` — embora esse caso seja improvável, a lógica merece revisão.

### 3.4 — `usePerformanceMetrics.js`: cache de métricas apenas por valor idêntico

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 114–120)
**Problema:** O cache de 1 minuto (`METRICS_CACHE_MS`) só ignora o report se o valor formatado da métrica for **exatamente o mesmo** do último report. Se o valor mudar ligeiramente (ex.: CLS de 0.100 para 0.101), o cache é ignorado e a métrica é reportada novamente. Isso é intencional, mas pode gerar múltiplos reports para a mesma métrica com valores próximos dentro da mesma janela de tempo. Um threshold de variação poderia ser mais adequado.

---

## 4. Duplicidades e Redundâncias

### 4.1 — Duplicidade de lógica de toggle entre `useAdminCrud.js` e componentes de UI

**Observação:** O método `toggleField` em `useAdminCrud.js` implementa toggle de campos booleanos via PUT. Se existirem componentes de UI que também implementam toggle (ex.: em `AdminCrudBase.js` ou componentes de tabela), há duplicidade de lógica. Isso não pôde ser verificado nesta análise, mas é um ponto de atenção.

### 4.2 — Descrição de "Design System" no header de `index.js`

**Arquivo:** `/hooks/index.js` (linha 3)
**Problema:** O comentário no topo de `index.js` descreve os hooks como "Custom hooks do Design System". No entanto, a pasta `/hooks` contém hooks de autenticação, CRUD e performance que fogem ao escopo tradicional de um Design System (que normalmente incluiria apenas hooks de tema, utilidades e interação). A descrição pode gerar confusão sobre o propósito real da pasta.

### 4.3 — `useAdminAuth.js` e `useAuth.js`: duplicidade parcial de responsabilidades de login

**Arquivo:** `/hooks/useAdminAuth.js`, `/hooks/useAuth.js`
**Problema:** Ambos os hooks expõem estados de login e loading. `useAuth` possui `loginLoading` e `login`, enquanto `useAdminAuth` possui `loginLoading` e `loginError` próprios, encapsulando `login` do contexto. Isso cria dois pontos de controle de loading de login no sistema. A sobreposição não é total (já que `useAdminAuth` adiciona `loginError` e redirect), mas a separação precisa ser bem documentada para evitar que novos desenvolvedores usem o hook errado.

---

## 5. Pontos de Atenção Técnica

### 5.1 — `useAdminAuth.js`: dependência direta de `next/router`

**Arquivo:** `/hooks/useAdminAuth.js` (linha 3)
**Ponto de atenção:** O hook depende de `next/router` para redirect pós-logout. Isso acopla o hook ao Next.js. Se no futuro o projeto mudar de framework ou precisar de SSR, esse redirect precisará ser revisto. Uma alternativa seria receber um callback `onLogoutRedirect` como parâmetro.

### 5.2 — `useAdminCrud.js`: `window.confirm` sem fallback assíncrono

**Arquivo:** `/hooks/useAdminCrud.js` (linha 189)
**Ponto de atenção:** O método `handleDelete` usa `window.confirm` para confirmação de exclusão. `window.confirm` é bloqueante e não é compatível com interfaces modernas de confirmação (modais assíncronos). Se no futuro a aplicação adotar modais customizados (ex.: com `react-hot-toast` ou um componente de diálogo), essa função precisará ser refatorada para receber um callback de confirmação externo.

### 5.3 — `usePerformanceMetrics.js`: falta de integração com `_app.js` ou `_document.js`

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linha 90)
**Ponto de atenção:** O hook possui a anotação `@todo` indicando que não tem consumidores diretos. Para ser útil, ele deveria ser integrado no `_app.js` (usando `usePerformanceMetrics()`) ou no `_document.js` (usando `reportWebVitals` do Next.js). Sem essa integração, o hook é apenas código disponível mas não executado.

### 5.4 — `useTheme.js`: `setTheme` exposto diretamente sem validação

**Arquivo:** `/hooks/useTheme.js` (linha 191)
**Ponto de atenção:** O hook expõe `setTheme` diretamente, permitindo que qualquer componente defina qualquer valor como tema. Se um componente chamar `setTheme('invalid')`, não há validação. Embora `useState` aceite qualquer string, os efeitos colaterais (aplicação de classe `.dark`, atributo `data-theme`) podem ficar inconsistentes. Uma validação simples no `setTheme` preveniria esse cenário.

### 5.5 — Possível conflito de nomes: `useApiFetch` e `useAdminCrud` sem sufixo "Admin"

**Arquivo:** `/hooks/useApiFetch.js`, `/hooks/useAdminCrud.js`
**Ponto de atenção:** O hook `useApiFetch` não tem sufixo "Admin" mas é usado internamente por `useAdminCrud`, que é específico do admin. Se `useApiFetch` for usado também por componentes públicos (não-admin), pode gerar confusão. A nomenclatura atual sugere que `useApiFetch` é um hook genérico, o que está correto — mas vale verificar se há uso fora do admin para confirmar se a separação faz sentido.

### 5.6 — `usePerformanceMetrics.js`: `PerformanceObserver` para `longtask` pode não ser suportado em todos os navegadores

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 282–283)
**Ponto de atenção:** O bloco `catch` silencia erros de falta de suporte, o que é correto. Porém, a métrica TBT fica indisponível nesses navegadores sem nenhum aviso. Considerar um log de debug ("PerformanceObserver not supported") seria útil para diagnóstico.

### 5.7 — `useAdminCrud.js`: paginação reativa pode causar fetch duplicado na navegação

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 74–79, 100–105, 110–116)
**Ponto de atenção:** O fluxo de navegação entre páginas é: `goToPage(page)` → `setCurrentPage(page)` → `buildUrl(currentPage)` → `useApiFetch` refaz fetch automaticamente pela mudança de URL. No entanto, `fetchItems` também é chamado em `handleSubmit` e `handleDelete`. Se houver mudança de página e `refetch()` for chamado simultaneamente, pode ocorrer dupla requisição. Isso merece verificação em testes de integração.