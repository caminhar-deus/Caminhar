# Auditoria Semanal do Fluxo de APIs e Plano de Ação — Projeto Caminhar

> Documento central para acompanhamento progressivo do fluxo de desenvolvimento, manutenção, segurança, performance, validação e evolução das APIs do Projeto **O Caminhar com Deus** (`/home/gus/projetos/Caminhar`).
> Cada ciclo semanal é acumulado neste arquivo sem apagar o histórico relevante dos ciclos anteriores, atualizando o status das ações apenas diante de evidências verificáveis.
> **Restrição desta execução (23/11/2026):** rotina exclusiva de auditoria, validação e planejamento. **Nenhum código-fonte, configuração, teste ou documento normativo/de arquitetura foi modificado.**

---

## Convenções de Classificação

| Categoria | Significado |
|---|---|
| **Problema identificado e ainda existente** | Defeito ou brecha confirmado diretamente no código-fonte/configuração atual em 23/11/2026. |
| **Problema identificado e corrigido** | Defeito corrigido nos últimos 7 dias com evidência em commit/código e testes. |
| **Problema parcialmente corrigido** | Correção aplicada na janela fechou parte do problema, mas deixou lacunas ou rotas irmãs expostas. |
| **Problema recorrente** | Padrão de falha repetido mais de uma vez na janela ou entre ciclos/subsistemas. |
| **Melhoria já implementada** | Aprimoramento entregue e verificado na janela analisada. |
| **Melhoria identificada, mas ainda não implementada** | Oportunidade tecnicamente justificada e ainda aberta no código atual. |
| **Situação que necessita de investigação adicional** | Ponto que depende de ambiente remoto, dados reais, banco ao vivo ou decisão explícita do dono do projeto. |

---

## Quadro Consolidado de Ciclos

| Ciclo | Data de Execução | Período Analisado (Últimos 7 Dias) | Resumo do Ciclo |
|---|---|---|---|
| **Ciclo 1** | 23/11/2026, 13:00:13 BRT | 16/11/2026 13:00:13 BRT → 23/11/2026 13:00:13 BRT (168 h) | Primeira auditoria estrutural completa das 38 rotas em `pages/api/` e camadas de suporte (`proxy.js`, `next.config.js`, `lib/api/`, `lib/auth/`, `lib/cache/`, `lib/infra/`, `lib/media/`, `lib/payment/`, `lib/domain/`). Analisados 37 commits da janela + alterações pré-existentes de 23/11 no working tree. Planejadas **8 ações** (`API-AC-01` a `API-AC-08`): 2 Críticas, 3 Altas, 1 Média-Alta e 2 Médias. |

### Painel de Acompanhamento das Ações

| ID | Título Resumido | Prioridade | Dependência Técnica | Status | Ciclo de Origem |
|---|---|---|---|---|---|
| `API-AC-01` | Blindagem de auth/cookies (`URIError`), `POST /api/auth/refresh` (`refresh_token` no body + rotação atômica) e brute force case-insensitive em `login.js` | **Crítica** | Nenhuma (executar primeiro) | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-02` | Proteção de `POST /api/webhooks/mercadopago` (rate limit, anti-replay temporal `ts`, dados autoritativos da API e corrida `!current`) | **Crítica** | Independente de `API-AC-01` (prioridade imediata) | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-03` | Fechamento de brechas RBAC, isolamento Modalidade A×B, proteção do usuário/cargo `admin`, integridade de uploads (`fs.realpath` / CSP `/api/uploads/*`) e `cleanup-test-data.js` | **Alta** | Após `API-AC-01`; coordena com `API-AC-06` em `internal-products.js` | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-04` | Suporte a rate limit em `GET` no `createAdminHandler`, correção do bug `automaticDeserialization` e lógica de bloqueio/whitelist em `rate-limit.js` + `lib/cache/cache.js` | **Alta** | Pré-requisito para rate limit efetivo em `GET` de `API-AC-06` | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-05` | Correção de crashes `TypeError` (body nulo / query duplicada / IDs inválidos), auditoria `"undefined"` em `musicas.js`/`users.js` e sucesso falso em `admin/cache.js` | **Alta** | Independente (executar antes ou em conjunto com `API-AC-06`) | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-06` | Performance e erros seguros em rotas irmãs (`placeholder-image.js`, `integrity.js`, `stats.js`), migração de `orders.js`/`internal-products.js` para `createAdminHandler` e refinamento de `fetch-*` | **Média-Alta** | Após `API-AC-03` e `API-AC-04` | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-07` | Saneamento de CORS em `next.config.js`, consistência de header `Allow` em `405` e endurecimento residual de `/api/customer/auth` + corrida `23505` em `customers.js` | **Média** | Após `API-AC-01` | **Pendente** | Ciclo 1 (23/11/2026) |
| `API-AC-08` | Thresholds de cobertura de APIs em `jest.config.js`, suítes `*.db.test.js` faltantes, validação remota do CI (`test-db-coverage.yml`, `npm audit`) e alinhamento de inventários `PROJECT_*.md` | **Média** | Executar por último (consolida guardas de `API-AC-01` a `API-AC-07`) | **Pendente** | Ciclo 1 (23/11/2026) |

---

# Ciclo 1 — 23/11/2026

## 1. Identificação da Auditoria e Período Analisado

- **Data e horário de execução:** `23/11/2026, 13:00:13 (America/Sao_Paulo / BRT / UTC-3)` (`2026-11-23T13:00:13-03:00`).
- **Período obrigatório analisado (últimos 7 dias / 168 h):** de **`16/11/2026 13:00:13 BRT`** até **`23/11/2026 13:00:13 BRT`**.
- **Recorte Git na janela exata:** **37 commits** na branch `main` (de `01a4a3f` em `16/11/2026 15:14:28 BRT` até `ee4ed2e` em `22/11/2026 17:18:50 BRT`), além de **21 arquivos com modificações locais pré-existentes no working tree em 23/11/2026** (entre eles `pages/api/products.js` e `tests/integration/api/products.test.js`, preservados intactos).
- **Contexto de fronteira (fora das 168 h — apenas para compreensão contextual):** os 3 commits da manhã de `16/11/2026` (`b37c9f1` 11:58 — criação de `orders.db.test.js` e `customers.db.test.js`; `dc77185` 12:24 — `checkout.cy.js` e guarda `schema-sources.test.js`; `905712e` 12:33 — Ciclo 1 de `docs/melhoria_mercadopago.md`) e decisões estruturais anteriores (`ADR-0002` a `ADR-0041`, passa de segurança de `21/10/2026`, `6424780` de `08/11/2026`) são citados exclusivamente como contexto técnico e origem histórica de código, nunca classificados como atividade da janela.

### 1.1 Fontes Efetivamente Consultadas (Somente Leitura)

1. **Documentos principais obrigatórios (integralmente preservados):**
   - `/home/gus/projetos/Caminhar/AGENTS.md` (regras de processo, mapa de consulta §0.1, segurança de rotas §6 e Definição de Pronto §7).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PRIVADO.md` (atualizado em `2026-11-23`; painel `/admin`, 11 abas, RBAC, auditoria, §8 e §9).
   - `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md` (atualizado em `2026-11-23`; vitrine, Modalidades A/B, Mercado Pago, conta do visitante §5.1, §7 e §8).
2. **Implementação real das APIs (inspeção integral das 38 rotas e infraestrutura):**
   - Todas as **38 rotas** em `/home/gus/projetos/Caminhar/pages/api/`: 18 em `pages/api/admin/`, 4 em `pages/api/auth/`, 2 em `pages/api/customer/`, 1 em `pages/api/uploads/`, 1 em `pages/api/webhooks/` e 12 na raiz de `pages/api/`.
   - Camadas de suporte: `proxy.js`, `next.config.js`, `lib/api/{adminCrudHandler,helpers,pagination,permissions,utils}.js`, `lib/auth/{auth,customer-auth,google-id-token,password-policy}.js`, `lib/cache/cache.js`, `lib/infra/{db,redis,storage}.js`, `lib/media/{spotify,youtube}.js`, `lib/domain/{products,orders}.js`, `hooks/AuthProvider.js`, `pages/admin.js`, `scripts/check-env.js`, `scripts/bench/ground-truth.js`, `jest.config.js`, `package.json`, `.ai-memory.toml`.
   - Testes inspecionados: `tests/integration/api/auth/refresh.test.js`, `tests/integration/api/admin/cache.test.js`, `tests/integration/api/products.test.js` (diff).
3. **Histórico, ADRs, logs e relatórios técnicos:**
   - `git status`, `git log` (últimos 7 dias + 14 dias para contexto), `git diff` do working tree, `git show --stat 28b6b17 0091855`.
   - `CHANGELOG.md`, `docs/adr/0011`, `docs/adr/0042`, `docs/adr/0043`, `docs/PENDENCIAS_seguranca-rotas-api.md`.
   - Auditorias irmãs da semana (consultadas para evitar duplicação e cruzar evidências, sempre revalidadas no código): `docs/melhoria_mercadopago.md`, `docs/melhoria_google.md`, `docs/melhoria_agente.md`, `docs/retorno_da_semana.md`.
   - Logs locais: `logs/tests-output.log` (`mtime` `22/11/2026 17:16`), `logs/coverage-output.log` (`mtime` `22/11/2026 17:18`), `logs/eslint.log` (`mtime` `21/11/2026 18:09`, 0 bytes).
4. **Verificadores read-only executados ao vivo em `23/11/2026`:**
   - `npm run knip` → **0 issues** (`Excellent, Knip found no issues`).
   - `npm run lint` → **0 erros / 0 warnings**.
   - `npm run lint:workflows` (`actionlint 1.7.12`) → **0 erros**.
   - `npm run security:check-sql` → **0 vulnerabilidades** em `264` arquivos.
   - `npm run security:check-credentials` → **0 ocorrências** em `102` arquivos.
   - `npx jest --no-cache tests/unit/scripts/bench-ground-truth.test.js tests/integration/api/products.test.js` → **2/2 suítes, 53/53 testes aprovados** (canário `14/14` + `/api/products` `39/39`, validando inclusive o diff não commitado de `pages/api/products.js`).

### 1.2 Limitações Encontradas (Registradas Explicitamente)

1. **MCP `ai-memory` negado nesta sessão:** chamadas a `memory_briefing` e `memory_read_page` retornaram `permission check failed`. Conforme `AGENTS.md` §3, não houve contorno por shell nem leitura de arquivos internos da memória; apenas o resumo injetado no `SessionStart` foi consultado (o qual também alertou sobre **20 avisos em `_lint/report.md`**, não legíveis nesta sessão).
2. **Histórico individual de sessões OpenCode × Antigravity indisponível:** todos os 37 commits da janela possuem o mesmo autor Git (`caminhar`), e não há transcrições locais de execuções anteriores do OpenCode/Antigravity. Assim, **não é possível atribuir** cada commit individualmente a OpenCode ou Antigravity nem comprovar por log quais documentos cada agente leu antes de editar.
3. **GitHub Actions remoto inacessível:** o sandbox bloqueia conectividade externa, impedindo consultar runs/logs remotos de `test-coverage.yml`, `test-db-coverage.yml`, `e2e.yml` e `load-tests.yml` na janela.
4. **`.env*` e banco ao vivo não consultados:** por regra de segurança (`AGENTS.md` §6) e restrição da auditoria (§10), variáveis reais de ambiente e o PostgreSQL/Redis em execução não foram lidos.
5. **Suítes `.db.test.js` puladas localmente:** nos logs de `22/11/2026 17:16`, as 8 suítes `*.db.test.js` (96 testes) constam como `skipped` por ausência de daemon Docker local; a validação real dessas queries depende do job remoto `test-db-coverage.yml`.

---

## 2. Inventário Real da Superfície de APIs do Projeto (38 Rotas)

Confirmado em disco em `23/11/2026`: `pages/api/` contém **38 arquivos**, todos com `export default` (38 rotas ativas — sem módulos utilitários soltos em `pages/api/`).

| Grupo | Rotas | Mecanismo de Auth / RBAC | Rate Limit Efetivo | Observações Estruturais Verificadas |
|---|---|---|---|---|
| **Admin via `createAdminHandler` (17 rotas)** | `admin/{audit,backups,cache,categories,dicas,fetch-ml,fetch-spotify,fetch-youtube,integrity,musicas,posts,rate-limit,roles,stats,users,videos}.js` + `ip-diagnostico.js` | `withAuth` + `checkRolePermission` (ou `requireAdmin: true` em `cache`, `ip-diagnostico`) + `X-Request-Id` + `503` DB | Apenas em `POST`/`PUT`/`DELETE` (`adminCrudHandler.js:193`); **inoperante em `GET`** | `ip-diagnostico`, `audit` e `stats` declaram `rateLimit` em rotas `GET`-only (efeito nulo); `integrity` não declara `rateLimit`. |
| **Admin manuais (2 rotas)** | `admin/orders.js`, `admin/internal-products.js` | `getAuthToken` + `verifyToken` + `checkRolePermission('Gestão de Vendas')` manuais | `30/min` em mutações; **sem rate limit em `GET`** | Duplicam middleware fora de `createAdminHandler` (sem `X-Request-Id`, sem `503` DB, `requireAuth` fora do `try/catch`). |
| **Auth painel (4 rotas)** | `auth/{login,logout,refresh,check}.js` | Cookie `token` (`1h`, `HttpOnly; SameSite=Lax`) + `refreshToken` (`30d`, `HttpOnly; SameSite=Strict; Path=/api/auth/refresh`) | `login`: `5/min` IP (`proxy.js` + handler) + `10/5min` user; `refresh`: `30/min`; `check`: `60/min`; `logout`: nenhum | `refresh.js` ainda devolve `token` e `refresh_token` no body; `login.js` tem `req.body` fora do `try/catch` e backstop case-sensitive; `parseCookie` vulnerável a `URIError`. |
| **Auth/Pedidos Visitante (2 rotas)** | `customer/auth.js`, `customer/orders.js` | Cookie isolado `customerToken` (`24h`, `scope: 'customer'`) + Google JWKS `RS256` local (`lib/auth/google-id-token.js`) | `POST auth`: `20/min`; `PUT auth`: `30/min`; `GET orders`: `60/min`; **`GET auth`: nenhum** | `customer/orders.js:13` chama `getAuthenticatedCustomer` fora do `try/catch`; `GET auth` sem `Cache-Control: no-store`. |
| **Checkout & Webhook (2 rotas)** | `checkout.js`, `webhooks/mercadopago.js` | `checkout`: `GET` público, `POST` `customerToken`; `webhook`: HMAC-SHA256 v2 (`x-signature`) | `GET checkout`: `60/min`; `POST checkout`: `15/min`; **`webhook`: nenhum** | `webhook` sem rate limit nem validação temporal de `ts`; descarta detalhes autoritativos da API em produção; grava `event_key` quando `!current`. |
| **Compartilhadas Pública/Admin (4 rotas)** | `products.js`, `settings.js`, `upload-image.js`, `status.js` | `products`: `GET ?public=true` público, demais JWT + `Gestão de Produtos`; `settings`: `GET` público, `?key=` JWT (bypass `editor`), `POST`/`PUT` `withAuth` + `Configuração de Cabeçalho`; `upload-image`: `withAuth` + RBAC condicional; `status`: `?mode=health` público, diagnóstico JWT | `products`: `60/min` GET público / `30/min` admin; `settings`: `600/min` público / `30/min` admin; `upload-image`: `30/min`; **`status`: nenhum** | `upload-image.js:69,166` usa `if (req.user?.role)` (fail-open); `products.js` sem filtro `modality` em `PUT`/`DELETE`/`reorder`. |
| **Públicas de Catálogo & Mídia (6 rotas)** | `posts.js`, `musicas.js`, `videos.js`, `dicas.js`, `placeholder-image.js`, `uploads/[...path].js` | Somente leitura (`GET`, ou `GET`/`HEAD` em mídia) | `posts`: `300/100 min`; `musicas`: `60/min`; `videos`: `300/min`; `dicas`: `60/min`; **`placeholder-image` e `uploads`: nenhum** | `uploads/[...path].js` corrigido em `6e94332` (`res.end(buffer)`), mas `placeholder-image.js:106` mantém `res.send(imageBuffer)`; divergência documental sobre `fs.realpath`/whitelist em `uploads/[...path].js`; `/api/uploads/*.svg` sem CSP sandbox. |
| **Utilitária de Teste (1 rota)** | `cleanup-test-data.js` | `withAuth` + checagem hardcoded `username === ADMIN_USERNAME \|\| 'admin'` | **Nenhum** | Exposta sem gate de ambiente, sem `createAdminHandler`, sem `logActivity`, sem `invalidateCache('posts:*')`. |

---

## 3. Compreensão Completa do Fluxo de APIs (Últimos 7 Dias)

### 3.1. Rotinas Identificadas
1. **Desenvolvimento e evolução de endpoints:** especificação ancorada nos documentos de arquitetura (`ARQUITETURA_SITE_PUBLICO.md` / `ARQUITETURA_SITE_PRIVADO.md`) → definição de schema Zod e lógica em `lib/domain/` ou `lib/payment/`/`lib/auth/` → exposição em `pages/api/` → atualização de testes unitários/integração (`tests/integration/api/`, `tests/unit/pages/api/`) e de banco real (`tests/integration/domain/*.db.test.js`) → atualização documental e ADRs.
2. **Endurecimento reativo / varredura de segurança:** auditoria de endpoints (`28b6b17`, `0091855` em `22/11/2026`, e `f161227` em `19/11/2026`) aplicando RBAC, rate limit, anti-SSRF e auditoria.
3. **Homologação e diagnóstico de integrações externas:** scripts operacionais em `scripts/maintenance/{start-webhook-tunnel.sh,verify-mp-webhook.js}` (`dbcbbc0`, `6b69224`) e validação ao vivo de Sandbox Mercado Pago (Pedidos `#22`–`#31`) e Google Identity Services (`80478dd`, `fad08f6`).
4. **Validação estática e de regressão:** `npm run lint`, `npm run knip`, `npm run lint:workflows`, `npm run lint:chars`, `npm run security:check-sql`, `npm run security:check-credentials`, `npm test` (Jest), canário `tests/unit/scripts/bench-ground-truth.test.js` e `npm run test:db:container` (em CI `test-db-coverage.yml`).
5. **Governança e auditorias semanais:** rotina automática gerando relatórios dedicados em `docs/{retorno_da_semana,melhoria_agente,melhoria_mercadopago,melhoria_google,melhoria_design,melhoria_API}.md`.

### 3.2. Etapas e Dependências
1. **Camada de borda (`next.config.js` + `proxy.js`):** aplica headers globais (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS`), headers CORS em `/api/*`, rewrite `/uploads/:path* → /api/uploads/:path*`, CSP sandbox em `/uploads/:path*`, COOP em `/entrar` e rate limit de borda exclusivamente em `/api/auth/login` (`proxy.js:27-29,96-98`).
2. **Camada de entrada da rota (`pages/api/`):** verificação de método HTTP → resolução de IP via `getClientIP(req)` / `TRUST_PROXY` (`lib/api/helpers.js`) → autenticação (`withAuth` ou `getAuthToken`+`verifyToken` ou `getAuthenticatedCustomer` ou `verifyMercadoPagoWebhookSignature`) → autorização RBAC (`checkRolePermission` em `lib/api/permissions.js`, fail-closed para não-`admin`) → rate limiting (`checkRateLimit` em `lib/cache/cache.js`) → validação de payload/query (Zod ou `paginate`).
3. **Camada de aplicação/domínio (`lib/domain/`, `lib/auth/`, `lib/payment/`, `lib/media/`):** regras de negócio, transações PostgreSQL (`transaction()` + `SELECT ... FOR UPDATE`), integrações externas com timeout (`8s`–`15s`) e verificação criptográfica local (`google-id-token.js` `RS256` JWKS).
4. **Camada de dados, cache e auditoria (`lib/infra/db.js`, `lib/infra/redis.js`, `lib/cache/cache.js`, `lib/domain/audit.js`):** pool `pg` (`max: 50`, retry em timeout), cache L1 (`appMemoryCache`) + L2 (`Upstash Redis` com `automaticDeserialization: false`) + single-flight, invalidação pós-mutação e registro em `activity_logs` (`logActivity`).
5. **Canário de ground truth (`scripts/bench/ground-truth.js`):** toda alteração que desloca linhas-âncora em `pages/api/`, `lib/api/`, `lib/auth/auth.js`, `proxy.js` ou `next.config.js` exige recalibração em `scripts/bench/` e execução de `tests/unit/scripts/bench-ground-truth.test.js` (`AGENTS.md` §7 item 1).

### 3.3. Processos, Responsáveis e Recursos
- **Divisão normativa (`AGENTS.md` §2):** no `oh-my-opencode-slim` (OpenCode), `orchestrator` planeja/reconcilia, `explorer` mapeia/pesquisa, `designer` define UI/UX, `fixer` implementa e `oracle` revisa; fora do slim (Antigravity / Claude Code), o agente executa o ciclo ponta a ponta. *(Conforme limitação §1.2.2, não há log por commit identificando qual agente executou cada entrega da semana.)*
- **Dependências de runtime críticas para APIs (`package.json`):** `next` `16.4.6` (atualizado em `8b5da20`, 18/11), `pg` `8.23.1`, `@upstash/redis` `1.41.0`, `zod` `4.6.7`, `jsonwebtoken` `9.0.3`, `bcryptjs` `3.0.3`, `formidable` `3.5.4`, `sharp` `0.35.5`, `dotenv` `18.0.10`.

### 3.4. Identificações (Padrões, Regras e Decisões Técnicas Vigentes)
- **Pages Router único** (`ADR-0002`), **PostgreSQL sem ORM** (`ADR-0003`), **cache em 2 níveis L1/L2** (`ADR-0004`) e **JWT em cookie `httpOnly` + RBAC** (`ADR-0005`).
- **Modelo de cargo `admin`:** `admin` é cargo comum que salta a checagem de permissão por desenho (`ADR-0010`), e conta/cargo `admin` são protegidos contra exclusão/alteração de vínculo (`ARQUITETURA_SITE_PRIVADO.md` §9).
- **Segurança padronizada (`AGENTS.md` §6):** uso obrigatório de `createAdminHandler` (ou `withAuth` + `checkRolePermission` fail-closed), `getClientIP(req)` (`TRUST_PROXY`), Zod, `logActivity`, `500` sem `error.message` cru e anti-SSRF em fetches outbound.
- **Erros de banco → `503` e `refresh_token` fora do body do login** (`ADR-0011`, `lib/api/adminCrudHandler.js:271-277`).
- **Isolamento estrito de contextos:** `customers` (`customerToken`, `scope: 'customer'`) nunca acessa `/admin` nem `/api/admin/*` (`ADR-0037`); Modalidade A (`Gestão de Produtos`) e Modalidade B (`Gestão de Vendas`) não se misturam (`ADR-0037`).
- **Pagamentos Mercado Pago:** Orders API `/v1/orders` (`ADR-0040`), status confirmado na API oficial em produção (`ADR-0038`), alinhamento de schema com `.db.test.js` (`ADR-0039`), reconciliação ativa pull (`ADR-0041`).
- **Decisões formalizadas na janela:**
  - `ADR-0042` (`19/11/2026`, commit `fad08f6`): verificação local de ID tokens Google via JWKS `RS256` (`lib/auth/google-id-token.js`), zero novas dependências npm, cache `[5 min, 24 h]`, single-flight, cooldown `60 s`, separação `401`/`503`/`500`.
  - `ADR-0043` (`21/11/2026`, commit `e934811`): expiração por 1h de inatividade no `/admin` (`hooks/useAdminInactivityTimeout.js`, `utils/adminSession.js`), renovação silenciosa em uso ativo via `POST /api/auth/refresh` e guarda unificada de HTTP `401`.

### 3.5. Erros e Problemas Identificados (Origem × Identificação na Janela)

| ID | Problema / Falha | Origem Histórica | Ocorrência / Identificação na Janela | Estado Atual (23/11/2026) |
|---|---|---|---|---|
| `API-P01` | `parseCookie` (`decodeURIComponent` sem `try/catch`) em `lib/auth/auth.js:16` e `lib/auth/customer-auth.js:12` + chamadas fora de `try/catch` (`withAuth`, `logout`, `refresh`, `status`, `settings?key=`, `customer/orders`, `admin/orders`, `admin/internal-products`) geram `URIError` / HTTP `500` para qualquer cookie com `%` malformado | Anterior à janela (`auth.js`, `customer-auth.js`) | Identificado em `23/11/2026` (generalização sistêmica de `MG-11` para toda a camada auth) | **Ainda existente** |
| `API-P02` | `POST /api/auth/refresh` (`pages/api/auth/refresh.js:58-69`) devolve `data.token` e `data.refresh_token` no JSON mesmo para chamadas via cookie (únicos consumidores em produção são navegador: `pages/admin.js:238`, `hooks/AuthProvider.js:54`); além disso `refreshAccessToken` (`lib/auth/auth.js:121-163`) rotaciona sem `WHERE revoked = false RETURNING` (corrida) e acessa `user.role` sem checar `if (!user)` | Anterior à janela (`auth.js`, `refresh.js`) | Identificado em `23/11/2026` (fluxo de refresh ativado em uso contínuo pelo `ADR-0043` em `21/11`) | **Ainda existente** |
| `API-P03` | `POST /api/auth/login` (`pages/api/auth/login.js:39,82`): `req.body` desestruturado fora de `try/catch`; backstop por usuário `LOGIN_USER_LIMIT` não normaliza caixa (`Admin`/`ADMIN` burla o limite enquanto SQL usa `LOWER(username)`), falha aberto se `username` não for string, e só checa *após* `bcrypt`; cobertura crítica em `68,45%` L / `72,72%` B | Anterior à janela | Identificado em `23/11/2026` (`retorno_da_semana.md` + ampliação nesta auditoria) | **Ainda existente** |
| `API-P04` | `POST /api/webhooks/mercadopago`: sem `checkRateLimit`, sem janela temporal no `ts` da HMAC v2 (`lib/payment/mercadopago.js:422-441`), descarta detalhes autoritativos da API oficial em produção (`fetchMercadoPagoPaymentStatus`) e grava `event_key` retornando `200` quando `!current` (`lib/domain/orders.js:582-584`) | Anterior à janela (`6424780`, `f46ebf4`) | Identificado em `23/11/2026` (confirmado diretamente no código; convergente com `MP-DIAG-01/04/05`) | **Ainda existente** |
| `API-P05` | Falta de isolamento server-side de `modality` em `PUT`/`DELETE`/`reorder` de `pages/api/products.js` e `pages/api/admin/internal-products.js` (L198 inclusive força `modality: 'internal'`, podendo sequestrar produto externo para interno) | Anterior à janela (`6424780`); parcialmente tocado em `00758a7` (`21/11`, só `GET`) | Identificado em `23/11/2026` (convergente com `MP-DIAG-02`) | **Ainda existente** |
| `API-P06` | `createAdminHandler` (`lib/api/adminCrudHandler.js:193`) só aplica `rateLimit` em `POST`/`PUT`/`DELETE`, tornando inoperante o `rateLimit` configurado em `ip-diagnostico.js:191`, `audit.js:64` e `stats.js:97` (todas `GET`-only) | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P07` | `pages/api/admin/rate-limit.js`: instancia `new Redis(...)` próprio sem `automaticDeserialization: false` (L14) → `parseAndFilterLogs` (`rawLogs.map(JSON.parse)`, L77) lança `SyntaxError` no Upstash real e zera logs; usa `MAX_ATTEMPTS = 5` fixo para todas as chaves `rate_limit:*` (falsos bloqueados para rotas de 60–600/min); não exclui `rate_limit:whitelist` da lista de bloqueados (efeito colateral de `0091855` em `22/11`, que roda `INCR` junto com `SISMEMBER`); `redis.del('rate_limit:' + ip)` não casa com `rate_limit:<endpoint>:<ip>`; `export_csv` sem proteção contra CSV Injection; mutações sem `req.adminUtils.logActivity` | Parcialmente anterior + interação introduzida em `0091855` (`22/11/2026`) | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P08` | `pages/api/admin/musicas.js:136` grava `"Atualizou a música: undefined"` na Auditoria em toggles de status sem `titulo` no body (violação direta de `ARQUITETURA_SITE_PRIVADO.md` §9); `pages/api/admin/users.js:173` grava `"Atualizou o usuário: undefined"` para ID inexistente | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P09` | `pages/api/admin/cache.js:11` ignora o retorno `{ success: false, error }` de `clearAllCache({ confirm: true })`, respondendo `200` "limpo com sucesso" e gravando auditoria mesmo em falha de `FLUSHDB` | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P10` | Proteção do `admin` contornável + validação frágil em `users.js` e `roles.js`: `PUT /api/admin/users` permite renomear `username` do usuário protegido `admin` e torna `id` opcional (`userUpdateSchema.partial()`); `PUT /api/admin/roles` torna `id` opcional, passa `updateData` cru (sem filtrar por `validation.data`) para `updateRecords` e permite renomear o cargo `admin`; `POST /api/admin/users` checa duplicidade case-sensitive (`username = $1` vs `LOWER()` no login) | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P11` | `pages/api/upload-image.js:69,166` usa `if (req.user?.role)` (fail-open se `role` ausente) e não valida `metadata.format` do `sharp` contra `['jpeg','png','webp','gif']`; `pages/api/settings.js:56,82` mantém bypass hardcoded para `role === 'editor'` e usa `DEFAULT_VALUES[key]` sem `Object.hasOwn` | Parcialmente introduzido em `28b6b17` (`22/11/2026` — `if (req.user?.role)`) + legado em `settings.js` | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P12` | Divergência documental e brecha em `/api/uploads/[...path].js`: `ARQUITETURA_SITE_PUBLICO.md:18` afirma `fs.realpath` e whitelist de extensões, mas `pages/api/uploads/[...path].js:45-73,147-148` usa apenas `path.resolve` (segue symlinks) e serve qualquer extensão como `application/octet-stream`; além disso, `next.config.js:176` aplica `CSP: default-src 'none'; sandbox` só em `/uploads/:path*`, deixando **`/api/uploads/<arquivo>.svg`** sem CSP sandbox | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P13` | `pages/api/placeholder-image.js:105-106` (irmão esquecido de `6e94332` de `18/11`): ainda chama `res.send(imageBuffer)` no Next 16.4.6 (bloqueio de event loop por `JSON.stringify(buffer)` + FNV-1a), lê/envia o arquivo inteiro em `HEAD` e não possui rate limit | Anterior à janela; irmão corrigido em `18/11` (`6e94332`), `HEAD` liberado em `22/11` (`28b6b17`) | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P14` | `pages/api/admin/integrity.js`: expõe `error.message` cru de Postgres/Redis/FS no JSON (L51, L75, L142, L181), cria `new Redis(...)` por request a cada polling de 30s, usa I/O síncrono recursivo (`readdirSync`/`statSync`/`statfsSync`) e lê `mtime` dos backups (irmão esquecido de §8 item 3) | Anterior à janela (`7d68032` tocou apenas leitura lazy das envs em `19/11`) | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P15` | Crashes `TypeError` em `req.body` nulo/ausente (`products`, `dicas`, `categories`, `posts`, `musicas`, `videos`, `roles`, `users`), query `search` duplicada como array em `posts.js:40,47` e `users.js:71`, `page`/`limit`/datas/IDs sem validação em `audit.js`, `users.js`, `categories.js`, `dicas.js`, `products.js`, e `videos.js` passando `req.body`/`updateData` crus para o domínio | Anterior à janela; `posts.js:40` tocado em `28b6b17` (`22/11`) | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P16` | `pages/api/admin/stats.js` cresceu para **33 `SELECT COUNT(*)` paralelos** no commit `25081d9` (`21/11/2026`); `admin/orders.js` e `admin/internal-products.js` seguem fora de `createAdminHandler` (sem `X-Request-Id`, sem `503` DB, `GET orders` sem rate limit); `cleanup-test-data.js` exposto sem gate de ambiente/auditoria/rate limit | `stats.js` ampliado em `21/11/2026` (`25081d9`); demais de `6424780`/legado | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P17` | Integrações `fetch-*`: `fetch-youtube.js:39` lança `Error` engolido como `500` genérico pelo `createAdminHandler` (mensagem amigável perdida); `fetch-spotify.js:119` tem `.replace(/"/g, '"')`/`.replace(/&/g, '&')` no-op e responde `500` em `BusinessError`; `fetch-ml.js:64,200` segue redirects HTTP sem revalidar host destino anti-SSRF nem limitar bytes do HTML | Parcialmente anterior; endurecidos em `28b6b17` (`22/11/2026`) | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P18` | CORS em `next.config.js:82-165` mantém regra órfã `/api/helper/:path*`, envia `ALLOWED_ORIGINS` sem split em `/api/:path*` junto com `Access-Control-Allow-Credentials: true`, e nenhuma rota trata `OPTIONS`; 13 rotas retornam `405` sem header `Allow`; `lib/cache/cache.js:341` permite `DISABLE_RATE_LIMIT=true` sem trava de `NODE_ENV !== 'production'` | Anterior à janela | Identificado em `23/11/2026` | **Ainda existente** |
| `API-P19` | `GET /api/customer/auth` sem rate limit nem `Cache-Control: no-store`; `PUT` devolve `200 { customer: null }` para conta inexistente; log duplo `warn`+`error` em `customer/auth.js:203-206`; corrida `23505` em `upsertGoogleCustomer` (`lib/domain/customers.js:117-123`) | `6424780` + `f161227` (`19/11/2026`) | Identificado em `23/11/2026` (convergente com `MG-12/13/15`) | **Ainda existente** |
| `API-P20` | Contaminação de `.env` nos testes Jest via `.vscode/settings.json` (`60acbc2`, `19/11`, derrubando 13 suítes) e `res.send(buffer)` em `/api/uploads/[...path].js` bloqueando event loop | `60acbc2` (`19/11`) e legado em `uploads` | Ocorridos e corrigidos na janela (`6e94332` em `18/11` e `7d68032` em `19/11`) | **Corrigido** |

### 3.6. Cuidados e Prevenção
- **Preservar rigorosamente:**
  - `res.status(200).end(buffer)` + `weakEtagFromStats` em `pages/api/uploads/[...path].js` (nunca voltar para `res.send(buffer)` no Next 16).
  - Isolamento absoluto `customers` (`customerToken`, `scope: 'customer'`) × `users` (`token`, `verifyToken` rejeitando `scope === 'customer'`).
  - `RS256` fixo, fail-closed sem Client ID, `ALLOW_GOOGLE_DEV_BYPASS === 'true'` bloqueado em produção, `password_hash = NULL` + `409` em `upsertGoogleCustomer` (`ADR-0042`).
  - `SELECT ... FOR UPDATE` e `stock_restored` em `lib/domain/orders.js`; confirmação na API oficial do Mercado Pago em produção (`ADR-0038`, `ADR-0041`).
  - Modelo `TRUST_PROXY` centralizado em `getClientIP(req)` / `resolveClientIP` (`lib/api/helpers.js`) e `checkRolePermission` fail-closed (`lib/api/permissions.js`, `ADR-0010`).
  - `automaticDeserialization: false` no `@upstash/redis` (`lib/infra/redis.js`) e `tests/setup-env.js` limpando variáveis externas no Jest.
  - Canário `tests/unit/scripts/bench-ground-truth.test.js`: recalibrar `scripts/bench/` na mesma rodada sempre que linhas-âncora em `pages/api/`, `lib/api/`, `lib/auth/auth.js`, `next.config.js` ou `proxy.js` mudarem.
- **Evitar:**
  - Aplicar correção pontual em apenas uma rota sem varrer rotas irmãs (padrão recorrente na janela: `uploads` sem `placeholder-image`; `backups` sem `integrity`; `GET AdminProducts` sem `PUT/DELETE/reorder`; `28b6b17` sem `webhooks/mercadopago` e `GET admin/orders`).
  - Instanciar `new Redis(...)` fora de `lib/infra/redis.js`.
  - Criar middlewares manuais de auth/RBAC em `pages/api/admin/*` fora de `createAdminHandler`.
  - Expor `error.message` cru ou tokens de longa duração em respostas JSON.

### 3.7. Correções Realizadas nos Últimos 7 Dias (16/11 13:00 → 23/11 13:00)

| Data / Commit | Motivação | Arquivos Principais de API | Resultado Observado e Validação |
|---|---|---|---|
| `16–17/11` (`dbcbbc0`, `6b69224`) | Homologar webhook real do Mercado Pago em `localhost` via túnel HTTPS e remover código HMAC duplicado | `scripts/maintenance/{start-webhook-tunnel.sh,verify-mp-webhook.js}`, `tests/unit/scripts/verify-mp-webhook.test.js` | **Validado:** `6/6` testes no log de `22/11`; webhook real entregue via `cloudflared` e gravado em `payment_webhook_events` (`ids 14, 16`). |
| `18/11` (`6e94332`, `eaeb298`) | `res.send(buffer)` em `/api/uploads/[...path].js` bloqueava o event loop (~100 ms/imagem), degradando `/api/products` | `pages/api/uploads/[...path].js`, `tests/integration/api/{uploads,upload-image-disk}.test.js`, `scripts/bench/orchestrator/gabarito.md` | **Validado no arquivo-alvo** (`19/19` testes, `96,46%` L); porém **deixou irmão `placeholder-image.js` sem ajuste** (`API-P13`). |
| `19/11` (`80478dd`, `fad08f6`, `f161227`) | Ativar e endurecer Google Sign-In do visitante com verificação criptográfica local JWKS `RS256` (`ADR-0042`), `ALLOW_GOOGLE_DEV_BYPASS`, anti-pré-sequestro (`password_hash = NULL` + `409`) | `lib/auth/google-id-token.js`, `pages/api/customer/auth.js`, `lib/domain/customers.js`, `next.config.js`, `scripts/check-env.js`, suítes de teste | **Validado localmente** (`google-id-token.test.js` `19/19`, `customer/auth.test.js` `35/35`, `customers.test.js` `14/14` nos logs de `22/11`); pendente confirmação remota de `customers.db.test.js` no CI e fechamento de `API-P19`. |
| `19/11` (`7d68032`) | `.vscode/settings.json` (`60acbc2`) vazava `.env` no Jest, quebrando 13 suítes e disparando `redisInstance.quit is not a function` | `tests/setup-env.js`, `jest.teardown.js`, `lib/infra/redis.js`, `lib/cache/cache.js`, `pages/api/admin/integrity.js` | **Validado:** `241/249` suítes (`2.090` testes) verdes em `22/11/2026`, `0` avisos de teardown. |
| `21/11` (`25081d9`) | Expor métricas de Vendas Internas e Produtos Internos na Visão Geral | `pages/api/admin/stats.js`, `tests/integration/api/stats.test.js` | **Validado funcionalmente** (`100%` cobertura em `stats.js`), mas elevou o endpoint para **33 queries paralelas** (`API-P16`). |
| `21/11` (`00758a7`) | Isolar listagem de `Gestão de Produtos` (`modality=external`) | `components/Admin/AdminProducts.js`, `hooks/useAdminCrud.js`, `tests/integration/api/products.test.js` | **Parcial:** isolou o `GET`, mas manteve `PUT`/`DELETE`/`reorder` sem filtro de `modality` (`API-P05`). |
| `21/11` (`e934811`) | Sessão `/admin` expirava após 1h com erros crus de `401` (`ADR-0043`) | `pages/admin.js`, `hooks/useAdminInactivityTimeout.js`, `utils/adminSession.js`, `hooks/useApiFetch.js`, `hooks/useAdminCrud.js` | **Validado** nas suítes de hooks/componentes (`22/11`); intensificou o uso de `POST /api/auth/refresh`, dando mais peso a `API-P02`. |
| `22/11` (`28b6b17`) | Endurecimento amplo de segurança das APIs (RBAC/rate limit/auditoria em `settings` e `upload-image`; anti-SSRF + rate limit em `fetch-*`; `getClientIP` em `rate-limit`; `id` obrigatório em `DELETE dicas`; limites em `posts`, `placeholder-image`, `checkout`, `customer/orders`, `customer/auth`) | 13 arquivos de API/lib + 11 suítes de teste + `scripts/bench/` + docs | **Parcialmente efetivo:** validado nos testes adicionados (`22/11`), mas deixou brechas pontuais (`upload-image.js:69` fail-open, `posts.js:40` quebra em array, `webhooks/mercadopago` e `GET admin/orders` fora da varredura, `placeholder-image.js` com `HEAD` lendo corpo inteiro). |
| `22/11` (`0091855`) | Integrar `rate_limit:whitelist` ao pipeline Redis em `checkRateLimit` + ampliar testes de `settings.js` | `lib/cache/cache.js`, `tests/unit/lib/cache.test.js`, `tests/integration/api/settings.test.js` | **Validado no `checkRateLimit`**, mas gerou efeito colateral de UI/admin em `pages/api/admin/rate-limit.js` (IP whitelisted continua incrementando contador e aparece como bloqueado — `API-P07`). |
| `23/11` *(working tree, não commitado)* | Paridade de `link` obrigatório em `POST`/`PUT /api/products` com `AdminProducts.js` e `ADR-0037` | `pages/api/products.js`, `tests/integration/api/products.test.js` | **Validado ao vivo nesta auditoria (`39/39` em `products.test.js`, `14/14` no canário `bench-ground-truth.test.js`); aguarda commit.** |

### 3.8. Melhorias (Implementadas × Pendentes)
- **Implementadas na janela:** verificação local JWKS `RS256` (`ADR-0042`), performance `ETag` fraco + `304` + `res.end(buffer)` em `/api/uploads/[...path].js`, isolamento `tests/setup-env.js`, guarda de inatividade/401 (`ADR-0043`), endurecimento de 13 rotas (`28b6b17`), whitelist em pipeline Redis (`0091855`) e paridade de `link` em `products.js` (working tree `23/11`).
- **Pendentes:** consolidadas nas 8 ações do Plano de Ação (`API-AC-01` a `API-AC-08`).

---

## 4. Validação do Fluxo Identificado (Matriz das 7 Categorias)

Confrontando os registros de `16/11` a `23/11/2026` contra o código-fonte atual e as regras de `AGENTS.md`, `ARQUITETURA_SITE_PRIVADO.md` e `ARQUITETURA_SITE_PUBLICO.md`:

### 4.1. Problema identificado e ainda existente
1. `parseCookie` vulnerável a `URIError` (HTTP `500`) em `lib/auth/auth.js:16` e `lib/auth/customer-auth.js:12` + chamadas de auth fora de `try/catch` (`withAuth`, `logout`, `refresh`, `status`, `settings?key=`, `customer/orders`, `admin/orders`, `admin/internal-products`).
2. `POST /api/auth/refresh` devolvendo `token` e `refresh_token` no JSON (`pages/api/auth/refresh.js:58-69`) + rotação não atômica e ausência de guarda `if (!user)` em `lib/auth/auth.js:121-163`.
3. `POST /api/auth/login` com `req.body` fora de `try/catch`, backstop por usuário case-sensitive/pós-`bcrypt` e cobertura de `68,45%` L (`pages/api/auth/login.js:39,82`).
4. `POST /api/webhooks/mercadopago` sem rate limit, sem janela temporal `ts` na HMAC, descartando detalhes autoritativos da API em produção e gravando `event_key` quando `!current`.
5. `createAdminHandler` ignorando `rateLimit` em `GET` (`lib/api/adminCrudHandler.js:193`), deixando `ip-diagnostico.js`, `audit.js` e `stats.js` sem limite efetivo.
6. `pages/api/admin/rate-limit.js` com `new Redis(...)` sem `automaticDeserialization: false` (`SyntaxError` em `parseAndFilterLogs` no Upstash real), `MAX_ATTEMPTS = 5` para todas as rotas, `redis.del('rate_limit:' + ip)` incompatível, CSV sem sanitização e sem `logActivity`.
7. Auditoria com `"undefined"` em `pages/api/admin/musicas.js:136` e `pages/api/admin/users.js:173` (violação direta de `ARQUITETURA_SITE_PRIVADO.md` §9).
8. `pages/api/admin/cache.js:11` ignorando falha `{ success: false }` de `clearAllCache`.
9. Proteção do `admin` contornável por renomeação em `users.js` e `roles.js`, `id` opcional em `.partial()` e `updateData` cru em `roles.js:101` / `videos.js:52,89`.
10. `pages/api/uploads/[...path].js` sem `fs.realpath` e sem whitelist de extensões (divergindo de `ARQUITETURA_SITE_PUBLICO.md` §1) + acesso direto `/api/uploads/*.svg` sem `CSP: default-src 'none'; sandbox`.
11. `pages/api/admin/integrity.js` expondo `error.message` cru, instanciando `new Redis` por chamada, fazendo I/O síncrono recursivo e lendo `mtime` de backups.
12. `pages/api/cleanup-test-data.js` exposto sem gate de ambiente, `createAdminHandler`, `rateLimit`, `invalidateCache` nem `logActivity`.
13. Crashes `TypeError` em `req.body` nulo/ausente em 8 rotas admin e query params sem validação/teto (`audit.js`, `users.js`, `categories.js`, `dicas.js`, `products.js`).
14. `next.config.js` com regra CORS órfã `/api/helper/:path*` e `ALLOWED_ORIGINS` sem split em `/api/:path*` com `Credentials: true`; `DISABLE_RATE_LIMIT=true` sem trava de `NODE_ENV !== 'production'`; `GET /api/customer/auth` sem rate limit/`no-store` e corrida `23505` em `upsertGoogleCustomer`.

### 4.2. Problema identificado e corrigido
1. Bloqueio de event loop por `res.send(buffer)` em `pages/api/uploads/[...path].js` (`6e94332`, `18/11/2026`).
2. Dependência síncrona de `/tokeninfo` e erro `401` em indisponibilidade Google (`fad08f6` / `ADR-0042`, `19/11/2026`).
3. Atalho dev Google sem opt-in, pré-sequestro por `password_hash` mantido e conflito `google_id` (`f161227`, `19/11/2026`).
4. Contaminação de `.env` no Jest e erro de teardown do Upstash Redis (`7d68032`, `19/11/2026`).
5. Erro `401` cru após 1h de inatividade no `/admin` (`e934811` / `ADR-0043`, `21/11/2026`).
6. Descarte do retorno de `checkRateLimit` em `GET /api/settings`, falta de RBAC/auditoria em `PUT /api/settings` e falta de `id` obrigatório em `DELETE /api/admin/dicas` (`28b6b17`, `22/11/2026`).
7. Paridade de `link` obrigatório em `pages/api/products.js` (`23/11/2026`, validado no working tree — aguarda apenas commit).

### 4.3. Problema parcialmente corrigido
1. **Isolamento Modalidade A × B (`00758a7`, `21/11`):** `GET` de `AdminProducts` foi filtrado com `?modality=external`, mas `PUT`/`DELETE`/`reorder` em `pages/api/products.js` e `pages/api/admin/internal-products.js` seguem sem filtro server-side de `modality`.
2. **Endurecimento de APIs (`28b6b17`, `22/11`):** endureceu 13 rotas, mas deixou `upload-image.js:69,166` fail-open (`if (req.user?.role)`), `posts.js:40` vulnerável a `?search` array, `placeholder-image.js` lendo arquivo inteiro no `HEAD`, `fetch-ml.js` seguindo redirects sem revalidação, e não cobriu `webhooks/mercadopago`, `GET /api/admin/orders`, `GET /api/customer/auth` nem `cleanup-test-data.js`.
3. **Whitelist de rate limit (`0091855`, `22/11`):** `checkRateLimit` passou a consultar `rate_limit:whitelist` no pipeline Redis, mas continua incrementando o contador do IP whitelisted e `pages/api/admin/rate-limit.js` ainda o exibe como bloqueado.
4. **Performance de imagens binárias (`6e94332`, `18/11`):** corrigiu `pages/api/uploads/[...path].js`, mas esqueceu a rota irmã `pages/api/placeholder-image.js:106` (`res.send(imageBuffer)`).

### 4.4. Problema recorrente
1. **Correções parciais sem varredura sistemática de rotas irmãs:** observado repetidamente na semana (`uploads` × `placeholder-image`; `backups` × `integrity`; `lib/infra/redis.js` `automaticDeserialization: false` × `rate-limit.js`; `GET AdminProducts` × `PUT/DELETE/reorder`; `28b6b17` × `webhooks/mercadopago` e `GET admin/orders`).
2. **Duplicação de infraestrutura fora de `createAdminHandler` e `lib/infra/redis.js`:** `admin/orders.js` e `admin/internal-products.js` replicam auth/RBAC/try-catch; `rate-limit.js` e `integrity.js` instanciam `new Redis(...)` por conta própria; `auth.js` e `customer-auth.js` duplicam `parseCookie`/`serializeCookie`.

### 4.5. Melhoria já implementada
1. Verificação local de ID tokens Google via JWKS `RS256` sem novas dependências (`ADR-0042`, `fad08f6`).
2. Controle de inatividade de 1h + guarda unificada `401` no `/admin` (`ADR-0043`, `e934811`).
3. Métricas de Gestão de Vendas e Produtos Internos em `GET /api/admin/stats` (`25081d9`) — com oportunidade posterior de consolidar as 33 queries (`API-AC-06`).
4. Homologação Sandbox completa do Mercado Pago + scripts de túnel/verificação HMAC (`dbcbbc0`, `6b69224`, `554c056`–`feb768a`).

### 4.6. Melhoria identificada, mas ainda não implementada
1. Consolidação das 33 queries de `GET /api/admin/stats` em 7 queries com `COUNT(*) FILTER (WHERE ...)`.
2. Migração de `pages/api/admin/orders.js` e `pages/api/admin/internal-products.js` para `createAdminHandler`.
3. Thresholds de cobertura em `jest.config.js` para `pages/api/auth/`, `pages/api/customer/`, `pages/api/webhooks/`, `lib/auth/` e `lib/payment/`, mais inclusão de `proxy.js` em `collectCoverageFrom`.
4. Suítes `*.db.test.js` contra PostgreSQL real para os 4 domínios SQL ainda sem cobertura (`categories.js`, `audit.js`, `dicas.js`, `images.js`).
5. Padronização do header `Allow` em respostas `405` e saneamento do CORS em `next.config.js`.
6. Validação de variáveis críticas de produção em `scripts/check-env.js` (alerta para `DISABLE_RATE_LIMIT=true` em produção e consistência `MP_*`).

### 4.7. Situação que necessita de investigação adicional
1. **Decisão de contrato em `POST /api/auth/refresh` (`API-AC-01`):** confirmar com o dono se `data.token` e `data.refresh_token` devem sair integralmente do body padrão (mantendo cookies `HttpOnly`, igual ao `ADR-0011` no login) ou ficar condicionados a `?response=body`, dado que nenhum consumidor de produção lê esses campos no JSON (apenas o teste `refresh.test.js:92`).
2. **Divergência documental em `pages/api/uploads/[...path].js` (`API-AC-03`):** `ARQUITETURA_SITE_PUBLICO.md` §1 já afirma `fs.realpath` e whitelist de extensões; confirmar com o dono a lista exata de extensões permitidas (ex.: somente imagens `CONTENT_TYPES` sem `.svg` ou mantendo `.svg` com CSP sandbox também em `/api/uploads/:path*`).
3. **Destino de `pages/api/cleanup-test-data.js` (`API-AC-03`):** nenhum consumidor em `load-tests/`, `scripts/` ou `pages/` chama esta rota hoje (apenas testes de integração e âncora do canário `bench-ground-truth`); confirmar com o dono se ela deve ser bloqueada em produção (`NODE_ENV === 'production' → 404`), migrada para `createAdminHandler` com auditoria ou removida.
4. **Execução remota do GitHub Actions pós-`19/11` e `22/11` (`API-AC-08`):** confirmar status real de `test-db-coverage.yml` (inclusive `customers.db.test.js` após `f161227`), `test-coverage.yml` e `e2e.yml` assim que houver acesso à API do GitHub.
5. **Avisos pendentes em `_lint/report.md` do `ai-memory`:** investigar os 20 avisos sinalizados no `SessionStart` em sessão com permissão ao MCP `ai-memory`.

---

## 5. Plano de Ação Detalhado (Revisado e Ordenado por Prioridade e Dependência)

> **Ordem técnica recomendada:** `API-AC-01` → `API-AC-02` → `API-AC-03` → `API-AC-04` → `API-AC-05` → `API-AC-06` → `API-AC-07` → `API-AC-08`.

---

### `API-AC-01` — Blindagem de Autenticação, Cookies (`URIError`), Renovação de Sessão (`/api/auth/refresh`) e Força Bruta em `/api/auth/login`

- **Identificação:** `API-AC-01`
- **Objetivo:** Eliminar crashes `URIError` por cookies malformados em toda a superfície autenticada, impedir vazamento de `refresh_token` no body de `/api/auth/refresh`, tornar a rotação de refresh token atômica e fechar brechas de validação/rate limit/cobertura em `/api/auth/login`.
- **Problema ou necessidade:** `API-P01`, `API-P02` e `API-P03` (convergente com `OCOR-2026-11-23-05` em `retorno_da_semana.md` e `MG-11` em `melhoria_google.md`).
- **Evidências:**
  - `/home/gus/projetos/Caminhar/lib/auth/auth.js:9-19,121-163,184-199,329-346` (`decodeURIComponent` sem `try/catch`; `validateRefreshToken` + `revokeRefreshToken` sem atomicidade; `user.role` sem checar `if (!user)`; `jwt.verify` sem `algorithms: ['HS256']`; `withAuth` sem `try/catch`).
  - `/home/gus/projetos/Caminhar/lib/auth/customer-auth.js:5-15,66-78` (`decodeURIComponent` sem `try/catch`; `jwt.verify` sem `algorithms: ['HS256']`).
  - `/home/gus/projetos/Caminhar/pages/api/auth/refresh.js:38,58-69` (`getRefreshTokenCookie` fora do `try/catch`; retorno de `token` e `refresh_token` no JSON sem consumidor em `pages/admin.js:238` nem `hooks/AuthProvider.js:54`).
  - `/home/gus/projetos/Caminhar/pages/api/auth/login.js:39,50-59,82-88` (`const { username, password } = req.body;` fora do `try/catch`; `checkRateLimit(username, ...)` sem `.trim().toLowerCase()` e pós-`bcrypt`; cobertura de `68,45%` L / `72,72%` B em `logs/coverage-output.log`).
  - `/home/gus/projetos/Caminhar/pages/api/auth/logout.js:12`, `pages/api/status.js:34`, `pages/api/customer/orders.js:13`, `pages/api/settings.js:45` (leitura de cookie fora de `try/catch`).
- **Diagnóstico:** A leitura de cookies sem `try/catch` em `decodeURIComponent` torna qualquer endpoint autenticado vulnerável a HTTP `500` diante de cookies terceiros malformados; `POST /api/auth/refresh` manteve a exposição de `refresh_token` no JSON que o `ADR-0011` removeu do login; a rotação em dois passos no banco permite corrida entre abas; e o backstop por usuário do login é contornável por variação de maiúsculas/minúsculas ou payload não-string.
- **Escopo:** Hardening de parsing de cookies, fixação de `HS256`, rotação atômica e guarda `if (!user)` em `refreshAccessToken`, remoção/condicionamento de tokens no body de `refresh.js` (mediante confirmação do dono), envio de `Cache-Control: no-store` nas rotas de sessão, proteção de `req.body` + normalização case-insensitive/pré-`bcrypt` no backstop de `login.js` e ampliação dos testes de integração/unitários.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/lib/auth/auth.js`
  - `/home/gus/projetos/Caminhar/lib/auth/customer-auth.js`
  - `/home/gus/projetos/Caminhar/pages/api/auth/login.js`
  - `/home/gus/projetos/Caminhar/pages/api/auth/refresh.js`
  - `/home/gus/projetos/Caminhar/pages/api/auth/logout.js`
  - `/home/gus/projetos/Caminhar/pages/api/auth/check.js`
  - `/home/gus/projetos/Caminhar/pages/api/customer/orders.js`
  - `/home/gus/projetos/Caminhar/tests/integration/api/auth/login.test.js`
  - `/home/gus/projetos/Caminhar/tests/integration/api/login.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/pages/api/auth/login.edge.test.js`
  - `/home/gus/projetos/Caminhar/tests/integration/api/auth/refresh.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/auth.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/auth/customer-auth.test.js`
  - `/home/gus/projetos/Caminhar/scripts/bench/papeis/gabarito-explorer.md` e `/home/gus/projetos/Caminhar/scripts/bench/orchestrator/gabarito.md` *(se linhas-âncora de `auth.js`/`check.js` deslocarem)*
- **Alterações propostas:**
  1. Em `parseCookie` (`lib/auth/auth.js` e `lib/auth/customer-auth.js`), envolver `decodeURIComponent` por par em `try/catch` (descartando ou preservando valor bruto sem lançar `URIError`, garantindo que um cookie terceiro malformado não invalide `token`/`customerToken`) e mover `getAuthenticatedCustomer(req)` em `pages/api/customer/orders.js` para dentro do `try/catch`.
  2. Em `verifyToken` e `verifyCustomerToken`, passar `{ algorithms: ['HS256'] }` em `jwt.verify`.
  3. Em `refreshAccessToken` (`lib/auth/auth.js`), realizar a revogação atomicamente com `UPDATE refresh_tokens SET revoked = true WHERE token = $1 AND revoked = false AND expires_at > NOW() RETURNING user_id`, verificar `if (!user)` **antes** de inserir o novo refresh token (ou executar dentro de `transaction()`), retornando `INVALID_REFRESH_TOKEN` se o usuário não existir mais.
  4. Em `pages/api/auth/refresh.js`, após decisão do dono: remover `refresh_token` e `token` do corpo JSON padrão (retornando apenas `{ success: true, data: { expires_in: 3600, user: result.user }, message }`, mantendo os cookies `HttpOnly` — opcionalmente aceitando `?response=body` apenas para `token` se algum cliente externo futuro exigir) e definir `Cache-Control: no-store, private` (também em `/api/auth/check` e `/api/auth/logout`).
  5. Em `pages/api/auth/login.js`, validar `const body = req.body && typeof req.body === 'object' ? req.body : {};` e `typeof username === 'string'` / `typeof password === 'string'` retornando `400`; normalizar `const normalizedUser = username.trim().toLowerCase()` no `LOGIN_USER_LIMIT` (e verificar bloqueio antes ou de forma consistente, sem fail-open para não-string); cobrir em testes `LOGIN_RATE_LIMIT`, `LOGIN_USER_LIMIT`, `untrustedForwarded`, `MISSING_FIELDS`, `?response=body` e corrigir o teste placebo de `tests/integration/api/login.test.js:104-125`.
- **Impactos e dependências:**
  - `tests/integration/api/auth/refresh.test.js:92` asserta `data.token` na resposta de `/api/auth/refresh` e deverá ser alinhado ao novo contrato.
  - `pages/admin.js:238-259` lê apenas `data?.data?.user || data?.user` e `hooks/AuthProvider.js:54-58` lê apenas `res.ok` — ambos permanecem 100% compatíveis.
  - `lib/auth/auth.js` e `pages/api/auth/check.js` possuem âncoras no canário `tests/unit/scripts/bench-ground-truth.test.js`.
- **Riscos:** Quebra de contrato caso algum script externo não versionado dependa de `data.token` em `/api/auth/refresh`; risco mitigado registrando a mudança em `CHANGELOG.md`/adendo ao `ADR-0011` e validando com o dono.
- **Cuidados:** Preservar `POST ?response=body` no `/api/auth/login` (usado por `load-tests/helpers/auth.js`, `ADR-0011`), o isolamento `scope === 'customer'` em `verifyToken`, o fluxo de renovação silenciosa do `ADR-0043` e o comportamento `200 { permissionsLoaded: false }` em `/api/auth/check`.
- **Validação:**
  - `npx jest tests/integration/api/auth tests/integration/api/login.test.js tests/unit/pages/api/auth tests/unit/lib/auth tests/unit/pages/admin.test.js tests/unit/scripts/bench-ground-truth.test.js`
  - Confirmar cobertura de `pages/api/auth/login.js` `≥ 95%` linhas e `≥ 90%` branches; testar cookie `Cookie: broken=%E0%A4%A; token=<valido>` retornando `200` (nunca `500`); testar rotação concorrente de refresh retornando `200` em apenas 1 chamada e `401` na concorrente; testar `Admin`/`ADMIN` compartilhando o mesmo bucket de `LOGIN_USER_LIMIT`.
- **Prioridade:** **Crítica**
- **Status:** **Pendente**

---

### `API-AC-02` — Proteção Completa de `POST /api/webhooks/mercadopago` (Rate Limit, Anti-Replay `ts`, Metadados Autoritativos e Corrida `!current`)

- **Identificação:** `API-AC-02`
- **Objetivo:** Blindar a rota pública de webhook financeiro contra abuso/amplificação outbound, ataques de replay com assinatura capturada, perda de metadados autoritativos em produção e descarte definitivo de eventos em condição de corrida.
- **Problema ou necessidade:** `API-P04` (convergente e coordenado com `MP-DIAG-01`, `MP-DIAG-04` e `MP-DIAG-05` de `docs/melhoria_mercadopago.md`).
- **Evidências:**
  - `/home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js:10-118`: nenhuma chamada a `checkRateLimit`/`getClientIP`; em produção chama `fetchMercadoPagoPaymentStatus` (L74-75) e grava `bodyStatusDetail`/`resolvedOrderStatus`/`resolvedTxId` vindos de `req.body` (L58-66, L100-102); executa `invalidateCache('products:*')` incondicionalmente (L107).
  - `/home/gus/projetos/Caminhar/lib/payment/mercadopago.js:422-441`: `verifyMercadoPagoWebhookSignature` extrai `parts.ts`, mas não valida expiração temporal contra `Date.now()`.
  - `/home/gus/projetos/Caminhar/lib/domain/orders.js:535-584`: `INSERT INTO payment_webhook_events` ocorre antes do lookup do pedido; quando `!current`, a transação comita o `event_key` e retorna `{ duplicate: false, order: null }` → handler devolve HTTP `200`, impedindo reenvio do Mercado Pago se o webhook chegou antes de `attachOrderPaymentInfo`.
- **Diagnóstico:** A rota pública de webhook é o único endpoint financeiro/crítico sem rate limit, aceita assinaturas válidas indefinidamente no tempo (com `body.id` fora do manifesto HMAC) e pode perder uma confirmação real de pagamento em caso de corrida entre criação da ordem e entrega do webhook.
- **Escopo:** Rate limiting por IP em `POST /api/webhooks/mercadopago`, janela de tolerância temporal em `ts` na verificação HMAC v2, consulta via `fetchMercadoPagoPaymentDetails` em produção usando apenas metadados autoritativos da API oficial, retorno não-`200` (ou rollback sem gravar `event_key`) quando `!current` para pedido ainda não vinculado, e invalidação condicional de `products:*` apenas quando houver mudança de estoque.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js`
  - `/home/gus/projetos/Caminhar/lib/payment/mercadopago.js`
  - `/home/gus/projetos/Caminhar/lib/domain/orders.js`
  - `/home/gus/projetos/Caminhar/tests/integration/api/webhooks/mercadopago.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/payment/mercadopago.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/domain/orders.test.js`
  - `/home/gus/projetos/Caminhar/tests/integration/domain/orders.db.test.js`
- **Alterações propostas:**
  1. Aplicar `checkRateLimit(getClientIP(req), 'api:webhooks:mercadopago', 120, 60000)` no início de `POST /api/webhooks/mercadopago` (com teto confortável para picos legítimos do Mercado Pago, respondendo `429`).
  2. Em `verifyMercadoPagoWebhookSignature`, validar que `ts` é numérico válido e está dentro da janela configurável (ex.: `±300 s`, considerando formato em segundos ou milissegundos conforme especificação do MP e preservando compatibilidade com `scripts/maintenance/verify-mp-webhook.js`).
  3. Em produção (`isProduction`), consultar `fetchMercadoPagoPaymentDetails` e persistir `status_detail`, `mp_order_status`, `mp_transaction_id` e `externalReference` vindos **exclusivamente** da resposta oficial da API do Mercado Pago (nunca de `req.body`).
  4. Em `processMercadoPagoWebhookEvent`, quando `!current` após busca por `mp_payment_id` e `externalReference`, fazer rollback / não gravar `payment_webhook_events` e sinalizar ao handler para responder `404`/`409`/`503` (ou política de retry definida com o dono) para que o Mercado Pago reenvie após `attachOrderPaymentInfo` concluir.
  5. Invalidar `products:*` apenas quando a transição alterar `stock_restored`.
- **Impactos e dependências:** Requer coerência com `scripts/maintenance/verify-mp-webhook.js` (timestamps atuais) e `tests/integration/domain/orders.db.test.js` (SQL real — `ADR-0039`). Coordenar implementação com `MP-DIAG-01/04/05` de `docs/melhoria_mercadopago.md`.
- **Riscos:** Janela `ts` excessivamente curta pode rejeitar retries legítimos atrasados do Mercado Pago caso ele reenvie o mesmo `ts` (confirmar se o MP gera novo `ts` a cada tentativa — padrão oficial gera novo `ts`, usar margem de 5–10 min e logar rejeições por clock skew); retornar `5xx` em `!current` para pedidos inexistentes de testes antigos pode gerar retries temporários até expirar a fila do MP.
- **Cuidados:** Preservar regra de proteção §8 do Site Público (`ADR-0038`: nunca assumir `approved` por fallback em produção), normalização lowercase de `data.id`, `crypto.timingSafeEqual`, suporte dual a `order` e `payment`, e `200 { ignored: true }` para `merchant_order`.
- **Validação:**
  - `npx jest tests/integration/api/webhooks/mercadopago.test.js tests/unit/lib/payment/mercadopago.test.js tests/unit/lib/domain/orders.test.js tests/unit/scripts/verify-mp-webhook.test.js`
  - `npm run test:db:container` (ou job `test-db-coverage.yml` no CI) para `orders.db.test.js`.
  - Testar explicitamente: `429` no burst de webhook, `401` com `ts` expirado, uso de metadados da API oficial em `NODE_ENV=production` ignorando `req.body`, e não-gravação de `event_key` quando `!current`.
- **Prioridade:** **Crítica**
- **Status:** **Pendente**

---

### `API-AC-03` — Fechamento de Brechas RBAC, Isolamento Modalidade A×B, Proteção do `admin`, Integridade de Uploads e `cleanup-test-data.js`

- **Identificação:** `API-AC-03`
- **Objetivo:** Eliminar todas as brechas de autorização horizontal/vertical entre modalidades, impedir contorno da proteção do usuário/cargo `admin`, corrigir fail-open em `upload-image.js`, alinhar `/api/uploads/[...path].js` à segurança documentada (`fs.realpath` + whitelist + CSP em `/api/uploads/:path*`) e encerrar exposição insegura de `cleanup-test-data.js`.
- **Problema ou necessidade:** `API-P05`, `API-P10`, `API-P11`, `API-P12` e parte de `API-P16`.
- **Evidências:**
  - `/home/gus/projetos/Caminhar/pages/api/products.js:264-266,298,334`, `/home/gus/projetos/Caminhar/pages/api/admin/internal-products.js:165-167,196-199,224` e `/home/gus/projetos/Caminhar/lib/domain/products.js:258,268`: `PUT`/`DELETE`/`reorder` filtram apenas por `id` sem `modality`; `internal-products.js:198` ainda sobrescreve `modality: 'internal'`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/users.js:110,121-162`: `userUpdateSchema.partial()` deixa `id` opcional; trava do administrador (L152-162) não bloqueia alteração de `username` do usuário protegido `admin`; checagem de duplicidade em `POST` (L110) é case-sensitive.
  - `/home/gus/projetos/Caminhar/pages/api/admin/roles.js:89-105`: `roleUpdateSchema.partial()` deixa `id` opcional, passa `updateData` cru (L101) em vez de `validation.data` e não impede renomear o cargo `admin`.
  - `/home/gus/projetos/Caminhar/pages/api/upload-image.js:69,137,166`: `if (req.user?.role)` pula RBAC se `role` ausente (fail-open); não valida `metadata.format` (`sharp` lê SVG mesmo com `Content-Type: image/png`).
  - `/home/gus/projetos/Caminhar/pages/api/settings.js:56,82`: bypass hardcoded para `decoded.role === 'editor'`; `DEFAULT_VALUES[key]` sem `Object.hasOwn`.
  - `/home/gus/projetos/Caminhar/pages/api/uploads/[...path].js:45-73,147-148` vs `/home/gus/projetos/Caminhar/docs/ARQUITETURA_SITE_PUBLICO.md:18` e `/home/gus/projetos/Caminhar/next.config.js:176-180`: ausência de `fs.realpath` e de whitelist de extensões; acesso direto `/api/uploads/<arquivo>.svg` não recebe `Content-Security-Policy: default-src 'none'; sandbox`.
  - `/home/gus/projetos/Caminhar/pages/api/cleanup-test-data.js:5-26`: sem gate de ambiente, sem `createAdminHandler`, sem `rateLimit`, sem `invalidateCache('posts:*')`, sem `logActivity` e com checagem por `username` hardcoded.
- **Diagnóstico:** Apesar do endurecimento de `28b6b17`, permanecem furos estruturais de isolamento RBAC, brechas de integridade no usuário/cargo `admin` e divergência entre a proteção prometida na arquitetura de uploads e o código efetivo.
- **Escopo:** Filtro obrigatório de `modality` em todas as mutações de produtos (A e B), bloqueio de renomeação do usuário/cargo `admin` + `id` obrigatório + uso estrito de `validation.data`, RBAC incondicional + validação de `metadata.format` em `upload-image.js`, remoção do bypass hardcoded de `editor` + `Object.hasOwn` em `settings.js`, `fs.realpath` + whitelist + CSP em `/api/uploads/:path*`, e decisão/hardening de `cleanup-test-data.js`.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/lib/domain/products.js`
  - `/home/gus/projetos/Caminhar/pages/api/products.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/internal-products.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/users.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/roles.js`
  - `/home/gus/projetos/Caminhar/pages/api/upload-image.js`
  - `/home/gus/projetos/Caminhar/pages/api/settings.js`
  - `/home/gus/projetos/Caminhar/pages/api/uploads/[...path].js`
  - `/home/gus/projetos/Caminhar/next.config.js`
  - `/home/gus/projetos/Caminhar/pages/api/cleanup-test-data.js`
  - Suítes de teste correspondentes em `/home/gus/projetos/Caminhar/tests/integration/api/` e `/home/gus/projetos/Caminhar/tests/integration/domain/products.db.test.js`
  - `/home/gus/projetos/Caminhar/scripts/bench/` *(recalibrar âncoras vigiadas de `products.js`, `settings.js`, `upload-image.js`, `uploads/[...path].js`, `cleanup-test-data.js`, `users.js`, `next.config.js`)*
- **Alterações propostas:**
  1. Em `lib/domain/products.js`, adicionar parâmetro opcional `{ modality }` em `updateProduct(id, data, options)` e `deleteProduct(id, options)` (filtrando `WHERE id = $1 AND modality = $2`); em `pages/api/products.js`, fixar `modality: 'external'` no `POST`, `PUT`, `DELETE` e `reorder`; em `pages/api/admin/internal-products.js`, fixar `modality: 'internal'` no `PUT`, `DELETE` e `reorder` (sem converter produtos externos).
  2. Em `pages/api/admin/users.js`: exigir `id` obrigatório no `PUT` (não chamar `.partial()` sobre `id`), impedir renomeação do `username` do administrador protegido (`getProtectedAdminUsername()`), usar `LOWER(username) = LOWER($1)` na checagem de duplicidade no `POST` e retornar `404` se `updatedUsers.length === 0`.
  3. Em `pages/api/admin/roles.js`: exigir `id` obrigatório no `PUT`, passar exclusivamente `validation.data` (sem `id`) para `updateRecords`, impedir renomeação do cargo `'admin'` e validar `deleteId` positivo no `DELETE`.
  4. Em `pages/api/upload-image.js`: remover `if (req.user?.role)` / `&& req.user?.role` tornando `checkRolePermission` incondicional (fail-closed); validar `['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)` e derivar `safeExt` do formato real detectado pelo `sharp`.
  5. Em `pages/api/settings.js`: em `GET ?key=`, validar `typeof key === 'string'`, usar `Object.hasOwn(DEFAULT_VALUES, key)` e avaliar com o dono a remoção do bypass hardcoded `decoded.role === 'editor'` em favor de `checkRolePermission(decoded.role, 'Configuração de Cabeçalho')`.
  6. Em `pages/api/uploads/[...path].js` e `next.config.js`: confirmar decisão com o dono sobre a divergência do doc público §1 e implementar `fs.promises.realpath` (rejeitando symlinks fora da raiz), whitelist explícita de extensões (rejeitando extensões fora de `CONTENT_TYPES` com `403`/`404`) e incluir `source: '/api/uploads/:path*'` (ou header direto no handler) com `Content-Security-Policy: default-src 'none'; sandbox`.
  7. Em `pages/api/cleanup-test-data.js`: confirmar com o dono entre (a) bloquear em `NODE_ENV === 'production'` (`404`) + migrar para `createAdminHandler` com `requireAdmin: true`, `rateLimit`, `invalidateCache('posts:*')` e `logActivity`, ou (b) remover a rota e recalibrar `scripts/bench/`.
- **Impactos e dependências:** Impacta diretamente o canário `tests/unit/scripts/bench-ground-truth.test.js` (vários arquivos alterados possuem âncoras exatas); exige `npm run test:db:container` para `products.db.test.js` por alterar filtros SQL em `lib/domain/products.js`.
- **Riscos:** Bloquear extensões em `/api/uploads/[...path].js` sem inventariar arquivos existentes no volume de produção poderia gerar `404` em assets legítimos; checar extensões presentes antes do corte. Alterar `cleanup-test-data.js` impacta `gabarito-explorer.md` (`withAuth` direto).
- **Cuidados:** Preservar `ADR-0010` (`admin` como cargo comum com bypass de permissão), paridade de `link` obrigatório em `/api/products`, `res.end(buffer)` + `ETag` fraco em `/api/uploads/[...path].js` e regras de proteção §8/§9.
- **Validação:**
  - `npx jest tests/integration/api/products.test.js tests/integration/api/admin/internal-products.test.js tests/integration/api/admin/users*.test.js tests/integration/api/admin/roles.test.js tests/integration/api/upload-image*.test.js tests/integration/api/settings.test.js tests/integration/api/uploads.test.js tests/integration/api/cleanup-test-data.test.js tests/unit/scripts/bench-ground-truth.test.js`
  - `npm run test:db:container` (`products.db.test.js`).
  - Testar: operador de `Gestão de Produtos` tentando editar/excluir produto interno → `404`; operador de `Gestão de Vendas` tentando editar/excluir produto externo → `404`; renomear usuário/cargo `admin` → `400`; upload de SVG com `Content-Type: image/png` → `400`; symlink fora de `uploads/` → `404`; `GET /api/uploads/foo.svg` com `CSP: default-src 'none'; sandbox`.
- **Prioridade:** **Alta**
- **Status:** **Pendente**

---

### `API-AC-04` — Correção Estrutural do Rate Limit em `GET` no `createAdminHandler`, Alinhamento de `rate-limit.js` e Proteção de `DISABLE_RATE_LIMIT`

- **Identificação:** `API-AC-04`
- **Objetivo:** Fazer o `rateLimit` do `createAdminHandler` funcionar também em rotas `GET` quando configurado, eliminar o bug `automaticDeserialization` e os falsos positivos/efeitos colaterais de `pages/api/admin/rate-limit.js`, e impedir desativação acidental do rate limit em produção.
- **Problema ou necessidade:** `API-P06`, `API-P07` e parte de `API-P18`.
- **Evidências:**
  - `/home/gus/projetos/Caminhar/lib/api/adminCrudHandler.js:193`: `if (rateLimit && ['POST', 'PUT', 'DELETE'].includes(method))` ignora `GET`, tornando mortos os configs em `pages/api/ip-diagnostico.js:191`, `pages/api/admin/audit.js:64` e `pages/api/admin/stats.js:97`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/rate-limit.js:13-18,20,77,161-165,223-236,264,295`: cria `new Redis(...)` sem `automaticDeserialization: false` (`JSON.parse` na L77 quebra no Upstash real zerando auditoria); aplica `MAX_ATTEMPTS = 5` fixo sobre todas as chaves `rate_limit:*`; não filtra `rate_limit:whitelist` (que continua sendo incrementada pelo pipeline adicionado em `0091855`, `lib/cache/cache.js:415-423`); `redis.del('rate_limit:' + ip)` (L264) não remove `rate_limit:<endpoint>:<ip>`; `export_csv` sem sanitização de fórmula/aspas; `POST`/`DELETE` sem `req.adminUtils.logActivity`.
  - `/home/gus/projetos/Caminhar/lib/cache/cache.js:341,364`: `DISABLE_RATE_LIMIT === 'true'` ativo sem checar `NODE_ENV !== 'production'`; `range.test(ip)` usa `ip` em vez de `normalizedIp`.
- **Diagnóstico:** A evolução recente do rate limit (`28b6b17` e `0091855` em `22/11/2026`) criou desalinhamento entre `lib/cache/cache.js`, `lib/api/adminCrudHandler.js` e `pages/api/admin/rate-limit.js`, deixando rotas `GET` admin desprotegidas e comprometendo o painel de Rate Limiting em produção com Upstash Redis.
- **Escopo:** Suporte a métodos configuráveis no `rateLimit` de `createAdminHandler`, unificação da instância Redis em `rate-limit.js` via `getRedisInstance()`, filtragem de whitelist e limites corretos por endpoint + desbloqueio por prefixo/chave real, sanitização CSV + `logActivity` global em `rate-limit.js`, e trava `NODE_ENV !== 'production'` em `DISABLE_RATE_LIMIT`.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/lib/api/adminCrudHandler.js`
  - `/home/gus/projetos/Caminhar/lib/cache/cache.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/rate-limit.js`
  - `/home/gus/projetos/Caminhar/scripts/check-env.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/cache.test.js`
  - `/home/gus/projetos/Caminhar/tests/integration/api/admin/rate-limit.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/pages/api/admin/rate-limit.test.js`
  - `/home/gus/projetos/Caminhar/tests/unit/lib/api/adminCrudHandler.test.js` *(ou suíte equivalente existente)*
  - `/home/gus/projetos/Caminhar/scripts/bench/papeis/gabarito-oracle.md` *(recalibrar âncora de `adminCrudHandler.js` se linhas mudarem)*
- **Alterações propostas:**
  1. Em `lib/api/adminCrudHandler.js`, suportar `rateLimit.methods` (default preservando `['POST', 'PUT', 'DELETE']` para rotas CRUD mistas, e aplicando automaticamente a `allowedMethods` quando `allowedMethods` contiver apenas `GET` ou quando `rateLimit.methods` incluir `'GET'`), ativando imediatamente os limites já declarados em `ip-diagnostico.js`, `audit.js` e `stats.js`.
  2. Em `pages/api/admin/rate-limit.js`: substituir o `new Redis(...)` local por `getRedisInstance()` de `lib/infra/redis.js` (herdando `automaticDeserialization: false`), tornar `parseAndFilterLogs` tolerante a item string ou objeto, consultar `rate_limit:whitelist` para não listar IPs whitelisted como bloqueados, mapear o teto por prefixo de endpoint (ex.: `api:auth:login` → `5`, `api:public:settings` → `600`, etc.) em vez de `MAX_ATTEMPTS = 5` global, limpar todas as chaves `rate_limit:*:${ip}` (via `redisScan`) ao adicionar IP à whitelist ou desbloquear, escapar aspas e prefixos de fórmula (`=`, `+`, `-`, `@`) no `export_csv`, e registrar mutações também em `req.adminUtils.logActivity(...)`.
  3. Em `lib/cache/cache.js`: restringir `DISABLE_RATE_LIMIT === 'true'` a `process.env.NODE_ENV !== 'production'`, usar `normalizedIp` na linha 364 e emitir alerta em `scripts/check-env.js` caso `DISABLE_RATE_LIMIT=true` esteja definido com `NODE_ENV=production`.
- **Impactos e dependências:** É pré-requisito para a proteção `GET` das rotas em `API-AC-06` (`integrity`, `admin/orders`). Pode alterar linhas-âncora de `lib/api/adminCrudHandler.js` vigiadas por `tests/unit/scripts/bench-ground-truth.test.js`.
- **Riscos:** Aplicar rate limit em `GET` de rotas que fazem polling (`RateLimitViewer` 15s, `IntegrityCheck` 30s) com teto muito baixo pode disparar `429` em operação normal; manter teto `≥ 30–60 req/min` nesses endpoints. Os load tests (`load-tests/`) usam `DISABLE_RATE_LIMIT=true` em ambiente não produtivo ou loopback (preservado pela whitelist de loopback `127.0.0.1`).
- **Cuidados:** Preservar o cache local de 15s (`blockedIpsCache`), `redisScan` paginado com `MAX_SCAN_KEYS`, `getClientIP(req)` em `?type=current_ip` e o fallback em memória de `checkRateLimit`.
- **Validação:**
  - `npx jest tests/unit/lib/cache.test.js tests/integration/api/admin/rate-limit.test.js tests/unit/pages/api/admin/rate-limit.test.js tests/integration/api/ip-diagnostico.test.js tests/integration/api/stats.test.js tests/unit/scripts/bench-ground-truth.test.js`
  - Testar: `GET /api/ip-diagnostico` / `GET /api/admin/stats` retornando `429` acima do limite; IP em `rate_limit:whitelist` não aparecendo como bloqueado; `lrange` com string JSON e com objeto não zerando auditoria; `DISABLE_RATE_LIMIT=true` ignorado em `NODE_ENV=production`.
- **Prioridade:** **Alta**
- **Status:** **Pendente**

---

### `API-AC-05` — Eliminação de Crashes `TypeError` (Body Nulo / Query Duplicada / IDs Inválidos), Auditoria `"undefined"` e Falso Sucesso em `/api/admin/cache`

- **Identificação:** `API-AC-05`
- **Objetivo:** Garantir conformidade com a regra de auditoria (`nunca undefined`), impedir respostas de sucesso falsas em falha de `FLUSHDB` e eliminar exceções `500` causadas por payloads nulos, parâmetros de query duplicados (arrays), paginação sem teto e IDs malformados.
- **Problema ou necessidade:** `API-P08`, `API-P09` e `API-P15`.
- **Evidências:**
  - `/home/gus/projetos/Caminhar/pages/api/admin/musicas.js:136`: `Atualizou a música: ${titulo}` (vira `undefined` em toggle parcial de `published`).
  - `/home/gus/projetos/Caminhar/pages/api/admin/users.js:173`: `Atualizou o usuário: ${updatedUsers[0]?.username}` (vira `undefined` se ID inexistente).
  - `/home/gus/projetos/Caminhar/pages/api/admin/cache.js:11`: descarta `{ success: false, error }` retornado por `clearAllCache({ confirm: true })` (`lib/cache/cache.js:325`).
  - `/home/gus/projetos/Caminhar/pages/api/posts.js:34,40,47`: `?search=a&search=b` (array) burla `typeof search === 'string'` e lança `TypeError: search.toLowerCase is not a function`.
  - `/home/gus/projetos/Caminhar/pages/api/products.js:70-77,281,328`: filtros públicos sem checagem `typeof === 'string'` nem limite `max(200)` antes da `cacheKey`; `req.body.id` sem guarda em `PUT`/`DELETE` (`DELETE /api/products?id=1` sem body gera `500`); `GET` público sem `Cache-Control`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/audit.js:7-28`: `page`/`limit` sem validação/teto (`limit=1000000` ou negativo → dump/`500`); `startDate`/`endDate` sem validação de data ISO (erro SQL `22007` → `500`).
  - `/home/gus/projetos/Caminhar/pages/api/admin/dicas.js:24-25,59,64,97-107`, `categories.js:38-39,79,123-131`, `posts.js:86,107`, `musicas.js:76,107`, `videos.js:52,58,76,89`, `roles.js:89,109`, `users.js:60-72,121,178`: `req.body.*` sem guarda contra `null`/`undefined`, `id` não validado como inteiro positivo antes do SQL, `DELETE dicas` sem `404`, `videos.js` passando `req.body`/`updateData` crus.
- **Diagnóstico:** A suíte `null-tolerance.edge.test.js` cobre apenas 4 rotas em subconjuntos de cenários; as demais rotas mantiveram acessos diretos `req.body.id` / `req.body.action`, query strings sem sanitização de tipo/teto e leitura de campos opcionais do payload na auditoria.
- **Escopo:** Correção dos logs de auditoria (`musicas.js`, `users.js`), tratamento de falha em `admin/cache.js`, normalização segura de `req.body || {}`, validação uniforme de `page`/`limit` (teto `≤ 100` ou `≤ 200` em auditoria), `search` (`string`, `≤ 200`), datas ISO (`audit.js`) e `id` inteiro positivo em `PUT`/`DELETE`, além de `validation.data` em `videos.js` e `Cache-Control` em `GET /api/products?public=true`.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/pages/api/admin/musicas.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/users.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/cache.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/audit.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/dicas.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/categories.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/posts.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/videos.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/roles.js`
  - `/home/gus/projetos/Caminhar/pages/api/posts.js`
  - `/home/gus/projetos/Caminhar/pages/api/products.js`
  - `/home/gus/projetos/Caminhar/tests/unit/pages/api/admin/null-tolerance.edge.test.js` e testes de integração das rotas acima (incluindo `tests/integration/api/admin/cache.test.js`).
- **Alterações propostas:**
  1. Em `pages/api/admin/musicas.js:136`, registrar `Atualizou a música: ${musicaAtualizada.titulo || id}`; em `users.js:173`, retornar `404` se `!updatedUsers[0]` antes de chamar `logActivity`.
  2. Em `pages/api/admin/cache.js:11`, capturar `const result = await clearAllCache({ confirm: true })` e, se `result && result.success === false`, responder `503` (sem vazar `result.error` cru e sem registrar sucesso em `logActivity`). Ajustar mock em `tests/integration/api/admin/cache.test.js` (`mockResolvedValue({ success: true })` + novo teste de falha `{ success: false }`).
  3. Em `pages/api/posts.js`, `pages/api/products.js` e `pages/api/admin/users.js`, normalizar query params rejeitando arrays ou convertendo com segurança (`typeof === 'string'`) e limitando `search` (`≤ 200`) e filtros de `products.js` antes de montar a `cacheKey`; adicionar `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600` no `GET /api/products?public=true`.
  4. Usar `const body = req.body && typeof req.body === 'object' ? req.body : {}` nas 8 rotas admin/products, validar `id` como inteiro positivo antes de consultar o PostgreSQL, devolver `404` em `DELETE /api/admin/dicas` quando `rowCount === 0`, passar `validation.data` em `videos.js` (`createVideo`/`updateVideo`) e validar `page`/`limit` (`paginate`) + `startDate`/`endDate` ISO em `pages/api/admin/audit.js`.
- **Impactos e dependências:** Requer atualizar `tests/integration/api/admin/cache.test.js:83-90` (onde `clearAllCache` hoje retorna `undefined` no mock) e conferir se algum consumidor de `GET /api/admin/audit` pede `limit > 100` (o painel usa `50` — `ARQUITETURA_SITE_PRIVADO.md` §5.3).
- **Riscos:** Validar `startDate`/`endDate` de forma excessivamente estrita em `audit.js` poderia rejeitar o formato enviado por `AdminAudit.js`; verificar o formato exato enviado por `components/Admin/AdminAudit.js` antes de codar.
- **Cuidados:** Manter compatibilidade com a suíte `null-tolerance.edge.test.js`, o contrato de respostas de paginação (`INVALID_PAGINATION_MESSAGE`) e a regra de auditoria §9.
- **Validação:**
  - `npx jest tests/unit/pages/api/admin/null-tolerance.edge.test.js tests/integration/api/admin/cache.test.js tests/integration/api/admin/musicas.test.js tests/integration/api/admin/dicas.test.js tests/integration/api/admin/audit.test.js tests/integration/api/admin/categories.test.js tests/integration/api/admin/videos.test.js tests/integration/api/posts.test.js tests/integration/api/products.test.js`
  - Testar explicitamente: toggle de `published` em música gravando título real na auditoria; `clearAllCache` retornando `{ success: false }` → `503`; `GET /api/posts?search=a&search=b` sem `500`; `DELETE /api/products?id=1` sem body retornando `200`/`404` (não `500`); `GET /api/admin/audit?limit=-1` e `?startDate=invalida` → `400`.
- **Prioridade:** **Alta**
- **Status:** **Pendente**

---

### `API-AC-06` — Performance, Erros Seguros e Convergência de Rotas Irmãs (`placeholder-image`, `integrity`, `stats`, `orders`, `internal-products`, `fetch-*`)

- **Identificação:** `API-AC-06`
- **Objetivo:** Portar a correção de event loop de `/api/uploads` para `placeholder-image.js`, eliminar vazamento de `error.message` e I/O síncrono em `integrity.js`, reduzir a pressão no pool em `stats.js`, migrar `admin/orders.js` e `admin/internal-products.js` para `createAdminHandler` e refinar as três rotas `fetch-*`.
- **Problema ou necessidade:** `API-P13`, `API-P14`, `API-P16` e `API-P17` (convergente com `MP-DIAG-08` e `MP-DIAG-10`).
- **Evidências:**
  - `/home/gus/projetos/Caminhar/pages/api/placeholder-image.js:8,105-106`: `res.send(imageBuffer)` sobre `Buffer` no Next 16.4.6; `HEAD` lê o arquivo e envia o corpo; sem rate limit.
  - `/home/gus/projetos/Caminhar/pages/api/admin/integrity.js:51,59-65,75,99-121,142,150-157,181`: `error.message` cru no JSON (4 pontos); `new Redis(...)` a cada chamada; `fs.readdirSync`/`statSync`/`statfsSync` recursivo bloqueante; leitura de `mtime` dos backups (irmão da correção §8 item 3 de `backups.js`).
  - `/home/gus/projetos/Caminhar/pages/api/admin/stats.js:19-53`: 33 queries `SELECT COUNT(*)` simultâneas num único `GET`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/orders.js:29-67` e `/home/gus/projetos/Caminhar/pages/api/admin/internal-products.js:62-100`: middleware manual duplicado fora de `createAdminHandler`; `GET /api/admin/orders` sem rate limit e sem teto de `search`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-youtube.js:36-39`: `throw new Error(...)` engolido pelo `createAdminHandler` como `500` genérico; sem validação via `extractYoutubeId`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-spotify.js:119,141`: `.replace(/"/g, '"')` e `.replace(/&/g, '&')` no-op; `BusinessError` retorna `500` em vez de `422`/`502`.
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-ml.js:60-69,199-203`: `fetch` segue redirects sem revalidar host destino contra `isPrivateOrLocalHost`/`trustedHost` e sem limite de bytes em `htmlRes.text()`.
- **Diagnóstico:** Estas 8 rotas acumulam dívida técnica gerada por correções aplicadas apenas a uma rota de cada família (sem varredura de rotas irmãs) e por dois endpoints novos da Gestão de Vendas criados fora da fábrica padrão `createAdminHandler`.
- **Escopo:** Refatoração cirúrgica preservando 100% dos contratos JSON existentes para o frontend e painel.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/pages/api/placeholder-image.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/integrity.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/stats.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/orders.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/internal-products.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-ml.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-spotify.js`
  - `/home/gus/projetos/Caminhar/pages/api/admin/fetch-youtube.js`
  - Testes correspondentes em `/home/gus/projetos/Caminhar/tests/integration/api/` e `/home/gus/projetos/Caminhar/tests/unit/pages/api/admin/`.
  - `/home/gus/projetos/Caminhar/scripts/bench/orchestrator/gabarito.md` *(recalibrar contagem de rotas via factory vs auth manual ao migrar `orders.js` e `internal-products.js`)*.
- **Alterações propostas:**
  1. Em `pages/api/placeholder-image.js`: adotar `res.status(200).end(imageBuffer)` (com `Content-Length`), encerrar `HEAD` após headers/304 sem `fs.readFile`, e adicionar `checkRateLimit(getClientIP(req), 'api:public:placeholder-image', 120, 60000)`.
  2. Em `pages/api/admin/integrity.js`: substituir `error.message` por mensagens fixas seguras (logando o erro real via `logger.error`), reutilizar `getRedisInstance()` de `lib/infra/redis.js`, migrar travessia de disco para `fs.promises`, reutilizar `getAvailableBackups()` de `scripts/backup.js` para a data correta do backup, e configurar `rateLimit: { max: 30, window: 60000 }` (ativo via `API-AC-04`).
  3. Em `pages/api/admin/stats.js`: consolidar as 33 queries em 7 queries agregadas (`COUNT(*) FILTER (WHERE ...)`) — 1 por tabela (`posts`, `musicas`, `videos`, `products`, `users`, `dicas`, `orders`) — mantendo exatamente o mesmo payload JSON de resposta.
  4. Migrar `pages/api/admin/orders.js` e `pages/api/admin/internal-products.js` para `createAdminHandler` (`permission: 'Gestão de Vendas'`, `rateLimit` em `GET` de `orders` com teto `30–60/min` + limite `search <= 200` + `cacheKeys: 'products:*'` em `internal-products`), eliminando `requireAuth`/`requireSalesPermission` duplicados.
  5. Em `fetch-youtube.js`: validar URL com `extractYoutubeId` (`lib/media/youtube.js`) e tratar `!response.ok` retornando `422`/`502` com a mensagem amigável ao operador (sem lançar `500` genérico). Em `fetch-spotify.js`: corrigir `.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')` e alinhar `BusinessError` para `422`/`502` (checando `ExternalDataButton.js`). Em `fetch-ml.js`: usar `redirect: 'manual'` com loop limitado (ex.: até 3 saltos revalidando `isPrivateOrLocalHost`/`trustedHost` a cada redirect) e limitar leitura do corpo HTML (ex.: 2 MB).
- **Impactos e dependências:** Depende de `API-AC-03` (isolamento `modality` em `internal-products.js`) e `API-AC-04` (rate limit em `GET` no `createAdminHandler`). Migrar `orders.js` e `internal-products.js` altera as contagens de "admin via factory" (17 → 19) e "auth manual" em `scripts/bench/orchestrator/gabarito.md`.
- **Riscos:** Mudar status de `BusinessError` em `fetch-spotify.js` (`500` → `422`/`502`) ou o SQL de `stats.js` exige atualizar mocks posicionais em `tests/integration/api/stats.test.js` e `fetch-spotify.edge.test.js`; `SQL` alterado em `stats.js` deve ser testado também contra PostgreSQL real (`ADR-0039`).
- **Cuidados:** Preservar 100% das chaves do JSON de `GET /api/admin/stats` (consumido por `AdminDashboard.js`), o comportamento `ETag`/fallback SVG de `placeholder-image.js`, e a auditoria `SINCRONIZAR PEDIDOS MP` em `admin/orders.js`.
- **Validação:**
  - `npx jest tests/integration/api/placeholder-image.test.js tests/integration/api/admin/integrity.test.js tests/integration/api/stats.test.js tests/integration/api/admin/orders.test.js tests/integration/api/admin/internal-products.test.js tests/unit/pages/api/admin/fetch-ml.edge.test.js tests/unit/pages/api/admin/fetch-spotify.edge.test.js tests/unit/pages/api/admin/fetch-youtube.edge.test.js tests/unit/scripts/bench-ground-truth.test.js`
  - Garantir `tests/integration/api/placeholder-image.test.js` com guarda anti-regressão de `res.send` (mesmo padrão de `uploads.test.js`); testar `integrity.js` garantindo ausência de `error.message` cru no corpo.
- **Prioridade:** **Média-Alta**
- **Status:** **Pendente**

---

### `API-AC-07` — Saneamento de CORS (`next.config.js`), Consistência de Header `Allow` em `405` e Endurecimento Residual de `/api/customer/auth` + `customers.js`

- **Identificação:** `API-AC-07`
- **Objetivo:** Corrigir inconsistências de cabeçalhos HTTP (CORS e `Allow` em `405`) e fechar as lacunas defensivas residuais da API de conta do visitante (`/api/customer/auth` e `upsertGoogleCustomer`).
- **Problema ou necessidade:** `API-P18` e `API-P19` (convergente com `MG-12`, `MG-13` e `MG-15` de `docs/melhoria_google.md`).
- **Evidências:**
  - `/home/gus/projetos/Caminhar/next.config.js:82-165`: regra órfã `/api/helper/:path*`; `/api/:path*` envia `process.env.ALLOWED_ORIGINS || ''` inteiro sem split; `/api/admin/:path*` e `/api/auth/:path*` fazem `.split(',')[0]` sem `.trim()`; `Access-Control-Allow-Credentials: true` emitido mesmo quando `Access-Control-Allow-Origin` é vazio.
  - 13 rotas (`posts.js`, `videos.js`, `products.js`, `status.js`, `auth/check.js`, `upload-image.js`, `cleanup-test-data.js`, `checkout.js`, `customer/auth.js`, `customer/orders.js`, `webhooks/mercadopago.js`, `admin/orders.js`, `admin/internal-products.js`) retornam `405` sem `res.setHeader('Allow', ...)` (RFC 9110 §15.5.6).
  - `/home/gus/projetos/Caminhar/pages/api/customer/auth.js:87-98,120-121,203-206`: `GET` sem rate limit nem `Cache-Control: no-store`; `PUT` devolve `200 { customer: null }` para conta removida; `POST action=google` grava log duplo (`warn` + `error`) no mesmo erro de configuração.
  - `/home/gus/projetos/Caminhar/lib/domain/customers.js:83-124`: `upsertGoogleCustomer` faz `SELECT` → `INSERT` sem capturar `23505` (corrida em primeiro login simultâneo gera `500`).
- **Diagnóstico:** Pequenas inconsistências de protocolo HTTP e bordas de concorrência em contas de visitante reduzem previsibilidade sob múltiplos domínios/proxies e sob clique duplo no login Google.
- **Escopo:** Limpeza e normalização dos headers CORS em `next.config.js`, adição de `Allow` nos `405` restantes (exceto `orders`/`internal-products` se já migrados em `API-AC-06`), rate limit + `no-store` + `404` no `PUT` + log único em `pages/api/customer/auth.js`, e tratamento de `23505` em `lib/domain/customers.js`.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/next.config.js`
  - `/home/gus/projetos/Caminhar/pages/api/customer/auth.js`
  - `/home/gus/projetos/Caminhar/lib/domain/customers.js`
  - Rotas com `405` sem `Allow`: `/home/gus/projetos/Caminhar/pages/api/{posts,videos,products,status,upload-image,checkout}.js`, `/home/gus/projetos/Caminhar/pages/api/auth/check.js`, `/home/gus/projetos/Caminhar/pages/api/customer/orders.js`, `/home/gus/projetos/Caminhar/pages/api/webhooks/mercadopago.js`
  - `/home/gus/projetos/Caminhar/tests/unit/next.config.test.js`, `/home/gus/projetos/Caminhar/tests/integration/api/customer/auth.test.js`, `/home/gus/projetos/Caminhar/tests/unit/lib/domain/customers.test.js`, `/home/gus/projetos/Caminhar/tests/integration/domain/customers.db.test.js`
  - `/home/gus/projetos/Caminhar/scripts/bench/orchestrator/gabarito.md` *(se linhas de `next.config.js`/`status.js`/`check.js` mudarem)*.
- **Alterações propostas:**
  1. Em `next.config.js`: remover o bloco morto `/api/helper/:path*`; extrair helper local `primaryAllowedOrigin = (process.env.ALLOWED_ORIGINS || '').split(',')[0].trim()`; emitir `Access-Control-Allow-Origin` e `Access-Control-Allow-Credentials` apenas quando `primaryAllowedOrigin` estiver preenchido (evitando `Credentials: true` com origin vazia ou lista vírgula-separada inválida).
  2. Adicionar `res.setHeader('Allow', [...])` em todos os retornos `405` das rotas fora de `createAdminHandler`.
  3. Em `pages/api/customer/auth.js`: aplicar `checkRateLimit(getClientIP(req), 'api:customer:session', 120, 60000)` e `Cache-Control: no-store, private` em `GET`; em `PUT`, se `!updated`, chamar `clearCustomerAuthCookie(res)` e retornar `404`; em `POST action=google`, registrar `logger.error` para `GOOGLE_CONFIG_ERROR_CODES` e `logger.warn` apenas para os demais códigos (eliminando duplicidade).
  4. Em `lib/domain/customers.js`: capturar `err?.code === '23505'` no `INSERT` de `upsertGoogleCustomer`, reconsultar por `google_id` ou `LOWER(email)` preservando estritamente `GOOGLE_ACCOUNT_CONFLICT` (`409`) e `password_hash = NULL`.
- **Impactos e dependências:** Depende de `API-AC-01` (cookie seguro); altera SQL/tratamento de erro em `lib/domain/customers.js` → validar em PostgreSQL real (`customers.db.test.js`); altera `next.config.js` → rodar `npm test` completo e `tests/unit/scripts/bench-ground-truth.test.js` (`AGENTS.md` §7 item 1).
- **Riscos:** Rate limit baixo em `GET /api/customer/auth` causaria falso deslogamento na home (`pages/index.js:59`); manter teto confortável (`≥ 120 req/min`). Remover CORS quando `ALLOWED_ORIGINS` vazio preserva same-origin normal do navegador; confirmar se `tests/unit/next.config.test.js` asserta os headers atuais.
- **Cuidados:** Preservar `Cross-Origin-Opener-Policy: same-origin-allow-popups` em `/entrar` e `CSP: default-src 'none'; sandbox` em `/uploads/:path*` (+ `/api/uploads/:path*`).
- **Validação:**
  - `npx jest tests/unit/next.config.test.js tests/integration/api/customer/auth.test.js tests/unit/lib/domain/customers.test.js tests/unit/scripts/bench-ground-truth.test.js`
  - `npm run test:db:container` (`customers.db.test.js`).
  - Verificar `next.config.js` sem `/api/helper/:path*` e headers `Allow` em todas as rotas `405`.
- **Prioridade:** **Média**
- **Status:** **Pendente**

---

### `API-AC-08` — Governança de Cobertura de APIs (`jest.config.js`), Suítes `.db.test.js` Faltantes, Validação Remota do CI e Inventários Técnicos

- **Identificação:** `API-AC-08`
- **Objetivo:** Fechar os pontos cegos de regressão na esteira de testes das APIs (thresholds ausentes, `proxy.js` fora da coleta, 4 domínios SQL sem `.db.test.js`, `npm audit` morto no CI) e sincronizar inventários técnicos após as correções.
- **Problema ou necessidade:** Lacunas comprovadas em `jest.config.js`, `logs/coverage-output.log` (`22/11/2026`), `.github/workflows/test-base.yml` e inventários `docs/PROJECT_*.md` (convergente com `retorno_da_semana.md` Oportunidades `5.5`/`5.7`/`5.8`/`5.10` e `MP-DIAG-09`).
- **Evidências:**
  - `/home/gus/projetos/Caminhar/jest.config.js:27-35,45-76`: `proxy.js` fora de `collectCoverageFrom`; sem `coverageThreshold` para `pages/api/auth/`, `pages/api/customer/`, `pages/api/webhooks/`, `pages/api/`, `lib/auth/` e `lib/payment/`.
  - `/home/gus/projetos/Caminhar/logs/coverage-output.log` (`22/11/2026 17:18`): `pages/api/auth/login.js` (`68,45%` L / `72,72%` B), `lib/auth/customer-auth.js` (`52,63%` B), `pages/api/admin/integrity.js` (`52,17%` B), `lib/payment/mercadopago.js` (`68,44%` B), `pages/api/checkout.js` (`72,97%` B), `pages/api/admin/rate-limit.js` (`73,17%` B), `pages/api/products.js` (`76,19%` B), `pages/api/customer/auth.js` (`77,58%` B).
  - Domínios sem `*.db.test.js` em `tests/integration/domain/`: `categories.js`, `audit.js`, `dicas.js`, `images.js`.
  - `.github/workflows/test-base.yml:470-474`: step `Audit Dependencies` (`npm audit`) sob condição inalcançável `inputs.test-type == 'coverage'`.
- **Diagnóstico:** A média global de cobertura (`95,48%` linhas / `86,31%` branches) mascara quedas localizadas em rotas críticas de autenticação, pagamento e integridade; além disso, a ausência de validação remota nesta sessão deixa sem confirmação os runs de `test-db-coverage.yml` pós-`19/11`.
- **Escopo:** Adição de thresholds direcionados em `jest.config.js`, inclusão de `proxy.js` na coleta, criação de `*.db.test.js` para `categories`/`audit`/`dicas`/`images` + extensão de `schema-sources.test.js`, portabilidade de `Audit Dependencies` para `test-coverage.yml`, verificação dos runs remotos do GitHub Actions e atualização final de `docs/PROJECT_pages.md` e `docs/PROJECT_lib.md`.
- **Arquivos envolvidos:**
  - `/home/gus/projetos/Caminhar/jest.config.js`
  - `/home/gus/projetos/Caminhar/tests/unit/scripts/schema-sources.test.js`
  - Novos testes (quando autorizados): `/home/gus/projetos/Caminhar/tests/integration/domain/{categories,audit,dicas}.db.test.js` e `/home/gus/projetos/Caminhar/tests/unit/scripts/check-env.test.js`
  - `/home/gus/projetos/Caminhar/.github/workflows/test-coverage.yml` e `/home/gus/projetos/Caminhar/.github/workflows/test-base.yml`
  - `/home/gus/projetos/Caminhar/docs/PROJECT_pages.md` e `/home/gus/projetos/Caminhar/docs/PROJECT_lib.md`
- **Alterações propostas:**
  1. Após `API-AC-01` a `API-AC-07` fecharem as lacunas de testes, adicionar thresholds por diretório em `jest.config.js` para `pages/api/auth/`, `pages/api/customer/`, `pages/api/webhooks/`, `lib/auth/` e `lib/payment/`, e incluir `proxy.js` em `collectCoverageFrom`.
  2. Criar suítes `*.db.test.js` (Testcontainers PostgreSQL) para `categories.js` (incluindo cascata `post_categories`), `audit.js` e `dicas.js`, e estender `tests/unit/scripts/schema-sources.test.js` para auditar colunas `INSERT`/`UPDATE` dos demais domínios.
  3. Portar `Audit Dependencies` (`npm audit --audit-level=high`) de `test-base.yml` para `test-coverage.yml`, removendo blocos mortos de `test-base.yml`.
  4. Em ambiente com acesso ao GitHub Actions, confirmar o estado verde dos runs de `test-db-coverage.yml`, `test-coverage.yml` e `e2e.yml` pós-commits da semana.
  5. Sincronizar `docs/PROJECT_pages.md` e `docs/PROJECT_lib.md` com todas as 38 rotas e módulos atuais (somente quando autorizado — nunca nesta auditoria).
- **Impactos e dependências:** Deve ser a **última** ação da sequência para não quebrar thresholds antes das correções de cobertura de `API-AC-01` a `API-AC-07`. Alteração em `jest.config.js` exige rodar `npm test` completo (`AGENTS.md` §7 item 1); alteração em workflows exige `npm run lint:workflows`.
- **Riscos:** Thresholds agressivos demais podem travar PRs; calibrar pisos com margem de 3–5 pontos abaixo da cobertura medida após `API-AC-01`–`API-AC-07`.
- **Cuidados:** Não alterar a decisão do `ADR-0007` (`e2e.yml` continua sem trigger de `pull_request`); manter `npm run knip` verde ao exportar funções testáveis de `scripts/check-env.js`.
- **Validação:**
  - `npm test`, `npm run test:coverage`, `npm run knip`, `npm run lint`, `npm run lint:workflows`, `npm run security:check-sql`, `npm run security:check-credentials`
  - Confirmação remota de `test-db-coverage.yml` verde no GitHub Actions.
- **Prioridade:** **Média**
- **Status:** **Pendente**

---

## 6. Revisão Crítica Obrigatória do Plano de Ação

Revisão executada antes do registro definitivo deste documento frente aos 10 critérios de controle:

1. **Evidências e justificativas:** 100% das 8 ações (`API-AC-01` a `API-AC-08`) estão lastreadas em `arquivo:linha` lidos diretamente no disco em `23/11/2026`, commits verificados no `git log` e métricas reais de `logs/coverage-output.log` (`22/11/2026`).
2. **Persistência atual dos problemas:** todas as falhas listadas como pendentes foram reconfirmadas no código vigente; o item de paridade `link` obrigatório em `pages/api/products.js` foi **excluído do backlog** por já estar implementado e validado (`39/39`) no working tree de `23/11/2026` (apenas aguardando commit).
3. **Validação de correções consideradas concluídas:** todas as correções da janela marcadas como concluídas possuem evidência nos logs de `22/11/2026` (`241/249` suítes, `2.090` testes) ou execução ao vivo em `23/11/2026` (`53/53` no canário + `products.test.js`, além dos 5 gates estáticos). Pontos dependentes de PostgreSQL real / CI remoto (`customers.db.test.js`, `orders.db.test.js`) foram mantidos explicitamente com ressalva na Seção 4.7 e na `API-AC-08`.
4. **Ausência de duplicação:** cada defeito foi alocado a uma única ação; interseções com auditorias irmãs (`docs/melhoria_mercadopago.md`, `docs/melhoria_google.md`, `docs/retorno_da_semana.md`) estão referenciadas explicitamente (`MP-DIAG-*`, `MG-*`, `OCOR-2026-11-23-*`) para coordenação sem duplicidade.
5. **Conformidade arquitetural:** nenhuma ação conflita com `AGENTS.md`, `ARQUITETURA_SITE_PRIVADO.md`, `ARQUITETURA_SITE_PUBLICO.md` ou ADRs vigentes (`ADR-0002`–`0043`). Divergências ou decisões de contrato (`POST /api/auth/refresh`, `fs.realpath`/whitelist em `/api/uploads`, destino de `cleanup-test-data.js`, bypass `editor` em `GET /api/settings?key=`) estão sinalizadas para decisão explícita do dono do projeto.
6. **Impactos e dependências verificados durante a revisão:** foram identificados e incorporados três impactos concretos detectados na releitura dos testes e do bench — (a) `tests/integration/api/auth/refresh.test.js:92` asserta `data.token` no body de `/api/auth/refresh`; (b) `tests/integration/api/admin/cache.test.js:83-90` mocka `clearAllCache` sem retorno (`undefined`), exigindo checagem `result && result.success === false` e atualização do mock; (c) 12 dos arquivos citados nas ações são vigiados pelo canário `tests/unit/scripts/bench-ground-truth.test.js`, exigindo recalibração de `scripts/bench/` na mesma rodada.
7. **Precisão dos arquivos envolvidos:** todos os caminhos listados foram verificados via `find`/`read_file` no repositório atual.
8. **Sequência técnica:** a ordem `API-AC-01 → 02 → 03 → 04 → 05 → 06 → 07 → 08` resolve primeiro vulnerabilidades críticas transversais (`parseCookie`/auth/webhook), depois o mecanismo compartilhado (`createAdminHandler` `GET` rate limit em `API-AC-04`) antes dos consumidores (`API-AC-06`), e fecha com thresholds/CI (`API-AC-08`).
9. **Critérios de validação:** cada ação especifica comandos objetivos, cenários negativos/de borda e critérios mensuráveis de aceitação.
10. **Ausência de escopo desnecessário:** foram descartadas refatorações fora de escopo (ex.: mover `/api/products` para `/api/admin/products` — contrário ao `ADR-0017`; remover `?response=body` de `/api/auth/login` — contrário ao `ADR-0011`; alterar o modelo de cargo `admin` — contrário ao `ADR-0010`; adicionar dependências npm — contrário ao `ADR-0042`).
