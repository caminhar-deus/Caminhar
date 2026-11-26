# ADR-0044: Endurecimento do webhook Mercado Pago, isolamento estrito de modalidade e idempotência de checkout

- **Status:** Aceito
- **Data:** 2026-11-26
- **Decisores:** Equipe / dono do projeto Caminhar
- **Relacionados:** ADR-0037, ADR-0038, ADR-0039, ADR-0040, ADR-0041, `docs/melhoria_mercadopago.md` (`MP-DIAG-01` a `MP-DIAG-11`), `pages/api/webhooks/mercadopago.js`, `lib/payment/mercadopago.js`, `lib/domain/orders.js`, `lib/domain/products.js`, `pages/api/checkout.js`, `pages/checkout/[id].js`, `pages/api/products.js`, `pages/api/admin/internal-products.js`, `pages/api/admin/orders.js`

## Contexto

A auditoria semanal Ciclo 2 da integração com o Mercado Pago (`docs/melhoria_mercadopago.md`, `23/11/2026`) identificou lacunas arquiteturais distribuídas entre recepção de webhooks, isolamento de produtos por modalidade, higiene PCI-DSS e consistência transacional de pedidos/estoque:

1. **`POST /api/webhooks/mercadopago`** não possuía rate limiting, aceitava timestamps (`ts`) antigos indefinidamente na assinatura HMAC-SHA256 e descartava `externalReference`/`statusDetail`/`mpTransactionId` retornados por `fetchMercadoPagoPaymentDetails`, lendo metadados do corpo não autenticado da requisição.
2. **`processMercadoPagoWebhookEvent`** gravava `event_key` em `payment_webhook_events` antes de localizar o pedido e devolvia `HTTP 200` mesmo quando o pedido ainda não estava visível em condição de corrida (`!current`), queimando a chave idempotente e impedindo retentativas do Mercado Pago.
3. **Mutação cruzada de modalidades de produtos:** `PUT`, `DELETE` e `reorder` em `/api/products` e `/api/admin/internal-products` filtravam apenas por `id` sem restringir `modality` (`'external'` vs `'internal'`), permitindo que operadores com apenas uma das permissões alterassem produtos da modalidade oposta.
4. **Checkout e máquina de estados:** faltava trava contra duplicação acidental de pedidos por duplo clique/retry (`X-Idempotency-Key`), proteção contra downgrade de `refunded`/`charged_back`, tratamento de aprovação tardia após cancelamento, bloqueio de reabertura administrativa de pedido cancelado e trava de origem local no fallback `/v1/card_tokens`.
5. **Padronização administrativa:** `pages/api/admin/orders.js` e `pages/api/admin/internal-products.js` replicavam `requireAuth`/`requireSalesPermission` manualmente fora de `createAdminHandler`, e `GET /api/admin/orders` não aplicava rate limiting nem limite em `search`.

## Decisão

Adotar o seguinte conjunto coeso de invariantes de integração e segurança sem alterar o schema do banco de dados:

1. **Webhook autoritativo, limitado por taxa, anti-replay temporal e resiliente a corrida:**
   - Aplicar rate limit de `120 req/min` (`api:webhooks:mercadopago`) e exigir `ts` numérico dentro da janela de `±900s` (15 minutos) em `verifyMercadoPagoWebhookSignature` (suportando `ts` em segundos ou milissegundos).
   - Substituir `fetchMercadoPagoPaymentStatus` por `fetchMercadoPagoPaymentDetails` em `pages/api/webhooks/mercadopago.js`, ignorando `external_reference` e detalhes vindos do corpo não autenticado quando a API do Mercado Pago é consultada.
   - Em `processMercadoPagoWebhookEvent`, localizar e travar o pedido (`SELECT ... FOR UPDATE`) **antes** de inserir `event_key` em `payment_webhook_events`: caso o pedido não exista ainda (`!current`), não inserir `event_key` e responder `HTTP 503` (`retryable: true`) para acionar a fila de reenvio do Mercado Pago. Invalidar `products:*` apenas quando houver alteração efetiva de estoque (`stockChanged`).
2. **Isolamento estrito de modalidade no domínio e rotas de produtos:**
   - Adicionar `{ expectedModality }` em `updateProduct` e `deleteProduct` (`lib/domain/products.js`) e exigir correspondência exata de `modality` (`'external'` em `/api/products` e `'internal'` em `/api/admin/internal-products`) em `GET`, `POST`, `PUT`, `DELETE` e `reorder`.
3. **Idempotência de checkout por tentativa (`X-Idempotency-Key`) e higiene PCI:**
   - Exigir `X-Idempotency-Key` gerada pelo cliente por tentativa em `pages/checkout/[id].js` e processada em `pages/api/checkout.js` via `getOrSetCache` com TTL de `300s` (single-flight em memória + Redis, validando divergência de parâmetros com `HTTP 409` e sem cachear erros de domínio/gateway).
   - Restringir fallback direto `/v1/card_tokens` estritamente a `NODE_ENV !== 'production'` em `http://localhost` / `127.0.0.1`, limpar campos sensíveis do cartão no navegador ao finalizar/alternar meio e rejeitar `cardNumber` bruto com `HTTP 400` no servidor quando o Mercado Pago estiver ativo.
4. **Máquina de estados terminal, recuperação de estoque e padronização `createAdminHandler`:**
   - Bloquear downgrade de `refunded`/`charged_back`, tratar aprovação tardia sobre pedido cancelado (re-reservando estoque atomicamente via `stock >= $1` ou marcando `needs_manual_refund: true` com `logger.error`), impedir reabertura administrativa de pedido cancelado (`ORDER_CANCELLED_CANNOT_REOPEN` → `HTTP 409`), invalidar `products:*` em cancelamentos com devolução de estoque, e migrar `admin/orders.js` e `admin/internal-products.js` para `createAdminHandler`.

## Alternativas consideradas

- **Armazenar chave de idempotência do checkout em nova coluna `orders.idempotency_key` no PostgreSQL:** exigiria migration no schema e alteração de `EXPECTED_SCHEMA`; optou-se por `getOrSetCache` com chave escopada por cliente (`checkout:idem:<customerId>:<key>`) e TTL de 5 minutos, atendendo janela de duplo clique/retry sem acoplamento permanente de schema (reavaliável se houver demanda de idempotência multi-dia).
- **Janela estrita de 5 minutos (`300s`) para `ts` no webhook:** descartada por risco de rejeitar reenvios legítimos do Mercado Pago caso o mesmo timestamp assinado seja reenviado com pequeno atraso de fila; adotados `900s` (15 min) combinados com a reconciliação ativa (`ADR-0041`) como rede de segurança.

## Consequências

### Positivas

- Elimina exposição a replay indefinido e amplificação outbound no webhook, garantindo que metadados financeiros e recuperação de corrida venham apenas da API oficial do Mercado Pago.
- Garante isolamento 100% server-side entre Modalidade A (`Gestão de Produtos`) e Modalidade B (`Gestão de Vendas`).
- Unifica autenticação, RBAC fail-closed e logs com `requestId` de todas as 18 rotas `/api/admin/*` sob `createAdminHandler`.

### Negativas e riscos

- Retries muito tardios do Mercado Pago (`> 15 min`) que reutilizem `ts` original antigo serão rejeitados com `401`, passando a depender da reconciliação ativa em `/api/customer/orders` e `/api/admin/orders` (com cooldown de 15s e bypass manual `force=1`/`sync=1`).
- Em ambiente local sem HTTPS fora de `localhost`/`127.0.0.1` (ex.: IP de rede local), a tokenização de cartão exige túnel HTTPS válido ou acesso via `localhost`.

## Revisão

Reavaliar esta decisão caso o volume de pedidos exija persistência de idempotência do checkout superior a 5 minutos (nova coluna indexada em `orders`) ou caso haja troca da forma de assinatura/timestamp nos webhooks da Orders API do Mercado Pago.
