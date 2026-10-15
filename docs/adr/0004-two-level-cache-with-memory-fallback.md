# ADR-0004: Cache em dois níveis (memória + Redis) com fallback em memória e single-flight

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md), [`../../lib/cache/cache.js`](../../lib/cache/cache.js), [`../../lib/infra/redis.js`](../../lib/infra/redis.js)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

[`lib/cache/cache.js`](../../lib/cache/cache.js) implementa Cache-Aside com
`getOrSetCache(key, fetchFunction, ttlSeconds)`: L1 em memória, L2 em Redis, e
por fim busca na origem. Embutido nisso está o single-flight (promessas
`inflightPromises`): chamadas concorrentes pela mesma chave aguardam a mesma
promessa, então só a primeira busca no banco acontece. A expiração é removida
sob demanda, com um timer de segurança quando o Map passa de 5.000 entradas
(rate limit) ou 2.000 (cache da aplicação).
[`lib/infra/redis.js`](../../lib/infra/redis.js) resolve a conexão por
prioridade — `UPSTASH_REDIS_REST_URL` + token, depois `REDIS_URL`, e sem
nenhuma das duas cai para memória; o objetivo de tolerância a falha está
documentado em [`docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md) como
"o app nunca quebra por indisponibilidade do Redis". O rate limit usa Redis
`INCR`+`EXPIRE` com fallback em Map local. Estado atual em
[`docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md).

Não há registro documentado da motivação original além dos fatos acima; este
ADR registra a decisão como está em vigor.

## Decisão

Cache em dois níveis com degradação silenciosa para memória e single-flight por
chave.

## Alternativas consideradas

Não há registro à época de alternativas avaliadas, exceto o requisito explícito
de tolerância a falha do Redis, que está declarado no código. Esta ausência é
registrada explicitamente, em vez de inventar uma lista.

## Consequências

### Positivas

- O Redis não é ponto único de falha.
- Rajadas de tráfego simultâneo não viram rajadas de consultas ao banco.
- O rate limit continua funcionando sem Redis.

### Negativas e riscos

- A degradação para memória é silenciosa, então uma indisponibilidade do Redis
  aparece como queda de taxa de acerto e não como erro — difícil de diagnosticar
  em produção.
- Caches em memória não são compartilhados entre instâncias.
- Eviction por demanda com teto de tamanho é aproximação, não LRU.

## Revisão

Reavaliar se a queda silenciosa de taxa de acerto causar diagnóstico difícil em
produção, ou se houver múltiplas instâncias em que a memória deixe de servir.
