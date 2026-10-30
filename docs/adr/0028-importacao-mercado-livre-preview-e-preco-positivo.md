# ADR-0028: Importação do Mercado Livre por preview de link, preço obrigatório maior que zero e correções da vitrine

- **Status:** Aceito
- **Data:** 2026-10-29
- **Decisores:** dono do projeto (opção "A + correções" e "rejeitar zero" aprovadas em 29/10/2026)
- **Relacionados:** ADR-0027 (fluxo de cadastro de produtos), `pages/api/admin/fetch-ml.js`, `components/Admin/AdminProducts.js`, `pages/api/products.js`, `lib/domain/products.js`, `components/Features/Products/ProductCard.js`, `docs/ARQUITETURA_SITE_PRIVADO.md` §4.5 e §8

## Contexto

O botão "⚡ Puxar Dados" do cadastro de produtos falhava com HTTP 500 e a mensagem
"Anúncio inativo ou link inválido" para o link
`…/crucifixo-de-mesa-parede-madeira-com-metal-sao-bento-25cm/up/MLBU1104166422#…&wid=MLB2134743881&…`.

A análise de 29/10/2026 (somente leitura, com sondagens HTTP reais) confirmou três
fatos independentes:

1. **A API do Mercado Livre deixou de ser pública em abril/2025.** Sem
   `Authorization: Bearer`, `GET /items/{id}` responde
   `403 {"blocked_by":"PolicyAgent","code":"PA_UNAUTHORIZED_RESULT_FROM_POLICIES"}`
   — inclusive para um id inexistente, o que prova bloqueio de política e não
   "anúncio inativo" —, `GET /products/{id}` responde `401 authorization value
   not present`, `GET /sites/MLB/search` responde `403 forbidden` e o multiget
   `/items?ids=` responde `401` no nginx. O projeto não tinha (e não tem)
   credencial ML configurada.
2. **O fallback de scraping era barrado pelo anti-bot.** Com UA de navegador a
   partir do servidor, a página do produto responde `302 →
   /gz/account-verification` (assets `suspicious-traffic-frontend`), uma página
   sem `<title>` e sem `og:*`. O `scrapeFromHtml` devolvia `null` e o operador
   recebia a mensagem de "anúncio inativo".
3. **Com UA de robô de link-preview** (`facebookexternalhit`) o ML entrega a
   versão de compartilhamento (16 KB) com `og:title`, `og:image` e
   `og:description` — **sem preço** (nenhum `product:price:amount`, JSON-LD ou
   `R$` no HTML).

Além disso, a extração de código só reconhecia `MLB[-_]?\d+`: o `MLBU…` do
caminho nunca era usado e o `wid` só era encontrado porque está **dentro do
fragmento `#`** (o link de busca do ML põe o `wid` depois do `#`, não na query
string — `new URL(url).searchParams.get('wid')` devolve `null`).

Duas falhas da vitrine apareceram no mesmo rastro: o `ProductCard` renderizava
`product.price` cru (o `pg` devolve `numeric` como string — `"149.90"`) apesar
de a API já enviar `formatted_price`, e `createProduct` descartava `published`,
então desmarcar "Produto Publicado" na criação não tinha efeito.

## Decisão

1. **A rota só consulta a API do ML quando existe `ML_ACCESS_TOKEN`** no
   ambiente; sem token ela vai direto ao preview, sem gastar requisições
   condenadas (403/401).
2. **Preview com UA de link-preview** (`facebookexternalhit`) como caminho
   padrão para o Mercado Livre, reaproveitando o `scrapeFromHtml` existente
   (headers por loja). O preview fornece **nome, imagem e descrição**; o
   **preço não é importado** e o operador digita o valor.
3. **Preço ausente vira `null`, nunca `0`**, e **preço zero passa a ser
   recusado** no cliente e na API ("Valor deve ser maior que zero"). O
   `handleFetchMLSuccess` deixa o campo vazio e avisa quando a loja não informa
   o valor.
4. **Erros deixam de ser 500 genérico:** bloqueio anti-bot devolve **422** com
   a orientação "preencha nome, preço e imagem manualmente"; quando nada é
   legível, **502** com "não foi possível ler os dados deste link". O
   `BusinessError` passou a carregar o status.
5. **Extração de códigos corrigida:** `item_id` explícito, depois `wid` (lido do
   fragmento **ou** da query, no texto bruto) e demais `MLB…`; `MLBU…` é
   coletado e **não** derruba mais o link — sem código MLB a importação segue
   para o preview em vez de responder 400.
6. **Vitrine usa `formatted_price`** (fallback para o valor cru), exibindo
   `R$ 149,90`.
7. **`published` é respeitado na criação** (só enviado quando definido),
   mantendo o default `true` do banco.
8. **Corrigido o log de criação de produto**, que usava a variável livre `name`
   (inexistente no escopo do Node; no jsdom resolvia para `window.name` = `""`):
   em produção a linha lançava `ReferenceError` **depois** do INSERT, e o
   operador recebia HTTP 500 com o produto já gravado. Passou a usar
   `validation.data.name` e o teste passou a exigir o nome na mensagem do log.

## Alternativas consideradas

- **Implementar OAuth do ML agora** (app + consentimento + refresh a cada 6 h):
  é a via oficial e traz preço e carrossel, mas depende de criar o app e
  autorizar com a conta do dono. Ficou aprovada como evolução futura: a rota já
  lê `ML_ACCESS_TOKEN` e usa `/items/{wid}` quando o token existe.
- **Não ler o ML e pedir preenchimento manual sempre:** menor risco contratual,
  porém perde nome, imagem e descrição que o preview entrega de graça.
- **UA de Googlebot:** descartado — impersonação mais agressiva, mesmo
  resultado prático do UA de preview.
- **Manter `price: 0`:** descartado pelo dono; publicaria produto de R$ 0,00.

Não há registro de outras alternativas avaliadas à época.

## Consequências

### Positivas

- O link do bug passa a importar nome, imagem e descrição, e o operador é
  orientado a digitar o preço (antes: HTTP 500 com mensagem falsa).
- Nenhuma requisição inútil à API bloqueada; o dia em que houver token o caminho
  oficial é usado sem reescrever a rota.
- Fim do "produto de graça": preço zero recusado no formulário e na API.
- Vitrine exibe preço em pt-BR e o rascunho de produto funciona de verdade.
- **Salvar produto deixou de responder 500 depois de gravar:** o `ReferenceError`
  do log mascarava um INSERT bem-sucedido e induzia a reenviar (risco de
  duplicata).

### Negativas e riscos

- **O UA de link-preview é impersonação de um robô de terceiro** (zona cinzenta
  de termos de uso) e pode parar de funcionar sem aviso; o caminho de erro já
  orienta o preenchimento manual.
- **O preço do ML nunca vem pela leitura automática** — a importação é parcial
  por definição enquanto não houver OAuth.
- O bloqueio pode variar por IP (funciona em máquina local, pode falhar em
  datacenter/serverless) e o ML muda endpoints com frequência.
- `ML_ACCESS_TOKEN` (quando configurado) expira em 6 h e exigirá refresh
  automático — nenhum segredo deve ir para log.

## Revisão

Reavaliar se: (a) o dono criar o app OAuth do ML (implementar refresh e remover o
preview do caminho principal); (b) o ML mudar a página de preview ou o UA deixar
de ser aceito; (c) surgir API pública oficial de outra loja que dispense
credencial.
