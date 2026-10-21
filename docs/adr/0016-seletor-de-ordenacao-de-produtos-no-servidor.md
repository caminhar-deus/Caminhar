# ADR-0016: Seletor de ordenação de Produtos com ordenação no servidor

- **Status:** Aceito
- **Data:** 2026-10-21
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../ARQUITETURA_SITE_PUBLICO.md`](../ARQUITETURA_SITE_PUBLICO.md) §3.5, [`../PLANO_ACAO_SITE_PUBLICO.md`](../PLANO_ACAO_SITE_PUBLICO.md) (F1.2, F1.3), [`0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md`](0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md), `lib/domain/products.js`, `pages/api/products.js`, `components/Features/Products/ProductList.js`, `design-system/pages/home.md` §1 e §4

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O documento de arquitetura do site público (§3.5) promete, para a aba
Produtos, um seletor de ordenação com as opções **"Padrão"** (= Mais recentes),
**"Mais antigos"**, **"Menor preço"** e **"Maior preço"**, além da paginação no
padrão "❮ Anterior | Página X de Y (Z produtos) | Próxima ❯".

O código não tinha seletor algum: só busca e faixa de preço. A ordem era fixa
(`position ASC, id ASC` — os mais antigos primeiro, ver
[ADR-0014](0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md))
e o componente **reordenava a página no cliente**, depois de receber os
resultados.

Esse reordenamento no cliente era incoerente com a paginação: ele ordenava só os
itens da página atual, de modo que a ordem global dependia de como o servidor
havia paginado — o visitante veria a "primeira" página com os itens mais
antigos e a última com os mais novos, misturados. A paginação também usava
botões numerados, sendo a única aba fora do padrão das outras três.

## Decisão

1. **A ordenação é feita pelo servidor.** O GET público de `/api/products`
   valida o parâmetro `sort` com um enum (`default | oldest | price_asc |
   price_desc`); valor fora do conjunto devolve 400. O `sort` é repassado ao
   domínio (`getPaginatedProducts`) e entra na **chave de cache** — sem isso, um
   cache hit devolveria o resultado de outra ordenação.
2. **O cliente não reordena mais.** O `transform` do `useApiFetch` devolve os
   itens na ordem recebida.
3. **O seletor entra na barra de filtros**, com o rótulo visível "Ordenar por:"
   (após os campos de preço e antes do botão "Limpar filtros"), `aria-label`
   "Ordenar produtos" e as opções "Padrão", "Mais antigos", "Menor preço" e
   "Maior preço". Trocar a ordenação volta para a página 1.
4. **A opção "Posicionados" fica reservada** — a API e o seletor a conhecem, mas
   a UI não a renderiza enquanto o reordenamento de produtos no painel não
   funcionar (§7, item 11).
5. **A paginação de Produtos passa ao padrão das outras abas** — "❮ Anterior |
   Página X de Y (Z produtos) | Próxima ❯", com "Anterior" desabilitado na
   primeira página, "Próxima" na última, e o controle **oculto quando há uma
   única página**.
6. A contagem de resultados acompanha a grade no mesmo formato das outras abas:
   "Mostrando X de Y produtos" ou "X resultados para "termo"".

## Alternativas consideradas

- **Opção A — manter a ordenação no cliente.** Descartada: ordena apenas a
  página atual e produz uma ordem global incoerente com a paginação.
- **Opção B — aceitar `sort` como texto livre e injetar no `ORDER BY`.** Descartada:
  é superfície de injeção de SQL. O enum validado com Zod mantém a lista
  fechada e o erro previsível.
- **Opção C — guardar as opções de ordenação em `settings` (como `posts_per_page`).**
  Descartada: são quatro ordenações fixas, sem necessidade de configuração; e as
  chaves `*_per_page` da tabela `settings` hoje não são lidas por nenhum
  componente do site público — exatamente o tipo de configuração morta que este
  ADR evita criar.
- **Opção D — reordenar com um parâmetro de deslocamento (`offset`, `dir`).**
  Descartada: não permite ordenação por preço, que o documento promete.

## Consequências

### Positivas

- A aba passa a ter o seletor que o documento promete, e a ordem é a mesma em
  todas as páginas.
- A ordenação por preço fica disponível — antes inexistente.
- As quatro abas compartilham o mesmo padrão de paginação e de contador.
- A chave de cache inclui `sort`, o que elimina a mistura de resultados de
  ordenações diferentes.

### Negativas e riscos

- **Nova superfície pública:** o parâmetro `sort` passa a ser validado na borda;
  um valor inválido devolve 400 em vez de ser ignorado. Clientes antigos que
  não enviam `sort` continuam funcionando (o default é `default`).
- A ordenação por `created_at` depende de a coluna existir em `products` —
  confirmada no esquema de CRUD do projeto.
- "Posicionados" continua indisponível em Produtos até a correção do painel.

## Revisão

**2026-10-21 — revisão parcial.** O reordenamento de produtos no painel foi
corrigido (branch `action: "reorder"` em `pages/api/products.js`, com validação
Zod, invalidação de cache e registro de Auditoria), então a condição (a) da
revisão se cumpre: **"Posicionados" foi exposto** no seletor de Produtos,
imediatamente após "Padrão" (`position ASC, id ASC` em
`lib/domain/products.js`; o `sort` já entra na chave de cache
`products:public:...`).

Permanecem em aberto:

- (b) ordenações adicionais (por categoria, por destaque) — exigiriam ampliar o
  enum `PUBLIC_SORT_ENUM` (`pages/api/products.js`) e o `orderByMap` do domínio.
- (c) as chaves `*_per_page` da tabela `settings` ainda não são usadas pelo
  site — a contagem por página continua valor fixo do componente.
- (d) **Divergência de contrato entre abas:** o rótulo "Padrão" significa
  "Mais recentes" nas três abas, mas o valor no enum não é o mesmo —
  Músicas usa `default` (`created_at DESC`), Produtos usa `default`
  (`created_at DESC`) e Vídeos usa `recent` (`created_at DESC`, no `SORT_MAP`
  de `pages/api/videos.js`). As demais opções também divergem por aba
  (`alpha`/`alpha_desc` em Músicas e Vídeos; `price_asc`/`price_desc` em
  Produtos). A inconsistência é de vocabulário do enum, não de comportamento.
  Unificar os nomes exigiria mudança de contrato (quebraria URLs/cache em
  produção) e foi deliberadamente deixada como follow-up.
