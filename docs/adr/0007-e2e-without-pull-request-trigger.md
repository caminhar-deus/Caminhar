# ADR-0007: E2E em push para `main` e `workflow_dispatch`, sem gatilho em `pull_request`

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml), [`../../scripts/e2e-isolated.js`](../../scripts/e2e-isolated.js), [`../../docs/PROJECT_cypress.md`](../../docs/PROJECT_cypress.md), [`../../docs/PENDENCIAS_scripts_testes.md`](../../docs/PENDENCIAS_scripts_testes.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

[`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml) dispara em
`push` para `main` e por `workflow_dispatch`; **não há `pull_request`**. O
comentário do próprio workflow registra a razão: *"decisão deliberada de
começar coletando dados de flakiness REAL em produção (runs na `main`, com o
estado efetivo do repositório) antes de cobrar o preço do E2E em toda abertura
de PR. `workflow_dispatch` permite rodar sob demanda (bisect, revalidação de um
SHA antigo)"*. A suíte é [`scripts/e2e-isolated.js`](../../scripts/e2e-isolated.js):
sobe um PostgreSQL descartável via Testcontainers, aplica migrações, semeia
posts, serve a aplicação com `next start` e roda o Cypress propagando o exit
code — cerca de 36 s reaproveitando `.next` ou cerca de 44 s compilando do
zero, sem tocar o banco de desenvolvimento. São 25 cenários em 5 specs (`blog`,
`home`, `image_zoom`, `navigation`, `post`), com vídeos e screenshots subidos
como artefato mesmo em falha (`if: always()`). O [`README.md`](../../README.md)
e [`docs/PROJECT_cypress.md`](../../docs/PROJECT_cypress.md) registram o
mesmo; ver também a decisão de banco descartável em
[`docs/PENDENCIAS_scripts_testes.md`](../../docs/PENDENCIAS_scripts_testes.md).

Este é o único ADR **retroativo** cuja motivação original está documentada — a citação acima
é literal do workflow.

## Decisão

O workflow de E2E roda em push para `main` e por `workflow_dispatch`,
deliberadamente **sem** `pull_request`. O gate de `pull_request` fica a cargo do
workflow de lint/cobertura.

## Alternativas consideradas

- **Rodar em todo `pull_request`:** adiado, para coletar dados reais de
  flakiness antes de cobrir toda abertura de PR; o motivo está registrado no
  workflow.
- **Limpeza dos artefatos em toda execução, em vez de só em local:** essa era a
  configuração original e foi corrigida depois que o primeiro run de E2E da CI
  (`37770170647`, sha `bad320f`, 08/10/2026) terminou **verde sem nenhum
  artefato** — `total_count: 0` — porque a limpeza incondicional apagava a única
  pista de reprovação. Hoje a limpeza só roda localmente, na CI os artefatos
  sobem como evidência. Ver
  [`docs/PENDENCIAS_scripts_testes.md`](../../docs/PENDENCIAS_scripts_testes.md).
- **`cancel-in-progress` no grupo de concorrência:** descartado para não matar um
  E2E no meio — resultado parcial é pior que esperar. Ver o comentário de
  `concurrency` em
  [`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml).

## Consequências

### Positivas

- PRs não ficam bloqueados por testes instáveis enquanto a flakiness ainda não
  está medida.
- Os runs opcionalmente cobrem um bisect ou um SHA antigo sob demanda.
- O banco descartável impede que sujeira de teste contamine o desenvolvimento.

### Negativas e riscos

- Regressão no E2E só é detectada depois do merge na `main`.
- Se a flakiness real for baixa, o custo do adiamento foi desnecessário.

## Revisão

Reavaliar a inclusão de `pull_request` quando houver dados suficientes de
flakiness.
