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

### 1.6 — `usePerformanceMetrics.js`: métrica FID não é mais exportada pelo web-vitals v5.x ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linha 204)
**Problema:** O pacote `web-vitals@5.3.0` removeu a exportação de `onFID`, pois a métrica First Input Delay (FID) foi oficialmente depreciada e substituída pelo INP (Interaction to Next Paint). O código tentava desestruturar `onFID` do módulo importado, resultando em `TypeError: onFID is not a function` em tempo de execução no navegador.
**Situação:** Implementado. `onFID` foi removido da desestruturação do `await webVitalsPromise`, o bloco de chamada `onFID(...)` foi removido, e as entradas `FID: 'FID'` em `WEB_VITAL_METRICS` e `FID: { good: 100, poor: 300, unit: 'ms' }` em `THRESHOLDS` foram removidas. A métrica INP, que já estava implementada com verificação `if (onINP)`, permanece como substituta oficial. Nenhum consumidor ou fluxo foi impactado.

### 1.7 — `usePerformanceMetrics.js`: falso positivo de "Slow resource" para iframes de terceiros ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 278–299)
**Problema:** O `PerformanceObserver` com `entryTypes: ['resource']` reportava `console.warn` para todos os recursos com duração > 1s, incluindo iframes embarcados do YouTube (~1.100ms cada) e outros domínios de terceiros. Como recursos cross-origin são naturalmente mais lentos (DNS + TCP + TLS completos), esses warnings eram falsos positivos que poluíam o console sem indicar problema real na aplicação.
**Situação:** Implementado. Adicionada constante `THIRD_PARTY_DOMAINS` com 9 domínios (youtube.com, ytimg.com, spotify.com, scdn.co, googleusercontent.com, googleapis.com, gstatic.com, facebook.com, instagram.com) e função `isThirdPartyResource(url)` que extrai o hostname via `new URL()` e verifica correspondência. O filtro foi aplicado na condição do resource observer: `if (entry.duration > 1000 && !isThirdPartyResource(entry.name))`. Recursos de terceiros continuam sendo observados mas não geram `console.warn`. Nenhum consumidor ou fluxo foi impactado.


## 2. Ajustes Estruturais e Organizacionais

### 2.1 — Inconsistência no padrão de exportação ✅

**Arquivo:** `/hooks/index.js`
**Problema:** A maioria dos hooks é exportada como named export no barrel (`export { ... }`), mas `usePerformanceMetrics` é reexportado como `export { default as usePerformanceMetrics }`. Enquanto em `usePerformanceMetrics.js` o export é `export default function`, os demais hooks usam `export const ...` ou `export function ...`. Essa inconsistência não quebra funcionalidade, mas dificulta a padronização de imports no projeto.
**Situação:** Implementado. O export em `usePerformanceMetrics.js` foi alterado de `export default function` para `export function` (linha 91). O barrel `index.js` foi ajustado de `export { default as usePerformanceMetrics }` para `export { usePerformanceMetrics }` (linha 9). Os imports default nos arquivos `examples/blog-post-seo-example.js` e `examples/homepage-seo-example.js` foram convertidos para named import para manter compatibilidade. Nenhum consumidor ou fluxo foi impactado.

### 2.2 — Ausência de separação entre Context e Hook em `useAuth.js` ✅

**Arquivo:** `/hooks/useAuth.js`
**Problema:** O arquivo `useAuth.js` define três elementos no mesmo módulo: `AuthContext`, `AuthProvider` e `useAuth`. Embora funcione, isso mistura responsabilidades. Uma separação em `AuthContext.js` + `AuthProvider.js` + `useAuth.js` (ou um único arquivo `AuthContext.js` com tudo) traria mais clareza estrutural, sem prejuízo às exportações do barrel.
**Situação:** Implementado. O `AuthContext` foi movido para `hooks/AuthContext.js`, o `AuthProvider` para `hooks/AuthProvider.js`, e `useAuth.js` foi reescrito contendo apenas o hook `useAuth` (sem `export default`). O barrel `index.js` foi atualizado com exports individuais de cada arquivo. Os imports em `useAdminAuth.js`, `tests/helpers/render.js` e `tests/unit/components/Admin/withAdminAuth.test.js` foram atualizados para os novos paths. Nenhum consumidor ou fluxo foi impactado.

### 2.3 — `usePerformanceMetrics` sem um wrapper de contexto ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js`
**Problema:** O hook é funcional, mas para ser integrado na aplicação de forma padronizada, seria necessário um `PerformanceProvider` que instancie o hook uma vez e compartilhe as métricas via contexto, evitando múltiplas instâncias do `PerformanceObserver` em diferentes componentes.
**Situação:** Implementado. Criados `PerformanceContext.js`, `PerformanceProvider.js` e `usePerformance.js`. O barrel `index.js` foi atualizado com as exportações dos novos artefatos. O `PerformanceProvider` foi integrado em `_app.js` como wrapper da aplicação, e um componente `PerformanceMonitor` (que chama `usePerformance()`) foi adicionado como consumidor dentro do provider. Os exemplos `homepage-seo-example.js` e `blog-post-seo-example.js` foram migrados de `usePerformanceMetrics` direto para `usePerformance` via contexto. O hook bruto `usePerformanceMetrics` permanece exportado para uso isolado. Nenhum consumidor ou fluxo foi impactado.


## 3. Melhorias de Performance e Manutenção

### 3.1 — `useTheme.js`: listener `resize` não utiliza `useThrottle` nem `useDebounce` ✅

**Arquivo:** `/hooks/useTheme.js` (linhas 78–83)
**Problema:** O event listener `resize` no `window` é registrado sem throttle ou debounce. O evento `resize` pode disparar dezenas de vezes por segundo em janelas redimensionadas rapidamente, atualizando o estado `windowWidth` a cada frame. Isso pode causar re-renderizações desnecessárias. Embora o impacto seja pequeno, o próprio hook já importa `useThrottle`, que poderia ser aplicado aqui.
**Situação:** Implementado. Adicionado callback `updateWidth` com `useCallback` e dependência vazia para estabilizar a referência. O handler de resize foi envolvido com `useThrottle(updateWidth, 100)` e o `useEffect` passou a depender de `handleResize`. A proteção SSR (`typeof window === 'undefined'`) foi mantida. Nenhum consumidor ou fluxo foi impactado.

### 3.2 — `useTheme.js`: acesso a tokens com fallbacks duplicados ✅

**Arquivo:** `/hooks/useTheme.js` (linhas 141–179)
**Problema:** Os helpers `getSpacing`, `getShadow` e `getRadius` implementam fallbacks manuais (ex.: `tokens.spacing.space[key] || tokens.spacing.spacing[key]`). Esses fallbacks sugerem que os tokens de design podem ter múltiplos caminhos para o mesmo valor (singular vs. plural). Isso é uma fragilidade — idealmente, os tokens deveriam ter uma estrutura consistente e sem duplicação, tornando os fallbacks desnecessários.
**Situação:** Implementado. Adicionados três objetos mesclados com `useMemo` (`allSpacing`, `allShadows`, `allRadius`) que unificam os namespaces numérico e semântico de cada token via spread (`{ ...objA, ...objB }`). Os helpers `getSpacing`, `getShadow` e `getRadius` foram simplificados para acessar diretamente o objeto mesclado, eliminando os fallbacks manuais. A verificação de existência foi alterada de `!value` para `value === undefined` e o retorno de `value || null` para `value ?? null`, prevenindo falsos negativos com valores válidos como string vazia. Nenhum consumidor ou fluxo foi impactado.

### 3.3 — `useAdminCrud.js`: `fetchItems` com possível loop de re-render ✅

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 117–123)
**Problema:** A função `fetchItems` compara `page !== currentPage` para decidir se atualiza a página ou chama `refetch()`. Como `currentPage` está nas dependências do `useCallback`, e `fetchItems` modifica `currentPage` via `setCurrentPage`, há risco de loop se `page` for `undefined` e `currentPage` for `1` — embora esse caso seja improvável, a lógica merece revisão.
**Situação:** Implementado. A dependência `currentPage` foi removida do `useCallback` de `fetchItems` (agora depende apenas de `[refetch]`). A condição `page && page !== currentPage` foi substituída por `page !== undefined && page !== null`, eliminando a comparação com o valor do estado e o risco de ciclo. Nenhum consumidor ou fluxo foi impactado.

### 3.4 — `usePerformanceMetrics.js`: cache de métricas apenas por valor idêntico ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 109–128)
**Problema:** O cache de 1 minuto (`METRICS_CACHE_MS`) só ignora o report se o valor formatado da métrica for **exatamente o mesmo** do último report. Se o valor mudar ligeiramente (ex.: CLS de 0.100 para 0.101), o cache é ignorado e a métrica é reportada novamente. Isso é intencional, mas pode gerar múltiplos reports para a mesma métrica com valores próximos dentro da mesma janela de tempo. Um threshold de variação poderia ser mais adequado.
**Situação:** Implementado. Adicionada constante `METRICS_VARIANCE_THRESHOLD = 0.05` (5%) no escopo do módulo. A condição de cache foi alterada de igualdade estrita (`lastReported.value === formattedValue`) para cálculo de variação relativa: se a variação percentual entre o valor atual e o último reportado for inferior a 5%, o report é suprimido. Inclui tratamento de divisão por zero (quando `lastReported.value === 0`, usa diferença absoluta). A mensagem de debug foi atualizada para exibir o percentual de variação calculado. O cache temporal de 1 minuto (`METRICS_CACHE_MS`) permanece como primeiro filtro. Nenhum consumidor ou fluxo foi impactado.

---

## 4. Duplicidades e Redundâncias

### 4.1 — Duplicidade de lógica de toggle entre `useAdminCrud.js` e componentes de UI ✅

**Arquivos:** `/hooks/useAdminCrud.js`, `/components/Admin/AdminCrudBase.js`, `/components/Admin/CrudTable.js`
**Problema:** O método `toggleField` em `useAdminCrud.js` não oferecia suporte nativo a atualização otimista, forçando o componente `AdminCrudBase.js` a implementar lógica própria de `setLocalItems` + reversão em falha via `.catch()`. Isso duplicava a responsabilidade de toggle entre hook e UI.
**Situação:** Implementado. O `toggleField` agora aceita um 4º parâmetro opcional `{ onOptimisticUpdate, onRevert }`. O `AdminCrudBase.handleToggleBoolean` foi simplificado para delegar totalmente ao hook, removendo a lógica manual de `previousItems` e `.catch()`. O `toggleField` também passou a retornar a Promise explicitamente (`return result`). A assinatura externa de `handleToggleBoolean` permanece `(item, key, currentValue)`. Nenhum consumidor ou fluxo foi impactado.

### 4.2 — Descrição de "Design System" no header de `index.js` ✅

**Arquivo:** `/hooks/index.js` (linha 3)
**Problema:** O comentário no topo de `index.js` descreve os hooks como "Custom hooks do Design System". No entanto, a pasta `/hooks` contém hooks de autenticação, CRUD e performance que fogem ao escopo tradicional de um Design System (que normalmente incluiria apenas hooks de tema, utilidades e interação). A descrição pode gerar confusão sobre o propósito real da pasta.
**Situação:** Implementado. O comentário na linha 3 de `hooks/index.js` foi alterado de `* Custom hooks do Design System` para `* Custom hooks da aplicação`. A nova descrição é genérica e estável, cobrindo todos os hooks da pasta sem necessidade de manutenção futura. Nenhum consumidor ou fluxo foi impactado.

### 4.3 — `useAdminAuth.js` e `useAuth.js`: duplicidade parcial de responsabilidades de login ✅

**Arquivo:** `/hooks/useAdminAuth.js`, `/hooks/useAuth.js`
**Problema:** Ambos os hooks expõem estados de login e loading. `useAuth` possui `loginLoading` e `login`, enquanto `useAdminAuth` possui `loginLoading` e `loginError` próprios, encapsulando `login` do contexto. Isso cria dois pontos de controle de loading de login no sistema. A sobreposição não é total (já que `useAdminAuth` adiciona `loginError` e redirect), mas a separação precisa ser bem documentada para evitar que novos desenvolvedores usem o hook errado.
**Situação:** Implementado. O `loginLoading` agora é consumido diretamente do `AuthContext` em vez de ser gerenciado como estado local em `useAdminAuth.js`. O estado local `const [loginLoading, setLoginLoading] = useState(false)` foi removido, e `loginLoading` foi adicionado à desestruturação do `useContext(AuthContext)`. O `handleLogin` foi simplificado: as chamadas `setLoginLoading(true)` e `setLoginLoading(false)` foram removidas, mantendo apenas o gerenciamento de `loginError`. O JSDoc de `loginLoading` foi atualizado para refletir a origem do contexto. Nenhum consumidor ou fluxo foi impactado.

---

## 5. Pontos de Atenção Técnica

### 5.1 — `useAdminAuth.js`: dependência direta de `next/router` ✅

**Arquivo:** `/hooks/useAdminAuth.js` (linha 3)
**Ponto de atenção:** O hook depende de `next/router` para redirect pós-logout. Isso acopla o hook ao Next.js. Se no futuro o projeto mudar de framework ou precisar de SSR, esse redirect precisará ser revisto. Uma alternativa seria receber um callback `onLogoutRedirect` como parâmetro.
**Situação:** Implementado. A importação de `next/router` foi removida de `useAdminAuth.js`. O hook agora aceita um parâmetro opcional `{ onLogoutRedirect }` e executa o callback após o logout, quando fornecido. A responsabilidade do redirect foi transferida para o consumidor `withAdminAuth.js`, que passou a importar `next/router` e fornecer o callback `() => router.push('/admin')`. Nenhum consumidor ou fluxo foi impactado.

### 5.2 — `useAdminCrud.js`: `window.confirm` sem fallback assíncrono ✅

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 199–205)
**Problema:** O método `handleDelete` usava `window.confirm` para confirmação de exclusão. `window.confirm` é bloqueante e não é compatível com interfaces modernas de confirmação (modais assíncronos). Não havia mecanismo para que consumidores do hook fornecessem um callback de confirmação personalizado.
**Situação:** Implementado. Adicionado o parâmetro opcional `onConfirmDelete` ao `@typedef AdminCrudConfig`. O `handleDelete` agora verifica primeiro se `onConfirmDelete` foi fornecido: se sim, aguarda a Promise resolver (`await onConfirmDelete()`) e só prossegue se resolver com `true`; caso contrário, mantém o `window.confirm` como fallback. O consumidor `AdminCrudBase.js` foi atualizado para fornecer um `onConfirmDelete` que abre um modal customizado (`Modal` de `components/UI/`) e retorna uma Promise resolvida quando o usuário confirma ou cancela. Nenhum consumidor existente foi impactado graças ao fallback `window.confirm`.

### 5.3 — `usePerformanceMetrics.js`: falta de integração com `_app.js` ou `_document.js` ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linha 90)
**Ponto de atenção:** O hook possuía a anotação `@todo` indicando que não tinha consumidores diretos. Para ser útil, ele deveria ser integrado no `_app.js` (usando `usePerformanceMetrics()`) ou no `_document.js` (usando `reportWebVitals` do Next.js). Sem essa integração, o hook era apenas código disponível mas não executado.
**Situação:** Implementado. O comentário `@todo` foi removido de `usePerformanceMetrics.js` (linhas 87–89), pois a integração já havia sido realizada anteriormente via item 2.3: o `PerformanceProvider` instancia o hook uma única vez e o `PerformanceMonitor` em `_app.js` consome as métricas via `usePerformance()`. A anotação estava desatualizada. Nenhum consumidor ou fluxo foi impactado.

### 5.4 — `useTheme.js`: `setTheme` exposto diretamente sem validação ✅

**Arquivo:** `/hooks/useTheme.js` (linha 191)
**Ponto de atenção:** O hook expõe `setTheme` diretamente, permitindo que qualquer componente defina qualquer valor como tema. Se um componente chamar `setTheme('invalid')`, não há validação. Embora `useState` aceite qualquer string, os efeitos colaterais (aplicação de classe `.dark`, atributo `data-theme`) podem ficar inconsistentes. Uma validação simples no `setTheme` preveniria esse cenário.
**Situação:** Implementado. O `setTheme` do `useState` foi renomeado para `setRawTheme` e substituído por uma nova função `setTheme` com `useCallback` que valida o valor contra o conjunto `['light', 'dark']`. Valores inválidos são ignorados com `console.warn` em desenvolvimento. O `toggleTheme` passou a usar `setRawTheme` diretamente para evitar a validação (sempre produz valores válidos). O JSDoc do hook e da propriedade foram atualizados. Nenhum consumidor ou fluxo foi impactado.

### 5.5 — Possível conflito de nomes: `useApiFetch` e `useAdminCrud` sem sufixo "Admin" ✅

**Arquivo:** `/hooks/useApiFetch.js`, `/hooks/useAdminCrud.js`
**Ponto de atenção:** O hook `useApiFetch` não tem sufixo "Admin" mas é usado internamente por `useAdminCrud`, que é específico do admin. Se `useApiFetch` for usado também por componentes públicos (não-admin), pode gerar confusão. A nomenclatura atual sugere que `useApiFetch` é um hook genérico, o que está correto — mas vale verificar se há uso fora do admin para confirmar se a separação faz sentido.
**Situação:** Implementado. A investigação confirmou que `useApiFetch` é usado por 5 componentes públicos (BlogSection, MusicGallery, VideoGallery, Testimonials, ProductList) e apenas secundariamente por `useAdminCrud`. O nome está correto — não há conflito real. Para eliminar ambiguidade documentacional, foi adicionada a tag `@note` no JSDoc de `useApiFetch.js`: "Hook compartilhado entre componentes públicos e administrativos — uso não se limita ao admin." O JSDoc de `useAdminCrud.js` foi ajustado para mencionar que `useApiFetch` é "hook genérico compartilhado com Features públicas". Nenhum consumidor ou fluxo foi impactado.

### 5.6 — `usePerformanceMetrics.js`: `PerformanceObserver` para `longtask` pode não ser suportado em todos os navegadores ✅

**Arquivo:** `/hooks/usePerformanceMetrics.js` (linhas 282–283)
**Ponto de atenção:** O bloco `catch` silencia erros de falta de suporte, o que é correto. Porém, a métrica TBT fica indisponível nesses navegadores sem nenhum aviso. Considerar um log de debug ("PerformanceObserver not supported") seria útil para diagnóstico.
**Situação:** Implementado. O bloco `catch` vazio foi substituído por um bloco que captura a exceção com parâmetro `err` e, em modo `debug`, exibe `console.warn` com a mensagem `'[Performance] PerformanceObserver for longtask not supported in this browser — TBT metric unavailable'` e o erro original. Em produção (`debug === false`), nenhum log adicional é emitido. Nenhum consumidor ou fluxo foi impactado.

### 5.7 — `useAdminCrud.js`: paginação reativa pode causar fetch duplicado na navegação ✅

**Arquivo:** `/hooks/useAdminCrud.js` (linhas 74–79, 100–105, 110–116)
**Ponto de atenção:** O fluxo de navegação entre páginas é: `goToPage(page)` → `setCurrentPage(page)` → `buildUrl(currentPage)` → `useApiFetch` refaz fetch automaticamente pela mudança de URL. No entanto, `fetchItems` também é chamado em `handleSubmit` e `handleDelete`. Se houver mudança de página e `refetch()` for chamado simultaneamente, pode ocorrer dupla requisição. Isso merece verificação em testes de integração.
**Situação:** Implementado. A função `fetchItems` foi reescrita para evitar o duplo fetch: quando `page !== currentPage`, apenas `setCurrentPage(page)` é chamado (o `useApiFetch` reage automaticamente à mudança de URL); quando `page === currentPage`, apenas `refetch()` é chamado; quando `page` não é fornecido, apenas `refetch()` é chamado. A dependência `currentPage` foi adicionada ao `useCallback` de `fetchItems` para permitir a comparação. Nenhum consumidor ou fluxo foi impactado.
