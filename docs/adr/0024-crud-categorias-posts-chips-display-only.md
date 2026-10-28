# ADR-0024: CRUD completo de categorias de posts com chips display-only na frente pública

- **Status:** Aceito
- **Data:** 2026-10-27
- **Decisores:** Dono do projeto (escolha "Implementar CRUD completo"), orchestrator (detalhes técnicos)
- **Relacionados:** ADR-0023 (anterior no lote de pendências), `docs/PLANO_ACAO_SITE_PUBLICO.md` D-20/F1.5, `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 13, `docs/ARQUITETURA_SITE_PRIVADO.md` §8, `components/Features/Blog/PostCard.js`, `lib/domain/shared-pagination.js`

## Contexto

O cartão de post já teve chips de categoria no design original, mas eles foram removidos
(D-20 do plano de ação) porque a listagem pública de posts não devolvia `categories`
(o `SELECT` público não fazia join) e não existia mecanismo no painel para criar/atribuir
categorias — a junction `post_categories` nunca era populada. As tabelas
`categories(id, name, slug UNIQUE)` e `post_categories(post_id, category_id)` já existem
no schema base (migração `000-create-base-schema.js`, linhas 62–77), porém vazias, e não
havia CRUD algum (zero ocorrências em `components/Admin/`, `pages/api/admin/` e
`pages/admin.js`). A pendência §7 item 13 do doc público ficou "aberto" aguardando decisão
do dono entre implementar o CRUD completo ou fechar o item removendo o TODO.

## Decisão

Vamos implementar o CRUD completo de categorias:

1. **API** `pages/api/admin/categories.js` seguindo o padrão `createAdminHandler` dos
   demais CRUDs (Zod para validação; `cacheKeys: 'posts:*'` porque categorias afetam o
   payload em cache da listagem de posts).
2. **Camada de domínio** `lib/domain/categories.js` (listar paginado, listar tudo para
   seleção, criar, atualizar, excluir; slug gerado do nome quando não informado, único —
   violação de UNIQUE devolve 409).
3. **Atribuição no post**: o formulário de post no painel ganha seleção de categorias;
   `createPost`/`updatePost` persistem em `post_categories` (transação).
4. **Frente pública**: a listagem de posts anexa `categories` a cada post (query
   complementar por `post_id` após o `paginate` — sem alterar o `paginate` genérico);
   `PostCard` volta a renderizar chips **display-only** (sem link — não há página de
   arquivo por categoria nesta entrega), restaurando o estilo histórico `.category` de
   `Blog.module.css`.
5. **Permissão**: reuso da permissão existente `Posts/Artigos` — nenhuma permissão nova no
   RBAC; a UI de categorias vive dentro da aba "Posts/Artigos" do painel.
6. **Cache**: mutações de categoria e de vínculo invalidam `posts:*` (mesma chave de cache
   compartilhada por `/api/posts` e pelo SSR de `/blog`).

## Alternativas consideradas

- **Fechar o item (b):** remover o TODO do `PostCard` e registrar a decisão. Descartada
  pelo dono na escolha explícita ("Implementar CRUD completo") — as tabelas já existem e
  o dado é útil para organização do conteúdo.
- **Permissão nova "Gestão de Categorias":** descartada — categorias são intrínsecas à
  gestão de posts; uma permissão própria fragmentaria o RBAC sem ganho real hoje.
- **Chips como links para arquivo por categoria:** descartado nesta entrega — exigiria
  rota pública nova (`/blog?categoria=` ou `/blog/categoria/[slug]`) com paginação e
  cache próprios; escopo além do necessário para resolver a pendência. Reavaliar como
  evolução (ver Revisão).
- **JOIN dentro do `paginate` genérico:** descartado — o `paginate` é compartilhado por
  várias tabelas e o `PUBLIC_SELECT_FIELDS` por tabela não comporta join; anexar
  categorias pós-paginate mantém o genérico intacto.

## Consequências

### Positivas

- Resolve a pendência D-20/F1.5 e o §7 item 13 do doc público com dado real (as tabelas
  já existiam desde o schema base).
- Posts ganham organização por categoria no painel e na frente pública.
- O payload em cache passa a ser completo (posts + categorias), sem segunda chamada do
  cliente.

### Negativas e riscos

- Payload da listagem cresce com o número de categorias por post (bounded pelo uso).
- Duas fontes de verdade para slug (posts e categorias) — slug de categoria é único na
  própria tabela, mas não há garantia de exclusividade cruzada.
- Exclusão de categoria remove vínculos por CASCADE sem promover aviso de posts afetados
  além do padrão de confirmação existente no painel (pendência conhecida de diálogos).
- Com zero categorias cadastradas, os chips simplesmente não aparecem — comportamento
  degradado correto, mas o dono precisa cadastrar categorias para ver o efeito.

## Revisão

Reavaliar quando: (a) o dono quiser navegação por categoria (arquivo público
`/blog?categoria=`), momento em que os chips viram links e o filtro entra na listagem;
(b) o número de categorias crescer a ponto de o select do formulário de post ficar
impraticável (busca/autocomplete); (c) tags (`post_tags`) receberem tratamento
equivalente — avaliar unificar os dois mecanismos.
