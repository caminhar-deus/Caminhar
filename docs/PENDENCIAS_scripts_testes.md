# Pendências — Scripts e Testes

**Escopo:** itens levantados durante os ajustes de scripts/testes e **não** implementados, por estarem fora do escopo aprovado.

**Já implementados (para contraste):** chave via `CYPRESS_RECORD_KEY`, hook `precypress:run`, cobertura de banco isolada em `coverage-db`, thresholds por diretório, `--bail` em `test:ci`, `--testPathPatterns` em `test:db:unit` e propagação de exit code nos scripts `:log`.

---

## E — Workflows de teste não são executados pelo GitHub Actions

| | |
|---|---|
| **Estado atual** | `ci.yml`, `pr-coverage.yml`, `load-tests.yml` e `security-tests.yml` estão na raiz do repositório, mas o GitHub Actions lê apenas `.github/workflows/`, onde existe somente `test-base.yml` (`on: workflow_call`). |
| **Impacto** | Nenhum workflow de teste roda no GitHub; `test-base.yml` fica inerte, pois não tem chamador. |
| **Ação necessária** | Mover os quatro arquivos para `.github/workflows/` — as chamadas a `./.github/workflows/test-base.yml` e `./.github/actions/*` voltam a resolver — e validar os gatilhos de cada workflow. |

## F — `pr-coverage.yml` descarta o status da suíte

| | |
|---|---|
| **Estado atual** | O step executa `jest --coverage` canalizado para `tee`, sem `pipefail`, de modo que o status do pipeline é o do `tee` (sempre zero). |
| **Impacto** | O job que comenta a cobertura no PR depende de o job de testes falhar; a falha real pode não ser sinalizada. |
| **Ação necessária** | Habilitar `set -o pipefail` no step (ou declarar `shell: bash`, que já o habilita no Actions). Depende do item E. |

## H — Rotação da record key do Cypress

| | |
|---|---|
| **Estado atual** | A chave não está mais no manifesto, mas o valor antigo permanece no histórico do Git. |
| **Impacto** | A chave continua válida para envio de gravações ao projeto no Cypress Cloud. |
| **Ação necessária** | Revogar/rotacionar a chave no Cypress Cloud e definir `CYPRESS_RECORD_KEY` no ambiente local e como secret no CI. Ação manual, sem alteração de código. |

## I — `allowCypressEnv` removido no Cypress 16

| | |
|---|---|
| **Estado atual** | `cypress.config.js` ainda declara `allowCypressEnv: false`; o Cypress 16.1.0 avisa que a opção foi removida na versão 16.0.0. |
| **Impacto** | Aviso repetido em toda execução e configuração sem efeito. |
| **Ação necessária** | Remover a opção de `cypress.config.js`. |

## J — Suíte com banco real não executa localmente

| | |
|---|---|
| **Estado atual** | O container PostgreSQL não sobe (`Falha ao iniciar container PostgreSQL: Cannot read properties of undefined (reading 'split')`), o setup grava `TEST_DATABASE_URL='__docker_unavailable__'` e as 5 suítes de `tests/integration/domain/*.db.test.js` (70 testes) são ignoradas por `describe.skip` em `tests/helpers/db-test.js`. |
| **Impacto** | Sem execução real, o relatório de `coverage-db/` reflete apenas os arquivos tocados por um run sem testes. |
| **Ação necessária** | Investigar o stack de Testcontainers (imagem, pull e permissões) até o container subir. |

## K — Teardown global versus container reutilizável

| | |
|---|---|
| **Estado atual** | `tests/global-setup.db.js` usa `.withReuse(true)` e `jest.teardown.js` finaliza `global.__TEST_DB_CONTAINER__`. |
| **Impacto** | O encerramento no teardown pode anular a reutilização pretendida. Não há erro observado; item levantado por análise. |
| **Ação necessária** | Definir e documentar se o teardown deve ou não parar containers reutilizáveis. Depende do item J. |