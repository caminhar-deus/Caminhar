# ADR-0021: Cobertura do handler de erro fatal do pool PostgreSQL em lib/infra/db.js

- **Status:** Aceito
- **Data:** 2026-10-23
- **Relacionados:** ADR-0020, PR/commit (implementação local), `lib/infra/db.js`, `tests/unit/lib/db.test.js`, `jest.config.js`, `docs/PLANO_ACAO_COBERTURA_DB_POOL_ERROR.md`

## Contexto

O handler `.on('error')` registrado em `lib/infra/db.js:134-148` é o mecanismo de resiliência que evita um `unhandled 'error' event` e derruba o processo em caso de falha fatal do pool PostgreSQL. 

Esse handler estava sem cobertura por nenhum teste. A causa raiz era o mock manual compartilhado `__mocks__/pg.js` que define `on: jest.fn()` — um espião vazio que registra a chamada mas descarta o callback, impedindo o disparo do evento em ambiente de teste. A cobertura medida mostrava `lib/infra/db.js` com 78.71% de linhas e `136-147` entre as não cobertas. 

Além disso, `lib/infra/` não possuía threshold próprio em `jest.config.js` (apenas `lib/domain/` e `pages/api/admin/`), o que tornava essa lacuna silenciosa perante o gate de cobertura.

## Decisão

Adotar a recomendação "A + E":

1. **Cobertura via teste (Opção A):** capturar o callback registrado via `pool.on('error', ...)` no próprio teste de `tests/unit/lib/db.test.js`, invocá-lo manualmente e asserir: log em `logger.error` com `err.message`, chamada a `pool.end()` mesmo que rejeite (sem propagar exceção), zeramento de `pool = null` e log em `logger.info` **apenas** quando `pool === newPool`; caso o pool já tenha sido substituído, não zera nem loga em `info` (regra de corrida).
2. **Endurecimento do gate (Opção E):** adicionar threshold de cobertura para o diretório `lib/infra/` em `jest.config.js`.

## Alternativas consideradas

- **Opção B:** tornar `__mocks__/pg.js` um `EventEmitter` real. Descartada por envolver infra compartilhada de mock e maior risco de efeito colateral em toda a suíte.
- **Opção C:** emitir `'error'` via `EventEmitter` real substituindo `Pool` por implementação custom. Descartada por maior complexidade de montagem sem ganho claro sobre A.
- **Opção D:** não testar, apenas documentar risco aceito. Descartada por manter a linha mais crítica de resiliência sem prova e sem mecanismo para prevenir regressão futura.

## Consequências

### Positivas
- O handler de erro fatal passa a ter prova automatizada (incluindo tolerância a falha de `end()` e regra de corrida).
- `lib/infra/` agora tem threshold próprio, prevenindo regressão silenciosa dessa área.
- Cobertura de `lib/infra/db.js` aumenta para 81.43% de statements/lines, com o trecho 136-147 coberto.

### Negativas e riscos
- Threshold para `lib/infra/` foi calibrado com folga (`branches: 65, functions: 80, lines: 75, statements: 75`) devido à baixa cobertura atual de `logger.js`, `redis.js` e `storage.js`; será necessário subir aos poucos conforme novas coberturas forem adicionadas.
- O teste captura o callback manualmente (não simula emissão real do driver `pg`), provando o *handler* e não o comportamento do *driver* — aceitável dado o objetivo de cobertura e o menor risco.

## Revisão
Reavaliar os thresholds de `lib/infra/` quando `db.js`, `logger.js`, `redis.js` e `storage.js` atingirem coberturas mais homogêneas, com o objetivo de aumentar os valores sem reprovar o gate global.
