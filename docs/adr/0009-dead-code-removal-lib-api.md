# ADR-0009: Remover o código morto de `lib/api/` e extrair os schemas de query

- **Status:** Aceito
- **Data:** 2026-10-15
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../lib/api/`](../../lib/api), [`../../lib/domain/query-schemas.js`](../../lib/domain/query-schemas.js), [`../../knip.json`](../../knip.json), [`../../docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md), [`../../docs/UPGRADE_lib.md`](../../docs/UPGRADE_lib.md), [`../../docs/UPGRADE_tests.md`](../../docs/UPGRADE_tests.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

A rotina de código morto de [`lib/api/`](../../lib/api) não era inofensiva: ela **sugeria um caminho de
autenticação falso**. O módulo [`lib/api/middleware.js`](../../lib/api) exportava um segundo
`withAuth`, com assinatura `withAuth({ roles })`, enquanto o `withAuth` que realmente protege as 16
rotas de produção é `withAuth(handler)`, de [`lib/auth/auth.js`](../../lib/auth/auth.js). Os dois
exportavam o mesmo nome com contratos incompatíveis: importar o errado produz `TypeError` em runtime,
não um bypass silencioso — risco de disponibilidade, não de vazamento.

A auditoria de 15/10/2026 confirmou, arquivo por arquivo, que **cinco** módulos eram código morto de
produção, não dois:

| Arquivo | Linhas | Único importador |
|---|---|---|
| `lib/api/index.js` | 21 | um teste |
| `lib/api/middleware.js` | 485 | `index.js` (ele mesmo morto) |
| `lib/api/response.js` | 470 | `index.js`, `middleware.js`, `validate.js` (mortos) |
| `lib/api/errors.js` | 281 | `index.js` (morto) |
| `lib/api/validate.js` | 329 | `index.js` (morto) |
| | **1.586** | |

A cadeia começava em `lib/api/index.js`, importado **apenas** por
`tests/unit/lib/api/index.test.js`. Um total de 1.422 linhas de teste cobria esse código — cobertura
alta de código que nunca executava em produção.

Três fatores tornavam a remoção silenciosa, e é isso que a torna worthy de registro:

1. **A documentação afirmava o contrário.** `docs/PROJECT_lib.md:162` chamava o `middleware.js` de
   *"Único módulo de middlewares do projeto"* e `:784` mostrava `pages/api/ → lib/api/middleware.js`
   num grafo de dependências inexistente. `docs/UPGRADE_lib.md` afirmava que `response.js` e
   `errors.js` *"formam o padrão de resposta"*. É esse texto que induz alguém a importar o módulo
   errado.
2. **O `knip` não detectava.** `knip.json:6-7` ignora `tests/**`, e import de arquivo ignorado ainda
   conta como uso — a cadeia inteira aparecia como viva. Comprovado empiricamente: um arquivo órfão
   de verdade é reportado, `lib/api/index.js` não. Sem `--include files,exports` a saída é vazia.
3. **Onde os módulos pareciam somar algo, perdiam.** `withRateLimit` (`middleware.js:201`) lê
   `x-forwarded-for` inline; o `helpers.js` endurecido contra spoofing existe porque, como o próprio
   cabeçalho dele registra, *"ler a primeira deixa o cliente escolher a própria identidade, o que zera
   o rate limit"*, e esse bypass já foi incidente medido neste projeto. `withAuth({ roles })` compara
   `decoded.role` contra literal — sem banco, sem granularidade, sem auditoria, e **sem
   `Object.freeze`**, que `permissions.js:8` usa justamente para impedir `roles.push()` em runtime.

O `AGENTS.md` §7 exige ADR para decisão que é cara de reverter, afeta vários módulos e vai gerar a
pergunta *"por que deletamos isso?"*.

## Decisão

Removemos os cinco módulos de `lib/api/` e os seis arquivos de teste que os cobriam, e registramos
que a remoção foi **precedida** de um guard temporário e de uma extração, ambos já revertidos junto.

O procedimento, na ordem executada:

1. **Guard temporário** — `no-restricted-imports` no `eslint.config.js` mais
   `npm run lint:dead-api`, impedindo que a deleção fosse aplicada só no papel.
2. **Extração** — `createPaginationSchema` e `createSearchSchema` saíram de `lib/api/validate.js`
   para o novo `lib/domain/query-schemas.js`, junto com os 4 testes que os cobriam, movidos para
   `tests/unit/lib/domain/query-schemas.test.js`. O arquivo novo é separado de
   `lib/domain/shared-pagination.js` de propósito: aquele monta **SQL**, os schemas validam **input**;
   são camadas diferentes.
3. **Deleção** — `git rm` dos 5 módulos e dos 6 testes, sempre juntos, sob verificação.
4. **Limpeza do fallout** — `generateUUID` e `generateMeta` ficaram órfãos em `lib/api/utils.js`
   (seus únicos consumidores eram `errors.js` e `response.js`, já removidos) e saíram com ela.
5. **Reversão do guard** — os 4 blocos do `eslint.config.js` e o script `lint-dead-api` foram removidos:
   guardar arquivos que não existem é ruído de CI.

A extração do passo 2 foi a única parte do plano que **não** foi mecânica: sem ela, ~40 linhas úteis
morreriam com o arquivo.

## Alternativas consideradas

- **Manter em quarentena.** Era o estado entre os passos 1 e 4. Descartado porque um guard que protege
  código morto custa manutenção permanente — `eslint.config.js` carregava 3 blocos com a mesma mensagem
  longa repetida — e a quarentena não impedia o uso errado, só o registrava.
- **Integrar os módulos em vez de apagar.** Avaliado arquivo por arquivo e **descartado**: onde
  aparentam somar capacidade (`roles`, rate limit, envelope padronizado), a versão viva já é melhor;
  onde seriam exclusivos (`withTimeout`, `withBodyParser`), não há demanda. A escolha seria
  reimplementar o que `adminCrudHandler.js` já faz. Adotar exigiria migrar 24 rotas e reconciliar o
  front por ganho estético.
- **Unificar a paginação de `posts.js` com o schema extraído.** Descartado por **divergência de
  contrato**, não por esforço: o schema faz *clamp* (`num < 1 ? default : Math.min(num, maxLimit)`),
  enquanto `posts.js:40` faz *rejeição* com HTTP 400 — contrato testado em
  `tests/integration/api/posts.test.js:72`. Em borda, `?page=1&page=2` hoje responde 200
  (`parseInt(['1','2']) → 1`) e passaria a 400, porque `z.string()` rejeita array. Preservar o 400
  exigiria re-validar os valores brutos com `parseInt` manual, mantendo o código original e somando
  `safeParse` por cima. Unificar as 4 abordagens de paginação que existem no projeto é decisão
  própria, e não foi tomada aqui.

## Consequências

### Positivas

- Some a armadilha do segundo `withAuth` — o nome agora resolve para uma implementação só.
- Elimina 1.586 linhas de código morto e 1.422 linhas de teste que não exercitavam produção.
- `npm run knip` volta a ser sinal confiável; ele **é** gate do CI
  (`.github/workflows/test-coverage.yml:358`), e a deleção o tinha quebrado.
- `generateUUID` saiu: usava `Math.random()`, com o próprio JSDoc admitindo ser *"fallback quando uuid
  não está disponível"*. Node tem `crypto.randomUUID()` nativo.
- A documentação deixa de afirmar um grafo de dependências que não existe.

### Negativas e riscos

- **Perde-se capacidade não usada, não vazia.** `withTimeout`, `withBodyParser`, `withCors`,
  `withCache` e `withLogger` saíram junto. Recuperar significa reimplementar do zero, não descomentar.
- **A paginação segue duplicada em 4 formatos** no projeto: `posts.js:32-41` e `videos.js:26-29`
  (par `parseInt` idêntico), `musicas.js:14-16` (zod inline) e `products.js`/`dicas.js` via
  `paginate()` de `shared-pagination.js`. Nenhuma unificação foi feita aqui.
- **`shared-pagination.js` não valida entrada.** Recebe `page`/`limit` já válidos; o 400 de
  `posts.js:40` é o que protege hoje.
- **O histórico vive em `UPGRADE_*.md`**, não em ADR: seções descrevem arquivos que não existem mais,
  com correção datada ao lado. Isso é deliberado — são análises de 24/09/2026, não estado.
- Remoção de 1.586 linhas **não é trivial de reverter** no sentido de custo de reconstruct: `git
  revert` restaura o código, mas a duplicação de paginação que ele carregava volta junto.

## Revisão

Reavaliar se: (a) surgir rota que queira timeout de requisição ou limite de body — o `withTimeout` e o
`withBodyParser` removidos resolveriam isso; (b) um cliente passar a pedir `meta`/`requestId` nas
respostas — aí o `response.js` volta a ter demandante real, mas com `crypto.randomUUID()`, não com o
`generateUUID` de `Math.random()`; (c) for decidido unificar as 4 abordagens de paginação, o que é
decisão de contrato e exige tocar `tests/integration/api/posts.test.js:72`.

Se algum dos módulos removidos voltar, este ADR precisa ser **substituído**, não editado: a
justificativa muda de **higiene** (ninguém importava) para **demanda** (alguém precisa), que é uma
decisão diferente com consequências diferentes.