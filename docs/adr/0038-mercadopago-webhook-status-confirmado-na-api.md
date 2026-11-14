# ADR-0038: Webhook do Mercado Pago só aprova pedido com status confirmado na API

- **Status:** Aceito
- **Data:** 2026-11-12
- **Decisores:** Dono do projeto
- **Relacionados:** [ADR-0037](0037-internal-sales-mercadopago-and-customer-accounts.md), `pages/api/webhooks/mercadopago.js`, `lib/payment/mercadopago.js`, `lib/domain/orders.js`

## Contexto

O endpoint `/api/webhooks/mercadopago` (ADR-0037) valida a assinatura e depois decidia o status do pagamento assim: usava `payment_status`/`data.status` do corpo, se existissem; senão, consultava `GET /v1/payments/{id}` quando havia `MP_ACCESS_TOKEN`; e, em qualquer outro caso, **assumia `'approved'`**.

Em `processMercadoPagoWebhookEvent` (`lib/domain/orders.js`), o status `approved` muda o pedido para `paid` e baixa o estoque. O padrão `'approved'` criava três caminhos para aprovar sem confirmação:

1. Consulta à API falhando (resposta não-OK) mantinha `'approved'`.
2. Falha de rede na consulta lançava exceção sem tratamento específico, sem ligação clara com o reenvio do evento.
3. Um corpo com `status: 'approved'` era aceito como verdade, embora o corpo do webhook não seja a fonte oficial do status.

Além disso, eventos que não são de pagamento (ex.: `merchant_order`) têm outro tipo de `data.id` e também caíam nesse fluxo.

## Decisão

- Em **produção** (`NODE_ENV=production`) o status vem **sempre** de `GET /v1/payments/{id}`, via `fetchMercadoPagoPaymentStatus` (timeout de 8 s). O status enviado no corpo é ignorado.
- Se o status não puder ser confirmado, o webhook **não processa o evento** e responde **502** (falha na API do Mercado Pago, rede, timeout ou resposta sem status) ou **503** (`MP_ACCESS_TOKEN` ausente). O Mercado Pago reenvia o evento automaticamente.
- **Fora de produção:** um status explícito no corpo continua aceito (testes e simulações); havendo token e sem status no corpo, consulta a API; sem token e sem status, vale o modo sandbox local (`approved`).
- Eventos que não são de pagamento (`type` diferente de `payment` ou `action` fora de `payment.*`) recebem **200 `{ received: true, ignored: true }`** sem processamento.

## Alternativas consideradas

- **Manter o padrão `'approved'` com log de aviso:** descartada, pois mantém o risco de pedido pago sem pagamento real.
- **Responder 200 e reconciliar depois por job:** descartada, pois não existe job de reconciliação e o reenvio nativo do Mercado Pago cobre o caso sem infraestrutura nova.
- **Confiar no corpo quando a assinatura é válida:** descartada, pois a assinatura prova a origem da notificação, não a veracidade de campos de status que o fluxo oficial não documenta como fonte.

## Consequências

### Positivas

- Nenhum pedido passa a `paid` sem confirmação na API do Mercado Pago.
- Falhas transitórias deixam de ser perdidas ou aprovadas por engano: viram reenvio.
- Eventos `merchant_order` deixam de ser interpretados como pagamentos.

### Negativas e riscos

- Uma indisponibilidade prolongada da API do Mercado Pago atrasa a aprovação dos pedidos até o reenvio (o Mercado Pago limita o número de tentativas).
- Em produção, token ausente ou revogado faz todo webhook responder 503, o que só se resolve corrigindo a variável de ambiente.
- Simular aprovação em produção exige um pagamento real ou de teste no Mercado Pago, e não mais um corpo manual.

## Revisão

Reavaliar se for criado um job de reconciliação de pedidos `awaiting_payment`, ou se o Mercado Pago passar a documentar o status como parte assinada da notificação.
