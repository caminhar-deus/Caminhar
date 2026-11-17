# ADR-0041: Reconciliação ativa de pagamentos pendentes e fallback de webhook por referência externa

- **Status:** Aceito
- **Data:** 2026-11-14
- **Decisores:** Gus (dono do projeto), Antigravity
- **Relacionados:** [ADR-0037](0037-internal-sales-mercadopago-and-customer-accounts.md), [ADR-0038](0038-mercadopago-webhook-status-confirmado-na-api.md), [ADR-0040](0040-integracao-mercadopago-orders-api.md), [`lib/payment/reconcile-orders.js`](../../lib/payment/reconcile-orders.js), [`lib/payment/mercadopago.js`](../../lib/payment/mercadopago.js), [`lib/domain/orders.js`](../../lib/domain/orders.js), [`pages/api/webhooks/mercadopago.js`](../../pages/api/webhooks/mercadopago.js), [`pages/api/customer/orders.js`](../../pages/api/customer/orders.js), [`pages/api/admin/orders.js`](../../pages/api/admin/orders.js), [`pages/checkout/[id].js`](../../pages/checkout/[id].js), [`components/Admin/AdminSales.js`](../../components/Admin/AdminSales.js)

## Contexto

Durante a validação de pagamento PIX na Orders API (`/v1/orders`) em ambiente local (`http://localhost:3000`), observou-se um pedido em status `pending` / `awaiting_payment` no PostgreSQL local embora a ordem correspondente no sandbox do Mercado Pago já estivesse `processed` com `status_detail: "accredited"`. A tabela `payment_webhook_events` encontrava-se vazia porque a nuvem do Mercado Pago não consegue entregar webhooks assíncronos para `localhost` sem túnel HTTPS público. Além disso:

1. As rotas `GET /api/customer/orders` e `GET /api/admin/orders` apenas liam o estado persistido no PostgreSQL, sem consultar o Mercado Pago para pedidos ainda transitórios (`pending`, `in_process`, `authorized`).
2. A página de confirmação `/checkout/[id]` não realizava polling nem oferecia ação explícita para verificar o pagamento PIX/em análise em segundo plano.
3. O handler `/api/webhooks/mercadopago` mantinha mapeamento duplicado fora de `lib/payment/mercadopago.js`, não aproveitava `external_reference` como fallback seguro em condição de corrida e não mesclava `status_detail`, `mp_order_status` e `mp_transaction_id` no `mp_payload`.

## Decisão

Adotamos um mecanismo de **reconciliação ativa (pull) complementar aos webhooks (push)** e reforçamos o mapeamento e a idempotência da Orders API:

1. **Módulo compartilhado de reconciliação (`lib/payment/reconcile-orders.js`):** `reconcilePendingOrders(orders, { maxOrders = 5 })` consulta `fetchMercadoPagoPaymentDetails` apenas para pedidos em estados transitórios (`pending`, `in_process`, `authorized`) com `mp_payment_id` real do Mercado Pago (ignorando mocks `mp_*` e retornando sem efeito quando `MP_ACCESS_TOKEN` não estiver definido). Alterações de status ou metadados são persistidas via transação com lock `FOR UPDATE` em `syncOrderPaymentStatus` (`lib/domain/orders.js`), invalidando o cache `products:*` apenas quando há restauração de estoque.
2. **Integração nas rotas de leitura e sincronização explícita:**
   - `GET /api/customer/orders` ganhou consulta unitária por `?orderId=<id>` (estritamente escopada ao `customerId` autenticado) e reconciliação automática, com bypass opcional `?sync=0`.
   - `GET /api/admin/orders` aplica `reconcilePendingOrders` por padrão (`sync !== '0'`) e registra ação de auditoria `SINCRONIZAR PEDIDOS MP` quando `?sync=1` atualiza pedidos, preservando o contrato existente de `POST /api/admin/orders` retornar `405` (`tests/integration/api/admin/orders.test.js`).
3. **UX de acompanhamento no checkout e no painel:** `/checkout/[id]` exibe o botão **"Verificar pagamento agora"** e executa polling a cada 5s (máximo de 36 ciclos, apenas com aba visível) para PIX e status em análise; `AdminSales` adiciona o botão **"Sincronizar MP"** (`?sync=1`) e rótulos para `authorized` e `charged_back` (também adicionados em `/minha-conta`).
4. **Unificação do parser e fallback no webhook:** `mapMercadoPagoStatus` foi exportada e centralizada em `lib/payment/mercadopago.js`; `/api/webhooks/mercadopago` passou a reutilizá-la, extrair `external_reference`, `status_detail`, `mp_order_status` e `mp_transaction_id`, e `processMercadoPagoWebhookEvent` aceita `externalReference` numérico somente quando a busca por `mp_payment_id` não encontra linha e o pedido alvo não possui outro `mp_payment_id` conflitante.
5. **Utilitários de homologação de webhook e túnel (`scripts/maintenance/verify-mp-webhook.js` e `scripts/maintenance/start-webhook-tunnel.sh`):** adicionados em 2026-11-16 e validados ao vivo em 2026-11-17 com túnel HTTPS `cloudflared` (`trycloudflare.com`) e disparo real do painel do Mercado Pago (gravado em `payment_webhook_events`, `id = 14` e `id = 16`), reutilizando `verifyMercadoPagoWebhookSignature` de `lib/payment/mercadopago.js` e cobertos por `tests/unit/scripts/verify-mp-webhook.test.js`.

## Alternativas consideradas

- **Dependência exclusiva de webhooks + túnel HTTPS local (ngrok/cloudflared):** descartada como solução única porque exige ferramenta externa sempre ativa em desenvolvimento e deixa pedidos desatualizados em produção caso algum webhook atrase ou falhe. A reconciliação ativa convive com webhooks e túneis sem conflito.
- **Criar `POST /api/admin/orders` para disparo de sincronização:** descartada porque o contrato testado da rota proíbe `POST` (`HTTP 405`). Usar `GET /api/admin/orders?sync=1` preservou a API e sua suíte de integração intactas.
- **Worker/cron separado em processo background:** descartada por introduzir infraestrutura extra desnecessária para a escala atual (Next.js serverless/monólito sem fila dedicada).

## Consequências

### Positivas

- Pedidos PIX e pagamentos em análise passam a refletir aprovações, recusas ou estornos mesmo sem entrega de webhook em `localhost` ou em caso de atraso de notificação na nuvem.
- Transição de status e restauração de estoque compartilham a mesma função transacional atômica (`applyPaymentStatusTransition`), evitando divergências entre push (webhook) e pull (reconciliação).
- Preservação do `qr_code` e dados de pagamento existentes em `mp_payload` ao mesclar novos detalhes do Mercado Pago.

### Negativas e riscos

- Listagens com até `maxOrders = 5` pedidos pendentes recentes fazem chamadas HTTP paralelas à API do Mercado Pago (mitigado por timeout de 8s, tratamento tolerante a falha sem bloquear a listagem e parâmetro `?sync=0`).
- Sem um túnel HTTPS público ou domínio acessível na internet, testes específicos de entrega de webhook real pelo Mercado Pago em `localhost` ainda dependem de simulação assinada ou túnel.

## Revisão

Reavaliar se o volume simultâneo de pedidos em aberto exigir redução de `maxOrders`, cache curto de status de transação ou adoção de fila/cron dedicado quando o site operar com alta concorrência em produção.
