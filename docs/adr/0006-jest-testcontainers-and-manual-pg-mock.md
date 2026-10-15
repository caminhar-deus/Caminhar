# ADR-0006: Estratégia de testes: Jest com Testcontainers e mock manual do `pg`

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../docs/PROJECT_tests.md`](../../docs/PROJECT_tests.md), [`../../docs/PROJECT_mocks.md`](../../docs/PROJECT_mocks.md), [`../../jest.config.js`](../../jest.config.js), [`../../jest.config.db.js`](../../jest.config.db.js), [ADR-0007](0007-e2e-without-pull-request-trigger.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

[`jest.config.js`](../../jest.config.js) e [`jest.config.db.js`](../../jest.config.db.js)
montam duas frentes — unitários com `@testing-library/react` e
`node-mocks-http`, e integração com PostgreSQL real via Testcontainers;
[`tests/global-setup.db.js`](../../tests/global-setup.db.js) sobe o container
**sem** `.withReuse(true)` e publica `TEST_DATABASE_URL`. Nos unitários,
[`__mocks__/pg.js`](../../__mocks__/pg.js) é um mock manual compartilhado, com
`mockQuery` singleton, `Pool` como função e helpers `restorePoolImplementation()`,
`simulateQueryError()` e `simulateConnectionError()`. O mock existe em camadas
distintas e complementares (ver [`docs/PROJECT_mocks.md`](../../docs/PROJECT_mocks.md));
ele centraliza a simulação do Pool em vez de repetir `jest.mock` em cada arquivo.
O rationale da estratégia está hoje espalhado por
[`docs/PROJECT_tests.md`](../../docs/PROJECT_tests.md) e
[`docs/UPGRADE_tests.md`](../../docs/UPGRADE_tests.md), que tem mais de 12 mil
linhas — este ADR resume o porquê em um lugar.

Não há registro documentado da motivação original além dos fatos acima; este
ADR registra a decisão como está em vigor.

## Decisão

Três camadas de teste — unitários com Jest e `@testing-library/react` usando
mock manual do `pg`, integração contra PostgreSQL real via Testcontainers, e
E2E com Cypress (ver [ADR-0007](0007-e2e-without-pull-request-trigger.md)).

## Alternativas consideradas

Não há registro documentado da avaliação à época — esta ausência é registrada
explicitamente, em vez de inventar uma lista.

## Consequências

### Positivas

- Os testes de integração exercitam SQL real, então parametrização e schema não
  divergem em silêncio.
- O mock compartilhado remove duplicação.
- O banco descartável elimina a sujeira em desenvolvimento.

### Negativas e riscos

- A suíte depende de Docker, então em ambiente sem daemon os testes de
  integração pulam em vez de falhar — uma suíte verde pode não ter exercitado o
  banco.
- Manter o mock manual do `pg` exige sincronizá-lo com o driver quando a API muda.
- O container é derrubado ao fim de cada execução (`jest.teardown.js` sempre
  chama `.stop()`), então o setup custa um container novo por rodada — a
  reutilização foi descartada por ser no-op nesse arranjo, não por princípio.

## Revisão

Reavaliar se o caminho de "pular quando Docker falta" já tiver skipping
silenciosamente testes relevantes em algum ambiente de CI.
