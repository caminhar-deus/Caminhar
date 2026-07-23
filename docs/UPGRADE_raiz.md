# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento lista correções possíveis, ajustes estruturais, melhorias de manutenção/performance e pontos de atenção identificados nos arquivos da raiz do projeto, em `/home/qa/Projeto/Caminhar/`. Itens marcados como ✅ foram implementados.

---

## 1. `package.json`

### ✅ Descrição do projeto preenchida
O campo `"description"` foi preenchido com `"Plataforma web de conteúdo católico com Next.js"`.

### ✅ Campo `author` preenchido
O campo `"author"` foi preenchido com `"Comunidade Caminhar <contato@caminhar.com.br>"`.

### ✅ Scripts de carga centralizados no orquestrador
Os 30 scripts individuais de teste de carga (`k6 run <arquivo>`) foram removidos. Foram mantidos apenas os 4 scripts que utilizam o orquestrador (`test:load:all`, `test:load:all:log`, `test:load:orchestrator`, `test:load:safe`) e o script de relatório (`report:load`). O orquestrador `scripts/run-all-load-tests-sequentially.js` já executa todos os testes de carga em 3 categorias (Performance, Functional, Security).

### ✅ `overrides` documentados com `_overridesReason`
Foi adicionado o campo `_overridesReason` com explicações individuais para cada override: `tar` (CVE), `glob` (compatibilidade), `minimatch` (CVE/performance), `postcss` (compatibilidade Next.js), `uuid` (segurança), `whatwg-encoding` (CVE).

---

## 2. `next.config.js`

### ✅ HSTS com `preload`
O HSTS foi atualizado para incluir a diretiva `preload`: `max-age=31536000; includeSubDomains; preload`.

### ✅ CORS segmentado por grupo de endpoints
O CORS foi segmentado em 4 blocos: `/api/:path*` (público, com lista completa de `ALLOWED_ORIGINS`), `/api/admin/:path*`, `/api/auth/:path*` e `/api/helper/:path*` (restritos à primeira origem de `ALLOWED_ORIGINS`).

---

## 3. `next-sitemap.config.js`

### ✅ Duplicidade de configuração de frequência/prioridade eliminada
Os objetos `changefreq` e `priority` do escopo raiz e a função `transform` foram removidos. A configuração de frequência/prioridade agora é definida apenas no bloco `additionalPaths` para URLs dinâmicas. O `autoLastmod: true` foi mantido para adição automática de `lastmod`.

### ✅ Queries ao banco com logging padronizado
O bloco `additionalPaths` agora utiliza `logger.error` do módulo `lib/logger.js` em vez de `console.warn`, padronizando o logging com o restante do projeto. Foi adicionado comentário `TODO` indicando ponto futuro para integração com sistema de notificação (e-mail/Slack/webhook).

---

## 4. `proxy.js`

### ✅ Logging padronizado com `logger.warn`
O `console.warn` fixo foi substituído por `logger.warn('Security', ...)` do módulo `lib/logger.js`, que suporta níveis configuráveis via `LOG_LEVEL`. Foi adicionado o import `import { logger } from './lib/logger.js'`.

### 🟡 Falta de suporte a WebSocket
O rate limit não cobre conexões WebSocket. Se o projeto vier a usar WebSockets, será necessário estender a proteção.
- Suspendido: não há uso atual de WebSockets no projeto.

### 🔴 ~~Nome do arquivo inconsistente com a convenção~~ (Item invalidado)
**Este item estava incorreto.** O Next.js 16.2.10 (versão utilizada pelo projeto) **depreciou** a convenção `middleware.js` e agora exige o arquivo nomeado como `proxy.js`. O nome `proxy.js` é o correto. Confirmado via `npm run dev` — o Next.js executa o arquivo e emite o warning `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` se outro nome for usado.

---

## 5. `.env` e `.env.example`

### ✅ Senhas e tokens substituídos por placeholders no `.env`
O `.env` agora contém apenas placeholders (ex.: `SUA_SENHA_AQUI`, `sua-chave-jwt-aqui`). Os valores reais foram removidos e devem ser gerenciados via secrets.

### ✅ Permissão do `.env` ajustada para 600
O `.env` teve a permissão alterada de `-rwxr-xr-x` (755) para `-rw-------` (600) via `chmod 600 .env`.

### ✅ `.env.example` convertido para template com placeholders
O `.env.example` agora contém apenas placeholders (ex.: `JWT_SECRET="sua-chave-jwt-aqui"`), servindo como template seguro para novos desenvolvedores.

---

## 6. `jest.config.js`

### ✅ `maxWorkers` alterado de `1` para `'50%'`
O valor foi alterado de `maxWorkers: 1` para `maxWorkers: '50%'`, permitindo paralelismo proporcional aos CPUs disponíveis. O comentário foi atualizado para refletir a nova estratégia. O script `test:ci` no `package.json` teve o `--maxWorkers=1` removido para centralizar o controle no config. O mesmo ajuste foi aplicado ao `jest.config.db.js`.

### ✅ `transformIgnorePatterns` documentado com comentário
Foi adicionado comentário explicativo indicando que a lista de pacotes ESM deve ser mantida atualizada sempre que uma nova dependência ESM pura for adicionada.

---

## 7. `jest.config.db.js`

### ✅ Duplicação com `jest.config.js` eliminada via composição
Foi criado o arquivo `jest.config.base.js` com as propriedades comuns (`transform`, `moduleNameMapper`, `moduleFileExtensions`, `clearMocks`, `restoreMocks`, `verbose`, `maxWorkers`). Ambos `jest.config.js` e `jest.config.db.js` agora importam a base e estendem com propriedades específicas, eliminando a duplicação de configuração.

---

## 8. `jest.teardown.js`

### ✅ Aguardo fixo de 1 segundo substituído por espera ativa com timeout de segurança
O `await new Promise(resolve => setTimeout(resolve, 1000))` foi substituído por `Promise.race` entre `setImmediate` e um timeout de 5s, eliminando a espera fixa desnecessária.

### ✅ Import do Redis corrigido
O import `import { redis }` (sempre `null`) foi substituído por `import { getRedisInstance }`, permitindo fechar a conexão Redis quando houver instância ativa.

### ✅ Limpeza do timer de cache adicionada
Adicionado `import { cleanupRateLimitTimer }` e chamada no início do teardown para limpar o `setInterval` de safety net do cache.

### ✅ Aguardo de polyfills assíncronos adicionado
Adicionado `import { setupAsyncPolyfills }` e `await setupAsyncPolyfills()` no início do teardown para garantir que promises de polyfills assíncronos resolvam antes do processo finalizar.

---

## 9. `eslint.config.js`

### ✅ Regra `react/prop-types` removida
`"react/prop-types": "off"` foi removido do `eslint.config.js`. A regra era inócua pois o `eslint-plugin-react` não está configurado no projeto. O projeto **utiliza PropTypes** em 14 componentes (ex.: `BaseCard`, `Spinner`, `Container`, `Stack`, `AdminCrudBase`, campos de formulário, etc.), e o pacote `prop-types` permanece como dependência em `package.json`.

### ✅ Regras CSS reativadas parcialmente
`css/use-baseline` e `css/no-important` foram reativadas (herdadas de `css/recommended`). `css/no-invalid-properties` permanece desligado (`"off"`) devido a limitação do `@eslint/css` que não reconhece variáveis CSS customizadas (`--spacing-*`, `--color-*`, `--font-*`) como valores válidos, gerando ~1243 falsos positivos.

---

## 10. `schema.knip.json`

### 🟡 Arquivo muito grande na raiz (986 linhas)
Schema de validação do Knip embutido localmente. Recomenda-se substituir pela referência ao schema oficial online (`https://json.schemastore.org/knip.json`).

---

## 11. `skills-lock.json`

### 🟡 Arquivo muito grande na raiz (~945 linhas)
Lockfile de skills de IA. Recomenda-se mover para um diretório como `.agents/` ou `config/`.

---

## 12. `tree.txt`

### 🟡 Snapshot estático desatualizado
1151 linhas com estrutura de diretórios que tende a desatualizar. Recomenda-se remover ou adicionar script para gerá-lo dinamicamente (`npm run generate-tree`).

---

## 13. `ci.yml`

### 🟡 Workflow muito simples, sem cache
Executa apenas checkout, setup e testes, sem cache de dependências. Os outros workflows têm estruturas mais completas com cache.

---

## 14. `pr-coverage.yml`

### 🟡 Nome do job enganoso
O nome é `"Enforce >20% Test Coverage (Baseline)"`, mas o threshold real no `jest.config.js` é de 80%/85%/90%/90%. O nome pode induzir a erro.

---

## 15. `load-tests.yml` e `security-tests.yml`

### 🟡 Duplicação de configuração entre workflows
Blocos quase idênticos de serviços PostgreSQL/Redis, steps de setup, build e start da aplicação aparecem em 3 workflows. Poderiam ser extraídos para uma Composite Action reutilizável.

### 🟡 Duplicidade de health checks do PostgreSQL
`--health-cmd pg_isready`, `--health-interval 10s`, `--health-timeout 5s`, `--health-retries 5` aparecem identicamente em 3 workflows.

### 🟡 Duplicidade de health checks do Redis
`--health-cmd "redis-cli ping"`, `--health-interval 10s`, `--health-timeout 5s`, `--health-retries 5` aparecem identicamente em 3 workflows.

---

## 16. `GEMINI.md`

### 🟡 Caminhos relativos podem quebrar
O arquivo referencia `.agents/skills/...` que funcionam quando o diretório de trabalho é a raiz, mas podem falhar se o assistente for invocado de outro diretório.

---

## 17. Pontos de Atenção Técnicos

### 🔴 Arquivos `.env` com credenciais reais
Qualquer commit acidental do `.env` expõe toda a infraestrutura. Configurar um hook de pre-commit que bloqueie arquivos `.env` é recomendado.

### 🟡 Proliferação de arquivos grandes na raiz
`schema.knip.json` (986 linhas), `skills-lock.json` (945 linhas), `tree.txt` (1151 linhas) e `package-lock.json` (~15k linhas) poluem a raiz. Manter a raiz enxuta melhora a navegabilidade.

---

## Resumo das Melhorias Identificadas

| Prioridade | Arquivo | Problema | Sugestão |
|------------|---------|----------|----------|
| ✅ 🟡 Média | `proxy.js` | Logging sem nível de severidade | Substituído por `logger.warn` |
| 🔴 Alta | ~~`proxy.js`~~ | ~~Nome inconsistente com Next.js~~ | ~~Item invalidado — `proxy.js` é a convenção atual do Next.js 16~~ |
| ✅ 🔴 Alta | `.env.example` | Contém valores reais | Substituído por placeholders |
| ✅ 🔴 Alta | `.env` | Credenciais em texto claro | Substituído por placeholders + permissão 600 |
| ✅ 🟡 Média | `jest.config.js` | `maxWorkers: 1` lento | Alterado para `'50%'` + documentado `transformIgnorePatterns` |
| ✅ 🟡 Média | `jest.config.db.js` | Duplicação com `jest.config.js` | Composição via `jest.config.base.js` |
| ✅ 🟡 Média | `jest.teardown.js` | Timeout fixo de 1s + import Redis incorreto | Substituído por Promise.race com setImmediate + timeout 5s |
| 🟡 Média | `schema.knip.json` | 986 linhas na raiz | Referenciar schema oficial |
| 🟡 Média | `skills-lock.json` | ~945 linhas na raiz | Mover para `.agents/` |
| 🟡 Média | `tree.txt` | Snapshot estático desatualizado | Remover ou gerar dinamicamente |
| 🟡 Média | Workflows YML | Duplicação de blocos (3x) | Extrair para Composite Action |
| ✅ 🟡 Média | `eslint.config.js` | Regras `react/prop-types` e CSS | Removido `react/prop-types` (inócuo) + Reativadas `css/use-baseline` e `css/no-important` |
| ✅ 🟡 Média | `next-sitemap.config.js` | Duplicidade changefreq/priority | Simplificada |
| 🟡 Média | `pr-coverage.yml` | Nome do job enganoso | Corrigir nome |
| ✅ 🟡 Média | `package.json` | Campos vazios | Preenchido description/author |
| ✅ 🟡 Média | `package.json` | 88 scripts (34 de carga) | Centralizados no orquestrador |
| ✅ 🟡 Média | `package.json` | Overrides sem comentários | Documentados via _overridesReason |
| ✅ 🟢 Leve | `next.config.js` | HSTS sem `preload` | Adicionar diretiva |
| ✅ 🟢 Leve | `next.config.js` | CORS genérico para toda a API | Segmentar por grupo de endpoints |
| 🟢 Leve | `ci.yml` | Sem cache de dependências | Adicionar cache npm |

