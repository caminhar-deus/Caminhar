# Melhorias Possíveis — Suite de Testes (`/tests/`)

> **Data:** 28/06/2026
> **Propósito:** Levantamento analítico de melhorias potenciais, sem aplicação de alterações.

---

## Sumário

1. [Duplicidades e Redundâncias](#1-duplicidades-e-redundâncias)
2. [Problemas Estruturais e Organizacionais](#2-problemas-estruturais-e-organizacionais)
3. [Problemas de Código e Manutenção](#3-problemas-de-código-e-manutenção)
4. [Problemas de Performance](#4-problemas-de-performance)
5. [Ferramentas e Configuração](#5-ferramentas-e-configuração)
6. [Cobertura e Lacunas](#6-cobertura-e-lacunas)
7. [Documentação e Legibilidade](#7-documentação-e-legibilidade)

---

## 1. Duplicidades e Redundâncias

### 1.1 Duplicidade entre `tests/mocks/db-module.js` e `tests/mocks/db.js`
- **Arquivos:** `tests/mocks/db-module.js` e `tests/mocks/db.js`
- **Problema:** Ambos os arquivos exportam `mockDb()` e `mockDbModule()`, com implementações diferentes. `db-module.js` tem 63 linhas e é usado pelos testes de integração da API admin. `db.js` tem 235 linhas e é mais completo com `mockQuery()`, `mockQuerySequence()`, etc. A existência de ambos gera confusão sobre qual usar.
- **Sugestão:** Unificar em um único módulo, consolidando as funções mais usadas e eliminando a duplicação de `mockDb()`/`mockDbModule()`.

### 1.2 Duplicidade entre `tests/mocks/auth.js` e `tests/helpers/auth.js`
- **Arquivos:** `tests/mocks/auth.js` e `tests/helpers/auth.js`
- **Problema:** Ambos fornecem funcionalidades para mockar autenticação. `mocks/auth.js` exporta `mockAuthModule()` (para uso com `jest.mock()`), enquanto `helpers/auth.js` exporta `mockAuthLib()` e `mockAuthenticatedUser()`. As funções têm propósitos sobrepostos.
- **Sugestão:** Consolidar em um único padrão: helpers para funções utilitárias puras e mocks para módulos que exigem `jest.mock()`.

### 1.3 Duplicidade entre `tests/mocks/next.js` e `tests/mocks/next-setup.js`
- **Arquivos:** `tests/mocks/next.js` e `tests/mocks/next-setup.js`
- **Problema:** `next-setup.js` importa funções de `next.js` e já registra os `jest.mock()` automaticamente. `next.js` contém implementações individuais que também podem ser chamadas diretamente. A função `setupNextMocks()` em `next.js` está deprecated mas ainda presente.
- **Sugestão:** Remover a função `setupNextMocks()` de `next.js` (deprecada) e garantir que `next-setup.js` seja o único ponto de entrada.

### 1.4 Redundância de polyfills entre `tests/setup.js` e `tests/setup.db.js`
- **Arquivos:** `tests/setup.js` e `tests/setup.db.js`
- **Problema:** Ambos os arquivos implementam polyfill de `ReadableStream` e `MessageChannel` com o mesmo código. Também filtram `console.error` com lógica idêntica.
- **Sugestão:** Extrair polyfills e filtros para um módulo compartilhado (ex: `tests/setup-common.js`) e importá-lo em ambos os setups.

### 1.5 Duplicidade de descrições de teste nos arquivos `crud-test.js`
- **Arquivo:** `tests/helpers/crud-test.js`
- **Problema:** Os helpers `testPublicGetEndpoint` e `testAdminGetEndpoint` testam cenários muito similares (405 para método não permitido), mas com abordagens diferentes. `testAdminCrudEndpoint` explicitamente não testa 405 porque a autenticação ocorre antes, mas essa decisão de design não é documentada nos testes que o usam.
- **Sugestão:** Documentar claramente a diferença entre os três helpers e adicionar testes de 405 nos `customTests` dos endpoints CRUD admin quando aplicável.

---

## 2. Problemas Estruturais e Organizacionais

### 2.1 Mistura de testes de integração e unitários na pasta `integration/`
- **Local:** `tests/integration/api/audit.test.js`
- **Problema:** O teste de `audit.test.js` na pasta `integration/api/` não testa um endpoint HTTP, mas sim uma função de domínio (`logActivity`). Seria mais adequado em `tests/unit/domain/` ou `tests/integration/domain/`.
- **Sugestão:** Mover para `tests/unit/domain/` com os demais testes de domínio.

### 2.2 Nomenclatura inconsistente nos arquivos de teste de API
- **Local:** `tests/integration/api/`
- **Problema:** Alguns arquivos usam nomeação consistente (ex: `musicas.create.test.js`, `musicas.delete.test.js`), enquanto outros têm nomes genéricos (ex: `musicas.test.js`, `posts.test.js`). Isso dificulta entender rapidamente o escopo de cada arquivo.
- **Sugestão:** Padronizar a nomenclatura: `{recurso}.{operacao}.test.js` para todos os arquivos.

### 2.3 Pasta `tests/examples/` contém código duplicado e não executável como aprendizado
- **Local:** `tests/examples/`
- **Problema:** Os exemplos definem componentes mockados inline (como `MockPostList`) que não existem no projeto real. Isso torna os exemplos potencialmente confusos para novos desenvolvedores, que podem pensar que esses componentes existem de verdade.
- **Sugestão:** Transformar em documentação executável (testes que realmente passam) ou converter em documentação markdown referenciando componentes reais.

### 2.4 Pasta `tests/mocks/next.test.js` é um teste dentro de mocks
- **Local:** `tests/mocks/next.test.js`
- **Problema:** Este é o único arquivo de teste dentro da pasta `mocks/`. Quebra o padrão onde todos os testes estão em `tests/unit/` ou `tests/integration/`.
- **Sugestão:** Mover para `tests/unit/mocks/next.test.js` ou manter apenas se houver justificativa clara.

---

## 3. Problemas de Código e Manutenção

### 3.1 Uso de `require()` em vez de `import` em alguns arquivos
- **Local:** `tests/helpers/render.js` (linha 149)
- **Problema:** `const { Toaster } = require('react-hot-toast');` usa `require()` enquanto o projeto usa ES Modules com `import`.
- **Sugestão:** Convertar para `import { Toaster } from 'react-hot-toast';`.

### 3.2 `setupNextMocks()` deprecated mas ainda exportado
- **Local:** `tests/mocks/next.js` (linhas 194-213)
- **Problema:** Função marcada como `@deprecated` mas ainda exportada. Pode causar confusão.
- **Sugestão:** Remover a função e manter apenas o `next-setup.js` como ponto de entrada.

### 3.3 Commentários de depuração em `console.log` nos setups
- **Local:** `tests/setup.js` (linhas 228-230), `tests/setup.db.js` (linhas 84-85)
- **Problema:** `console.log('🧪 Test Suite Architecture loaded')` e `console.log('📦 Node.js version:', process.version)` poluem a saída dos testes. Em CI, isso adiciona ruído desnecessário.
- **Sugestão:** Mover para um nível de log mais baixo (ex: `console.debug`) ou condicionar à variável de ambiente `DEBUG=true`.

### 3.4 Tratamento de erro em `globalSetup.db.js` mascara falhas
- **Local:** `tests/global-setup.db.js`
- **Problema:** Se o Docker falhar, a string `'__docker_unavailable__'` é definida, e os testes de banco são ignorados silenciosamente. Pode passar despercebido em CI.
- **Sugestão:** Adicionar um aviso mais claro no relatório de testes, ou marcar os testes como "skipped" explicitamente.

### 3.5 Polyfill de `URL.revokeObjectURL` adicionado ao `tests/setup.js` ✅

**Arquivo:** `tests/setup.js` (linhas 137-139)

**Problema:** O teste `AdminAudit.test.js` — "deve testar os botões de paginação" falhava com `TypeError: URL.revokeObjectURL is not a function`. O JSDOM não implementa essa API de browser. O `csvExport.js` agenda um `setTimeout` com `URL.revokeObjectURL` que disparava durante a execução de outros testes.

**Correção:** Adicionado polyfill `URL.revokeObjectURL = jest.fn()` no `tests/setup.js`. Também adicionada proteção em `lib/csvExport.js` com `typeof URL.revokeObjectURL === 'function'` para ambientes que não implementam a API.

### 3.6 Polyfills assíncronos extraídos para arquivo compartilhado ✅

**Arquivo:** `tests/setup.js`, `tests/helpers/async-polyfills.js`

**Problema:** As IIFEs assíncronas com `await import()` para `ReadableStream` e `MessageChannel` estavam no top-level de `tests/setup.js`, criando promises que ninguém aguardava. Isso poderia manter o event loop do Jest aberto.

**Correção:** Extraídas para função `setupAsyncPolyfills()` em novo arquivo `tests/helpers/async-polyfills.js` (sem dependência de `jest`). A função é idempotente (cache de promise). Chamada pelo `jest.teardown.js` com `await` para garantir resolução antes do processo finalizar. Importada também por `tests/setup.js` para manter a execução imediata durante o setup.

### 3.7 `disconnect()` do IntersectionObserver corrigido ✅

**Arquivo:** `tests/setup.js` (linhas 94-110)

**Problema:** O polyfill de `IntersectionObserver` criava um `setTimeout(() => callback(...), 0)` no construtor, mas o método `disconnect()` não limpava o timer. Se o componente fosse desmontado rapidamente, o timer ficava pendente.

**Correção:** Adicionado `clearTimeout(this._timer)` no método `disconnect()`.

### 3.8 `afterEach` em `tests/setup.js` executa `cleanup()` e `jest.clearAllMocks()`
- **Local:** `tests/setup.js` (linhas 186-189)
- **Problema:** `jest.clearAllMocks()` pode resetar mocks que foram configurados no `beforeEach` de um `describe`, forçando reconfiguração.
- **Sugestão:** Avaliar se `jest.resetAllMocks()` seria mais apropriado em alguns casos, ou documentar a necessidade de reconfigurar mocks.

### 3.9 Strings de conexão hardcoded no `global-setup.db.js`
- **Local:** `tests/global-setup.db.js`
- **Problema:** Usuário e senha `test/test` estão hardcoded.
- **Sugestão:** Extrair para variáveis de ambiente com fallback seguro.

### 3.10 Timeout em testes de erro do VideoGallery causado por loop infinito no `useApiFetch` ✅
- **Arquivos:** `tests/unit/components/Features/Video/VideoGallery.test.js` (linhas 136, 157), `hooks/useApiFetch.js` (linha 129)
- **Problema:** Dois testes de erro HTTP no VideoGallery estouravam o timeout de 10s do Jest. A causa raiz era o `useEffect` do `useApiFetch.js` que listava `error` como dependência. Quando o fetch falhava, `setError()` alterava `error`, re-executava o `useEffect`, que chamava `fetchData` novamente, que falhava e chamava `setError` novamente — loop infinito de renderizações.
- **Correção:** Removida a dependência `error` do `useEffect` em `useApiFetch.js` (linha 129). Adicionado timeout explícito de 15s nos 2 testes como rede de segurança. Testes passam em ~14ms e ~5ms respectivamente. Nenhuma regressão na suite completa (352 testes).

### 3.11 Teste `Library - API - Index` falhando após simplificação do barrel file ✅
- **Arquivo:** `tests/unit/lib/api/index.test.js`
- **Problema:** Após a simplificação de `lib/api/index.js` (remoção de 47 exports nomeados), o teste importava `{ ApiError, success, validateBody, composeMiddleware }` como named exports, que não existiam mais. As 4 variáveis resultavam em `undefined`, causando falha em `expect(ApiError).toBeDefined()`.
- **Correção:** Substituída a importação dos 4 named exports por importação apenas do `default` (`import apiIndex from ...`). As asserções foram alteradas para acessar os símbolos via objeto default: `apiIndex.errors.ApiError`, `apiIndex.response.success`, `apiIndex.validate.validateBody`, `apiIndex.middleware.composeMiddleware`. Teste passa em ~3ms.

---

## 4. Problemas de Performance

### 4.1 Polyfills assíncronos podem causar race conditions ✅
- **Local:** `tests/setup.js` (anteriormente linhas 40-62), `tests/setup.db.js` (anteriormente linhas 27-49)
- **Problema:** Os polyfills de `ReadableStream` e `MessageChannel` usavam IIFE `async` com `await import()`, e o setup do Jest não aguardava essas promises. Se um teste dependesse desses polyfills e executasse antes da promise resolver, podia falhar de forma intermitente.
- **Correção:** Extraídos para `setupAsyncPolyfills()` em `tests/helpers/async-polyfills.js`. A função é aguardada pelo `jest.teardown.js` via `await setupAsyncPolyfills()`, garantindo resolução antes do processo finalizar.

### 4.2 `setTimeout` no polyfill de IntersectionObserver
- **Local:** `tests/setup.js` (linha 101)
- **Problema:** O mock de `IntersectionObserver` dispara `setTimeout(() => callback([{ isIntersecting: true }]), 0)` no construtor. Isso adiciona um microtask extra em cada instância do observer, potencialmente causando lentidão em componentes que usam lazy loading.
- **Sugestão:** Tornar o disparo opcional ou configurável.

### 4.3 Testcontainers com `withReuse(true)` pode causar conflitos
- **Local:** `tests/global-setup.db.js` (linha 16)
- **Problema:** `withReuse(true)` permite reutilizar o container entre execuções para performance, mas se restos de dados de execuções anteriores existirem, os testes podem falhar de forma imprevisível.
- **Sugestão:** Garantir que os testes de banco sempre limpem os dados (ex: `truncateAll` no setup de cada suite).

---

## 5. Ferramentas e Configuração

### 5.1 Ausência de ESLint específico para testes
- **Problema:** O arquivo `eslint.config.js` na raiz pode não ter regras específicas para a pasta `tests/`, como permissão para `jest` globals, `expect`, `describe`, `it`, etc.
- **Sugestão:** Adicionar configuração ESLint específica para `tests/` com as regras apropriadas.

### 5.2 Ausência de scripts npm para execução seletiva de testes
- **Problema:** Não há scripts no `package.json` para executar apenas testes de componentes, apenas testes de integração, apenas testes de banco, etc.
- **Sugestão:** Adicionar scripts como:
  ```json
  "test:unit": "jest --testPathPattern='tests/unit/'",
  "test:integration": "jest --testPathPattern='tests/integration/'",
  "test:db": "jest --config jest.config.db.js --testPathPattern='tests/integration/domain/'"
  ```

### 5.3 Ausência de configuração de timeout para testes de banco
- **Problema:** Testes com Testcontainers podem levar mais de 30s para iniciar o container na primeira execução. Sem timeout adequado, o Jest pode abortar prematuramente.
- **Sugestão:** Configurar `testTimeout: 60000` no `jest.config.db.js`.

### 5.4 Ausência de `jest.teardown.js` implementado
- **Problema:** O arquivo `jest.teardown.js` existe na raiz, mas não foi analisado. Se estiver vazio ou subutilizado, poderia ser usado para parar o container PostgreSQL após os testes.
- **Sugestão:** Verificar e implementar teardown para o container PostgreSQL.

---

## 6. Cobertura e Lacunas

### 6.1 Ausência de testes para hooks customizados
- **Problema:** Os hooks em `hooks/` (useAdminAuth, useAdminCrud, useApiFetch, useAuth, useDebounce, usePerformanceMetrics, useTheme, useThrottle) não têm testes unitários dedicados. Existem apenas `tests/unit/lib/` para funções de lib e `tests/unit/components/` para componentes.
- **Sugestão:** Criar `tests/unit/hooks/` com testes para cada hook customizado.

### 6.2 Ausência de testes para páginas completas
- **Problema:** As páginas em `pages/` (index.js, admin.js, design-system.js, etc.) não têm testes de renderização completos. Apenas `[slug].test.js` e `index.test.js` existem.
- **Sugestão:** Adicionar testes de renderização para as páginas principais.

### 6.3 Ausência de testes de acessibilidade (a11y)
- **Problema:** Não há testes de acessibilidade (ex: `jest-axe`) em nenhum componente.
- **Sugestão:** Adicionar testes de acessibilidade aos componentes de UI e páginas principais.

### 6.4 Cobertura insuficiente de testes de scripts
- **Problema:** A pasta `tests/unit/scripts/` tem 9 arquivos, mas a pasta `scripts/` tem mais de 30 arquivos. Scripts como `check-server.js`, `check-db-status.js`, `check-env.js`, `generate-load-report.js`, etc., não têm testes.
- **Sugestão:** Priorizar testes para scripts críticos de manutenção e diagnóstico.

### 6.5 Ausência de testes de integração para Webhooks/APIs externas
- **Problema:** Os endpoints `fetch-ml`, `fetch-spotify`, `fetch-youtube` são testados apenas com mocks. Não há testes de integração reais ou contrato com essas APIs externas.
- **Sugestão:** Considerar testes de contrato (ex: Pact) ou testes de integração com sandboxes oficiais das plataformas.

---

## 7. Documentação e Legibilidade

### 7.1 JSDoc inconsistente nos testes
- **Problema:** Alguns arquivos têm JSDoc completo (`factories/post.js`, `helpers/api.js`), outros têm JSDoc parcial ou ausente (`tests/mocks/db.js` tem 235 linhas sem documentação de funções).
- **Sugestão:** Padronizar a documentação JSDoc para todas as funções exportadas em `tests/helpers/`, `tests/mocks/` e `tests/factories/`.

### 7.2 Descrições de teste em português e inglês misturadas
- **Problema:** A maioria dos testes usa descrições em português, mas algumas usam inglês (ex: `next.test.js` usa "should export useRouter as function"). Isso é inconsistente.
- **Sugestão:** Padronizar para português (idioma do projeto) ou inglês (idioma padrão de testes).

### 7.3 Testes com nomes genéricos
- **Problema:** Arquivos como `posts.flow.test.js`, `musicas.integration.test.js` e `videos.integration.test.js` têm nomes genéricos que não revelam o escopo específico do teste.
- **Sugestão:** Renomear para nomes mais descritivos como `posts.full-crud-flow.test.js`, `musicas.with-db-mocks.test.js`.

---

## Resumo das Ações Prioritárias

| Prioridade | Categoria | Item | Impacto |
|------------|-----------|------|---------|
| 🔴 Alta | Duplicidade | Unificar `db-module.js` e `db.js` | Reduz confusão e manutenção duplicada |
| 🔴 Alta | Performance | Race conditions em polyfills assíncronos | Testes intermitentes |
| 🔴 Alta | Ferramentas | Timeout para testes de banco | Falhas em CI |
| 🟡 Média | Estrutura | Mover `tests/integration/api/audit.test.js` | Organização |
| 🟡 Média | Cobertura | Testes para hooks customizados | Lacuna de cobertura |
| ✅ 🟡 Média | Código | Polyfill `URL.revokeObjectURL` em `tests/setup.js` | Corrige falha intermitente em `AdminAudit.test.js` |
| 🟡 Média | Código | Remover `setupNextMocks()` deprecated | Limpeza de código |
| 🟡 Média | Documentação | Padronizar descrições de teste (pt-BR) | Consistência |
| 🟢 Baixa | Performance | `console.log` nos setups | Ruído em CI |
| 🟢 Baixa | Estrutura | Scripts npm para testes seletivos | Produtividade |
| 🟢 Baixa | Documentação | JSDoc inconsistente em mocks | Legibilidade |