# ADR-0019: Os steps de comentário de PR ficam guardados dentro do job `coverage-report`

- **Status:** Aceito
- **Data:** 2026-10-22
- **Decisores:** dono do projeto e agente orchestrator
- **Relacionados:** [`../../.github/workflows/test-coverage.yml`](../../.github/workflows/test-coverage.yml), [`../../tests/unit/github-workflows/test-coverage-comment.test.js`](../../tests/unit/github-workflows/test-coverage-comment.test.js), [ADR-0007](0007-e2e-without-pull-request-trigger.md)

## Contexto

O job `coverage-report` do workflow "Lint & Test Coverage Gate" declara dois steps
que só fazem sentido em pull request:

- `Remove Old Coverage Comments` (`.github/workflows/test-coverage.yml:242`), com
  guarda `if: github.event_name == 'pull_request'` (`:243`);
- `Post PR Comment on Failure` (`:272`), com guarda
  `github.event_name == 'pull_request' && needs.coverage.result == 'failure'`
  (`:273`).

As guardas existem porque `context.issue.number` não existe em `push` nem em
`workflow_dispatch`: sem elas o `github-script` lançaria exceção e derrubaria o
job na `main`. Isso está documentado no próprio YAML (`:238-241`, `:269-271`).

Em 22/10/2026 o run `39851535117` (evento `push`, branch `main`, sha `abd5c4b`,
`pull_requests: []`) mostrou, no job `120080627126`, os dois steps com conclusão
`skipped`. A dúvida levantada foi: por que eles aparecem se não há PR, e se
poderiam executar algo. O job levou ~56 s (checkout, setup do Node e download de
artefatos), nenhum deles gasto nesses dois steps.

O GitHub Actions sempre renderiza todos os steps declarados no job; o `if` é
avaliado e, quando falso, o step recebe o selo "skipped", sem log e sem duração.
O que se vê na interface é a **definição** do step, não uma execução.

Alcance real, caso executassem (somente em run de `pull_request`):

- `Remove Old Coverage Comments`: com o `GITHUB_TOKEN` do job, lista até 100
  comentários do PR (`per_page: 100`) e apaga apenas os que tenham
  `user.type === 'Bot'` **e** o marcador `### ❌ Cobertura de Testes Abaixo do
  Mínimo Exigido` (`:257-267`). Não apaga comentário de humano;
- `Post PR Comment on Failure`: lê `coverage-output.txt` do artefato e publica um
  comentário no PR, truncado em `MAX_CHARS = 60000` (`:299-306`) pelo limite de
  65536 caracteres da API.

O job declara `permissions: contents: read` + `pull-requests: write`
(`:206-208`): o token efêmero não permite push, merge, alteração de releases ou
de settings. Em PR vindo de fork, o token de `pull_request` é read-only e o step
falharia em vez de escrever.

## Decisão

Manter como está: as guardas continuam **no nível do step**, dentro do job
`coverage-report`. Não se extrai um job separado para os comentários e não se
fatiam as permissões neste momento.

O comportamento já está coberto por teste
(`tests/unit/github-workflows/test-coverage-comment.test.js:291-305`): remover
qualquer uma das duas guardas quebra a suíte, então a proteção não depende de
memória humana.

Para auditoria de um run de `push` — se a dúvida voltar — bastam três checagens:

1. o step aparece com conclusão `skipped` e sem output;
2. `GET /repos/{owner}/{repo}/actions/runs/{id}` traz `pull_requests: []`;
3. a lista de comentários do PR não ganhou nada, porque não há PR nesse evento.

## Alternativas consideradas

- **P1 — Extrair os dois steps para um job próprio (`pr-comments`) com `if` no
  nível do job:** em `push` o job inteiro ficaria `skipped` em vez de avaliar
  step por step. Descartada: o ganho é só cosmético (o job continuaria listado
  como skipped), o custo é um job a mais com novo download de artefato
  (`coverage-output.txt`) e a lista de checks obrigatórios da branch protection
  muda.
- **P2 — Fatiar permissões (job de comentário com `pull-requests: write`, o
  `coverage-report` só com `contents: read`):** descartada agora porque hoje o
  `pull-requests: write` está no único job que de fato comenta; separar adiciona
  job e complexidade de artefato sem reduzir risco observado. Reavaliar se o
  escopo do token virar achado de auditoria.
- **P3 — Remover as guardas e deixar o `github-script` falhar em `push`:**
  descartada: derrubaria o job na `main` em toda execução.

## Consequências

### Positivas

- Zero efeito colateral em `push` e em `workflow_dispatch`: os steps ficam
  `skipped`, sem chamada à API do GitHub.
- A decisão de custo de `:3-13` (commitar na `main` roda o gate de novo depois do
  merge) continua intacta; nenhum job novo consome runner.
- A proteção é executável: o teste falha se a guarda sumir, então ninguém a
  remove num "cleanup".

### Negativas e riscos

- Os dois steps continuam aparecendo como `skipped` em todo run de `push`, o que
  pode ser lido como "algo rodou" por quem abre o log pela primeira vez. Este ADR
  é a resposta canônica para essa leitura.
- Se o projeto migrar para fluxo só com PR (ou adotar merge queue), a avaliação
  muda: o job `coverage-report` passaria a executar os dois steps em toda
  abertura/atualização de PR.

## Revisão

Reavaliar se a `main` passar a ser protegida com PR obrigatório, se o projeto
adotar merge queue, ou se o token do job precisar de escopo menor por exigência
de auditoria — cenários em que P1 e P2 passam a ter custo/benefício diferente.
