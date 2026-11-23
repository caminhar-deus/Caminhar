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
  - **Limitação obrigatória — GitHub Actions remoto não consultado:** A consulta às execuções, jobs, steps e logs remotos em `https://github.com/caminhar-deus/Caminhar/actions` **não pôde ser realizada** nesta auditoria. O ambiente sandboxed não tem conectividade externa (`curl: (6) Could not resolve host: api.github.com`), `gh` não está instalado no PATH e a execução fora do sandbox foi negada na sessão. Os arquivos locais de workflow e o histórico Git permitem auditar a configuração de CI, mas **não substituem** a inspeção das execuções reais no GitHub Actions.
- **Situação geral da auditoria:** **Parcialmente concluída (com limitação de acesso remoto ao GitHub Actions).** Nos logs locais de teste não há nenhuma falha de suíte ou asserção (`241 passed / 2.090 testes passando`, 8 suítes `.db.test.js` / 96 testes ignorados localmente sem Docker), e os 6 gates estáticos locais rodaram com código de saída 0. Contudo, a auditoria identificou **1 erro confirmado na configuração dos workflows de CI** (`Audit Dependencies` inalcançável em `test-base.yml`), **1 risco de segurança/robustez + falha crítica de cobertura em `pages/api/auth/login.js`**, **1 fragilidade no script de auditoria `check-github-actions.js`** (`per_page=50` sem paginação), **2 padrões recorrentes de ruído `console.error` nos logs do Jest** (`act(...)` em `AdminPostsNew` e navegação não implementada no jsdom 31), **1 aviso operacional de logs simulados em testes** e **7 novas oportunidades técnicas de melhoria**.

---

## 2. Resumo executivo
- **Principais ocorrências:** 7 registros classificados na janela `16/11/2026–23/11/2026` (`OCOR-2026-11-23-01` a `07`): 1 erro confirmado em configuração de workflow (`OCOR-2026-11-23-03`), 1 risco identificado com lacuna crítica de cobertura em autenticação (`OCOR-2026-11-23-05`), 1 risco/fragilidade no ferramental de diagnóstico do GitHub Actions (`OCOR-2026-11-23-04`), 2 problemas recorrentes de ruído `console.error` nos logs do Jest (`OCOR-2026-11-23-01` e `02`), 1 aviso de logs de erro simulados não silenciados em testes (`OCOR-2026-11-23-06`) e 1 limitação de fonte obrigatória por indisponibilidade de rede e ausência de timestamps nos logs (`OCOR-2026-11-23-07`). Zero testes falharam nos logs locais.
- **Problemas críticos ou relevantes (Prioridade Alta):**
  1. **`OCOR-2026-11-23-03` (Erro confirmado — CI):** O step `Audit Dependencies` (`npm audit --audit-level=high`) em `.github/workflows/test-base.yml:470-474` está condicionado a `inputs.test-type == 'coverage'`, mas o único chamador de `test-base.yml` é `load-tests.yml` (`test-type: load`), enquanto `.github/actions/setup/action.yml` e `e2e.yml` rodam `npm ci --no-audit --no-fund`. Na prática, nenhuma execução de CI audita vulnerabilidades npm.
  2. **`OCOR-2026-11-23-05` (Risco + Falha de cobertura — Autenticação):** `pages/api/auth/login.js:39` desestrutura `req.body` sem fallback e fora do bloco `try/catch` (que inicia na linha 63), e o arquivo registra apenas **68,45% de linhas / 72,72% de branches** em `logs/coverage-output.log` — sem nenhum teste real cobrindo o rate limit por IP (linhas 51-59), o backstop por usuário (linhas 82-88) ou o modo `?response=body` (linhas 106-129), além de um teste placebo em `tests/integration/api/login.test.js:104-125`.
- **Resultados satisfatórios e entregas validadas na semana:**
  - A suíte local evoluiu de `232 suítes / 1.926 testes` (16/11) para **`241 suítes / 2.090 testes` passando** (8 suítes `.db.test.js` / 96 testes ignorados localmente sem Docker; 6 snapshots aprovados), com cobertura agregada de **95,48% Statements/Lines | 86,31% Branches | 93,37% Functions** e queda expressiva de duração na suíte unitária (`20,37 s`, contra `35,9 s–44,7 s` na semana anterior) após a adição de `workerIdleMemoryLimit: '400MB'` em `jest.config.base.js`.
  - Todos os 6 gates estáticos locais executados em 23/11/2026 passaram sem erros: `eslint .`, `knip`, `lint:chars` (785 arquivos), `lint:workflows` (`actionlint 1.7.12`), `security:check-sql` (264 arquivos) e `security:check-credentials` (102 arquivos).
  - Marcos funcionais e de segurança entregues nos commits da semana (`9289fb0` a `ee4ed2e`): homologação completa do Sandbox Mercado Pago + webhook real via túnel `cloudflared` (fechando `Manutenção Preventiva 02` de 16/11), autenticação Google via JWKS local (ADR-0042), timeout de inatividade de 1h no `/admin` com guarda unificada 401 (ADR-0043), endurecimento de APIs públicas e administrativas (RBAC, anti-SSRF, rate limit em 22/11), correção de `Pedidos (0)` em `AdminSales` e guarda de tokens CSS (`css-tokens.test.js`).
- **Principais oportunidades de melhoria (7 novas em 23/11/2026):** (`5.4`) blindagem e cobertura completa de `pages/api/auth/login.js`, (`5.5`) reativação de `npm audit` + inclusão de `lint:chars` no CI e saneamento dos workflows, (`5.6`) cobertura funcional de `components/Admin/AdminSales.js` (atualmente apenas `32,25%` de funções cobertas), (`5.7`) cobertura de branches em rotas críticas de visitante/pagamento/integridade, (`5.8`) cobertura `*.db.test.js` para os 4 domínios ainda descobertos (`categories`, `dicas`, `audit`, `images`) e extensão da guarda SQL estática, (`5.9`) paginação em `check-github-actions.js` + timestamps/SHA nos logs locais, e (`5.10`) eliminação do ruído recorrente de `act(...)`/`jsdom` nos testes + revisão de escopo/thresholds de `jest.config.js`.

---

## 3. Erros e ocorrências identificadas

### 3.1. Categoria: CI / Workflows do GitHub Actions

#### `OCOR-2026-11-23-03` — Step `Audit Dependencies` (`npm audit`) inalcançável em `test-base.yml`
- **Identificação:** `OCOR-2026-11-23-03`
- **Natureza:** Erro confirmado (configuração de workflow)
- **Fonte:** Inspeção estática dos arquivos `.github/workflows/test-base.yml`, `.github/workflows/test-coverage.yml`, `.github/workflows/load-tests.yml`, `.github/workflows/e2e.yml` e `.github/actions/setup/action.yml`.
- **Data:** 23/11/2026 (confirmado no estado atual dos workflows; origem anterior à janela atual, quando o job `coverage` deixou de chamar `test-base.yml`).
- **Processo envolvido:** Auditoria automatizada de vulnerabilidades npm na esteira de CI.
- **Descrição:** O step `Audit Dependencies` (`npm audit --audit-level=high`) existe exclusivamente em `.github/workflows/test-base.yml` sob a condição `if: ${{ inputs.test-type == 'coverage' }}`. Como `test-coverage.yml` deixou de chamar `test-base.yml` e passou a usar `./.github/actions/setup` diretamente (com `npm ci --no-audit --no-fund`), nenhum workflow do repositório satisfaz a condição `inputs.test-type == 'coverage'`.
- **Evidências:**
  - `.github/workflows/test-base.yml:470-474`: `Audit Dependencies` com `if: ${{ inputs.test-type == 'coverage' }}` e `continue-on-error: true`; o mesmo ocorre nos uploads de cobertura das linhas 581-599.
  - Busca em `.github/`: apenas `.github/workflows/load-tests.yml:258` referencia `uses: ./.github/workflows/test-base.yml`, passando `test-type: load`.
  - `.github/actions/setup/action.yml:34-46` e `.github/workflows/e2e.yml:69-80`: executam `timeout 20m npm ci --no-audit --no-fund`, justificando nos comentários que a auditoria teria sido movida para `Audit Dependencies` em `test-base.yml`.
- **Arquivos relacionados:** `.github/workflows/test-base.yml`, `.github/workflows/test-coverage.yml`, `.github/actions/setup/action.yml`, `.github/workflows/e2e.yml`.
- **Diagnóstico:** Erro de migração estrutural nos workflows: ao tornar `coverage` autocontido em `test-coverage.yml`, o step `Audit Dependencies` não foi portado para `test-coverage.yml`, permanecendo como código morto condicional em `test-base.yml`.
- **Impacto:** Alto — vulnerabilidades conhecidas (`high`/`critical`) nas dependências de produção ou desenvolvimento deixam de ser reportadas em pushes e pull requests na CI.
- **Prioridade:** **Alta**.
- **Recomendação:** Portar `Audit Dependencies` para `.github/workflows/test-coverage.yml` (mantendo visibilidade/política explícita) e remover os blocos mortos condicionados a `test-type == 'coverage'` em `test-base.yml` (detalhado na Oportunidade `5.5`).

---

### 3.2. Categoria: Segurança e Autenticação

#### `OCOR-2026-11-23-05` — Desestruturação desprotegida de `req.body` e falha de cobertura em proteções de `pages/api/auth/login.js`
- **Identificação:** `OCOR-2026-11-23-05`
- **Natureza:** Risco identificado / Falha de cobertura de testes
- **Fonte:** `logs/coverage-output.log` (22/11/2026) cruzado com investigação direcionada de `pages/api/auth/login.js`, `tests/integration/api/auth/login.test.js`, `tests/integration/api/login.test.js` e `tests/unit/pages/api/auth/login.edge.test.js`.
- **Data:** 22/11/2026 (log de cobertura) e 23/11/2026 (inspeção de código).
- **Processo envolvido:** Autenticação administrativa (`POST /api/auth/login`).
- **Descrição:** O handler de login apresenta três fragilidades combinadas: (1) desestruturação direta `const { username, password } = req.body;` fora do bloco `try/catch`; (2) baixa cobertura de linhas (**68,45%**) e branches (**72,72%**) deixando sem teste o rate limit real por IP, o backstop por usuário e o modo `?response=body`; e (3) testes de integração com mocks defasados/placebo.
- **Evidências:**
  - `logs/coverage-output.log`: `pages/api/auth/login.js | 68.45 | 72.72 | 100 | 68.45 | 31-34,51-59,83-88,93-94,97-98,106-129`.
  - `pages/api/auth/login.js:39`: `const { username, password } = req.body;` executa antes do primeiro `try` (linha 63); se `req.body` vier `undefined` ou `null` (ex.: `Content-Type` ausente ou corpo vazio), lança `TypeError` não tratado pelo handler (500 cru do Next.js em vez de 400 controlado).
  - `pages/api/auth/login.js:50-59` e `82-88`: os dois mecanismos ativos de proteção contra força bruta (limite por IP `LOGIN_RATE_LIMIT` e backstop por usuário `LOGIN_USER_LIMIT`) têm **0% de cobertura executada**.
  - `tests/integration/api/auth/login.test.js:50-59`: o teste de HTTP 429 não configura `socket.remoteAddress`/`ip` no `createMocks`, de modo que `resolveClientIP` devolve `UNKNOWN_IP` e a condição `if (ip !== UNKNOWN_IP)` (linha 50) é **pulada**; o teste retorna 429 apenas porque mocka `authenticateAndGenerateToken` com `{ error: 'RATE_LIMITED' }`, comportamento que `lib/auth/auth.js` não aplica mais (como documentam as linhas 44-45 de `login.js`).
  - `tests/integration/api/login.test.js:104-125`: o teste `"deve logar um erro se a atualização de last_login_at falhar, mas ainda permitir o login"` repete o mesmo mock de sucesso da linha 47 sem simular erro nem verificar `logger.error`.
- **Arquivos relacionados:** `pages/api/auth/login.js`, `tests/integration/api/auth/login.test.js`, `tests/integration/api/login.test.js`, `tests/unit/pages/api/auth/login.edge.test.js`.
- **Diagnóstico:** A migração do rate limit de `lib/auth/auth.js` para `pages/api/auth/login.js` e a adição do backstop por usuário e modo `?response=body` não foram acompanhadas da atualização dos testes de integração nem da guarda defensiva em `req.body`.
- **Impacto:** Alto — regressões no bloqueio de força bruta por IP ou por usuário, no contrato `?response=body` (usado por k6/APIs) ou exceções não tratadas para payloads malformados passariam despercebidas pela suíte atual.
- **Prioridade:** **Alta**.
- **Recomendação:** Proteger `req.body || {}` dentro de fluxo seguro, validar tipos básicos antes de consultar o rate limit/auth e implementar testes reais para todas as branches descobertas (Oportunidade `5.4`).

---

### 3.3. Categoria: Ferramental de Diagnóstico e Monitoramento

#### `OCOR-2026-11-23-04` — Truncamento silencioso na janela de 7 dias em `scripts/diagnostics/check-github-actions.js`
- **Identificação:** `OCOR-2026-11-23-04`
- **Natureza:** Risco identificado (fragilidade no ferramental de auditoria)
- **Fonte:** Inspeção de `scripts/diagnostics/check-github-actions.js:156-166` cruzada com a cadência observada de commits (`git log`) e agendamentos.
- **Data:** 23/11/2026.
- **Processo envolvido:** Diagnóstico automatizado semanal do GitHub Actions (`npm run diag:actions`).
- **Descrição:** O script busca apenas a primeira página fixa da API REST (`/repos/${REPO}/actions/runs?per_page=50`) sem paginação e sem parâmetro `created=>=YYYY-MM-DD`, filtrando os últimos 7 dias em memória sobre esses 50 resultados.
- **Evidências:** `scripts/diagnostics/check-github-actions.js:156` chama `requestGitHub('/repos/${REPO}/actions/runs?per_page=50')` uma única vez. Na janela `16/11–23/11/2026`, foram realizados 40 commits na `main`; como cada push dispara até 3 workflows (`test-coverage.yml`, `test-db-coverage.yml`, `e2e.yml`) e `load-tests.yml` dispara cron diário (+7 execuções), a janela produz na ordem de ~100+ runs — excedendo o limite de 50 por página e descartando silenciosamente runs mais antigos da própria semana.
- **Arquivos relacionados:** `scripts/diagnostics/check-github-actions.js`.
- **Diagnóstico:** Implementação de consulta em página única insuficiente para semanas com fluxo intenso de commits.
- **Impacto:** Médio — em execuções futuras com rede disponível, auditorias semanais podem omitir falhas ocorridas no início da janela de 7 dias sem emitir aviso de truncamento.
- **Prioridade:** **Média**.
- **Recomendação:** Usar filtro `created=>=<ISO>` com paginação (`page=1..N`, `per_page=100`) e checagem explícita contra `total_count` (Oportunidade `5.9`).

#### `OCOR-2026-11-23-07` — Limitação de acesso remoto ao GitHub Actions e ausência de timestamp nos logs locais
- **Identificação:** `OCOR-2026-11-23-07`
- **Natureza:** Aviso ou comportamento suspeito / Limitação de auditoria
- **Fonte:** Tentativa de consulta à API REST (`curl`) no sandbox + inspeção de `logs/{tests-output,coverage-output,eslint}.log` e `package.json`.
- **Data:** 23/11/2026.
- **Processo envolvido:** Rastreabilidade temporal das fontes obrigatórias da auditoria semanal.
- **Descrição:** Duas barreiras afetaram a rastreabilidade desta rodada: (1) o GitHub Actions remoto não pôde ser consultado devido ao isolamento de rede do sandbox e recusa de execução externa; e (2) os scripts `test:log`, `test:coverage:log` e `lint:log` em `package.json` gravam a saída bruta sem registrar cabeçalho de data/hora ou commit SHA no interior dos arquivos em `logs/`, tornando a verificação temporal dependente do `mtime` e do cruzamento de suítes presentes.
- **Evidências:**
  - `curl -fsSL ... https://api.github.com/repos/caminhar-deus/Caminhar/actions/runs` retornou `curl: (6) Could not resolve host: api.github.com` no sandbox; execução fora do sandbox negada.
  - Varredura de datas por regex em `logs/tests-output.log` (5.196 linhas), `logs/coverage-output.log` (5.367 linhas) e `logs/eslint.log` (0 bytes) retornou apenas `'23/10/2026'` (dado de mock em testes).
  - `package.json:20,36,45`: `lint:log`, `test:log` e `test:coverage:log` fazem apenas `| tee logs/...` sem cabeçalho temporal.
- **Arquivos relacionados:** `package.json`, `logs/tests-output.log`, `logs/coverage-output.log`, `logs/eslint.log`.
- **Diagnóstico:** Limitação de ambiente (conectividade externa) somada à ausência de metadados explícitos nos logs locais.
- **Impacto:** Médio — impede validar ao vivo o status de execução remota dos workflows na semana (incluindo o re-run de `e2e.yml` pós-`01a4a3f`) e dificulta a auditoria estrita por data interna dos logs.
- **Prioridade:** **Média**.
- **Recomendação:** Prefixar metadados (`date -Iseconds`, `git rev-parse --short HEAD`) nos scripts `*:log` do `package.json` e revalidar execuções remotas na próxima janela com acesso autorizado (Oportunidade `5.9`).

---

### 3.4. Categoria: Qualidade dos Testes e Logs Locais

#### `OCOR-2026-11-23-01` — 35 blocos recorrentes de `console.error` por atualização React fora de `act(...)` em `AdminPostsNew`
- **Identificação:** `OCOR-2026-11-23-01`
- **Natureza:** Problema recorrente / Aviso ou comportamento suspeito
- **Fonte:** `logs/tests-output.log` (linhas 422–1410) e `logs/coverage-output.log` (linhas 317–1286), ambos de 22/11/2026.
- **Data:** 22/11/2026 (presente de forma idêntica nas duas execuções registradas).
- **Processo envolvido:** Suíte de testes do componente `AdminPostsNew` (`components/Admin/AdminPosts.js`) e hook `hooks/useApiFetch.js`.
- **Descrição:** Ambas as execuções locais (sem `--silent`) emitem exatamente **35 blocos de `console.error`** (`Warning: An update to AdminPostsNew inside a test was not wrapped in act(...)`), respondendo por **74,5% (35/47)** de todo o ruído `error`/`warn` nos logs do Jest.
- **Evidências:**
  - Contagem verificada nos dois arquivos: 16× `hooks/useApiFetch.js:164` (`setData(result)`), 1× `:171` (`setError`), 1× `:172` (`setRequestId`) e 17× `:178` (`setLoading(false)`).
  - `components/Admin/AdminPosts.js:243`: `useApiFetch('/api/admin/categories?all=1', ...)` inicia um `fetch` assíncrono no mount.
  - `tests/unit/components/Admin/AdminPosts.test.js:19-32, 34-120`: o `beforeEach` define um `fetchMock` que resolve `Promise` assíncrona, mas os testes síncronos (como os das linhas 34–120) não aguardam a resolução do efeito nem desmontam/abortam o `fetch`, fazendo os setters de estado dispararem após o término do teste ou fora de `act(...)`.
  - `hooks/useApiFetch.js:164-179`: não possui guarda de componente montado nem `AbortController` no `useEffect` de montagem.
- **Arquivos relacionados:** `tests/unit/components/Admin/AdminPosts.test.js`, `components/Admin/AdminPosts.js`, `hooks/useApiFetch.js`.
- **Diagnóstico:** Problema de higiene de testes + ausência de cancelamento no hook após desmontagem; não indica defeito funcional em produção, mas gera poluição severa nos logs e mascara avisos reais de `act(...)`.
- **Impacto:** Médio (degrada legibilidade dos logs de CI/local e pode causar flakiness ou memory leak de `setState` pós-unmount).
- **Prioridade:** **Média**.
- **Recomendação:** Adicionar suporte a `AbortController`/flag de desmontagem em `hooks/useApiFetch.js` e aguardar efeitos pendentes em `AdminPosts.test.js` (Oportunidade `5.10`).

#### `OCOR-2026-11-23-02` — 4 blocos recorrentes de `console.error` (`Not implemented: navigation to another Document`) no jsdom 31
- **Identificação:** `OCOR-2026-11-23-02`
- **Natureza:** Problema recorrente / Aviso ou comportamento suspeito
- **Fonte:** `logs/tests-output.log` (linhas 1467–1521) e `logs/coverage-output.log` (linhas 160–214), de 22/11/2026.
- **Data:** 22/11/2026.
- **Processo envolvido:** Testes de exportação CSV em `tests/unit/components/Admin/AdminCrudBase.test.js` e `utils/csvExport.js`.
- **Descrição:** Em ambos os logs, o jsdom 31 emite 2 pares (4 blocos) de `console.error: Not implemented: navigation to another Document` durante a execução de `AdminCrudBase.test.js`.
- **Evidências:**
  - `tests/unit/components/Admin/AdminCrudBase.test.js:14-17`: faz spy transparente que delega à implementação real de `utils/csvExport.js`.
  - `tests/unit/components/Admin/AdminCrudBase.test.js:361`: chama `jest.restoreAllMocks()`, restaurando qualquer spy anterior no DOM.
  - `tests/unit/components/Admin/AdminCrudBase.test.js:370-410`: os 2 testes seguintes (`exportColumns` e retrocompatibilidade) clicam em `Exportar CSV` sem mockar `HTMLAnchorElement.prototype.click`; `utils/csvExport.js:73` executa `link.click()` com `href` `blob:...`, disparando a exceção interna não fatal do jsdom `HTMLHyperlinkElementUtils-impl.js:80` -> `exports.notImplemented`.
- **Arquivos relacionados:** `tests/unit/components/Admin/AdminCrudBase.test.js`, `utils/csvExport.js`.
- **Diagnóstico:** Efeito colateral exclusivo do ambiente de teste jsdom 31 sobre download via `<a download>` (sem impacto em navegadores reais).
- **Impacto:** Baixo — ruído recorrente nos logs locais e da CI.
- **Prioridade:** **Baixa**.
- **Recomendação:** Stubbar `HTMLAnchorElement.prototype.click` (ou `document.createElement`) nos testes das linhas 370–410 de `AdminCrudBase.test.js` (Oportunidade `5.10`).

#### `OCOR-2026-11-23-06` — Logs de erro/aviso simulados não silenciados em 5 testes de caminhos de falha
- **Identificação:** `OCOR-2026-11-23-06`
- **Natureza:** Aviso ou comportamento suspeito (comportamento esperado de teste — não é erro de produção)
- **Fonte:** `logs/tests-output.log` e `logs/coverage-output.log`, de 22/11/2026.
- **Data:** 22/11/2026.
- **Processo envolvido:** Testes negativos de tratamento de erros e resiliência (`internal-products.test.js`, `orders.test.js`, `customer/orders.test.js`, `blog.slug.test.js`, `backup.operations.test.js`).
- **Descrição:** Os 8 blocos restantes dentre os 47 de `console.error`/`console.warn` correspondem a mensagens disparadas intencionalmente ao simular falhas de banco, Redis e disco:
  - `console.error` via `lib/infra/logger.js:102` em `internal-products.test.js:85`, `orders.test.js:83` e `customer/orders.test.js:63`.
  - `console.warn` em `pages/blog/[slug].js:178` (via `blog.slug.test.js:70`) e 4× `console.warn` em `scripts/backup.js:234` (via `backup.operations.test.js:120,126,136,141`, ao testar criação de backup com falha simulada em verificação de espaço em disco).
- **Arquivos relacionados:** `tests/integration/api/admin/internal-products.test.js`, `tests/integration/api/admin/orders.test.js`, `tests/integration/api/customer/orders.test.js`, `tests/unit/pages/blog.slug.test.js`, `tests/unit/lib/backup/backup.operations.test.js`.
- **Diagnóstico:** Comportamento esperado dos testes negativos, diferenciável dos defeitos reais (`OCOR-2026-11-23-01` e `02`) porque as próprias asserções validam o tratamento resiliente (HTTP 500/fallback/continuidade do backup).
- **Impacto:** Baixo — apenas poluição visual quando a suíte roda sem `--silent`.
- **Prioridade:** **Baixa**.
- **Recomendação:** Opcionalmente espionar/silenciar `logger`/`console.warn` com asserção explícita nesses testes para manter os logs de erro limpos para anomalias reais.

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
- **Revalidação em 23/11/2026:** Executado `npm run models:check` no ambiente Antigravity (sem CLI `opencode` no PATH): saída clara `status: NÃO VERIFICADO`, `motivo: spawnSync opencode ENOENT`, `preset local (.opencode/oh-my-opencode-slim.json): sintaxe válida (preset zen, 6 modelo(s), 1 reserva(s))`, mantendo exit code `1` fail-closed conforme `AGENTS.md` §0.3 passo 6. Sem regressões.
- **Prioridade:** Baixa.

---

## 4. Análise dos processos e testes existentes
- **Processos analisados na janela (16/11/2026 a 23/11/2026):**
  - Testes unitários e de integração em jsdom (`Jest` via `logs/tests-output.log` e `logs/coverage-output.log`, de 22/11/2026)
  - Configuração da suíte com PostgreSQL real (`jest.config.db.js`, `tests/integration/domain/*.db.test.js`)
  - Análise estática de código (`ESLint` via `npm run lint` em 23/11/2026 — 0 erros e 0 warnings; `logs/eslint.log` em 21/11/2026 com 0 bytes)
  - Análise de código morto e dependências (`Knip` via `npm run knip` em 23/11/2026 — 0 erros)
  - Lint de workflows do GitHub Actions (`actionlint 1.7.12` via `npm run lint:workflows` em 23/11/2026 — 0 erros)
  - Verificação de caracteres não-latina (`npm run lint:chars` em 23/11/2026 — 0 erros em 785 arquivos)
  - Scanners estáticos de segurança (`npm run security:check-sql` em 264 arquivos e `npm run security:check-credentials` em 102 arquivos em 23/11/2026 — 0 vulnerabilidades)
  - Preflight de catálogo de modelos (`npm run models:check` em 23/11/2026 — `NÃO VERIFICADO` por ausência do binário `opencode`, sintaxe do preset válida)
  - Definições dos 5 workflows (`.github/workflows/*.yml`), 3 composite actions (`.github/actions/*/action.yml`) e `scripts/diagnostics/check-github-actions.js`
  - **Não analisado por bloqueio de conectividade externa:** Execuções remotas da semana no GitHub Actions (`api.github.com` inacessível no sandbox).
- **Testes executados (nos logs de 22/11/2026):** **241 suítes aprovadas** (8 suítes `.db.test.js` / 96 testes ignorados no ambiente local sem Docker), **2.090 testes aprovados** (2.186 no total), **6 snapshots aprovados**, cobertura global de **95,48% Statements | 86,31% Branch | 93,37% Functions | 95,48% Lines** (todos os 5 thresholds configurados em `jest.config.js` foram atendidos).
- **Resultados identificados:** 100% de aprovação nas suítes executadas localmente e 100% de aprovação nos gates estáticos executados ao vivo em 23/11/2026, porém com 1 erro confirmado em workflow inalcançável (`OCOR-2026-11-23-03`), lacunas pontuais relevantes de cobertura de linhas/funções/branches e ruído recorrente de `console.error` nos testes de componentes.

### Tabela de Tendência Histórica e Performance de CI/Testes

| Data da Medição | Suítes Totais | Testes Passando | Tempo da Suíte | Gates Estáticos (Knip / ESLint / Actionlint / Segurança) | Status do CI / Diagnóstico |
|---|---|---|---|---|---|
| **04/11/2026** | 208 suítes | 1.654 testes | ~63 s | 100% limpos | Resolvido aviso de worker no Jest |
| **05/11/2026** | 208 suítes | 1.657 testes | ~63 s | 100% limpos | 100% aprovado (Runs #112-#119) |
| **09/11/2026** | 226 suítes | 1.814 testes | ~34 s | 100% limpos | Estável (zero falhas) |
| **11/11/2026** | 227 suítes | 1.830 testes | ~35 s | 100% limpos | Diagnóstico híbrido + polling resiliente |
| **16/11/2026 (Auditoria)** | 232 suítes | 1.921 testes | ~35,9 s | 100% limpos (Knip, ESLint, Actionlint, Chars) | Vendas Internas + Orders API + Reconciliação ativas |
| **16/11/2026 (Implementado)** | 232 suítes (+8 `.db`) | 1.926 testes (+96 `.db`) | ~44,7 s | 100% limpos (Knip, ESLint, Actionlint, Chars) | Guarda SQL estática + `models:check` claro + E2E `checkout.cy.js` |
| **22/11/2026 — 23/11/2026 (Atual)** | **241 suítes (+8 `.db`)** | **2.090 testes (+96 `.db`)** | **~20,4 s (unit) / ~88,2 s (cov)** | **100% limpos (Knip, ESLint, Actionlint, Chars, SQL, Creds)** | **Cobertura 95,48% L / 86,31% B / 93,37% F; CI remoto não consultado (sandbox); `Audit Dependencies` inalcançável + lacunas em `login.js` e `AdminSales.js`** |

### Arquivos com Menor Cobertura no Relatório `logs/coverage-output.log` (22/11/2026)

| Arquivo | % Stmts / Lines | % Branch | % Funcs | Principais linhas descobertas |
|---|---|---|---|---|
| `pages/api/auth/login.js` | **68,45%** | 72,72% | 100% | `31-34, 51-59, 83-88, 93-94, 97-98, 106-129` |
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
  1. **Escopo de coleta (`jest.config.js:27-35`):** `collectCoverageFrom` monitora apenas `lib/**/*.js`, `pages/api/**/*.js` e `components/**/*.js`. Pastas críticas adicionadas recentemente (`hooks/useAdminInactivityTimeout.js`, `utils/adminSession.js`, `pages/admin.js`, `pages/entrar.js`, `pages/checkout/[id].js`, `pages/minha-conta.js`, `pages/login.js`, `proxy.js`) **não aparecem** na tabela de cobertura nem nos thresholds.
  2. **Thresholds ausentes em diretórios críticos (`jest.config.js:45-76`):** existem pisos por diretório para `lib/domain/`, `pages/api/admin/`, `components/Admin/fields/` e `lib/infra/`, mas **não há threshold** para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` nem `components/Admin/` (permitindo que `login.js` caia a 68,45% e `AdminSales.js` a 32,25% de funções mantendo a média global em 95,48%).
  3. **Domínios SQL sem suíte contra PostgreSQL real:** dos módulos de `lib/domain/` que acessam o banco, `categories.js` (SQL direto em `categories` e `post_categories`) e `audit.js` (`INSERT` direto em `activity_logs`), além de `dicas.js` e `images.js` (via `shared-pagination.js` e `crud.js`), não têm `*.db.test.js` dedicado; a inspeção estática `INSERT`/`UPDATE` em `tests/unit/scripts/schema-sources.test.js:144-180` ainda verifica apenas `customers.js` e `orders.js`.
  4. **Workflows locais vs. remotos:** `e2e.yml` executa apenas em `push: [main]` e `workflow_dispatch` (não bloqueia PRs por escolha documentada); `lint:chars` existe no `package.json` mas não é executado em nenhum workflow da CI; `test-db-coverage.yml:977` documenta em comentário `"6 arquivos *.db.test.js, 73 asserções"`, quando hoje já existem **8 arquivos e 96 testes**.
  5. **Arquivos modificados não commitados pré-existentes:** no início desta auditoria havia 11 arquivos alterados no working tree (incluindo `pages/api/products.js` tornando `link` obrigatório em Zod e `tests/integration/api/products.test.js` ajustado), nenhum tocado por esta auditoria.

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
- **Status:** **RESOLVIDO em 16/11/2026** (aguardando confirmação remota pós-`01a4a3f`)
- **Categoria:** Testes End-to-End (E2E)
- **Processo envolvido:** `cypress/e2e/checkout.cy.js`, `docs/PROJECT_cypress.md` e `.github/workflows/e2e.yml`
- **Ação Executada:** Criada `cypress/e2e/checkout.cy.js` (4 cenários), corrigido overload de `cy.intercept` em `01a4a3f` e revalidada localmente (`4 passing`). Acompanhamento remoto de `e2e.yml` permanece pendente por bloqueio de acesso ao Actions em 23/11/2026.
- **Prioridade:** Média.

### 5.4. Blindagem de `req.body` e Cobertura Integral das Proteções de `pages/api/auth/login.js`
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Segurança / Testes de Integração
- **Processo ou funcionalidade envolvida:** Autenticação administrativa (`POST /api/auth/login`, `pages/api/auth/login.js`)
- **Situação atual:** `pages/api/auth/login.js` tem **68,45% de linhas** e **72,72% de branches** cobertas. A linha 39 desestrutura `req.body` fora do `try/catch`; os testes existentes ignoram o IP do socket (anulando o teste de `LOGIN_RATE_LIMIT` nas linhas 51-59), não exercitam o backstop por usuário (linhas 82-88), o aviso `untrustedForwarded` (linhas 31-34), `MISSING_FIELDS` (linhas 92-94), o fallback de erro genérico (linhas 96-98), nem o contrato `?response=body` (linhas 106-129), além de `tests/integration/api/login.test.js:104-125` possuir um teste placebo que não injeta falha.
- **O que ainda não está sendo verificado:** Comportamento real dos dois rate limits contra brute force (`LOGIN_RATE_LIMIT` e `LOGIN_USER_LIMIT`), resiliência contra payload `null`/`undefined`/não-objeto em `req.body`, logging de `X-Forwarded-For` sem `TRUST_PROXY` e contrato JSON completo do modo `?response=body` (assegurando que `refreshToken` nunca vaze no body).
- **Risco ou possibilidade de falha:** Regressões silenciosas na proteção contra brute force do `/admin`, erro 500 não tratado para payloads malformados e quebra silenciosa da autenticação dos testes de carga (`load-tests/`) que utilizam `?response=body`.
- **Melhoria recomendada:** Garantir `const { username, password } = req.body && typeof req.body === 'object' ? req.body : {};` dentro de tratamento controlado (devolvendo 400 se ausente/inválido) e substituir mocks legados por testes que exercitem o fluxo real da rota.
- **Teste ou procedimento proposto:** Ampliar `tests/integration/api/auth/login.test.js` e `login.edge.test.js` com casos para: (1) `req.body` `undefined`/`null`/string; (2) socket IP válido (`198.51.100.10`) estourando `LOGIN_RATE_LIMIT` (`checkRateLimit` retornando `true` na chamada por IP -> 429); (3) falhas consecutivas acionando `LOGIN_USER_LIMIT` -> 429; (4) header `x-forwarded-for` divergente sem `TRUST_PROXY` validando `logger.warn`; (5) `?response=body` validando estrutura `data.token`, `refresh_token_stored` e ausência do valor de `refreshToken`; (6) corrigir ou remover o teste duplicado de `tests/integration/api/login.test.js:104-125`.
- **Resultado esperado:** Cobertura de `pages/api/auth/login.js` acima de 95% com proteção contra brute force e contratos de resposta travados por asserção real.
- **Benefício da implementação:** Fecha ponto cego crítico justamente na porta de entrada administrativa do sistema.
- **Prioridade:** **Alta**.

### 5.5. Reativação de `npm audit`, Inclusão de `lint:chars` no CI e Saneamento dos Workflows
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Processos de CI / Segurança de Dependências
- **Processo ou funcionalidade envolvida:** Workflows `.github/workflows/test-coverage.yml`, `test-base.yml`, `e2e.yml` e `test-db-coverage.yml`
- **Situação atual:** O step `Audit Dependencies` está morto em `test-base.yml:470-474` (`OCOR-2026-11-23-03`); `npm run lint:chars` não roda em nenhum workflow (apenas localmente); em `e2e.yml`, o step `Install Dependencies` usa `timeout 20m` dentro de um job com `timeout-minutes: 15`; e `test-db-coverage.yml:977` ainda documenta `"6 arquivos *.db.test.js, 73 asserções"` (hoje 8 arquivos e 96 testes).
- **O que ainda não está sendo verificado:** Vulnerabilidades `high`/`critical` reportadas por `npm audit` em PRs e pushes na `main`, bem como regressões de encoding/caracteres não-latinos (`lint:chars`) antes do merge.
- **Risco ou possibilidade de falha:** Introdução de dependência vulnerável ou regressão de encoding sem bloqueio automático em PRs.
- **Melhoria recomendada:** (1) Mover o step `Audit Dependencies` para o job `lint` (ou `coverage-report`) de `.github/workflows/test-coverage.yml` e remover de `test-base.yml` os blocos órfãos `inputs.test-type == 'coverage'`; (2) adicionar `npm run lint:chars` ao job `lint` de `test-coverage.yml`; (3) alinhar `timeout 12m` (ou elevar `timeout-minutes` do job em `e2e.yml` para `25`) e atualizar o comentário informativo de `test-db-coverage.yml`.
- **Teste ou procedimento proposto:** Validar qualquer ajuste nos workflows obrigatoriamente com `npm run lint:workflows` (`actionlint`) e verificar a presença dos novos steps nos logs de `test-coverage.yml`.
- **Resultado esperado:** Auditoria de dependências e `lint:chars` ativos em todo PR/push para `main`, sem steps mortos em `test-base.yml`.
- **Benefício da implementação:** Restaura a visibilidade automática de vulnerabilidades npm e elimina deriva documental/configuracional na CI.
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
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Monitoramento e Geração de Logs
- **Processo ou funcionalidade envolvida:** `scripts/diagnostics/check-github-actions.js`, `package.json` (`test:log`, `test:coverage:log`, `lint:log`) e `/home/gus/projetos/Caminhar/logs/`
- **Situação atual:** `check-github-actions.js:156` lê apenas 50 runs em página única (`OCOR-2026-11-23-04`); os scripts `*:log` de `package.json` gravam saída bruta sem cabeçalho com timestamp ISO-8601 e commit SHA (`OCOR-2026-11-23-07`).
- **O que ainda não está sendo verificado:** Completude da lista de runs quando uma semana ultrapassa 50 execuções no GitHub Actions e proveniência temporal exata dentro do conteúdo dos logs locais.
- **Risco ou possibilidade de falha:** Auditoria semanal futura incompleta (omissão silenciosa de runs falhos) ou impossibilidade de provar pelo conteúdo se um log pertence à janela de 7 dias após um `touch` ou checkout.
- **Melhoria recomendada:** (1) Atualizar `check-github-actions.js` para passar `?per_page=100&created=%3E%3D<YYYY-MM-DD>`, paginar enquanto `runs.length === 100` (com teto de segurança) e imprimir aviso explícito se houver truncamento; (2) nos scripts `test:log`, `test:coverage:log` e `lint:log` de `package.json`, gravar uma linha inicial `[log-meta] timestamp=<ISO> sha=<short-sha>` antes do `jest`/`eslint`.
- **Teste ou procedimento proposto:** Adicionar teste unitário para a função de paginação de `check-github-actions.js` simulando >100 runs e verificar os headers gerados pelos scripts `*:log`.
- **Resultado esperado:** Logs locais auto-datados e auditoria do GitHub Actions sem perda silenciosa de execuções em semanas movimentadas.
- **Benefício da implementação:** Rastreabilidade integral e determinística para todas as auditorias semanais futuras.
- **Prioridade:** **Média**.

### 5.10. Eliminação de Ruído Recorrente (`act(...)` / jsdom) nos Testes e Revisão de Cobertura em `jest.config.js`
- **Status:** **NOVO — Identificado em 23/11/2026**
- **Categoria:** Qualidade de Testes / Prevenção de Regressões
- **Processo ou funcionalidade envolvida:** `tests/unit/components/Admin/{AdminPosts,AdminCrudBase}.test.js`, `hooks/useApiFetch.js` e `jest.config.js`
- **Situação atual:** 39 dos 47 blocos `console.error`/`console.warn` nos logs locais são ruído repetitivo (`OCOR-2026-11-23-01` e `OCOR-2026-11-23-02`); adicionalmente, `jest.config.js` não coleta cobertura de `hooks/**`, `utils/**` e `pages/*.js` (excluindo `useAdminInactivityTimeout.js` e `adminSession.js` entregues na semana) e não possui `coverageThreshold` específico para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` e `components/Admin/`.
- **O que ainda não está sendo verificado:** Regressões de cobertura em hooks/utils/páginas e quedas isoladas em módulos de autenticação ou vendas mascaradas pela média global de 95,48%.
- **Risco ou possibilidade de falha:** Alertas reais de `console.error` passarem despercebidos no meio de dezenas de avisos `act(...)` e queda de cobertura em áreas críticas sem falha no `test-coverage.yml`.
- **Melhoria recomendada:** (1) Adicionar cancelamento via `AbortController`/ref de montagem em `hooks/useApiFetch.js` e aguardar efeitos pendentes em `AdminPosts.test.js`; (2) mockar `HTMLAnchorElement.prototype.click` nos testes de exportação de `AdminCrudBase.test.js`; (3) avaliar inclusão de `hooks/**/*.js` e `utils/**/*.js` em `collectCoverageFrom` e adicionar thresholds graduais para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` e `components/Admin/` (após fechar `5.4`, `5.6` e `5.7`).
- **Teste ou procedimento proposto:** Rodar `npm test` verificando redução dos 39 blocos de ruído a zero e validar `npm run test:coverage` mantendo todos os thresholds verdes.
- **Resultado esperado:** Logs de teste limpos e cobertura monitorada nas camadas novas de sessão, checkout e autenticação.
- **Benefício da implementação:** Diagnóstico imediato de erros reais em testes e proteção contínua contra queda de cobertura.
- **Prioridade:** **Baixa**.

---

## 6. Processos sem ocorrências identificadas
- **Análise Estática, Dependências Mortas e Higiene de Código (`npm run lint`, `npm run knip`, `npm run lint:chars`, `npm run lint:workflows`):** Nenhuma ocorrência identificada no período analisado (executados em 23/11/2026 com 0 erros e 0 avisos; 785 arquivos verificados em `lint:chars`). *Limitação:* `lint:chars` não está integrado ao workflow `test-coverage.yml` da CI.
- **Scanners Estáticos de Segurança (`npm run security:check-sql` em 264 arquivos e `npm run security:check-credentials` em 102 arquivos):** Nenhuma ocorrência identificada no período analisado (executados em 23/11/2026 com 0 vulnerabilidades). *Limitação:* análise estática não substitui testes dinâmicos e não cobre vulnerabilidades em pacotes terceiros (`npm audit` está inativo na CI — ver `OCOR-2026-11-23-03`).
- **Conformidade Arquitetural (Site Público, Painel `/admin`, Modalidade A × B, RBAC, anti-SSRF, Google JWKS ADR-0042 e Timeout 1h ADR-0043):** Comportamento validado pelos testes disponíveis nos logs locais de 22/11/2026 (`241 suítes / 2.090 testes passando`) e coerente com `ARQUITETURA_SITE_PUBLICO.md` e `ARQUITETURA_SITE_PRIVADO.md`. *Limitações:* cobertura de testes insuficiente para confirmar todos os cenários de erro/branch em `pages/api/auth/login.js`, `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `pages/api/admin/integrity.js` e `components/Admin/AdminSales.js`; execuções remotas de `e2e.yml`, `test-coverage.yml`, `test-db-coverage.yml` e `load-tests.yml` da semana não puderam ser verificadas por indisponibilidade de acesso ao GitHub Actions.
- **Preflight de Catálogo de Modelos (`npm run models:check`):** Comportamento validado pelos testes disponíveis em 23/11/2026 (detecção explícita de `ENOENT` como `status: NÃO VERIFICADO` e validação sintática do preset local `zen` com exit code `1` fail-closed). *Limitação:* catálogo vivo do OpenCode não verificado fora do host OpenCode.

---

## 7. Plano de ação recomendado

### Correções necessárias
1. **[Alta]** Reativar `Audit Dependencies` no `test-coverage.yml` e remover os blocos mortos `test-type == 'coverage'` de `.github/workflows/test-base.yml` (`5.5` / `OCOR-2026-11-23-03`).
2. **[Alta]** Proteger a desestruturação e validação de `req.body` em `pages/api/auth/login.js:39` para evitar `TypeError` não tratado antes do `try/catch` (`5.4` / `OCOR-2026-11-23-05`).
3. **[Média]** Implementar paginação (`per_page=100` + `created=>=`) e detecção de truncamento em `scripts/diagnostics/check-github-actions.js` (`5.9` / `OCOR-2026-11-23-04`).

### Novos testes
1. **[Alta]** Cobrir rate limit por IP (com IP de socket real), backstop por usuário, `untrustedForwarded`, `req.body` inválido/ausente, `?response=body` e corrigir o teste placebo de `tests/integration/api/login.test.js:104-125` (`5.4` / `OCOR-2026-11-23-05`).
2. **[Média]** Ampliar `tests/unit/components/Admin/AdminSales.test.js` cobrindo o modal de gerenciamento de pedido, filtros, exportação CSV e `mapItemToFormData` (`5.6`).
3. **[Média]** Cobrir branches negativas em `customer/auth.js`, `customer-auth.js` (including `NODE_ENV='production'` sem `JWT_SECRET`), `checkout.js`, `integrity.js`, `mercadopago.js`, `products.js` e `AdminCategories.js` (`5.7`).
4. **[Média]** Criar suítes `*.db.test.js` para `categories`, `audit`, `dicas` e `images`, estendendo `schema-sources.test.js` para os demais módulos `lib/domain/*.js` (`5.8`).

### Melhorias preventivas
1. **[Baixa]** Eliminar os 35 avisos `act(...)` (`hooks/useApiFetch.js` + `AdminPosts.test.js`) e os 4 erros jsdom de navegação (`AdminCrudBase.test.js`) (`5.10` / `OCOR-2026-11-23-01` e `02`).
2. **[Baixa]** Incluir `hooks/**` e `utils/**` em `collectCoverageFrom` e definir `coverageThreshold` para `pages/api/auth/`, `pages/api/customer/`, `lib/payment/` e `components/Admin/` após fechar `5.4`, `5.6` e `5.7` (`5.10`).

### Melhorias de segurança
1. **[Alta]** Reativar a auditoria contínua de vulnerabilidades npm no gate de PR/push (`5.5`), blindar `pages/api/auth/login.js` (`5.4`) e travar as branches fail-closed de `customer-auth.js`, `customer/auth.js` e `checkout.js` (`5.7`).

### Melhorias de monitoramento
1. **[Média]** Incluir cabeçalho com timestamp ISO-8601 e commit SHA nos scripts `test:log`, `test:coverage:log` e `lint:log` de `package.json` (`5.9` / `OCOR-2026-11-23-07`).
2. **[Média]** Consultar os logs remotos de `https://github.com/caminhar-deus/Caminhar/actions` na próxima auditoria com conectividade autorizada para validar as execuções da semana `16/11–23/11/2026`.

### Melhorias nos workflows
1. **[Alta]** Integrar `npm run lint:chars` ao job `lint` de `test-coverage.yml`, ajustar a coerência entre `timeout 20m` e `timeout-minutes: 15` em `e2e.yml` e atualizar o comentário de contagem de suítes/asserções em `test-db-coverage.yml` (`5.5`).

### Status das ações da auditoria anterior (16/11/2026)
- **Ação 01:** Guarda estática de schema SQL e cobertura `customers`/`orders` → **Concluído em 16/11/2026**
- **Ação 02:** Diagnóstico claro de `ENOENT` (`status: NÃO VERIFICADO`) em `check-model-catalog.js` → **Concluído em 16/11/2026** (revalidado em 23/11/2026)
- **Ação 03:** Criação da spec E2E Cypress `cypress/e2e/checkout.cy.js` e `PROJECT_cypress.md` → **Concluído em 16/11/2026**
- **Manutenção Preventiva 01:** Acompanhar nova execução de `e2e.yml` após correção de `cy.intercept` em `01a4a3f` → **Em acompanhamento (não verificado remotamente em 23/11/2026 devido ao bloqueio de acesso ao GitHub Actions)**
- **Manutenção Preventiva 02:** Validar cartões e entrega de webhook no Sandbox Mercado Pago → **Concluído em 17–18/11/2026** (homologação Sandbox de cartão de crédito, pré-pago, boleto, PIX, devolução de estoque e webhook real via `cloudflared` registrados em `dbcbbc0`, `6b69224`, `554c056`–`feb768a` e `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 25)

---

## 8. Conclusão técnica
1. **Quais problemas foram efetivamente identificados?** Foi confirmado 1 erro de configuração na CI (`OCOR-2026-11-23-03` — `Audit Dependencies` inalcançável em `test-base.yml`), 1 risco de robustez com lacuna crítica de cobertura em `pages/api/auth/login.js` (`OCOR-2026-11-23-05`), 1 fragilidade de truncamento no script `check-github-actions.js` (`OCOR-2026-11-23-04`), 2 padrões recorrentes de ruído `console.error` nos logs locais do Jest (`OCOR-2026-11-23-01` e `02`), 1 aviso de logs de erro simulados não silenciados em testes negativos (`OCOR-2026-11-23-06`) e a limitação de ausência de acesso ao GitHub Actions remoto e falta de timestamps no interior dos logs locais (`OCOR-2026-11-23-07`).
2. **Quais processos apresentaram maior quantidade ou gravidade de ocorrências?** Por **gravidade (Alta)**: o fluxo de auditoria de dependências na CI (`test-base.yml`/`test-coverage.yml`) e a suíte/handler de autenticação administrativa (`pages/api/auth/login.js`). Por **quantidade**: a suíte de componentes do painel nos logs locais de Jest (39 dos 47 blocos `console.error`/`console.warn`, distribuídos entre `AdminPostsNew`/`useApiFetch` e `AdminCrudBase`).
3. **Quais problemas são recorrentes?** A emissão de 35 erros React `act(...)` em `AdminPostsNew` (`hooks/useApiFetch.js`) e os 4 erros de navegação não implementada no jsdom 31 em `AdminCrudBase.test.js`, repetidos identicamente tanto em `tests-output.log` quanto em `coverage-output.log`; também persiste desde a auditoria anterior a indisponibilidade de rede do sandbox para consultar `api.github.com` (`OCOR-2026-11-23-07`).
4. **Quais funcionalidades não apresentaram problemas identificados?** Os gates estáticos locais (`eslint`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql`, `security:check-credentials`) apresentaram **nenhuma ocorrência identificada no período analisado**; `models:check` teve **comportamento validado pelos testes disponíveis**; e as funcionalidades entregues/ajustadas na semana (Google JWKS, timeout de 1h no `/admin`, endurecimento RBAC/SSRF/rate limit de APIs, checkout/Mercado Pago/reconciliação, tokens CSS) tiveram **nenhuma ocorrência identificada no período analisado** nos logs locais de teste. *Ressalva:* o status remoto das execuções dessas entregas no GitHub Actions exige **investigação adicional** na próxima rodada com acesso à API do GitHub.
5. **Quais funcionalidades ainda possuem lacunas de validação?** `pages/api/auth/login.js` (68,45% linhas; rate limits reais e `?response=body` descobertos), `components/Admin/AdminSales.js` (32,25% funções; modal e filtros descobertos), branches de erro/infra em `pages/api/customer/auth.js`, `lib/auth/customer-auth.js`, `pages/api/checkout.js`, `pages/api/admin/integrity.js` e `lib/payment/mercadopago.js`, além dos 4 domínios SQL sem suíte `*.db.test.js` (`categories`, `audit`, `dicas`, `images`) e da ausência de coleta de cobertura em `hooks/**`, `utils/**` e `pages/*.js` — caracterizando **cobertura de testes insuficiente para confirmar todos os cenários**.
6. **Quais novos testes ou procedimentos seriam recomendados?** Os detalhados nas oportunidades `5.4` a `5.10`: testes de integração reais para `login.js`, expansão de `AdminSales.test.js`, cobertura de branches negativas nas APIs de visitante/checkout/integridade/Mercado Pago, novas suítes `*.db.test.js`, reativação de `npm audit` + `lint:chars` na CI, paginação em `check-github-actions.js` e timestamps nos logs locais.
7. **Quais melhorias devem ser priorizadas?** Primeiro as duas de prioridade **Alta** (`5.5` — restaurar `Audit Dependencies` no CI; `5.4` — blindar `req.body` e cobrir as proteções reais de `/api/auth/login`), seguidas pelas médias de maior retorno em confiabilidade (`5.6`, `5.7`, `5.8`, `5.9`) e pelas de higiene preventiva (`5.10`).
8. **Existem riscos que merecem acompanhamento nas próximas auditorias?** Sim: (a) confirmar as execuções remotas de `e2e.yml` (especialmente o pós-`01a4a3f`), `test-coverage.yml`, `test-db-coverage.yml` e `load-tests.yml` no GitHub Actions assim que houver acesso; (b) acompanhar o fechamento dos itens de prioridade Alta (`5.4` e `5.5`); e (c) monitorar os 11 arquivos com alterações locais ainda não commitadas no working tree em 23/11/2026 após o eventual commit/push. **Oportunidade de melhoria preventiva** aberta em todas as frentes catalogadas, sem garantias indevidas sobre fluxos remotos não observados.

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

### Auditoria de 23/11/2026 (Atual)
- **Período analisado:** 16/11/2026 a 23/11/2026 (últimos 7 dias móveis)
- **Resumo:** Auditoria exclusivamente analítica (sem alterações no código ou workflows) abrangendo `logs/{tests-output,coverage-output,eslint}.log` (21–22/11/2026), definições locais de workflows/actions, 40 commits da semana (`b37c9f1` a `ee4ed2e`) e execução ao vivo dos verificadores estáticos (`lint`, `knip`, `lint:chars`, `lint:workflows`, `security:check-sql`, `security:check-credentials`, `models:check`). Zero falhas nos 241 arquivos/2.090 testes executados localmente (8 suítes `.db` / 96 testes ignorados sem Docker) e cobertura global de 95,48% L / 86,31% B / 93,37% F. Identificadas 7 ocorrências (`OCOR-2026-11-23-01` a `07`, com destaque para `Audit Dependencies` inalcançável em `test-base.yml` e desestruturação de `req.body` + cobertura de 68,45% em `pages/api/auth/login.js`) e 7 oportunidades de melhoria (`5.4` a `5.10`).
- **Situação dos pontos anteriores:** `AVISO-01` sem regressão; `Manutenção Preventiva 02` (Sandbox Mercado Pago + webhook real) **concluída em 17–18/11/2026**; `Manutenção Preventiva 01` (`e2e.yml` pós-`01a4a3f`) **sem verificação remota** porque o acesso à API/web do GitHub Actions esteve indisponível no sandbox durante esta sessão (auditoria concluída parcialmente, com limitação registrada).
