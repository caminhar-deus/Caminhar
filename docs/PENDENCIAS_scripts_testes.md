# Pendências — Scripts e Testes

**Escopo:** itens levantados durante os ajustes de scripts/testes e **não** implementados, por estarem fora do escopo aprovado.

**Já implementados (para contraste):** chave via `CYPRESS_RECORD_KEY`, hook `precypress:run`, cobertura de banco isolada em `coverage-db` e respectivo ignore no ESLint, thresholds por diretório, `--bail` em `test:ci`, `--testPathPatterns` em `test:db:unit`, propagação de exit code nos scripts `:log`, `set -o pipefail` no comando de cobertura de `pr-coverage.yml`, upload do artefato `coverage-output` com `always()` em `test-base.yml` e movimentação de `pr-coverage.yml` para `.github/workflows/`, lint dos workflows com actionlint no job `coverage-report`.

---

## E — Workflows de teste não são executados pelo GitHub Actions

| | |
|---|---|
| **Estado atual** | `ci.yml`, `load-tests.yml` e `security-tests.yml` estão na raiz do repositório, mas o GitHub Actions lê apenas `.github/workflows/`, onde existem `test-base.yml` (`on: workflow_call`) e `pr-coverage.yml`. |
| **Impacto** | Os três workflows restantes não rodam no GitHub; `test-base.yml` fica inerte, pois só é referenciado por eles (a cobertura deixou de usá-lo — ver item M). |
| **Ação necessária** | Mover os três arquivos restantes para `.github/workflows/` — as chamadas a `./.github/workflows/test-base.yml` e `./.github/actions/*` voltam a resolver — e validar os gatilhos de cada workflow. |

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

## L — `setup-db` invoca script npm inexistente

| | |
|---|---|
| **Estado atual** | `.github/actions/setup-db/action.yml` executa `npm run setup:test-db`, mas esse script não existe em `package.json` — e nunca existiu (`git log -S 'setup:test-db' -- package.json` não retorna commits). Os equivalentes disponíveis são `db:reset` (init-table + `db:init`) e `migrate`. O bloco `env` da action define `TEST_DB_*`, variáveis que nenhum script do repositório consome (todos usam `DATABASE_URL`). |
| **Impacto** | O step `Setup Test Database` falha com "Missing script: setup:test-db" em todo job que usa `test-base.yml` (carga e segurança — a cobertura não passa mais por ele, ver item M). Como `Run Tests` vem depois, nenhuma suíte executa e os relatórios de carga/segurança saem vazios. |
| **Ação necessária** | Apontar a action para o comando real de setup exportando `DATABASE_URL` (ex.: `npm run migrate` ou `npm run db:reset` no banco efêmero do serviço) ou criar o script ausente no `package.json`. **Parcialmente resolvido:** `test-base.yml` ganhou o input `skip-db-setup` (disponível para futuros chamadores) e a suíte de cobertura deixou de passar por esse caminho — `pr-coverage.yml` executa o jest em um job próprio, sem `setup-db` (ver item M). Os workflows de carga e segurança continuam dependentes da correção da action/script. |

## M — Falso positivo `Unable to find reusable workflow` no editor

| | |
|---|---|
| **Estado atual** | O language server da extensão `github.vscode-github-actions` resolve referências locais a workflows reutilizáveis (`uses: ./.github/workflows/x.yml`) lendo o arquivo a partir do contexto de repositório recebido na inicialização. Quando o servidor sobe sem esse contexto (repositório não detectado no momento da ativação), a leitura falha e o parser converte a falha em `Unable to find reusable workflow` na linha do `uses:` — falso positivo, pois o workflow é válido e executa no GitHub (issue aberta: `github/vscode-github-actions#254`). Reproduzido validando `pr-coverage.yml` com `@actions/languageservice`: com `workspaceUri` conhecido não há diagnóstico; sem ele a mensagem aparece exatamente no `uses:` local. |
| **Impacto** | Erro fantasma no painel de problemas do editor em todo workflow que chame outro por caminho local — hoje `ci.yml`, `load-tests.yml` e `security-tests.yml`, que continuam com a chamada a `test-base.yml`. Referências locais de *actions* (`.github/actions/*`) não passam por esse caminho e não são sinalizadas. |
| **Ação necessária** | Não há correção possível no workflow: o formato `./.github/workflows/...` é obrigatório para referência local. Mitigação adotada em `pr-coverage.yml`: job de cobertura autocontido, sem chamada reutilizável. No editor, recarregar a janela faz o servidor receber o contexto de repositório e o aviso desaparece. **Reprodução:** `npm run diag:reusable-workflow -- <arquivo>` (mesmo motor do language server, com o cenário de workspace como asserção), `npm run diag:lsp <arquivo> [--no-repos]` (server real da extensão) e `npm run lint:workflows` (actionlint) — ver `scripts/diagnostics/`. |