# ADR-0037: Duas modalidades em Produtos Religiosos, Gestão de Vendas com Mercado Pago e Conta do Visitante isolada

- **Status:** Aceito
- **Data:** 2026-11-08
- **Decisores:** Dono do projeto
- **Relacionados:** [ADR-0005](0005-jwt-http-only-rbac.md), [ADR-0010](0010-admin-como-cargo-e-validacao-de-nome.md), [ADR-0016](0016-seletor-de-ordenacao-de-produtos-no-servidor.md), [ADR-0027](0027-preco-produto-numeric-e-fluxo-cadastro.md), [ADR-0029](0029-unificacao-published-default-false.md), [ADR-0036](0036-shared-visual-standard-and-admin-collapsible-sidebar.md), `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/ARQUITETURA_SITE_PRIVADO.md`

## Contexto

A aba pública **Produtos Religiosos** e a aba administrativa **Gestão de Produtos** foram originalmente implementadas apenas como vitrine de divulgação de links externos para marketplaces (Mercado Livre, Shopee e Amazon). Com a evolução comercial do projeto, o dono definiu a necessidade de:

1. Manter os produtos de marketplaces externos (Modalidade A) gerenciados em **Gestão de Produtos**, mas diferenciando-os claramente dos produtos de venda direta pelo próprio site. No código anterior (`components/Features/Products/ProductCard.js` e `pages/api/products.js`), o botão externo se chamava `"Comprar"` e o campo `link` era opcional, o que gerava ambiguidade com a compra interna e permitia publicar itens sem botão.
2. Introduzir a venda interna direta pelo Site Público (Modalidade B), com controle de estoque, endereço de entrega, frete configurável e pagamento no próprio site via integração com o **Mercado Pago** (PIX, cartão de débito, cartão de crédito e boleto bancário).
3. Criar a aba **Gestão de Vendas** no Painel Administrativo (`/admin`) para gerenciar exclusivamente os produtos de venda interna, os pedidos e os recebimentos via Mercado Pago, sem misturá-los com cliques ou compras feitas nos marketplaces externos.
4. Disponibilizar conta para o visitante do Site Público (cadastro convencional e **Sign in with Google**) para realizar compras internas e consultar o histórico e o andamento de seus pedidos, sem misturar clientes públicos com os operadores administrativos da tabela `users` ([ADR-0005](0005-jwt-http-only-rbac.md)).

## Decisão

Vamos estruturar a comercialização, os pagamentos e a autenticação pública nas seguintes regras:

1. **Separação das duas modalidades na vitrine (`Produtos Religiosos`):**
   - A barra de filtros da vitrine ganha o seletor de modalidade (`"Todos"`, `"Venda direta"`, `"Lojas parceiras"`).
   - **Modalidade A (Link externo de marketplace — origem em Gestão de Produtos):** o campo `link` é obrigatório para produtos externos e deve apontar para Mercado Livre, Shopee ou Amazon; o cartão exibe o selo `"Loja parceira"` e o botão **"Link para `<site>`"** (`"Link para Mercado Livre"`, `"Link para Shopee"`, `"Link para Amazon"`), abrindo em nova aba.
   - **Modalidade B (Venda interna — origem em Gestão de Vendas):** o cartão exibe o selo `"Venda direta"` e o botão exclusivo **"Comprar"** (ou estado `"Esgotado"` desabilitado quando `stock = 0`).
2. **Compra direta unitária e exigência de conta do visitante:**
   - Ao clicar em **"Comprar"** (Modalidade B), o visitante seleciona a quantidade do item e avança ao checkout direto daquele produto (`/checkout/[id]`), sem carrinho multi-produto.
   - O checkout exige autenticação prévia do visitante: caso não esteja autenticado, ele é redirecionado para `/entrar?next=/checkout/[id]` e retorna automaticamente após entrar ou cadastrar-se.
3. **Conta do visitante isolada dos operadores do painel (`/entrar` e `/minha-conta`):**
   - O cabeçalho público inclui o botão **"Entrar"** (ou **"Minha Conta"** quando autenticado).
   - Os clientes do site público são armazenados em tabela própria (`customers`, com suporte a senha com hash bcrypt e `google_id` para **Sign in with Google**) e autenticados por cookie `httpOnly` exclusivo (`customerToken` com claim `scope: 'customer'`), totalmente isolado de `users`, `/login` e `/admin`.
   - Em `/minha-conta`, o comprador consulta exclusivamente suas compras internas (itens, valores, frete, meio de pagamento, status do pagamento no Mercado Pago, andamento do pedido e código de rastreio).
4. **Pagamento via Mercado Pago e confirmação por Webhook:**
   - O pagamento da Modalidade B é processado no próprio site (Checkout Transparente / API de Pagamentos do Mercado Pago) para **PIX** (QR Code e código copia-e-cola), **cartão de débito**, **cartão de crédito** e **boleto bancário** (linha digitável e link).
   - A reserva de estoque é feita de forma atômica na criação do pedido (`SELECT ... FOR UPDATE`), e a confirmação/atualização ocorre via endpoint de **Webhook do Mercado Pago** (`/api/webhooks/mercadopago`) com verificação de assinatura e idempotência (`payment_webhook_events`), devolvendo o estoque caso o pagamento seja recusado ou cancelado.
5. **Aba administrativa `Gestão de Vendas` (Posição 6 no `/admin`):**
   - Entra na **posição 6** da barra lateral esquerda (logo abaixo de `Gestão de Produtos`), protegida pela permissão `'Gestão de Vendas'` em `lib/domain/permissions.js`.
   - Divide-se em **2 subabas horizontais**:
     - **Pedidos:** listagem paginada, busca server-side, filtros por status de pagamento, status do pedido e meio de pagamento, exportação CSV, detalhes do pedido e atualização do status logístico (`Aguardando pagamento`, `Em preparo`, `Enviado` com código de rastreio, `Entregue`, `Cancelado`) independente do status do pagamento (`Pendente`, `Aprovado`, `Recusado`, `Cancelado`, `Reembolsado`).
     - **Produtos Internos:** CRUD completo sobre `AdminCrudBase` para os produtos da Modalidade B (com estoque, tipo/valor de frete, curadoria 1-based e nascimento como rascunho — [ADR-0029](0029-unificacao-published-default-false.md)).

## Alternativas consideradas

- **Manter o botão `"Comprar"` para ambas as modalidades e `link` opcional na Gestão de Produtos:** descartada pelo dono por induzir o visitante a achar que compras de marketplace ocorrem dentro do Caminhar e por permitir cartões publicados sem ação.
- **Carrinho de compras multi-produto ou checkout sem cadastro prévio (guest checkout):** descartadas pelo dono em favor da simplicidade operacional da compra direta unitária e da garantia de vínculo imediato do pedido à conta autenticada do comprador.
- **Compartilhar a tabela `users` e a rota `/login` entre administradores e visitantes:** descartada para preservar a fronteira de segurança do painel administrativo (`/admin`) e evitar qualquer risco de escalada de privilégio entre conta pública e RBAC interno.
- **Status único misturando pagamento e logística:** descartada porque o estado financeiro (Mercado Pago) e o andamento físico da entrega têm ciclos de vida distintos.

## Consequências

### Positivas

- Fronteira inequívoca entre vitrine de afiliados (Modalidade A / Gestão de Produtos) e comércio interno (Modalidade B / Gestão de Vendas / Mercado Pago).
- Isolamento completo entre sessões de clientes públicos (`customers`) e operadores administrativos (`users`).
- Rastreabilidade ponta a ponta das vendas internas tanto para o comprador (`/minha-conta`) quanto para o operador (`Gestão de Vendas` e `Auditoria`).

### Negativas e riscos

- Aumento do número de tabelas e rotas, exigindo atualização coordenada de `lib/crud/crud.js`, `scripts/validate-schema.js` e `tests/unit/scripts/schema-sources.test.js`.
- Dependência de variáveis de ambiente externas (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) em produção, tratadas como opcionais no boot local/CI com degradação controlada.

## Revisão

Reavaliar caso o volume de vendas internas passe a exigir carrinho multi-item ou integração automática de cotação de frete com múltiplas transportadoras.
