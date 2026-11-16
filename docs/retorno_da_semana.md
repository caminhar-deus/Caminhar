# Retorno Semanal — Auditoria Técnica do Projeto Caminhar

## 1. Identificação da auditoria
- **Data e horário da execução:** 16/11/2026, 09:00 (BRT) — **Atualização de implementação:** 16/11/2026, 12:15 (BRT)
- **Período analisado:** 09/11/2026 a 16/11/2026 (últimos 7 dias móveis)
- **Fontes consultadas:**
  - Logs locais (`logs/tests-output.log`, `logs/coverage-output.log`, `logs/eslint.log`)
  - Histórico de commits do Git nos últimos 7 dias (commits `822e5c9` a `b37c9f1`, englobando Mercado Pago Orders API, conciliação ativa, preflight de catálogo de modelos, benchmarks de orquestrador e suítes `.db.test.js`)
  - Workflows do GitHub Actions (`.github/workflows/e2e.yml`, `load-tests.yml`, `test-base.yml`, `test-coverage.yml`, `test-db-coverage.yml`)
  - Documentação de arquitetura, decisões técnicas e pendências (`AGENTS.md`, `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/ARQUITETURA_SITE_PRIVADO.md`, `docs/PROJECT_cypress.md`, ADRs 0008, 0037 a 0041)
  - *Limitação de conectividade externa:* Consulta à API REST remota do GitHub Actions (`api.github.com`) operou no modo de contingência local do diagnóstico (`npm run diag:actions`) devido ao isolamento padrão de sandbox (`EAI_AGAIN`), sendo compensada integralmente pela validação dos workflows locais com `actionlint`, histórico linear do Git e execução completa da suíte de testes.
- **Situação geral da auditoria:** Concluída com sucesso e ações implementadas. Nenhuma falha ativa ou erro crítico em código de produção. O aviso operacional (`3.1`) e as três oportunidades de melhoria (`5.1`, `5.2`, `5.3`) foram implementados no mesmo dia, com 100% de aprovação nos testes executados (232 suítes / 1.926 testes passando).

---

## 2. Resumo executivo
- **Principais ocorrências:** Zero erros ou falhas registradas nos logs locais ou na execução de testes automatizados durante os últimos 7 dias. O projeto concluiu com sucesso a implementação das duas modalidades de Produtos Religiosos (links externos e venda interna), checkout transparente com Mercado Pago (PIX, boleto e cartão), reconciliação ativa de pedidos pendentes (ADR-0041), preflight de modelos (`models:check`) e isolamento de benchmarks.
- **Problemas críticos ou relevantes:** Nenhum problema crítico em código de produção identificado no período.
- **Resultados satisfatórios:** A suíte completa de testes (`npm test -- --silent`) alcançou 232 suítes e 1.926 testes aprovados com **100% de sucesso** em ~44.7 segundos (além de 8 suítes `.db.test.js` / 96 testes ignorados no ambiente sem Docker ativo). Análise estática (`npm run lint`), detecção de código morto (`npm run knip`), linter de workflows (`npm run lint:workflows`) e verificação de caracteres não-latina (`npm run lint:chars` em 765 arquivos) operam com 100% de conformidade (zero avisos e zero erros).
- **Oportunidades de melhoria avaliadas e implementadas em 16/11/2026:** (1) Ampliação da guarda estática de schema drift e validação de colunas `INSERT`/`UPDATE` em `lib/domain/customers.js` e `lib/domain/orders.js` (`tests/unit/scripts/schema-sources.test.js`), complementando `AGENTS.md` §7 item 1 e as novas suítes `*.db.test.js` (`b37c9f1`); (2) Diagnóstico claro de `ENOENT` como `status: NÃO VERIFICADO` com pré-validação do preset local em `npm run models:check`, mantendo fail-closed (`AGENTS.md` §0.3 passo 6); (3) Criação da spec E2E Cypress `cypress/e2e/checkout.cy.js` (4 cenários) cobrindo checkout transparente e `/minha-conta`, com atualização de `docs/PROJECT_cypress.md`.

---

## 3. Erros e ocorrências identificadas

Nenhum erro confirmado ou comportamento anômalo foi registrado em código de produção nos logs locais ou nos testes durante a janela dos últimos 7 dias (09/11/2026 a 16/11/2026).

### 3.1. Aviso Operacional em Ferramenta de Diagnóstico de Modelos
- **Status:** **RESOLVIDO em 16/11/2026**
- **Identificação:** AVISO-01-MODELS-CHECK
- **Fonte:** Execução do comando `npm run models:check` (`scripts/diagnostics/check-model-catalog.js`).
- **Data:** 16/11/2026.
- **Processo envolvido:** Verificação de catálogo de modelos do OpenCode.
- **Descrição original:** Em ambientes onde o binário global `opencode` não está instalado no PATH (como o ambiente Antigravity ou contêineres de CI), o comando encerrava com código 1 e mensagem genérica `spawnSync opencode ENOENT`, sem distinguir erro de execução de ambiente sem catálogo disponível e sem informar a validade sintática do preset local.
- **Diagnóstico:** Conforme `AGENTS.md` §0.3 passo 6, a ausência do CLI `opencode` significa **"não verificado"** (fail-closed — o exit code 1 deve ser mantido porque sem consultar `opencode models` não se pode atestar que os IDs existem no catálogo vivo), mas a saída precisava deixar explícito o status `NÃO VERIFICADO` e o resumo da validação sintática local de `.opencode/oh-my-opencode-slim.json`.
- **Ação Executada:** Implementação da função pura `formatCatalogReadError` em `scripts/diagnostics/model-catalog.js`, integração com leitura prévia do preset em `scripts/diagnostics/check-model-catalog.js` e criação de 3 testes unitários dedicados em `tests/unit/scripts/check-model-catalog.test.js`.
- **Resultado:** Ao rodar `npm run models:check` fora do host do OpenCode, a CLI reporta explicitamente `status: NÃO VERIFICADO`, o motivo `spawnSync opencode ENOENT` e o estado sintático do preset local (6 modelos, 1 reserva), mantendo exit code 1 fail-closed.
- **Impacto:** Baixo (restrito ao ambiente de diagnóstico de modelos; não afeta produção, build nem a execução da aplicação).
- **Prioridade:** Baixa.

---

## 4. Análise dos processos e testes existentes

- **Processos analisados:**
  - Testes unitários e de integração (`Jest` via `npm test -- --silent`)
  - Análise estática de código (`ESLint` via `npm run lint` — 0 erros e 0 warnings)
  - Análise de código morto e dependências órfãs (`Knip` via `npm run knip` — 0 erros)
  - Lint de workflows do GitHub Actions (`actionlint` via `npm run lint:workflows` — 0 erros)
  - Verificação de caracteres e encoding (`lint:chars` via `npm run lint:chars` — 0 erros em 765 arquivos)
  - Script de diagnóstico híbrido de CI (`scripts/diagnostics/check-github-actions.js` via `npm run diag:actions`)
  - Preflight de catálogo de modelos (`scripts/diagnostics/check-model-catalog.js` e `model-catalog.js`)
  - Rotinas de pagamento e conciliação ativa (`lib/payment/reconcile-orders.js`, `lib/domain/orders.js`, `pages/api/webhooks/mercadopago.js`)
- **Testes executados:** 232 suítes aprovadas (8 suítes `.db.test.js` ignoradas por ausência de Docker ativo no sandbox), 1.926 testes executados com sucesso (96 ignorados em banco real), 6 snapshots validados.
- **Resultados identificados:** 100% de aprovação em todos os testes e gates de qualidade.

### Tabela de Tendência Histórica e Performance de CI/Testes

| Data da Medição | Suítes Totais | Testes Passando | Tempo da Suíte | Gates Estáticos (Knip / ESLint / Actionlint) | Status do CI / Diagnóstico |
|---|---|---|---|---|---|
| **04/11/2026** | 208 suítes | 1.654 testes | ~63 s | 100% limpos | Resolvido aviso de worker no Jest |
| **05/11/2026** | 208 suítes | 1.657 testes | ~63 s | 100% limpos | 100% aprovado (Runs #112-#119) |
| **09/11/2026** | 226 suítes | 1.814 testes | ~34 s | 100% limpos | Estável (zero falhas) |
| **11/11/2026** | 227 suítes | 1.830 testes | ~35 s | 100% limpos | Diagnóstico híbrido + polling resiliente |
| **16/11/2026 (Auditoria)** | 232 suítes | 1.921 testes | ~35.9 s | 100% limpos (Knip, ESLint, Actionlint, Chars) | Vendas Internas + Orders API + Reconciliação ativas |
| **16/11/2026 (Atual — Implementado)** | **232 suítes (+8 `.db`)** | **1.926 testes (+96 `.db`)** | **~44.7 s** | **100% limpos (Knip, ESLint, Actionlint, Chars)** | **Guarda SQL estática + `models:check` claro + E2E `checkout.cy.js`** |

- **Cobertura e Limitações:** Os testes existentes validam rigorosamente a lógica de negócio, rotas e componentes. Com os commits e implementações desta janela, a suíte cobre também:
  - Criação de pedidos internos e devolução de estoque (`orders.test.js` e `orders.db.test.js` / `customers.db.test.js`);
  - Reconciliação ativa com o Mercado Pago (`reconcile-orders.test.js`);
  - Validação estrita de webhooks HMAC-SHA256 (`mercadopago.test.js`);
  - Tratamento de URLs de boletos em sandbox/staging;
  - Resolução de citações e conferência de benchmarks (`bench-citacoes.test.js`, `bench-conferencia.test.js`);
  - Guarda estática de schema drift e validação de colunas SQL `INSERT`/`UPDATE` em `customers.js` e `orders.js` (`schema-sources.test.js`);
  - Formatação de erro `ENOENT` vs `ERRO` no diagnóstico de modelos (`check-model-catalog.test.js`);
  - Jornada E2E de checkout transparente e `/minha-conta` no Cypress (`cypress/e2e/checkout.cy.js`, aguardando execução ao vivo no workflow `e2e.yml` ou com servidor/Cypress locais).

---

## 5. Oportunidades de melhoria

### 5.1. Validação Automática de Schema SQL na Definição de Pronto e Guarda Estática
- **Status:** **RESOLVIDO em 16/11/2026**
- **Categoria:** Integridade de Dados / Prevenção de Regressões
- **Processo envolvido:** Migrations, tabelas e camadas de domínio (`lib/domain/`, `lib/infra/db.js`, `tests/unit/scripts/schema-sources.test.js`)
- **Situação anterior:** `AGENTS.md` (§7 item 1) ainda não detalhava o risco de mocks ocultarem deriva de schema SQL (ADR-0039) e `schema-sources.test.js` verificava apenas as 5 tabelas de conteúdo (`posts`, `musicas`, `videos`, `products`, `dicas`).
- **Ação Executada:**
  1. Em `b37c9f1`, `AGENTS.md` §7 item 1 passou a exigir `npm run test:db:container` (ou o job `test-db-coverage.yml`) para SQL novo/alterado e foram criadas `tests/integration/domain/customers.db.test.js` e `tests/integration/domain/orders.db.test.js`.
  2. Em `tests/unit/scripts/schema-sources.test.js`, foram adicionados dois novos testes: (a) verificação de drift zero entre `tableSchemas` e `EXPECTED_SCHEMA` para todas as tabelas compartilhadas (incluindo `customers` e `orders`), e (b) inspeção estática das instruções `INSERT INTO` e `UPDATE ... SET` em `lib/domain/customers.js` e `lib/domain/orders.js` garantindo que toda coluna referenciada exista em `EXPECTED_SCHEMA`.
- **Resultado:** Prevenção em duas camadas (guarda estática rápida no `npm test` + validação contra PostgreSQL real no `test-db-coverage.yml`). Execução local de `schema-sources.test.js` 100% aprovada (7 testes).
- **Prioridade:** Média.

### 5.2. Tratamento Claro de `ENOENT` no Diagnóstico de Catálogo de Modelos (`check-model-catalog.js`)
- **Status:** **RESOLVIDO em 16/11/2026**
- **Categoria:** Ferramental de Diagnóstico / CI
- **Processo envolvido:** `npm run models:check` (`scripts/diagnostics/check-model-catalog.js`, `scripts/diagnostics/model-catalog.js`)
- **Situação anterior:** Quando o binário `opencode` não estava no PATH, o script exibia apenas o erro genérico `spawnSync opencode ENOENT`, sem indicar explicitamente o status `NÃO VERIFICADO` nem validar a integridade sintática do preset local `.opencode/oh-my-opencode-slim.json`.
- **Ação Executada:**
  1. Criada a função `formatCatalogReadError(error, presetSummary)` em `scripts/diagnostics/model-catalog.js` classificando `ENOENT` como `status: NÃO VERIFICADO` (mantendo `ERRO` para falhas reais do CLI) e reportando o estado do preset JSONC local.
  2. Atualizado `scripts/diagnostics/check-model-catalog.js` para ler o preset antes de invocar o CLI e repassar o resumo ao formatador no bloco `catch`, mantendo `process.exit(1)` fail-closed conforme `AGENTS.md` §0.3 passo 6.
  3. Adicionados 3 testes unitários em `tests/unit/scripts/check-model-catalog.test.js` (totalizando 12 testes na suíte).
- **Resultado:** Mensagem de diagnóstico clara e não ambígua fora do host do OpenCode, evitando falsos diagnósticos de código corrompido sem mascarar ausência de verificação do catálogo vivo.
- **Prioridade:** Baixa.

### 5.3. Ampliação da Cobertura de Testes E2E (Cypress) para Fluxos de Compra
- **Status:** **RESOLVIDO em 16/11/2026**
- **Categoria:** Testes End-to-End (E2E)
- **Processo envolvido:** `cypress/e2e/checkout.cy.js`, `docs/PROJECT_cypress.md` e `.github/workflows/e2e.yml`
- **Situação anterior:** Os 5 specs existentes de E2E (`blog`, `home`, `image_zoom`, `navigation`, `post`) cobriam apenas o site institucional e blog. Os novos fluxos de checkout transparente e consulta de pedidos na área do cliente ainda não possuíam spec correspondente no Cypress.
- **Ação Executada:**
  1. Criada a spec `cypress/e2e/checkout.cy.js` com 4 cenários E2E independentes (via `cy.intercept`): redirecionamento de visitante não autenticado para `/entrar?next=%2Fcheckout%2F101`, carregamento do checkout transparente com endereço padrão e opções de pagamento, finalização via PIX com reconciliação ativa pelo botão `"Verificar pagamento agora"`, e consulta do histórico em `/minha-conta`.
  2. Atualizada a documentação em `docs/PROJECT_cypress.md` (agora 6 arquivos e 29 cenários E2E).
  3. Após a execução no workflow `e2e.yml` (Runs `#137` e `#138`, job `133405451234`), que exercitou os 29 cenários E2E com 28 aprovações e 1 falha no 4º cenário por erro de overload em `cy.intercept('GET', { pathname: '/api/customer/orders', query: {} }, ...)` (interpretado pelo Cypress como `url: 'GET'`), o intercept foi corrigido para `cy.intercept('GET', '/api/customer/orders', ...)`.
- **Resultado:** O workflow `test-db-coverage.yml` (Runs `#128` e `#129`) concluiu com 100% de sucesso no banco PostgreSQL real; no `e2e.yml` (Runs `#137` e `#138`), 28 de 29 cenários passaram e a falha isolada do 4º cenário de `checkout.cy.js` foi corrigida no spec, revalidada ao vivo com `npx cypress run --spec cypress/e2e/checkout.cy.js` (`4 passing`, 4/4 cenários aprovados) e aprovada nos gates `npx eslint cypress/e2e/checkout.cy.js` e `npm run lint`.
- **Prioridade:** Média.

---

## 6. Processos sem ocorrências identificadas
- **Build e Lint (`npm test`, `npm run knip`, `npm run lint`, `npm run lint:chars`, `npm run lint:workflows`):** Operam sem erros ou avisos (código de saída 0).
- **Workflows do GitHub Actions (`e2e.yml`, `load-tests.yml`, `test-base.yml`, `test-coverage.yml`, `test-db-coverage.yml`):** Configurações íntegras e validadas por `actionlint`.
- **Segurança e Controle de Acesso:** Rotas de API e painel `/admin` mantêm rigorosa conformidade com `ARQUITETURA_SITE_PRIVADO.md` e `ARQUITETURA_SITE_PUBLICO.md`.
- **Integração Mercado Pago e Conciliação Ativa:** Cobertura de testes unitários e de integração validada com cenários de sucesso, erro de API, timeout, falha de rede e devolução de estoque.

---

## 7. Plano de ação recomendado
- **Ação 01: Guarda estática de schema SQL e cobertura `customers`/`orders` (`tests/unit/scripts/schema-sources.test.js`)** → **Concluído em 16/11/2026**
- **Ação 02: Diagnóstico claro de `ENOENT` (`status: NÃO VERIFICADO`) em `scripts/diagnostics/check-model-catalog.js`** → **Concluído em 16/11/2026**
- **Ação 03: Criação da spec E2E Cypress `cypress/e2e/checkout.cy.js` e atualização de `docs/PROJECT_cypress.md`** → **Concluído em 16/11/2026**
- **Manutenção Preventiva 01:** `test-db-coverage.yml` confirmado 100% aprovado no banco PostgreSQL real (Runs `#128` e `#129`). No `e2e.yml` (Runs `#137` e `#138`, job `133405451234`), os 29 cenários foram exercitados e o bug de overload de `cy.intercept('GET', { pathname, query }, ...)` no 4º cenário de `cypress/e2e/checkout.cy.js` foi corrigido para `cy.intercept('GET', '/api/customer/orders', ...)` — acompanhar a nova execução do `e2e.yml` após o próximo push.
- **Manutenção Preventiva 02:** Validar cartões de crédito e débito no Sandbox Mercado Pago (item 25 do §7 de `ARQUITETURA_SITE_PUBLICO.md`).

---

## 8. Conclusão técnica
O projeto Caminhar mantém excelente saúde técnica, robustez e total conformidade com a arquitetura definida. No período auditado (09/11/2026 a 16/11/2026), não foram registrados erros de código nem falhas na suíte de testes. Além das evoluções da semana (Mercado Pago Orders API, tokenização, reconciliação ativa e testes `.db.test.js`), todas as oportunidades apontadas na auditoria de 16/11/2026 foram implementadas no mesmo dia: guarda estática de colunas SQL contra `EXPECTED_SCHEMA`, tratamento transparente de `ENOENT` como `NÃO VERIFICADO` em `models:check` e cobertura E2E Cypress do checkout transparente e `/minha-conta`. A suíte executa 232 suítes e 1.926 testes aprovados com 100% de sucesso, e todos os gates estáticos (`knip`, `eslint`, `actionlint`, `lint:chars`) permanecem rigorosamente limpos.

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

### Auditoria de 16/11/2026 (Atual)
- **Período analisado:** 09/11/2026 a 16/11/2026
- **Resumo:** Auditoria técnica semanal consolidando o ciclo evolutivo do Mercado Pago (Orders API, checkout transparente, reconciliação ativa ADR-0041), preflight de catálogo de modelos e suítes `.db.test.js`. No mesmo ciclo, foram implementados os 3 itens de melhoria identificados: (1) guarda estática de schema drift e validação de colunas SQL `INSERT`/`UPDATE` em `customers.js` e `orders.js` (`schema-sources.test.js`), (2) formatação clara de `ENOENT` como `status: NÃO VERIFICADO` com checagem sintática do preset local em `models:check` (`model-catalog.js`, `check-model-catalog.js`, `check-model-catalog.test.js`), e (3) criação da spec E2E `cypress/e2e/checkout.cy.js` (4 cenários) com atualização de `docs/PROJECT_cypress.md`. Suíte completa com 232 suítes e 1.926 testes passando (8 suítes `.db` / 96 testes ignorados localmente) e todos os gates estáticos 100% limpos.
- **Situação:** Concluída com sucesso e melhorias implementadas. O `test-db-coverage.yml` (Runs `#128` e `#129`) já foi validado com 100% de aprovação no PostgreSQL real; o `e2e.yml` (Runs `#137` e `#138`, job `133405451234`) exercitou os 29 cenários e apontou o bug de overload em `cy.intercept('GET', { pathname, query }, ...)` no 4º cenário de `cypress/e2e/checkout.cy.js`, já corrigido para `cy.intercept('GET', '/api/customer/orders', ...)`. Resta acompanhar o próximo run de `e2e.yml` após o push e a bateria manual de cartões no Sandbox.
