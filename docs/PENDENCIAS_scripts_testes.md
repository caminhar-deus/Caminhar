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
| **Estado atual** | **(Problema original — mantido para histórico.)** `.github/actions/setup-db/action.yml` executava `npm run setup:test-db`, mas esse script não existia em `package.json` — e nunca existiu (`git log -S 'setup:test-db' -- package.json` não retorna commits). Os equivalentes disponíveis eram `db:reset` (init-table + `db:init`) e `migrate`. O bloco `env` da action define `TEST_DB_*`, variáveis que nenhum script do repositório consumia (todos usam `DATABASE_URL`). |
| **Impacto** | O step `Setup Test Database` falhava com "Missing script: setup:test-db" em todo job que usa `test-base.yml` (carga e segurança — a cobertura não passa mais por ele, ver item M). Como `Run Tests` vem depois, nenhuma suíte executava e os relatórios de carga/segurança saíam vazios. |
| **Ação necessária** | ✅ **RESOLVIDO:** `scripts/setup-test-db.js` foi criado e o script `setup:test-db` registrado em `package.json` (`node scripts/setup-test-db.js`) — a composite action `setup-db` agora resolve o comando. O script consome as `TEST_DB_*` do bloco `env` da action (prioridade `TEST_DB_* > DATABASE_URL`), fechando também o desalinhamento de variáveis. Etapas anteriores mantidas no histórico: `test-base.yml` ganhou o input `skip-db-setup` (disponível para futuros chamadores) e a suíte de cobertura deixou de passar por esse caminho — `pr-coverage.yml` executa o jest em um job próprio, sem `setup-db` (ver item M). Histórico do que era o problema preservado na linha "Estado atual" acima. |

## M — Falso positivo `Unable to find reusable workflow` no editor

| | |
|---|---|
| **Estado atual** | O language server da extensão `github.vscode-github-actions` resolve referências locais a workflows reutilizáveis (`uses: ./.github/workflows/x.yml`) lendo o arquivo a partir do contexto de repositório recebido na inicialização. Quando o servidor sobe sem esse contexto (repositório não detectado no momento da ativação), a leitura falha e o parser converte a falha em `Unable to find reusable workflow` na linha do `uses:` — falso positivo, pois o workflow é válido e executa no GitHub (issue aberta: `github/vscode-github-actions#254`). Reproduzido validando `pr-coverage.yml` com `@actions/languageservice`: com `workspaceUri` conhecido não há diagnóstico; sem ele a mensagem aparece exatamente no `uses:` local. |
| **Impacto** | Erro fantasma no painel de problemas do editor em todo workflow que chame outro por caminho local — hoje `ci.yml`, `load-tests.yml` e `security-tests.yml`, que continuam com a chamada a `test-base.yml`. Referências locais de *actions* (`.github/actions/*`) não passam por esse caminho e não são sinalizadas. |
| **Ação necessária** | Não há correção possível no workflow: o formato `./.github/workflows/...` é obrigatório para referência local. Mitigação adotada em `pr-coverage.yml`: job de cobertura autocontido, sem chamada reutilizável. No editor, recarregar a janela faz o servidor receber o contexto de repositório e o aviso desaparece. **Reprodução:** `npm run diag:reusable-workflow -- <arquivo>` (mesmo motor do language server, com o cenário de workspace como asserção), `npm run diag:lsp <arquivo> [--no-repos]` (server real da extensão) e `npm run lint:workflows` (actionlint) — ver `scripts/diagnostics/`. |

## N — Sete endpoints admin sem `permission` nem `requireAdmin`

| | |
|---|---|
| **Estado atual** | **PRÉ-EXISTENTE** — achado anterior ao trabalho de normalização de permissões (não faz parte deste diff). Os endpoints `dicas`, `musicas`, `backups`, `rate-limit`, `fetch-spotify`, `fetch-ml` e `fetch-youtube` são registrados em `createAdminHandler` sem `permission` e sem `requireAdmin`. Como `lib/api/adminCrudHandler.js` só executa o bloco RBAC dentro de `if (permission)`, a verificação de permissão é pulada quando `permission` está ausente. |
| **Impacto** | Escalação de privilégio: qualquer usuário autenticado (inclusive cargo comum) acessa esses endpoints — inclusive `DELETE /api/admin/musicas` e `POST /api/admin/backups`. |
| **Ação necessária** | Definir a permissão correta por endpoint (campo `permission` na config do handler, e/ou `requireAdmin` quando aplicável) e adicionar testes de 403 para cargo sem a permissão. Backlog — fora do escopo deste diff. |

## O — Pre-commit de lint não adotado (decisão consciente)

| | |
|---|---|
| **Estado atual** | **Não há pre-commit.** O repositório não tem `.husky/` e `package.json` não define script `prepare`. A análise estática roda **apenas na CI**: `pr-coverage.yml` tem o job `lint` (`npm run lint`, ESLint) em paralelo ao `coverage`, e o `coverage-report` roda `npm run lint:workflows` (actionlint) e `npm run knip` ao final. Todos os três verdes (`exit 0`). |
| **Impacto** | Erro de lint só é detectado no push/PR, não no momento da alteração local. Quem commita recebe o sinal minutos depois, no CI, em vez de no editor. |
| **Ação necessária** | **Nenhuma — decisão consciente de não adotar pre-commit.** Motivos: (1) exigiria nova dev-dependency (`husky`) **e** script `prepare`, que roda em **todo** `npm ci`, inclusive dentro da CI — ou seja, muda o comportamento de instalação do projeto inteiro para obter um único ganho local; (2) o ganho sobre um gate de CI já existente é marginal: o mesmo `npm run lint` roda nos dois lados; (3) `AGENTS.md` §6 exige pedido explícito antes de alterar configs do projeto. **Quando reavaliar:** se o ciclo de feedback local virar atrito real, ou se o gate de CI não for marcado como *required* nas settings de branch protection (caso em que o CI não bloqueia o merge). A implementação, se um dia, seria `prepare` + `lint-staged`, sem hook global. |

### Notas relacionadas

- **`test-base.yml` está órfão:** nenhum workflow o chama (as únicas menções em `pr-coverage.yml` são comentários). Consequência: os serviços PostgreSQL/Redis, o `setup-db`, o `build-app` e o k6 nunca rodam na CI — e `npx jest --coverage` usa o config principal, que **pula as 6 suítes `*.db.test.js`**. As 73 asserções de banco real rodam só localmente (`npm run test:db:container`). **Em validação pelo responsável** — não decidido aqui.
- **Correção factual pendente no item M:** o campo "Impacto" do item M cita `ci.yml`, `load-tests.yml` e `security-tests.yml` como workflows que "continuam com a chamada a `test-base.yml`". Esses três **nunca existiram** no repositório (`git log --all -- .github/workflows/` não retorna nenhum commit para eles); o único workflow reutilizável existente é `test-base.yml`. O item M precisa ser revisto.
- **Escopo do `knip.json` e do `eslint.config.js` — RESOLVIDO (justificativa corrigida):**

  **Origem.** O commit `d09a978` ("ATT - UI and Front") é um dump em massa de skills de agente: **1353 arquivos, 179.361 linhas**, criando `.agents/skills/` (434 skills, 428 no `skills-lock.json`) e `.opencode/skills/` (7 skills, **apenas 1** no lock). `.agents/**` **já estava** no ignore do ESLint e do knip — alguém já tinha decidido, naquele dump, que conteúdo de skill vendorizado não deve ser lintado. O `.opencode/skills/**` foi esquecido na mesma varredura.

  **Correção.** Uma versão anterior desta nota dizia que os 7 "unused files" do knip "seriam regenerados por um update de skill". Isso é verdade **apenas para 1 dos 7** (`ui-ux-pro-max`, o único com `computedHash` no lock); os outros 6 não são rastreados e um update pelo lock não os restauraria. A justificativa correta é: **mesma classe de conteúdo de `.agents/**` (precedente deliberado)**, mesma origem (dump de terceiros), e **nenhum dos 7 scripts é executado pelo projeto** (sem referência em `package.json`, `.github/` ou `scripts/`).

  **Estado.** Ambos escopam `.opencode/skills/**`; os três gates (`npm run lint`, `npm run lint:workflows`, `npm run knip`) saem `0`.

  **Duas armadilhas adicionais fechadas.** (a) `markdown/no-missing-label-refs` era falso positivo para task-list GFM — `- [ ]` e `- [x]` são lidos como link de referência com rótulo vazio; comprovado com um arquivo de 6 linhas que produzia 3 erros. A regra **não tem option para contorná-la** (só aceita `allowLabels`), então foi **desligada no projeto**; `markdown/fenced-code-language` e `markdown/no-multiple-h1` foram **mantidas** (não são falsos positivos). *Concessão aceita:* perde-se a detecção de referência de link quebrada em docs — hoje nenhum `.md` fora de `.opencode/` usa esse recurso. (b) O override JSONC era por arquivo (`.opencode/oh-my-opencode-slim.json`); como o contrato do oh-my-opencode-slim é "`.json` aceita comentários" para **tudo** em `.opencode/`, um `.opencode/*.json` novo com `//` falhava no parse — reproduzido. O override foi generalizado para `.opencode/**/*.json` → `json/jsonc`, e verificado com um arquivo novo tanto para parse (passa) quanto para detecção de erro real (`json/no-duplicate-keys` pega).