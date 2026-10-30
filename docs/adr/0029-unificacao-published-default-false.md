# ADR-0029: Unificação da nomenclatura de publicação (`published`) e default `false` em todas as tabelas

- **Status:** Aceito
- **Data:** 2026-10-29
- **Decisores:** Dono do projeto (aprovação via sessão)
- **Relacionados:** ADR-0025 (supersede **apenas o item 3** — nomenclatura; os demais itens permanecem vigentes), ADR-0027, `scripts/migrations/020-unify-published-column.js`, `scripts/migrations/012-add-performance-indexes.js`, `scripts/schemas/*.json`, `scripts/validate-schema.js`, `lib/domain/shared-pagination.js`, `lib/crud/crud.js`, `tests/unit/scripts/schema-sources.test.js`, `docs/PROJECT_data.md` §12.1

## Contexto

O banco de conteúdo carregava uma divergência de nomenclatura histórica: `posts`, `dicas` e `products` usam `published`; `musicas` e `videos` usavam `publicado`. O ADR-0025 (27/10/2026) mapeou a divergência, optou por mantê-la na época (era consistente dentro de cada tabela em todas as camadas) e registrou a unificação como "evolução futura", exigindo migration + ripple em domínio/API/UI e mudança em lockstep nas 4 fontes de schema — guardadas pelo teste `tests/unit/scripts/schema-sources.test.js`.

Além do nome, os defaults de nascimento divergiam: `posts`/`musicas`/`videos` nasciam rascunho (`DEFAULT false`), enquanto `products`/`dicas` nasciam publicados (`DEFAULT true`) — comportamento documentado no doc privado (§3.1/§4.5/§8 item 5). Em 29/10/2026 o dono pediu a unificação completa: coluna `published` em todas as tabelas e **default `false`** em todas — nada nasce publicado.

Fatos confirmados na análise (29/10/2026):

- Nenhuma view ou função no banco referenciava `publicado` (`pg_views`/`pg_proc` vazios) — o rename não tem dependências ocultas.
- Rename de coluna preserva dados; nenhum valor é tocado.
- Os índices `idx_musicas_pagination`/`idx_videos_pagination` (migration 012) seguem a coluna renomeada automaticamente no PostgreSQL (definição por OID; nomes neutros) — só o texto SQL da migration 012 precisava ser atualizado para continuar re-rodável após `db:reset` (exigência do próprio ADR-0025).
- Nenhum consumidor frontend lia a chave `publicado` nas respostas públicas de músicas/vídeos (verificado em `components/Features`).
- Não existe fallback `?? true` para dicas/products no domínio/API — o default do banco é quem manda quando o campo é omitido.

## Decisão

Vamos unificar a coluna de publicação como **`published` em todas as tabelas de conteúdo** e fixar **`DEFAULT false`** em todas — Posts, Músicas, Vídeos, Produtos e Dicas nascem rascunho, e o operador publica conscientemente pelo toggle do painel (que passa a abrir desmarcado em todos os formulários, incluindo Produtos e Dicas, que abriam marcados).

Execução:

1. **Migration `020-unify-published-column`** (idempotente, padrão ADR-0025): `RENAME COLUMN publicado TO published` em `musicas` e `videos` com guarda por `information_schema`; `SET DEFAULT false` em `musicas`, `videos`, `dicas` e `products`.
2. **Sweep em lockstep** nas 4 fontes de schema e no código: `scripts/schemas/musicas.json`/`videos.json` (coluna) e `dicas.json` (default), `EXPECTED_SCHEMA` (`scripts/validate-schema.js`), `PUBLIC_SELECT_FIELDS` e `publishedField` (`lib/domain/shared-pagination.js`), allowlists (`lib/crud/crud.js`), domínio (`lib/domain/musicas.js`, `lib/domain/videos.js`), APIs admin (Zod, toggle e queries em `pages/api/admin/musicas.js`, `videos.js`, `stats.js`), componentes (`AdminMusicas.js`, `AdminVideos.js`), seeds e factories/testes. Rótulos de UI ("Publicado", "Nenhum post publicado ainda") permanecem prosa intocada.
3. **Formulários de Produtos e Dicas** com `initialFormData.published: false` (decisão do dono na aprovação do caso).
4. **Migration 012** com o texto SQL dos índices atualizado para `published` (replay pós `db:reset`).
5. Documentação: doc privado (§3.1, §4.5, §4.6, §8 itens 5 e 16), `docs/PROJECT_data.md` §12.1 e §13, CHANGELOG.

## Alternativas consideradas

- **Manter a divergência (status quo do ADR-0025):** descartada pelo dono — a camada de compatibilidade (`publishedField`) continha o risco, mas o nome divergente seguia espalhado por ~24 arquivos e cada tabela nova teria que escolher um lado.
- **Unificar só o nome, mantendo defaults divergentes (`true` em dicas/products):** descartada — o dono pediu explicitamente "todo Default como `false`"; a regra única "nada nasce publicado" é mais simples de explicar e de auditar.
- **Coluna nova + backfill + drop da antiga:** descartada — `RENAME COLUMN` é atômico, preserva dados e não deixa coluna órfã; sem ganho algum sobre o rename.

## Consequências

### Positivas

- Nomenclatura única: coluna `published` nas 5 tabelas de conteúdo, em todas as camadas (banco, JSONs, `EXPECTED_SCHEMA`, `PUBLIC_SELECT_FIELDS`, `tableSchemas`, domínio, API, UI).
- Regra de nascimento única e conservadora: rascunho por padrão em todo tipo de conteúdo; publicação é sempre uma ação explícita do operador.
- A abstração `publishedField` permanece (parâmetro explícito), agora como defesa contra erro de configuração e não como mapa de divergência.
- Guarda `schema-sources.test.js` continua travando a paridade das 4 fontes — qualquer drift futuro falha na suíte.

### Negativas e riscos

- **Deploy exige rodar `npm run migrate` no banco de produção** antes de/ junto com o novo código — código novo com banco velho quebra músicas/vídeos (coluna `published` inexistente), e banco migrado com código velho quebra o contrário. Ordem: migrar e publicar na mesma janela.
- Respostas públicas de músicas/vídeos mudam a chave `publicado`→`published` no JSON — nenhum consumidor interno lia a chave (verificado), mas consumidores externos eventuais (integrações, scrapers de terceiros) seriam afetados.
- Produtos e Dicas deixam de nascer publicados: fluxo de trabalho do operador muda (um passo extra por item novo). Decisão deliberada do dono.
- Mudança estrutural ampla (~35 arquivos) — mitigada pelo guarda de schema e pela suíte completa verde.

## Revisão

Reavaliar se: (a) surgir consumidor externo que dependa da chave `publicado` nas respostas públicas (avaliar camada de compatibilidade); (b) o operador reportar atrito relevante com o nascimento em rascunho de produtos/dicas (revert pontual do default é uma migration trivial); (c) nova tabela de conteúdo for criada (seguir `published` + `DEFAULT false`).
