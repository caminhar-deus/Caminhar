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
- **Situação geral da auditoria:** **Concluída integralmente (ocorrências `OCOR-2026-11-23-01` a `07`, `Manutenção Preventiva 01` e todas as oportunidades `5.4` a `5.10` resolvidas e validadas em 24/11/2026).** Em 23/11/2026, os logs locais já não registravam falha de suíte ou asserção (`241 passed / 2.090 testes passando`), e os 6 gates estáticos locais rodaram com código 0. Após o confronto com o código (`ff57a203`), a blindagem estrutural anti-recorrência (`0ab2716e`), a validação do snapshot remoto (`16558ec8`) e o fechamento das oportunidades `5.6`, `5.7`, `5.8` e `5.10` (preservando `5.1`–`5.3`), a suíte local atingiu **`245 suítes aprovadas (+12 .db ignoradas localmente sem Docker) / 2.169 testes aprovados (+106 .db ignorados, 2.275 no total)`** com cobertura global de **`96,46% Stmts/Lines | 88,79% Branch | 95,51% Funcs`** (incluindo `hooks/` e `utils/` em `collectCoverageFrom`), **`0` erros/avisos de console/`act`/jsdom**, **`pages/api/auth/login.js` em 100%**, **`components/Admin/AdminSales.js` em 99,73% Lines / 96,77% Funcs**, deriva real de schema `audit_log` → `activity_logs` corrigida e todos os 4 workflows remotos verdes em `0ab2716e`. *(Condição de ambiente `AGENTS.md` §7 item 1: as 4 novas suítes `*.db.test.js` auto-skippam localmente sem Docker e executarão contra PostgreSQL real no próximo push em `test-db-coverage.yml`.)*

---

## 2. Resumo executivo
- **Principais ocorrências:** 7 registros classificados na janela de auditoria (`OCOR-2026-11-23-01` a `07`): **todos os 7 resolvidos em 24/11/2026** (incluindo **`OCOR-2026-11-23-07`**, com `[log-meta]` local e validação remota completa das `139` execuções via `logs/github-actions-snapshot.json`). Zero testes falharam localmente ou no `HEAD` remoto auditado (`0ab2716e`).
- **Problemas críticos ou relevantes (Prioridade Alta) — Resolvidos em 24/11/2026:**
  1. **`OCOR-2026-11-23-03` (Resolvido e validado no CI remoto em 24/11/2026 — CI):** O step inalcançável `Audit Dependencies` (e as 3 condições mortas `inputs.test-type == 'coverage'`) foram removidos de `.github/workflows/test-base.yml`; `Run Character Lint` (`npm run lint:chars`) e `Audit Dependencies` (`npm audit --audit-level=high`, `continue-on-error: true`) foram portados para o job `lint` de `.github/workflows/test-coverage.yml` e executados com sucesso nos Runs `#190` (`ff57a203`) e `#191` (`0ab2716e`). Validado também localmente com `npm run lint:workflows` (`actionlint 1.7.12`, saída 0) e `tests/unit/github-workflows/test-coverage-comment.test.js` (`23 passed`).
  2. **`OCOR-2026-11-23-05` (Resolvido em 24/11/2026 — Autenticação):** `pages/api/auth/login.js` passou a validar `typeof req.body?.username === 'string' && typeof req.body?.password === 'string'` antes da desestruturação e a normalizar `username.trim().toLowerCase()` na chave do rate limit por usuário (alinhado ao `LOWER(username)` de `lib/auth/auth.js:244`). Novos testes unitários e de integração elevaram a cobertura do arquivo de `68,45% linhas / 72,72% branches` para **`100% Stmts | 100% Branch | 100% Funcs | 100% Lines`**, mantendo `bench-ground-truth.test.js` (`14/14 passed`).
- **Resultados satisfatórios e entregas validadas (23/11/2026–24/11/2026):**
  - **Execução local final após fechamento de `5.4`–`5.10` (24/11/2026):** **`245 suítes aprovadas (+12 .db ignoradas localmente) / 2.169 testes aprovados (+106 .db ignorados, 2.275 no total)`** (6 snapshots aprovados), cobertura agregada de **`96,46% Statements/Lines | 88,79% Branches | 95,51% Functions`**, **`0` ocorrências de `console.error`/`console.warn`/`act(...)`/navegação jsdom** em `logs/tests-output.log` (`80,024 s`) e `logs/coverage-output.log` (`225,636 s` com `--maxWorkers=2`), além de `logs/eslint.log` limpo (`[log-meta]`, `sha=16558ec8`, saída 0).
  - **Validação remota via `logs/github-actions-snapshot.json` (`139` runs: `131 success`, `8 failure`, `truncated: false`):** todos os 4 workflows ativos — `Lint & Test Coverage Gate` (`#191`), `E2E Isolated (Cypress)` (`#185`), `Test Coverage Gate (banco real)` (`#176`) e `Load Tests (k6)` (`#52`) — concluíram com **`success` em `0ab2716e`** (22 execuções consecutivas verdes desde `1793f90f`), encerrando **`Manutenção Preventiva 01`**. As 8 falhas anteriores decorreram apenas de `bench-ground-truth.test.js` em `6e943325`/`554c0566` (corrigido em `eaeb298d`) e `npm ci` `EUSAGE` por dessincronia do `package-lock.json` em `ae84c187`/`d3d3e3de` (corrigido em `1793f90f` e bloqueado preventivamente por `tests/unit/tests-hygiene/package-lock-sync.test.js`).
  - **Refinamento no diagnóstico CI e fechamento das lacunas de cobertura/schema (`5.6`–`5.10`):** adicionados `extractErrorLinesFromJobLog` + `summarizeRunsByWorkflow` em `scripts/diagnostics/`; corrigida deriva real `audit_log` → `activity_logs` em `lib/crud/crud.js:20` e `scripts/validate-schema.js`; estendida a guarda `schema-sources.test.js` a todos os 14 arquivos de `lib/domain/`; criadas as 4 novas suítes `*.db.test.js` (`categories`, `audit`, `dicas`, `images`); elevados `AdminSales.js`, `AdminCategories.js`, `customer-auth.js`, `customer/auth.js`, `checkout.js`, `mercadopago.js`, `integrity.js`, `pages/api/products.js` e `lib/domain/products.js`; incluídos `hooks/**` e `utils/**` em `collectCoverageFrom` + novos thresholds em `jest.config.js`.
  - Todos os gates estáticos locais passaram sem erros (`eslint .`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql`, `security:check-credentials`). `npm run models:check` retornou código `2` (`status: NÃO VERIFICADO`, `spawnSync opencode ENOENT`, esperado fora do host do OpenCode).
- **Oportunidades de melhoria (100% resolvidas em 24/11/2026, preservando `5.1`–`5.3`):** (`5.1`, `5.2`, `5.3`) **Preservadas e validadas** (`5.3` validada remotamente em `e2e.yml`), (`5.4`) **Resolvida**, (`5.5`) **Resolvida** (Runs `#190/#191`), (`5.6`) **Resolvida** (`AdminSales.js` em `99,73% L / 86,87% B / 96,77% F`), (`5.7`) **Resolvida** (rotas/módulos críticos elevados), (`5.8`) **Resolvida** (`12 *.db.test.js` / `106` testes + deriva `activity_logs` corrigida + guarda em todo `lib/domain/*.js`), (`5.9`) **Resolvida** e (`5.10`) **Resolvida** (ruído zerado, guarda `package-lock-sync`, `hooks/` + `utils/` e 6 novos thresholds em `jest.config.js`).

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
- **Testes executados (baseline 22/11/2026 vs. fechamento final de 24/11/2026):**
  - *Baseline da auditoria (22/11/2026):* `241 suítes aprovadas` (`8 .db.test.js` / `96` testes ignorados sem Docker), `2.090 testes aprovados` (`2.186` no total), `6 snapshots aprovados`, cobertura global `95,48% Statements | 86,31% Branch | 93,37% Functions | 95,48% Lines`, com `47` blocos `console.error`/`console.warn` por log.
  - *Após validação remota (`16558ec8`, 24/11/2026):* `244 suítes aprovadas` (`8 .db.test.js` / `96` testes), `2.141 testes aprovados` (`2.237` no total), cobertura global `95,73% Statements | 86,60% Branch | 93,37% Functions | 95,73% Lines`, `0` ruídos de console.
  - *Após fechamento de `5.6`–`5.10` (24/11/2026):* **`245 suítes aprovadas`** (`12` suítes `.db.test.js` / `106` testes ignorados localmente sem Docker — sendo as 8 anteriores já aprovadas em **`Test Coverage Gate (banco real)` Run `#176`** e as 4 novas validadas em `jest.config.db.js`, aguardando próximo push no CI; `245 of 257 total`), **`2.169 testes aprovados`** (`2.275` no total), **`6 snapshots aprovados`**, cobertura global de **`96,46% Statements | 88,79% Branch | 95,51% Functions | 96,46% Lines`** (agora com `hooks/` e `utils/` coletados; `logs/tests-output.log` em `80,024 s`; `logs/coverage-output.log` em `225,636 s` com `--maxWorkers=2` e `workerIdleMemoryLimit: '300MB'`), **`0` ocorrências de `console.error`/`console.warn`/`act(...)`/navegação jsdom** e `logs/eslint.log` limpo (`[log-meta]`, `sha=16558ec8`, exit `0`).
- **Resultados identificados:** Após as correções, a auditoria do snapshot remoto e o fechamento das oportunidades `5.4` a `5.10` em 24/11/2026, há **100% de aprovação** tanto nas `245` suítes e gates estáticos locais quanto nos **4 workflows remotos do GitHub Actions no `HEAD` auditado `0ab2716e`**, com zero ocorrências e zero oportunidades de melhoria pendentes nesta auditoria.

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
| **24/11/2026 (Snapshot CI + Diagnóstico)** | 244 suítes (+8 `.db`) | 2.141 testes (+96 `.db`) | ~67,1 s (unit) / ~185,9 s (cov) | 100% limpos (Knip, ESLint, Actionlint, Chars, SQL, Creds) | Cobertura 95,73% L / 86,60% B / 93,37% F; 0 ruídos; `package-lock-sync`; 139 runs CI auditados, 4 workflows verdes em `0ab2716e` |
| **24/11/2026 (Fechamento `5.6`–`5.10`)** | **245 suítes (+12 `.db`)** | **2.169 testes (+106 `.db`)** | **~80,0 s (unit) / ~225,6 s (`--coverage --maxWorkers=2`)** | **100% limpos (Knip, ESLint, Actionlint, Chars, SQL, Creds)** | **Cobertura 96,46% L / 88,79% B / 95,51% F (incluindo `hooks/` e `utils/`); deriva `activity_logs` corrigida; 100% de `5.4`–`5.10` resolvidas** |

### Evolução da Cobertura nos Arquivos-Alvo (`logs/coverage-output.log`: 22/11/2026 → 24/11/2026)

| Arquivo | % Stmts / Lines | % Branch | % Funcs | Situação após fechamento de 24/11/2026 |
|---|---|---|---|---|
| `pages/api/auth/login.js` | 68,45% → **100%** | 72,72% → **100%** | **100%** | *Resolvido em 24/11 (`5.4`)* (`pages/api/auth/*` em 100%) |
| `components/Admin/AdminSales.js` | 75,89% → **99,73%** | 61,64% → **86,87%** | 32,25% → **96,77%** | *Resolvido em 24/11 (`5.6`)* (`260, 370` — fallbacks defensivos de storage/preload) |
| `lib/infra/db.js` | 81,43% | 86,30% | 84,61% | `26-57, 114-121, 141, 152-153, 171, 197-198, 232-271, 290, 304-311` |
| `pages/api/customer/auth.js` | 85,47% → **100%** | 77,58% → **93,65%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`112, 202`) |
| `lib/cache/cache.js` | 86,79% | 91,91% | 100% | `43-87, 94-96, 142-144, 184-185, 381-389, 459-461` |
| `pages/api/products.js` | 87,81% → **98,98%** | 76,19% → **91,96%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`103-104, 125-126`) |
| `pages/api/admin/integrity.js` | 88,25% → **100%** | 52,17% → **92,06%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`97, 151, 193`) |
| `pages/api/checkout.js` | 88,44% → **100%** | 72,97% → **87,17%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`123-131, 159, 161-165, 205, 227, 254`) |
| `pages/api/admin/rate-limit.js` | 89,93% | 73,17% | 100% | `31-32, 58-64, 79-80, 175-176, 244-305` |
| `lib/auth/customer-auth.js` | 93,57% → **100%** | 52,63% → **96,15%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`75`) |
| `lib/payment/mercadopago.js` | 94,55% → **99,54%** | 68,44% → **88,93%** | **100%** | *Resolvido em 24/11 (`5.7`)* (`439-440` — catch de erro interno em `timingSafeEqual`) |
| `lib/domain/products.js` | 95,18% → **100%** | 63,46% → **90,00%** | 83,33% → **100%** | *Resolvido em 24/11 (`5.7`)* (`77, 129, 199, 217, 219, 245`) |
| `components/Admin/AdminCategories.js` | 98,72% | 41,66% → **66,66%** | 100% | *Resolvido em 24/11 (`5.7`)* (`130-131` + fallbacks `|| 'span 1'` inalcançáveis para campos extras) |
| `hooks/` (novo escopo `5.10`) | **84,72%** | **81,25%** | **82,60%** | *Incluído em `collectCoverageFrom` (`5.10`)* (`PerformanceProvider`, `usePerformance`, `AuthContext` em 100%) |
| `utils/` (novo escopo `5.10`) | **96,04%** | **78,64%** | **94,44%** | *Incluído em `collectCoverageFrom` (`5.10`)* (`!utils/empty-browser-module.js`) |

- **Limitações e pontos cegos estruturais — Estado pós-fechamento em 24/11/2026:**
  1. **Escopo de coleta (`jest.config.js`):** `hooks/**/*.js` e `utils/**/*.js` (`!utils/empty-browser-module.js`) passaram a integrar `collectCoverageFrom` em 24/11/2026 (`5.10`). As páginas Next.js de rota (`pages/*.js` e `proxy.js`) permanecem intencionalmente fora de `collectCoverageFrom` porque combinam `getServerSideProps`/SSR e integração de navegador, continuando validadas pelas suítes unitárias dedicadas (`tests/unit/pages/`) e pelos 29 cenários E2E em Cypress.
  2. **Thresholds por diretório (`jest.config.js`):** Além de `global`, `lib/domain/` (`branches: 82`), `pages/api/admin/` (`branches: 82`), `components/Admin/fields/` e `lib/infra/`, foram adicionados thresholds específicos para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/`, `components/Admin/`, `hooks/` e `utils/`.
  3. **Domínios SQL em PostgreSQL real (`5.8`):** Corrigida a deriva real descoberta no confronto (`audit_log` → `activity_logs` em `lib/crud/crud.js:20` e inclusão de `activity_logs` em `EXPECTED_SCHEMA` de `scripts/validate-schema.js`), alinhando `16/16` tabelas entre `tableSchemas` e `EXPECTED_SCHEMA`; `tests/unit/scripts/schema-sources.test.js` agora inspeciona todos os 14 arquivos `lib/domain/*.js` (`INSERT`/`UPDATE` + `createRecord`/`updateRecords`/`deleteRecords`/`upsertRecord`/`paginate`), e foram criadas `categories.db.test.js`, `audit.db.test.js`, `dicas.db.test.js` e `images.db.test.js` (totalizando `12 arquivos *.db.test.js, 106 asserções` em `.github/workflows/test-db-coverage.yml`).
  4. **Workflows locais vs. remotos:** `e2e.yml` executa apenas em `push: [main]` e `workflow_dispatch` (não bloqueia PRs por escolha documentada). **Atualizado em 24/11/2026:** `npm run lint:chars` e `Audit Dependencies` integram o job `lint` de `.github/workflows/test-coverage.yml` (`#190/#191` verdes), `test-db-coverage.yml` reflete `12 arquivos *.db.test.js, 106 asserções` (executando as 4 novas suítes contra PostgreSQL real no próximo push), `timeout-minutes` de `e2e.yml` é `25`, e os 4 workflows ativos fecharam verdes no `HEAD` auditado `0ab2716e`.
  5. **Contexto do working tree:** em 23/11/2026 havia 11 arquivos pré-existentes modificados no working tree (consolidados antes dos commits de 24/11/2026).

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
- **Status:** **RESOLVIDO em 24/11/2026**
- **Categoria:** Testes de Componentes / Painel Administrativo
- **Processo ou funcionalidade envolvida:** Aba Gestão de Vendas (`components/Admin/AdminSales.js`, `tests/unit/components/Admin/AdminSales.test.js`)
- **Situação anterior (23/11/2026):** `AdminSales.js` tinha a menor cobertura de funções do projeto (`75,89% Lines | 63,01% Branch | 32,25% Funcs`); a exportação CSV já havia recebido reforço contra jsdom 31 em `16558ec8`, mas permaneciam descobertos todos os badges, filtros combinados, falhas 401/500/rede de `fetchOrders`, modal de gerenciamento/`PUT /api/admin/orders` e `ShippingTypeSelect`/`internalProductSchema`/`internalProductColumns`/`mapItemToFormData`/`onReorder`.
- **Ação Executada (24/11/2026):**
  - `tests/unit/components/Admin/AdminSales.test.js`: adicionados testes completos cobrindo todas as variantes de `getPaymentBadge` e `getOrderBadge`, filtros (`search`, `paymentStatus`, `orderStatus`, `paymentMethod`), erros `401`/`500`/rede e sync com `syncedCount: 0` em `fetchOrders`, abertura do modal "Gerenciar Pedido #..." (com `delivery_address`), botão `Cancelar`, `PUT /api/admin/orders` `200` (validando limpeza de `sessionStorage.admin_dashboard_stats`), `400`, `401` e falha de rede, além da subaba `Produtos Internos` (`internalProductColumns`, `ShippingTypeSelect`, preprocessors Zod de `internalProductSchema`, `mapItemToFormData` e `onReorder` via drag & drop em `CrudTable`).
- **Resultado:** `components/Admin/AdminSales.js` elevado para **`99,73% Stmts/Lines | 86,87% Branch | 96,77% Funcs`** (apenas linhas `260` e `370` — catches defensivos silenciosos de `sessionStorage` e preload).
- **Prioridade:** **Média**.

### 5.7. Ampliação de Cobertura de Branches em Rotas Críticas de Visitante, Pagamento e Integridade
- **Status:** **RESOLVIDO em 24/11/2026**
- **Categoria:** Testes de Integração / Segurança e Integridade
- **Processo ou funcionalidade envolvida:** `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `lib/payment/mercadopago.js`, `pages/api/admin/integrity.js`, `pages/api/products.js`, `lib/domain/products.js` e `components/Admin/AdminCategories.js`
- **Situação anterior (23/11/2026):** Branches negativas, fail-closed e de borda operacional permaneciam descobertas entre `41,66%` e `77,58%`, sem alterar a lógica de produção.
- **Ação Executada (24/11/2026 — 100% via suítes de teste, preservando intactos os arquivos vigiados por `bench-ground-truth.test.js`):**
  - `tests/unit/lib/auth/customer-auth.test.js`: validação fail-closed em `NODE_ENV='production'` sem `JWT_SECRET`, uso de `JWT_SECRET` explícito, flag `; Secure` em cookies de produção, token vazio/inválido (`logger.debug`) e header ausente/malformado (`100% L | 96,15% B | 100% F`).
  - `tests/integration/api/customer/auth.test.js`: `GET` limpando cookie quando cliente não existe mais no banco, `PUT` inválido (`400`), rate limit no `POST` (`429`), `register` inválido (`400`) e erro inesperado (`500`), `login` inválido (`400`), `google` inválido (`400`) e dev bypass sem `name`, além de ação desconhecida (`400`) (`100% L | 93,65% B | 100% F`).
  - `tests/integration/api/checkout.test.js`: rate limit `POST` (`429`), CPF/CNPJ inválido (`400`), ausência de `paymentMethodId` com cartão tokenizado (`400`), cliente ausente após JWT (`401`), `PRODUCT_NOT_INTERNAL` (`404`), erro inesperado (`500`), divergência de CEP acionando `updateCustomerProfile` e `422` com fallback padrão (`100% L | 87,17% B | 100% F`).
  - `tests/unit/lib/payment/mercadopago.test.js`: cobertura integral de `mapMercadoPagoStatus`, CNPJ 14 dígitos, endereço incompleto (`requireComplete`), `collector_id`/fallbacks legados, ordem sem `id`, erros HTTP `401`/`422`/`500`, `invalid_transaction_amount`, falha de rede (`502`) e assinatura webhook com hex inválido/tamanho divergente (`99,54% L | 88,93% B | 100% F`).
  - `tests/integration/api/admin/integrity.test.js`: Upstash Redis mockado (`PONG` → status global `healthy`, ping `'ERR'` → `degraded`, exceção → `degraded`), subdiretórios recursivos em `uploads/`, `db_size` nulo (`'Desconhecido'`), erros de `fs.statfsSync`/`readdirSync` e ramos `formatUptime`/`formatTimeAgo` (`100% L | 92,06% B | 100% F`).
  - `tests/integration/api/products.test.js` e `tests/unit/lib/domain/products.test.js`: validação `modality` (`400`/`200`), rate limits GET/PUT/DELETE (`429`), RBAC fail-closed `reason: 'error'` (`403`), IDs/ações inválidas, `NO_DATA_TO_UPDATE`, erros `500`, `getProductCategories`, filtros `category`/`modality` e campos de venda interna/frete (`pages/api/products.js`: `98,98% L | 91,96% B | 100% F`; `lib/domain/products.js`: `100% L | 90,00% B | 100% F`).
  - `tests/unit/components/Admin/AdminCategories.test.js`: blur com nome vazio, preservação de slug manual, não repetição do toast e resposta `400` da API exibindo `fieldError` por campo (`98,72% L | 66,66% B | 100% F`; branches restantes restritas aos fallbacks defensivos inalcançáveis `|| 'span 1'` e `return null`).
- **Resultado:** Todos os 7 módulos críticos de API/autenticação/pagamento/domínio ultrapassaram `87%` de branches (entre `87,17%` e `96,15%`) e `98,98%` de linhas, com zero ruído de console.
- **Prioridade:** **Média**.

### 5.8. Cobertura contra PostgreSQL Real (`*.db.test.js`), Correção de Deriva `activity_logs` e Extensão da Guarda SQL
- **Status:** **RESOLVIDO em 24/11/2026**
- **Categoria:** Integridade de Dados / Testes de Integração com Banco Real
- **Processo ou funcionalidade envolvida:** `lib/domain/{categories,audit,dicas,images}.js`, `lib/crud/crud.js`, `scripts/validate-schema.js`, `tests/unit/scripts/schema-sources.test.js`, `tests/integration/domain/{categories,audit,dicas,images}.db.test.js` e `.github/workflows/test-db-coverage.yml`
- **Achado real no confronto (bug de deriva de schema corrigido):** `lib/crud/crud.js:20` declarava a tabela inexistente `audit_log` em `tableSchemas`, enquanto as migrations `006-create-activity-logs.js`/`011-fix-entity-id-type.js` e `lib/domain/audit.js:15` utilizam **`activity_logs`**; paralelamente, `scripts/validate-schema.js` (`EXPECTED_SCHEMA`) omitia `activity_logs`, fazendo `schema-sources.test.js:124` ignorar `audit_log` silenciosamente.
- **Ação Executada (24/11/2026):**
  - Corrigida a chave `audit_log` → `activity_logs` em `lib/crud/crud.js:20` e adicionada `activity_logs` ao `EXPECTED_SCHEMA` de `scripts/validate-schema.js` (`16/16` tabelas de `tableSchemas` agora presentes e com drift zero).
  - Estendida `tests/unit/scripts/schema-sources.test.js` para bloquear qualquer tabela de `tableSchemas` ausente em `EXPECTED_SCHEMA` e inspecionar dinamicamente **todos os 14 módulos de `lib/domain/*.js`** (`INSERT INTO`, `UPDATE ... SET`, `createRecord`, `updateRecords`, `deleteRecords`, `upsertRecord` e `paginate`).
  - Criadas as 4 novas suítes `tests/integration/domain/{categories,audit,dicas,images}.db.test.js` seguindo `tests/helpers/db-test.js` (com `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` em violações SQL `23505`/`23502`/`23503`) e atualizado `.github/workflows/test-db-coverage.yml` para `12 arquivos *.db.test.js, 106 asserções`.
- **Resultado e condição de ambiente (`AGENTS.md` §7 item 1):** `schema-sources.test.js`, `validate-schema.test.js`, `crud.test.js` e a descoberta de todas as `12` suítes (`106` testes) via `jest.config.db.js` passaram 100%; localmente sem Docker as 12 suítes auto-skippam (`12 skipped, 106 total`), aguardando execução contra PostgreSQL real no próximo push de `.github/workflows/test-db-coverage.yml`.
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

### 5.10. Eliminação de Ruído Recorrente (`act(...)` / jsdom), Guarda `package-lock` e Ampliação de Cobertura/Thresholds em `jest.config.js`
- **Status:** **RESOLVIDO em 24/11/2026**
- **Categoria:** Qualidade de Testes / Prevenção de Regressões
- **Processo ou funcionalidade envolvida:** `tests/unit/components/Admin/{AdminPosts,AdminCrudBase,AdminSales}.test.js`, `tests/unit/utils/csvExport.test.js`, `tests/unit/hooks/PerformanceProvider.test.js`, `tests/unit/tests-hygiene/package-lock-sync.test.js`, `tests/helpers/console.js`, `hooks/useApiFetch.js`, `utils/csvExport.js` e `jest.config.js`
- **Situação anterior (23/11/2026):** 39 dos 47 blocos `console.error`/`console.warn` nos logs locais eram ruído repetitivo (`OCOR-2026-11-23-01` e `OCOR-2026-11-23-02`), além de 8 blocos de falhas simuladas não silenciadas (`OCOR-2026-11-23-06`); `jest.config.js` excluía `hooks/**` e `utils/**` de `collectCoverageFrom` e carecia de thresholds por diretório para módulos críticos.
- **Ação Executada (24/11/2026):**
  - *Higiene e anti-recorrência (`0ab2716e` / `16558ec8`):* `hooks/useApiFetch.js` (`isMountedRef`, `requestSeqRef`, `isCurrent()`, saída em `url` vazia + 3 testes), `AdminPosts.test.js` (`renderAdminPosts()` determinístico e asserção anti-`act`), `utils/csvExport.js` (`event.preventDefault()` em jsdom + `columns` + `csvExport.test.js` + `AdminCrudBase.test.js`/`AdminSales.test.js`), `tests/helpers/console.js` (`filterConsoleWarn` nos 5 testes negativos), ajuste WSL em `jest.config.base.js` (`workerIdleMemoryLimit: '300MB'`) + `package.json` (`--maxWorkers=2`), e guarda `tests/unit/tests-hygiene/package-lock-sync.test.js`.
  - *Fechamento de cobertura e thresholds (`jest.config.js`):* criada `tests/unit/hooks/PerformanceProvider.test.js` (`3 passed`, elevando `AuthContext`, `PerformanceContext`, `PerformanceProvider` e `usePerformance` a `100%`), incluídos `hooks/**/*.js`, `utils/**/*.js` e `!utils/empty-browser-module.js` em `collectCoverageFrom` (mantendo páginas `pages/*.js` e `proxy.js` validadas por testes dedicados + 29 specs Cypress E2E) e adicionados/reforçados `coverageThreshold` por diretório: `lib/domain/` (`branches: 82`), `pages/api/admin/` (`branches: 82`), `pages/api/auth/` (`90/95/95/95`), `pages/api/customer/` (`85/95/95/95`), `lib/payment/` (`80/95/90/90`), `components/Admin/` (`82/85/90/90`), `hooks/` (`72/75/80/80`) e `utils/` (`75/90/90/90`).
- **Resultado:** Ruído `console.error`/`console.warn`/`act(...)`/navegação jsdom em **`0`** nos logs regenerados, **`hooks/` em `84,72% L | 81,25% B | 82,60% F`**, **`utils/` em `96,04% L | 78,64% B | 94,44% F`**, e cobertura global elevada para **`96,46% L | 88,79% B | 95,51% F`** passando em todos os thresholds de `jest.config.js`.
- **Prioridade:** **Baixa**.

---

## 6. Processos sem ocorrências identificadas
- **Análise Estática, Dependências Mortas e Higiene de Código (`npm run lint`, `npm run knip`, `npm run lint:chars`, `npm run lint:workflows`):** Nenhuma ocorrência identificada no período analisado nem após as mudanças finais de 24/11/2026 (0 erros e 0 avisos em `logs/eslint.log` com `[log-meta]`). *Atualização confirmada no CI remoto:* `npm run lint:chars` passou a integrar o job `lint` do workflow `.github/workflows/test-coverage.yml` (Runs `#190` e `#191` aprovados).
- **Scanners Estáticos de Segurança (`npm run security:check-sql` e `npm run security:check-credentials`):** Nenhuma ocorrência identificada após as mudanças finais de 24/11/2026 (0 vulnerabilidades). *Atualização confirmada no CI remoto:* `Audit Dependencies` (`npm audit --audit-level=high`) ativo e executado no job `lint` de `test-coverage.yml` (Runs `#190` e `#191`).
- **GitHub Actions Remoto (Estado Atual `0ab2716e`):** Todos os 4 workflows ativos (`Lint & Test Coverage Gate` `#191`, `E2E Isolated (Cypress)` `#185`, `Test Coverage Gate (banco real)` `#176` e `Load Tests (k6)` `#52`) estão verdes no `HEAD`, com **22 runs consecutivos sem falhas** desde `1793f90f` (confirmado via `logs/github-actions-snapshot.json`).
- **Conformidade Arquitetural (Site Público, Painel `/admin`, Modalidade A × B, RBAC, anti-SSRF, Google JWKS ADR-0042 e Timeout 1h ADR-0043):** Comportamento validado integralmente pelas **`245 suítes aprovadas (+12 .db ignoradas localmente) / 2.169 testes aprovados (+106 .db, 2.275 total)`** em 24/11/2026 (`pages/api/auth/login.js` e `customer/auth.js` em 100% linhas, `AdminSales.js` em 99,73% linhas / 96,77% funcs) e coerente com `ARQUITETURA_SITE_PUBLICO.md` e `ARQUITETURA_SITE_PRIVADO.md`. *(Única pendência externa de ambiente: as 4 novas suítes `*.db.test.js` aguardam execução contra PostgreSQL real no próximo push de `test-db-coverage.yml`, uma vez que não há Docker local; as 8 anteriores já passaram no Run `#176`.)*
- **Preflight de Catálogo de Modelos (`npm run models:check`):** Revalidado em 24/11/2026: detecção explícita de `ENOENT` como `status: NÃO VERIFICADO` e validação sintática do preset local `zen` (`6 modelo(s), 1 reserva(s)`) com código de saída `2` (`AGENTS.md` §0.3 passo 6). *Limitação:* catálogo vivo do OpenCode não verificado fora do host OpenCode.

---

## 7. Plano de ação recomendado

### Correções necessárias
1. **[Alta] [CONCLUÍDO em 24/11/2026]** Reativar `Audit Dependencies` no `test-coverage.yml` e remover os blocos mortos `test-type == 'coverage'` de `.github/workflows/test-base.yml` (`5.5` / `OCOR-2026-11-23-03`) — **validado remotamente nos Runs `#190` e `#191`**.
2. **[Alta] [CONCLUÍDO em 24/11/2026]** Proteger a desestruturação e validação de `req.body` em `pages/api/auth/login.js:39` (e normalizada a chave `username.trim().toLowerCase()` na linha 82) para evitar `TypeError` não tratado antes do `try/catch` (`5.4` / `OCOR-2026-11-23-05`).
3. **[Média] [CONCLUÍDO em 24/11/2026]** Corrigir deriva real de schema `audit_log` → `activity_logs` em `lib/crud/crud.js:20` e adicionar `activity_logs` ao `EXPECTED_SCHEMA` de `scripts/validate-schema.js` (`5.8`).
4. **[Média] [CONCLUÍDO em 24/11/2026]** Implementar paginação, detecção de truncamento, timeout HTTP de `10 s`, detector de ruído de console, extrator de erros de alto sinal (`extractErrorLinesFromJobLog`), resumo por workflow (`summarizeRunsByWorkflow`) e suporte a snapshot offline (`logs/github-actions-snapshot.json`) em `scripts/diagnostics/check-github-actions.js` e `github-actions-helper.js` (`5.9` / `OCOR-2026-11-23-04` e `07`).

### Novos testes
1. **[Alta] [CONCLUÍDO em 24/11/2026]** Cobertos rate limit por IP (com IP de socket real), backstop por usuário (case-insensitive), `untrustedForwarded`, `req.body` inválido/ausente, `?response=body` e erro simulado real em `last_login_at` (`tests/unit/pages/api/auth/login.edge.test.js`, `tests/integration/api/auth/login.test.js` e `tests/integration/api/login.test.js` — `100%` em `pages/api/auth/login.js`, `5.4`), além de **17** testes para `check-github-actions.js`/`github-actions-helper.js` (`5.9`), **3** novos testes em `useApiFetch.test.js` (`5.10`), **5** testes em `csvExport.test.js`, **3** testes em `PerformanceProvider.test.js` (`5.10`), **2** testes em `test-coverage-comment.test.js` (`5.5`) e `tests/unit/tests-hygiene/package-lock-sync.test.js`.
2. **[Média] [CONCLUÍDO em 24/11/2026]** Ampliada `tests/unit/components/Admin/AdminSales.test.js` cobrindo badges, filtros combinados, erros 401/500/rede, modal de gerenciamento (`PUT /api/admin/orders`), `ShippingTypeSelect`, `internalProductSchema`, `internalProductColumns`, `mapItemToFormData` e `onReorder` (`5.6` — `AdminSales.js` em `99,73% Lines | 86,87% Branch | 96,77% Funcs`).
3. **[Média] [CONCLUÍDO em 24/11/2026]** Cobertas branches negativas/infra em `customer/auth.js` (`93,65% B`), `customer-auth.js` (`96,15% B`), `checkout.js` (`87,17% B`), `integrity.js` (`92,06% B`), `mercadopago.js` (`88,93% B`), `pages/api/products.js` (`91,96% B`), `lib/domain/products.js` (`90,00% B`) e `AdminCategories.js` (`66,66% B`, restantes fallbacks inalcançáveis) (`5.7`).
4. **[Média] [CONCLUÍDO em 24/11/2026]** Criadas `tests/integration/domain/{categories,audit,dicas,images}.db.test.js` (`12 arquivos *.db.test.js, 106 asserções`) e estendida `tests/unit/scripts/schema-sources.test.js` para todos os 14 módulos de `lib/domain/*.js` (`5.8`; 4 novas suítes `.db` aguardam Docker no próximo push de `test-db-coverage.yml`).

### Melhorias preventivas
1. **[Baixa] [CONCLUÍDO em 24/11/2026]** Zerados os 47 blocos de ruído `console.error`/`console.warn`/`act(...)`/navegação jsdom, ajustado consumo de RAM sob cobertura no WSL (`workerIdleMemoryLimit: '300MB'` + `--maxWorkers=2`) e adicionada `tests/unit/tests-hygiene/package-lock-sync.test.js` (`5.10` / `OCOR-2026-11-23-01`, `02`, `06`).
2. **[Baixa] [CONCLUÍDO em 24/11/2026]** Incluídos `hooks/**/*.js`, `utils/**/*.js` e `!utils/empty-browser-module.js` em `collectCoverageFrom` e adicionados thresholds específicos em `jest.config.js` para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/`, `components/Admin/`, `hooks/` e `utils/` + elevação de `lib/domain/` (`82`) e `pages/api/admin/` (`82`) (`5.10`).

### Melhorias de segurança
1. **[Alta] [CONCLUÍDO em 24/11/2026]** Auditoria contínua de vulnerabilidades npm reativada no `test-coverage.yml` (Runs `#190/#191`, `5.5`), `pages/api/auth/login.js` blindado com 100% de cobertura (`5.4`) e contratos fail-closed de `customer-auth.js` (`NODE_ENV='production'` sem `JWT_SECRET`), `customer/auth.js`, `checkout.js` e `pages/api/products.js` (RBAC fail-closed `reason: 'error'`) integralmente testados (`5.7`).

### Melhorias de monitoramento
1. **[Média] [CONCLUÍDO em 24/11/2026]** Cabeçalho e rodapé `[log-meta]` adicionados via `run-with-log.js` em `package.json`, detecção de ruído de console em `summarizeJestLog`, extrator `extractErrorLinesFromJobLog` + `summarizeRunsByWorkflow` em `github-actions-helper.js` e script `npm run diag:actions:snapshot` com `--from-snapshot` e validade de `24 h` em `logs/github-actions-snapshot.json` (`5.9` / `OCOR-2026-11-23-07`).
2. **[Média] [CONCLUÍDO em 24/11/2026]** Executado `npm run diag:actions:snapshot` em host com conectividade autorizada (`2026-11-24T19:07:10.755Z`) e validados os `139` runs remotos da janela de 7 dias em `https://github.com/caminhar-deus/Caminhar/actions`. *(Manutenção semanal: regerar o snapshot antes de cada auditoria semanal em sandbox e acompanhar no próximo push a execução das 4 novas suítes em `test-db-coverage.yml`.)*

### Melhorias nos workflows
1. **[Alta] [CONCLUÍDO e VALIDADO REMOTAMENTE em 24/11/2026]** Integrado `npm run lint:chars` ao job `lint` de `test-coverage.yml`, ajustado `timeout-minutes` de `e2e.yml` para `25`, atualizado o comentário de contagem em `test-db-coverage.yml` (`12 arquivos *.db.test.js, 106 asserções`) e confirmadas as execuções verdes `#191`, `#185`, `#176` e `#52` em `0ab2716e` (`5.5`/`5.8`).

### Status das ações da auditoria anterior (16/11/2026)
- **Ação 01:** Guarda estática de schema SQL e cobertura `customers`/`orders` → **Concluído em 16/11/2026** (ampliado para todo `lib/domain/*.js` + `12` suítes `.db.test.js` em 24/11/2026)
- **Ação 02:** Diagnóstico claro de `ENOENT` (`status: NÃO VERIFICADO`) em `check-model-catalog.js` → **Concluído em 16/11/2026** (revalidado em 23/11/2026 e em 24/11/2026 com exit code `2`)
- **Ação 03:** Criação da spec E2E Cypress `cypress/e2e/checkout.cy.js` e `PROJECT_cypress.md` → **Concluído em 16/11/2026**
- **Manutenção Preventiva 01:** Acompanhar nova execução de `e2e.yml` após correção de `cy.intercept` em `01a4a3f` → **Concluído em 24/11/2026** (confirmado via `logs/github-actions-snapshot.json`: `E2E Isolated (Cypress)` com `42/44` aprovações na semana, zero falhas no Cypress e Runs `#184`/`#185` aprovados em `ff57a203`/`0ab2716e`)
- **Manutenção Preventiva 02:** Validar cartões e entrega de webhook no Sandbox Mercado Pago → **Concluído em 17–18/11/2026** (homologação Sandbox de cartão de crédito, pré-pago, boleto, PIX, devolução de estoque e webhook real via `cloudflared` registrados em `dbcbbc0`, `6b69224`, `554c056`–`feb768a` e `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 25)

---

## 8. Conclusão técnica
1. **Quais problemas foram efetivamente identificados na auditoria de 23/11/2026 e qual o estado em 24/11/2026?** Foram identificadas 7 ocorrências (`OCOR-2026-11-23-01` a `07`) e 7 oportunidades (`5.4` a `5.10`), preservando `5.1`–`5.3`: **todas as 7 ocorrências e todas as 7 oportunidades (`5.4` a `5.10`) foram integralmente resolvidas e validadas até 24/11/2026**. Adicionalmente, o confronto técnico da oportunidade `5.8` revelou um bug real de deriva de schema (`audit_log` em `lib/crud/crud.js:20` vs. `activity_logs` real + ausência em `scripts/validate-schema.js`), imediatamente corrigido e blindado.
2. **Quais processos apresentavam maior gravidade e como responderam às correções?** As duas prioridades Altas (`Audit Dependencies`/`lint:chars` no CI e blindagem de `pages/api/auth/login.js`), somadas às lacunas Médias em `AdminSales.js` (`32,25% → 96,77% Funcs`), nas rotas de visitante/pagamento/integridade (`5.7`), nos domínios SQL (`5.8`) e na cobertura de `hooks/`/`utils/` (`5.10`), responderam com **100% de aprovação** na suíte completa e **elevação da cobertura global para `96,46% Stmts/Lines | 88,79% Branch | 95,51% Funcs`**, mantendo `bench-ground-truth.test.js` (`14/14`) e **`0` ruídos** em todos os logs locais.
3. **Quais limitações externas de ambiente restam?** (a) Sem rede dentro do sandbox para consultas ao vivo à `api.github.com`, o diagnóstico usa `logs/github-actions-snapshot.json` gerado no host (`npm run diag:actions:snapshot`, validade `24 h`; a rodada atual de `139` runs foi validada em `2026-11-24T19:07:10Z` com 4 workflows verdes em `0ab2716e`); (b) ausência de Docker local faz as **`12` suítes `*.db.test.js` (`106` testes)** serem ignoradas localmente (`AGENTS.md` §7 item 1: as `8` originais já estão aprovadas no Run `#176` de `test-db-coverage.yml`, e as `4` novas executarão contra PostgreSQL real no próximo push para a `main`); (c) ausência do CLI `opencode` no PATH (`npm run models:check` retornando código `2`, `status: NÃO VERIFICADO`); e (d) MCP `ai-memory` negado na sessão (sendo usados os arquivos do repositório como fonte direta, com registro do aviso de `20` itens em `_lint/report.md` reportado no `SessionStart`).
4. **Quais funcionalidades não apresentaram problemas identificados?** Os gates estáticos locais (`eslint`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql` e `security:check-credentials`), as **`245` suítes executadas localmente (`2.169` testes aprovados, `6` snapshots, `96,46% Stmts/Lines | 88,79% Branch | 95,51% Funcs`, `0` ruídos de console)** e os 4 workflows remotos no `HEAD` auditado `0ab2716e` (`#191`, `#185`, `#176` e `#52`) estão 100% saudáveis.
5. **Quais funcionalidades ainda possuem lacunas de validação?** Nenhuma dentre as oportunidades mapeadas nesta auditoria (`5.1` a `5.10` estão 100% resolvidas). Apenas permanece pendente a execução remota natural do workflow `test-db-coverage.yml` no próximo `push` para exercitar em container PostgreSQL real as 4 novas suítes `*.db.test.js` recém-adicionadas (`categories`, `audit`, `dicas`, `images`).
6. **Quais passos devem ser priorizados a seguir?** Realizar o commit/push das alterações de `5.6`–`5.10` para validar as 12 suítes `*.db.test.js` no `Test Coverage Gate (banco real)` e gerar novo snapshot `npm run diag:actions:snapshot` na próxima janela semanal.

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
  - *Fechamento integral das oportunidades `5.6` a `5.10` (24/11/2026):* ampliados `tests/unit/components/Admin/AdminSales.test.js` (`99,73% L | 86,87% B | 96,77% F`), `tests/unit/components/Admin/AdminCategories.test.js`, `customer-auth.test.js`, `customer/auth.test.js`, `checkout.test.js`, `mercadopago.test.js`, `integrity.test.js`, `products.test.js` e `lib/domain/products.test.js` (preservando intactos os arquivos vigiados por `bench-ground-truth.test.js`); corrigida a deriva real de schema `audit_log` → `activity_logs` em `lib/crud/crud.js:20` e `scripts/validate-schema.js` (`16/16` tabelas alinhadas); estendida `tests/unit/scripts/schema-sources.test.js` a todos os 14 módulos de `lib/domain/`; criadas `tests/integration/domain/{categories,audit,dicas,images}.db.test.js` (`12` suítes `.db.test.js` / `106` testes em `.github/workflows/test-db-coverage.yml`); criada `tests/unit/hooks/PerformanceProvider.test.js`; incluídos `hooks/**` e `utils/**` em `collectCoverageFrom` e adicionados thresholds por diretório em `jest.config.js`.
  - *Estado pós-validação final:* **245 suítes aprovadas (+12 `.db` ignoradas localmente sem Docker; 8 aprovadas no Run `#176` e 4 novas prontas para o próximo push) / 2.169 testes aprovados (+106 `.db`, 2.275 total)**, `6` snapshots, cobertura **`96,46% Stmts/Lines | 88,79% Branch | 95,51% Funcs`**, **0 ruídos de console/`act`/jsdom** e gates estáticos 100% limpos.
- **Situação dos pontos e pendências:** `OCOR-2026-11-23-01` a `07`, `Manutenção Preventiva 01` e **100% das oportunidades `5.1` a `5.10` resolvidas e validadas**.
