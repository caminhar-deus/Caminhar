# Pendências — Scripts e Testes

**Escopo:** itens levantados durante os ajustes de scripts/testes e **não** implementados, por estarem fora do escopo aprovado.

**Já implementados (para contraste):** chave via `CYPRESS_RECORD_KEY`, hook `precypress:run`, cobertura de banco isolada em `coverage-db` e respectivo ignore no ESLint, thresholds por diretório, `--bail` em `test:ci`, `--testPathPatterns` em `test:db:unit`, propagação de exit code nos scripts `:log`, `set -o pipefail` no comando de cobertura de `pr-coverage.yml`, upload do artefato `coverage-output` com `always()` em `test-base.yml` e movimentação de `pr-coverage.yml` para `.github/workflows/`, lint dos workflows com actionlint no job `coverage-report`.

---

## E — Workflows de teste não são executados pelo GitHub Actions

| | |
|---|---|
| **Estado atual** | **Resolvido.** Existem três workflows em `.github/workflows/`: `test-base.yml` (reutilizável, `on: workflow_call`), `load-tests.yml` e `pr-coverage.yml`. `load-tests.yml` é o **primeiro consumidor** de `test-base.yml` (`uses: ./.github/workflows/test-base.yml`, linha 67), então o workflow reutilizável deixou de ser inerte. O histórico deste item descrevia um estado anterior do repositório — `ci.yml`, `load-tests.yml` e `security-tests.yml` na raiz, fora do diretório lido pelo GitHub Actions. **Essa descrição não corresponde mais ao repositório** e é mantida aqui só como registro. |
| **Impacto** | Nenhum: a carga agora é executada pelo GitHub Actions (`schedule` diário e `workflow_dispatch`). O que ainda é verdade é que a **cobertura não passa por `test-base.yml`** — `pr-coverage.yml` roda o jest em job próprio, sem `setup-db`, o que faz as 6 suítes `*.db.test.js` serem puladas pelo config principal (ver item J). |
| **Ação necessária** | Nenhuma quanto aos gatilhos. Se a cobertura quiser passar pelo `test-base.yml` (`test-type: coverage`, `skip-k6: true`), é uma decisão separada — o caminho já está pronto e parametrizado. |

## H — Rotação da record key do Cypress

| | |
|---|---|
| **Estado atual** | A chave não está mais no manifesto, mas o valor antigo permanece no histórico do Git. |
| **Impacto** | A chave continua válida para envio de gravações ao projeto no Cypress Cloud. |
| **Ação necessária** | Revogar/rotacionar a chave no Cypress Cloud e definir `CYPRESS_RECORD_KEY` no ambiente local e como secret no CI. Ação manual, sem alteração de código. |

## I — `allowCypressEnv` removido no Cypress 16

| | |
|---|---|
| **Estado atual** | **Resolvido.** A opção `allowCypressEnv: false` foi removida de `cypress.config.js` — o Cypress 16.0.0 (projeto em 16.1.1) removeu a opção, e declará-la emitia aviso a cada execução sem efeito. Ficou no lugar um comentário registrando o motivo da remoção. |
| **Impacto** | Nenhum — o aviso recorrente deixou de aparecer. O acesso a `Cypress.env()` no navegador já é bloqueado por padrão. |
| **Ação necessária** | Nenhuma. |

## J — Suíte com banco real não executa localmente

| | |
|---|---|
| **Estado atual** | **Resolvido.** O erro `Cannot read properties of undefined (reading 'split')` vinha de `new PostgreSqlContainer()` sem argumento de imagem: o construtor exige a imagem explícita em `@testcontainers/postgresql`. Com a imagem declarada (`postgres:15`), o container sobe e a suíte roda de verdade — `npx jest --config jest.config.db.js` executa **73 asserções em 6 suítes, todas passando**, e `tests/setup.db.js` faz `jest.unmock('pg')` para o mock automático de `__mocks__/pg.js` não substituir o driver real. `scripts/migrate.js` também passou a usar `pg_advisory_lock` para evitar corrida entre execuções concorrentes. |
| **Impacto** | Nenhum: `coverage-db/` agora reflete execuções reais. O `describe.skip` condicionado a `TEST_DATABASE_URL !== '__docker_unavailable__'` **continua no código** e é a rede de segurança correta — só não é mais acionado em ambiente com Docker. |
| **Ação necessária** | Nenhuma. |

## K — Teardown global versus container reutilizável

| | |
|---|---|
| **Estado atual** | **Resolvido — decisão: sem reutilização.** A contradição existia de verdade: `tests/global-setup.db.js` usava `.withReuse(true)` enquanto `jest.teardown.js` sempre chama `global.__TEST_DB_CONTAINER__.stop()`. O teardown vencia sempre, então o flag era **no-op** — e pior, criava a impressão falsa de que o estado do banco persistia entre execuções. |
| **Impacto** | Eliminada a falsa impressão de persistência entre execuções. Container novo a cada run custa alguns segundos de startup e garante schema limpo, com as migrations rodando em seguida. Sem isso, um container reutilizado poderia carregar schema ou dados de uma execução anterior e falhar de forma confusa. |
| **Ação necessária** | Nenhuma. O teardown continua parando o container — é ele quem garante o estado limpo. |

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
| **Impacto** | Erro fantasma no painel de problemas do editor em todo workflow que chame outro por caminho local — hoje `load-tests.yml`, que chama `./.github/workflows/test-base.yml`. Referências locais de *actions* (`.github/actions/*`) não passam por esse caminho e não são sinalizadas. |
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

## P — `musicas` e `videos` não têm rota de detalhe (produto, não pipeline)

| | |
|---|---|
| **Estado atual** | `pages/` só tem rota de conteúdo dinâmico em `blog/index.js` e `blog/[slug].js`. Não existe página de índice nem de detalhe para `/musicas/...` ou `/videos/...` (há apenas as rotas de API `pages/api/musicas.js` e `pages/api/videos.js`). Além disso, as tabelas `musicas` e `videos` **não têm coluna `slug`** (colunas: `id, titulo, artista, url_spotify, descricao, publicado, created_at, updated_at, position` em `musicas`; `id, titulo, url_youtube, descricao, thumbnail, publicado, created_at, updated_at, position` em `videos`), e a coluna de publicação é `publicado`, não `published`. |
| **Impacto** | `next-sitemap.config.js` gerava `loc: /musicas/<slug>` e `/videos/<slug>` a partir de uma query que falhava duas vezes por vez (coluna `slug` inexistente + `published` em vez de `publicado`) e, mesmo corrigida, apontaria para rotas inexistentes — URLs 404 publicadas no sitemap. As queries foram removidas e os anúncios de `sitemap-musicas.xml`/`sitemap-videos.xml` no `robots.txt` também (nenhum XML desses chega a existir); o sitemap hoje só publica `/blog/[slug]`. |
| **Ação necessária** | **Trabalho de produto**, fora do escopo de pipeline: decidir se existirão páginas de índice e de detalhe para musicas/videos, com qual identificador de URL (`slug` gerado, `id` etc.) — e só então religar a geração de entradas no `next-sitemap.config.js` (e reanunciar os XMLs no `robots.txt`). Não inventar slug a partir de `titulo` aqui: isso só adiaria o 404. |

## Q — `DATABASE_SSL` sem valor definido para produção (projeto ainda em desenvolvimento)

| | |
|---|---|
| **Estado atual** | O Caminhar **não está em produção**; o ambiente em uso é de desenvolvimento, em fase de ajustes. Não existe banco de produção definido, e nenhum provedor (Supabase, Neon, RDS, Railway, Render, VPS) é citado no repositório — as `DATABASE_URL` presentes são todas `localhost`/`caminhar_test`. O SSL do banco é decidido por `DATABASE_SSL` (`lib/infra/db.js`, `resolveSslConfig`), **desacoplado de `NODE_ENV`** desde a correção do run `37303670048`, em que a CI subia com `NODE_ENV=production` e exigia SSL de um Postgres de serviço que tem `ssl = off` — fazendo toda consulta falhar. |
| **Impacto** | Nenhum hoje: em desenvolvimento `DATABASE_SSL` fica ausente, o driver não recebe `ssl` e a conexão local segue sem SSL, que é o esperado. O que fica **preverido** é a causa raiz deixar de se repetir: `check-env` com `CHECK_ENV_STRICT=true` aborta a CI imediatamente, e `/api/ip-diagnostico` sinaliza topologia divergente — então uma configuração errada em produção falha cedo e visível, em vez de derrubar endpoints silenciosamente. |
| **Ação necessária** | **Na criação do deploy de produção, não antes.** Verificar com `psql "$DATABASE_URL" -c "SHOW ssl;"` e então definir o modo em **um único lugar**: se responder `on`, `DATABASE_SSL="true"`; se `off`, não forçar SSL e garantir que o banco esteja restrito a rede privada. Ver a precedência entre `DATABASE_SSL` e `?sslmode=` na URL em `.env.example` — o `sslmode` **vence** e tornaria `DATABASE_SSL` um no-op silencioso. |

### Notas relacionadas

- **`test-base.yml` está órfão:** nenhum workflow o chama (as únicas menções em `pr-coverage.yml` são comentários). Consequência: os serviços PostgreSQL/Redis, o `setup-db`, o `build-app` e o k6 nunca rodam na CI — e `npx jest --coverage` usa o config principal, que **pula as 6 suítes `*.db.test.js`**. As 73 asserções de banco real rodam só localmente (`npm run test:db:container`). **Em validação pelo responsável** — não decidido aqui.
- **SSL do Postgres em produção e `TRUST_PROXY` são decisões independentes**, ambas adiadas para o momento em que houver deploy: Q (este arquivo) trata do transporte até o banco; `docs/DEPLOY_proxy_e_IP.md` §0 trata de como o app descobre o IP do cliente HTTP. O `nginx` participa só do segundo caso, e nunca do transporte do PostgreSQL.
- **Correção factual aplicada aos itens E e M — RESOLVIDO:** a versão anterior do item E afirmava que `ci.yml`, `load-tests.yml` e `security-tests.yml` estariam na raiz do repositório, e o item M os citava como "workflows que continuam com a chamada a `test-base.yml`". **`ci.yml` e `security-tests.yml` nunca existiram** — `git log --all -- .github/workflows/` não retorna nenhum commit para eles. O `load-tests.yml` existe, mas dentro de `.github/workflows/`, onde o GitHub Actions o lê normalmente. Ambos os itens foram corrigidos: o E passou a descrever o estado real (resolvido) e o M cita apenas o `load-tests.yml`.
- **Escopo do `knip.json` e do `eslint.config.js` — RESOLVIDO (justificativa corrigida):**

  **Origem.** O commit `d09a978` ("ATT - UI and Front") é um dump em massa de skills de agente: **1353 arquivos, 179.361 linhas**, criando `.agents/skills/` (434 skills, 428 no `skills-lock.json`) e `.opencode/skills/` (7 skills, **apenas 1** no lock). `.agents/**` **já estava** no ignore do ESLint e do knip — alguém já tinha decidido, naquele dump, que conteúdo de skill vendorizado não deve ser lintado. O `.opencode/skills/**` foi esquecido na mesma varredura.

  **Correção.** Uma versão anterior desta nota dizia que os 7 "unused files" do knip "seriam regenerados por um update de skill". Isso é verdade **apenas para 1 dos 7** (`ui-ux-pro-max`, o único com `computedHash` no lock); os outros 6 não são rastreados e um update pelo lock não os restauraria. A justificativa correta é: **mesma classe de conteúdo de `.agents/**` (precedente deliberado)**, mesma origem (dump de terceiros), e **nenhum dos 7 scripts é executado pelo projeto** (sem referência em `package.json`, `.github/` ou `scripts/`).

  **Estado.** Ambos escopam `.opencode/skills/**`; os três gates (`npm run lint`, `npm run lint:workflows`, `npm run knip`) saem `0`.

  **Duas armadilhas adicionais fechadas.** (a) `markdown/no-missing-label-refs` era falso positivo para task-list GFM — `- [ ]` e `- [x]` são lidos como link de referência com rótulo vazio; comprovado com um arquivo de 6 linhas que produzia 3 erros. A regra **não tem option para contorná-la** (só aceita `allowLabels`), então foi **desligada no projeto**; `markdown/fenced-code-language` e `markdown/no-multiple-h1` foram **mantidas** (não são falsos positivos). *Concessão aceita:* perde-se a detecção de referência de link quebrada em docs — hoje nenhum `.md` fora de `.opencode/` usa esse recurso. (b) O override JSONC era por arquivo (`.opencode/oh-my-opencode-slim.json`); como o contrato do oh-my-opencode-slim é "`.json` aceita comentários" para **tudo** em `.opencode/`, um `.opencode/*.json` novo com `//` falhava no parse — reproduzido. O override foi generalizado para `.opencode/**/*.json` → `json/jsonc`, e verificado com um arquivo novo tanto para parse (passa) quanto para detecção de erro real (`json/no-duplicate-keys` pega).