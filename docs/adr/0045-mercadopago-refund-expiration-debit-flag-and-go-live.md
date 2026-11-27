# ADR-0045: Controle comercial de debit_card, estorno opt-in via Orders API, expiração de pedidos abandonados e preflight de produção HTTPS

- **Status:** Aceito
- **Data:** 2026-11-26
- **Decisores:** Equipe / Dono do Projeto
- **Relacionados:** ADR-0037, ADR-0038, ADR-0039, ADR-0040, ADR-0041, ADR-0044, `lib/payment/mercadopago.js`, `lib/payment/payment-status-messages.js`, `lib/domain/orders.js`, `pages/checkout/[id].js`, `pages/api/checkout.js`, `pages/api/admin/orders.js`, `components/Admin/AdminSales.js`, `scripts/check-env.js`, `scripts/maintenance/expire-abandoned-orders.js`, `scripts/maintenance/check-mp-production-readiness.js`

## Contexto

Com os diagnósticos estruturais e de segurança de webhooks da auditoria Ciclo 2 concluídos no [ADR-0044](0044-mercadopago-hardening-webhook-idempotency-and-modality-isolation.md), restavam quatro decisões de produto e preparação operacional registradas em `docs/melhoria_mercadopago.md` (§10 e §11) antes da virada para produção HTTPS (`live_mode: true`):

1. **Cartão de débito (`debit_card`):** `pages/checkout/[id].js` exibia a opção incondicionalmente e `pages/api/checkout.js` aceitava `debit_card` em qualquer cenário, expondo o comprador a erro tardio `payment_method_not_allowed_for_collector` caso a conta recebedora do Mercado Pago não tivesse débito direto habilitado comercialmente.
2. **Estorno via `/admin` (`POST /v1/orders/{id}/refund`):** `updateAdminOrder` (`lib/domain/orders.js`) devolvia o estoque e alterava apenas `order_status = 'cancelled'`, sem integração de estorno financeiro com a Orders API do Mercado Pago e sem distinguir explicitamente entre cancelamento puramente logístico e estorno no gateway.
3. **Pedidos `awaiting_payment` abandonados:** pedidos PIX ou boleto cujo webhook `order.canceled`/`expired` não chegasse mantinham o estoque reservado indefinidamente com `stock_restored = false`.
4. **Preflight automatizado de produção HTTPS:** faltava um verificador executável que validasse credenciais `APP_USR-`, paridade de flags, URL HTTPS definitiva do webhook (rejeitando `localhost`/túneis/HTTP), proxies (`TRUST_PROXY`), Redis e autoteste criptográfico HMAC-SHA256 v2 antes da virada.

## Decisão

Vamos resolver as quatro definições operacionais preservando compatibilidade com o schema atual do PostgreSQL e proteção financeira estrita:

1. **Habilitação comercial configurável de `debit_card`:** adicionamos `isDebitCardEnabled()` em `lib/payment/payment-status-messages.js` lendo `MP_ENABLE_DEBIT_CARD` em `pages/api/checkout.js` (recusa `HTTP 400` quando desabilitada) e `NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD` em `pages/checkout/[id].js` (oculta o botão de débito e força fallback para `pix`, exibindo orientação discreta quando habilitado). O padrão quando as variáveis não são definidas permanece `true` para retrocompatibilidade.
2. **Estorno explícito via Orders API no `/admin` (`opt-in` obrigatório):** adicionamos `refundMercadoPagoOrder()` em `lib/payment/mercadopago.js` (`POST /v1/orders/{id}/refund` com `X-Idempotency-Key` e emulação controlada em sandbox local), `getAdminOrderById()` e suporte transacional em `updateAdminOrder()` (`lib/domain/orders.js`), e opção `refund_payment: true` em `PUT /api/admin/orders` e no modal de `components/Admin/AdminSales.js`. Cancelar um pedido `approved` **nunca** estorna automaticamente sem que o operador marque expressamente o checkbox de estorno; se cancelar sem estorno via API, `mp_payload.needs_manual_refund = true` é registrado para rastreabilidade. O estorno via API também pode ser acionado para pedidos já cancelados que ainda estejam `approved` (sem violar a trava `ORDER_CANCELLED_CANNOT_REOPEN`).
3. **Expiração automática anti-falso-cancelamento de pedidos `awaiting_payment`:** implementamos `expireAbandonedOrders()` em `lib/domain/orders.js` respeitando `date_of_expiration` do gateway ou TTL por modalidade (24h padrão para PIX/cartão e 120h para boleto), com **reconciliação prévia obrigatória** contra a API do Mercado Pago (injeção de `fetchMercadoPagoPaymentDetails`) quando configurada: se o pedido já constar `approved` no gateway, ele é promovido a `paid` em vez de cancelado; falhas de consulta abortam o cancelamento daquele item (`fail-safe`); e a devolução de estoque ocorre apenas uma vez sob `SELECT ... FOR UPDATE`. Exposta via `npm run orders:expire` (`scripts/maintenance/expire-abandoned-orders.js`) e via botão `"Expirar vencidos"` em `AdminSales.js` (`PUT /api/admin/orders` com `action: 'expire_abandoned'`).
4. **Checklist automatizado e preflight HTTPS (`live_mode: true`):** estendemos `validateMercadoPagoEnv()` em `scripts/check-env.js` (sinalizando chaves `TEST-` em `NODE_ENV=production` e divergência de flags `debit_card`) e criamos `scripts/maintenance/check-mp-production-readiness.js` (`npm run mp:preflight`), que valida URL HTTPS pública, segredos sem imprimir seus valores, `TRUST_PROXY`, Upstash e executa autoteste HMAC-SHA256 v2 com replay expirado e adulteração.

## Alternativas consideradas

- **Remover `debit_card` em código fixo (hardcoded):** descartado, pois exigir novo deploy para habilitar ou desabilitar o meio conforme negociação comercial com o Mercado Pago reduz flexibilidade operacional.
- **Estornar automaticamente todo pedido `approved` cancelado no `/admin`:** descartado pelo risco financeiro irreversível em cancelamentos apenas operacionais ou testes administrativos; optou-se por `opt-in` explícito no modal e sinalização `needs_manual_refund` no caso inverso.
- **Expirar pedidos apenas por query SQL `UPDATE ... WHERE created_at < ...` sem consultar o Mercado Pago:** descartado porque um PIX/boleto cujo webhook tenha falhado poderia ser cancelado indevidamente mesmo já tendo sido pago pelo cliente no banco/gateway.

## Consequências

### Positivas

- Operação comercial flexível de `debit_card` em frontend e backend sem drift de comportamento.
- Operadores do `/admin` conseguem estornar cobranças reais diretamente do modal com trilha de auditoria (`ESTORNAR E CANCELAR PEDIDO`) e zero alteração no schema PostgreSQL.
- Estoque retido em checkouts abandonados pode ser recuperado com segurança via cron (`npm run orders:expire`) ou painel sem risco de cancelar vendas pagas.
- Virada para produção ganha portão automatizado verificável em linha de comando antes e após o deploy HTTPS.

### Negativas e riscos

- Alterar `NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD` exige rebuild do frontend Next.js (inlining em build time), mitigado pelo aviso cruzado em `scripts/check-env.js` e `npm run mp:preflight`.
- A execução contínua da expiração depende do agendamento periódico (cron/worker) de `npm run orders:expire` no host de produção ou acionamento periódico pelo operador em `"Expirar vencidos"`.
- A validação real em `live_mode: true` (credenciais `APP_USR-`, webhook HTTPS definitivo e estorno financeiro em transação real controlada) só pode ocorrer fora do ambiente local após configurar domínio HTTPS e painel do Mercado Pago.

## Revisão

Reavaliar após a homologação controlada em produção HTTPS (`live_mode: true`) e, caso haja necessidade futura de estornos parciais múltiplos ou janela de carência configurável via painel em tabela `settings`, avaliar extensão em novo ADR.
