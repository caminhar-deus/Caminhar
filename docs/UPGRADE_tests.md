# Relatório de Upgrade — Testes (`/tests/`)

> **Data:** 02/08/2026
> **Objetivo:** Levantamento analítico de melhorias possíveis na infraestrutura de testes, sem aplicar nenhuma alteração no projeto.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Duplicidade de Textos/Conteúdos](#2-duplicidade-de-textosconteúdos)
3. [Correções de Código](#3-correções-de-código)
4. [Ajustes Estruturais e Organizacionais](#4-ajustes-estruturais-e-organizacionais)
5. [Melhorias de Ferramenta, Manutenção e Performance](#5-melhorias-de-ferramenta-manutenção-e-performance)
6. [Pontos de Atenção Técnica](#6-pontos-de-atenção-técnica)
7. [Resumo das Ações Recomendadas](#7-resumo-das-ações-recomendadas)
8. [Implementações Aplicadas](#8-implementações-aplicadas)

---

## 1. Duplicidade de Código

### 1.1 Padrão CRUD Repetido em Testes de Integração

**Ocorrência:** `tests/integration/api/` — `musicas.test.js`, `videos.test.js`, `posts.test.js`, `products.test.js`

**Descrição:** Os testes de API seguem o mesmo padrão estrutural (criação de mocks, verificação de status, extração de dados). Embora já exista o helper `tests/helpers/crud-test.js` com `testPublicGetEndpoint`, `testAdminCrudEndpoint` e `testAdminGetEndpoint`, nem todos os arquivos de integração o utilizam.

**Sugestão:** Expandir o uso do `crud-test.js` para os demais arquivos de integração que ainda repetem o boilerplate de 405/401/400 manualmente.

### 1.2 Repetição de Setup/Teardown em Testes Unitários

**Ocorrência:** Presente em vários arquivos em `tests/unit/components/`, `tests/unit/scripts/`, `tests/unit/domain/`, `tests/unit/lib/`, `tests/unit/pages/api/`

**Descrição:** Muitos arquivos ainda repetem o padrão de `beforeEach` com `jest.clearAllMocks()` e supressão de `console.error` via substituição global, apesar de o `jest.config.js` já possuir `clearMocks: true` e o `tests/setup.js` já executar `jest.clearAllMocks()` no `afterEach` global.

**Sugestão:** Remover chamadas redundantes de `jest.clearAllMocks()` e padronizar a supressão de `console.error` usando os helpers centralizados de `tests/helpers/console.js` (`suppressConsoleError()`, `filterConsoleError()`).

### 1.3 Dados de Teste Inline vs. Factories

**Ocorrência:** Vários arquivos de teste criam dados manualmente em vez de usar as factories de `tests/factories/`.

**Descrição:** Muitos testes inline criam objetos de post, música, vídeo ou usuário manualmente, duplicando a estrutura de dados.

**Sugestão:** Substituir gradualmente os dados inline por factories centralizadas (`postFactory`, `musicFactory`, `videoFactory`, `userFactory`), como já feito em 4 arquivos de integração.

### 1.4 Mocks de Módulos Repetidos

**Ocorrência:** `tests/integration/api/` e `tests/unit/pages/api/`

**Descrição:** Alguns arquivos ainda mockam `lib/db.js`, `lib/auth.js` e `lib/cache.js` com factory functions inline, em vez de usar os mocks centralizados de `tests/mocks/` (`mockDb`, `mockAuthModule`, `mockCacheModule`).

**Sugestão:** Padronizar todos os arquivos para usar os mocks centralizados, reduzindo duplicação e garantindo consistência.

---

## 2. Duplicidade de Textos/Conteúdos

### 2.1 Filtro de Warnings Duplicado

**Ocorrência:** `tests/setup.js` e `tests/setup.db.js`

**Descrição:** Ambos os arquivos definem o mesmo filtro de `console.error` para os warnings conhecidos da API (`'API /api/posts retornou conteúdo inválido'` e `'Isso geralmente significa que a rota API quebrou'`).

**Sugestão:** Extrair a lista de warnings conhecidos para um módulo compartilhado (ex: `tests/helpers/console.js`) e importar em ambos os setups.

### 2.2 Documentação de Boas Práticas Duplicada

**Ocorrência:** `tests/examples/component-example.test.js` (comentários de boas práticas no final)

**Descrição:** O arquivo de exemplo contém um bloco extenso de boas práticas de teste que poderia ser centralizado em um documento ou README dedicado.

**Sugestão:** Mover as boas práticas para um `tests/README.md` ou manter apenas referências no exemplo.

---

## 3. Correções de Código

### 3.1 Testes com Componentes Simulados em vez de Reais

**Ocorrência:** `tests/unit/[slug].test.js`, `tests/unit/index.test.js`, `tests/unit/clean-test-db.test.js`, `tests/unit/settings.cache.test.js`

**Descrição:** Estes arquivos definem componentes ou funções simuladas localmente (ex: `BlogPost`, `BlogIndex`, `cleanTestDb`, `handler`) em vez de importar os componentes/funções reais do projeto. Isso significa que os testes não validam o código de produção real.

**Sugestão:** Importar os componentes reais de `components/` e `pages/` e as funções reais de `scripts/` e `lib/`, mockando apenas as dependências. Isso garante que os testes reflitam o comportamento real do código.

### 3.2 Uso de `require()` em Ambiente ES Module

**Ocorrência:** `tests/helpers/render.js` (linha 149: `const { Toaster } = require('react-hot-toast');`)

**Descrição:** O projeto segue o padrão ES Modules (import/export), mas este arquivo usa `require()`.

**Sugestão:** Substituir por `import { Toaster } from 'react-hot-toast';` no topo do arquivo.

### 3.3 Função `setupNextMocks` Deprecated

**Ocorrência:** `tests/mocks/next.js` (linha 205)

**Descrição:** A função `setupNextMocks` está marcada como `@deprecated`, mas ainda existe no código.

**Sugestão:** Considerar a remoção da função deprecated para evitar uso acidental, ou manter apenas com documentação clara.

### 3.4 Teste de Sanidade dos Mocks do Next.js

**Ocorrência:** `tests/mocks/next.test.js`

**Descrição:** O teste de sanidade verifica os mocks do Next.js, mas pode quebrar silenciosamente se a API do Next.js mudar.

**Sugestão:** Manter este teste atualizado sempre que a versão do Next.js for atualizada, conforme já documentado no próprio arquivo.

---

## 4. Ajustes Estruturais e Organizacionais

### 4.1 Nomenclatura de Arquivos de Teste

**Ocorrência:** `tests/integration/api/` e `tests/unit/pages/api/`

**Descrição:** Existe uma mistura de nomenclatura: alguns arquivos usam dot notation (`musicas.create.test.js`, `posts.create.api.test.js`) e outros usam nomes simples (`musicas.test.js`, `posts.test.js`). Também há arquivos com sufixos variados (`*.api.test.js`, `*.flow.test.js`, `*.general.test.js`, `*.integration.test.js`).

**Sugestão:** Padronizar a nomenclatura para dot notation consistente, definindo convenções claras para sufixos (ex: `.create.test.js`, `.update.test.js`, `.delete.test.js`, `.flow.test.js`).

### 4.2 Separação de Testes de Integração e Unitários

**Ocorrência:** `tests/unit/pages/api/` contém testes de edge cases de API routes

**Descrição:** Testes de API routes estão em `tests/unit/pages/api/`, mas poderiam ser considerados testes de integração, já que testam handlers completos.

**Sugestão:** Avaliar se os testes de `tests/unit/pages/api/` deveriam ser movidos para `tests/integration/api/` ou se a separação atual é intencional (unit = edge cases, integration = fluxos completos).

### 4.3 Subpastas Vazias

**Ocorrência:** `tests/unit/scripts/diagnostics/`, `tests/unit/scripts/maintenance/`, `tests/unit/scripts/migrations/`

**Descrição:** Estas subpastas existem mas não contêm arquivos de teste.

**Sugestão:** Remover as subpastas vazias ou adicionar testes para os scripts correspondentes em `scripts/diagnostics/`, `scripts/maintenance/` e `scripts/migrations/`.

---

## 5. Melhorias de Ferramenta, Manutenção e Performance

### 5.1 Cobertura de Testes para Scripts

**Ocorrência:** `scripts/` contém muitos scripts utilitários, mas apenas alguns têm testes em `tests/unit/scripts/`.

**Descrição:** Scripts como `check-db-status.js`, `check-env.js`, `check-server.js`, `check-sql-injection.js`, `clean-k6-reports.js`, `clean-load-test-posts.js`, `clear-cache.js`, `clear-test-auth-locks.js`, `create-backup.js`, `db-shell.js`, `generate-load-report.js`, `init-backup.js`, `init-server.js`, `monitor-disk-space.js`, `restore-backup.js`, `run-all-load-tests-sequentially.js`, `seed-musicas.js`, `seed-posts.js`, `seed-products.js`, `seed-settings.js`, `seed-videos.js`, `view-backup-logs.js`, `warm-routes.js` não possuem testes unitários.

**Sugestão:** Adicionar testes para os scripts mais críticos (backup, restore, seed, clear-db).

### 5.2 Cobertura de Testes para Componentes de UI

**Ocorrência:** `tests/unit/components/UI/` contém 12 arquivos de teste (Alert, Badge, Button, Card, index, Input, Modal, Select, Spinner, TextArea, Toast + snapshot)

**Descrição:** A pasta de UI possui cobertura abrangente dos componentes. No entanto, é importante verificar se todos os componentes existentes em `components/UI/` possuem testes correspondentes, pois a lista de componentes pode evoluir.

**Sugestão:** Verificar periodicamente se novos componentes de UI adicionados em `components/UI/` possuem testes correspondentes em `tests/unit/components/UI/`.

### 5.3 Testes de Integração com Banco Real

**Ocorrência:** `tests/integration/domain/` contém 5 arquivos `*.db.test.js`

**Descrição:** Os testes com banco real dependem do Docker e do Testcontainers. Se o Docker não estiver disponível, os testes são ignorados.

**Sugestão:** Considerar adicionar um script de CI que execute os testes com banco real, e documentar os requisitos de ambiente.

### 5.4 Performance dos Testes

**Ocorrência:** `tests/setup.js` e `tests/setup.db.js`

**Descrição:** O `tests/setup.js` carrega muitos polyfills e configurações, o que pode impactar o tempo de inicialização de cada suite de teste.

**Sugestão:** Avaliar se todos os polyfills são realmente necessários, e considerar a criação de setups mais enxutos para suites específicas (como já feito com `setup.db.js`).

---

## 6. Pontos de Atenção Técnica

### 6.1 Dependência de `node-mocks-http`

**Descrição:** A maioria dos testes de API usa `node-mocks-http` via `createMocks`. É importante manter a versão atualizada e verificar compatibilidade com novas versões do Node.js.

### 6.2 Dependência de Testcontainers

**Descrição:** Os testes com banco real dependem do `@testcontainers/postgresql`. É importante verificar se a versão é compatível com o Docker instalado no ambiente de CI.

### 6.3 Mocks do Next.js

**Descrição:** Os mocks do Next.js em `tests/mocks/next-setup.js` são críticos para os testes de componentes. Qualquer mudança na API do Next.js pode quebrar silenciosamente os testes. O teste de sanidade `next.test.js` ajuda a detectar isso, mas deve ser executado regularmente.

### 6.4 Filtro de Warnings do `console.error`

**Descrição:** O filtro de warnings em `tests/setup.js` e `tests/setup.db.js` pode mascarar warnings legítimos que indicam problemas reais. É importante revisar periodicamente a lista de warnings filtrados.

### 6.5 Testes com Componentes Simulados

**Descrição:** Os testes em `tests/unit/[slug].test.js`, `tests/unit/index.test.js`, `tests/unit/clean-test-db.test.js` e `tests/unit/settings.cache.test.js` usam componentes/funções simuladas localmente, o que significa que não validam o código de produção real. Isso é um risco de manutenção, pois o código real pode divergir do simulado.

---

## 7. Resumo das Ações Recomendadas

| Prioridade | Ação | Esforço | Impacto |
|:----------:|------|:-------:|:-------:|
| 🔴 Alta | Corrigir testes com componentes simulados para usar componentes reais | Alto | Alto |
| 🔴 Alta | Padronizar mocks de módulos usando `tests/mocks/` centralizados | Médio | Médio |
| 🟡 Média | Remover `jest.clearAllMocks()` redundante e padronizar supressão de console | Baixo | Médio |
| 🟡 Média | Substituir dados inline por factories | Baixo | Baixo |
| 🟡 Média | Padronizar nomenclatura de arquivos de teste | Médio | Médio |
| 🟡 Média | Adicionar testes para scripts críticos | Alto | Alto |
| 🟡 Média | Verificar cobertura de componentes de UI | Médio | Médio |
| 🟢 Baixa | Extrair filtro de warnings duplicado para módulo compartilhado | Baixo | Baixo |
| 🟢 Baixa | Substituir `require()` por `import` em `render.js` | Muito Baixo | Nulo |
| 🟢 Baixa | Remover subpastas vazias ou adicionar testes | Baixo | Baixo |
| 🟢 Baixa | Remover função deprecated `setupNextMocks` | Muito Baixo | Nulo |

---

## 8. Implementações Aplicadas

Os itens abaixo foram implementados após a elaboração deste relatório. As recomendações das seções 1–7 permanecem válidas para revisão e priorização futura.

### 8.1 Supressão de log de erro intencional no teste do fetch-youtube

**Arquivo:** `tests/integration/api/admin/fetch-youtube.test.js`

**Descrição:** Adicionado `jest.mock` de `lib/infra/logger.js` (com `error`, `warn`, `info`, `debug` e `success` como `jest.fn()`) e uma asserção de `logger.error` no teste de caminho de erro (500), impedindo que o log intencional `[AdminCrudHandler] ❌ Erro no handler ...` seja impresso na saída do Jest, mantendo o fluxo exercitado.

### 8.2 Expansão de cobertura para arquivos sem cobertura

**Arquivos:**
- `tests/integration/api/auth/refresh.test.js` → `pages/api/auth/refresh.js`
- `tests/integration/api/admin/integrity.test.js` → `pages/api/admin/integrity.js`
- `tests/unit/lib/domain/products.test.js` → `lib/domain/products.js`
- `tests/unit/lib/infra/redis.test.js` → `lib/infra/redis.js`

**Descrição:** Adicionados testes cobrindo módulos que estavam em 0% de cobertura, elevando a cobertura global para atender os `coverageThreshold` do `jest.config.js` (statements/lines ≥ 90%, functions ≥ 85%, branches ≥ 80%), com `npm run test:coverage` retornando status 0.

### 8.3 Supressão de log de erro intencional no teste de dicas

**Arquivo:** `tests/integration/api/admin/dicas.test.js`

**Descrição:** Nos testes de caminho de erro (500) de GET, POST, PUT e DELETE, adicionado `jest.spyOn(console, 'error').mockImplementation(() => {})` para suprimir o log intencional `[AdminCrudHandler] ❌ Erro no handler Dica:` da saída do Jest, e `jest.spyOn(logger, 'error')` com asserção de `logger.error` para validar que o erro continua sendo registrado, mantendo o fluxo exercitado. Padrão consistente com a supressão de `console.error` já usada em `posts`, `musicas` e `settings` e com a asserção de `logger.error` do `fetch-youtube`.

### 8.4 Eliminação de erro falso no teste das operações de backup

**Arquivo:** `tests/unit/lib/backup/backup.operations.test.js`

**Descrição:** Adicionado `fs.promises.opendir.mockResolvedValue(createAsyncDirIterator([]))` no `beforeEach`, definindo um iterador assíncrono vazio padrão para o mock de `fs.promises.opendir`. Em testes de `createBackup` que não configuravam explicitamente o `opendir`, o mock retornava `undefined`, fazendo `getBackupFiles`/`cleanupOldBackups` lançarem um `TypeError: Cannot read properties of undefined (reading 'Symbol(Symbol.asyncIterator)')` redundante, impresso como `console.error` "Erro ao limpar backups antigos". Com o mock padrão, o fluxo nominal de limpeza é exercitado sem exceção.

### 8.5 Eliminação de falso alerta no teste de validação de schema do banco

**Arquivo:** `tests/unit/scripts/validate-schema.test.js`

**Descrição:** No cenário "deve validar schema corretamente com tabelas existentes", o mock de `pg.mockQuery` passou a responder **condicionalmente pelo SQL**: para `SELECT EXISTS` retorna `{ rows: [{ exists: true }] }`, para a consulta de colunas (`information_schema.columns`) retorna as colunas esperadas do `EXPECTED_SCHEMA`, e para `SELECT 1` retorna `{ rows: [{ '?column?': 1 }] }`. A asserção foi endurecida de `expect(typeof result).toBe('boolean')` para `expect(result).toBe(true)`, com verificação adicional de que nenhum `console.error` de "Tabela faltando" é emitido. O `jest.isolateModules(async () => {...})` foi substituído por import dinâmico direto com `await`, garantindo espera determinística da Promise. Com isso, o ramo de sucesso do `validateSchema` (que antes emitia o falso alerta "⚠️ O banco de dados apresenta inconsistências com o código." e nunca era exercitado de fato) passa a ser validado corretamente.

### 8.6 Supresão de log de erro intencional no teste de vídeos

**Arquivo:** `tests/integration/api/videos.test.js`

**Descrição:** No teste do caminho de erro (500) que propaga um erro de rate limit, adicionado `jest.spyOn(console, 'error').mockImplementation(() => {})` para suprimir o log intencional `[Videos] ❌ Erro ao buscar vídeos públicos:` da saída do Jest, e `jest.spyOn(logger, 'error')` com asserção de `logger.error` para validar que o erro continua sendo registrado, mantendo o fluxo exercitado.

### 8.7 Padrão CRUD repetido em testes de integração

**Arquivos:**
- `tests/helpers/crud-test.js`
- `tests/integration/api/posts.test.js`
- `tests/integration/api/videos.test.js`

**Descrição:** Expandido o uso do `crud-test.js` para `tests/integration/api/posts.test.js`, que ainda repetia o boilerplate de 405/401/400 manualmente. Adicionada a opção `skipMethodNotAllowed` em `testPublicGetEndpoint` para suprimir o teste padrão de 405 em endpoints híbridos (ex: `/api/posts`, que aceita POST autenticado — sem token retorna 401, não 405); os testes específicos de posts foram movidos para `customTests`, preservando todas as asserções existentes. Em `tests/integration/api/videos.test.js`, removida a chave `beforeEach` morta passada no `resourceConfig` (o helper a ignora; o `beforeEach` real já existia dentro de `customTests`).

### 8.8 Atualização do teste de `/api/placeholder-image` (revalidação 304 e cache interno)

**Arquivo:** `tests/integration/api/placeholder-image.test.js`

**Descrição:** O teste foi atualizado para acompanhar a implementação do endpoint: adicionado mock de `fs.promises.stat` (necessário ao `Last-Modified` baseado no `mtime`), isolado o cache interno do filename entre cenários via `jest.resetModules()` + import dinâmico, e incluído caso de teste para a resposta **304** quando o header `If-None-Match` corresponde ao ETag — validando que o arquivo não é relido do disco nesse cenário.
---

> **Nota:** Este documento é um relatório de análise. As ações listadas nas seções 1–7 são recomendações para revisão e priorização futura; a seção 8 registra as implementações aplicadas sobre o tema após a elaboração deste relatório.