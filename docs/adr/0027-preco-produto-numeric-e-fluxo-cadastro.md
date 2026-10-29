# ADR-0027: Preço de produto como NUMERIC(10,2) e fluxo de cadastro de produtos definido

- **Status:** Aceito
- **Data:** 2026-10-29
- **Decisores:** dono do projeto (decisões D1–D5 aprovadas em 28/10/2026)
- **Relacionados:** ADR-0025 (migrations idempotentes), ADR-0016 (ordenação de produtos no servidor), `scripts/migrations/019-products-price-numeric.js`, `lib/domain/products.js`, `lib/api/utils.js`, `pages/api/products.js`, `components/Admin/AdminProducts.js`, `components/Features/Products/ProductList.js`, `pages/api/admin/fetch-ml.js`

## Contexto

O cadastro de produtos existia de ponta a ponta, mas o fluxo nunca tinha sido
fechado e a coluna `products.price` era `VARCHAR`. O documento de arquitetura
do painel marcava como `[HIPÓTESE]` que o filtro Mín/Máx do site público
precisava converter o texto em número; a análise de 28/10/2026 **confirmou** a
hipótese e encontrou a cadeia completa do defeito:

- o domínio filtrava com `price >= $n` e ordenava com `ORDER BY price ASC/​DESC`
  sobre texto — comparação lexicográfica ("100.00" < "50.00");
- o formulário incentivava "R$ 89,90" e o "Puxar Dados" gravava "89.90" — dois
  formatos na mesma coluna;
- `Number("R$ 89,90")` → `NaN` → a vitrine exibia "R$ NaN";
- a validação do servidor só exigia `name` e `price`, divergindo do Zod do
  cliente (que exige `image_url`);
- a coluna `category` existia (`default 'geral'`), era aceita pela API, mas não
  aparecia no formulário nem na vitrine;
- o documento prometia "Puxar Dados" para Amazon, Mercado Livre e Shopee,
  enquanto o código só suportava Mercado Livre;
- não havia teste de domínio de produtos (posts, músicas e vídeos tinham).

O dono aprovou o escopo completo em 28/10/2026: D1a (migração para NUMERIC),
D2a (aviso de afiliados no rodapé da vitrine) e categoria + multi-loja + upload
de imagens.

## Decisão

1. **`products.price` passa a ser `NUMERIC(10,2)`**, via migration idempotente
   `019-products-price-numeric` (padrão do ADR-0025): normaliza os valores
   existentes no `USING` (formatos pt-BR e simples; lixo vira `NULL`) e o `down`
   reverte para `VARCHAR`.
2. **Normalização compartilhada na entrada**: `normalizePrice()` vive em
   `lib/api/utils.js` (client-safe) e é reutilizada pelo Zod do formulário,
   pela API e pelo domínio. Aceita "R$ 89,90", "89,90" e "89.90"; devolve
   número com 2 casas ou `null`.
3. **Paridade de validação cliente × servidor** no POST/PUT de produtos
   (`name`, `image_url` e `price` obrigatórios; `link` opcional válido;
   `category`/`published` opcionais).
4. **`category` sai do estado dormente**: campo no formulário (vazio → "geral"),
   filtro exato no domínio, facet `categories` (DISTINCT dos publicados) na
   resposta pública e seletor na vitrine.
5. **Aviso de afiliados no rodapé da vitrine**, com o texto aprovado pelo dono:
   "Alguns links são de afiliados: podemos receber uma comissão pelas compras
   realizadas, sem custo adicional para você."
6. **"Puxar Dados" multi-loja**: a rota `/api/admin/fetch-ml` passa a detectar a
   loja pelo host e atende Amazon, Mercado Livre e Shopee. O Mercado Livre
   mantém a API pública + fallback; Amazon e Shopee usam leitura de meta tags
   do HTML e podem falhar por anti-bot — nesse caso o operador preenche
   manualmente (limitação documentada).
7. **Upload de imagens no cadastro**: `ImageUploadField` ganhou a variante
   opt-in `multiple` (retrocompatível — o banner continua single). O campo do
   produto aceita URLs coladas (uma por linha) **ou** upload, com preview e
   remoção; a primeira imagem é a capa e as demais formam o carrossel
   (`parseImages`).

## Alternativas consideradas

- **Manter `VARCHAR` e normalizar só na escrita** (D1b): menor mudança, mas o
  filtro e a ordenação continuariam comparando strings — o defeito real
  permaneceria. Descartada pelo dono.
- **Aviso de afiliado por cartão** (D2b): mais visível, porém repetitivo;
  descartada em favor do rodapé da vitrine.
- **Não incluir categoria/multi-loja/upload** (opção "nada" de D3–D5):
  descartada pelo dono, que aprovou o escopo completo.

Não há registro de outras alternativas avaliadas à época.

## Consequências

### Positivas

- Filtro Mín/Máx e ordenação por preço passam a comparar número; a vitrine
  nunca mais exibe "R$ NaN".
- Uma única regra de normalização para formulário, API e domínio.
- Vitrine ganha filtro por categoria e o cadastro ganha upload de imagens sem
  componente novo (variante no campo existente).
- "Puxar Dados" cumpre o que o documento prometia, com limitação explícita
  para Amazon/Shopee.
- `tests/unit/domain/products.test.js` cobre normalização, filtros numéricos,
  ordenação e CRUD.

### Negativas e riscos

- A migration converte dados: valores não numéricos viram `NULL` (preferível a
  preço falso; a tabela estava vazia em 28/10/2026).
- Amazon e Shopee dependem de scraping de meta tags; podem falhar por anti-bot
  e exigir preenchimento manual.
- O formulário passa a exibir o preço em pt-BR na edição (decisão de UX do
  §8.9), o que exige a normalização na gravação — coberta por teste.
- `seed-products.js` passou a enviar número (antes enviava "R$ …").

## Revisão

Reavaliar se: (a) surgir API oficial da Amazon/Shopee acessível sem
credenciais; (b) o catálogo de categorias crescer ao ponto de pedir uma tabela
própria (hoje é texto livre com facet); (c) o preço precisar de moeda ou
histórico (hoje fixo em BRL).
