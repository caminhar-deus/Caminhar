# ADR-0040: Migração da integração de pagamentos para a Orders API (`/v1/orders`) do Mercado Pago

- **Status:** Aceito
- **Data:** 2026-11-12
- **Decisores:** Equipe de desenvolvimento / Dono do projeto
- **Relacionados:** ADR-0037, ADR-0038, ADR-0039, `lib/payment/mercadopago.js`, `lib/payment/payment-status-messages.js`, `pages/api/checkout.js`, `pages/api/webhooks/mercadopago.js`, `pages/checkout/[id].js`

## Contexto

Na validação end-to-end com as credenciais de Sandbox configuradas na aplicação do projeto no Mercado Pago, observou-se que o endpoint legado `POST /v1/payments` rejeitava o `Access Token` de teste (`APP_USR-...`) com `HTTP 401 (Unauthorized use of live credentials)`, enquanto a documentação oficial do Mercado Pago para **"Checkout Transparente e Checkout Pro com Orders"** define que credenciais de teste para aplicações Orders utilizam o prefixo `APP_USR-` (não `TEST-`).

Testes diretos contra a **Orders API (`POST /v1/orders` e `GET /v1/orders/{id}`)** revelaram contratos distintos do endpoint legado:

1. **Estrutura de requisição e tipagem:** valores (`total_amount` e `transactions.payments[0].amount`) devem ser strings com duas casas decimais (`"25.00"`); o objeto `payer.address` no boleto (`bolbradesco`) exige `zip_code`, `street_name`, `street_number`, `neighborhood`, `city` e `state` (não `federal_unit`, nem `country`); o campo `notification_url` no corpo de `POST /v1/orders` é rejeitado com `HTTP 400 (additionalProperties '$.notification_url' not allowed)` — webhooks de Orders devem ser cadastrados no painel de desenvolvedor do Mercado Pago para o tópico `Order`.
2. **Cartão de débito / pré-pago e parcelas:** em Sandbox do coletor brasileiro analisado (`MLB`), o BIN de teste Elo (`506776...`) retorna `payment_type_id: 'prepaid_card'` (`elo`) na API `/v1/payment_methods/search`, exigindo omissão do campo `installments` quando `type === 'prepaid_card'`, enquanto `debelo` (`type: 'debit_card'`) depende de habilitação comercial do coletor (`payment_method_not_allowed_for_collector`). Além disso, parcelamentos dependem dos `payer_costs` retornados para o coletor (conta de teste nova restrita a `1x`).
3. **Semântica de recusa (`HTTP 402`), status e webhooks:** recusas síncronas de cartão na Orders API retornam `HTTP 402` com o objeto completo da `Order` criada em `body.data` (`status: 'failed'` e `transactions.payments[0].status_detail` como `insufficient_amount`, `rejected_by_issuer`, `bad_filled_card_data`, `required_call_for_authorize`); status da Orders API (`processed`, `processing`, `action_required`, `canceled`, `failed`, `refunded`) diferem de `/v1/payments`; e notificações de webhook chegam com `type: 'order'` / `action: 'order.*'` e identificador alfanumérico `ORD...` (cujo manifesto HMAC v2 exige `data.id` em minúsculas).

## Decisão

1. **Adotar `POST /v1/orders` em `lib/payment/mercadopago.js`:** atualizar `createMercadoPagoPayment` para criar ordens online (`type: 'online'`, `processing_mode: 'automatic'`) com `X-Idempotency-Key` determinístico por pedido (`caminhar-order-${order.id}`), remover `notification_url` do corpo, ajustar `buildPayerAddress` para `state` (omitindo `address` incompleto em meios que não são boleto) e propagar `paymentTypeId` do SDK v2 (`checkout/[id].js` → `pages/api/checkout.js` → `mercadopago.js`) para suportar `credit_card`, `debit_card` e `prepaid_card` (sem `installments` em `prepaid_card`).
2. **Normalizar status e recusas `HTTP 402` da Orders API:** mapear `processed` → `approved`, `processing` → `in_process`, `action_required` → `pending` (`waiting_capture` → `authorized`, `waiting_retry` → `in_process`), `failed` → `rejected`, `canceled`/`expired` → `cancelled`, `refunded` → `refunded`. Tratar respostas `HTTP 402` com `data.id` como ordem criada em estado `rejected`, persistindo o pedido recusado com devolução imediata de estoque (`attachOrderPaymentInfo`) e feedback claro via `lib/payment/payment-status-messages.js`.
3. **Suporte dual em Webhooks e consulta de status:** atualizar `pages/api/webhooks/mercadopago.js` para aceitar notificações `type: 'order'` (`action: 'order.*'`) além do legado `type: 'payment'`, roteando `fetchMercadoPagoPaymentStatus` para `GET /v1/orders/{id}` quando `eventType === 'order'` ou o ID iniciar com `ORD` (mantendo `GET /v1/payments/{id}` para IDs numéricos legados).

## Alternativas consideradas

- **Trocar as credenciais da aplicação para usar `/v1/payments` legado:** descartada por não refletir a aplicação atual do Mercado Pago configurada no painel do projeto ("Checkout Transparente com Orders", cuja credencial de teste é legitimamente `APP_USR-...`) e por adotar um contrato legado que o próprio Mercado Pago está substituindo pela Orders API.
- **Tratar `HTTP 402` de cartão recusado como erro genérico `422` com cancelamento cego:** descartada porque o Mercado Pago efetivamente cria o registro `ORD...` com `status_detail` específico; preservar a recusa como pedido `rejected` (com estoque restaurado) permite auditoria fiel no `/admin`, consulta do comprador em `/minha-conta` e exibição do motivo exato no checkout.

## Consequências

### Positivas

- Comunicação real validada ponta a ponta no Sandbox oficial do Mercado Pago (`POST /v1/orders`, `GET /v1/orders/{id}`, `/cancel`, `/refund`) com as credenciais `.env` do projeto, sem expor nem alterar chaves.
- PIX, Boleto Bancário, Cartão de Crédito (aprovação, análise, recusa e reembolso) e Cartão Elo Pré-pago funcionam de ponta a ponta sobre o PostgreSQL real e os handlers do site.
- Webhooks assinados v2 funcionam tanto para eventos `order` quanto para eventos legados `payment`.

### Negativas e riscos

- Webhooks da Orders API **não** aceitam `notification_url` por transação: o recebimento automático em ambiente público/produção exige configurar previamente a URL `https://<dominio>/api/webhooks/mercadopago` com o tópico **`Order (Mercado Pago)`** e `MP_WEBHOOK_SECRET` no painel *Suas integrações* do Mercado Pago.
- Pagamentos por débito direto de bandeira (`debelo` com `type: 'debit_card'`) dependem de habilitação comercial do recebedor no Mercado Pago (`payment_method_not_allowed_for_collector`).

## Revisão

Reavaliar após a configuração do webhook HTTPS em ambiente de homologação/produção e após validar junto ao suporte/painel do Mercado Pago a habilitação de `debit_card` direto (`debelo` / `debvisa` / `debmaster`) caso seja requisito comercial manter débito tradicional além de pré-pago/PIX/crédito/boleto.
