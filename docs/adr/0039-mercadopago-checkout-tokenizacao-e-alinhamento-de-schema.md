# ADR-0039: Alinhamento de schema de pedidos/clientes, tokenização via SDK v2 do Mercado Pago e rollback atômico de estoque

- **Status:** Aceito
- **Data:** 2026-11-12
- **Decisores:** Equipe de desenvolvimento / Dono do projeto
- **Relacionados:** ADR-0037, ADR-0038, `lib/domain/customers.js`, `lib/domain/orders.js`, `lib/payment/mercadopago.js`, `lib/payment/payment-status-messages.js`, `pages/api/checkout.js`, `pages/api/webhooks/mercadopago.js`, `pages/checkout/[id].js`, `pages/minha-conta.js`, `pages/_document.js`, `scripts/migrations/023-sales-customers-and-modalities.js`

## Contexto

Durante a validação end-to-end da integração de pagamentos entre o Site Público e o Mercado Pago (em PostgreSQL real e Sandbox API), foram identificadas divergências estruturais e lacunas operacionais que impediam transações reais:

1. **Deriva de schema (Schema Drift):** As consultas SQL de `lib/domain/customers.js` e `lib/domain/orders.js` referenciavam colunas inexistentes na migração canônica `023-sales-customers-and-modalities.js` (`google_sub`, `default_address`, `delivery_address`, `payment_payload`, `mp_preference_id`, `paid_at`, `event_id`, `event_type`, `payload`), em desacordo com `scripts/validate-schema.js` e `lib/crud/crud.js`. A falha permanecia oculta nos testes unitários/integrados anteriores porque todos mockavam `lib/infra/db.js`.
2. **Checkout de cartão e boleto incompleto para a API oficial:** `pages/checkout/[id].js` não carregava o SDK v2 do Mercado Pago (`https://sdk.mercadopago.com/js/v2`), enviava o número bruto do cartão em vez de gerar token no navegador (`mp.createCardToken`), não coletava validade, CVV nem CPF/CNPJ (`payer.identification`), não detectava a bandeira/modalidade pelo BIN (`payment_method_id`) e não repassava `payer.address` exigido no `bolbradesco`. Além disso, a CSP em `pages/_document.js` bloqueava os domínios do SDK do Mercado Pago.
3. **Ciclo de estoque e webhooks:** Falhas em `createMercadoPagoPayment` deixavam pedidos órfãos com estoque reduzido permanentemente; recusas síncronas (`rejected`/`cancelled`) não restauravam estoque no `attachOrderPaymentInfo`; webhooks atrasados (`pending`) podiam sobrescrever pedidos já pagos, faltava trava de devolução única via `stock_restored`, a chave de fallback sem `body.id` colidia entre transições de status e o manifesto HMAC v2 exige `data.id` alfanumérico em minúsculas.

## Decisão

1. **Canonicidade na migração `023-sales-customers-and-modalities.js`:** Alinhar `lib/domain/customers.js` e `lib/domain/orders.js` às colunas reais do PostgreSQL (`google_id`, `address_json`, `shipping_type`, `shipping_address`, `mp_payload`, `stock_restored`, `event_key`, `action`), preservando os aliases JSON (`default_address`, `delivery_address`, `payment_payload`) nas funções de formatação para manter compatibilidade integral com `pages/minha-conta.js`, `components/Admin/AdminSales.js` e contratos existentes.
2. **Checkout Transparente com SDK v2 no cliente e rollback no servidor:** Carregar `https://sdk.mercadopago.com/js/v2` sob CSP atualizada em `pages/_document.js`, exigir CPF/CNPJ do pagador, tokenizar cartões no navegador (`token`, `paymentMethodId`, `issuerId`, sem enviar número bruto/CVV ao backend quando `NEXT_PUBLIC_MP_PUBLIC_KEY` estiver configurado), enviar `payer.identification` e `payer.address` ao `/v1/payments`, e executar rollback atômico via `cancelFailedCheckoutOrder` quando a criação da cobrança falhar no Mercado Pago (além de restauração imediata de estoque em status síncrono `rejected`/`cancelled`).
3. **Resiliência de webhook e feedback ao usuário:** Normalizar `data.id` em minúsculas no manifesto HMAC-SHA256, evitar colisão de `event_key` quando `body.id` estiver ausente, impedir dupla restauração via `stock_restored`, impedir downgrade por notificações atrasadas de pendência, mesclar `mp_payload` sem apagar QR Code/linha digitável e centralizar mensagens de status (`status_detail`) em `lib/payment/payment-status-messages.js` para `/checkout/[id]` e `/minha-conta`.

## Alternativas consideradas

- **Criar nova migração alterando as tabelas no banco para os nomes usados nos domínios:** descartada por exigir alteração de tabelas recém-criadas pela migração `023`, de `lib/crud/crud.js` e de `scripts/validate-schema.js`, enquanto manter `address_json`, `shipping_address`, `mp_payload` e `event_key` no banco já está consistente em toda a camada de infra.
- **Migrar tudo para Checkout Pro (redirecionamento):** descartada por violar a especificação arquitetural da Modalidade B (`docs/ARQUITETURA_SITE_PUBLICO.md` §3.5 e ADR-0037), que determina Checkout Transparente no próprio site.

## Consequências

### Positivas

- Checkout, login Google, persistência de endereço, atualização de pedidos e webhooks funcionam de ponta a ponta sobre o PostgreSQL real e `npm run validate-schema` permanece sincronizado.
- Nenhuma falha de gateway ou recusa imediata vaza estoque; cartões são tokenizados diretamente junto ao Mercado Pago via HTTPS.
- Mensagens claras em `pt-BR` para erros de credencial (ex.: token `APP_USR-` usado em `test_user` em vez de `TEST-` Sandbox), recusas por motivo (`cc_rejected_*`), QR Code PIX e boleto bancário.

### Negativas e riscos

- O processamento de cartão com tokenização oficial depende da disponibilidade do script externo `https://sdk.mercadopago.com/js/v2` e de `NEXT_PUBLIC_MP_PUBLIC_KEY` configurada em produção/homologação.
- No ambiente Sandbox do Mercado Pago, `POST /v1/payments` exige credenciais de teste (`TEST-...` com `live_mode: false`) caso o vendedor seja `test_user`, devendo ser validado novamente após a substituição das chaves no `.env` de homologação/testes.

## Revisão

Reavaliar após a substituição das credenciais Sandbox `TEST-` no ambiente de testes ou caso o projeto decida adotar Payment Brick gerenciado completo no lugar dos campos nativos tokenizados via SDK v2.
