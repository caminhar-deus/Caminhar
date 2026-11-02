# ADR-0033: Vídeos ganham "Posicionados", índice para recent/oldest e A-Z independente da colação

- **Status:** Aceito
- **Data:** 2026-11-01
- **Decisores:** Mantenedor do projeto (pedido de resolver o item AE de `docs/PENDENCIAS_scripts_testes.md`)
- **Relacionados:** [ADR-0014](0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md), [ADR-0016](0016-seletor-de-ordenacao-de-produtos-no-servidor.md) (item d), [`../ARQUITETURA_SITE_PUBLICO.md`](../ARQUITETURA_SITE_PUBLICO.md) §3.4, `pages/api/videos.js`, `components/Features/Video/VideoGallery.js`, `scripts/migrations/021-videos-public-sort-support.js`, `design-system/pages/home.md` §2.2

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O item AE deixou três pontas abertas na ordenação pública de `/api/videos`:

1. **`position` sem efeito público.** O painel reordena vídeos por arrastar e soltar
   (`reorderVideos()` grava `position`, com Auditoria e invalidação de `public_videos:*`),
   mas o `SORT_MAP` e o seletor nunca tiveram "Posicionados". O ADR-0014 expôs a opção em
   Músicas e Produtos e deixou Vídeos de fora.
2. **Índice desalinhado.** A migration 012 criou `idx_videos_pagination (published,
   position, created_at DESC)` para o default antigo `position ASC, created_at DESC`.
   Desde o ADR-0014 a rota envia `created_at DESC, id DESC` ou `created_at ASC, id ASC`.
   Medido em 50 000 linhas (PostgreSQL 18, `EXPLAIN (ANALYZE, BUFFERS)`): `recent` e
   `oldest` viravam Seq Scan + top-N heapsort (715 buffers, 13–18 ms); `positioned`, com
   o índice atual, já saía por Index Scan + Incremental Sort (3 buffers, 0,18 ms).
3. **Colação de `titulo`.** `ORDER BY titulo` herda a colação do cluster. Em `C`/`C.UTF-8`
   as maiúsculas vêm antes das minúsculas e os acentuados vão para o fim (medido:
   `Ave, Ave Maria, Ousado Amor, Zebra, Zélia, abba, amor, ave, Ágape, Éden, ótimo`).
   Confirmado no banco local de desenvolvimento (`PostgreSQL 18.6`, `lc_collate = C.UTF-8`,
   `lc_ctype = C.UTF-8`): o cluster real do projeto usa `C.UTF-8`, enquanto CI e
   Testcontainers usam `postgres:15` (cujo default documentado é `en_US.utf8`), de modo
   que depender da colação do banco quebrava o A-Z/Z-A localmente e em qualquer deploy
   provisionado com `C`/`C.UTF-8`.

O design já estava decidido: "Posicionados" entra no mesmo `<select>`, sem distinção
visual e sem legenda (decisão D6 de `design-system/pages/home.md`).

## Decisão

1. **"Posicionados" passa a existir em Vídeos**, na 2ª posição do seletor, com
   `position ASC, id ASC` e `sort=positioned` no enum de `/api/videos`. O valor default
   continua `recent` (ver "Alternativas", item d do ADR-0016).
2. **Um único índice novo**, `idx_videos_recent (published, created_at DESC, id DESC)`:
   `recent` usa varredura direta e `oldest` usa varredura inversa do mesmo índice
   (comprovado em EXPLAIN). `idx_videos_pagination` é **mantido**, porque serve
   `positioned`.
3. **A-Z e Z-A ordenam por `lower(unaccent(titulo))`**, com desempate por `id`, o que
   independe da colação do cluster. A migration 021 instala a extensão `unaccent`.
   A ordem das funções é deliberada: `unaccent` primeiro, `lower` depois — em cluster `C`
   puro o `lower()` não minusculiza `É`/`Á`, então `unaccent(lower(...))` deixa
   "Ágape" e "Éden" no topo (medido).
4. **Tudo vive numa migration nova (021)**, nunca na edição da 012 já aplicada.

## Alternativas consideradas

- **Dois índices novos (`recent` e `positioned`)**, como o relato sugeria. Descartada: a
  medição mostrou que `positioned` já é servido pelo índice existente.
- **Substituir `idx_videos_pagination`.** Descartada: removeria o suporte a `positioned`.
- **`COLLATE "pt-BR-x-icu"`.** Descartada: depende de build do PostgreSQL com ICU e falharia
  só em runtime, no tráfego do visitante; `unaccent` falha cedo, na migration.
- **Só verificar a colação e documentar.** Descartada: o banco local de desenvolvimento
  efetivamente roda em `C.UTF-8`, onde `ORDER BY titulo` ordena por codepoint em vez de
  ordem alfabética em português.
- **Unificar o vocabulário (`recent` → `default`).** Mantida a divergência (item d do
  ADR-0016): mudar o nome quebraria URLs e chaves de cache em uso.

## Consequências

### Positivas

- A curadoria do dono passa a aparecer na aba Vídeos; as três abas com seletor ficam com
  o mesmo conjunto de opções de ordenação (Produtos troca A-Z por preço).
- `recent`/`oldest` deixam de ordenar a tabela inteira em cada requisição.
- A-Z e Z-A ficam corretos em qualquer cluster.

### Negativas e riscos

- **Deploy:** rodar `npm run migrate` antes de colocar o código no ar. Sem a extensão,
  `sort=alpha`/`alpha_desc` respondem 500 (`recent`, `oldest` e `positioned` não dependem
  dela). `unaccent` é extensão *trusted* desde o PostgreSQL 13, como o `pg_trgm` da 013.
- A ordenação alfabética por função não usa índice (como antes: não havia índice em
  `titulo`). Se o catálogo crescer muito, avaliar índice sobre uma função IMMUTABLE
  encapsulando `unaccent`.
- **Mesma causa fora do escopo**, registrada em `docs/PENDENCIAS_scripts_testes.md` (item
  AF): `musicas.alpha`/`alpha_desc` ainda ordenam por `titulo`, e
  `idx_musicas_pagination`/`idx_products_pagination` têm o mesmo desalinhamento da 012.

## Revisão

Reavaliar se: (a) o catálogo de vídeos passar de alguns milhares de itens (índice funcional
para A-Z); (b) o item AF for executado em Músicas, para unificar a expressão de ordenação
alfabética entre as abas; (c) a colação do banco de produção for verificada como linguística
e o dono preferir remover a dependência de `unaccent`.
