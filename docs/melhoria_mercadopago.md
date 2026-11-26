# Auditoria Semanal e Plano de Ação — Integração do Mercado Pago
## Projeto O Caminhar com Deus | Registro Central de Ciclos

> Este documento acumula as auditorias semanais e o Plano de Ação central da integração com o **Mercado Pago** (Modalidade B — venda interna em Produtos Religiosos, Checkout Transparente via Orders API `/v1/orders`, Webhooks HMAC-SHA256 v2, Reconciliação Ativa, Conta do Visitante associada e Gestão de Vendas no `/admin`).
> Cada novo ciclo é incorporado no topo sem descartar o histórico relevante dos ciclos anteriores.
> **Restrição histórica de 23/11/2026:** o Ciclo 2 nasceu como auditoria somente leitura. **Atualização em 26/11/2026 ([ADR-0044](adr/0044-mercadopago-hardening-webhook-idempotency-and-modality-isolation.md)):** após confronto contra o código em `HEAD = 1d1d9adc`, revisão e execução completa do Plano de Ação, `AC-MP-01` a `AC-MP-11` foram implementados e validados no repositório (com pendências de ambiente externo registradas na Seção 12).

---

## Convenções de Classificação

| Eixo | Rótulo | Significado |
|---|---|---|
| **Certeza** | **Confirmado** | Evidência direta verificada no código-fonte atual, histórico Git, logs ou execução local dos testes na auditoria. |
| **Certeza** | **Hipótese** | Causa provável ou risco inferido sujeito a confirmação adicional em ambiente/execução específica. |
| **Certeza** | **Não confirmado** | Informação dependente de acesso externo, rede, banco ao vivo ou histórico indisponível na sessão. |
| **Temporalidade** | **Novo** | Diagnosticado pela primeira vez neste ciclo semanal (mesmo que a origem técnica do código remonte à entrega inicial). |
| **Temporalidade** | **Recorrente** | Padrão que voltou a se repetir dentro da janela analisada ou entre ciclos. |
| **Temporalidade** | **Histórico** | Ocorrência já resolvida ou registrada em ciclo anterior, preservada para rastreabilidade. |

---

## Quadro Consolidado de Ciclos e Diagnósticos

| Ciclo | Data de Execução | Período Analisado | Síntese dos Resultados |
|---|---|---|---|
| **Ciclo 1** | 16/11/2026 (homologação complementada até 18/11/2026) | 09/11/2026 10:00 BRT a 16/11/2026 10:00 BRT (+ Sandbox 16–18/11) | 4 ocorrências críticas resolvidas (`OC-01` a `OC-04`: migração Orders API `/v1/orders`, reconciliação ativa, URL de boleto `/sandbox/`, blindagem de webhook contra status forjado) e 3 ações concluídas (`Ação 01` a `Ação 03`: homologação Sandbox Pedidos #20–#31, E2E Cypress `checkout.cy.js`, túnel HTTPS `cloudflared` + webhook real). |
| **Ciclo 2 (Auditoria)** | 23/11/2026, 10:00 BRT | 16/11/2026 10:00 BRT a 23/11/2026 10:00 BRT (últimos 7 dias / 168 h) | 40 commits na janela + revisão integral do código e suítes (15 suítes Jest focadas MP/Vendas = 167/167 passando). Identificados **11 diagnósticos abertos** (`MP-DIAG-01` a `MP-DIAG-11`) e planejadas **11 ações** (`AC-MP-01` a `AC-MP-11`), sendo 1 P0 (Crítica/Alta), 5 P1 (Alta), 3 P2 (Média) e 2 P3 (Média-Baixa/Baixa-Média). |
| **Fechamento Ciclo 2** | 26/11/2026 | Confronto `1d1d9adc`–`ed8de005` + Execução `AC-MP-01`–`AC-MP-11` | Confrontados `MP-DIAG-01`..`MP-DIAG-11` com `1d1d9adc`/`ed8de005`, revisado o plano e executadas integralmente as implementações de código, cobertura Jest, Cypress E2E (`checkout.cy.js`: `6/6 passing` em `8s`), cenário k6 (`load-tests/security/mercadopago-security-test.js`), recalibração do bench, [ADR-0044](adr/0044-mercadopago-hardening-webhook-idempotency-and-modality-isolation.md) e homologação pós-ADR-0044 do **Pedido #32**; pendentes apenas execuções ao vivo dependentes de Docker/k6 e homologação final em produção HTTPS. |

### Painel de Status dos Diagnósticos Ativos (Atualizado após execução em 26/11/2026)

| ID | Resumo do Diagnóstico | Origem / Classificação | Prioridade | Situação Atual |
|---|---|---|---|---|
| `MP-DIAG-01` | `POST /api/webhooks/mercadopago` sem rate limit e sem janela de validade temporal (`ts`) na assinatura HMAC | Novo no Ciclo 2 (origem histórica `6424780`) | **P0 (Crítica/Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-02` | Ausência de filtro server-side de `modality` em `PUT`/`DELETE`/`reorder` de `internal-products.js` e `products.js` | Novo no Ciclo 2 (origem histórica `6424780`) | **P1 (Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-03` | Fallback direto de tokenização HTTP em `checkout/[id].js` sem trava estrita a `localhost`, `cardNumber` aceito no schema e estado de cartão não limpo | Novo no Ciclo 2 (origem histórica `819bcb1`) | **P1 (Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-04` | Webhook descarta metadados autoritativos da API (`fetchMercadoPagoPaymentDetails`) e grava campos vindos de `req.body` | Novo no Ciclo 2 (origem histórica `f46ebf4`) | **P1 (Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-05` | Evento de webhook em condição de corrida (`!current`) é gravado como processado e retorna HTTP 200, impedindo reenvio pelo MP | Novo no Ciclo 2 (origem histórica `6424780`) | **P1 (Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-06` | Lacunas na máquina de estados/estoque/idempotência (`refunded`/`charged_back`, aprovação sobre pedido cancelado, reabertura admin, cache `products:*`, duplo clique no checkout) | Novo no Ciclo 2 (origem histórica `6424780`/`819bcb1`) | **P1 (Alta)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-07` | Lacunas de validação/mapeamento (`in_mediation`/`partially_refunded`, módulo 11 CPF/CNPJ, coerção de `quantity`/`installments`, `check-env.js` sem diagnóstico MP) | Novo no Ciclo 2 (origem histórica `819bcb1`/`6424780`) | **P2 (Média)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-08` | Ausência de rate limit/limite de busca em `GET /api/admin/orders`, invalidação incondicional de cache no webhook, falta de cooldown na reconciliação e orçamento de performance | Novo no Ciclo 2 | **P2 (Média)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-09` | Cobertura baixa em `AdminSales.js`, branches descobertos, falta de threshold em `lib/payment/` e `pages/api/webhooks/`, E2E parcial e sem k6 | Novo no Ciclo 2 (parcial em `0ab2716e`/`1d1d9adc`) | **P2 (Média)** | **Resolvido no código e E2E ao vivo (26/11/2026 — Cypress `6/6 passing` em `8s`, cenário k6 criado; pendente apenas execução ao vivo Docker/k6)** |
| `MP-DIAG-10` | Dívida de arquitetura/UX (`AdminOrders`/`InternalProducts` fora de `createAdminHandler`, rótulos crus em `AdminSales.js`, modal/CSV incompletos, 33 COUNTs em `stats.js`, array `payments[0]`) | Novo no Ciclo 2 | **P3 (Média-Baixa)** | **Resolvido (26/11/2026)** |
| `MP-DIAG-11` | Lacunas no processo dos agentes (revisões parciais sem checar rotas/irmãos, Cypress sem execução local, imprecisão residual no Ciclo 1, falta de timestamp/SHA em `logs/`) | Recorrente na janela (parcial em `ff57a203`) | **P3 (Baixa-Média)** | **Resolvido (24–26/11/2026)** |

---

# Ciclo 2 — 23/11/2026 (Auditoria Semanal)

## 1. Resumo da Auditoria

- **Data e horário da execução:** `23/11/2026, 10:00 (America/Sao_Paulo / BRT)` (`2026-11-23T10:00:37-03:00`).
- **Período efetivamente analisado:** `16/11/2026, 10:00 BRT` até `23/11/2026, 10:00 BRT` (últimos 7 dias móveis / 168 horas).
- **Auditor:** Antigravity (Google DeepMind) — rotina semanal somente leitura.
- **Fontes consultadas nesta auditoria:**
  - Documentos normativos e arquiteturais: [`AGENTS.md`](file:///home/gus/projetos/Caminhar/AGENTS.md), [`docs/ARQUITETURA_SITE_PUBLICO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md) (atualizado em `2026-11-23`) e [`docs/ARQUITETURA_SITE_PRIVADO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md) (atualizado em `2026-11-23`).
  - Documentação técnica e relatórios: [`docs/melhoria_mercadopago.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_mercadopago.md) (Ciclo 1), [`CHANGELOG.md`](file:///home/gus/projetos/Caminhar/CHANGELOG.md), ADRs [`0037`](file:///home/gus/projetos/Caminhar/docs/adr/0037-internal-sales-mercadopago-and-customer-accounts.md) a [`0043`](file:///home/gus/projetos/Caminhar/docs/adr/0043-admin-inactivity-timeout-and-unified-401-session-guard.md), [`docs/retorno_da_semana.md`](file:///home/gus/projetos/Caminhar/docs/retorno_da_semana.md), [`docs/melhoria_agente.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_agente.md), [`docs/melhoria_google.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_google.md) e [`docs/melhoria_design.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_design.md).
  - Histórico Git e working tree: `git log` exato na janela (`40 commits` de `b37c9f1` em `16/11 11:58` até `ee4ed2e` em `22/11 17:18`) + inspeção das `18` alterações pré-existentes não commitadas de `23/11/2026` no working tree.
  - Varredura e leitura integral dos módulos de pagamento, checkout, webhooks, domínio de pedidos/produtos, APIs públicas/visitante/admin, componentes UI, segurança/CSP/headers, scripts de manutenção/schema e suítes de teste listados na Seção 2.
  - Execuções read-only em `23/11/2026`:
    - **15 suítes Jest focadas na integração Mercado Pago / Vendas Internas:** `15/15` suítes e `167/167` testes aprovados em `10,304 s` (sem falhas).
    - **Canário do bench (`tests/unit/scripts/bench-ground-truth.test.js`):** `14/14` testes aprovados (`1,998 s`).
    - **Gates estáticos completos:** `npm run lint` (0 erros/warnings), `npm run knip` (0 issues), `npm run lint:workflows` (`actionlint 1.7.12` — 0 erros), `npm run lint:chars` (0 erros em `785` arquivos), `npm run security:check-sql` (0 vulnerabilidades em `264` arquivos) e `npm run security:check-credentials` (0 ocorrências em `102` arquivos).
    - **Métricas locais de cobertura (`logs/coverage-output.log`, `mtime` 22/11/2026 17:18):** inspecionadas linha a linha para todos os módulos do Mercado Pago e Gestão de Vendas.

### Principais Atividades Identificadas nos Últimos 7 Dias (16/11 a 23/11/2026)

1. **`b37c9f1` (16/11 11:58 — *ATT - Melhoria Agente*):** criação da suíte com PostgreSQL real [`tests/integration/domain/orders.db.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/domain/orders.db.test.js) (6 testes cobrindo reserva `FOR UPDATE`, rollback, JOINs e idempotência) e [`tests/integration/domain/customers.db.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/domain/customers.db.test.js) (6 testes), eliminando o risco histórico de *schema drift* ocultado por mocks.
2. **`dc77185` (16/11 12:24) + `01a4a3f` (16/11 15:14):** criação de [`cypress/e2e/checkout.cy.js`](file:///home/gus/projetos/Caminhar/cypress/e2e/checkout.cy.js) (4 cenários E2E), adição da verificação estática de colunas `INSERT`/`UPDATE` de `orders.js`/`customers.js` em [`tests/unit/scripts/schema-sources.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/scripts/schema-sources.test.js) e correção emergencial do `cy.intercept` em `/api/customer/orders` após falha no CI `e2e.yml` (Runs `#137`/`#138`).
3. **`905712e` (16/11 12:33):** criação da versão inicial (Ciclo 1) deste documento [`docs/melhoria_mercadopago.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_mercadopago.md).
4. **`dbcbbc0` (16/11 18:08) + `6b69224` (17/11 17:53):** entrega da Ação 03 com [`scripts/maintenance/verify-mp-webhook.js`](file:///home/gus/projetos/Caminhar/scripts/maintenance/verify-mp-webhook.js), [`scripts/maintenance/start-webhook-tunnel.sh`](file:///home/gus/projetos/Caminhar/scripts/maintenance/start-webhook-tunnel.sh) e [`tests/unit/scripts/verify-mp-webhook.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/scripts/verify-mp-webhook.test.js) (6 testes); remoção da função duplicada de verificação HMAC em `6b69224`; homologação ao vivo do **Pedido #22** (cartão de crédito R$ 0,50) e entrega real de webhook via túnel HTTPS `cloudflared` + Simulador oficial do painel do Mercado Pago (`payment_webhook_events.id = 14` e `16`).
5. **`554c056`, `711813c`, `c1c7219`, `2d425db`, `f28b4c3`, `fa8d2a9`, `6f1a785`, `6762b05`, `feb768a` (18/11 17:40–20:30):** série de 9 commits documentando a homologação prática no Sandbox e no PostgreSQL dos cenários adicionais: **Pedido #23** (recusa pelo emissor), **Pedido #24** (pagamento em análise `'CONT'` + reconciliação ativa), **Pedido #25** (`required_call_for_authorize` `'CALL'`), **Pedido #26** (`insufficient_amount` `'FUND'`), **Pedidos #27/#28/#29** (`bad_filled_card_data`), **Pedido #30** (cartão pré-pago Elo aprovado) e **Pedido #31** (boleto expirado/cancelado com devolução atômica de 400 unidades).
6. **`80478dd`, `75fb1cb`, `fad08f6`, `7d68032`, `f161227` (19/11):** consolidação do login Google do visitante (`/entrar`, pré-requisito direto do checkout interno, ADR-0042 JWKS local) mantendo os domínios do Mercado Pago na CSP de [`pages/_document.js`](file:///home/gus/projetos/Caminhar/pages/_document.js), inclusão de monitoramento do endpoint em [`hooks/usePerformanceMetrics.js`](file:///home/gus/projetos/Caminhar/hooks/usePerformanceMetrics.js) e correção do vazamento de `MP_WEBHOOK_SECRET` entre testes em [`tests/unit/lib/payment/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/payment/mercadopago.test.js) (`7d68032`).
7. **`a681cc5` (20/11 01:07 — *ATT - Melhorias Design*):** substituição de tokens CSS inexistentes em `AdminSales.module.css` e `ProductCard.module.css`, remoção de estilos inline `style={{` em [`pages/checkout/[id].js`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js) e [`components/Admin/AdminSales.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js), criação de `design-system/pages/customer.md` e do guard [`tests/unit/tests-hygiene/css-tokens.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/tests-hygiene/css-tokens.test.js).
8. **`25081d9` (21/11 12:12 — *ATT - Visão Geral do Sistema - Gestão de Vendas*):** ampliação de [`pages/api/admin/stats.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/stats.js) e `AdminDashboard` com os cartões de `Gestão de Vendas` (contagens por meio de pagamento e andamento logístico) e `Produtos Internos`, com atalho direto para a subaba correspondente.
9. **`00758a7` (21/11 14:45 — *ATT - Alinhamento Gestão de Produtos*):** adição do filtro `modality=external` na listagem `GET` da Gestão de Produtos para não misturar produtos internos da Modalidade B.
10. **`e934811` (21/11 20:16 — *ATT - Login 1 Hora*, ADR-0043):** adição de `credentials: 'include'` e tratamento unificado HTTP `401` em [`components/Admin/AdminSales.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js).
11. **`c676098` (21/11 21:33) + `ee4ed2e` (22/11 17:18):** alinhamento visual de botões em `AdminSales.js`, pré-carregamento silencioso da contagem da subaba `Pedidos` ao abrir diretamente em `Produtos Internos` (corrigindo `Pedidos (0)` falso) e criação/expansão de [`tests/unit/components/Admin/AdminSales.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/components/Admin/AdminSales.test.js) (8 testes).
12. **`28b6b17` (22/11 10:14 — *ATT - Melhorias API*):** adição de rate limiting em `GET /api/checkout` (`60 req/min`), `GET /api/customer/orders` (`60 req/min`) e `PUT /api/customer/auth` (`30 req/min`).
13. **Working tree pré-existente de 23/11 (não commitado):** paridade de `link` obrigatório em [`pages/api/products.js`](file:///home/gus/projetos/Caminhar/pages/api/products.js) (Modalidade A) e alinhamento documental de status/modalidades em `ARQUITETURA_SITE_PUBLICO.md` e `ARQUITETURA_SITE_PRIVADO.md`.

### Situação Geral da Integração e Principais Descobertas

- **Maturidade funcional no Sandbox:** a arquitetura de pagamentos com Orders API (`/v1/orders`), tokenização SDK v2 no cliente, fallback de reconciliação ativa (`reconcile-orders.js`) e assinatura HMAC-SHA256 v2 está funcionalmente completa e amplamente exercitada no Sandbox oficial (PIX, boleto, crédito, pré-pago) e nas 15 suítes Jest executadas ao vivo (`167/167` aprovadas).
- **Descoberta crítica da auditoria aprofundada (Ciclo 2):** apesar dos avanços da semana em homologação Sandbox, UI e endurecimento de várias APIs (`28b6b17`), a revisão linha a linha de todos os arquivos revelou **11 lacunas confirmadas** (`MP-DIAG-01` a `MP-DIAG-11`) que ainda expõem o fluxo em produção real:
  1. **Risco P0 de segurança/disponibilidade (`MP-DIAG-01`):** `POST /api/webhooks/mercadopago` não possui rate limit nem validação temporal do campo `ts` no cabeçalho `x-signature`, permitindo replay indefinido com `body.id` sintético e amplificação de chamadas outbound `GET /v1/orders/{id}`.
  2. **Quebra de isolamento RBAC entre Modalidade A e B (`MP-DIAG-02`):** `PUT`/`DELETE`/`reorder` em `/api/admin/internal-products` e `/api/products` filtram apenas por `id` sem restringir `modality`, permitindo que um operador com permissão apenas em `Gestão de Produtos` altere/exclua um produto interno de venda direta (e vice-versa).
  3. **Exposição desnecessária de superfície PCI-DSS (`MP-DIAG-03`):** fallback direto para `/v1/card_tokens` aceita qualquer origem `http:` (não restrita a `localhost`/`127.0.0.1`), `checkout.js` ainda aceita `cardNumber` no schema Zod e `checkout/[id].js` não limpa `cardNumber`/`cardExpiry` do estado React após a compra.
  4. **Webhook descartando dados autoritativos (`MP-DIAG-04`) e engolindo eventos em condição de corrida (`MP-DIAG-05`):** em produção, o webhook consulta `fetchMercadoPagoPaymentStatus` (descartando `externalReference`, `statusDetail`, `mpOrderStatus` e `transactionId` vindos da API) e grava `event_key` mesmo quando `!current` (retornando `HTTP 200` e perdendo o evento para sempre).
  5. **Lacunas de estado, estoque e duplo clique (`MP-DIAG-06`):** `refunded`/`charged_back` podem sofrer downgrade por webhook atrasado; aprovação tardia sobre pedido cancelado fica inconsistente; `updateAdminOrder` não invalida `products:*` nem bloqueia reabertura de pedido cancelado; e `POST /api/checkout` não suporta chave de idempotência de tentativa do cliente.

---

## 2. Mapeamento do Fluxo Atual

### 2.1. Inventário Completo de Arquivos e Componentes Envolvidos

| Camada | Arquivo (caminho real verificado) | Responsabilidade na Integração Mercado Pago |
|---|---|---|
| **Gateway MP** | [`lib/payment/mercadopago.js`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js) | `createMercadoPagoPayment` (`POST /v1/orders`), `fetchMercadoPagoPaymentDetails`/`Status` (`GET /v1/orders/{id}` e `/v1/payments/{id}`), `mapMercadoPagoStatus`, `verifyMercadoPagoWebhookSignature` (HMAC v2), tratamento de HTTP 402 e normalização de resposta. |
| **Reconciliação Ativa** | [`lib/payment/reconcile-orders.js`](file:///home/gus/projetos/Caminhar/lib/payment/reconcile-orders.js) | `reconcilePendingOrders` — consulta `GET /v1/orders/{id}` para até 5 pedidos transitórios (`pending`, `in_process`, `authorized`) com `mp_payment_id` não-mock quando há `MP_ACCESS_TOKEN`. |
| **Mensagens & Formatação** | [`lib/payment/payment-status-messages.js`](file:///home/gus/projetos/Caminhar/lib/payment/payment-status-messages.js) | `getPaymentFeedback` (pt-BR), `formatCpfCnpj`, `isValidCpfCnpjDigits`, `normalizeMercadoPagoTicketUrl` (`/staging/payments/` → `/sandbox/payments/`). |
| **Domínio de Pedidos** | [`lib/domain/orders.js`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js) | `calculateShippingCost`, `createInternalOrder` (`FOR UPDATE` no estoque), `attachOrderPaymentInfo`, `cancelFailedCheckoutOrder`, `getCustomerOrders`, `getCustomerOrderById`, `getAdminOrders`, `updateAdminOrder`, `syncOrderPaymentStatus`, `processMercadoPagoWebhookEvent` e `applyPaymentStatusTransition`. |
| **Domínio de Produtos** | [`lib/domain/products.js`](file:///home/gus/projetos/Caminhar/lib/domain/products.js) | Separação `modality` (`'external'` vs `'internal'`), `stock`, `shipping_type`, `shipping_cost` e listagens filtradas. |
| **Domínio & Sessão Cliente** | [`lib/domain/customers.js`](file:///home/gus/projetos/Caminhar/lib/domain/customers.js), [`lib/auth/customer-auth.js`](file:///home/gus/projetos/Caminhar/lib/auth/customer-auth.js), [`lib/auth/google-id-token.js`](file:///home/gus/projetos/Caminhar/lib/auth/google-id-token.js) | Cadastro/login de compradores (`customers`), cookie `customerToken` (`scope: 'customer'`, 24h) e endereço padrão persistido no checkout. |
| **API Checkout** | [`pages/api/checkout.js`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js) | `GET` (dados do produto interno, rate limit 60/min) e `POST` (sessão cliente, rate limit 15/min, Zod, reserva de estoque, criação da ordem no MP e rollback em erro). |
| **API Webhook** | [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js) | `POST` recepção de notificações `order` e `payment`, validação `x-signature` HMAC v2, consulta oficial à API em produção, atualização idempotente e invalidação de cache. |
| **API Pedidos Visitante** | [`pages/api/customer/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/customer/orders.js) | `GET` escopado por `session.customerId` (`?orderId=<id>` ou lista), rate limit 60/min e reconciliação ativa (`sync !== '0'`). |
| **API Auth Visitante** | [`pages/api/customer/auth.js`](file:///home/gus/projetos/Caminhar/pages/api/customer/auth.js) | Login/cadastro/Google (`/entrar`) e atualização de endereço/perfil (`PUT` 30/min). |
| **APIs Admin Vendas/Produtos** | [`pages/api/admin/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js), [`pages/api/admin/internal-products.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/internal-products.js), [`pages/api/products.js`](file:///home/gus/projetos/Caminhar/pages/api/products.js), [`pages/api/admin/stats.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/stats.js) | Gestão de pedidos (`GET` com `?sync=1`, `PUT` status/rastreio), CRUD produtos internos (Modalidade B), CRUD produtos externos (Modalidade A) e métricas do dashboard. |
| **Frontend Público & Cliente** | [`components/Features/Products/ProductCard.js`](file:///home/gus/projetos/Caminhar/components/Features/Products/ProductCard.js), [`pages/checkout/[id].js`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js), [`pages/entrar.js`](file:///home/gus/projetos/Caminhar/pages/entrar.js), [`pages/minha-conta.js`](file:///home/gus/projetos/Caminhar/pages/minha-conta.js) | Vitrine diferenciada (`Comprar` vs `Link para <site>`), checkout transparente (SDK JS v2, BIN, parcelas, PIX QR, boleto, polling 5s, `"Verificar pagamento agora"`) e histórico `/minha-conta`. |
| **Frontend Admin** | [`components/Admin/AdminSales.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js), [`components/Admin/AdminDashboard.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminDashboard.js), [`pages/admin.js`](file:///home/gus/projetos/Caminhar/pages/admin.js) | Aba #6 Gestão de Vendas (`Pedidos` + `Produtos Internos`), modal de gerenciamento, botão `"Sincronizar MP"`, pré-contagem `Pedidos (N)` e cartões no Dashboard. |
| **Infra, Segurança & Env** | [`pages/_document.js`](file:///home/gus/projetos/Caminhar/pages/_document.js), [`next.config.js`](file:///home/gus/projetos/Caminhar/next.config.js), [`proxy.js`](file:///home/gus/projetos/Caminhar/proxy.js), [`hooks/usePerformanceMetrics.js`](file:///home/gus/projetos/Caminhar/hooks/usePerformanceMetrics.js), [`scripts/check-env.js`](file:///home/gus/projetos/Caminhar/scripts/check-env.js), [`.env.example`](file:///home/gus/projetos/Caminhar/.env.example) | CSP permitindo SDK/iframes MP, headers HTTP, rate limit de borda (apenas `/api/auth/login`), orçamento de 5s para `/api/checkout` e documentação de variáveis `MP_*`. |
| **Banco & Schema** | [`scripts/migrations/023-sales-customers-and-modalities.js`](file:///home/gus/projetos/Caminhar/scripts/migrations/023-sales-customers-and-modalities.js), [`lib/crud/crud.js`](file:///home/gus/projetos/Caminhar/lib/crud/crud.js), [`scripts/validate-schema.js`](file:///home/gus/projetos/Caminhar/scripts/validate-schema.js) | Colunas em `products` (`modality`, `stock`, `shipping_type`, `shipping_cost`) e tabelas `customers`, `customer_refresh_tokens`, `orders`, `payment_webhook_events`. |
| **Scripts de Homologação** | [`scripts/maintenance/verify-mp-webhook.js`](file:///home/gus/projetos/Caminhar/scripts/maintenance/verify-mp-webhook.js), [`scripts/maintenance/start-webhook-tunnel.sh`](file:///home/gus/projetos/Caminhar/scripts/maintenance/start-webhook-tunnel.sh) | Geração/assinatura HMAC v2, dry-run/envio de webhook e subida de túnel HTTPS (`cloudflared`/`ngrok`/`ssh`). |
| **Testes Automatizados** | 15 suítes Jest unitárias/integração + 2 suítes `.db.test.js` + `cypress/e2e/checkout.cy.js` | Detalhados na Seção 2.2 e na análise `MP-DIAG-09` (`167` testes Jest + `12` DB real + `4` E2E). |
| **Documentação & ADRs** | [`AGENTS.md`](file:///home/gus/projetos/Caminhar/AGENTS.md), [`docs/ARQUITETURA_SITE_PUBLICO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md), [`docs/ARQUITETURA_SITE_PRIVADO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md), `docs/adr/0037`..`0043`, `design-system/pages/{admin,customer}.md` | Regras de processo, arquitetura, proteção Modalidade A x B, decisões e design system. |

### 2.2. Rotinas, Sequência de Execução, Dependências e Validações Existentes

1. **Rotina 1 — Compra Direta / Checkout Transparente (`ProductCard` → `/checkout/[id]` → `POST /api/checkout` → `/v1/orders`):**
   - *Etapas:* visitante clica em `Comprar` (Modalidade B) → `/checkout/[id]` valida `/api/customer/auth` (redireciona a `/entrar?next=...` se deslogado) e carrega produto via `GET /api/checkout?productId=<id>` → preenche entrega, CPF/CNPJ e meio de pagamento → para cartões, `checkout/[id].js` carrega `sdk.mercadopago.com/js/v2`, detecta BIN (`getPaymentMethods`), busca parcelas (`getInstallments`) e gera token (`createCardToken` com fallback HTTP em `/v1/card_tokens`) → `POST /api/checkout` aplica rate limit (15/min), valida schema Zod, executa `createInternalOrder` com `SELECT ... FOR UPDATE` na tabela `products` (reservando estoque), atualiza endereço padrão do cliente em paralelo a `createMercadoPagoPayment` (`POST https://api.mercadopago.com/v1/orders` com `X-Idempotency-Key: caminhar-order-<id>` e timeout de 15 s) → em HTTP `200`/`201` ou HTTP `402` com `data.id`, grava `attachOrderPaymentInfo` (se recusa/falha imediata, restaura estoque) → em falha de rede/5xx/400/422, executa `cancelFailedCheckoutOrder` e devolve estoque.
   - *Dependências:* autenticação isolada de cliente (`customerToken`), produto `published = true` e `modality = 'internal'`, variáveis `MP_ACCESS_TOKEN` / `NEXT_PUBLIC_MP_PUBLIC_KEY` (modo simulado local quando ausentes fora de produção).
   - *Validações existentes:* Zod em endereço, enum de meio, documento não repetido, tokenização obrigatória com `MP_ACCESS_TOKEN`/produção, valores mínimos (`R$ 0,01` PIX, `R$ 0,50` cartão, `R$ 4,00` boleto) no cliente, `SELECT ... FOR UPDATE` no banco.

2. **Rotina 2 — Recepção Assíncrona de Webhooks (`POST /api/webhooks/mercadopago`):**
   - *Etapas:* extrai `data.id` (query ou body) e headers `x-signature` / `x-request-id` → valida HMAC-SHA256 v2 (`verifyMercadoPagoWebhookSignature`, `data.id` em minúsculas, `timingSafeEqual`; fail-closed se `MP_WEBHOOK_SECRET` configurado ou se `NODE_ENV=production`) → filtra tópicos (`order` / `payment`; demais tópicos como `merchant_order` retornam `200 { ignored: true }`) → decide status (`NODE_ENV=production`: consulta `fetchMercadoPagoPaymentStatus`; fora de produção: aceita status explícito do corpo, senão consulta API se houver token, senão `'approved'`) → executa `processMercadoPagoWebhookEvent` (insert `ON CONFLICT (event_key) DO NOTHING`, lookup por `mp_payment_id` com fallback numérico por `external_reference`, transição `applyPaymentStatusTransition` com lock `FOR UPDATE` e baixa/restauração única por `stock_restored`) → invalida cache `products:*`.

3. **Rotina 3 — Reconciliação Ativa Pull (`lib/payment/reconcile-orders.js`):**
   - *Etapas:* disparada em `GET /api/customer/orders` (lista ou `?orderId=<id>` com `sync !== '0'`, incluindo polling a cada 5 s — máximo 36 ciclos em aba visível — e botão `"Verificar pagamento agora"` no checkout) e em `GET /api/admin/orders` (lista ou botão `"Sincronizar MP"` com `?sync=1`) → filtra até `maxOrders = 5` (ou `1` por `?orderId`) pedidos transitórios (`pending`, `in_process`, `authorized`) não cancelados com `mp_payment_id` real (não iniciado por `mp_`) → chama `fetchMercadoPagoPaymentDetails` em `Promise.allSettled` → se houver mudança de status ou detalhe (`status_detail`/`mp_order_status`), grava via `syncOrderPaymentStatus` (`FOR UPDATE`) e invalida `products:*` apenas se `stock_restored` mudou para `true`.

4. **Rotina 4 — Gestão Operacional no `/admin` (`AdminSales.js` + `AdminDashboard.js`):**
   - *Etapas:* operador autenticado com permissão `Gestão de Vendas` acessa subaba `Pedidos` (busca, 3 filtros, paginação, exportação CSV, modal de atualização de `order_status` + `tracking_code` com devolução automática de estoque ao cancelar, botão `"Sincronizar MP"` com auditoria) ou subaba `Produtos Internos` (`AdminCrudBase`, curadoria 1-based, estoque, frete grátis/fixo/calculado). A Visão Geral (`stats.js`) exibe resumo das contagens e navega diretamente para cada subaba.

5. **Participação dos Agentes:** o processo definido no `AGENTS.md` §2 contempla OpenCode (`oh-my-opencode-slim`: orchestrator, explorer, designer, fixer, oracle) e Antigravity executando o ciclo ponta a ponta. Entretanto, todos os 40 commits da janela possuem autor Git único (`caminhar`), o MCP `ai-memory` foi negado por permissão nesta sessão e não há transcrições locais de OpenCode/sessões anteriores do Antigravity — portanto, **não é confirmado** qual agente individual executou cada commit específico da semana.

---

## 3. Avaliação das Correções Realizadas na Janela (16/11 a 23/11/2026)

| Data / Commit | Problema Motivador | Arquivos Principais | O Que Foi Feito | Avaliação e Nível de Validação | Regressões / Lacunas Restantes |
|---|---|---|---|---|---|
| 16/11 (`b37c9f1`) | *Schema drift* ocultado por mocks de `db.js` em `orders.js` e `customers.js` (ADR-0039) | `tests/integration/domain/orders.db.test.js`, `customers.db.test.js` | 12 testes contra PostgreSQL real via Testcontainers (`FOR UPDATE`, JSONs, JOINs, webhooks). | **Implementada — validação em CI remoto não confirmada nesta sessão** (8 suítes `.db.test.js` puladas localmente sem Docker; `schema-sources.test.js` validado 7/7 ao vivo). | Aderente à arquitetura (ADR-0039); pendente confirmar execução remota em `test-db-coverage.yml`. |
| 16/11 (`dc77185` → `01a4a3f`) | Ausência de cobertura E2E navegável para `/checkout/[id]` e `/minha-conta` | `cypress/e2e/checkout.cy.js`, `docs/PROJECT_cypress.md` | 4 cenários E2E (auth redirect, checkout com endereço, PIX + reconciliação, `/minha-conta`); `01a4a3f` corrigiu overload de `cy.intercept`. | **Efetivamente validada no ciclo anterior (Run #141, 4 passing após `01a4a3f`)**; não re-executada ao vivo nesta rodada read-only. | Falhou no 1º push por falta de execução local antes do commit; cobre apenas PIX (falta cartão/recusa/boleto — `MP-DIAG-09`). |
| 16–17/11 (`dbcbbc0` → `6b69224`) | Necessidade de homologar webhooks reais da nuvem do MP em `localhost` | `scripts/maintenance/{verify-mp-webhook.js,start-webhook-tunnel.sh}`, `verify-mp-webhook.test.js` | Scripts de assinatura HMAC v2/túnel + 6 testes unitários; `6b69224` removeu cópia duplicada de `verifyMercadoPagoWebhookSignature`. | **Efetivamente validada** (6/6 testes Jest ao vivo + entrega real via `cloudflared` e Simulador MP gravada em `payment_webhook_events` ids 14 e 16). | Regressão inicial de duplicação já corrigida em `6b69224`. |
| 18/11 (`554c056`–`feb768a`) | Cobertura de Sandbox limitada apenas a PIX/boleto/aprovação crédito | `docs/melhoria_mercadopago.md`, `docs/ARQUITETURA_SITE_PUBLICO.md` | Validação prática e documentação dos Pedidos #23–#31 (recusas, `'CONT'`, pré-pago Elo, boleto expirado). | **Homologação registrada** no documento e em commits da semana; estado atual do banco local não reconsultado nesta rodada. | Sem alterações de código; expôs ausência de validação de `debit_card` direto (depende de habilitação comercial). |
| 19/11 (`7d68032`) | Vazamento de `MP_WEBHOOK_SECRET` entre testes de `mercadopago.test.js` após inclusão em `.env`/setup | `tests/unit/lib/payment/mercadopago.test.js` | Adicionado `delete process.env.MP_WEBHOOK_SECRET` explícito nos dois cenários de segredo ausente. | **Efetivamente validada** (`22/22` testes passando ao vivo). | Sem efeitos colaterais. |
| 20/11 (`a681cc5`) | 24 tokens CSS inválidos e estilos inline em `AdminSales` e `checkout/[id]` | `AdminSales.module.css`, `ProductCard.module.css`, `checkout/[id].js`, `AdminSales.js`, `css-tokens.test.js` | Tokens corrigidos, `style={{` removido e guarda global CSS criada em `tests/unit/tests-hygiene/`. | **Efetivamente validada** (`7/7` testes de higiene CSS passando ao vivo). | Manteve contraste de `.linkShopee`/`.linkAmazon` tratado separadamente no `melhoria_design.md`. |
| 21/11 (`25081d9`) | Ausência de métricas de Vendas Internas e Produtos Internos na Visão Geral | `pages/api/admin/stats.js`, `AdminDashboard.js`, `AdminSales.js` | Cartões + barras de `Gestão de Vendas` e `Produtos Internos` com atalho por `initialSubTab`. | **Parcialmente validada** (testes de `stats.test.js` e `AdminDashboard.test.js` na semana). | Introduziu 11 novos `SELECT COUNT(*)` no endpoint (`MP-DIAG-10`) e dependeu de `ee4ed2e` para corrigir `Pedidos (0)`. |
| 21/11 (`00758a7`) | `Gestão de Produtos` podia listar produtos internos junto aos externos | `components/Admin/AdminProducts.js`, `AdminCrudBase.js`, `useAdminCrud.js` | Passou `modality=external` no `GET /api/products` do painel. | **Parcialmente resolvida** (`GET` isolado). | Deixou `PUT`/`DELETE`/`reorder` de `/api/products` e `/api/admin/internal-products` sem checagem de `modality` no servidor (`MP-DIAG-02`). |
| 21/11 (`e934811`) | Falha de UX após expiração de 1h do JWT no `/admin` | `AdminSales.js`, `pages/admin.js`, `utils/adminSession.js` | `credentials: 'include'` e interceptação unificada de HTTP `401` em `AdminSales`. | **Efetivamente validada** na suíte `AdminSales.test.js` (`8/8`). | Sem regressões conhecidas. |
| 21–22/11 (`c676098`, `ee4ed2e`) | Desalinhamento de botões e exibição falsa de `Pedidos (0)` ao abrir direto em `Produtos Internos` | `AdminSales.js`, `AdminSales.module.css`, `AdminSales.test.js` | Pré-carregamento silencioso de contagem (`limit=1&sync=0`) e 8 testes de UI. | **Efetivamente validada** (`8/8` testes passando ao vivo). | Baixa cobertura geral de funções em `AdminSales.js` permanece (`32,25%` — `MP-DIAG-09`) e `payment_method` cru (`MP-DIAG-10`). |
| 22/11 (`28b6b17`) | Falta de rate limit em rotas públicas e de visitante | `pages/api/checkout.js` (`GET`), `pages/api/customer/orders.js` (`GET`), `pages/api/customer/auth.js` (`PUT`) | Rate limiting 60/min em `GET checkout` e `GET customer/orders`, 30/min em `PUT customer/auth`. | **Efetivamente validada** nas rotas alteradas (testes 429 passando ao vivo). | Não alcançou `POST /api/webhooks/mercadopago` (`MP-DIAG-01`) nem `GET /api/admin/orders` (`MP-DIAG-08`). |

---

## 4. Validação dos Processos do Mercado Pago

Avaliação dos **14 processos previstos na Seção 6 da auditoria**, confrontando a implementação real com as evidências disponíveis:

| # | Processo Avaliado | Situação Real | Evidências e Observações Objetivas | Diagnósticos Relacionados |
|---|---|---|---|---|
| **1** | Comunicação entre o site e a API do Mercado Pago | **Implementado e validado** | `lib/payment/mercadopago.js` implementa `POST /v1/orders` (timeout 15s), `GET /v1/orders/{id}` e `/v1/payments/{id}` (timeout 8s), `X-Idempotency-Key` e tratamento de HTTP `402`. Requer atenção apenas para leitura de `payments[0]` e falta de idempotência de tentativa no checkout. | `MP-DIAG-06`, `MP-DIAG-10` |
| **2** | Configuração de credenciais e ambientes | **Parcialmente implementado** | `.env.example` documenta `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY` e `MP_WEBHOOK_SECRET`, e o app falha fechado em produção sem token/segredo; contudo, `scripts/check-env.js` não valida consistência/prontidão de produção do MP e a homologação ocorreu apenas em Sandbox. | `MP-DIAG-07` |
| **3** | Criação e identificação das transações | **Com falhas identificadas** | Reserva atômica `FOR UPDATE` e rollback em falha estão validados (`orders.db.test.js`), porém `POST /api/checkout` não possui chave de idempotência de tentativa do cliente (risco de duplicar pedido e cobrança em duplo clique/retry) e aceita `quantity` inválida coagida para `1` e CPF/CNPJ sem dígito verificador. | `MP-DIAG-06`, `MP-DIAG-07` |
| **4** | Processamento de pagamentos via PIX | **Implementado e validado** | Emissão de `qr_code`/`qr_code_base64`, normalização de `ticket_url`, reconciliação automática (polling 5s + botão `"Verificar pagamento agora"`), validado no Sandbox (Pedido #20), Jest e Cypress (`checkout.cy.js`). | — |
| **5** | Processamento de pagamentos via cartão de crédito | **Implementado e validado** | Tokenização client-side via SDK JS v2, detecção de BIN, parcelas e fluxo de aprovação/análise/recusa validados no Sandbox (Pedidos #22–#29) e Jest. Exige endurecimento no fallback HTTP `/v1/card_tokens`, limpeza de estado e ampliação do E2E. | `MP-DIAG-03`, `MP-DIAG-09` |
| **6** | Processamento de pagamentos via cartão de débito | **Parcialmente implementado** | Cartão pré-pago Elo (`prepaid_card`, sem `installments`) implementado e validado no Sandbox (Pedido #30). Débito direto (`debit_card` / `debelo`) possui tratamento de erro `payment_method_not_allowed_for_collector`, mas depende de habilitação comercial do recebedor no Mercado Pago para uso real. | *(dependência externa)* |
| **7** | Processamento de pagamentos via boleto | **Implementado e validado** | Linha digitável, `ticket_url` normalizado de `/staging/payments/` para `/sandbox/payments/`, endereço obrigatório do pagador e cancelamento/expiração com devolução de estoque validados no Sandbox (Pedidos #21 e #31) e Jest. | `MP-DIAG-09` *(E2E)* |
| **8** | Atualização dos estados das transações | **Com falhas identificadas** | Transições básicas estão cobertas com `FOR UPDATE`, mas `refunded`/`charged_back` não são protegidos contra downgrade, aprovação tardia sobre pedido cancelado gera estado inconsistente de estoque, `updateAdminOrder` reabre pedido cancelado sem re-reservar estoque e não invalida cache. | `MP-DIAG-06`, `MP-DIAG-07` |
| **9** | Recebimento e processamento de webhooks | **Com falhas identificadas** | Suporte dual `order`/`payment`, idempotência por `event_key` e fallback `external_reference` funcionam no cenário nominal, mas há falhas: ausência de rate limit, descarte dos metadados da API oficial em produção, perda definitiva de evento quando `!current` (race condition) e invalidação de cache incondicional. | `MP-DIAG-01`, `MP-DIAG-04`, `MP-DIAG-05`, `MP-DIAG-08` |
| **10** | Validação da autenticidade das notificações | **Com falhas identificadas** | `verifyMercadoPagoWebhookSignature` implementa manifesto v2 com `data.id` minúsculo e `timingSafeEqual`, porém não valida expiração temporal do campo `ts`, permitindo replay indefinido com `body.id` sintético. | `MP-DIAG-01` |
| **11** | Tratamento de pagamentos aprovados, pendentes, recusados e cancelados | **Implementado e validado** | Mensagens pt-BR centrais (`payment-status-messages.js`) e devolução única via `stock_restored` testadas no Sandbox e Jest; pendências cosméticas/operacionais em `AdminSales.js` (método de pagamento em inglês, `<select>` incompleto e modal sem status de pagamento). | `MP-DIAG-10` |
| **12** | Tratamento de erros e situações inesperadas | **Implementado e validado** | Falhas da API do MP retornam mensagens humanas sem vazar `error.message` cru, fazem rollback de estoque no checkout e retornam `502`/`503` no webhook em falha de consulta. Há branches de erro descobertos nos testes unitários. | `MP-DIAG-09` |
| **13** | Segurança das operações | **Com falhas identificadas** | Isolamento `customers` × `users`, `customerToken`, proteção `x-signature` e tokens client-side estão ativos; contudo permanecem abertos: webhook sem rate limit/anti-replay (`MP-DIAG-01`), mutações cruzadas de modalidade (`MP-DIAG-02`), brechas de higiene PCI no fallback/estado (`MP-DIAG-03`) e falta de rate limit em `GET /api/admin/orders` (`MP-DIAG-08`). | `MP-DIAG-01`, `MP-DIAG-02`, `MP-DIAG-03`, `MP-DIAG-08` |
| **14** | Testes automatizados e internos | **Parcialmente implementado** | 167 testes em 15 suítes Jest aprovados + 12 `.db.test.js` + 4 E2E Cypress. Contudo, `AdminSales.js` tem apenas 32,25% de funções testadas, faltam thresholds em `jest.config.js` para `lib/payment/` e `pages/api/webhooks/`, faltam cenários E2E para cartão/recusa/boleto e não há cenários de carga k6 para checkout/webhook. | `MP-DIAG-09` |

---

## 5. Auditoria da Atuação dos Agentes

### 5.1. Pontos Positivos Verificados na Janela

1. **Conformidade estrutural e arquitetural:** os agentes mantiveram rigorosamente a separação entre Modalidade A (Gestão de Produtos) e Modalidade B (Gestão de Vendas), o isolamento entre `customers` (`customerToken`) e `users`, e registraram as decisões da semana em ADRs e atualizações síncronas em `docs/ARQUITETURA_SITE_PUBLICO.md` e `docs/ARQUITETURA_SITE_PRIVADO.md`.
2. **Criação de guardas permanentes contra regressão:** destaque para [`tests/integration/domain/orders.db.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/domain/orders.db.test.js) (SQL real), ampliação da checagem estática de colunas em [`tests/unit/scripts/schema-sources.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/scripts/schema-sources.test.js), [`tests/unit/tests-hygiene/css-tokens.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/tests-hygiene/css-tokens.test.js) e autocorreção da duplicação em `verify-mp-webhook.js` no commit `6b69224`.
3. **Homologação abrangente no Sandbox:** validação metódica dos fluxos positivos, negativos e de borda (Pedidos #22 a #31 e entrega real via `cloudflared` + Simulador MP) sem comprometer o código de produção.
4. **Gates estáticos limpos:** zero ocorrências em `eslint`, `knip`, `lint:workflows`, `lint:chars`, `security:check-sql`, `security:check-credentials` e `bench-ground-truth.test.js`.

### 5.2. Falhas de Processo Identificadas (Alimentando `MP-DIAG-11`)

1. **Revisões parciais sem varredura de rotas irmãs e consumidores:**
   - Em `28b6b17` (*Melhorias API*), foram endurecidas `GET /api/checkout`, `GET /api/customer/orders` e `PUT /api/customer/auth`, mas `POST /api/webhooks/mercadopago` e `GET /api/admin/orders` ficaram sem revisão.
   - Em `00758a7` (*Alinhamento Gestão de Produtos*), o filtro `modality=external` foi adicionado apenas na UI/GET de `AdminProducts`, sem verificar os endpoints de mutação (`PUT`/`DELETE`/`reorder`) em `pages/api/products.js` e `pages/api/admin/internal-products.js`.
2. **Commit de spec Cypress sem execução local prévia (`dc77185` → `01a4a3f`):** a primeira versão de `checkout.cy.js` falhou no CI (`e2e.yml` Runs `#137`/`#138`) por sintaxe incorreta de `cy.intercept`.
3. **Quebra temporária por alteração de config de editor (`60acbc2` → `7d68032`):** mudança em `.vscode/settings.json` sem rodar `npm test` afetou 13 suítes por exposição de `.env` na execução do Jest (resolvido em `7d68032`, e nova regra já proposta no `melhoria_agente.md` / `AGENTS.md`).
4. **Imprecisão factual residual no Ciclo 1:** o relatório do Ciclo 1 afirmou na tabela inicial que `reconcile-orders.js` atuava "com lock", quando o mecanismo real de lock transacional (`SELECT ... FOR UPDATE`) fica apenas em `syncOrderPaymentStatus` (`lib/domain/orders.js`) — `reconcilePendingOrders` executa chamadas HTTP concorrentes sem single-flight/cooldown antes de gravar.
5. **Rastreabilidade de logs e autoria:** `logs/tests-output.log` e `logs/coverage-output.log` não gravam cabeçalho com data/hora nem SHA de commit, e o Git registra autor único sem identificar qual agente (OpenCode vs Antigravity) atuou em cada entrega.

---

## 6. Diagnóstico Detalhado dos Problemas

### `MP-DIAG-01` — Ausência de rate limiting e de expiração temporal (`ts`) no endpoint de Webhook
- **Identificação:** `MP-DIAG-01`
- **Classificação:** Novo no Ciclo 2 (origem histórica no commit `6424780`, 08/11/2026) — **Confirmado**
- **Descrição:** O endpoint `POST /api/webhooks/mercadopago` não aplica `checkRateLimit` em nenhuma etapa (nem no handler, nem em `proxy.js`), e `verifyMercadoPagoWebhookSignature` valida apenas o HMAC sobre `id:<dataId>;request-id:<requestId>;ts:<ts>;`, sem verificar se o timestamp `ts` está dentro de uma janela temporal recente. Como `body.id` não faz parte do manifesto assinado, qualquer requisição capturada com assinatura válida (ou sem assinatura fora de produção) pode ser retransmitida indefinidamente alterando apenas `body.id`.
- **Evidências:**
  - [`pages/api/webhooks/mercadopago.js:10-118`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js#L10-L118): ausência completa de chamada a `checkRateLimit` ou `getClientIP(req)`.
  - [`proxy.js:27-29,96-98`](file:///home/gus/projetos/Caminhar/proxy.js#L27-L29): `RATE_LIMIT_CONFIG` e `matcher` cobrem apenas `/api/auth/login`.
  - [`lib/payment/mercadopago.js:422-441`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js#L422-L441): extrai `const ts = parts.ts`, mas não impõe janela máxima (`|now - ts|`) nem valida se `ts` é numérico válido.
  - [`pages/api/webhooks/mercadopago.js:88`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js#L88): `const eventId = body?.id || ...` permite gerar chaves únicas infinitas na tabela `payment_webhook_events` caso `body.id` varie em replays.
- **Arquivos ou componentes envolvidos:** `pages/api/webhooks/mercadopago.js`, `lib/payment/mercadopago.js`.
- **Etapa em que ocorre:** Recepção e autenticação de webhooks (`POST /api/webhooks/mercadopago`).
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* prioridade dada à verificação da assinatura HMAC sem incluir camada de rate limiting por IP e verificação etária do timestamp `ts` (ambas ausentes na entrega inicial e não cobertas na revisão `28b6b17`).
  - *Hipótese:* assumiu-se que a assinatura `x-signature` bastaria contra abuso, desconsiderando ataques de replay com assinatura legítima antiga ou flood de requisições inválidas (`401`).
- **Impacto:** **Crítico/Alto** — flood de `POST` inválidos consome recursos do processo e logs; replay de evento assinado com variação de `body.id` provoca chamadas HTTP outbound repetidas contra `https://api.mercadopago.com/v1/orders/{id}` (risco de esgotamento de cota/rate limit da conta junto ao Mercado Pago) e crescimento artificial da tabela `payment_webhook_events`.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P0 (Crítica/Alta)**

---

### `MP-DIAG-02` — Falta de isolamento server-side de `modality` em mutações e reordenação de produtos
- **Identificação:** `MP-DIAG-02`
- **Classificação:** Novo no Ciclo 2 (origem histórica no commit `6424780`, 08/11/2026) — **Confirmado**
- **Descrição:** Embora `GET /api/admin/internal-products` passe `modality = 'internal'` e a UI de `AdminProducts` passe `?modality=external` no `GET /api/products` (desde `00758a7`), nenhum dos dois endpoints nem o domínio `lib/domain/products.js` validam `modality` nas operações de `PUT` (edição), `DELETE` (exclusão) ou `PUT action: "reorder"`. Um operador autenticado apenas com a permissão `Gestão de Produtos` pode editar, publicar/despublicar, reordenar ou excluir um produto interno (`modality = 'internal'`) via `/api/products`, e um operador com permissão apenas em `Gestão de Vendas` pode fazer o inverso via `/api/admin/internal-products` (ou mesmo converter um produto externo em interno enviando seu ID).
- **Evidências:**
  - [`pages/api/admin/internal-products.js:165-167,196-199,224`](file:///home/gus/projetos/Caminhar/pages/api/admin/internal-products.js#L165-L224): `updateRecords('products', { position }, { id })`, `updateProduct(updateId, ...)` e `deleteProduct(deleteId)` filtram apenas por `id` (e em L198 o `PUT` força `modality: 'internal'` sobre qualquer `id`).
  - [`pages/api/products.js:264-266,298,334`](file:///home/gus/projetos/Caminhar/pages/api/products.js#L264-L334): `updateRecords`, `updateProduct` e `deleteProduct` também filtram apenas por `id` e permitem que `handleAdminGet` sem `?modality=external` devolva produtos internos se chamado diretamente.
  - [`lib/domain/products.js:232-270`](file:///home/gus/projetos/Caminhar/lib/domain/products.js#L232-L270): `updateProduct(id, data)` e `deleteProduct(id)` não aceitam filtro opcional de `expectedModality`.
  - Violação direta da regra de proteção em `docs/ARQUITETURA_SITE_PRIVADO.md` §9 (separação Gestão de Produtos × Gestão de Vendas e autorização fail-closed).
- **Arquivos ou componentes envolvidos:** `pages/api/admin/internal-products.js`, `pages/api/products.js`, `lib/domain/products.js`, `components/Admin/AdminProducts.js`.
- **Etapa em que ocorre:** Gestão administrativa de produtos externos e internos no `/admin`.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* separação das modalidades construída originalmente apenas como filtro de consulta (`GET`) mantendo a mesma tabela `products` e funções genéricas de `updateProduct`/`deleteProduct` por `id`.
  - *Hipótese:* nenhum operador de teste possuía cargo granular sem todas as permissões durante a homologação, ocultando a brecha entre as duas abas.
- **Impacto:** **Alto** — quebra da fronteira de RBAC entre Gestão de Produtos (afiliados) e Gestão de Vendas (e-commerce com estoque/Mercado Pago), permitindo alteração acidental ou indevida de preço/estoque/exclusão de itens de outra área.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P1 (Alta)**

---

### `MP-DIAG-03` — Superfície PCI-DSS desnecessária no fallback de tokenização, schema `cardNumber` e estado React do checkout
- **Identificação:** `MP-DIAG-03`
- **Classificação:** Novo no Ciclo 2 (origem histórica no commit `819bcb1`, 13/11/2026) — **Confirmado**
- **Descrição:** Três lacunas de higiene PCI-DSS foram identificadas no fluxo de cartão:
  1. Em `pages/checkout/[id].js`, quando `mp.createCardToken` falha com `'SSL certificate is required'` (exigência do SDK JS v2 em conexões sem HTTPS), o código realiza chamada direta via `fetch('https://api.mercadopago.com/v1/card_tokens?public_key=...')` sempre que `window.location?.protocol === 'http:'`, sem restringir a `localhost`/`127.0.0.1` e mantendo o bloco compilado também em produção.
  2. Em `pages/api/checkout.js`, `paymentDetails.cardNumber` continua declarado no schema Zod e aceito pelo `POST` sem rejeição em produção (embora seja apagado em L227 apenas quando `token` está presente).
  3. Após finalizar a compra (`setCompletedOrder(data.order)`), `pages/checkout/[id].js` limpa apenas `cardSecurityCode` (`L630`), mantendo `cardNumber` e `cardExpiry` preenchidos em memória React até o usuário sair da página.
- **Evidências:**
  - [`pages/checkout/[id].js:137-172`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js#L137-L172): `isHttpProtocol = typeof window !== 'undefined' && window.location?.protocol === 'http:'` sem validação de `NODE_ENV !== 'production'` nem de hostname local (`localhost` / `127.0.0.1`).
  - [`pages/checkout/[id].js:630`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js#L630): `setCardSecurityCode('');` sem limpar `setCardNumber('')` e `setCardExpiry('')`.
  - [`pages/api/checkout.js:41,227`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js#L41): `cardNumber: z.string().trim().optional()` ainda aceito no schema de entrada.
- **Arquivos ou componentes envolvidos:** `pages/checkout/[id].js`, `pages/api/checkout.js`, `lib/payment/mercadopago.js` (`L328` modo mock sem token).
- **Etapa em que ocorre:** Tokenização no navegador e recepção do payload de checkout de cartão.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* o fallback direto `/v1/card_tokens` foi introduzido para destravar testes no `http://localhost:3000` sem HTTPS (ADR-0039/0040), e o campo legado `cardNumber` foi mantido no schema apenas para o fallback de mock local sem `MP_ACCESS_TOKEN`.
- **Impacto:** **Alto** — em ambiente de staging/homologação HTTP não-local ou configuração incorreta sem HTTPS em produção, dados de cartão sairiam do fluxo oficial do SDK JS v2; além disso, aceitar `cardNumber` no payload do servidor aumenta escopo de auditoria PCI-DSS.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P1 (Alta)**

---

### `MP-DIAG-04` — Webhook em produção descarta metadados da API oficial e persiste campos vindos do corpo da requisição
- **Identificação:** `MP-DIAG-04`
- **Classificação:** Novo no Ciclo 2 (origem histórica no commit `f46ebf4`, 14/11/2026) — **Confirmado**
- **Descrição:** O módulo `lib/payment/mercadopago.js` já oferece `fetchMercadoPagoPaymentDetails(id, { eventType })`, que retorna `{ paymentStatus, rawStatus, mpOrderStatus, statusDetail, externalReference, transactionId }` diretamente da API oficial do Mercado Pago. Porém, `pages/api/webhooks/mercadopago.js` chama apenas `fetchMercadoPagoPaymentStatus` (que descarta tudo exceto `paymentStatus`), enquanto lê `externalReference`, `bodyStatusDetail`, `resolvedOrderStatus` e `resolvedTxId` exclusivamente de `req.body` (que não é autenticado pelo HMAC em seu conteúdo completo, apenas `data.id`). Em notificações enxutas que trazem somente `{ type: 'order', data: { id: 'ORD...' } }` (ou se o corpo for adulterado em campos extras), o `external_reference` e os detalhes gravados em `mp_payload` ficam vazios ou divergentes da API oficial.
- **Evidências:**
  - [`pages/api/webhooks/mercadopago.js:58-86,90-105`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js#L58-L105): extrai `txPayment`, `bodyStatusDetail`, `resolvedOrderStatus`, `resolvedTxId` e `externalReference` do `body` nas linhas 58–66; nas linhas 73–75 chama `fetchMercadoPagoPaymentStatus` (em vez de `fetchMercadoPagoPaymentDetails`).
  - [`lib/payment/mercadopago.js:339-392`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js#L339-L392): `fetchMercadoPagoPaymentDetails` já existe e retorna os metadados autoritativos completos.
- **Arquivos ou componentes envolvidos:** `pages/api/webhooks/mercadopago.js`, `tests/integration/api/webhooks/mercadopago.test.js`.
- **Etapa em que ocorre:** Processamento de notificações webhook em produção / ambientes com `MP_ACCESS_TOKEN`.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* quando o ADR-0041 introduziu `fetchMercadoPagoPaymentDetails` para a reconciliação ativa (`reconcile-orders.js`), o handler de webhook manteve a chamada antiga `fetchMercadoPagoPaymentStatus` e adicionou leitura de metadados do `body` para acelerar o registro de `mp_payload`.
- **Impacto:** **Alto** — `external_reference` ausente no corpo impede o fallback de condição de corrida (`ADR-0041`); `status_detail` e `mp_transaction_id` no banco/UI podem ficar ausentes ou desalinhados com a API oficial do Mercado Pago.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P1 (Alta)**

---

### `MP-DIAG-05` — Evento de webhook em condição de corrida (`!current`) é gravado como concluído e retorna HTTP 200
- **Identificação:** `MP-DIAG-05`
- **Classificação:** Novo no Ciclo 2 (origem histórica no commit `6424780`, 08/11/2026) — **Confirmado**
- **Descrição:** Em `processMercadoPagoWebhookEvent` (`lib/domain/orders.js`), o `INSERT INTO payment_webhook_events` acontece antes da localização do pedido por `mp_payment_id` / `external_reference`. Se o webhook chegar milissegundos antes de `attachOrderPaymentInfo` concluir a gravação de `mp_payment_id` (ou se ocorrer qualquer condição transitória em que `!current`), a transação faz `COMMIT` normalmente gravando `event_key` em `payment_webhook_events` e o endpoint responde `HTTP 200 { received: true, duplicate: false, orderId: null }`. Como o evento ficou registrado em `payment_webhook_events` e o MP recebeu `200 OK`, o Mercado Pago **nunca mais reenvia** o webhook e futuras tentativas com o mesmo `event_key` serão ignoradas como `duplicate: true`.
- **Evidências:**
  - [`lib/domain/orders.js:535-585`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js#L535-L585): insere em `payment_webhook_events` na L535–542 e retorna `{ duplicate: false, order: null }` na L583 sem desfazer o insert (commitando a transação).
  - [`pages/api/webhooks/mercadopago.js:109-113`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js#L109-L113): retorna sempre `200` mesmo quando `result.order` é `null` (diferenciando apenas tópico ignorado na L51).
  - Nota: embora `externalReference` reduza a chance no `attachOrderPaymentInfo` após `createInternalOrder`, caso ocorra atraso entre a chamada ao MP e a disponibilidade do registro ou falha temporária de visibilidade, o evento é permanentemente perdido do ponto de vista de push.
- **Arquivos ou componentes envolvidos:** `lib/domain/orders.js`, `pages/api/webhooks/mercadopago.js`.
- **Etapa em que ocorre:** Persistência de eventos de webhook em `processMercadoPagoWebhookEvent`.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* opção inicial de responder `200` para evitar retries infinitos quando eventos de outro ambiente/aplicação ou notificações legadas chegam para pedidos desconhecidos; porém, sem distinguir um `order` inexistente de um `order` com `externalReference` válido não localizado (ou sem rollback do `event_key`), um atraso real é engolido silenciosamente.
- **Impacto:** **Alto** — em condição de corrida no momento da criação da ordem ou notificação `order.processed` antecipada sem `external_reference` resolvível, o pagamento é perdido no fluxo push (dependendo exclusivamente de o comprador ou admin abrir a página para disparar reconciliação pull).
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P1 (Alta)**

---

### `MP-DIAG-06` — Lacunas na máquina de estados, consistência de estoque e ausência de idempotência contra duplo submit no checkout
- **Identificação:** `MP-DIAG-06`
- **Classificação:** Novo no Ciclo 2 (origem histórica nos commits `6424780` e `819bcb1`) — **Confirmado**
- **Descrição:** Cinco fragilidades foram verificadas na transição de estados e controle de estoque em `lib/domain/orders.js`, `pages/api/checkout.js` e `pages/api/admin/orders.js`:
  1. **Downgrade de `refunded` / `charged_back`:** `applyPaymentStatusTransition` (`orders.js:428-435`) impede downgrade apenas de `approved`, `rejected` e `cancelled` quando chega status transitório (`pending`/`in_process`/`authorized`). Se o pedido já estiver `refunded` ou `charged_back` e chegar um evento atrasado de `pending` ou `approved`, o status é rebaixado indevidamente.
  2. **Aprovação tardia sobre pedido já cancelado (`stock_restored = true`):** se um boleto ou pedido já estiver `cancelled` (com estoque devolvido) e posteriormente chegar `paymentStatus = 'approved'` (ex.: pagamento efetuado no limite do vencimento ou cancelamento manual antecipado pelo admin), `applyPaymentStatusTransition` grava `payment_status = 'approved'` mantendo `order_status = 'cancelled'` e `stock_restored = true`, sem sinalizar anomalia financeira nem gerar alerta/auditoria para conciliação de estorno ou re-reserva.
  3. **Reabertura administrativa sem reserva de estoque:** em `updateAdminOrder` (`orders.js:371-407`), se o operador mudar um pedido de `cancelled` (`stock_restored = true`) de volta para `paid`/`preparing`/`shipped`, o estoque devolvido não é re-reservado nem a transição é bloqueada, criando risco de venda dupla do estoque físico.
  4. **Cache `products:*` desatualizado no cancelamento admin:** `PUT /api/admin/orders` (`pages/api/admin/orders.js:140-158`) devolve estoque ao cancelar um pedido em `updateAdminOrder`, mas não chama `invalidateCache('products:*')`, deixando a vitrine pública mostrando estoque desatualizado (ou `"Esgotado"`) até o TTL expirar.
  5. **Ausência de idempotência de tentativa do cliente no `POST /api/checkout`:** `X-Idempotency-Key` no MP usa `caminhar-order-${order.id}`, mas cada chamada HTTP `POST /api/checkout` (duplo clique, timeout de rede no cliente com retry) cria um novo `order.id` em `createInternalOrder`, reservando estoque duas vezes e gerando duas ordens no Mercado Pago.
- **Evidências:**
  - [`lib/domain/orders.js:428-453`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js#L428-L453) (`applyPaymentStatusTransition`).
  - [`lib/domain/orders.js:371-407`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js#L371-L407) (`updateAdminOrder`).
  - [`pages/api/admin/orders.js:140-158`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js#L140-L158) (sem `invalidateCache('products:*')`).
  - [`pages/api/checkout.js:179-270`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js#L179-L270) e [`pages/checkout/[id].js:603-621`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js#L603-L621) (sem chave de idempotência por tentativa de checkout).
- **Arquivos ou componentes envolvidos:** `lib/domain/orders.js`, `pages/api/checkout.js`, `pages/checkout/[id].js`, `pages/api/admin/orders.js`.
- **Etapa em que ocorre:** Criação do pedido, transição de status de pagamento/pedido e atualização operacional no `/admin`.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* tratamento incremental das regras de estado (ADR-0039 protegeu `approved`/`rejected`/`cancelled` contra `pending`, mas omitiu estados pós-aprovação e reabertura admin; idempotência foi aplicada apenas entre servidor → MP).
- **Impacto:** **Alto** — risco real de dupla cobrança ao cliente em instabilidade de rede no checkout, divergência silenciosa entre pagamento aprovado no MP e pedido cancelado no site, e vitrine mostrando produto esgotado após cancelamento admin.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P1 (Alta)**

---

### `MP-DIAG-07` — Lacunas de mapeamento de status, validação de documento/quantidade/parcelas e diagnóstico de ambiente
- **Identificação:** `MP-DIAG-07`
- **Classificação:** Novo no Ciclo 2 (origem histórica em `819bcb1`/`6424780`) — **Confirmado**
- **Descrição:** Foram detectadas 4 inconsistências de validação e mapeamento:
  1. `mapMercadoPagoStatus` (`lib/payment/mercadopago.js:10-41`) trata `in_mediation` e `partially_refunded` apenas como `detail` sob `status === 'processed'`, mas na API legada `/v1/payments` ou em respostas específicas, `status: 'in_mediation'` retorna `'in_mediation'` (sem mapear para `'charged_back'`) e `status: 'partially_refunded'` retorna sem normalizar para `'refunded'`.
  2. `isValidCpfCnpjDigits` (`lib/payment/payment-status-messages.js:162-166`) verifica apenas comprimento (`11` ou `14` dígitos) e repetição (`111...`), aceitando CPFs/CNPJs com dígito verificador inválido (ex.: `12345678900`), que só são rejeitados tardiamente pela API do Mercado Pago com `HTTP 400`/`422` após criar e cancelar pedido no banco.
  3. Em `pages/api/checkout.js`, `quantity` (`L30-33`) usa `Math.max(1, parseInt(v, 10) || 1)` (coagindo `0`, negativos ou strings inválidas como `'abc'` silenciosamente para `1` em vez de recusar com `HTTP 400`) e `installments` (`L42`) não valida inteiro entre `1` e `12` (`credit_card`) / `1` (`debit_card`), além de o servidor não recalcular/rejeitar previamente pedidos abaixo do valor mínimo do Mercado Pago antes de gravar `orders` no banco.
  4. Em `scripts/check-env.js`, a equipe adicionou em 19/11 validações de consistência para as credenciais do Google (`GOOGLE_CLIENT_ID` × `NEXT_PUBLIC_GOOGLE_CLIENT_ID`), mas **não existe verificação equivalente para o Mercado Pago** (ex.: alertar se `NODE_ENV=production` está sem `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`/`NEXT_PUBLIC_MP_PUBLIC_KEY`, ou se há mistura entre prefixo `TEST-` e `APP_USR-`, ou se `MP_ACCESS_TOKEN` está definido sem `NEXT_PUBLIC_MP_PUBLIC_KEY` deixando o cartão sem tokenização no frontend).
- **Evidências:**
  - [`lib/payment/mercadopago.js:10-41`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js#L10-L41).
  - [`lib/payment/payment-status-messages.js:162-166`](file:///home/gus/projetos/Caminhar/lib/payment/payment-status-messages.js#L162-L166).
  - [`pages/api/checkout.js:30-49,50-89`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js#L30-L89).
  - [`scripts/check-env.js:46-59`](file:///home/gus/projetos/Caminhar/scripts/check-env.js#L46-L59) vs ausência de checagem MP.
- **Arquivos ou componentes envolvidos:** `lib/payment/mercadopago.js`, `lib/payment/payment-status-messages.js`, `pages/api/checkout.js`, `scripts/check-env.js`.
- **Etapa em que ocorre:** Boot do servidor (`check-env`), validação pré-checkout e normalização de retorno da API.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* validação simplificada de CPF/CNPJ e `quantity` mantida desde a primeira entrega; `check-env.js` recebeu validação detalhada apenas no ciclo de melhoria do Google (`f161227`).
  - *Hipótese:* o uso de documentos de teste no Sandbox influenciou a omissão do dígito verificador (observando-se que CPFs válidos sinteticamente como `19119119100` passam no módulo 11 e já são os usados nos testes atuais).
- **Impacto:** **Médio** — compras com CPF/CNPJ digitado errado criam/cancelam registros `orders` desnecessariamente antes de falhar no gateway; deploy em produção com `MP_ACCESS_TOKEN` sem `NEXT_PUBLIC_MP_PUBLIC_KEY` quebraria pagamentos com cartão na validação Zod do servidor (`Tokenização obrigatória`).
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P2 (Média)**

---

### `MP-DIAG-08` — Rate limit ausente em `GET /api/admin/orders`, cache no webhook, falta de cooldown na reconciliação e orçamento de métricas
- **Identificação:** `MP-DIAG-08`
- **Classificação:** Novo no Ciclo 2 — **Confirmado**
- **Descrição:** Quatro pontos de resiliência e eficiência em operação contínua:
  1. `GET /api/admin/orders` (`pages/api/admin/orders.js:69-118`) aplica `checkRateLimit` apenas no `PUT` (L122), deixando `GET` sem rate limit nem limite de tamanho em `search` (`≤ 200` chars). Como o `GET` dispara até 5 chamadas paralelas ao Mercado Pago por requisição (por `reconcilePendingOrders`), atualizações rápidas ou filtro abusivo amplificam chamadas externas ao MP e carga `ILIKE` no PostgreSQL.
  2. `pages/api/webhooks/mercadopago.js:107` chama `await invalidateCache('products:*')` incondicionalmente, mesmo quando `result.duplicate === true`, quando `!result.order` ou quando o evento não alterou estoque (`stock_restored` não mudou).
  3. `lib/payment/reconcile-orders.js:20-93` não possui lock/cooldown em memória/cache por `mp_payment_id` e olha apenas `orders.slice(0, maxOrders)` da listagem recebida. Se houver 6+ pedidos pendentes na lista ou polling concorrente no checkout (`5s`) + `/admin`, os primeiros 5 geram chamadas repetidas a cada consulta e pedidos a partir da 6ª posição nunca são reconciliados pelo lote.
  4. `hooks/usePerformanceMetrics.js:315` inclui `/api/checkout` no orçamento estendido de 5s (`GATEWAY_PATH_PREFIXES`), mas não inclui `/api/customer/orders` nem `/api/admin/orders`, que executam chamadas síncronas à API do Mercado Pago durante reconciliação ativa.
- **Evidências:**
  - [`pages/api/admin/orders.js:69-128`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js#L69-L128).
  - [`pages/api/webhooks/mercadopago.js:107`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js#L107).
  - [`lib/payment/reconcile-orders.js:20-84`](file:///home/gus/projetos/Caminhar/lib/payment/reconcile-orders.js#L20-L84).
  - [`hooks/usePerformanceMetrics.js:313-316`](file:///home/gus/projetos/Caminhar/hooks/usePerformanceMetrics.js#L313-L316).
- **Arquivos ou componentes envolvidos:** `pages/api/admin/orders.js`, `pages/api/webhooks/mercadopago.js`, `lib/payment/reconcile-orders.js`, `hooks/usePerformanceMetrics.js`.
- **Etapa em que ocorre:** Consultas de pedidos (visitante/admin), processamento de webhook e reconciliação ativa.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* o endurecimento de `28b6b17` focou apenas `GET /api/customer/orders` e rotas públicas, sem revisar `GET /api/admin/orders`; e a reconciliação nasceu sem throttle/single-flight para manter implementação simples.
- **Impacto:** **Médio** — chamadas redundantes à API do Mercado Pago, invalidações desnecessárias do cache de produtos da vitrine e falsos warnings de `[Performance] Slow resource` durante polling/reconciliação em desenvolvimento.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P2 (Média)**

---

### `MP-DIAG-09` — Lacunas de cobertura de testes (unitários, integração, E2E e carga)
- **Identificação:** `MP-DIAG-09`
- **Classificação:** Novo no Ciclo 2 — **Confirmado**
- **Descrição:** Embora 15 suítes (167 testes) passem hoje, `logs/coverage-output.log` (22/11/2026) e a revisão dos arquivos de teste revelam buracos importantes:
  1. **`components/Admin/AdminSales.js`:** **75,89% Lines | 61,64% Branches | 32,25% Functions**. Não há teste algum exercitando o modal `"Gerenciar Pedido"` (`L642-707`), o submit `PUT /api/admin/orders` (`L388-419`), os filtros de busca/status/pagamento (`L510-552`), a subaba `Produtos Internos` (`L712-746`), `ShippingTypeSelect` (`L19-39`), `getPaymentBadge`/`getOrderBadge` (`L232-254`) ou `handleExportOrdersCsv` (`L422-441`).
  2. **Branches descobertos em rotas e módulos críticos:**
     - `lib/payment/mercadopago.js`: **68,44% Branches** (linhas `27, 29, 35, 37, 64-68, 87-88, 106-107, 170, 268-276, 439-440` — falha de rede/timeout, `invalid_transaction_amount`, CNPJ, `collector_id`, erro `timingSafeEqual`).
     - `pages/api/checkout.js`: **72,97% Branches** (linhas `55-60, 153-157, 171-175, 190-194, 201-202, 211-212, 265, 271-276` — rate limit 429 no POST, cliente inexistente, `PRODUCT_NOT_FOUND`, CPF inválido no schema, erro 500).
     - `lib/auth/customer-auth.js`: **52,63% Branches** (linhas `32-33, 38-39, 75-77` — falha de `JWT_SECRET` fora de dev/test e expiração de token).
     - `pages/api/admin/orders.js`: `tests/integration/api/admin/orders.test.js:138` passa `paymentStatus: 'paid'` no mock (um status de *pedido*, não de *pagamento* — `approved` é o valor real do filtro), o que mascara inconsistências semânticas em fixtures.
  3. **Thresholds ausentes em `jest.config.js:45-76`:** não existem pisos de cobertura específicos para `lib/payment/`, `pages/api/webhooks/` nem `pages/api/customer/`, e `pages/checkout/[id].js` e `pages/minha-conta.js` nem entram em `collectCoverageFrom` (`L27-35`).
  4. **Cobertura E2E e Carga incompletas:** `cypress/e2e/checkout.cy.js` testa apenas PIX (sem cenários para cartão de crédito/tokenização, recusa `402` + botão `"Tentar outro meio de pagamento"` ou boleto); e `load-tests/` não possui nenhum cenário k6 exercitando `/api/checkout`, `/api/webhooks/mercadopago` ou `/api/customer/orders`.
- **Evidências:**
  - `logs/coverage-output.log` (22/11/2026) — métricas verificadas linha a linha via `grep`.
  - [`jest.config.js:27-76`](file:///home/gus/projetos/Caminhar/jest.config.js#L27-L76).
  - [`tests/integration/api/admin/orders.test.js:138`](file:///home/gus/projetos/Caminhar/tests/integration/api/admin/orders.test.js#L138).
  - [`cypress/e2e/checkout.cy.js:1-159`](file:///home/gus/projetos/Caminhar/cypress/e2e/checkout.cy.js#L1-L159) e listagem de `load-tests/` (vazia para checkout/MP).
- **Arquivos ou componentes envolvidos:** `tests/unit/components/Admin/AdminSales.test.js`, `tests/unit/lib/payment/mercadopago.test.js`, `tests/integration/api/checkout.test.js`, `tests/integration/api/admin/orders.test.js`, `jest.config.js`, `cypress/e2e/checkout.cy.js`, `load-tests/`.
- **Etapa em que ocorre:** Validação contínua (Jest, cobertura, Cypress e testes de carga/segurança k6).
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* priorização compreensível da camada de domínio (`orders.js` com 98,82%) e do fluxo PIX durante a entrega inicial, enquanto `AdminSales.test.js` nasceu em `c676098` apenas para testar CSS/botões e `Pedidos (0)`.
- **Impacto:** **Médio** — regressões de lógica na UI administrativa de pedidos (`AdminSales`), em tratamentos de erro/timeout do Mercado Pago e no fluxo E2E de cartão/boleto não seriam detectadas automaticamente no CI.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P2 (Média)**

---

### `MP-DIAG-10` — Dívida técnica de padronização, UX do `/admin`, consultas em `stats.js` e leitura de múltiplos pagamentos
- **Identificação:** `MP-DIAG-10`
- **Classificação:** Novo no Ciclo 2 — **Confirmado**
- **Descrição:** Conjunto de melhorias de manutenibilidade e operação interna:
  1. **Duplicação de middleware:** `pages/api/admin/orders.js` (`L29-66`) e `pages/api/admin/internal-products.js` (`L62-99`) replicam manualmente `requireAuth` + `requireSalesPermission`, em vez de utilizar `createAdminHandler` (`lib/api/adminCrudHandler.js`), contrariando a diretriz de reutilização do `AGENTS.md` §6 (nota: ao migrar, observar o padrão do canário `bench-ground-truth.test.js`).
  2. **UX da tabela e filtros em `AdminSales.js`:**
     - A coluna `"Pagamento"` (`L602`) renderiza `order.payment_method` cru em inglês (`pix`, `credit_card`, `debit_card`, `ticket`), enquanto `pages/minha-conta.js:33-38` já traduz para pt-BR (`PIX`, `Cartão de crédito`, `Cartão de débito`, `Boleto bancário`).
     - O `<select>` de filtro (`L204-212`) omite `Autorizado` (`authorized`) e `Contestado` (`charged_back`), e o badge (`L237-241`) funde `rejected` e `cancelled` em `"Recusado/Canc."` (dificultando distinguir recusa de cartão de boleto expirado/cancelado).
     - O modal `"Gerenciar Pedido"` (`L643-665`) não exibe `payment_method`, `payment_status`, `status_detail` nem `mp_transaction_id` (`PAY...`); e o CSV exportado (`L423-434`) omite `mp_payment_id` (`ORD...`) e `created_at`.
  3. **33 queries paralelas em `pages/api/admin/stats.js`:** `L19-53` dispara 33 `SELECT COUNT(*)` separados (11 apenas sobre `orders`), quando 1 única query com `COUNT(*) FILTER (WHERE ...)` sobre `orders` e 1 sobre `products` reduziriam drasticamente conexões simultâneas do pool.
  4. **Leitura de apenas `transactions.payments[0]` em `mercadopago.js`:** `L151` e `L372` assumem sempre o primeiro elemento do array `transactions.payments`, ignorando eventuais cenários multi-tentativa onde uma nova tentativa bem-sucedida fique após a primeira falha na mesma Order.
- **Evidências:**
  - [`pages/api/admin/orders.js:29-66`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js#L29-L66) e [`pages/api/admin/internal-products.js:62-99`](file:///home/gus/projetos/Caminhar/pages/api/admin/internal-products.js#L62-L99).
  - [`components/Admin/AdminSales.js:204-245,423-434,602,643-665`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js#L204-L665).
  - [`pages/api/admin/stats.js:19-53`](file:///home/gus/projetos/Caminhar/pages/api/admin/stats.js#L19-L53).
  - [`lib/payment/mercadopago.js:151,372`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js#L151).
- **Arquivos ou componentes envolvidos:** `pages/api/admin/orders.js`, `pages/api/admin/internal-products.js`, `components/Admin/AdminSales.js`, `pages/api/admin/stats.js`, `lib/payment/mercadopago.js`, `scripts/bench/` (caso `createAdminHandler` altere contagem esperada).
- **Etapa em que ocorre:** Operação administrativa de vendas, dashboard e parsing de Orders API.
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* `orders.js` e `internal-products.js` possuem regras ligeiramente diferentes de rate limit apenas em mutação (POST/PUT/DELETE) vs GET, levando à cópia de `requireAuth`/`requireSalesPermission`; `stats.js` seguiu o padrão aditivo anterior.
- **Impacto:** **Médio-Baixo** — sobrecarga desnecessária de conexões no pool durante carregamento do Dashboard e experiência operacional menos clara para o operador de vendas (rótulos em inglês e falta de `status_detail` no modal).
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P3 (Média-Baixa)**

---

### `MP-DIAG-11` — Lacunas no processo dos agentes (varreduras parciais, execução E2E e rastreabilidade)
- **Identificação:** `MP-DIAG-11`
- **Classificação:** Recorrente na janela (16/11 a 23/11) — **Confirmado**
- **Descrição:** A análise dos commits da semana revelou falhas processuais recorrentes relacionadas à condução das tarefas pelos agentes:
  1. **Correções aplicadas por lote parcial sem checar rotas/operações irmãs:** `28b6b17` deixou de auditar `webhooks/mercadopago.js` e `GET admin/orders.js`; `00758a7` isolou apenas `GET` de produtos sem proteger `PUT`/`DELETE`/`reorder`.
  2. **Commit de spec Cypress sem execução local prévia:** `dc77185` quebrou no CI `e2e.yml` exigindo hotfix imediato em `01a4a3f` (já endereçado documentalmente no `AGENTS.md` §7 item 1 em 23/11, ainda pendente de fechamento de ciclo operacional).
  3. **Imprecisão técnica no relatório do Ciclo 1 e falta de metadados nos logs:** descrição incorreta de "lock" em `reconcile-orders.js` (o lock fica em `syncOrderPaymentStatus`) e ausência de timestamp/SHA em `logs/tests-output.log` e `logs/coverage-output.log` (além da impossibilidade de distinguir OpenCode vs Antigravity pelos commits).
- **Evidências:**
  - `git show 28b6b17`, `git show 00758a7`, `git show dc77185`, `git show 01a4a3f`, `git show 60acbc2`, `git show dbcbbc0`, `git show 6b69224`.
  - Seção 1 linha 33 do Ciclo 1 neste arquivo vs [`lib/payment/reconcile-orders.js:20-93`](file:///home/gus/projetos/Caminhar/lib/payment/reconcile-orders.js#L20-L93).
  - [`docs/retorno_da_semana.md`](file:///home/gus/projetos/Caminhar/docs/retorno_da_semana.md) (`OCOR-2026-11-23-07`).
- **Arquivos ou componentes envolvidos:** `AGENTS.md`, `package.json` (`scripts:log`), fluxo operacional OpenCode/Antigravity, `docs/melhoria_mercadopago.md`.
- **Etapa em que ocorre:** Planejamento, revisão e fechamento pela Definição de Pronto (`AGENTS.md` §7).
- **Causa identificada vs. Hipótese:**
  - *Causa identificada:* execução focada no sintoma imediato reportado (ex.: `Pedidos (0)` ou lista `AdminProducts`) sem checklist de varredura horizontal por subsistema (todas as rotas de pagamento ou todas as operações CRUD da entidade).
- **Impacto:** **Baixo-Médio** — gera retrabalho entre commits consecutivos e dificulta auditoria pós-incidente.
- **Situação atual:** **Aberto**
- **Prioridade recomendada:** **P3 (Baixa-Média)**

---

## 7. Plano de Ação — Correções e Melhorias Recomendadas

### `AC-MP-01` — Rate limiting e janela anti-replay temporal (`ts`) no Webhook do Mercado Pago
- **Objetivo:** Proteger `POST /api/webhooks/mercadopago` contra flood, negação de serviço, amplificação de chamadas outbound ao Mercado Pago e replay indefinido de notificações antigas.
- **Problema que pretende resolver:** `MP-DIAG-01`.
- **Arquivos ou componentes envolvidos:** [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js), [`lib/payment/mercadopago.js`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js), [`tests/unit/lib/payment/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/payment/mercadopago.test.js), [`tests/integration/api/webhooks/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/webhooks/mercadopago.test.js), [`scripts/maintenance/verify-mp-webhook.js`](file:///home/gus/projetos/Caminhar/scripts/maintenance/verify-mp-webhook.js).
- **Alterações propostas:**
  1. Em `pages/api/webhooks/mercadopago.js`, aplicar `checkRateLimit(getClientIP(req), 'api:webhooks:mercadopago', 120, 60000)` antes do processamento pesado, retornando `429` quando excedido (respeitando IPs/limites compatíveis com rajadas legítimas do MP).
  2. Em `verifyMercadoPagoWebhookSignature` (`lib/payment/mercadopago.js`), validar que `ts` é numérico inteiro e está dentro de uma janela máxima de tolerância configurável (ex.: `maxAgeSeconds = 300` — ±5 minutos em torno de `Date.now() / 1000`, com opção explícita `ignoreTimestamp: true` somente se necessário em testes unitários legados com `ts=1700000000` após atualizar as suítes).
  3. Usar chave idempotente determinística preferindo `body.id` apenas se combinado com validação de assinatura fresca, ou normalizar `eventId` para evitar spam de chaves sintéticas sem mudança de `data.id` + `action` + `paymentStatus`.
- **Justificativa técnica:** A assinatura HMAC prova origem no instante de emissão, mas sem validação do `ts` e sem rate limit um atacante com payload capturado ou bots fazendo brute force de `POST` sobrecarregam o endpoint e a cota na API do Mercado Pago.
- **Dependências:** Atualizar timestamps nos mocks de `tests/integration/api/webhooks/mercadopago.test.js` (`ts=1700000000` e `tests/unit/lib/payment/mercadopago.test.js`) para usar `Math.floor(Date.now() / 1000)` (e testar explicitamente rejeição de `ts` expirado). Conferir `TRUST_PROXY` no ambiente de produção para que o IP do MP não caia em bucket errado.
- **Impactos esperados:** Bloqueio de replay antigo (`401`) e flood (`429`) sem afetar entregas legítimas do Mercado Pago em tempo real.
- **Riscos:** Rejeição de retries legítimos muito atrasados do Mercado Pago (> 5 min) caso o MP reutilize o mesmo `ts` original no reenvio. *Mitigação:* verificar em homologação se o MP re-assina com novo `ts` em retries e adotar janela segura (ex.: 15–30 min em produção, ou validar `ts` apenas se vier no futuro/muito antigo + `data.id` + `paymentStatus` como idempotência). Além disso, **reconciliação ativa** (`AC-MP-08`) garante convergência mesmo se algum retry tardio for rejeitado.
- **Critérios de validação:** Testes unitários validando aceitação dentro da janela e rejeição de `ts` expirado/não-numérico; teste de integração retornando `429` ao exceder rate limit; `verify-mp-webhook.js --send` gerando `ts` atual e respondendo `200`.

---

### `AC-MP-02` — Isolamento estrito de `modality` em todas as mutações e listagens de produtos
- **Objetivo:** Impedir que operações da Gestão de Produtos (`external`) modifiquem/excluam/reordenem produtos da Gestão de Vendas (`internal`) e vice-versa, garantindo a fronteira de RBAC (`ARQUITETURA_SITE_PRIVADO.md` §9).
- **Problema que pretende resolver:** `MP-DIAG-02`.
- **Arquivos ou componentes envolvidos:** [`lib/domain/products.js`](file:///home/gus/projetos/Caminhar/lib/domain/products.js), [`pages/api/products.js`](file:///home/gus/projetos/Caminhar/pages/api/products.js), [`pages/api/admin/internal-products.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/internal-products.js), [`tests/integration/api/products.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/products.test.js), [`tests/integration/api/admin/internal-products.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/admin/internal-products.test.js).
- **Alterações propostas:**
  1. Estender `updateProduct(id, data, { expectedModality })` e `deleteProduct(id, { expectedModality })` em `lib/domain/products.js` (e suporte em `updateRecords`/`deleteRecords` ou query parametrizada `WHERE id = $1 AND modality = $2`) para exigir correspondência exata de `modality` quando informado.
  2. Em `pages/api/products.js`: no `handleAdminGet`, assumir `modality = 'external'` por padrão (ou restringir ao permitido pela permissão); no `handlePut` (edição e `reorder`) e `handleDelete`, restringir estritamente a `modality = 'external'` e nunca permitir alterar `modality` para `'internal'`, retornando `404` se o ID pertencer à outra modalidade.
  3. Em `pages/api/admin/internal-products.js`: no `PUT` (edição e `reorder`) e `DELETE`, restringir estritamente a `modality = 'internal'` no `WHERE` antes de modificar o banco ou registrar auditoria.
- **Justificativa técnica:** Segurança fail-closed no servidor exige que a autorização por permissão (`Gestão de Produtos` vs `Gestão de Vendas`) seja aplicada sobre os registros reais da respectiva modalidade, e não apenas ocultada na UI.
- **Dependências:** Verificar `tests/integration/api/products.test.js` (garantir compatibilidade dos mocks de `lib/domain/products.js`) e `scripts/bench/` caso altere assinatura de handler vigiado por `bench-ground-truth.test.js`.
- **Impactos esperados:** Isolamento 100% garantido no servidor entre Modalidade A e Modalidade B em todas as operações CRUD e drag-and-drop.
- **Riscos:** Baixo; testes que mockam `updateProduct` ou `deleteProduct` podem receber um 3º argumento opcional `{ expectedModality }` e precisam manter asserções compatíveis.
- **Critérios de validação:** Novos testes em `products.test.js` e `internal-products.test.js` provando retorno `404` / recusa quando `PUT`/`DELETE`/`reorder` tentar tocar um produto da modalidade oposta; `tests/integration/domain/` verde.

---

### `AC-MP-03` — Higiene PCI-DSS no checkout de cartão (trava de fallback, remoção de `cardNumber` e limpeza de estado)
- **Objetivo:** Restringir a superfície de dados de cartão no cliente e eliminar aceitação de número de cartão bruto no servidor quando em produção/Mercado Pago ativo.
- **Problema que pretende resolver:** `MP-DIAG-03`.
- **Arquivos ou componentes envolvidos:** [`pages/checkout/[id].js`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js), [`pages/api/checkout.js`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js), [`tests/unit/pages/checkout.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/pages/checkout.test.js), [`tests/integration/api/checkout.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/checkout.test.js).
- **Alterações propostas:**
  1. Em `pages/checkout/[id].js` (`tokenizeCardWithMercadoPago`): restringir o fallback direto para `/v1/card_tokens` estritamente a `process.env.NODE_ENV !== 'production'` **e** `hostname === 'localhost' || hostname === '127.0.0.1'`.
  2. Em `pages/checkout/[id].js`: após `setCompletedOrder(data.order)` e ao trocar de meio de pagamento, limpar também `setCardNumber('')`, `setCardExpiry('')` e `setCardSecurityCode('')`.
  3. Em `pages/api/checkout.js`: rejeitar com `400` no `.superRefine` qualquer envio de `paymentDetails.cardNumber` quando `requiresTokenizedCard` for verdadeiro (`MP_ACCESS_TOKEN` presente ou `NODE_ENV === 'production'`), garantindo que apenas `token` e `lastFourDigits` trafeguem para o backend.
- **Justificativa técnica:** Reduz risco de exposição acidental de PAN (Primary Account Number) no navegador e no servidor, mantendo alinhamento rigoroso ao ADR-0039 e às práticas PCI-DSS SAQ A-EP / SAQ A.
- **Dependências:** Garantir que os testes unitários de `checkout.test.js` em `http://localhost` continuem atendendo à condição estrita `hostname === 'localhost'` e `NODE_ENV === 'test'`.
- **Impactos esperados:** Menor exposição de dados sensíveis de cartão em memória do navegador e recusa explícita caso um cliente tente enviar número bruto ao backend.
- **Riscos:** Em ambiente de staging HTTP sem domínio HTTPS e fora de `localhost` (ex.: IP de rede local), a tokenização do MP exigirá túnel HTTPS (`cloudflared`/`ngrok`) ou HTTPS real — que é o comportamento seguro desejado.
- **Critérios de validação:** Testes unitários em `checkout.test.js` validando que o fallback bloqueia fora de `localhost`/`production` e limpa os estados do cartão após submit; teste em `checkout.test.js` (API) confirmando HTTP `400` se `cardNumber` for enviado com `MP_ACCESS_TOKEN` configurado.

---

### `AC-MP-04` — Uso integral dos dados autoritativos de `fetchMercadoPagoPaymentDetails` no Webhook
- **Objetivo:** Garantir que `external_reference`, `status_detail`, `mp_order_status` e `mp_transaction_id` gravados em produção pelo webhook venham diretamente da API oficial do Mercado Pago, não do corpo não autenticado da notificação.
- **Problema que pretende resolver:** `MP-DIAG-04`.
- **Arquivos ou componentes envolvidos:** [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js), [`tests/integration/api/webhooks/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/webhooks/mercadopago.test.js).
- **Alterações propostas:**
  1. Em `pages/api/webhooks/mercadopago.js`, quando consultar a API do Mercado Pago (`isProduction || (!bodyStatus && process.env.MP_ACCESS_TOKEN)`), chamar `fetchMercadoPagoPaymentDetails(String(dataId), { eventType: isOrderEvent ? 'order' : 'payment' })` em vez de `fetchMercadoPagoPaymentStatus`.
  2. Usar `apiDetails.paymentStatus`, `apiDetails.externalReference` (com fallback ao corpo apenas fora de produção quando não consultou API), `apiDetails.statusDetail`, `apiDetails.mpOrderStatus` e `apiDetails.transactionId` ao chamar `processMercadoPagoWebhookEvent`.
  3. Manter a retrocompatibilidade ou atualizar mocks em `tests/integration/api/webhooks/mercadopago.test.js` para `fetchMercadoPagoPaymentDetails`.
- **Justificativa técnica:** Cumpre plenamente o princípio do ADR-0038 e resolve lacuna caso webhooks reais do MP venham com payload resumido sem `external_reference` ou `transactions.payments`.
- **Dependências:** Atualizar o mock de `fetchMercadoPagoPaymentStatus` → `fetchMercadoPagoPaymentDetails` em `tests/integration/api/webhooks/mercadopago.test.js` (preferencialmente antes ou junto com `AC-MP-05`).
- **Impactos esperados:** Metadados 100% confiáveis e consistentes entre push (webhook) e pull (reconciliação ativa), sem incremento de chamadas de rede (a consulta `GET` já era feita).
- **Riscos:** Baixo; exige apenas ajustar os testes de integração existentes do webhook para o retorno em objeto de `fetchMercadoPagoPaymentDetails`.
- **Critérios de validação:** Todos os 15+ cenários em `tests/integration/api/webhooks/mercadopago.test.js` aprovados, provando que `externalReference` e `statusDetail` forjados no corpo são ignorados em produção em favor do retorno da API oficial.

---

### `AC-MP-05` — Preservação de evento de webhook em condição de corrida (`!current` em `processMercadoPagoWebhookEvent`)
- **Objetivo:** Evitar perda permanente de notificação quando um webhook válido chega antes de o pedido ter `mp_payment_id` gravado ou ser visível na transação.
- **Problema que pretende resolver:** `MP-DIAG-05`.
- **Arquivos ou componentes envolvidos:** [`lib/domain/orders.js`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js), [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js), [`tests/unit/lib/domain/orders.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/domain/orders.test.js), [`tests/integration/api/webhooks/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/webhooks/mercadopago.test.js), [`tests/integration/domain/orders.db.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/domain/orders.db.test.js).
- **Alterações propostas:**
  1. Em `processMercadoPagoWebhookEvent` (`lib/domain/orders.js`): se o pedido ainda não for encontrado (`!current`) **e** houver indício de corrida legítima (`externalReference` numérico válido não localizado ou `mpPaymentId` de pedido em andamento), fazer rollback ou não persistir `event_key` em `payment_webhook_events` (ou retornar sinalização `{ orderFound: false, retryable: true }`), deixando o endpoint `pages/api/webhooks/mercadopago.js` responder `HTTP 503` (ou `409` retryable) para acionar a fila de retentativa nativa do Mercado Pago — enquanto eventos de simulador/IDs sem `externalReference` válidos podem ser tratados de forma controlada sem poluir `payment_webhook_events` como processados.
  2. Alternativamente/complementarmente em `pages/api/checkout.js`: antes de gravar apenas no final, garantir que `external_reference` (`order.id`) já foi commitado na transação de `createInternalOrder` (o que já ocorre, portanto o único caso de corrida com `externalReference` válido seria replicação ou atraso; sem `externalReference`, seria `mp_payment_id` ainda não salvo por `attachOrderPaymentInfo` enquanto `createMercadoPagoPayment` acabou de retornar no MP).
- **Justificativa técnica:** Com `AC-MP-04` fornecendo `externalReference` da API oficial, quase todas as corridas entre `POST /v1/orders` e `attachOrderPaymentInfo` já encontram o pedido pelo `id`; quando nem assim houver visibilidade momentânea, não queimar a chave `event_key` e retornar `503` preserva a entrega via retry oficial do MP.
- **Dependências:** `AC-MP-04` (para garantir `externalReference` confiável da API) e atualização do teste unitário `"deve retornar duplicate false e order null se pedido com mpPaymentId não for encontrado"` em `orders.test.js` caso o contrato retorne flag explícita.
- **Impactos esperados:** Eliminação do risco de evento perdido em picos de concorrência no checkout.
- **Riscos:** Se um ambiente de Sandbox antigo enviar notificações de pedidos excluídos de outro banco local com o mesmo segredo, o MP tentará reenviar algumas vezes antes de desistir (comportamento padrão e limitado pelo MP). *Mitigação:* limitar `retryable` aos casos em que o pedido tem `externalReference` numérico plausível ou janela recente, ou logar alerta específico.
- **Critérios de validação:** Testes unitários, de integração e em PostgreSQL real (`orders.db.test.js`) provando que falha em localizar pedido não grava `event_key` permanente e reprocessamento subsequente atualiza o pedido para `paid`.

---

### `AC-MP-06` — Blindagem da máquina de estados, reabertura administrativa, cache e idempotência do checkout
- **Objetivo:** Garantir consistência integral entre status financeiro (MP), status logístico do pedido, estoque físico e cache da vitrine em cenários extremos e de duplo clique.
- **Problema que pretende resolver:** `MP-DIAG-06`.
- **Arquivos ou componentes envolvidos:** [`lib/domain/orders.js`](file:///home/gus/projetos/Caminhar/lib/domain/orders.js), [`pages/api/admin/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js), [`pages/api/checkout.js`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js), [`pages/checkout/[id].js`](file:///home/gus/projetos/Caminhar/pages/checkout/[id].js), [`lib/infra/logger.js`](file:///home/gus/projetos/Caminhar/lib/infra/logger.js), [`tests/unit/lib/domain/orders.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/domain/orders.test.js), [`tests/integration/api/admin/orders.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/admin/orders.test.js), [`tests/integration/api/checkout.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/checkout.test.js).
- **Alterações propostas:**
  1. Em `applyPaymentStatusTransition` (`lib/domain/orders.js`): incluir `'refunded'` e `'charged_back'` no conjunto de estados protegidos contra downgrade por notificações atrasadas (`pending`, `in_process`, `authorized`, `approved`).
  2. Em `applyPaymentStatusTransition`: se chegar `nextPaymentStatus === 'approved'` para um pedido que já está `order_status === 'cancelled'` e `stock_restored === true`, tentar re-reservar o estoque dentro da mesma transação se houver saldo disponível (transicionando para `paid`, `stock_restored = false` e invalidando `products:*`); se não houver estoque suficiente, registrar alerta crítico (`logger.error` + campo `payment_payload.needs_manual_refund = true`) sem deixar status ambíguo silencioso.
  3. Em `updateAdminOrder` (`lib/domain/orders.js`): bloquear transição de saída de `order_status === 'cancelled'` (`stock_restored === true`) para qualquer outro status logístico quando não houver re-reserva atômica de estoque (lançando erro `ORDER_CANCELLED_CANNOT_REOPEN` tratado como `HTTP 409`), e em `pages/api/admin/orders.js`, chamar `await invalidateCache('products:*')` sempre que `updateAdminOrder` cancelar um pedido e restaurar estoque.
  4. Em `pages/checkout/[id].js` + `pages/api/checkout.js`: gerar um UUID de tentativa por submissão no checkout (mantido em `useRef` enquanto os dados do formulário daquela tentativa não mudarem ou via header `X-Idempotency-Key` / cache curto Redis `checkout:idempotency:<customerId>:<key>`) para impedir duplicação acidental de pedidos em cliques duplos ou retries de rede.
- **Justificativa técnica:** Fecha as quatro brechas conhecidas na máquina de estados e protege o comprador contra dupla reserva/cobrança acidental sem alterar o schema do banco de dados.
- **Dependências:** Testes unitários de `orders.test.js` e `orders.db.test.js` cobrindo os novos ramos de transição e erro `409` no `PUT /api/admin/orders`.
- **Impactos esperados:** Estoque 100% consistente com a vitrine pública, zero reabertura inconsistente no admin e zero compras duplicadas por duplo clique.
- **Riscos:** No mecanismo de idempotência de checkout, caso o cliente altere meio de pagamento ou quantidade após uma tentativa, uma nova chave deve ser gerada (mitigado gerando nova chave ao reiniciar/alterar produto, quantidade ou meio de pagamento).
- **Critérios de validação:** Novos casos em `orders.test.js`, `orders.db.test.js`, `admin/orders.test.js` e `checkout.test.js` validando proteção de `refunded`/`charged_back`, invalidação de `products:*` no cancelamento admin, recusa `409` ao reabrir pedido cancelado e bloqueio/reuso na mesma chave de idempotência.

---

### `AC-MP-07` — Refinamento de validação de entrada, mapeamento completo de status e diagnóstico MP no `check-env.js`
- **Objetivo:** Eliminar criações/cancelamentos evitáveis por CPF/CNPJ inválido, validar estritamente `quantity`/`installments`, cobrir `in_mediation`/`partially_refunded` e alertar divergências de configuração MP no boot.
- **Problema que pretende resolver:** `MP-DIAG-07`.
- **Arquivos ou componentes envolvidos:** [`lib/payment/mercadopago.js`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js), [`lib/payment/payment-status-messages.js`](file:///home/gus/projetos/Caminhar/lib/payment/payment-status-messages.js), [`pages/api/checkout.js`](file:///home/gus/projetos/Caminhar/pages/api/checkout.js), [`scripts/check-env.js`](file:///home/gus/projetos/Caminhar/scripts/check-env.js), suítes de teste correspondentes.
- **Alterações propostas:**
  1. Em `mapMercadoPagoStatus` (`lib/payment/mercadopago.js`): adicionar `case 'in_mediation': return 'charged_back';` e `case 'partially_refunded': return 'refunded';`.
  2. Em `isValidCpfCnpjDigits` (`lib/payment/payment-status-messages.js`): implementar validação oficial dos dois dígitos verificadores (módulo 11) para CPF (11 dígitos) e CNPJ (14 dígitos), mantendo compatibilidade com todos os CPFs/CNPJs válidos sinteticamente usados nos testes (`19119119100`, `12345678909`, etc. — validar previamente todas as fixtures em `tests/` e `cypress/`).
  3. Em `pages/api/checkout.js`: validar `quantity` como inteiro positivo (`1..99`) rejeitando `0`/negativos/não-numéricos com `HTTP 400`, e `installments` como inteiro `1..12` (rejeitando/forçando `1` em `debit_card`).
  4. Em `scripts/check-env.js`: emitir avisos não-fatais (e falha somente se critério explícito de produção for ativado) quando `MP_ACCESS_TOKEN` estiver definido sem `NEXT_PUBLIC_MP_PUBLIC_KEY`, quando `NODE_ENV === 'production'` estiver sem `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET`, ou quando houver divergência entre prefixos (`TEST-` vs `APP_USR-`, exceto explicando que Orders API de Sandbox também usa `APP_USR-`).
- **Justificativa técnica:** Reduz falhas tardias no gateway, previne entradas malformadas no checkout e replica no Mercado Pago o bom padrão de diagnóstico preventivo adotado para o Google OAuth.
- **Dependências:** Antes de ativar módulo 11 em `isValidCpfCnpjDigits`, rodar grep em todos os testes (`tests/` e `cypress/`) para confirmar que nenhum fixture usa CPF sintético inválido no dígito verificador.
- **Impactos esperados:** Erros de digitação no documento pegos instantaneamente no navegador e servidor; deploy mal configurado detectado no `npm run check-env`.
- **Riscos:** Caso alguma fixture de teste ou conta de comprador Sandbox utilize CPF fictício sem dígito verificador válido (ex.: `11122233344`), passará a ser rejeitada até atualizar a fixture.
- **Critérios de validação:** Testes unitários cobrindo CPFs/CNPJs válidos e com DV errado, `in_mediation`/`partially_refunded`, `quantity` inválida (`400`) e saída de `check-env.js`.

---

### `AC-MP-08` — Rate limit em `GET /api/admin/orders`, invalidação seletiva no webhook, cooldown na reconciliação e métrica de performance
- **Objetivo:** Evitar exaustão de cota na API do Mercado Pago, invalidações desnecessárias de cache e falsos alertas de lentidão.
- **Problema que pretende resolver:** `MP-DIAG-08`.
- **Arquivos ou componentes envolvidos:** [`pages/api/admin/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js), [`pages/api/webhooks/mercadopago.js`](file:///home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js), [`lib/payment/reconcile-orders.js`](file:///home/gus/projetos/Caminhar/lib/payment/reconcile-orders.js), [`hooks/usePerformanceMetrics.js`](file:///home/gus/projetos/Caminhar/hooks/usePerformanceMetrics.js), testes correspondentes.
- **Alterações propostas:**
  1. Em `pages/api/admin/orders.js`: aplicar `checkRateLimit(ip, 'api:admin:orders:get', 60, 60000)` no `GET` e limitar `search` a `≤ 200` caracteres (`400` se excedido, alinhado a `posts.js`).
  2. Em `pages/api/webhooks/mercadopago.js`: executar `invalidateCache('products:*')` somente quando `!result.duplicate && result.order` **e** o pedido tiver sido cancelado/restaurado (`result.order.stock_restored === true`).
  3. Em `lib/payment/reconcile-orders.js`: adicionar cache/cooldown curto in-process (ex.: 15s por `mp_payment_id` ou deduplicação *in-flight* por ID, ignorável via opção `{ force: true }` quando acionado pelo botão `"Sincronizar MP"` ou `"Verificar pagamento agora"`), evitando rajadas idênticas entre polling e admin.
  4. Em `hooks/usePerformanceMetrics.js`: incluir `/api/customer/orders` e `/api/admin/orders` em `GATEWAY_PATH_PREFIXES` (orçamento de 5s).
- **Justificativa técnica:** Preserva latência baixa, reduz pressão no Redis e evita throttling externo do Mercado Pago.
- **Dependências:** Nenhuma alteração de schema; manter testes de `reconcile-orders.test.js` limpos entre execuções (limpando ou injetando mapa de cooldown quando necessário).
- **Impactos esperados:** Redução drástica de invalidações ociosas de cache e consultas duplicadas ao MP.
- **Riscos:** Cooldown de reconciliação mal calibrado poderia atrasar um clique manual se aplicado sem flag `force` — mitigado mantendo `force: true` para ações manuais (`sync=1` e clique em `"Verificar pagamento agora"`).
- **Critérios de validação:** Testes unitários e de integração validando `429`/`400` no `GET /api/admin/orders`, não-invalidação de cache em webhook duplicado/sem estoque restaurado, deduplicação de reconciliação e orçamento em `usePerformanceMetrics.test.js`.

---

### `AC-MP-09` — Expansão de cobertura de testes (AdminSales, branches MP, thresholds Jest, Cypress e k6)
- **Objetivo:** Elevar a confiança automatizada de ponta a ponta cobrindo UI administrativa, ramos de falha/rede, contratos de E2E e carga/segurança básica.
- **Problema que pretende resolver:** `MP-DIAG-09`.
- **Arquivos ou componentes envolvidos:** [`tests/unit/components/Admin/AdminSales.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/components/Admin/AdminSales.test.js), [`tests/unit/lib/payment/mercadopago.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/payment/mercadopago.test.js), [`tests/integration/api/checkout.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/checkout.test.js), [`tests/integration/api/admin/orders.test.js`](file:///home/gus/projetos/Caminhar/tests/integration/api/admin/orders.test.js), [`tests/unit/lib/auth/customer-auth.test.js`](file:///home/gus/projetos/Caminhar/tests/unit/lib/auth/customer-auth.test.js) (ou arquivo equivalente), [`jest.config.js`](file:///home/gus/projetos/Caminhar/jest.config.js), [`cypress/e2e/checkout.cy.js`](file:///home/gus/projetos/Caminhar/cypress/e2e/checkout.cy.js), `load-tests/`.
- **Alterações propostas:**
  1. Expandir `AdminSales.test.js` para cobrir abertura e envio do modal `"Gerenciar Pedido"` (`PUT /api/admin/orders` + tratamento de erro), filtros de busca/status/meio de pagamento, troca para `Produtos Internos` (formulário de estoque e frete), badges de status e exportação CSV — elevando cobertura de funções de `32,25%` para `> 85%`.
  2. Completar branches descobertos em `mercadopago.test.js` (timeout/erro de rede `502`, `invalid_transaction_amount`, CNPJ, `collector_id`, `timingSafeEqual`), `checkout.test.js` (`429` no POST, `PRODUCT_NOT_FOUND`, `401` cliente ausente, `500`), `customer-auth.js` e corrigir fixture `paymentStatus: 'approved'` em `orders.test.js:138`.
  3. Adicionar thresholds por diretório em `jest.config.js` para `lib/payment/` e `pages/api/webhooks/` (e avaliar inclusão de `hooks/` / `utils/adminSession.js` conforme `docs/retorno_da_semana.md`).
  4. Adicionar cenários em `cypress/e2e/checkout.cy.js` para cartão de crédito com mock de `window.MercadoPago`, recusa + retry (`"Tentar outro meio de pagamento"`), boleto com link `/sandbox/` e criação de um cenário leve de segurança/rate limit k6 para `/api/checkout` e `/api/webhooks/mercadopago`.
- **Justificativa técnica:** Elimina pontos cegos críticos hoje encobertos pela média global de cobertura de `95,48%`.
- **Dependências:** Ideal executar após `AC-MP-01`..`AC-MP-08` para testar o comportamento final estabilizado (e lembrar da regra do `AGENTS.md` §7 item 1: alteração em `jest.config.js` exige `npm test`, e alteração em `cypress/e2e/checkout.cy.js` exige rodar `npx cypress run --spec cypress/e2e/checkout.cy.js`).
- **Impactos esperados:** Cobertura efetiva superior a 85% em funções/branches nos módulos de vendas e pagamentos e prevenção real de regressões na UI do `/admin`.
- **Riscos:** Mudar `jest.config.js` sem calibrar os novos thresholds pode quebrar o CI se algum arquivo recém-incluído estiver abaixo do piso — validar antes com `npm run test:coverage`.
- **Critérios de validação:** `npm run test:coverage` verde com todos os thresholds atingidos (incluindo os novos); `AdminSales.js` > 85% funções; `npx cypress run --spec cypress/e2e/checkout.cy.js` aprovado; `npm run knip` e `npm run lint` limpos.

---

### `AC-MP-10` — Padronização de código/UX em Vendas (`createAdminHandler`, pt-BR no `AdminSales`, `stats.js` consolidado e multi-payment MP)
- **Objetivo:** Reduzir duplicação em handlers administrativos, melhorar clareza operacional no `/admin`, otimizar queries do dashboard e tornar o parser de Orders resiliente a múltiplos itens em `transactions.payments`.
- **Problema que pretende resolver:** `MP-DIAG-10`.
- **Arquivos ou componentes envolvidos:** [`pages/api/admin/orders.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/orders.js), [`pages/api/admin/internal-products.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/internal-products.js), [`components/Admin/AdminSales.js`](file:///home/gus/projetos/Caminhar/components/Admin/AdminSales.js), [`pages/api/admin/stats.js`](file:///home/gus/projetos/Caminhar/pages/api/admin/stats.js), [`lib/payment/mercadopago.js`](file:///home/gus/projetos/Caminhar/lib/payment/mercadopago.js), [`docs/ARQUITETURA_SITE_PRIVADO.md`](file:///home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md), [`scripts/bench/`](file:///home/gus/projetos/Caminhar/scripts/bench/orchestrator/gabarito.md).
- **Alterações propostas:**
  1. Migrar `pages/api/admin/orders.js` e `pages/api/admin/internal-products.js` para `createAdminHandler` (ou wrapper padronizado em `lib/api/adminCrudHandler.js`), eliminando duplicação de `requireAuth`/`requireSalesPermission` (recalibrando `scripts/bench/` se necessário para manter `bench-ground-truth.test.js` verde).
  2. Em `AdminSales.js`: traduzir `order.payment_method` para pt-BR na coluna `"Pagamento"`, incluir `Autorizado` e `Contestado` em `PAYMENT_STATUS_OPTIONS` (ou documentar motivo se omitido), separar badges de `Recusado` e `Cancelado`, exibir forma/status do pagamento, `status_detail` e `mp_transaction_id` no modal `"Gerenciar Pedido"` e incluir `mp_payment_id` + `created_at` no CSV exportado. (Atualizar `docs/ARQUITETURA_SITE_PRIVADO.md` §4.8 na mesma rodada se filtros visíveis mudarem, por `AGENTS.md` §0.2 regra 5).
  3. Em `pages/api/admin/stats.js`: consolidar as 11 queries de `orders` em 1 query agregada com `FILTER (WHERE ...)` e as 6 queries de `products` em 1 query agregada.
  4. Em `lib/payment/mercadopago.js`: selecionar o pagamento mais relevante em `transactions.payments` (ex.: priorizar `processed`/`processing`/`action_required` antes do primeiro falho caso existam múltiplas tentativas na mesma Order).
- **Justificativa técnica:** Reduz dívida técnica e consumo do pool PostgreSQL, alinha a UX do painel ao vocabulário já existente em `/minha-conta` e evita ambiguidade operacional no atendimento ao cliente.
- **Dependências:** `AC-MP-09` (para garantir proteção de testes sobre `AdminSales.js`) e conferência obrigatória do canário `bench-ground-truth.test.js` ao alterar rotas de `pages/api/admin/`.
- **Impactos esperados:** Código administrativo mais enxuto, painel mais informativo em pt-BR e menos round-trips simultâneos ao PostgreSQL no Dashboard.
- **Riscos:** Mudanças no texto de filtros/badges em `AdminSales.js` precisam manter sincronia com `docs/ARQUITETURA_SITE_PRIVADO.md` §4.8 e `AdminSales.test.js`; `createAdminHandler` precisa manter o contrato exato de mensagens `401`/`403` esperado pelas suítes de integração.
- **Critérios de validação:** `tests/unit/scripts/bench-ground-truth.test.js` verde, `stats.test.js` e `AdminSales.test.js` atualizados e aprovados, `ARQUITETURA_SITE_PRIVADO.md` §4.8 sincronizado caso haja mudança visível.

---

### `AC-MP-11` — Ajustes de processo dos agentes e rastreabilidade de execução
- **Objetivo:** Evitar correções parciais em subsistemas críticos e melhorar a rastreabilidade de logs locais em futuras auditorias semanais.
- **Problema que pretende resolver:** `MP-DIAG-11`.
- **Arquivos ou componentes envolvidos:** [`AGENTS.md`](file:///home/gus/projetos/Caminhar/AGENTS.md), [`package.json`](file:///home/gus/projetos/Caminhar/package.json), [`docs/melhoria_mercadopago.md`](file:///home/gus/projetos/Caminhar/docs/melhoria_mercadopago.md).
- **Alterações propostas:**
  1. Em `AGENTS.md` (§0.3 passo 5 ou §6): explicitar que alterações de segurança em rotas de um subsistema (ex.: Mercado Pago/Vendas ou Produtos A × B) exigem varredura horizontal de todas as rotas irmãs da mesma área (incluindo webhooks, GETs administrativos com efeitos colaterais e mutações `PUT`/`DELETE`/`reorder`).
  2. Em `package.json`: nos scripts `test:log`, `test:coverage:log` e `lint:log`, gravar cabeçalho inicial com `date -Iseconds` e `git rev-parse --short HEAD` (em convergência com `OCOR-2026-11-23-07` de `docs/retorno_da_semana.md`) — lembrando a regra do `AGENTS.md` §7 item 1 de rodar `npm test` após alterar `package.json`.
  3. Neste documento (`docs/melhoria_mercadopago.md`): manter corrigida a referência sobre onde ocorre o lock transacional (`syncOrderPaymentStatus` em `lib/domain/orders.js`, e não diretamente em `reconcile-orders.js`).
- **Justificativa técnica:** Previne reincidência de descobertas assimétricas (como o endurecimento de `28b6b17` que protegeu o visitante mas não o webhook) e elimina ambiguidade temporal em auditorias futuras.
- **Dependências:** Nenhuma dependência técnica de código de negócio; alinhado às sugestões de `docs/retorno_da_semana.md`.
- **Impactos esperados:** Menos retrabalho entre commits de acabamento e evidências de teste com data/SHA explícitos.
- **Riscos:** Mínimos (respeitar sempre o limite de concisão do `AGENTS.md` — ver `docs/melhoria_agente.md` §22).
- **Critérios de validação:** `npm run lint`, `npm run knip`, `npm run lint:workflows`, `npm test` (se `package.json` mudar) e `bench-ground-truth.test.js` aprovados.

---

## 8. Priorização (Alinhada às 7 Faixas do §8.5)

1. **Segurança e riscos críticos:**
   - `AC-MP-01` (`MP-DIAG-01` — P0: rate limit + proteção temporal anti-replay `ts` em `POST /api/webhooks/mercadopago`)
   - `AC-MP-02` (`MP-DIAG-02` — P1: isolamento server-side de `modality` em `PUT`/`DELETE`/`reorder` de produtos externos/internos)
   - `AC-MP-03` (`MP-DIAG-03` — P1: trava de fallback PCI em `checkout/[id].js`, limpeza de estado de cartão e bloqueio de `cardNumber` em produção)
2. **Falhas que comprometem pagamentos e transações:**
   - `AC-MP-05` (`MP-DIAG-05` — P1: não descartar eventos de webhook em condição de corrida `!current`)
   - `AC-MP-06` (`MP-DIAG-06` — P1: proteção de `refunded`/`charged_back`, aprovação sobre pedido cancelado, trava de reabertura admin + invalidação de cache e idempotência contra duplo submit no checkout)
3. **Problemas de comunicação e processamento:**
   - `AC-MP-07` (`MP-DIAG-07` — P2: módulo 11 CPF/CNPJ, validação estrita de `quantity`/`installments`, `in_mediation`/`partially_refunded` e diagnóstico MP em `check-env.js`)
4. **Webhooks e atualização dos estados:**
   - `AC-MP-04` (`MP-DIAG-04` — P1: usar `fetchMercadoPagoPaymentDetails` autoritativo no webhook em produção)
   - `AC-MP-08` (`MP-DIAG-08` — P2: rate limit/busca em `GET /api/admin/orders`, invalidação seletiva no webhook, cooldown em `reconcile-orders.js` e orçamento de performance)
5. **Testes e validações:**
   - `AC-MP-09` (`MP-DIAG-09` — P2: cobertura de `AdminSales.js`, branches de `mercadopago.js`/`checkout.js`/`customer-auth.js`, thresholds no Jest, E2E cartão/boleto e k6)
6. **Melhorias de arquitetura e organização:**
   - `AC-MP-10` (`MP-DIAG-10` — P3: `createAdminHandler`, UX pt-BR e detalhamento em `AdminSales.js`, consolidação de queries em `stats.js`, multi-payment em `mercadopago.js`)
7. **Melhorias nas instruções e procedimentos dos agentes:**
   - `AC-MP-11` (`MP-DIAG-11` — P3: varredura horizontal de rotas irmãs no `AGENTS.md` e timestamp/SHA em scripts de log)

---

## 9. Sequência Lógica de Execução Futura

```
Fase 1 — Segurança Imediata e Blindagem de Webhook (Dependência base)
├── [Paralelo A] AC-MP-04 (fetchMercadoPagoPaymentDetails autoritativo no webhook)
│       └──► AC-MP-05 (tratamento de race condition !current sem queimar event_key)
│               └──► AC-MP-01 (rate limit + janela ts no webhook + atualização dos testes)
└── [Paralelo B] AC-MP-02 (isolamento modality em internal-products.js / products.js)
└── [Paralelo C] AC-MP-03 (trava PCI no fallback HTTP /v1/card_tokens + limpeza de estado)

Fase 2 — Integridade Transacional e Máquina de Estados
└── AC-MP-06 (refunded/charged_back, aprovação tardia em cancelado, trava reabertura admin + cache, idempotência duplo submit)

Fase 3 — Validação de Entradas, Resiliência de Polling e Ambiente
├── AC-MP-07 (CPF/CNPJ módulo 11, quantity/installments, in_mediation/partially_refunded, check-env.js MP)
└── AC-MP-08 (rate limit GET admin/orders, cache seletivo no webhook, cooldown na reconciliação, usePerformanceMetrics)

Fase 4 — Cobertura Automatizada (executar após estabilizar contratos das Fases 1–3)
└── AC-MP-09 (AdminSales.test.js > 85% funcs, branches MP/checkout, thresholds jest.config.js, Cypress cartão/boleto, k6)

Fase 5 — Refatoração Estrutural, UX Operacional e Processo
├── AC-MP-10 (createAdminHandler, UX pt-BR/modal/CSV em AdminSales, stats.js consolidado, payments[] + docs/bench)
└── AC-MP-11 (ajuste pontual AGENTS.md + scripts de log com timestamp/SHA no package.json)
```

---

## 10. Critérios de Validação para Futuras Implementações

Qualquer rodada futura que implemente ações deste plano só deverá ser considerada concluída após cumprir integralmente:

1. **Testes Unitários e de Integração (Jest):**
   - `npm test` — 100% aprovado (zero falhas).
   - `npm run test:coverage` — 100% aprovado respeitando todos os `coverageThreshold` globais e por diretório (incluindo `lib/payment/`, `pages/api/webhooks/` e elevação de `AdminSales.js`).
   - Execução focada das suítes MP/Vendas (`mercadopago.test.js`, `reconcile-orders.test.js`, `payment-status-messages.test.js`, `orders.test.js`, `checkout.test.js`, `webhooks/mercadopago.test.js`, `customer/orders.test.js`, `admin/orders.test.js`, `admin/internal-products.test.js`, `products.test.js`, `verify-mp-webhook.test.js`) sem warnings espúrios nem vazamento de `MP_WEBHOOK_SECRET`.
2. **Banco Real (PostgreSQL):**
   - `npm run test:db:container` (ou workflow `test-db-coverage.yml` no CI) com `orders.db.test.js` e `customers.db.test.js` 100% aprovados; `npm run validate-schema` e `tests/unit/scripts/schema-sources.test.js` verdes.
3. **E2E e Design System:**
   - `npx cypress run --spec cypress/e2e/checkout.cy.js` aprovado (inclusive após adição dos novos cenários de cartão/recusa/boleto).
   - `npx jest tests/unit/tests-hygiene/css-tokens.test.js` aprovado (zero tokens ausentes ou `style={{`).
4. **Gates Estáticos, Segurança e Canário:**
   - `npm run lint`, `npm run knip`, `npm run lint:workflows`, `npm run lint:chars`, `npm run security:check-sql`, `npm run security:check-credentials` e `npx jest tests/unit/scripts/bench-ground-truth.test.js` com **0 erros**.
5. **Homologação Controlada (Sandbox / Pré-Produção):**
   - Validação de `node scripts/maintenance/verify-mp-webhook.js --send` com `ts` atual (`200`) e com `ts` expirado (`401`).
   - Checklist de transição para produção antes de ativar credenciais reais: `MP_ACCESS_TOKEN` e `NEXT_PUBLIC_MP_PUBLIC_KEY` de produção da mesma aplicação *Orders*, `MP_WEBHOOK_SECRET` de produção configurado no painel do MP apontando para `https://<dominio>/api/webhooks/mercadopago` com tópico **`Order (Mercado Pago)`**, `TRUST_PROXY` ajustado ao proxy real, e execução de 1 compra real controlada de valor mínimo validando push + pull antes de abrir ao público.

---

## 11. Pendências e Limitações (Auditoria Ciclo 2 — 23/11/2026)

1. **Problemas ainda não resolvidos:** todos os 11 diagnósticos do Ciclo 2 (`MP-DIAG-01` a `MP-DIAG-11`) permanecem abertos e documentados aguardando autorização para implementação.
2. **Limitações de ambiente e acesso nesta auditoria:**
   - **MCP `ai-memory` negado por permissão:** chamadas a `memory_briefing`, `memory_query` e `memory_read_page` foram bloqueadas pela política de permissão da sessão. Conforme `AGENTS.md` §3, não houve tentativa de contorno por shell; a análise baseou-se no resumo injetado no `SessionStart` + código/Git/ADRs/relatórios versionados. **Aviso herdado do `SessionStart`:** o projeto possui **20 warnings** registrados em `_lint/report.md` da wiki que precisam ser revisados/limpos em uma sessão com MCP liberado.
   - **GitHub Actions remoto inacessível:** sem conectividade de rede no sandbox, o status remoto das execuções da semana posteriores a 17/11 (`test-db-coverage.yml` após `b37c9f1`, `e2e.yml` após `a681cc5`/`ee4ed2e` e `test-coverage.yml`) permanece **não confirmado**.
   - **Testes com PostgreSQL real (`*.db.test.js`) e Cypress ao vivo:** as 8 suítes `.db.test.js` (`96` testes, incluindo `orders.db.test.js` e `customers.db.test.js`) foram puladas localmente por ausência de Docker no ambiente, e `cypress/e2e/checkout.cy.js` não foi executado no navegador nesta rodada somente leitura.
   - **Autoria individual por agente no Git e histórico de sessões:** autor único `caminhar` nos 40 commits da janela e indisponibilidade de sessões locais do OpenCode/Antigravity impedem confirmar qual agente executou cada commit.
   - **`.env` e banco de dados local não inspecionados diretamente:** conforme regra de segurança (`AGENTS.md` §6), `.env` não foi lido; portanto, o estado atual das variáveis `MP_*` configuradas localmente e os registros históricos do PostgreSQL local (Pedidos #20–#31) constam como evidência documentada em 16–18/11, **não reconfirmada ao vivo em 23/11**.
   - **Logs locais sem timestamp/SHA internos:** `logs/tests-output.log` e `logs/coverage-output.log` têm `mtime` de `22/11/2026 17:16–17:18` e incluem suítes criadas na semana, mas não gravam data nem SHA em seu conteúdo.
3. **Dependências externas:**
   - Habilitação comercial de **débito direto em bandeira** (`debit_card` / `debelo` / `debvisa` / `debmaster`) junto ao Mercado Pago segue pendente de decisão comercial/habilitação da conta recebedora.
   - Homologação final em ambiente **público de produção com HTTPS** (`live_mode: true`) ainda pendente para momento de go-live.
4. **Pontos que exigem investigação/decisão adicional de produto:**
   - **Estorno integrado no `/admin`:** hoje cancelar um pedido já `paid` em `AdminSales` devolve estoque interno e muda `order_status` para `'cancelled'`, mas **não** aciona cancelamento/estorno financeiro na API do Mercado Pago (`POST /v1/orders/{id}/refund`) — exige definição de regra de negócio se o estorno será manual no painel MP ou integrado.
   - **Expiração automática de pedidos `awaiting_payment` abandonados:** pedidos PIX ou boleto antigos cujo webhook `order.canceled` eventualmente nunca chegue ou falhe mantêm o estoque reservado indefinidamente até reconciliação manual/acesso à página. Avaliar política de expiração/varredura periódica quando a loja entrar em operação contínua.

---

## 12. Registro de Execução e Fechamento do Plano de Ação (26/11/2026)

1. **Confronto prévio (`HEAD = 1d1d9adc`):** entre 23/11 e 24/11 (`ff57a203`, `0ab2716e`, `1d1d9adc`), parte de `MP-DIAG-09` (elevação de cobertura em `AdminSales.js`, `mercadopago.js`, `checkout.js` e `customer-auth.js` + thresholds iniciais em `jest.config.js`) e `MP-DIAG-11` (`run-with-log.js` com data/SHA nos logs) já havia sido implementada; os diagnósticos `MP-DIAG-01` a `MP-DIAG-08`, `MP-DIAG-10` e os itens restantes de `09`/`11` permaneciam ativos no disco.
2. **Ações executadas em 26/11/2026 ([ADR-0044](adr/0044-mercadopago-hardening-webhook-idempotency-and-modality-isolation.md)):**
   - `AC-MP-01`, `AC-MP-04`, `AC-MP-05`: rate limit + janela `ts` `±900s` + `fetchMercadoPagoPaymentDetails` autoritativo no webhook + localização prévia de pedido antes de `event_key` com retorno `HTTP 503` em corrida e invalidação seletiva de `products:*`.
   - `AC-MP-02`: `{ expectedModality }` em `lib/domain/products.js` + isolamento estrito `'external'`/`'internal'` em `GET`, `POST`, `PUT`, `DELETE` e `reorder` de `/api/products` e `/api/admin/internal-products`.
   - `AC-MP-03`: trava de fallback `/v1/card_tokens` para `NODE_ENV !== 'production'` em `localhost`/`127.0.0.1`, limpeza automática dos campos do cartão e rejeição `400` de `cardNumber` bruto em `pages/api/checkout.js`.
   - `AC-MP-06`: idempotência via `X-Idempotency-Key` + `getOrSetCache`, proteção de `refunded`/`charged_back`, recuperação/alerta de aprovação tardia após cancelamento, trava `ORDER_CANCELLED_CANNOT_REOPEN` (`409`) e cache `products:*` no cancelamento admin.
   - `AC-MP-07`: módulo 11 em `isValidCpfCnpjDigits`, `in_mediation`/`partially_refunded`, validação estrita de `quantity`/`installments`/`MIN_PAYMENT_METHOD_AMOUNTS` e `validateMercadoPagoEnv` em `scripts/check-env.js`.
   - `AC-MP-08`: rate limit (`60 req/min`) e `search ≤ 200` em `GET /api/admin/orders`, cooldown `15s` + single-flight em `lib/payment/reconcile-orders.js` (com bypass `force=1`/`sync=1`), e `/api/customer/orders` + `/api/admin/orders` no orçamento 5s de `usePerformanceMetrics.js`.
   - `AC-MP-09` & `AC-MP-10` & `AC-MP-11`: migração de `admin/orders.js` e `admin/internal-products.js` para `createAdminHandler`, UX pt-BR/filtros/badges/modal/CSV em `AdminSales.js`, queries `COUNT(*) FILTER` em `stats.js`, `selectPrimaryOrderPayment` em `mercadopago.js` (inclusive no ramo dev do webhook), threshold de cobertura `pages/api/webhooks/` em `jest.config.js`, expansão de cobertura em `payment-status-messages.test.js` e `internal-products.test.js`, expansão e validação ao vivo de `cypress/e2e/checkout.cy.js` (`6/6 passing` em `8s`), criação do cenário k6 `load-tests/security/mercadopago-security-test.js` (com atualização do orquestrador/guardas para `31` scripts e cleanup Redis em `clear-test-auth-locks.js`), recalibração de `scripts/bench/orchestrator/{gabarito,rubrica}.md`, atualização de `AGENTS.md`, `ARQUITETURA_*`, `CHANGELOG.md` e criação do `ADR-0044`.
   - **Homologação prática pós-`ADR-0044` (26/11/2026):** **Pedido #32** (PIX `R$ 0,01`, `ORDTST01M8BHGF860ZS8JJFE55PTZGM2` / `PAY01M8BHGF98AFXW5JK627WNMKYX`) confirmado ponta a ponta no PostgreSQL local (`approved`/`paid`, `stock = 49949` com `stock_restored = false`, `ticket_url` `/sandbox/payments/`), reconciliação ativa e entrega ao vivo de webhook assinado HMAC-SHA256 v2 via `verify-mp-webhook.js --send` (`"duplicate": false` → `"duplicate": true`).
3. **Pendências de ambiente externo:** execução das suítes `*.db.test.js` contra Docker/CI (`test-db-coverage.yml`), execução ao vivo da suíte k6 (`k6` não instalado neste sandbox; rodar contra servidor ativo com Redis e `TRUST_PROXY=true`), habilitação comercial opcional de `debit_card` direto e homologação final em produção HTTPS.

---
---

# Registro Histórico Preservado — Ciclo 1 (09/11/2026 a 16/11/2026 + Homologação Sandbox 16/11–18/11/2026)

> Seção histórica preservada integralmente para rastreabilidade dos ADRs `0038`–`0041` e das evidências canônicas de homologação do Sandbox referenciadas em `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 25.

## H1. Resumo Histórico do Ciclo 1

- **Data da execução inicial:** `16/11/2026, 10:00 (America/Sao_Paulo / BRT)` (atualizado com homologações práticas de 16/11 a 18/11/2026).
- **Período analisado:** `09/11/2026, 10:00` até `16/11/2026, 10:00` (+ validação Sandbox 16/11–18/11/2026).
- **Marcos concluídos no Ciclo 1:**
  1. Migração da API legada `/v1/payments` para **Orders API (`/v1/orders`)** (13/11/2026, commit `819bcb1`, `ADR-0040`).
  2. Tokenização client-side com SDK JS v2 e alinhamento de schema `orders`/`customers`/`payment_webhook_events` (13/11/2026, commit `819bcb1`, `ADR-0039`).
  3. Blindagem de webhook em produção para nunca assumir `'approved'` por fallback ou corpo da requisição (13/11/2026, commit `819bcb1`, `ADR-0038`).
  4. Reconciliação ativa pull (`lib/payment/reconcile-orders.js`) e normalização de URL de boleto `/staging/payments/` → `/sandbox/payments/` (14/11/2026, commit `f46ebf4`, `ADR-0041`).

## H2. Ocorrências Históricas Resolvidas no Ciclo 1

| ID | Problema | Data / Commit | Solução Aplicada |
|---|---|---|---|
| `OC-01-MP-ORDERS-API-MIGRATION` | Credenciais `APP_USR-` da aplicação "Checkout Transparente com Orders" incompatíveis com `/v1/payments` legado; rejeição de `notification_url` e `federal_unit`. | 13/11/2026 (`819bcb1`, `ADR-0040`) | Migração para `POST /v1/orders`, `payer.address.state`, omissão de `installments` em `prepaid_card` e tratamento de HTTP `402`. |
| `OC-02-MP-LOCAL-WEBHOOK-UNREACHABLE` | Pedidos PIX pagos no Sandbox permaneciam pendentes em `localhost` por falta de webhook público. | 14/11/2026 (`f46ebf4`, `ADR-0041`) | Criação de `lib/payment/reconcile-orders.js`, polling 5s em `/checkout/[id]`, `"Verificar pagamento agora"` e `"Sincronizar MP"`. |
| `OC-03-MP-SANDBOX-BOLETO-STAGING-URL` | Boletos no Sandbox retornavam `ticket_url` em `/staging/payments/...` dando HTTP 503. | 14/11/2026 (`f46ebf4`) | Função `normalizeMercadoPagoTicketUrl` convertendo `/staging/payments/` para `/sandbox/payments/` (preservando `/payments/` de produção). |
| `OC-04-MP-WEBHOOK-UNVERIFIED-STATUS` | Webhook confiava no `status` do corpo ou aplicava `'approved'` como fallback. | 13/11/2026 (`819bcb1`, `ADR-0038`) | Em `NODE_ENV=production`, consulta obrigatória à API do MP e retorno `502`/`503` em falha para retry. |

## H3. Ações do Ciclo 1 Concluídas e Validadas

- **Ação 01 (Validação Prática no Sandbox com Valor >= R$ 0,50 / R$ 4,00):** **Concluída e Validada (16/11–18/11/2026)** — homologados Pedidos `#22` a `#31` conforme tabela canônica abaixo.
- **Ação 02 (Implementação de Teste E2E de Checkout no Cypress):** **Concluída e Validada (16/11/2026)** — `cypress/e2e/checkout.cy.js` criado em `dc77185` e corrigido no intercept `/api/customer/orders` em `01a4a3f` (`4 passing`, CI Run `#141`).
- **Ação 03 (Roteiro e Scripts de Homologação de Webhook com Túnel Seguro):** **Concluída e Validada (16/11–17/11/2026)** — commits `dbcbbc0` e `6b69224`: scripts `scripts/maintenance/verify-mp-webhook.js`, `scripts/maintenance/start-webhook-tunnel.sh` e `tests/unit/scripts/verify-mp-webhook.test.js` (`6/6` testes). Validado ao vivo via túnel `cloudflared` (`https://provided-lights-explains-hopes.trycloudflare.com/api/webhooks/mercadopago`) e disparo oficial do Simulador de Notificações do painel do Mercado Pago (`application_id: "516565028360615"`). CI no GitHub Actions (commit `dbcbbc0`): Runs `#147` (`Lint & Test Coverage Gate`), `#141` (`E2E Isolated`) e `#132` (`Test Coverage Gate banco real`) aprovados.

## H4. Registro Canônico de Homologação no Sandbox e PostgreSQL (Pedidos #20–#32)

| Pedido | Data | Cenário / Meio de Pagamento | Valor | IDs Mercado Pago (`Order` / `Payment`) | Status MP (`status` / `status_detail`) | Estado em `orders` e Estoque (`products.id = 19`) | Evento Webhook (`payment_webhook_events`) |
|---|---|---|---|---|---|---|---|
| **#20** | 14/11/2026 | PIX aprovado + reconciliação ativa (`ADR-0041`) | — | Sandbox `ORD...` | `processed` / `accredited` | `payment_status = 'approved'`, `order_status = 'paid'` (reconciliado via pull) | — |
| **#21** | 14/11/2026 | Boleto emitido/aprovado + normalização `/sandbox/payments/` | — | Sandbox `ORD...` | `processed` / `accredited` | `ticket_url` normalizado e boleto visualizado no Sandbox | — |
| **#22** | 16–17/11/2026 | Cartão de crédito Mastercard `1x` — aprovação + webhook real `cloudflared` | R$ 0,50 | `ORDTST01M7JZQWF8JS91B32MM9DRDETA` / `PAY01M7JZQWFXWQE3K0CHK70QYX77` | `processed` / `accredited` | `payment_status = 'approved'`, `order_status = 'paid'` | `id = 14` (túnel assinado + idempotência `duplicate: true`) e `id = 16` (`event_key = 'order_order.processed_22_approved'`, `processed_at = '2026-11-17T20:30:07.782Z'`) |
| **#23** | 18/11/2026 | Cartão de crédito Mastercard `1x` — recusa pelo emissor | R$ 0,50 | `ORDTST01M7R579Z0GF1MHJKT03XKPZ34` / `PAY01M7R579ZQ3WDBPEZAG598G8NG` | `failed` / `rejected_by_issuer` | `rejected` / `cancelled`, `stock_restored = true` (estoque em `50000` sem dupla devolução) | `id = 17` (`event_key = 'order_order.failed_ORDTST01M7R579Z0GF1MHJKT03XKPZ34_rejected'`, `"duplicate": true` no reenvio) |
| **#24** | 18/11/2026 | Cartão de crédito Mastercard `1x` (titular `'CONT'`) — pagamento em análise | R$ 0,50 | `ORDTST01M7R6G0W4V9YNQ1H7W14WQCK9` / `PAY01M7R6G0WJYBZ4X09TPG46H22K` | `processing` / `in_process` | `in_process` / `awaiting_payment`, `stock_restored = false` (reserva ativa de 50 un.: `50000 → 49950`; `"Verificar pagamento agora"` validado) | — |
| **#25** | 18/11/2026 | Cartão de crédito Mastercard `1x` (titular `'CALL'`) — recusa exigindo autorização prévia | R$ 0,50 | `ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN` / `PAY01M7R9AR6XK8K99E87QDA5NR80` | `failed` / `required_call_for_authorize` | `rejected` / `cancelled`, `stock_restored = true` (estoque mantido em `49950`) | `id = 19` (`event_key = 'order_order.failed_ORDTST01M7R9AR6JZVFTCBDAMR0DXGJN_rejected'`, `"duplicate": true` no reenvio) |
| **#26** | 18/11/2026 | Cartão de crédito Mastercard `1x` (titular `'FUND'`) — saldo/limite insuficiente | R$ 0,50 | `ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ` / `PAY01M7RAQ8Q0ASE34P1MWG0MC9H0` | `failed` / `insufficient_amount` | `rejected` / `cancelled`, `stock_restored = true` (estoque mantido em `49950`) | `id = 21` (`event_key = 'order_order.failed_ORDTST01M7RAQ8PJ9G95FN31ZNFZTNKQ_rejected'`, `"duplicate": true` no reenvio) |
| **#27** | 18/11/2026 | Cartão de crédito Mastercard `1x` — dados do cartão ou CVV incorretos (1/3) | R$ 0,50 | `ORDTST01M7RBKHAGY0Y1VACQYZDYY57C` / `PAY01M7RBKHAZX74V9HX348P5G592` | `failed` / `bad_filled_card_data` | `rejected` / `cancelled`, `stock_restored = true` (estoque mantido em `49950`) | `id = 23` (`event_key = 'order_order.failed_ORDTST01M7RBKHAGY0Y1VACQYZDYY57C_rejected'`, `"duplicate": true` no reenvio) |
| **#28** | 18/11/2026 | Cartão de crédito Mastercard `1x` — dados do cartão ou CVV incorretos (2/3) | R$ 0,50 | `ORDTST01M7RC6GE85QJ1GT1DCTBF4FNP` / `PAY01M7RC6GEMCA17D5SSVANVV0B9` | `failed` / `bad_filled_card_data` | `rejected` / `cancelled`, `stock_restored = true` (estoque mantido em `49950`) | `id = 25` (`event_key = 'order_order.failed_ORDTST01M7RC6GE85QJ1GT1DCTBF4FNP_rejected'`, `"duplicate": true` no reenvio) |
| **#29** | 18/11/2026 | Cartão de crédito Mastercard `1x` — dados do cartão ou CVV incorretos (3/3) | R$ 0,50 | `ORDTST01M7RCZGFHSPFX3R3EVR6B7VCZ` / `PAY01M7RCZGFYXVXNXZXMYYW4EC05` | `failed` / `bad_filled_card_data` | `rejected` / `cancelled`, `stock_restored = true` (estoque mantido em `49950`) | `id = 27` (`event_key = 'order_order.failed_ORDTST01M7RCZGFHSPFX3R3EVR6B7VCZ_rejected'`, `"duplicate": true` no reenvio) |
| **#30** | 18/11/2026 | Cartão pré-pago Elo (`prepaid_card`) — aprovação imediata | R$ 0,50 | `ORDTST01M7RDE2JF3WNSSTCW3QNZPCDP` / `PAY01M7RDE2JZMNAZ02J6550WK0JP` | `processed` / `accredited` | `payment_method = 'debit_card'`, `approved` / `paid`, `stock_restored = false` (baixa definitiva 50 un.: `49950 → 49900`) | `id = 29` (`event_key = 'order_order.processed_ORDTST01M7RDE2JF3WNSSTCW3QNZPCDP_approved'`, `"duplicate": true` no reenvio) |
| **#31** | 18/11/2026 | Boleto bancário (`bolbradesco` / `ticket`) — expiração/cancelamento | R$ 4,00 | `ORDTST01M7RE283RCXAHMK564DRXW0XW` / `PAY01M7RE2843NDANF5RFG5QFGP9J` | `canceled` / `expired` | `payment_method = 'ticket'`, `cancelled` / `cancelled`, `stock_restored = true` (devolução única 400 un.: `49500 → 49900`) | `id = 31` (`event_key = 'order_order.canceled_ORDTST01M7RE283RCXAHMK564DRXW0XW_cancelled'`, `"duplicate": true` no reenvio) |
| **#32** | 26/11/2026 | PIX (`bank_transfer`) — revalidação pós-ADR-0044 (reconciliação ativa + webhook HMAC v2) | R$ 0,01 | `ORDTST01M8BHGF860ZS8JJFE55PTZGM2` / `PAY01M8BHGF98AFXW5JK627WNMKYX` | `processed` / `accredited` | `payment_method = 'pix'`, `approved` / `paid`, `stock_restored = false` (baixa definitiva 1 un. em `products.id = 19` → `49949`; `ticket_url` normalizado `/sandbox/payments/`) | Reconciliado em 26/11 `06:03:26-03` + webhook assinado `ts=1795693658`/`1795693665` validado ao vivo via `verify-mp-webhook.js --send` (`"duplicate": false` → `"duplicate": true`) |
