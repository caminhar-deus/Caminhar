# ADR-0003: PostgreSQL com `pg` Pool nativo e SQL parametrizado, sem ORM

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md), [`../../lib/infra/db.js`](../../lib/infra/db.js), [`../../lib/crud/crud.js`](../../lib/crud/crud.js), [`../../CHANGELOG.md`](../../CHANGELOG.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

[`lib/infra/db.js`](../../lib/infra/db.js) expõe um `Pool` do pacote `pg` com
inicialização lazy, health check, retry (máx. 2 tentativas), `query`,
`transaction`, e pool de `max: 50` / `min: 5`.
[`lib/crud/crud.js`](../../lib/crud/crud.js) implementa CRUD genérico com SQL
parametrizado, validação de campos permitidos contra `tableSchemas` e
`_validateIdentifier` para impedir injeção em nomes de tabela/coluna. Não há
dependência de ORM no `package.json` (nada de Prisma, TypeORM, Sequelize ou
Knex). O `CHANGELOG.md` 1.4.0 registra "SQL parametrizado em todas as
operações CRUD com validação preventiva contra SQL injection". Estado atual
detalhado em [`docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md).

Não há registro documentado da motivação original além dos fatos acima; este
ADR registra a decisão como está em vigor.

## Decisão

Acesso a dados com o driver `pg` e SQL escrito à mão, sem ORM.

## Alternativas consideradas

Não há registro à época de alternativas avaliadas — esta ausência é registrada
explicitamente aqui, em vez de inventar uma lista. O risco que a escolha mitiga
(SQL injection via identificadores dinâmicos) está endereçado por
`_validateIdentifier` e pelo SQL parametrizado.

## Consequências

### Positivas

- Controle total de índices e consultas.
- Sem camada de tradução entre SQL e objetos.
- Sem migrações geradas por ORM.

### Negativas e riscos

- Cada consulta é escrita e revisada à mão.
- Schemas e campos permitidos são mantidos em `tableSchemas` dentro do próprio
  código e podem divergir do banco.
- Uma futura sugestão de "adicionar um ORM" deve partir deste ADR.

## Revisão

Reavaliar se o número de consultas cresce a ponto de justificar camada de
abstração, ou se o schema passar a mudar com frequência incompatível com
manutenção manual.
