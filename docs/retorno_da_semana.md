# Retorno Semanal — Auditoria Técnica do Projeto Caminhar

## 1. Identificação da auditoria
- **Data e horário da execução:** 23/11/2026, 09:00 (BRT) (`2026-11-23T09:00:56-03:00` / `2026-11-23T12:00:56Z`)
- **Período analisado:** 16/11/2026, 09:00 (BRT) a 23/11/2026, 09:00 (BRT) (últimos 7 dias móveis — `2026-11-16T12:00:56Z` a `2026-11-23T12:00:56Z`)
- **Fontes consultadas:**
  - Logs locais em `/home/gus/projetos/Caminhar/logs/`: `logs/tests-output.log` (283.953 bytes, 5.196 linhas, `mtime` 22/11/2026 17:16), `logs/coverage-output.log` (324.206 bytes, 5.367 linhas, `mtime` 22/11/2026 17:18) e `logs/eslint.log` (0 bytes, `mtime` 21/11/2026 18:09). *Limitação temporal registrada:* nenhum dos três arquivos contém timestamp de execução nem commit SHA gravados em seu texto (a única data encontrada no conteúdo, `23/10/2026`, pertence a fixture de teste); o enquadramento na janela de 7 dias foi corroborado pelos `mtime` de 21–22/11/2026 em conjunto com a presença explícita de suítes criadas no período de 16/11 a 22/11/2026 (`verify-mp-webhook.test.js`, `google-id-token.test.js`, `document-csp.test.js`, `css-tokens.test.js`, `jest-config.test.js`, `useAdminInactivityTimeout.test.js`, `adminSession.test.js`, `AdminSales.test.js`), complementado por execução ao vivo do ESLint em 23/11/2026.
  - Definições locais de workflows e actions do GitHub Actions: `.github/workflows/e2e.yml`, `.github/workflows/load-tests.yml`, `.github/workflows/test-base.yml`, `.github/workflows/test-coverage.yml`, `.github/workflows/test-db-coverage.yml`, `.github/actions/build-app/action.yml`, `.github/actions/setup/action.yml`, `.github/actions/setup-db/action.yml` e `scripts/diagnostics/check-github-actions.js`.
  - Verificadores estáticos read-only executados ao vivo em 23/11/2026: `npm run knip`, `npm run lint`, `npm run lint:chars` (785 arquivos), `npm run lint:workflows` (`actionlint 1.7.12` via cache local), `npm run security:check-sql` (264 arquivos), `npm run security:check-credentials` (102 arquivos) e `npm run models:check`.
  - Histórico Git na branch `main`: **40 commits** dentro da janela exata (`b37c9f1` de 16/11/2026 11:58 até `ee4ed2e` de 22/11/2026 17:18), sendo **33 commits posteriores** à última atualização registrada na auditoria de 16/11 (`01a4a3f`, 16/11/2026 15:14), além de 11 arquivos com alterações locais não commitadas pré-existentes no working tree (preservados intactos).
  - Documentação e arquivos investigados de forma direcionada: `AGENTS.md`, `docs/ARQUITETURA_SITE_PUBLICO.md` (atualizado em 23/11/2026), `docs/ARQUITETURA_SITE_PRIVADO.md` (atualizado em 23/11/2026), `docs/retorno_da_semana.md` (auditoria anterior de 16/11/2026), `package.json`, `jest.config.js`, `jest.config.base.js`, `jest.config.db.js`, código-fonte e testes citados na Seção 4.
  - **Limitação obrigatória — GitHub Actions remoto (RESOLVIDA via snapshot offline em 24/11/2026):** Embora a saída ao vivo de `api.github.com` permaneça bloqueada dentro do sandbox (`EAI_AGAIN`), em **24/11/2026 (`19:07:10.755Z`)** foi gerado em host com rede o snapshot auditável `logs/github-actions-snapshot.json` (`npm run diag:actions:snapshot`), validado em seguida por `check-github-actions.js` (`schemaVersion: 1`, `repo: caminhar-deus/Caminhar`, `pagesFetched: 2`, `truncated: false`, `0` segredos/tokens). O snapshot cobre **`139` execuções** na janela móvel de 7 dias (`17/11/2026 19:06Z` a `24/11/2026 19:07Z`), permitindo inspeção completa de todos os 4 workflows, jobs, steps e falhas históricas.
- **Situação geral da auditoria:** **Concluída integralmente (fontes locais + snapshot remoto do GitHub Actions validados em 24/11/2026).** Em 23/11/2026, os logs locais já não registravam falha de suíte ou asserção (`241 passed / 2.090 testes passando`), e os 6 gates estáticos locais rodaram com código 0. Após o confronto com o código (`ff57a203`), a blindagem estrutural anti-recorrência (`0ab2716e`) e a validação do snapshot remoto em **24/11/2026**, foram resolvidos todos os itens `OCOR-2026-11-23-01` a **`07`**, bem como **`Manutenção Preventiva 01`**: os logs locais passaram a **`244 suítes aprovadas (+8 .db ignoradas) / 2.141 testes aprovados (+96 .db ignorados)`** com **`0` erros/avisos de console/`act`/jsdom** e **`pages/api/auth/login.js` em 100%**, enquanto os **4 workflows do GitHub Actions estão 100% verdes em `0ab2716e`** (e nos últimos **22 runs consecutivos** pós-`1793f90f`, incluindo **`Test Coverage Gate (banco real)` Run `#176`** com as 8 suítes `.db.test.js` em PostgreSQL real, **`E2E Isolated (Cypress)` Run `#185`**, **`Lint & Test Coverage Gate` Run `#191`** com `Run Character Lint` e `Audit Dependencies`, e **`Load Tests (k6)` Run `#52`**). As **8 falhas históricas** encontradas no snapshot pertencem a 2 incidentes já corrigidos em `main` (`eaeb298d` e `1793f90f`), que geraram duas novas blindagens preventivas locais em 24/11/2026 (`extractErrorLinesFromJobLog` + `summarizeRunsByWorkflow` em `scripts/diagnostics/` e a guarda `tests/unit/tests-hygiene/package-lock-sync.test.js`). Permanecem abertas apenas as oportunidades evolutivas `5.6`, `5.7`, `5.8` e a ampliação de escopo/thresholds de `5.10`.

---

## 2. Resumo executivo
- **Principais ocorrências:** 7 registros classificados na janela de auditoria (`OCOR-2026-11-23-01` a `07`): **todos os 7 resolvidos em 24/11/2026** (incluindo **`OCOR-2026-11-23-07`**, com `[log-meta]` local e validação remota completa das `139` execuções via `logs/github-actions-snapshot.json`). Zero testes falharam localmente ou no `HEAD` remoto (`0ab2716e`).
- **Problemas críticos ou relevantes (Prioridade Alta) — Resolvidos em 24/11/2026:**
  1. **`OCOR-2026-11-23-03` (Resolvido e validado no CI remoto em 24/11/2026 — CI):** O step inalcançável `Audit Dependencies` (e as 3 condições mortas `inputs.test-type == 'coverage'`) foram removidos de `.github/workflows/test-base.yml`; `Run Character Lint` (`npm run lint:chars`) e `Audit Dependencies` (`npm audit --audit-level=high`, `continue-on-error: true`) foram portados para o job `lint` de `.github/workflows/test-coverage.yml` e executados com sucesso nos Runs `#190` (`ff57a203`) e `#191` (`0ab2716e`). Validado também localmente com `npm run lint:workflows` (`actionlint 1.7.12`, saída 0) e `tests/unit/github-workflows/test-coverage-comment.test.js` (`23 passed`).
  2. **`OCOR-2026-11-23-05` (Resolvido em 24/11/2026 — Autenticação):** `pages/api/auth/login.js` passou a validar `typeof req.body?.username === 'string' && typeof req.body?.password === 'string'` antes da desestruturação e a normalizar `username.trim().toLowerCase()` na chave do rate limit por usuário (alinhado ao `LOWER(username)` de `lib/auth/auth.js:244`). Novos testes unitários e de integração elevaram a cobertura do arquivo de `68,45% linhas / 72,72% branches` para **`100% Stmts | 100% Branch | 100% Funcs | 100% Lines`**, mantendo `bench-ground-truth.test.js` (`14/14 passed`).
- **Resultados satisfatórios e entregas validadas (23/11/2026–24/11/2026):**
  - **Execução local pós-validação remota (24/11/2026):** **`244 suítes aprovadas (+8 .db ignoradas localmente) / 2.141 testes aprovados (+96 .db ignorados)`** (6 snapshots aprovados), cobertura agregada de **95,73% Statements/Lines | 86,60% Branches | 93,37% Functions**, **`0` ocorrências de `console.error`/`console.warn`/`act(...)`/navegação jsdom** em `logs/tests-output.log` (`67,072 s`) e `logs/coverage-output.log` (`185,916 s` com `--maxWorkers=2`), além de `logs/eslint.log` limpo (`[log-meta]`, `sha=0ab2716e`).
  - **Validação remota via `logs/github-actions-snapshot.json` (`139` runs: `131 success`, `8 failure`, `truncated: false`):** todos os 4 workflows ativos — `Lint & Test Coverage Gate` (`#191`), `E2E Isolated (Cypress)` (`#185`), `Test Coverage Gate (banco real)` (`#176`) e `Load Tests (k6)` (`#52`) — concluíram com **`success` em `0ab2716e`** (22 execuções consecutivas verdes desde `1793f90f`), encerrando **`Manutenção Preventiva 01`**. As 8 falhas anteriores decorreram apenas de `bench-ground-truth.test.js` em `6e943325`/`554c0566` (corrigido em `eaeb298d`) e `npm ci` `EUSAGE` por dessincronia do `package-lock.json` em `ae84c187`/`d3d3e3de` (corrigido em `1793f90f` e agora bloqueado preventivamente por `tests/unit/tests-hygiene/package-lock-sync.test.js`).
  - **Refinamento no diagnóstico CI (`scripts/diagnostics/`):** o exame do snapshot revelou que `tailErrors` capturava specs `✓` aprovados do Jest e linhas do manual `npm help ci`; criado `extractErrorLinesFromJobLog` (filtragem de ruído com preservação do início e fim da falha) e `summarizeRunsByWorkflow` (tabela resumida por workflow).
  - Todos os gates estáticos locais passaram sem erros (`eslint .`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql`, `security:check-credentials`). `npm run models:check` retornou código `2` (`status: NÃO VERIFICADO`, `spawnSync opencode ENOENT`, esperado fora do host do OpenCode).
- **Oportunidades de melhoria (4 resolvidas, 1 parcial e 3 em aberto após 24/11/2026):** (`5.3`) **Resolvido** (`e2e.yml` validado remotamente), (`5.4`) **Resolvido**, (`5.5`) **Resolvido** (validado remotamente nos Runs `#190/#191`), (`5.9`) **Resolvido** (validado no snapshot real + extrator refinado), (`5.10`) **Parcialmente resolvido** (ruído zerado + nova guarda `package-lock-sync.test.js`; revisão de `collectCoverageFrom`/thresholds em aberto), permanecendo em aberto: (`5.6`) cobertura funcional de `components/Admin/AdminSales.js` (`32,25%` funcs), (`5.7`) cobertura de branches em rotas críticas de visitante/pagamento/integridade e (`5.8`) cobertura `*.db.test.js` para `categories`, `dicas`, `audit` e `images`.

---

## 3. Erros e ocorrências identificadas

### 3.1. Categoria: CI / Workflows do GitHub Actions

#### `OCOR-2026-11-23-03` — Step `Audit Dependencies` (`npm audit`) inalcançável em `test-base.yml`
- **Status:** **RESOLVIDO em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-03`
- **Natureza:** Erro confirmado (configuração de workflow)
- **Fonte:** Inspeção estática dos arquivos `.github/workflows/test-base.yml`, `.github/workflows/test-coverage.yml`, `.github/workflows/load-tests.yml`, `.github/workflows/e2e.yml` e `.github/actions/setup/action.yml`.
- **Data:** 23/11/2026 (confirmado no estado atual dos workflows; origem anterior à janela atual, quando o job `coverage` deixou de chamar `test-base.yml`) | 24/11/2026 (correção implementada).
- **Processo envolvido:** Auditoria automatizada de vulnerabilidades npm na esteira de CI.
- **Descrição:** O step `Audit Dependencies` (`npm audit --audit-level=high`) existia exclusivamente em `.github/workflows/test-base.yml` sob a condição `if: ${{ inputs.test-type == 'coverage' }}`. Como `test-coverage.yml` deixou de chamar `test-base.yml` e passou a usar `./.github/actions/setup` diretamente (com `npm ci --no-audit --no-fund`), nenhum workflow do repositório satisfazia `inputs.test-type == 'coverage'`.
- **Evidências:**
  - `.github/workflows/test-base.yml:470-474`: `Audit Dependencies` com `if: ${{ inputs.test-type == 'coverage' }}` e `continue-on-error: true`; o mesmo ocorria nos uploads de cobertura das linhas 581-599.
  - Busca em `.github/`: apenas `.github/workflows/load-tests.yml:258` referencia `uses: ./.github/workflows/test-base.yml`, passando `test-type: load`.
  - `.github/actions/setup/action.yml:34-46` e `.github/workflows/e2e.yml:69-80`: executam `timeout 20m npm ci --no-audit --no-fund`, justificando nos comentários que a auditoria fora movida para `Audit Dependencies` (então apontando para `test-base.yml`).
- **Arquivos relacionados:** `.github/workflows/test-base.yml`, `.github/workflows/test-coverage.yml`, `.github/actions/setup/action.yml`, `.github/workflows/e2e.yml`, `.github/workflows/test-db-coverage.yml`, `tests/unit/github-workflows/test-coverage-comment.test.js`.
- **Diagnóstico:** Erro de migração estrutural nos workflows: ao tornar `coverage` autocontido em `test-coverage.yml`, o step `Audit Dependencies` não havia sido portado, permanecendo como código morto condicional em `test-base.yml`.
- **Impacto:** Alto — vulnerabilidades conhecidas (`high`/`critical`) nas dependências de produção ou desenvolvimento deixavam de ser reportadas em pushes e pull requests na CI.
- **Prioridade:** **Alta**.
- **Ação Executada (24/11/2026):** Removidos os 3 blocos condicionais mortos `inputs.test-type == 'coverage'` de `.github/workflows/test-base.yml` e atualizadas as descrições dos inputs `test-type` e `skip-db-setup`; portado `Audit Dependencies` (`npm audit --audit-level=high`, `continue-on-error: true`) e adicionado `Run Character Lint` (`npm run lint:chars`) no job `lint` de `.github/workflows/test-coverage.yml`; atualizados os comentários de referência em `.github/actions/setup/action.yml`, `.github/workflows/e2e.yml` (com `timeout-minutes` elevado de `15` para `25`) e `.github/workflows/test-db-coverage.yml` (contagem para `8 arquivos *.db.test.js, 96 asserções`); adicionados 2 testes em `P1` de `tests/unit/github-workflows/test-coverage-comment.test.js`. Validado com `npm run lint:workflows` (`actionlint 1.7.12`, saída 0), `npx jest tests/unit/github-workflows/test-coverage-comment.test.js` (`23 passed`) e **confirmado remotamente nos Runs `#190` (`ff57a203`) e `#191` (`0ab2716e`) com conclusão `success`**.

---

### 3.2. Categoria: Segurança e Autenticação

#### `OCOR-2026-11-23-05` — Desestruturação desprotegida de `req.body` e falha de cobertura em proteções de `pages/api/auth/login.js`
- **Status:** **RESOLVIDO em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-05`
- **Natureza:** Risco identificado / Falha de cobertura de testes
- **Fonte:** `logs/coverage-output.log` (22/11/2026) cruzado com investigação direcionada de `pages/api/auth/login.js`, `tests/integration/api/auth/login.test.js`, `tests/integration/api/login.test.js` e `tests/unit/pages/api/auth/login.edge.test.js`.
- **Data:** 22/11/2026 (log de cobertura) e 23/11/2026 (inspeção de código) | 24/11/2026 (correção e testes implementados).
- **Processo envolvido:** Autenticação administrativa (`POST /api/auth/login`).
- **Descrição:** O handler de login apresentava três fragilidades combinadas (além de normalização case-sensitive na chave de rate limit por usuário detectada no confronto com `lib/auth/auth.js:244`): (1) desestruturação direta `const { username, password } = req.body;` fora do bloco `try/catch`; (2) baixa cobertura de linhas (**68,45%**) e branches (**72,72%**) deixando sem teste o rate limit real por IP, o backstop por usuário e o modo `?response=body`; e (3) testes de integração com mocks defasados/placebo.
- **Evidências:**
  - `logs/coverage-output.log` (22/11): `pages/api/auth/login.js | 68.45 | 72.72 | 100 | 68.45 | 31-34,51-59,83-88,93-94,97-98,106-129`.
  - `pages/api/auth/login.js:39`: executava antes do primeiro `try` (linha 63); se `req.body` viesse `undefined`/`null` ou com campos não string, lançava `TypeError` não tratado.
  - `pages/api/auth/login.js:82`: `checkRateLimit(username, ...)` diferenciava maiúsculas/minúsculas apesar de `lib/auth/auth.js:244` autenticar via `LOWER(username)`.
  - `tests/integration/api/auth/login.test.js:50-59` e `tests/integration/api/login.test.js:104-125`: IP ausente (`UNKNOWN_IP`) anulava o gate de IP e o teste de erro em `last_login_at` repetia o mock de sucesso.
- **Arquivos relacionados:** `pages/api/auth/login.js`, `tests/integration/api/auth/login.test.js`, `tests/integration/api/login.test.js`, `tests/unit/pages/api/auth/login.edge.test.js`, `tests/unit/scripts/bench-ground-truth.test.js`.
- **Diagnóstico:** A migração do rate limit de `lib/auth/auth.js` para `pages/api/auth/login.js` e a adição do backstop por usuário e modo `?response=body` não haviam sido acompanhadas da atualização dos testes de integração nem da guarda defensiva em `req.body`.
- **Impacto:** Alto — regressões no bloqueio de força bruta por IP ou por usuário, no contrato `?response=body` ou exceções para payloads malformados passavam despercebidas pela suíte.
- **Prioridade:** **Alta**.
- **Ação Executada (24/11/2026):** Blindada a linha 39 de `pages/api/auth/login.js` (`typeof req.body?.username === 'string' && typeof req.body?.password === 'string' ? req.body : {}`) e normalizada a linha 82 (`username.trim().toLowerCase()`), mantendo exatamente as 149 linhas e as âncoras `:19`, `:51`, `:82` de `scripts/bench/orchestrator/gabarito.md`. Adicionados testes completos de borda, rate limit real por IP e usuário, `untrustedForwarded`, `?response=body` e erro real em `last_login_at` em `login.edge.test.js`, `auth/login.test.js` e `login.test.js`. Cobertura em `pages/api/auth/login.js` elevada para **`100% Stmts | 100% Branch | 100% Funcs | 100% Lines`**, com `tests/unit/scripts/bench-ground-truth.test.js` (`14/14 passed`).

---

### 3.3. Categoria: Ferramental de Diagnóstico e Monitoramento

#### `OCOR-2026-11-23-04` — Truncamento silencioso na janela de 7 dias em `scripts/diagnostics/check-github-actions.js`
- **Status:** **RESOLVIDO e VALIDADO REMOTAMENTE em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-04`
- **Natureza:** Risco identificado (fragilidade no ferramental de auditoria)
- **Fonte:** Inspeção de `scripts/diagnostics/check-github-actions.js:156-166` cruzada com a cadência observada de commits (`git log`) e validação real do snapshot em 24/11/2026.
- **Data:** 23/11/2026 | 24/11/2026 (correção implementada e validada com 140 runs reais).
- **Processo envolvido:** Diagnóstico automatizado semanal do GitHub Actions (`npm run diag:actions`).
- **Descrição:** O script buscava apenas a primeira página fixa da API REST (`/repos/${REPO}/actions/runs?per_page=50`) sem paginação e sem filtro temporal `created=>=YYYY-MM-DD`, descartando silenciosamente runs mais antigos da própria semana quando havia mais de 50 execuções.
- **Evidências:** `scripts/diagnostics/check-github-actions.js:156` realizava chamada única com `per_page=50`; na coleta real de 24/11/2026 (`logs/github-actions-snapshot.json`), a janela de 7 dias retornou **`140` execuções (`pagesFetched: 2`, `139` na janela móvel)** — provando que `per_page=50` omitiria 89 execuções da própria semana.
- **Arquivos relacionados:** `scripts/diagnostics/check-github-actions.js`, `scripts/diagnostics/github-actions-helper.js`, `tests/unit/scripts/check-github-actions.test.js`.
- **Diagnóstico:** Implementação de consulta em página única insuficiente para semanas com fluxo intenso de commits.
- **Impacto:** Médio — auditorias semanais omitiriam falhas ocorridas no início da janela de 7 dias sem aviso de truncamento.
- **Prioridade:** **Média**.
- **Ação Executada (24/11/2026):** Criado `scripts/diagnostics/github-actions-helper.js` exportando funções puras (`buildRunsApiPath`, `fetchRecentWorkflowRuns`, `summarizeRunsByWorkflow`, `extractErrorLinesFromJobLog`) com paginação e detecção de truncamento, consumido por `scripts/diagnostics/check-github-actions.js` (exibindo `Páginas consultadas`, `Resumo por workflow` e alerta quando truncado). Validado no snapshot real (`pagesFetched: 2`, `truncated: false`, `139` runs) e por `tests/unit/scripts/check-github-actions.test.js` (`17 passed`).

#### `OCOR-2026-11-23-07` — Limitação de acesso remoto ao GitHub Actions e ausência de timestamp nos logs locais
- **Status:** **RESOLVIDO em 24/11/2026 (rastreabilidade local `[log-meta]` + snapshot remoto `logs/github-actions-snapshot.json` gerado no host e auditado)**
- **Identificação:** `OCOR-2026-11-23-07`
- **Natureza:** Aviso ou comportamento suspeito / Limitação de auditoria
- **Fonte:** Tentativa de consulta à API REST no sandbox + inspeção de `logs/{tests-output,coverage-output,eslint}.log`, `package.json` e coleta do snapshot remoto em 24/11/2026.
- **Data:** 23/11/2026 | 24/11/2026 (rastreabilidade local e validação remota concluídas).
- **Processo envolvido:** Rastreabilidade temporal das fontes obrigatórias da auditoria semanal.
- **Descrição:** Duas barreiras afetaram a rastreabilidade da rodada de 23/11: (1) o GitHub Actions remoto não pôde ser consultado dentro do sandbox sem rede; e (2) os scripts `test:log`, `test:coverage:log` e `lint:log` em `package.json` gravavam a saída bruta sem cabeçalho de data/hora ou commit SHA no interior dos arquivos em `logs/`.
- **Evidências:**
  - `api.github.com` inacessível no sandbox (`EAI_AGAIN` em `npm run diag:actions`), contornado de forma auditável por `npm run diag:actions:snapshot` executado no host com rede em `2026-11-24T19:07:10.755Z`.
  - Varredura de datas nos logs de 21–22/11 retornava apenas `'23/10/2026'` (fixture de teste) e `package.json:20,36,45` usava apenas `| tee logs/...`.
- **Arquivos relacionados:** `package.json`, `scripts/diagnostics/run-with-log.js`, `scripts/diagnostics/github-actions-helper.js`, `scripts/diagnostics/check-github-actions.js`, `logs/github-actions-snapshot.json`, `logs/tests-output.log`, `logs/coverage-output.log`, `logs/eslint.log`, `tests/unit/tests-hygiene/package-lock-sync.test.js`.
- **Diagnóstico:** Limitação de rede do sandbox combinada com ausência de metadados explícitos nos logs locais e ausência de fluxo de snapshot offline.
- **Impacto:** Médio — ambas as barreiras foram eliminadas com `[log-meta]` nos logs locais e snapshot sanitizado reutilizável no sandbox por até `24 h`.
- **Prioridade:** **Média**.
- **Ação Executada (24/11/2026):** Criado `scripts/diagnostics/run-with-log.js` e atualizados `lint:log`, `test:log`, `test:coverage:log` e `test:load:all:log` em `package.json` para gravar metadados `[log-meta]` (`started_at`, `finished_at`, `duration_ms`, `exit_code`, `git_sha`, `command`). Adicionados timeout HTTP de `10 s` (`ETIMEDOUT`), snapshot offline sanitizado (`npm run diag:actions:snapshot` / `--from-snapshot`, validado por `evaluateActionsSnapshot` com validade padrão de `24 h`), detector de ruído de console em `summarizeJestLog`, além de `extractErrorLinesFromJobLog` e `summarizeRunsByWorkflow` após análise do snapshot real (`139` runs: `131 success`, `8 failure`, 4 workflows verdes em `0ab2716e`) e criação da guarda preventiva `package-lock-sync.test.js`.

---

### 3.4. Categoria: Qualidade dos Testes e Logs Locais

#### `OCOR-2026-11-23-01` — 35 blocos recorrentes de `console.error` por atualização React fora de `act(...)` em `AdminPostsNew`
- **Status:** **RESOLVIDO em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-01`
- **Natureza:** Problema recorrente / Aviso ou comportamento suspeito
- **Fonte:** `logs/tests-output.log` e `logs/coverage-output.log`, de 22/11/2026.
- **Data:** 22/11/2026 | 24/11/2026 (correção + blindagem estrutural implementadas).
- **Processo envolvido:** Suíte de testes do componente `AdminPostsNew` (`components/Admin/AdminPosts.js`), `tests/unit/components/Admin/AdminPosts.test.js` e hook `hooks/useApiFetch.js`.
- **Descrição:** Ambas as execuções locais (sem `--silent`) emitiam **35 blocos de `console.error`** (`Warning: An update to AdminPostsNew inside a test was not wrapped in act(...)`), somando 16× `hooks/useApiFetch.js:164`, 1× `:171`, 1× `:172` e 17× `:178`. No confronto com o código, além de testes síncronos que não aguardavam o `fetch` de montagem (`GET /api/admin/categories?all=1`), identificou-se que o teste de reordenação enfileirava `global.fetch.mockResolvedValueOnce({ ok: true })` (sem `.json()`) antes do `render(<AdminPosts />)`, provocando `TypeError` nas linhas `:171` e `:172`.
- **Arquivos relacionados:** `tests/unit/components/Admin/AdminPosts.test.js`, `hooks/useApiFetch.js`, `tests/unit/hooks/useApiFetch.test.js`.
- **Diagnóstico:** Ausência de guarda de ciclo de vida/ordem de resposta e de URL vazia no hook + efeitos pendentes e ordem de mock incorreta em `AdminPosts.test.js`.
- **Impacto:** Médio — degradava legibilidade dos logs e mascarava avisos reais de `act(...)` / `setState` pós-unmount.
- **Prioridade:** **Média**.
- **Ação Executada (24/11/2026):** Adicionados `isMountedRef` (compatível com React StrictMode via `useEffect`), `requestSeqRef` e `isCurrent()` em `hooks/useApiFetch.js` para descartar atualizações após unmount ou respostas de requisições antigas; corrigido `onReorder` em `AdminPosts.test.js`; adicionados 2 testes em `tests/unit/hooks/useApiFetch.test.js`. **Blindagem complementar (pós-`ff57a203`):** adicionada saída antecipada em `useApiFetch.js` para `url` vazia (`loading: false`, sem disparar `fetch`, +1 teste em `useApiFetch.test.js`), sincronização determinística com `waitFor` + `act` em `renderAdminPosts()` e asserção anti-`act(...)` no `afterEach` de `AdminPosts.test.js` via `jest.spyOn(console, 'error')`. Verificado em `logs/tests-output.log` e `logs/coverage-output.log`: **0 avisos `act(...)`**.

#### `OCOR-2026-11-23-02` — 4 blocos recorrentes de `console.error` (`Not implemented: navigation to another Document`) no jsdom 31
- **Status:** **RESOLVIDO em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-02`
- **Natureza:** Problema recorrente / Aviso ou comportamento suspeito
- **Fonte:** `logs/tests-output.log` e `logs/coverage-output.log`, de 22/11/2026.
- **Data:** 22/11/2026 | 24/11/2026 (correção + proteção na origem implementadas).
- **Processo envolvido:** Testes de exportação CSV em `tests/unit/components/Admin/AdminCrudBase.test.js`, `tests/unit/components/Admin/AdminSales.test.js`, `tests/unit/utils/csvExport.test.js` e `utils/csvExport.js`.
- **Descrição:** O jsdom 31 emitia 2 pares (4 blocos) de `console.error: Not implemented: navigation to another Document` porque `AdminCrudBase.test.js:361` executava `jest.restoreAllMocks()` antes dos 2 testes das linhas 370–410, deixando `link.click()` real (`utils/csvExport.js:73`) disparar o stub interno do jsdom.
- **Arquivos relacionados:** `tests/unit/components/Admin/AdminCrudBase.test.js`, `tests/unit/components/Admin/AdminSales.test.js`, `tests/unit/utils/csvExport.test.js`, `utils/csvExport.js`, `docs/PROJECT_utils.md`.
- **Diagnóstico:** Efeito colateral exclusivo do jsdom 31 sobre download via `<a download>`, sem impacto em produção; a ausência de guarda no próprio helper exigia mock manual de âncora em todo teste consumidor.
- **Impacto:** Baixo — ruído recorrente nos logs locais e da CI.
- **Prioridade:** **Baixa**.
- **Ação Executada (24/11/2026):** Adicionado spy local `jest.spyOn(window.HTMLAnchorElement.prototype, 'click')` em `AdminCrudBase.test.js` e **eliminada a causa na origem em `utils/csvExport.js`** (registrando `event.preventDefault()` `{ once: true }` apenas quando `/jsdom/i.test(navigator.userAgent || '')`, além de validar `columns` vazia/inválida). Criada a suíte dedicada `tests/unit/utils/csvExport.test.js` (5 testes, incluindo disparo sem mock de âncora) e adicionado teste sem mock manual de âncora em `AdminSales.test.js`, com atualização de `docs/PROJECT_utils.md`. Verificado nos logs: **0 ocorrências desse erro**.

#### `OCOR-2026-11-23-06` — Logs de erro/aviso simulados não silenciados em 5 testes de caminhos de falha
- **Status:** **RESOLVIDO em 24/11/2026**
- **Identificação:** `OCOR-2026-11-23-06`
- **Natureza:** Aviso ou comportamento suspeito (comportamento esperado de teste — não era erro de produção)
- **Fonte:** `logs/tests-output.log` e `logs/coverage-output.log`, de 22/11/2026.
- **Data:** 22/11/2026 | 24/11/2026 (higienização implementada).
- **Processo envolvido:** Testes negativos de tratamento de erros e resiliência (`internal-products.test.js`, `orders.test.js`, `customer/orders.test.js`, `blog.slug.test.js`, `backup.operations.test.js`).
- **Descrição:** Os 8 blocos restantes dentre os 47 originais de `console.error`/`console.warn` decorriam de falhas simuladas propositalmente em testes negativos sem silenciamento por filtro/spy local.
- **Arquivos relacionados:** `tests/helpers/console.js`, `tests/integration/api/admin/internal-products.test.js`, `tests/integration/api/admin/orders.test.js`, `tests/integration/api/customer/orders.test.js`, `tests/unit/pages/blog.slug.test.js`, `tests/unit/lib/backup/backup.operations.test.js`, `tests/unit/tests-hygiene/console-no-global-assignment.test.js`.
- **Diagnóstico:** Comportamento esperado dos testes negativos que gerava poluição visual quando a suíte rodava sem `--silent`.
- **Impacto:** Baixo — poluição visual nos logs sem `--silent`.
- **Prioridade:** **Baixa**.
- **Ação Executada (24/11/2026):** Adicionado `filterConsoleWarn` em `tests/helpers/console.js` (seguindo a mesma regra de higiene verificada por `console-no-global-assignment.test.js`) e aplicados `filterConsoleError`/`filterConsoleWarn` com asserção explícita e `mockRestore()` nos 5 arquivos listados. Resultado em `logs/tests-output.log` e `logs/coverage-output.log`: **contagem total de `console.error`/`console.warn` zerada (de 47 blocos para 0)**.

---

### 3.5. Acompanhamento de Ocorrências de Auditorias Anteriores

#### `AVISO-01-MODELS-CHECK` — Aviso Operacional em Ferramenta de Diagnóstico de Modelos
- **Status:** **RESOLVIDO em 16/11/2026 — Sem nova ocorrência em 23/11/2026**
- **Identificação:** `AVISO-01-MODELS-CHECK`
- **Fonte:** Execução do comando `npm run models:check` (`scripts/diagnostics/check-model-catalog.js`).
- **Data:** 16/11/2026 (implementação) | 23/11/2026 (revalidação na auditoria).
- **Processo envolvido:** Verificação de catálogo de modelos do OpenCode.
- **Descrição original:** Em ambientes onde o binário global `opencode` não está instalado no PATH (como o ambiente Antigravity ou contêineres de CI), o comando encerrava com código 1 e mensagem genérica `spawnSync opencode ENOENT`, sem distinguir erro de execução de ambiente sem catálogo disponível e sem informar a validade sintática do preset local.
- **Ação Executada (16/11/2026):** Implementação de `formatCatalogReadError` em `scripts/diagnostics/model-catalog.js`, pré-leitura do preset em `scripts/diagnostics/check-model-catalog.js` e 3 testes unitários em `tests/unit/scripts/check-model-catalog.test.js`.
- **Revalidação em 23/11/2026 e 24/11/2026:** Executado `npm run models:check` no ambiente Antigravity (sem CLI `opencode` no PATH): saída clara `status: NÃO VERIFICADO`, `motivo: spawnSync opencode ENOENT`, `preset local (.opencode/oh-my-opencode-slim.json): sintaxe válida (preset zen, 6 modelo(s), 1 reserva(s))`, encerrando com código `2` (`AGENTS.md` §0.3 passo 6 — portabilidade introduzida em 23/11/2026 separando código `2` de falha real `1`). Sem regressões.
- **Prioridade:** Baixa.

---

## 4. Análise dos processos e testes existentes
- **Processos analisados na janela (16/11/2026 a 23/11/2026) e revalidados após o Plano de Ação em 24/11/2026:**
  - Testes unitários e de integração em jsdom (`Jest` via `logs/tests-output.log` e `logs/coverage-output.log`, regenerados em 24/11/2026 com cabeçalho/rodapé `[log-meta]`)
  - Configuração da suíte com PostgreSQL real (`jest.config.db.js`, `tests/integration/domain/*.db.test.js`)
  - Análise estática de código (`ESLint` via `npm run lint:log` em 24/11/2026 — 0 erros e 0 warnings em `logs/eslint.log` com `[log-meta]`)
  - Análise de código morto e dependências (`Knip` via `npm run knip` em 24/11/2026 — 0 erros)
  - Lint de workflows do GitHub Actions (`actionlint 1.7.12` via `npm run lint:workflows` em 24/11/2026 — 0 erros)
  - Verificação de caracteres não-latina (`npm run lint:chars` em 24/11/2026 — 0 erros em 789 arquivos)
  - Scanners estáticos de segurança (`npm run security:check-sql` em 266 arquivos e `npm run security:check-credentials` em 104 arquivos em 24/11/2026 — 0 vulnerabilidades)
  - Preflight de catálogo de modelos (`npm run models:check` em 24/11/2026 — código `2`, `status: NÃO VERIFICADO` por ausência do binário `opencode`, sintaxe do preset `zen` válida)
  - Definições dos 5 workflows (`.github/workflows/*.yml`), 3 composite actions (`.github/actions/*/action.yml`) e `scripts/diagnostics/{check-github-actions,github-actions-helper,run-with-log}.js`
  - **Execuções remotas do GitHub Actions validadas via `logs/github-actions-snapshot.json`:** capturado em `2026-11-24T19:07:10.755Z` (`windowSince: 2026-11-17T19:06:47.748Z`, `totalCount: 140`, `pagesFetched: 2`, `truncated: false`, **`139` runs na janela: `131 success`, `8 failure`**).
- **Testes executados (baseline 22/11/2026 vs. validação final de 24/11/2026):**
  - *Baseline da auditoria (22/11/2026):* `241 suítes aprovadas` (`8 .db.test.js` / `96` testes ignorados sem Docker), `2.090 testes aprovados` (`2.186` no total), `6 snapshots aprovados`, cobertura global `95,48% Statements | 86,31% Branch | 93,37% Functions | 95,48% Lines`, com `47` blocos `console.error`/`console.warn` por log.
  - *Após validação remota e novas guardas preventivas (24/11/2026):* **`244 suítes aprovadas`** (`8` suítes `.db.test.js` / `96` testes ignorados localmente sem Docker — porém aprovadas no CI remoto em **`Test Coverage Gate (banco real)` Run `#176`**; `244 of 252 total`), **`2.141 testes aprovados`** (`2.237` no total), **`6 snapshots aprovados`**, cobertura global de **`95,73% Statements | 86,60% Branch | 93,37% Functions | 95,73% Lines`** (`logs/tests-output.log` em `67,072 s`; `logs/coverage-output.log` em `185,916 s` com `--maxWorkers=2` e `workerIdleMemoryLimit: '300MB'`), **`0` ocorrências de `console.error`/`console.warn`/`act(...)`/navegação jsdom** e `logs/eslint.log` limpo (`[log-meta]`, `sha=0ab2716e`).
- **Resultados identificados:** Após as correções e a auditoria do snapshot remoto de 24/11/2026, há **100% de aprovação** tanto nas suítes e gates estáticos locais quanto nos **4 workflows remotos do GitHub Actions no `HEAD` `0ab2716e`** (e nos últimos 22 runs consecutivos desde `1793f90f`). Restam em aberto apenas as oportunidades evolutivas `5.6`, `5.7`, `5.8` e a ampliação de escopo/thresholds em `jest.config.js` (`5.10`).

### Consolidação das Execuções Remotas do GitHub Actions (Snapshot `2026-11-24T19:07:10Z` — Janela `17/11–24/11`)

| Workflow | Total (7d) | Sucesso | Falhas | Último Run Validado | Evento / Commit | Status Atual (`0ab2716e`) |
|---|---|---|---|---|---|---|
| `Lint & Test Coverage Gate` (`test-coverage.yml`) | 44 | 40 | 4 | **Run `#191`** (`ID: 45383509956`, `2026-11-24T11:22:00Z`) | `push` / `0ab2716e` (também `#190` em `ff57a203`) | **Verde (`success`)** — inclui `lint:chars` e `npm audit` |
| `E2E Isolated (Cypress)` (`e2e.yml`) | 44 | 42 | 2 | **Run `#185`** (`ID: 45383509878`, `2026-11-24T11:22:00Z`) | `push` / `0ab2716e` (também `#184` em `ff57a203`) | **Verde (`success`)** — fecha `Manutenção Preventiva 01` |
| `Test Coverage Gate (banco real)` (`test-db-coverage.yml`) | 44 | 42 | 2 | **Run `#176`** (`ID: 45383509754`, `2026-11-24T11:22:00Z`) | `push` / `0ab2716e` (também `#175` em `ff57a203`) | **Verde (`success`)** — valida 8 `.db.test.js` em PostgreSQL real |
| `Load Tests (k6)` (`load-tests.yml`) | 7 | 7 | 0 | **Run `#52`** (`ID: 45419442425`, `2026-11-24T14:55:04Z`) | `schedule` / `0ab2716e` | **Verde (`success`)** — 100% na semana |
| **Total agregado (17/11–24/11)** | **139** | **131** | **8** | — | 22 runs consecutivos verdes desde `1793f90f` | **100% Saudável** |

**Rastreamento das 8 falhas históricas (todas já corrigidas na `main`):**
1. **Runs `#151` (`44389578010`, `6e943325`, `18/11 20:18Z`) e `#152` (`44393528701`, `554c0566`, `18/11 20:40Z`) — `Lint & Test Coverage Gate`:** falha única em `tests/unit/scripts/bench-ground-truth.test.js` após alteração em arquivos vigiados sem recalibração imediata do gabarito. Corrigido no mesmo dia em `eaeb298d` (`ATT - Gabarito`, `18/11 18:09 BRT`).
2. **Runs `#183/#168/#177` (`ae84c187`, `23/11 23:51Z`) e `#184/#169/#178` (`d3d3e3de`, `24/11 00:48Z`) — `Lint & Test Coverage Gate`, `Test Coverage Gate (banco real)` e `E2E Isolated (Cypress)`:** os 3 workflows de push falharam no step `Setup Node.js Environment` / `Install Dependencies` (`npm ci`, código `EUSAGE`) porque `ae84c187` alterou `package.json` sem atualizar `package-lock.json`. Corrigido em `1793f90f` (`ATT - Install Package`, `23/11 21:53 BRT`), restaurando `22` runs verdes consecutivos; prevenido localmente pela nova guarda `tests/unit/tests-hygiene/package-lock-sync.test.js`.

### Tabela de Tendência Histórica e Performance de CI/Testes

| Data da Medição | Suítes Totais | Testes Passando | Tempo da Suíte | Gates Estáticos (Knip / ESLint / Actionlint / Segurança) | Status do CI / Diagnóstico |
|---|---|---|---|---|---|
| **04/11/2026** | 208 suítes | 1.654 testes | ~63 s | 100% limpos | Resolvido aviso de worker no Jest |
| **05/11/2026** | 208 suítes | 1.657 testes | ~63 s | 100% limpos | 100% aprovado (Runs #112-#119) |
| **09/11/2026** | 226 suítes | 1.814 testes | ~34 s | 100% limpos | Estável (zero falhas) |
| **11/11/2026** | 227 suítes | 1.830 testes | ~35 s | 100% limpos | Diagnóstico híbrido + polling resiliente |
| **16/11/2026 (Auditoria)** | 232 suítes | 1.921 testes | ~35,9 s | 100% limpos (Knip, ESLint, Actionlint, Chars) | Vendas Internas + Orders API + Reconciliação ativas |
| **16/11/2026 (Implementado)** | 232 suítes (+8 `.db`) | 1.926 testes (+96 `.db`) | ~44,7 s | 100% limpos (Knip, ESLint, Actionlint, Chars) | Guarda SQL estática + `models:check` claro + E2E `checkout.cy.js` |
| **22/11/2026 — 23/11/2026 (Auditoria)** | 241 suítes (+8 `.db`) | 2.090 testes (+96 `.db`) | ~20,4 s (unit) / ~88,2 s (cov) | 100% limpos (Knip, ESLint, Actionlint, Chars, SQL, Creds) | Cobertura 95,48% L / 86,31% B / 93,37% F; CI remoto não consultado; `Audit Dependencies` inalcançável + lacunas em `login.js` e `AdminSales.js` |
| **24/11/2026 (Validação Final + Snapshot CI)** | **244 suítes (+8 `.db`)** | **2.141 testes (+96 `.db`)** | **~67,1 s (unit) / ~185,9 s (`--coverage --maxWorkers=2`)** | **100% limpos (Knip, ESLint, Actionlint, Chars, SQL, Creds)** | **Cobertura 95,73% L / 86,60% B / 93,37% F; 0 ruídos console/`act`/jsdom; guarda `package-lock-sync`; 139 runs CI auditados (`131 OK / 8 falhas já corrigidas`), 4 workflows verdes em `0ab2716e`** |

### Arquivos com Menor Cobertura no Relatório `logs/coverage-output.log` (22/11/2026 — atualizado em 24/11/2026)

| Arquivo | % Stmts / Lines | % Branch | % Funcs | Principais linhas descobertas (em 22/11; atualizado em 24/11) |
|---|---|---|---|---|
| `pages/api/auth/login.js` | **68,45% → 100%** | 72,72% → **100%** | 100% | *Resolvido em 24/11/2026* (`pages/api/auth/*` em 100% Stmts/Branch/Funcs/Lines) |
| `components/Admin/AdminSales.js` | **75,89%** | 61,64% | **32,25%** | `19-39, 157-188, 234-260, 382-419, 510-552, 642-707, 722-733` |
| `lib/infra/db.js` | 81,43% | 86,30% | 84,61% | `26-57, 114-121, 141, 152-153, 171, 197-198, 232-271, 290, 304-311` |
| `pages/api/customer/auth.js` | 85,47% | 77,58% | 100% | `94-96, 114-119, 138-152, 165-177, 193-197, 235-236` |
| `lib/cache/cache.js` | 86,79% | 91,91% | 100% | `43-87, 94-96, 142-144, 184-185, 381-389, 459-461` |
| `pages/api/products.js` | 87,81% | 76,19% | 100% | `66-67, 86-87, 103-104, 125-126, 174-184, 222-224, 249-393` |
| `pages/api/admin/integrity.js` | 88,25% | **52,17%** | 100% | `58-77, 114-115, 141-143, 180-182, 199` |
| `pages/api/checkout.js` | 88,44% | 72,97% | 100% | `55-60, 153-157, 171-175, 190-194, 201-202, 211-212, 265, 271-276` |
| `pages/api/admin/rate-limit.js` | 89,93% | 73,17% | 100% | `31-32, 58-64, 79-80, 175-176, 244-305` |
| `lib/auth/customer-auth.js` | 93,57% | **52,63%** | 100% | `32-33, 38-39, 75-77` |
| `lib/payment/mercadopago.js` | 94,55% | **68,44%** | 100% | `27, 29, 35, 37, 64-68, 87-88, 106-107, 170, 268-276, 439-440` |
| `lib/domain/products.js` | 95,18% | **63,46%** | 83,33% | `66-69, 72-75, 113-117` |
| `components/Admin/AdminCategories.js` | 98,72% | **41,66%** | 100% | `130-131` |

- **Limitações e pontos cegos estruturais identificados na cobertura e nos processos:**
  1. **Escopo de coleta (`jest.config.js:27-35`):** `collectCoverageFrom` monitora apenas `lib/**/*.js`, `pages/api/**/*.js` e `components/**/*.js`. Pastas críticas adicionadas recentemente (`hooks/useAdminInactivityTimeout.js`, `utils/adminSession.js`, `pages/admin.js`, `pages/entrar.js`, `pages/checkout/[id].js`, `pages/minha-conta.js`, `pages/login.js`, `proxy.js`) **continuam fora** da tabela de cobertura e dos thresholds (item remanescente de `5.10`).
  2. **Thresholds ausentes em diretórios críticos (`jest.config.js:45-76`):** existem pisos por diretório para `lib/domain/`, `pages/api/admin/`, `components/Admin/fields/` e `lib/infra/`, mas **ainda não há threshold** para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` nem `components/Admin/` (embora `pages/api/auth/login.js` tenha chegado a **100%** em 24/11/2026, `AdminSales.js` permanece em `32,25%` de funções mantendo a média global em `95,73%`).
  3. **Domínios SQL sem suíte contra PostgreSQL real:** dos módulos de `lib/domain/` que acessam o banco, `categories.js` (SQL direto em `categories` e `post_categories`) e `audit.js` (`INSERT` direto em `activity_logs`), além de `dicas.js` e `images.js` (via `shared-pagination.js` e `crud.js`), continuam sem `*.db.test.js` dedicado; a inspeção estática `INSERT`/`UPDATE` em `tests/unit/scripts/schema-sources.test.js:144-180` ainda verifica apenas `customers.js` e `orders.js` (`5.8`).
  4. **Workflows locais vs. remotos:** `e2e.yml` executa apenas em `push: [main]` e `workflow_dispatch` (não bloqueia PRs por escolha documentada). **Atualizado em 24/11/2026:** `npm run lint:chars` e `Audit Dependencies` foram integrados ao job `lint` de `.github/workflows/test-coverage.yml`, o comentário de `test-db-coverage.yml` foi corrigido para `"8 arquivos *.db.test.js, 96 asserções"`, `timeout-minutes` de `e2e.yml` foi ajustado para `25`, e **todas as alterações foram confirmadas em produção no CI** via `logs/github-actions-snapshot.json` (`#191`, `#185`, `#176` e `#52` verdes em `0ab2716e`).
  5. **Contexto do working tree:** em 23/11/2026 havia 11 arquivos pré-existentes modificados no working tree (incluindo `pages/api/products.js` e `tests/integration/api/products.test.js`, posteriormente consolidados antes do `HEAD` `42541e0a` em que o Plano de Ação foi executado em 24/11/2026).

### Arquivos Consultados na Investigação Direcionada (Etapa 5)

| Arquivo consultado | Motivo da consulta |
|---|---|
| `AGENTS.md`, `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/ARQUITETURA_SITE_PRIVADO.md` | Regras do projeto, arquitetura pública/privada e status das pendências (§7/§8) |
| `docs/retorno_da_semana.md` | Preservação de histórico e comparação incremental com a auditoria de 16/11/2026 |
| `logs/tests-output.log`, `logs/coverage-output.log`, `logs/eslint.log` | Varredura integral de falhas, avisos, tempos, cobertura e data dos eventos |
| `.github/workflows/*.yml`, `.github/actions/*/action.yml` | Auditoria dos triggers, jobs, steps, timeouts, permissões e identificação de `OCOR-2026-11-23-03` |
| `scripts/diagnostics/check-github-actions.js`, `lint-workflows.sh` | Verificação de paginação da API do GitHub e funcionamento de `actionlint` |
| `package.json`, `jest.config.js`, `jest.config.base.js`, `jest.config.db.js` | Verificação de scripts `*:log`, `collectCoverageFrom` e `coverageThreshold` |
| `scripts/check-sql-injection.js`, `scripts/check-hardcoded-credentials.js` | Confirmação de escopo de leitura read-only e cobertura dos scanners |
| `pages/api/auth/login.js`, `tests/integration/api/auth/login.test.js`, `tests/integration/api/login.test.js`, `tests/unit/pages/api/auth/login.edge.test.js` | Investigação da baixa cobertura (68,45%) e risco em `req.body` (`OCOR-2026-11-23-05`) |
| `components/Admin/AdminPosts.js`, `hooks/useApiFetch.js`, `tests/unit/components/Admin/AdminPosts.test.js` | Diagnóstico dos 35 blocos recorrentes `act(...)` (`OCOR-2026-11-23-01`) |
| `utils/csvExport.js`, `tests/unit/components/Admin/AdminCrudBase.test.js` | Diagnóstico dos 4 blocos `Not implemented: navigation to another Document` (`OCOR-2026-11-23-02`) |
| `scripts/backup.js` | Confirmação do contexto dos 4 `console.warn` esperados em `backup.operations.test.js` (`OCOR-2026-11-23-06`) |
| `components/Admin/AdminSales.js`, `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `pages/api/admin/integrity.js` | Levantamento exato das funções/branches descobertos apontados em `coverage-output.log` |
| `lib/domain/{dicas,permissions,categories,audit,images}.js`, `tests/unit/scripts/schema-sources.test.js` | Mapeamento de módulos SQL sem suíte `.db.test.js` e cobertura da guarda estática |
| `pages/api/products.js` (`git diff`) | Registro contextual da alteração local pré-existente (não modificada nesta auditoria) |

---

## 5. Oportunidades de melhoria

### 5.1. Validação Automática de Schema SQL na Definição de Pronto e Guarda Estática
- **Status:** **RESOLVIDO em 16/11/2026**
- **Categoria:** Integridade de Dados / Prevenção de Regressões
- **Processo envolvido:** Migrations, tabelas e camadas de domínio (`lib/domain/`, `lib/infra/db.js`, `tests/unit/scripts/schema-sources.test.js`)
- **Situação anterior:** `AGENTS.md` (§7 item 1) não detalhava o risco de mocks ocultarem deriva de schema SQL (ADR-0039) e `schema-sources.test.js` cobria apenas 5 tabelas de conteúdo.
- **Ação Executada:** Atualizado `AGENTS.md` §7 item 1, criadas `customers.db.test.js` e `orders.db.test.js` (`b37c9f1`) e adicionada inspeção estática `INSERT`/`UPDATE` em `customers.js` e `orders.js` + drift zero em `tableSchemas` × `EXPECTED_SCHEMA` (`schema-sources.test.js`).
- **Resultado:** Prevenção em duas camadas (guarda estática no `npm test` + PostgreSQL real no `test-db-coverage.yml`). *Observação de 23/11/2026:* recomenda-se estender a mesma cobertura para os domínios restantes (`5.8`).
- **Prioridade:** Média.

### 5.2. Tratamento Claro de `ENOENT` no Diagnóstico de Catálogo de Modelos (`check-model-catalog.js`)
- **Status:** **RESOLVIDO em 16/11/2026**
- **Categoria:** Ferramental de Diagnóstico / CI
- **Processo envolvido:** `npm run models:check` (`scripts/diagnostics/check-model-catalog.js`, `model-catalog.js`)
- **Ação Executada:** Implementada `formatCatalogReadError` classificando `ENOENT` como `status: NÃO VERIFICADO` com pré-validação do preset local e 3 testes unitários em `check-model-catalog.test.js`. Revalidado com sucesso em 23/11/2026.
- **Prioridade:** Baixa.

### 5.3. Ampliação da Cobertura de Testes E2E (Cypress) para Fluxos de Compra
- **Status:** **RESOLVIDO em 16/11/2026 e VALIDADO REMOTAMENTE em 24/11/2026**
- **Categoria:** Testes End-to-End (E2E)
- **Processo envolvido:** `cypress/e2e/checkout.cy.js`, `docs/PROJECT_cypress.md` e `.github/workflows/e2e.yml`
- **Ação Executada:** Criada `cypress/e2e/checkout.cy.js` (4 cenários), corrigido overload de `cy.intercept` em `01a4a3f`, revalidada localmente (`4 passing`) e **confirmada no CI remoto** pelo snapshot de `24/11/2026`: `E2E Isolated (Cypress)` somou `42/44` aprovações na semana (as únicas 2 falhas decorreram de `npm ci` `EUSAGE` antes do step Cypress em `ae84c187`/`d3d3e3de`), encerrando em `success` nos Runs `#184` (`ff57a203`) e **`#185` (`0ab2716e`)**.
- **Prioridade:** Média.

### 5.4. Blindagem de `req.body` e Cobertura Integral das Proteções de `pages/api/auth/login.js`
- **Status:** **RESOLVIDO em 24/11/2026**
- **Categoria:** Segurança / Testes de Integração
- **Processo ou funcionalidade envolvida:** Autenticação administrativa (`POST /api/auth/login`, `pages/api/auth/login.js`)
- **Situação anterior (23/11/2026):** `pages/api/auth/login.js` tinha **68,45% de linhas** e **72,72% de branches** cobertas. A linha 39 desestruturava `req.body` fora do `try/catch`; `username` no rate limit por usuário (linha 82) era case-sensitive apesar do `LOWER(username)` em `lib/auth/auth.js:244`; e testes legados não exercitavam o rate limit por IP real, backstop por usuário, `untrustedForwarded`, `MISSING_FIELDS`, `?response=body` ou erro em `last_login_at`.
- **Ação Executada (24/11/2026):**
  - `pages/api/auth/login.js`: protegida a linha 39 (`typeof req.body?.username === 'string' && typeof req.body?.password === 'string' ? req.body : {}`) e normalizada a linha 82 (`username.trim().toLowerCase()`), mantendo exatamente 149 linhas e as âncoras `:19`, `:51` e `:82` do benchmark (`scripts/bench/orchestrator/gabarito.md`).
  - `tests/unit/pages/api/auth/login.edge.test.js`, `tests/integration/api/auth/login.test.js` e `tests/integration/api/login.test.js`: cobertos `req.body` inválido/`undefined`/`null`/não-string, IP de socket real estourando `LOGIN_RATE_LIMIT`, backstop `LOGIN_USER_LIMIT` com normalização case-insensitive, `untrustedForwarded`, `?response=body` (verificando ausência de vazamento de `refreshToken`), fallback genérico de erro e falha simulada real na atualização de `last_login_at` com asserção em `logger.error`.
- **Resultado:** Cobertura de `pages/api/auth/login.js` elevada para **`100% Stmts | 100% Branch | 100% Funcs | 100% Lines`**, com `tests/unit/scripts/bench-ground-truth.test.js` (`14/14 passed`).
- **Prioridade:** **Alta**.

### 5.5. Reativação de `npm audit`, Inclusão de `lint:chars` no CI e Saneamento dos Workflows
- **Status:** **RESOLVIDO e VALIDADO REMOTAMENTE em 24/11/2026**
- **Categoria:** Processos de CI / Segurança de Dependências
- **Processo ou funcionalidade envolvida:** Workflows `.github/workflows/test-coverage.yml`, `test-base.yml`, `e2e.yml`, `test-db-coverage.yml` e `.github/actions/setup/action.yml`
- **Situação anterior (23/11/2026):** `Audit Dependencies` estava morto em `test-base.yml:470-474` (`OCOR-2026-11-23-03`); `npm run lint:chars` não rodava na CI; `e2e.yml` possuía `timeout 20m` interno com `timeout-minutes: 15`; e `test-db-coverage.yml` citava `"6 arquivos *.db.test.js, 73 asserções"` em comentário defasado.
- **Ação Executada (24/11/2026):**
  - `.github/workflows/test-coverage.yml`: adicionados `Run Character Lint` (`npm run lint:chars`) e `Audit Dependencies` (`npm audit --audit-level=high`, `continue-on-error: true`) ao job `lint`.
  - `.github/workflows/test-base.yml`: removidos os 3 blocos condicionais mortos `inputs.test-type == 'coverage'` e atualizadas as descrições dos inputs `test-type` e `skip-db-setup` (já que `load-tests.yml` é o único chamador).
  - `.github/actions/setup/action.yml`, `.github/workflows/e2e.yml` e `.github/workflows/test-db-coverage.yml`: atualizados os comentários apontando para `test-coverage.yml`, elevado `timeout-minutes` de `e2e.yml` para `25` e atualizada a contagem comentada em `test-db-coverage.yml` para `8 arquivos *.db.test.js, 96 asserções`.
  - `tests/unit/github-workflows/test-coverage-comment.test.js`: adicionados 2 testes em `P1` cobrindo `Run Character Lint` e `Audit Dependencies`.
- **Resultado:** `npm run lint:workflows` (`actionlint 1.7.12`, saída 0) e `test-coverage-comment.test.js` (`23 passed`) aprovados localmente e **validados remotamente no CI**: Runs **`#190`** (`ff57a203`) e **`#191`** (`0ab2716e`) de `Lint & Test Coverage Gate` com `success` (`Run Character Lint` e `Audit Dependencies` executados).
- **Prioridade:** **Alta**.

### 5.6. Ampliação da Cobertura Funcional de `components/Admin/AdminSales.js`
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Testes de Componentes / Painel Administrativo
- **Processo ou funcionalidade envolvida:** Aba Gestão de Vendas (`components/Admin/AdminSales.js`, `tests/unit/components/Admin/AdminSales.test.js`)
- **Situação atual:** `AdminSales.js` tem a menor cobertura de funções do projeto (**32,25% Funcs | 75,89% Lines | 61,64% Branch**). Os testes adicionados em 21–22/11 cobriram a listagem básica, badges e o pré-carregamento da contagem de pedidos, mas deixaram descobertos: o modal de gerenciamento de pedido (`openManageOrder`, `handleSaveOrderUpdate`, linhas 381-419 e 642-707), os filtros de busca/status/meio (`510-552`), a exportação CSV de pedidos (`handleExportOrdersCsv`, 422-441), o tratamento de HTTP 401 no update (`402-404`), o helper de exibição de datas/valores (`19-39`) e `mapItemToFormData` dos Produtos Internos (`722-733`, incluindo formatação pt-BR de preço e frete).
- **O que ainda não está sendo verificado:** Fluxo completo de atualização logística do pedido (`order_status` + `tracking_code`), feedback de erro/401 ao salvar pedido, aplicação de filtros combinados na query e formatação dos campos de edição de Produtos Internos.
- **Risco ou possibilidade de falha:** Regressão visual ou funcional silenciosa ao atualizar status de entrega/rastreio de pedidos pagos ou ao editar frete/estoque de produtos internos no painel.
- **Melhoria recomendada:** Expandir `tests/unit/components/Admin/AdminSales.test.js` para exercitar os fluxos interativos da subaba Pedidos e a configuração `mapItemToFormData` de Produtos Internos.
- **Teste ou procedimento proposto:** Adicionar casos de teste com `@testing-library/react` cobrindo: (1) abertura do modal "Gerenciar Pedido #...", alteração de `order_status`/`tracking_code`, envio `PUT /api/admin/orders` com sucesso e erro; (2) redirecionamento/guarda 401 no `PUT`; (3) alteração dos `<select>` de filtro e campo de busca resetando `page` para 1; (4) clique em "Exportar CSV" com e sem pedidos; (5) chamada direta ou renderização de edição validando `mapItemToFormData`.
- **Resultado esperado:** Elevar a cobertura de funções e linhas de `AdminSales.js` para `>= 85%`.
- **Benefício da implementação:** Garante confiabilidade operacional na principal tela nova de gestão comercial do painel.
- **Prioridade:** **Média**.

### 5.7. Ampliação de Cobertura de Branches em Rotas Críticas de Visitante, Pagamento e Integridade
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Testes de Integração / Segurança e Integridade
- **Processo ou funcionalidade envolvida:** `pages/api/customer/auth.js` (77,58% Branch), `lib/auth/customer-auth.js` (52,63% Branch), `pages/api/checkout.js` (72,97% Branch), `lib/payment/mercadopago.js` (68,44% Branch), `pages/api/admin/integrity.js` (52,17% Branch) e `pages/api/products.js` (76,19% Branch)
- **Situação atual:** Embora todas essas rotas apresentem cobertura de linhas acima de 85%, diversos caminhos de falha, exceção e borda permanecem sem execução:
  - `pages/api/customer/auth.js` (`94-96, 114-119, 138-142, 147-152, 165-166, 172-177, 193-197, 235-236`): retorno 400 na validação de perfil/register/login/google, rate limit no POST, registro com cliente inexistente no GET e erro inesperado em `registerCustomer`.
  - `lib/auth/customer-auth.js` (`32-33, 38-39, 75-77`): verificação fail-closed de `JWT_SECRET` fora de `development`/`test` e retorno `null` com `logger.debug` em token inválido/expirado.
  - `pages/api/checkout.js` (`55-60, 153-157, 171-175, 190-194, 201-202, 211-212, 265, 271-276`): rate limit 429 no POST, cliente ausente após JWT válido (401), produto não interno/inexistente (404), comparação de endereço quando CEP diverge, e exceção inesperada (500).
  - `pages/api/admin/integrity.js` (`58-77, 114-115, 141-143, 180-182, 199`): branches reais de conexão Upstash Redis, subdiretórios recursivos em `uploads/`, falhas de filesystem em armazenamento/backups e status agregado `warning`.
- **O que ainda não está sendo verificado:** Respostas exatas de erro, códigos HTTP e ausência de vazamento de mensagens internas em cenários de falha parcial de infraestrutura (Redis/banco/filesystem/gateway) e validação Zod nessas rotas.
- **Risco ou possibilidade de falha:** Mudança acidental em códigos HTTP (400/401/404/429/500) ou quebra na inicialização em produção caso o contrato fail-closed de `JWT_SECRET` em `customer-auth.js` sofra regressão.
- **Melhoria recomendada:** Cobrir sistematicamente as branches negativas listadas nas respectivas suítes de integração/unidade já existentes.
- **Teste ou procedimento proposto:** Adicionar casos direcionados em `tests/integration/api/customer/auth.test.js`, `tests/integration/api/checkout.test.js`, `tests/integration/api/admin/integrity.test.js` e `tests/unit/lib/auth/customer-auth.test.js` (incluindo teste com `jest.resetModules()` validando `throw` quando `NODE_ENV='production'` sem `JWT_SECRET`).
- **Resultado esperado:** Cobertura de branches `>= 85%` em todos os arquivos críticos de autenticação, checkout e integridade.
- **Benefício da implementação:** Reduz risco de regressão silenciosa em fluxos de compra, conta do visitante e diagnóstico administrativo.
- **Prioridade:** **Média**.

### 5.8. Cobertura contra PostgreSQL Real (`*.db.test.js`) para Domínios Restantes e Extensão da Guarda SQL
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Integridade de Dados / Testes de Integração com Banco Real
- **Processo ou funcionalidade envolvida:** `lib/domain/{categories,audit,dicas,images}.js` e `tests/unit/scripts/schema-sources.test.js`
- **Situação atual:** `test-db-coverage.yml` executa 8 suítes (`customers`, `musicas`, `orders`, `permissions`, `posts`, `products`, `settings`, `videos`), mas `categories.js` (SQL em `categories` e `post_categories`), `audit.js` (`INSERT INTO activity_logs`), `dicas.js` (`paginate('dicas', ...)`) e `images.js` (`createRecord('images', ...)`) não possuem `*.db.test.js` dedicada; além disso, a inspeção estática `INSERT`/`UPDATE` em `schema-sources.test.js:145` limita-se a `customers.js` e `orders.js`.
- **O que ainda não está sendo verificado:** Execução real das queries de `categories.js`, `audit.js`, `dicas.js` e `images.js` contra as migrations no PostgreSQL real (incluindo constraints de `post_categories`, busca `ILIKE` em `dicas` e gravação de `activity_logs` sem falha de coluna/tipo).
- **Risco ou possibilidade de falha:** Deriva de schema ou erro de SQL em categorias/auditoria/dicas ocultado por mocks unitários de `lib/infra/db.js`, conforme risco documentado no ADR-0039 e `AGENTS.md` §7 item 1.
- **Melhoria recomendada:** Criar suítes `*.db.test.js` para `categories`, `audit`, `dicas` e `images` seguindo o padrão de `tests/helpers/db-test.js`, e ampliar `schema-sources.test.js` para varrer todos os arquivos `lib/domain/*.js` contra `EXPECTED_SCHEMA` (quando a tabela constar no catálogo).
- **Teste ou procedimento proposto:** Validar localmente com `npm run test:db:container` (em host com Docker) e no workflow `test-db-coverage.yml`.
- **Resultado esperado:** 100% dos domínios de banco do projeto validados contra PostgreSQL real no CI.
- **Benefício da implementação:** Elimina totalmente pontos cegos de schema drift e SQL inválido na camada `lib/domain/`.
- **Prioridade:** **Média**.

### 5.9. Paginação em `check-github-actions.js` e Carimbo Temporal/SHA nos Logs Locais
- **Status:** **RESOLVIDO e VALIDADO EM SNAPSHOT REAL em 24/11/2026**
- **Categoria:** Monitoramento e Geração de Logs
- **Processo ou funcionalidade envolvida:** `scripts/diagnostics/{check-github-actions,github-actions-helper,run-with-log}.js`, `package.json` (`lint:log`, `test:log`, `test:coverage:log`, `test:load:all:log`) e `/home/gus/projetos/Caminhar/logs/`
- **Situação anterior (23/11/2026):** `check-github-actions.js:156` lia apenas 50 runs em página única (`OCOR-2026-11-23-04`); os scripts `*:log` de `package.json` gravavam saída bruta sem cabeçalho com timestamp ISO-8601 e commit SHA (`OCOR-2026-11-23-07`).
- **Ação Executada (24/11/2026):**
  - Criado `scripts/diagnostics/github-actions-helper.js` (`buildRunsApiPath`, `fetchRecentWorkflowRuns`, `formatLogMetaStart`, `formatLogMetaEnd`, `parseLogMeta`, `summarizeJestLog`, `summarizeEslintLog`) e atualizado `scripts/diagnostics/check-github-actions.js` para paginar execuções na janela de 7 dias, sinalizar truncamento e interpretar logs com `[log-meta]`.
  - Criado `scripts/diagnostics/run-with-log.js` e atualizados `lint:log`, `test:log`, `test:coverage:log` e `test:load:all:log` em `package.json` para gravar `[log-meta]` (`started_at`, `finished_at`, `duration_ms`, `exit_code`, `git_sha`, `command`).
  - **Blindagem complementar (`0ab2716e`):** adicionados timeout HTTP de `10 s` (`ETIMEDOUT`), snapshot offline sanitizado (`npm run diag:actions:snapshot` / `--from-snapshot` / `evaluateActionsSnapshot` com validade padrão de `24 h` em `logs/github-actions-snapshot.json`) e contabilização de `consoleErrors`, `consoleWarns`, `actWarnings` e `jsdomNavigationErrors` em `summarizeJestLog`.
  - **Refinamento pós-validação do snapshot real:** o exame das 8 falhas reais capturadas em `logs/github-actions-snapshot.json` evidenciou que o filtro simples de `tailErrors` incluía specs `✓` passando no Jest e linhas de ajuda de `npm help ci`; adicionados `extractErrorLinesFromJobLog` (filtragem de ruído com preservação do início e fim da falha) e `summarizeRunsByWorkflow` (resumo agregado por workflow). Suíte `tests/unit/scripts/check-github-actions.test.js` ampliada para **17 testes** (`17 passed`).
- **Resultado:** `npm run diag:actions:snapshot` validou paginação em 2 páginas (`140` retornos / `139` runs na janela, `truncated: false`, `0` segredos) e `npm run diag:actions` reporta resumo por workflow, ruído de console zerado e metadados `[log-meta]` válidos. *(Nota: os trechos `tailErrors` já gravados no snapshot atual refletem o filtro anterior e serão re-extraídos com `extractErrorLinesFromJobLog` na próxima captura `npm run diag:actions:snapshot`.)*
- **Prioridade:** **Média**.

### 5.10. Eliminação de Ruído Recorrente (`act(...)` / jsdom), Guarda `package-lock` e Revisão de Cobertura em `jest.config.js`
- **Status:** **PARCIALMENTE RESOLVIDO em 24/11/2026**
- **Categoria:** Qualidade de Testes / Prevenção de Regressões
- **Processo ou funcionalidade envolvida:** `tests/unit/components/Admin/{AdminPosts,AdminCrudBase,AdminSales}.test.js`, `tests/unit/utils/csvExport.test.js`, `tests/unit/tests-hygiene/package-lock-sync.test.js`, `tests/helpers/console.js`, `hooks/useApiFetch.js`, `utils/csvExport.js` e `jest.config.js`
- **Situação anterior (23/11/2026):** 39 dos 47 blocos `console.error`/`console.warn` nos logs locais eram ruído repetitivo (`OCOR-2026-11-23-01` e `OCOR-2026-11-23-02`), além de 8 blocos de falhas simuladas não silenciadas (`OCOR-2026-11-23-06`); adicionalmente, `jest.config.js` não coleta cobertura de `hooks/**`, `utils/**` e `pages/*.js` e não possui `coverageThreshold` específico para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` e `components/Admin/`.
- **Ação Executada (24/11/2026 — Higiene, eliminação e blindagem estrutural anti-recorrência):**
  - `hooks/useApiFetch.js` recebeu `isMountedRef` (StrictMode-safe), `requestSeqRef`, `isCurrent()` e saída antecipada para `url` vazia (`+3` testes em `tests/unit/hooks/useApiFetch.test.js`, sendo o último para `url=''` sem chamar `fetch`).
  - `tests/unit/components/Admin/AdminPosts.test.js` ganhou `renderAdminPosts()` determinístico com `waitFor` + `act`, correção da ordem do mock de `onReorder` e asserção no `afterEach` contra retorno de avisos `act(...)`.
  - `utils/csvExport.js` passou a prevenir navegação padrão em ambiente `jsdom` (`event.preventDefault()` `{ once: true }`) e a validar `columns` vazia/inválida (`onEmpty`), acompanhado da nova suíte `tests/unit/utils/csvExport.test.js` (`5 passed`), spy local em `AdminCrudBase.test.js`, novo caso sem mock de âncora em `AdminSales.test.js` e atualização de `docs/PROJECT_utils.md`.
  - `tests/helpers/console.js` ganhou `filterConsoleWarn` e os 5 arquivos negativos (`OCOR-2026-11-23-06`) passaram a usar `filterConsoleError`/`filterConsoleWarn` com asserção e `mockRestore()` (`console-no-global-assignment.test.js` aprovado).
  - Ajuste de estabilidade para WSL (8 GB RAM) em `jest.config.base.js` (`workerIdleMemoryLimit: '300MB'`) e `package.json` (`--maxWorkers=2` em `test:coverage` e `test:coverage:log`).
  - **Guarda preventiva pós-snapshot CI (`package-lock-sync.test.js`):** adicionada `tests/unit/tests-hygiene/package-lock-sync.test.js` para bloquear localmente qualquer dessincronia entre `package.json` e `package-lock.json` (`dependencies`, `devDependencies`, `optionalDependencies`), prevenindo recorrência da falha `npm ci` `EUSAGE` observada nos Runs `#168/#169/#177/#178/#183/#184`.
- **O que permanece em aberto (item 3 de cobertura):** Avaliar inclusão de `hooks/**/*.js` e `utils/**/*.js` em `collectCoverageFrom` de `jest.config.js` e adicionar `coverageThreshold` específicos para `pages/api/auth/` (agora em 100%), `pages/api/customer/`, `lib/payment/` e `components/Admin/` após fechar `5.6` e `5.7`.
- **Resultado parcial obtido:** Ruído `console.error`/`console.warn`/`act(...)`/navegação jsdom reduzido de **47 blocos para 0** em `logs/tests-output.log` e `logs/coverage-output.log`, com detector explícito no `npm run diag:actions` e guarda preventiva para sincronia de lockfile.
- **Prioridade:** **Baixa**.

---

## 6. Processos sem ocorrências identificadas
- **Análise Estática, Dependências Mortas e Higiene de Código (`npm run lint`, `npm run knip`, `npm run lint:chars`, `npm run lint:workflows`):** Nenhuma ocorrência identificada no período analisado nem após as mudanças finais de 24/11/2026 (0 erros e 0 avisos em `logs/eslint.log` com `[log-meta]`). *Atualização confirmada no CI remoto:* `npm run lint:chars` passou a integrar o job `lint` do workflow `.github/workflows/test-coverage.yml` (Runs `#190` e `#191` aprovados).
- **Scanners Estáticos de Segurança (`npm run security:check-sql` e `npm run security:check-credentials`):** Nenhuma ocorrência identificada após as mudanças finais de 24/11/2026 (0 vulnerabilidades). *Atualização confirmada no CI remoto:* `Audit Dependencies` (`npm audit --audit-level=high`) ativo e executado no job `lint` de `test-coverage.yml` (Runs `#190` e `#191`).
- **GitHub Actions Remoto (Estado Atual `0ab2716e`):** Todos os 4 workflows ativos (`Lint & Test Coverage Gate` `#191`, `E2E Isolated (Cypress)` `#185`, `Test Coverage Gate (banco real)` `#176` e `Load Tests (k6)` `#52`) estão verdes no `HEAD`, com **22 runs consecutivos sem falhas** desde `1793f90f` (confirmado via `logs/github-actions-snapshot.json`).
- **Conformidade Arquitetural (Site Público, Painel `/admin`, Modalidade A × B, RBAC, anti-SSRF, Google JWKS ADR-0042 e Timeout 1h ADR-0043):** Comportamento validado pelos testes disponíveis em 24/11/2026 (`244 suítes aprovadas (+8 .db ignoradas localmente, aprovadas no Run #176 do CI) / 2.141 testes aprovados (+96 .db)`) e coerente com `ARQUITETURA_SITE_PUBLICO.md` e `ARQUITETURA_SITE_PRIVADO.md`, com `pages/api/auth/login.js` elevado a **100%** de cobertura. *Limitações remanescentes:* lacunas de funções/branches em `components/Admin/AdminSales.js` (`5.6`), `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `pages/api/admin/integrity.js` e `lib/payment/mercadopago.js` (`5.7`), além de 4 domínios SQL sem `*.db.test.js` (`5.8`).
- **Preflight de Catálogo de Modelos (`npm run models:check`):** Revalidado em 24/11/2026: detecção explícita de `ENOENT` como `status: NÃO VERIFICADO` e validação sintática do preset local `zen` (`6 modelo(s), 1 reserva(s)`) com código de saída `2` (`AGENTS.md` §0.3 passo 6). *Limitação:* catálogo vivo do OpenCode não verificado fora do host OpenCode.

---

## 7. Plano de ação recomendado

### Correções necessárias
1. **[Alta] [CONCLUÍDO em 24/11/2026]** Reativar `Audit Dependencies` no `test-coverage.yml` e remover os blocos mortos `test-type == 'coverage'` de `.github/workflows/test-base.yml` (`5.5` / `OCOR-2026-11-23-03`) — **validado remotamente nos Runs `#190` e `#191`**.
2. **[Alta] [CONCLUÍDO em 24/11/2026]** Proteger a desestruturação e validação de `req.body` em `pages/api/auth/login.js:39` (e normalizada a chave `username.trim().toLowerCase()` na linha 82) para evitar `TypeError` não tratado antes do `try/catch` (`5.4` / `OCOR-2026-11-23-05`).
3. **[Média] [CONCLUÍDO em 24/11/2026]** Implementar paginação, detecção de truncamento, timeout HTTP de `10 s`, detector de ruído de console, extrator de erros de alto sinal (`extractErrorLinesFromJobLog`), resumo por workflow (`summarizeRunsByWorkflow`) e suporte a snapshot offline (`logs/github-actions-snapshot.json`) em `scripts/diagnostics/check-github-actions.js` e `github-actions-helper.js` (`5.9` / `OCOR-2026-11-23-04` e `07`).

### Novos testes
1. **[Alta] [CONCLUÍDO em 24/11/2026]** Cobertos rate limit por IP (com IP de socket real), backstop por usuário (case-insensitive), `untrustedForwarded`, `req.body` inválido/ausente, `?response=body` e erro simulado real em `last_login_at` (`tests/unit/pages/api/auth/login.edge.test.js`, `tests/integration/api/auth/login.test.js` e `tests/integration/api/login.test.js` — `100%` em `pages/api/auth/login.js`, `5.4` / `OCOR-2026-11-23-05`), além de **17** testes para `check-github-actions.js`/`github-actions-helper.js` (`5.9`), **3** novos testes em `useApiFetch.test.js` (`5.10`), **5** testes dedicados em `tests/unit/utils/csvExport.test.js`, **1** teste anti-recorrência em `AdminSales.test.js`, **2** testes em `test-coverage-comment.test.js` (`5.5`) e a nova suíte preventiva `tests/unit/tests-hygiene/package-lock-sync.test.js`.
2. **[Média] [PENDENTE]** Ampliar `tests/unit/components/Admin/AdminSales.test.js` cobrindo o modal de gerenciamento de pedido, filtros e `mapItemToFormData` (`5.6`; nota: testes de exportação CSV em `AdminSales.test.js` já existem e foram reforçados).
3. **[Média] [PENDENTE]** Cobrir branches negativas em `customer/auth.js`, `customer-auth.js` (incluindo `NODE_ENV='production'` sem `JWT_SECRET`), `checkout.js`, `integrity.js`, `mercadopago.js`, `products.js` e `AdminCategories.js` (`5.7`).
4. **[Média] [PENDENTE]** Criar suítes `*.db.test.js` para `categories`, `audit`, `dicas` e `images`, estendendo `schema-sources.test.js` para os demais módulos `lib/domain/*.js` (`5.8`).

### Melhorias preventivas
1. **[Baixa] [CONCLUÍDO em 24/11/2026]** Eliminados os 35 avisos `act(...)` (`hooks/useApiFetch.js` + `AdminPosts.test.js` + guarda de `url` vazia + asserção no `afterEach`), os 4 erros jsdom de navegação (`utils/csvExport.js` na origem + `AdminCrudBase.test.js` + `csvExport.test.js` + `AdminSales.test.js`), os 8 blocos de falha simulada (`filterConsoleError`/`filterConsoleWarn` nos 5 arquivos negativos), zerando os 47 blocos de ruído `console.error`/`console.warn`, ajustado consumo de RAM sob cobertura no WSL (`workerIdleMemoryLimit: '300MB'` + `--maxWorkers=2`) e adicionada `tests/unit/tests-hygiene/package-lock-sync.test.js` (`5.10` parcial / `OCOR-2026-11-23-01`, `02`, `06`).
2. **[Baixa] [PENDENTE]** Avaliar inclusão de `hooks/**` e `utils/**` em `collectCoverageFrom` e definir `coverageThreshold` para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` e `components/Admin/` após fechar `5.6` e `5.7` (`5.10`).

### Melhorias de segurança
1. **[Alta] [PARCIALMENTE CONCLUÍDO em 24/11/2026]** Auditoria contínua de vulnerabilidades npm reativada no workflow `test-coverage.yml` e validada nos Runs `#190`/`#191` (`5.5`), e `pages/api/auth/login.js` blindado com 100% de cobertura (`5.4`); permanecem pendentes as branches fail-closed de `customer-auth.js`, `customer/auth.js` e `checkout.js` (`5.7`).

### Melhorias de monitoramento
1. **[Média] [CONCLUÍDO em 24/11/2026]** Cabeçalho e rodapé `[log-meta]` adicionados via `run-with-log.js` em `package.json`, detecção de ruído de console em `summarizeJestLog`, extrator `extractErrorLinesFromJobLog` + `summarizeRunsByWorkflow` em `github-actions-helper.js` e script `npm run diag:actions:snapshot` com `--from-snapshot` e validade de `24 h` em `logs/github-actions-snapshot.json` (`5.9` / `OCOR-2026-11-23-07`).
2. **[Média] [CONCLUÍDO em 24/11/2026]** Executado `npm run diag:actions:snapshot` em host com conectividade autorizada (`2026-11-24T19:07:10.755Z`) e validados os `139` runs remotos da janela de 7 dias em `https://github.com/caminhar-deus/Caminhar/actions`. *(Manutenção semanal: regerar o snapshot antes de cada auditoria semanal em sandbox e lembrar que este ciclo atualizou `extractErrorLinesFromJobLog` para a próxima captura.)*

### Melhorias nos workflows
1. **[Alta] [CONCLUÍDO e VALIDADO REMOTAMENTE em 24/11/2026]** Integrado `npm run lint:chars` ao job `lint` de `test-coverage.yml`, ajustado `timeout-minutes` de `e2e.yml` para `25`, atualizado o comentário de contagem em `test-db-coverage.yml` para `8 arquivos *.db.test.js, 96 asserções` e confirmadas as execuções verdes `#191`, `#185`, `#176` e `#52` em `0ab2716e` (`5.5`).

### Status das ações da auditoria anterior (16/11/2026)
- **Ação 01:** Guarda estática de schema SQL e cobertura `customers`/`orders` → **Concluído em 16/11/2026**
- **Ação 02:** Diagnóstico claro de `ENOENT` (`status: NÃO VERIFICADO`) em `check-model-catalog.js` → **Concluído em 16/11/2026** (revalidado em 23/11/2026 e em 24/11/2026 com exit code `2`)
- **Ação 03:** Criação da spec E2E Cypress `cypress/e2e/checkout.cy.js` e `PROJECT_cypress.md` → **Concluído em 16/11/2026**
- **Manutenção Preventiva 01:** Acompanhar nova execução de `e2e.yml` após correção de `cy.intercept` em `01a4a3f` → **Concluído em 24/11/2026** (confirmado via `logs/github-actions-snapshot.json`: `E2E Isolated (Cypress)` com `42/44` aprovações na semana, zero falhas no Cypress e Runs `#184`/`#185` aprovados em `ff57a203`/`0ab2716e`)
- **Manutenção Preventiva 02:** Validar cartões e entrega de webhook no Sandbox Mercado Pago → **Concluído em 17–18/11/2026** (homologação Sandbox de cartão de crédito, pré-pago, boleto, PIX, devolução de estoque e webhook real via `cloudflared` registrados em `dbcbbc0`, `6b69224`, `554c056`–`feb768a` e `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 25)

---

## 8. Conclusão técnica
1. **Quais problemas foram efetivamente identificados na auditoria de 23/11/2026 e qual o estado em 24/11/2026?** Foram identificadas 7 ocorrências (`OCOR-2026-11-23-01` a `07`): **todas as 7 foram resolvidas e validadas até 24/11/2026** (`OCOR-2026-11-23-03` validado nos Runs `#190/#191`, `05` na blindagem/100% cobertura de `pages/api/auth/login.js`, `04` na paginação real de 2 páginas / `139` runs, `01` em `useApiFetch.js`/`AdminPosts.test.js`, `02` na origem em `utils/csvExport.js` + `AdminCrudBase.test.js`/`csvExport.test.js`/`AdminSales.test.js`, `06` no silenciamento com asserção dos 5 testes negativos e `07` com metadados `[log-meta]` locais + validação remota completa via `logs/github-actions-snapshot.json`, além da nova guarda `package-lock-sync.test.js` motivada pelas falhas históricas de `npm ci`).
2. **Quais processos apresentavam maior gravidade e como responderam às correções?** As duas prioridades Altas — auditoria de dependências/caracteres no CI (`test-coverage.yml`/`test-base.yml`) e proteção/cobertura de `pages/api/auth/login.js` — foram saneadas e confirmadas: `pages/api/auth/login.js` subiu para **`100% Stmts | 100% Branch | 100% Funcs | 100% Lines`** e o CI remoto executou `Lint & Test Coverage Gate` (`#191`), `E2E Isolated (Cypress)` (`#185`), `Test Coverage Gate (banco real)` (`#176`) e `Load Tests (k6)` (`#52`) com 100% de sucesso em `0ab2716e`. Adicionalmente, os 3 vetores recorrentes identificados (avisos `act(...)`, erro jsdom 31 e dependência de rede do sandbox) e a falha histórica de `npm ci` no CI receberam travas estruturais em código e testes, mantendo **`0`** ruídos em todos os logs locais.
3. **Quais limitações externas restam após a validação via snapshot?** (a) Sem rede dentro do sandbox para consultas ao vivo à `api.github.com`, o diagnóstico depende do snapshot `logs/github-actions-snapshot.json` gerado no host (`npm run diag:actions:snapshot`, validade `24 h`; a rodada atual de `139` runs já foi validada em `2026-11-24T19:07:10Z` e as `8` falhas já estão corrigidas em `main`); (b) ausência de Docker local faz as 8 suítes `*.db.test.js` (`96` testes) serem ignoradas localmente, mas o **`Test Coverage Gate (banco real)` Run `#176`** confirmou todas aprovadas em PostgreSQL real no CI; (c) ausência do CLI `opencode` no PATH (`npm run models:check` retornando código `2`, `status: NÃO VERIFICADO`); e (d) MCP `ai-memory` negado na sessão (sendo mantidos os arquivos do repositório como fonte direta, com registro do aviso de `20` itens em `_lint/report.md` reportado no `SessionStart`).
4. **Quais funcionalidades não apresentaram problemas identificados?** Os gates estáticos locais (`eslint`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql` e `security:check-credentials`), as `244` suítes executadas localmente (`2.141` testes aprovados, `6` snapshots, `95,73% Stmts/Lines | 86,60% Branch | 93,37% Funcs`, `0` ruídos de console) e os 4 workflows remotos no `HEAD` `0ab2716e` (`#191`, `#185`, `#176` e `#52`) estão 100% saudáveis e sem falhas.
5. **Quais funcionalidades ainda possuem lacunas de validação?** `components/Admin/AdminSales.js` (32,25% de funções cobertas — `5.6`), branches negativas/infra em `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `pages/api/admin/integrity.js`, `lib/payment/mercadopago.js`, `lib/domain/products.js` e `components/Admin/AdminCategories.js` (`5.7`), os 4 domínios SQL sem `*.db.test.js` (`categories`, `audit`, `dicas`, `images` — `5.8`) e a ampliação de `collectCoverageFrom`/thresholds em `jest.config.js` (`5.10`).
6. **Quais passos devem ser priorizados a seguir?** Executar os itens pendentes de prioridade Média (`5.6`, `5.7` e `5.8`), seguidos dos thresholds adicionais em `jest.config.js` (`5.10`), e após o próximo push rodar `npm run diag:actions:snapshot` em host com rede para confirmar a extração limpa de eventuais novos erros e acompanhar as próximas rodadas do CI.

---

## 9. Histórico das auditorias

### Auditoria de 04/11/2026 — 05/11/2026
- **Período analisado:** 29/10/2026 a 05/11/2026
- **Resumo:** Identificado aviso de encerramento de worker no Jest (posteriormente resolvido com cancelamento de timers e unref em polyfills). Criada a suíte de *null tolerance* para APIs administrativas (`null-tolerance.edge.test.js`). Descomissionado o arquivo órfão `jest.setup.js`. Integrada a API REST do GitHub Actions (HTTP 200). Blindagem de acessibilidade e testes do `ImageLightbox`.
- **Situação:** 100% dos pontos resolvidos.

### Auditoria de 09/11/2026 — 11/11/2026
- **Período analisado:** 02/11/2026 a 11/11/2026
- **Resumo:** Auditoria semanal realizada com base em logs locais, histórico de commits e workflows do GitHub Actions. Zero erros ou falhas encontrados. Implementadas as ações do plano de estabilidade e monitoramento contínuo: (1) testes unitários de benchmark (`bench-citacoes.test.js` e `fatosOrchestrator`), (2) diagnóstico híbrido de CI com suporte a contingência local em `npm run diag:actions`, (3) polling resiliente em testes assíncronos de disco (`upload-image-disk.test.js`) e (4) tabela de tendência histórica de performance. 227 suítes e 1.830 testes passando com 100% de sucesso. Gates de qualidade (`knip`, `eslint`, `actionlint`) 100% limpos.
- **Situação:** Projeto estável, melhorias implementadas e sem pendências críticas.

### Auditoria de 16/11/2026
- **Período analisado:** 09/11/2026 a 16/11/2026
- **Resumo:** Auditoria técnica semanal consolidando o ciclo evolutivo do Mercado Pago (Orders API, checkout transparente, reconciliação ativa ADR-0041), preflight de catálogo de modelos e suítes `.db.test.js`. No mesmo ciclo, foram implementados os 3 itens de melhoria identificados: (1) guarda estática de schema drift e validação de colunas SQL `INSERT`/`UPDATE` em `customers.js` e `orders.js` (`schema-sources.test.js`), (2) formatação clara de `ENOENT` como `status: NÃO VERIFICADO` com checagem sintática do preset local em `models:check` (`model-catalog.js`, `check-model-catalog.js`, `check-model-catalog.test.js`), e (3) criação da spec E2E `cypress/e2e/checkout.cy.js` (4 cenários) com atualização de `docs/PROJECT_cypress.md`. Suíte completa com 232 suítes e 1.926 testes passando (8 suítes `.db` / 96 testes ignorados localmente) e todos os gates estáticos 100% limpos.
- **Situação:** Concluída com sucesso e melhorias implementadas. O `test-db-coverage.yml` (Runs `#128` e `#129`) já foi validado com 100% de aprovação no PostgreSQL real; o `e2e.yml` (Runs `#137` e `#138`, job `133405451234`) exercitou os 29 cenários e apontou o bug de overload em `cy.intercept('GET', { pathname, query }, ...)` no 4º cenário de `cypress/e2e/checkout.cy.js`, já corrigido para `cy.intercept('GET', '/api/customer/orders', ...)`. Acompanhamento de `e2e.yml` transferido para a rodada seguinte e bateria Sandbox Mercado Pago fechada em 17–18/11/2026.

### Auditoria de 23/11/2026 — Atualização e Blindagem de 24/11/2026 (Atual)
- **Período analisado:** 16/11/2026 a 23/11/2026 (últimos 7 dias móveis; execução inicial em `ff57a203` e blindagem estrutural anti-recorrência em 24/11/2026)
- **Resumo (23/11/2026 — Coleta e Diagnóstico):** Auditoria analítica inicial abrangendo `logs/{tests-output,coverage-output,eslint}.log` (21–22/11/2026), definições locais de workflows/actions, 40 commits (`b37c9f1` a `ee4ed2e`) e verificadores estáticos. Zero falhas nos 241 arquivos / 2.090 testes locais (8 suítes `.db` / 96 testes ignorados), cobertura global de 95,48% L / 86,31% B / 93,37% F e identificação das 7 ocorrências (`OCOR-2026-11-23-01` a `07`) e 7 oportunidades (`5.4` a `5.10`).
- **Ações Executadas (24/11/2026 — Commit `ff57a203` + Blindagem Estrutural Anti-Recorrência):**
  - *Rodada `ff57a203`:* portados `Run Character Lint` e `Audit Dependencies` para `test-coverage.yml` (removendo blocos mortos de `test-base.yml`), blindada `req.body` + `username.trim().toLowerCase()` em `pages/api/auth/login.js` (`100%` cobertura), adicionados `isMountedRef`/`requestSeqRef`/`isCurrent()` em `hooks/useApiFetch.js`, silenciados os 5 testes negativos (`tests/helpers/console.js`) e adicionados paginação de runs + wrappers `[log-meta]` (`run-with-log.js`).
  - *Blindagem estrutural complementar + memória WSL:* saída antecipada para `url` vazia em `hooks/useApiFetch.js`, sincronização determinística e guarda anti-`act(...)` em `AdminPosts.test.js`, eliminação na origem do erro jsdom 31 (`event.preventDefault()` condicional + validação de `columns`) em `utils/csvExport.js` com nova suíte `tests/unit/utils/csvExport.test.js` (`5 passed`) + caso sem mock de âncora em `AdminSales.test.js` + `docs/PROJECT_utils.md`, detector de ruído em `summarizeJestLog`, timeout HTTP de `10 s` + snapshot offline auditável (`npm run diag:actions:snapshot` / `--from-snapshot`, validade `24 h`) em `check-github-actions.js`/`github-actions-helper.js`/`check-github-actions.test.js` (`15 passed`), além de `workerIdleMemoryLimit: '300MB'` (`jest.config.base.js`) e `--maxWorkers=2` em `test:coverage*` (`package.json`).
  - *Validação remota via snapshot e blindagem final (24/11/2026):* analisadas as `139` execuções em `logs/github-actions-snapshot.json` (`131 success`, `8 failure`, `pagesFetched: 2`), confirmando os 4 workflows ativos 100% verdes em `0ab2716e` (`#191`, `#185`, `#176`, `#52`), encerrando `Manutenção Preventiva 01` e `OCOR-2026-11-23-03`/`07`; rastreadas as 8 falhas anteriores a 2 incidentes já corrigidos (`eaeb298d` e `1793f90f`); adicionados `extractErrorLinesFromJobLog` + `summarizeRunsByWorkflow` em `github-actions-helper.js`/`check-github-actions.js` (`17 passed`) e a guarda preventiva `tests/unit/tests-hygiene/package-lock-sync.test.js`.
  - *Estado pós-validação:* **244 suítes aprovadas (+8 `.db` ignoradas localmente, aprovadas no Run `#176`) / 2.141 testes aprovados (+96 `.db`)**, `6` snapshots, cobertura **95,73% Stmts/Lines | 86,60% Branch | 93,37% Funcs**, **0 ruídos de console/`act`/jsdom** e gates estáticos 100% limpos.
- **Situação dos pontos e pendências:** `OCOR-2026-11-23-01` a `07`, `Manutenção Preventiva 01` e oportunidades `5.3`, `5.4`, `5.5` e `5.9` **resolvidos e validados** (`5.10` parcial); permanecem abertas as oportunidades evolutivas `5.6`, `5.7`, `5.8` e a revisão de escopo/thresholds em `jest.config.js` (`5.10`).
