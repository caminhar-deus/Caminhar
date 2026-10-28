# ADR-0025: Reset completo do banco via migrations idempotentes e nomenclatura de publicação documentada

- **Status:** Aceito
- **Data:** 2026-10-27
- **Decisores:** Dono do projeto (aprovação via sessão)
- **Relacionados:** `scripts/reset-db.js`, `scripts/migrate.js`, `scripts/schemas/*.json`, `lib/domain/shared-pagination.js`, `lib/crud/crud.js`, `scripts/validate-schema.js`, `docs/PROJECT_data.md` §12.1, `tests/unit/scripts/schema-sources.test.js`

## Contexto

Uma análise do schema do banco (27/10/2026, `information_schema` conferido contra o código) revelou que as fontes de verdade do schema driftaram entre si:

1. **`db:reset` destrói colunas e não as restaura.** O script recriava `posts`/`videos`/`musicas` a partir dos schemas JSON (`scripts/schemas/`), que não declaram `position` (adicionada pelas migrations 007/008/009). O `db:init` subsequente (`init-server.js` → `initializeAuth`) não roda migrations, e `_migrations` continua marcando 007–009 como aplicadas — `npm run migrate` não reaplica. Resultado: após um reset, o `ORDER BY position` default do `paginate()` quebraria toda listagem de posts e vídeos. Além disso, o `DROP TABLE ... CASCADE` destrói as FKs de `post_categories`/`post_tags` (que referenciam `posts`), e nenhuma migration as recria.
2. **A coluna de publicação tem nomes divergentes entre tabelas:** `published` (posts, products, dicas) vs `publicado` (musicas, videos) — divergência histórica da criação separada das tabelas, consistente dentro de cada tabela em todas as camadas (JSON, banco, domínio, API, UI). O `paginate()` tinha `publishedField` com default `'publicado'`, propenso a erro SQL silencioso (42703) em chamadores futuros.
3. **Bug funcional colateral:** `PUBLIC_SELECT_FIELDS.videos` omitia `thumbnail` — a capa personalizada cadastrada no painel (migration 017, campo no `AdminVideos`) nunca chegava ao site público (`VideoCard`/`LazyIframe` caíam na capa genérica do YouTube).
4. **`validate-schema.js` desatualizado:** `EXPECTED_SCHEMA` não conhecia `position`, `thumbnail`, nem as tabelas `products`, `dicas`, `categories`, `tags`, `post_categories`, `post_tags`, `roles`, `refresh_tokens`.

## Decisão

1. **`db:reset` vira reset completo e coerente** (`scripts/reset-db.js`): dropa as tabelas de conteúdo **e as auxiliares** (junctions primeiro), limpa `_migrations` por inteiro e reaplica TODAS as migrations — todas são idempotentes (`IF NOT EXISTS`/`ON CONFLICT`, conferido arquivo a arquivo em 27/10/2026). Não dropa `products` (sem schema JSON; dados preservados), `users`, `settings`, `images`, `roles`, `activity_logs` nem `refresh_tokens`.
2. **Schemas JSON alinhados ao banco:** `position INTEGER DEFAULT 9999` declarada em `posts.json`, `musicas.json` e `videos.json`.
3. **Nomenclatura `published`/`publicado` é MANTIDA** (decisão do dono): renomear colunas exigiria migration + ripple em ~10 arquivos sem ganho funcional. Em vez disso: `publishedField` tornou-se **obrigatório** no `paginate()` quando `publishedOnly=true` (erro explícito em vez de SQL quebrado); os chamadores (`posts.js`, `musicas.js`, `videos.js`) passam o campo explícito; o mapa de nomenclatura está documentado em `docs/PROJECT_data.md` §12.1.
4. **`PUBLIC_SELECT_FIELDS.videos` inclui `thumbnail`** e a entrada morta de `dicas` foi removida (a listagem de dicas tem SQL próprio).
5. **`EXPECTED_SCHEMA` fiel ao banco real** (14 tabelas, incluindo `position`, `thumbnail`, `refresh_tokens`).
6. **Guarda automatizada:** `tests/unit/scripts/schema-sources.test.js` cruza as quatro fontes de schema (JSONs × `tableSchemas` × `PUBLIC_SELECT_FIELDS` × `EXPECTED_SCHEMA`) e falha em qualquer drift futuro; exceção documentada: `views` (posts) existe no banco mas é excluída de `tableSchemas` de propósito (incrementada por query dedicada, nunca via payload CRUD).

## Alternativas consideradas

- **Reset mínimo (só remover de `_migrations` as migrations das tabelas recriadas):** descartada — não restaurava as FKs das junctions destruídas pelo `DROP CASCADE`, deixando a integridade referencial frágil.
- **Não mexer no `db:reset` (só alinhar os JSONs):** descartada — o risco de perda de `position`/FKs/índices continuaria latente a cada reset.
- **Unificar `publicado` → `published` agora:** descartada nesta etapa — custo de migration + ripple alto para ganho estético; registrada como evolução futura (nunca mudar uma fonte isoladamente).

## Consequências

- `db:reset` passou a depender da idempotência de TODAS as migrations — nova migration deve manter o padrão `IF NOT EXISTS`/`ON CONFLICT` (o teste de consistência e o `migrate:status` ajudam a detectar desvios).
- `paginate()` sem `publishedField` + `publishedOnly=true` agora lança erro explícito (falha em teste, não em produção).
- A capa personalizada de vídeos passa a aparecer no site público.
- Novas colunas estruturais devem ser refletidas nos schemas JSON **e** no `EXPECTED_SCHEMA` — o teste de fontes cobra a paridade.
