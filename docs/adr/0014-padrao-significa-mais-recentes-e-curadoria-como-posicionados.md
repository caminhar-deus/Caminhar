# ADR-0014: "Padrão" significa "Mais recentes" e a curadoria manual vira a opção "Posicionados"

- **Status:** Aceito
- **Data:** 2026-10-21
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../ARQUITETURA_SITE_PUBLICO.md`](../ARQUITETURA_SITE_PUBLICO.md) §3.3, [`../PLANO_ACAO_SITE_PUBLICO.md`](../PLANO_ACAO_SITE_PUBLICO.md) (F0.2), [`0016-seletor-de-ordenacao-de-produtos-no-servidor.md`](0016-seletor-de-ordenacao-de-produtos-no-servidor.md), `lib/domain/musicas.js`, `lib/domain/products.js`, `pages/api/musicas.js`, `pages/api/products.js`

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O documento de arquitetura do site público promete, em §3.3 (Músicas), §3.4
(Vídeos) e §3.5 (Produtos), que o seletor de ordenação abre com a opção
**"Padrão"** selecionada e que essa opção **equivale a "Mais recentes"**.

O código nunca fez isso. A ordenação padrão das abas Músicas e Produtos era
`position ASC` — e `position` é atribuído na criação como `MAX(position) + 1`
(`lib/domain/musicas.js`, `lib/domain/products.js`). Como o número cresce a cada
criação, `position ASC` é exatamente a **ordem de criação**: o conteúdo mais
antigo aparece primeiro. Só a aba Vídeos coincidia com o documento, porque lá o
default já era `created_at DESC`.

O efeito para o visitante era material: a aba abria com o item mais antigo no
topo, e o nome "Padrão" não explicava a inversão.

Ao mesmo tempo, a curadoria manual (arrastar e soltar no painel) grava
`position` para escolher a ordem — um recurso que o dono quer preservar. E ele
está quebrado no painel: reordenar posts envia `position = 0`, que o schema
rejeita (400), e o `PUT /api/products` não trata `action: 'reorder'` (§7, itens
10 e 11 do documento público).

O dono decidiu, na Fase 0 do plano de ação (2026-10-21), que "Padrão" passa a
significar "Mais recentes" e que a curadoria manual vira uma **opção explícita**
("Posicionados"), o que também dá sentido ao arrastar e soltar do painel.

## Decisão

1. **"Padrão" = `created_at DESC` (Mais recentes)** em todas as abas com
   seletor: Músicas, Vídeos e Produtos. O rótulo visível da opção é "Padrão" nas
   três.

2. **A curadoria manual por `position` vira a opção "Posicionados"**
   (`position ASC, id ASC`): um item explícito no seletor, separado do padrão.

3. **A opção "Posicionados" só é exposta onde a curadoria funciona.** O
   reordenamento de músicas no painel já funciona, então Músicas passa a
   oferecer "Posicionados" já. Em Produtos, a opção fica **reservada** (o
   seletor e a API a conhecem, mas a UI não a renderiza) até o reordenamento de
   produtos ser corrigido — expor antes disso ofereceria ao visitante uma ordem
   que o dono não consegue definir.

4. **O contrato da API pública muda junto:** `sort` em `/api/musicas` aceita
   `default | positioned | oldest | alpha | alpha_desc`; em `/api/products`
   aceita `default | oldest | price_asc | price_desc`. Valores fora do conjunto
   são rejeitados com 400.

## Alternativas consideradas

- **Opção A — manter a curadoria como "Padrão" e corrigir o documento.** Descartada:
  o dono definiu que "Padrão" é "Mais recentes"; além disso, o documento é a
  especificação do que a página promete, e a inversão do topo da aba é um
  defeito de usabilidade, não uma escolha de produto.
- **Opção B — remover a coluna `position` e a curadoria.** Descartada: o
  arrastar e soltar do painel é um recurso que o dono quer manter, e ele ganha
  sentido como opção explícita.
- **Opção C — inverter a atribuição de `position` na criação (mais novo = 1).**
  Descartada: quebraria a semântica da curadoria (posição 1 = topo da ordem
  editada) e colidiria com o `utils/reorder.js`, que grava `position = offset +
  index`.
- **Opção D — deixar "Mais recentes" como opção separada de "Padrão" em Músicas.**
  Descartada: as duas passariam a ser o mesmo SQL (`created_at DESC`), com dois
  rótulos para a mesma ordem.

## Consequências

### Positivas

- O topo de cada aba passa a mostrar o conteúdo mais novo, como o documento
  promete e como o visitante espera.
- A curadoria do painel deixa de ser invisível: quando ela funciona, há um
  caminho explícito ("Posicionados") que a usa.
- Um único nome ("Padrão") com um único significado em todas as abas.

### Negativas e riscos

- **A opção "Posicionados" em Músicas depende do reordenamento de músicas no
  painel**, que ainda não foi verificado ponta a ponta nesta entrega.
- A ordem do banco para as abas com curadoria (`position ASC, id ASC`) não é
  mais a ordem padrão: consultas que não passem por `sort` (relatórios, painel)
  continuam vendo a ordem de curadoria.
- Enquanto o painel não corrigir o reordenamento de posts e produtos, a
  curadoria continua inoperante nessas duas entidades — a exposição de
  "Posicionados" em Produtos fica bloqueada por isso.

## Revisão

**2026-10-21 — revisão controlada pelo reordenamento corrigido.** O reordenamento
no painel foi corrigido (posições 1-based em `utils/reorder.js`; branch
`action: "reorder"` em `pages/api/products.js`), então a condição de revisão
deixou de existir:

- "Posicionados" **já era exposto em Músicas** (`lib/domain/musicas.js`) e
  **passou a ser exposto em Produtos** em 2026-10-21, imediatamente após "Padrão"
  (`components/Features/Products/ProductList.js`).
- A curadoria de **Reflexões & Estudos** (§3.1 do documento público) não tem
  seletor: a listagem usa `ORDER BY position ASC, created_at DESC`, então os posts
  só aparecem na ordem curada depois que o dono os reordenar no painel.

Continua valendo: "Padrão" é "Mais recentes" (`created_at DESC`) em todas as
abas, e nenhuma ordenação é feita no cliente.

Reavaliar se: (a) o dono quiser que "Padrão" volte a significar a ordem curada;
(b) a curadoria passar a valer também na rota `/blog` (ver §7, item 12 do
documento público); (c) aparecer ordenação por categoria ou por destaque.
