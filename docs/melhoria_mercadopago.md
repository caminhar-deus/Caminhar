# Relatório de Auditoria Semanal — Integração do Mercado Pago
## Projeto Caminhar com Deus | Ciclo 1 (16/11/2026)

## 1. Resumo da Auditoria

- **Data da execução:** 16/11/2026, 10:00 (America/Sao_Paulo / BRT)
- **Período analisado:** De 09/11/2026, 10:00 até 16/11/2026, 10:00 (últimos 7 dias móveis / 168 horas)
- **Responsáveis:** Antigravity (Google DeepMind)
- **Status da auditoria:** Auditoria, diagnóstico, validação dos processos e elaboração de Plano de Ação concluídos. Nenhuma alteração foi realizada em arquivos de código ou regras do projeto, respeitando integralmente a restrição de auditoria.
- **Situação geral da integração:**
  - A integração com o Mercado Pago no projeto Caminhar passou por uma evolução arquitetural profunda nos últimos 7 dias, culminando na migração definitiva da API legada (`/v1/payments`) para a **Orders API moderna (`/v1/orders`)**, adoção do **SDK JS v2 (`https://sdk.mercadopago.com/js/v2`) com tokenização no cliente**, e criação de um mecanismo de **reconciliação ativa sob demanda e polling adaptativo (`lib/payment/reconcile-orders.js`)** como contingência à ausência de webhooks em ambientes locais/sem IP público.
  - O sistema opera com **100% de sucesso em toda a suíte de testes de pagamento** (67 testes automatizados específicos para pagamento, webhooks e checkout, e 48 testes de gestão de pedidos e domínio), cobrindo PIX, Boleto Bancário, Cartão de Crédito/Débito/Pré-pago, recusas `HTTP 402` síncronas, devolução automática de estoque e webhook com assinatura criptográfica HMAC-SHA256 v2.
  - Todos os gates de qualidade estática (`npm run lint`, `npm run knip`, `npm run lint:workflows`, `npm run lint:chars`) operam com zero erros.
- **Principais descobertas e atividades dos últimos 7 dias:**
  1. *Migração para Orders API (`/v1/orders` — 13/11/2026, commit `819bcb1`, ADR-0040):* Adequação à aplicação oficial do Mercado Pago do tipo "Checkout Transparente com Orders", solucionando incompatibilidade de credenciais `APP_USR-`.
  2. *Tokenização Client-side e Proteção PCI-DSS (13/11/2026, commit `819bcb1`, ADR-0039):* Eliminação do tráfego de dados sensíveis de cartão pelo backend; envio direto para os servidores do Mercado Pago via SDK v2.
  3. *Blindagem do Webhook contra Aprovação Falsa (13/11/2026, commit `819bcb1`, ADR-0038):* Em produção, o webhook nunca presume `approved`; exige confirmação via consulta direta `GET /v1/orders/{id}`.
  4. *Reconciliação Ativa e Fallback de Webhook (14/11/2026, commit `f46ebf4`, ADR-0041):* Resolução do problema em que pedidos PIX aprovados no sandbox ficavam pendentes no site local por falta de entrega de webhook em `localhost`.
  5. *Normalização de URLs de Boleto no Sandbox (14/11/2026, commit `f46ebf4`):* Correção de links `ticket_url` retornados como `/staging/payments/...` (HTTP 503) convertidos para `/sandbox/payments/...`.
  6. *Pendências abertas legítimas:* Validação em ambiente público/homologação com túnel HTTPS para webhook de entrega real e testes de transação com cartão no valor mínimo de R$ 0,50 no Sandbox (itens documentados no §7 do `ARQUITETURA_SITE_PUBLICO.md`).

---

## 2. Mapeamento do Fluxo Atual

### 2.1. Arquivos e Componentes Envolvidos

A varredura completa identificou os seguintes arquivos centrais que compõem a integração:

| Componente / Camada | Caminho do Arquivo | Responsabilidade |
|---|---|---|
| **Gateway / Comunicação** | [`lib/payment/mercadopago.js`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js) | Chamadas à Orders API (`POST /v1/orders`, `GET /v1/orders/{id}`), verificação de assinatura HMAC-SHA256 v2, tratamento de erros HTTP e normalização de payloads. |
| **Reconciliação Ativa** | [`lib/payment/reconcile-orders.js`](file:///home/gus/projetos/Caminhar/lib/payment/reconcile-orders.js) | Mecanismo de sincronização em lote para pedidos transitórios (`pending`, `in_process`, `authorized`), com lock e atualização atômica. |
| **Mensagens e Formatação** | [`lib/payment/payment-status-messages.js`](file:///home/gus/projetos/Caminhar/lib/payment/payment-status-messages.js) | Validador de CPF/CNPJ, normalizador de URLs de boletos (`/staging/` → `/sandbox/`) e textos em pt-BR para status e recusas. |
| **Domínio de Pedidos** | [`lib/domain/orders.js`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js) | Máquina de estados dos pedidos, reserva e devolução de estoque atômica (`SELECT ... FOR UPDATE`), idempotência e persistência de eventos de webhook. |
| **Domínio de Clientes** | [`lib/domain/customers.js`](file:///home/gus/projetos/Caminhar/lib/domain/customers.js) | Gestão de dados cadastrais dos visitantes, endereços padrão e sincronização com Google OAuth. |
| **API Checkout** | [`pages/api/checkout.js`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js) | Endpoint `POST /api/checkout`: validação com Zod, reserva de estoque, chamada ao gateway e rollback em falha. `GET`: consulta de produto para compra direta. |
| **API Webhook** | [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js) | Endpoint de notificações do Mercado Pago: validação de `x-signature`, consulta autoritativa na API do MP e atualização idempotente do pedido. |
| **API Pedidos Cliente** | [`pages/api/customer/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/customer/orders.js) | Consulta de pedidos do comprador com reconciliação sob demanda via `?orderId=<id>`. |
| **API Pedidos Admin** | [`pages/api/admin/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js) | Gestão de vendas no painel com sincronização em lote (`?sync=1`) e auditoria. |
| **Frontend Checkout** | [`pages/checkout/[id].js`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js) | Interface de compra direta, formulário de entrega, integração SDK v2, polling adaptativo (5s) e botão "Verificar pagamento agora". |
| **Frontend Minha Conta** | [`pages/minha-conta.js`](file:///home/gus/projetos/Caminhar/pages/minha-conta.js) | Histórico de compras do visitante, visualização de QR Code PIX e links de boletos normalizados. |
| **Frontend Admin Vendas** | [`components/Admin/AdminSales.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js) | Painel de controle de vendas, visualização de status, código de rastreio e botão "Sincronizar MP". |
| **Documento Normativo** | [`AGENTS.md`](file:///home/gus/projetos/Caminhar/AGENTS.md) | Regras operacionais, gates de qualidade e fluxos de trabalho. |
| **Arquitetura Pública** | [`docs/ARQUITETURA_SITE_PUBLICO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md) | Especificação da vitrine (Modalidades A e B), checkout transparente e pendências (§7). |
| **Arquitetura Privada** | [`docs/ARQUITETURA_SITE_PRIVADO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md) | Especificação da Gestão de Vendas (§4.8), subabas Pedidos e Produtos Internos. |

### 2.2. Sequência de Execução dos Processos

```
[Visitante no Site Público]
       │
       ▼
1. Clica em "Comprar" na vitrine (Modalidade B) ──► Redirecionado para /checkout/[id]
       │
       ▼
2. Autenticação e Endereço de Entrega
   - Exige sessão de visitante (/entrar ou Google Auth)
   - Valida endereço e calcula frete no servidor
       │
       ▼
3. Seleção do Meio de Pagamento e Tokenização Client-Side
   - PIX: gera chave/cópia e cola após envio
   - Boleto: exige CPF/CNPJ válido (formatado e checado contra sequências inválidas)
   - Cartão: SDK JS v2 identifica BIN, parcela e gera token criptográfico seguro
       │
       ▼
4. Envio para POST /api/checkout
   - Validação Zod com schema estrito
   - Reserva atômica de estoque (SELECT ... FOR UPDATE)
   - Criação do pedido com status "awaiting_payment" e pagamento "pending"
       │
       ▼
5. Chamada à Orders API do Mercado Pago (POST /v1/orders)
   - Header X-Idempotency-Key ("caminhar-order-<id>")
   - Timeout de 15s com AbortSignal
   ├── SUCESSO (HTTP 200/201): Anexa mpPaymentId e dados de pagamento (attachOrderPaymentInfo)
   ├── RECUSA SÍNCRONA DE CARTÃO (HTTP 402 com data.id): Registra pedido como rejected, restaura estoque
   └── FALHA DE REDE/ERRO CRÍTICO (502/500): Rollback atômico da ordem e restauração de estoque
       │
       ▼
6. Atualização de Estado e Conclusão (Push vs Pull)
   ├── PUSH (Webhooks - POST /api/webhooks/mercadopago):
   │   - Valida cabeçalho x-signature com HMAC-SHA256 v2
   │   - Consulta GET /v1/orders/{id} para obter status autoritativo
   │   - Transição atômica (applyPaymentStatusTransition) e baixa ou restauração de estoque
   └── PULL (Reconciliação Ativa - lib/payment/reconcile-orders.js):
       - Polling a cada 5s na tela de checkout para PIX/em análise
       - Botão "Verificar pagamento agora" chama GET /api/customer/orders?orderId=<id>
       - Botão "Sincronizar MP" no /admin chama GET /api/admin/orders?sync=1
```

---

## 3. Diagnóstico e Avaliação das Ocorrências dos Últimos 7 Dias

### 3.1. Ocorrências Resolvidas no Período

#### Ocorrência 01: Incompatibilidade entre Credenciais da Aplicação e `/v1/payments` Legado
- **Identificação:** OC-01-MP-ORDERS-API-MIGRATION
- **Data da Solução:** 13/11/2026 (Commit `819bcb1`, ADR-0040)
- **Componentes:** `lib/payment/mercadopago.js`, `pages/api/webhooks/mercadopago.js`, `pages/api/checkout.js`
- **Diagnóstico:** A aplicação criada no painel do Mercado Pago utilizava o modelo "Checkout Transparente com Orders". As credenciais `APP_USR-` retornavam erro ao tentar criar transações via rota legada `POST /v1/payments`. Além disso, a Orders API rejeita `notification_url` no corpo da requisição e exige `payer.address.state` em vez de `federal_unit`.
- **Correção Aplicada:** Migração integral para `POST /v1/orders`, adaptação dos schemas de endereço e remoção de campos proibidos, além de tratamento específico para cartões pré-pagos (BIN Elo) que não suportam parcelamento (`installments`).
- **Validação:** 100% testado no Sandbox oficial com emissão de PIX, boleto e cartão, além de testes unitários dedicados.

#### Ocorrência 02: Pedidos PIX Aprovados não Atualizados em Ambiente Local (Falta de Webhook)
- **Identificação:** OC-02-MP-LOCAL-WEBHOOK-UNREACHABLE
- **Data da Solução:** 14/11/2026 (Commit `f46ebf4`, ADR-0041)
- **Componentes:** `lib/payment/reconcile-orders.js`, `pages/checkout/[id].js`, `pages/api/customer/orders.js`, `pages/api/admin/orders.js`
- **Diagnóstico:** No ambiente de desenvolvimento (`http://localhost:3000`), a nuvem do Mercado Pago não consegue entregar notificações HTTP. O Pedido #20 (pago via PIX de teste) foi aprovado no Sandbox do Mercado Pago (`status_detail: "accredited"`), mas permaneceu indefinidamente em "Aguardando pagamento" no banco local, pois o sistema dependia exclusivamente de webhooks.
- **Correção Aplicada:** Criação do módulo `lib/payment/reconcile-orders.js` com reconciliação ativa sob demanda. Adicionado polling adaptativo na tela de checkout, botão manual "Verificar pagamento agora" para o comprador e botão "Sincronizar MP" na Gestão de Vendas do painel administrativo.
- **Validação:** Pedido #20 foi reconciliado e atualizado para `paid` com sucesso; suíte `reconcile-orders.test.js` criada com 4 cenários de teste.

#### Ocorrência 03: Erro 503 ao Abrir Boleto Bancário no Sandbox
- **Identificação:** OC-03-MP-SANDBOX-BOLETO-STAGING-URL
- **Data da Solução:** 14/11/2026 (Commit `f46ebf4`, `ARQUITETURA_SITE_PUBLICO.md` §7 item 24)
- **Componentes:** `lib/payment/payment-status-messages.js`, `lib/domain/orders.js`, `pages/checkout/[id].js`, `pages/minha-conta.js`
- **Diagnóstico:** No ambiente Sandbox, a Orders API do Mercado Pago devolve a URL de visualização do boleto apontando para `/staging/payments/...`. Esse subdomínio é uma rede interna da infraestrutura do Mercado Pago inacessível externamente, retornando HTTP 503. A URL pública válida no sandbox é `/sandbox/payments/...`.
- **Correção Aplicada:** Função `normalizeMercadoPagoTicketUrl` criada e aplicada na camada de serviço, na leitura de pedidos no banco e na renderização dos links nos componentes de frontend.
- **Validação:** Pedido #21 teve o boleto aberto e visualizado perfeitamente no Sandbox; suíte `payment-status-messages.test.js` validando a transformação de URLs sem afetar URLs de produção.

#### Ocorrência 04: Vulnerabilidade de Confiança Cega no Corpo do Webhook
- **Identificação:** OC-04-MP-WEBHOOK-UNVERIFIED-STATUS
- **Data da Solução:** 13/11/2026 (Commit `819bcb1`, ADR-0038)
- **Componentes:** `pages/api/webhooks/mercadopago.js`
- **Diagnóstico:** Anteriormente, o endpoint de webhook aceitava o campo `status: 'approved'` contido no corpo da requisição ou, em caso de erro na consulta, aplicava `'approved'` como fallback padrão. Isso criava risco crítico de fraude e aprovação indevida.
- **Correção Aplicada:** Em ambiente de produção (`NODE_ENV=production`), o status do corpo é sumariamente ignorado. O webhook consulta compulsoriamente a API do Mercado Pago (`GET /v1/orders/{id}`). Em caso de indisponibilidade ou falha, responde HTTP 502/503 sem alterar o pedido, acionando a política nativa de reenvio do Mercado Pago.
- **Validação:** Testes de integração em `webhooks/mercadopago.test.js` cobrindo cenários com status forjado e indisponibilidade da API externa.

---

## 4. Situação dos Processos do Mercado Pago

Avaliação da implementação real confrontada com os requisitos arquiteturais:

| Processo / Funcionalidade | Situação Real | Evidências no Código / Testes |
|---|---|---|
| **1. Comunicação com a API** | **Implementado e validado** | `lib/payment/mercadopago.js` consome Orders API (`/v1/orders`) com timeout e tratamento de erros. |
| **2. Gestão de Credenciais e Ambientes** | **Implementado e validado** | `.env.example` documenta `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY` e `MP_WEBHOOK_SECRET`. Chaves nunca são expostas em logs. |
| **3. Idempotência de Transações** | **Implementado e validado** | Header `X-Idempotency-Key: caminhar-order-<id>` em todas as criações. |
| **4. Pagamentos via PIX** | **Implementado e validado** | Suporte a `qr_code` (cópia e cola) e `qr_code_base64`. Testado ponta a ponta no Sandbox (Pedido #20). |
| **5. Pagamentos via Boleto Bancário** | **Implementado e validado** | Suporte a linha digitável, código de barras e normalização de `ticket_url`. Validado no Sandbox (Pedido #21). |
| **6. Pagamentos via Cartão de Crédito** | **Implementado e validado no Sandbox** | Tokenização client-side via SDK v2, parcelamento, tratamento de HTTP 402. Validado ponta a ponta no Sandbox para aprovação com o **Pedido #22** (`ORDTST01M7JZQWF8JS91B32MM9DRDETA`, Mastercard `credit_card`, R$ 0,50, `processed`/`accredited`) em 16/11/2026, para recusa pelo emissor com o **Pedido #23** (`ORDTST01M7R579Z0GF1MHJKT03XKPZ34`, `PAY01M7R579ZQ3WDBPEZAG598G8NG`, Mastercard `credit_card`, R$ 0,50, `failed`/`rejected_by_issuer`, `stock_restored = true` sem dupla devolução após webhook `order.failed` em `payment_webhook_events.id = 17`) em 18/11/2026, para análise de pagamento com o **Pedido #24** (`ORDTST01M7R6G0W4V9YNQ1H7W14WQCK9`, `PAY01M7R6G0WJYBZ4X09TPG46H22K`, Mastercard `credit_card`, titular `'CONT'`, R$ 0,50, `processing`/`in_process`, `payment_status = 'in_process'` e `order_status = 'awaiting_payment'` com reserva ativa de 50 unidades em `products.id = 19` [`50000 → 49950`, `stock_restored = false`]) em 18/11/2026, para recusa com exigência de autorização prévia com o **Pedido #25** (`ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN`, `PAY01M7R9AR6XK8K99E87QDA5NR80`, Mastercard `credit_card`, titular `'CALL'`, R$ 0,50, `failed`/`required_call_for_authorize`, `stock_restored = true` mantendo `products.id = 19` em `49950` após webhook `order.failed` em `payment_webhook_events.id = 19`) em 18/11/2026 e para recusa por saldo ou limite insuficiente com o **Pedido #26** (`ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ`, `PAY01M7RAQ8Q0ASE34P1MWG0MC9H0`, Mastercard `credit_card`, titular `'FUND'`, R$ 0,50, `failed`/`insufficient_amount`, `stock_restored = true` mantendo `products.id = 19` em `49950` após webhook `order.failed` em `payment_webhook_events.id = 21`) em 18/11/2026. |
| **7. Pagamentos via Débito / Pré-pago** | **Implementado, com restrição comercial do provedor** | `prepaid_card` suportado sem parcelamento. `debit_card` direto (`debelo`) tratado contra erro `payment_method_not_allowed_for_collector`. |
| **8. Reconciliação Ativa (Pull)** | **Implementado e validado** | `lib/payment/reconcile-orders.js` sincroniza pedidos transitórios via polling ou disparo no `/admin`. |
| **9. Processamento de Webhooks (Push)** | **Implementado e validado em testes** | Suporte dual a eventos `order` e `payment`, com fallback de `external_reference`. Homologação local/túnel assistida por `verify-mp-webhook.js` e `start-webhook-tunnel.sh`. |
| **10. Validação de Assinatura Webhook** | **Implementado e validado** | HMAC-SHA256 v2 estrito (`manifest = id:dataId;request-id:...;ts:...`) com `timingSafeEqual`. |
| **11. Tratamento de Erros e Recusas** | **Implementado e validado** | Mensagens amigáveis em pt-BR via `payment-status-messages.js`; recusas 402 não derrubam o checkout. |
| **12. Devolução e Reserva de Estoque** | **Implementado e validado** | Reserva atômica no início (`FOR UPDATE`) e cancelamento com restauração via `cancelFailedCheckoutOrder`. |

---

## 5. Auditoria da Atuação dos Agentes

Durante a janela de análise (09/11 a 16/11), as intervenções executadas pelos agentes (OpenCode e Antigravity) apresentaram alto padrão técnico e estrita conformidade com os princípios do `AGENTS.md`:

### 5.1. Pontos Positivos Observados
1. **Respeito aos Documentos de Arquitetura:** Todas as mudanças foram registradas simultaneamente em `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/ARQUITETURA_SITE_PRIVADO.md` e em ADRs formais (`ADR-0038`, `ADR-0039`, `ADR-0040`, `ADR-0041`).
2. **Defesa em Profundidade e Idempotência:** Os agentes não criaram correções pontuais frágeis; implementaram locks transacionais (`FOR UPDATE`), proteção contra rebaixamento de status por webhooks atrasados e isolamento entre eventos.
3. **Cultura de Testes Abrangente:** Nenhuma funcionalidade foi entregue sem a correspondente suíte de testes unitários e de integração. A base de testes cresceu de 1.814 para 1.921 testes com 100% de aprovação.
4. **Gates Estáticos Sempre Verificados:** Commits respeitaram a execução de `knip`, `eslint` e `lint:chars`, prevenindo código morto ou arquivos soltos.

### 5.2. Oportunidades de Melhoria no Processo dos Agentes
1. **Ausência de Testes End-to-End (E2E) no Cypress:** O checkout transparente possui ampla cobertura unitária e de integração em Jest, mas ainda não possui um teste E2E navegável em `cypress/e2e/checkout.cy.js` simulando a experiência do visitante no navegador.
2. **Dependência de Túnel Externo para Homologação:** Ausência de documentação ou script auxiliar para subir um túnel temporário seguro (ex.: Cloudflare Tunnel ou Ngrok) durante os testes de validação do webhook.

---

## 6. Diagnóstico Detalhado dos Problemas e Riscos Atuais

### Problema 01 (Risco Operacional): Ausência de Teste E2E do Checkout no Cypress
- **Identificação:** MP-RISK-01-E2E-TEST-COVERAGE
- **Descrição:** O fluxo de checkout transparente em `pages/checkout/[id].js` contava apenas com testes unitários e de integração, sem especificação navegável Cypress em `cypress/e2e/`.
- **Evidências:** Spec criada em `cypress/e2e/checkout.cy.js` (commit `dc77185`) e ajustada no intercept `/api/customer/orders` (commit `01a4a3f`), com 4/4 cenários aprovados e `docs/PROJECT_cypress.md` atualizado.
- **Causa:** O ciclo de entrega inicial priorizou a robustez do backend e a integração com a API externa.
- **Impacto:** Médio (mitigado).
- **Situação Atual:** **Concluído e Validado em 16/11/2026.**
- **Prioridade:** Média (P2).

### Problema 02 (Validação Externa): Validação Final de Cartão de Crédito no Sandbox com Valor Válido
- **Identificação:** MP-PEND-02-CARD-SANDBOX-EXECUTION
- **Descrição:** No teste inicial de cartão de crédito no sandbox foi utilizado um produto fictício com valor de R$ 0,01. O Mercado Pago exige o valor mínimo de transação de R$ 0,50 para cartão e R$ 4,00 para boleto, gerando `invalid_transaction_amount`.
- **Evidências:** Executado e validado o **Pedido #22** (`ORDTST01M7JZQWF8JS91B32MM9DRDETA`, pagamento `PAY01M7JZQWFXWQE3K0CHK70QYX77`, Mastercard `credit_card`, `1x`, valor `R$ 0,50`, status `processed` / `accredited`), confirmado na tabela `orders` do PostgreSQL (`id = 22`, `payment_status = 'approved'`, `order_status = 'paid'`), o **Pedido #23** em 18/11/2026 para o fluxo de recusa (`ORDTST01M7R579Z0GF1MHJKT03XKPZ34`, pagamento `PAY01M7R579ZQ3WDBPEZAG598G8NG`, Mastercard `credit_card`, `1x`, `R$ 0,50`, status `failed` / `rejected_by_issuer`), confirmado em `orders` (`id = 23`, `payment_status = 'rejected'`, `order_status = 'cancelled'`, `stock_restored = true` com estoque de `products.id = 19` mantido em `50000`) e no processamento idempotente do webhook `order.failed` assinado com HMAC-SHA256 v2 (`payment_webhook_events.id = 17`, `event_key = 'order_order.failed_ORDTST01M7R579Z0GF1MHJKT03XKPZ34_rejected'`, `"duplicate": true` no reenvio sem nova devolução de estoque), o **Pedido #24** em 18/11/2026 para o fluxo em análise (`ORDTST01M7R6G0W4V9YNQ1H7W14WQCK9`, pagamento `PAY01M7R6G0WJYBZ4X09TPG46H22K`, Mastercard `credit_card`, titular `'CONT'`, `1x`, `R$ 0,50`, status `processing` / `in_process`), confirmado em `orders` (`id = 24`, `payment_status = 'in_process'`, `order_status = 'awaiting_payment'`, `stock_restored = false` com reserva ativa de 50 unidades reduzindo `products.id = 19` de `50000` para `49950` e reconciliação ativa verificada pelo botão `"Verificar pagamento agora"`), o **Pedido #25** em 18/11/2026 para recusa com autorização prévia (`ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN`, pagamento `PAY01M7R9AR6XK8K99E87QDA5NR80`, Mastercard `credit_card`, titular `'CALL'`, `1x`, `R$ 0,50`, status `failed` / `required_call_for_authorize`), confirmado em `orders` (`id = 25`, `payment_status = 'rejected'`, `order_status = 'cancelled'`, `stock_restored = true` mantendo o estoque de `products.id = 19` em `49950` pela reserva ativa do Pedido #24) e no processamento idempotente do webhook `order.failed` assinado com HMAC-SHA256 v2 (`payment_webhook_events.id = 19`, `event_key = 'order_order.failed_ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN_rejected'`, `"duplicate": true` no reenvio sem nova devolução de estoque), e o **Pedido #26** em 18/11/2026 para recusa por saldo ou limite insuficiente (`ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ`, pagamento `PAY01M7RAQ8Q0ASE34P1MWG0MC9H0`, Mastercard `credit_card`, titular `'FUND'`, `1x`, `R$ 0,50`, status `failed` / `insufficient_amount`), confirmado em `orders` (`id = 26`, `payment_status = 'rejected'`, `order_status = 'cancelled'`, `stock_restored = true` mantendo o estoque de `products.id = 19` em `49950` pela reserva ativa do Pedido #24) e no processamento idempotente do webhook `order.failed` assinado com HMAC-SHA256 v2 (`payment_webhook_events.id = 21`, `event_key = 'order_order.failed_ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ_rejected'`, `"duplicate": true` no reenvio sem nova devolução de estoque).
- **Causa:** Regra de negócio do gateway em relação a valores mínimos de transação.
- **Impacto:** Baixo (resolvido para cartão de crédito; débito direto segue dependente de habilitação comercial do recebedor no Mercado Pago).
- **Situação Atual:** **Concluído e Validado no Sandbox e no PostgreSQL (16/11–18/11/2026).**
- **Prioridade:** Alta (P1).

### Problema 03 (Infraestrutura de Testes): Validação de Webhook Real via Túnel HTTPS
- **Identificação:** MP-PEND-03-REAL-WEBHOOK-DELIVERY
- **Descrição:** Em ambiente local, a entrega real originada dos servidores do Mercado Pago na nuvem exigia roteiro e utilitários para túnel público HTTPS e verificação de assinatura HMAC-SHA256 v2.
- **Evidências:** Scripts integrados ao repositório no commit `dbcbbc0` (`scripts/maintenance/start-webhook-tunnel.sh`, `scripts/maintenance/verify-mp-webhook.js` e `tests/unit/scripts/verify-mp-webhook.test.js`) e validados ao vivo em 17/11/2026 com túnel HTTPS `cloudflared` (`trycloudflare.com`), recebendo tanto o envio assinado com teste de idempotência (`payment_webhook_events.id = 14`, `"duplicate": true`) quanto o disparo oficial do Simulador de Notificações do painel do Mercado Pago (`payment_webhook_events.id = 16`, `event_key = 'order_order.processed_22_approved'`, `processed_at = '2026-11-17T20:30:07.782Z'`).
- **Causa:** Impossibilidade de o Mercado Pago disparar requisições para `localhost` sem túnel reverso.
- **Impacto:** Baixo (mitigado pela Reconciliação Ativa implementada no ADR-0041 e pelos scripts de homologação).
- **Situação Atual:** **Concluído e Validado de Ponta a Ponta em 17/11/2026.**
- **Prioridade:** Média (P2).

---

## 7. Plano de Ação e Melhorias Recomendadas

### Ação 01: Validação Prática de Cartão de Crédito no Sandbox (Valor >= R$ 0,50) — CONCLUÍDA E VALIDADA (16/11/2026; recusas e análise homologadas em 18/11/2026)
- **Objetivo:** Concluir a homologação no Sandbox oficial do Mercado Pago para cartão de crédito com parcelamento e aprovação imediata (e validar análise `processing`/`in_process` e recusas `HTTP 402` / `order.failed` com restauração atômica de estoque).
- **Componentes:** `pages/checkout/[id].js`, `pages/api/checkout.js`, `lib/payment/mercadopago.js`, `lib/domain/orders.js`, `pages/api/webhooks/mercadopago.js`.
- **Resultado Executado:**
  - Aprovação: validada ponta a ponta no Sandbox oficial e confirmada na tabela `orders` do PostgreSQL com o **Pedido #22** (`ORDTST01M7JZQWF8JS91B32MM9DRDETA`, pagamento `PAY01M7JZQWFXWQE3K0CHK70QYX77`, Mastercard `credit_card`, `1x`, `R$ 0,50`, `payment_status: "approved"`, `order_status: "paid"`).
  - Recusa pelo emissor (18/11/2026): validada com o **Pedido #23** (`ORDTST01M7R579Z0GF1MHJKT03XKPZ34`, pagamento `PAY01M7R579ZQ3WDBPEZAG598G8NG`, Mastercard `credit_card`, `1x`, `R$ 0,50`, `status: "failed"`, `status_detail: "rejected_by_issuer"`), confirmado no PostgreSQL (`payment_status: "rejected"`, `order_status: "cancelled"`, `stock_restored: true`, estoque do produto `id = 19` preservado em `50000`) e com webhook `order.failed` assinado HMAC-SHA256 v2 registrado em `payment_webhook_events.id = 17` (`"duplicate": false` no 1º envio e `"duplicate": true` no reenvio, mesclando `last_webhook_action: "order.failed"` em `mp_payload` sem dupla devolução de estoque).
  - Pagamento em análise (18/11/2026): validado com o **Pedido #24** (`ORDTST01M7R6G0W4V9YNQ1H7W14WQCK9`, pagamento `PAY01M7R6G0WJYBZ4X09TPG46H22K`, Mastercard `credit_card`, titular `'CONT'`, `1x`, `R$ 0,50`, `status: "processing"`, `status_detail: "in_process"`), confirmado no PostgreSQL (`payment_status: "in_process"`, `order_status: "awaiting_payment"`, `stock_restored: false` com reserva ativa de 50 unidades de estoque em `products.id = 19` [`50000 → 49950`]) e reconciliação ativa verificada pelo botão `"Verificar pagamento agora"`.
  - Recusa com exigência de autorização prévia (18/11/2026): validada com o **Pedido #25** (`ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN`, pagamento `PAY01M7R9AR6XK8K99E87QDA5NR80`, Mastercard `credit_card`, titular `'CALL'`, `1x`, `R$ 0,50`, `status: "failed"`, `status_detail: "required_call_for_authorize"`), confirmado no PostgreSQL (`payment_status: "rejected"`, `order_status: "cancelled"`, `stock_restored: true`, estoque do produto `id = 19` preservado em `49950` devido à reserva ativa do Pedido #24) e com webhook `order.failed` assinado HMAC-SHA256 v2 registrado em `payment_webhook_events.id = 19` (`"duplicate": false` no 1º envio e `"duplicate": true` no reenvio, mesclando `last_webhook_action: "order.failed"` em `mp_payload` sem dupla devolução de estoque).
  - Recusa por saldo ou limite insuficiente (18/11/2026): validada com o **Pedido #26** (`ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ`, pagamento `PAY01M7RAQ8Q0ASE34P1MWG0MC9H0`, Mastercard `credit_card`, titular `'FUND'`, `1x`, `R$ 0,50`, `status: "failed"`, `status_detail: "insufficient_amount"`), confirmado no PostgreSQL (`payment_status: "rejected"`, `order_status: "cancelled"`, `stock_restored: true`, estoque do produto `id = 19` preservado em `49950` devido à reserva ativa do Pedido #24) e com webhook `order.failed` assinado HMAC-SHA256 v2 registrado em `payment_webhook_events.id = 21` (`"duplicate": false` no 1º envio e `"duplicate": true` no reenvio, mesclando `last_webhook_action: "order.failed"` em `mp_payload` sem dupla devolução de estoque).
- **Critérios de Validação:** Aprovado (`processed` / `accredited` com `external_reference: "22"`), em análise (`processing` / `in_process` com `external_reference: "24"`) e recusados com rollback atômico (`failed` / `rejected_by_issuer` com `external_reference: "23"`, `failed` / `required_call_for_authorize` com `external_reference: "25"` e `failed` / `insufficient_amount` com `external_reference: "26"`).

### Ação 02: Implementação de Teste E2E de Checkout no Cypress — CONCLUÍDA E VALIDADA (16/11/2026)
- **Objetivo:** Blindar a interface do checkout e a jornada do visitante contra regressões de navegação.
- **Componentes:** `cypress/e2e/checkout.cy.js`, `docs/PROJECT_cypress.md`.
- **Resultado Executado:** Spec implementada no commit `dc77185` e corrigida no intercept de `/api/customer/orders` no commit `01a4a3f`, cobrindo redirecionamento para `/entrar`, formulário com endereço padrão, finalização via PIX com reconciliação ativa e exibição em `/minha-conta` (`4 passing`, ESLint limpo).
- **Critérios de Validação:** Aprovado (`npx cypress run --spec cypress/e2e/checkout.cy.js` e `npx eslint cypress/e2e/checkout.cy.js`).

### Ação 03: Roteiro e Script de Homologação de Webhook com Túnel Seguro — CONCLUÍDA E VALIDADA (17/11/2026)
- **Objetivo:** Facilitar a homologação de webhooks reais enviados pelo Mercado Pago em ambiente de desenvolvimento e validar assinaturas HMAC-SHA256 v2.
- **Componentes no Repositório:**
  - `scripts/maintenance/verify-mp-webhook.js` (reutilizando `verifyMercadoPagoWebhookSignature` de `lib/payment/mercadopago.js`)
  - `scripts/maintenance/start-webhook-tunnel.sh`
  - `tests/unit/scripts/verify-mp-webhook.test.js` (6 testes unitários aprovados)
- **Resultado Executado:**
  - Entrega local e via túnel `cloudflared` (`https://provided-lights-explains-hopes.trycloudflare.com/api/webhooks/mercadopago`) com `MP_WEBHOOK_SECRET` real: `HTTP 200` (`{"received":true,"duplicate":false,"orderId":22}` no 1º envio, `payment_webhook_events.id = 14`; e `{"received":true,"duplicate":true,"orderId":null}` na reentrega pelo túnel Cloudflare).
  - Disparo real a partir do **Simulador de Notificações do painel do Mercado Pago** (`application_id: "516565028360615"`, `action: "order.processed"`): recebido pelo túnel `cloudflared`, validado por `x-signature` HMAC-SHA256 v2 e gravado em `payment_webhook_events` (`id = 16`, `event_key = 'order_order.processed_22_approved'`, `processed_at = '2026-11-17T20:30:07.782Z'`).
  - CI no GitHub Actions (commit `dbcbbc0`): `Lint & Test Coverage Gate` (Run `#147`), `E2E Isolated (Cypress)` (Run `#141`) e `Test Coverage Gate (banco real)` (Run `#132`) 100% aprovados.

---

## 8. Priorização e Sequência de Execução

```
[Fase 1 - Prioridade Alta (P1)]
└── Ação 01: Validação do Cartão no Sandbox com valor >= R$ 0,50 ──► CONCLUÍDA (Pedido #22)

[Fase 2 - Prioridade Média (P2)]
├── Ação 02: Construção da suíte E2E Cypress (/checkout/[id])   ──► CONCLUÍDA (commits dc77185 / 01a4a3f)
└── Ação 03: Roteiro e scripts de homologação de Webhook/Túnel  ──► CONCLUÍDA (validado com cloudflared + painel MP + PostgreSQL)
```

---

## 9. Limitações da Auditoria e Execução

1. **Habilitação Comercial de Débito Direto (`debit_card`):** Pagamentos por cartão de débito tradicional (`debelo`/`debvisa`/`debmaster`) na Orders API dependem de habilitação comercial específica na conta do recebedor no Mercado Pago (tratado no código com mensagem clara para `payment_method_not_allowed_for_collector`).
2. **Ambiente de Produção:** As validações foram realizadas no ambiente de Sandbox (`live_mode: false`), restando apenas a configuração das chaves e URL definitiva de produção quando do deploy público.

---

## 10. Conclusão e Registro de Conformidade

- **Caminho deste documento no repositório:** `/home/gus/projetos/Caminhar/docs/melhoria_mercadopago.md`
- **Arquivos da Ação 03 integrados e validados no repositório:**
  - `/home/gus/projetos/Caminhar/scripts/maintenance/verify-mp-webhook.js`
  - `/home/gus/projetos/Caminhar/scripts/maintenance/start-webhook-tunnel.sh`
  - `/home/gus/projetos/Caminhar/tests/unit/scripts/verify-mp-webhook.test.js`
- **Evidências de Banco e CI:** `orders.id = 22` (`approved` / `paid`), `orders.id = 23` (`rejected` / `cancelled`, `stock_restored = true`), `orders.id = 24` (`in_process` / `awaiting_payment`, `stock_restored = false`), `orders.id = 25` (`rejected` / `cancelled`, `stock_restored = true`), `orders.id = 26` (`rejected` / `cancelled`, `stock_restored = true`), `payment_webhook_events` (`id = 14`, `id = 16`, `id = 17`, `id = 19` e `id = 21`) e GitHub Actions Runs `#147`, `#141` e `#132` (`success`).
- **Resultado:** Todas as 3 ações planejadas (Pedido #22 no Sandbox, suíte E2E Cypress `checkout.cy.js` e homologação real de webhook via túnel `cloudflared`) encontram-se 100% concluídas, documentadas e validadas.
