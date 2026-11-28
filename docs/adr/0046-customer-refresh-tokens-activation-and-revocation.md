# ADR-0046: Ativação, rotação e revogação server-side em `customer_refresh_tokens`

- **Status:** Aceito
- **Data:** 2026-11-28
- **Decisores:** Mantenedor do projeto / execução técnica da Auditoria Google (`H7`)
- **Relacionados:** [ADR-0005](0005-jwt-http-only-rbac.md), [ADR-0011](0011-erro-de-banco-503-e-refresh-token-fora-do-body.md), [ADR-0037](0037-internal-sales-mercadopago-and-customer-accounts.md), [ADR-0042](0042-google-id-token-local-jwks-verification.md), [`../../lib/auth/customer-auth.js`](../../lib/auth/customer-auth.js), [`../../lib/domain/customers.js`](../../lib/domain/customers.js), [`../../pages/api/customer/auth.js`](../../pages/api/customer/auth.js), [`../../scripts/migrations/023-sales-customers-and-modalities.js`](../../scripts/migrations/023-sales-customers-and-modalities.js), [`../../scripts/migrations/024-customer-refresh-tokens-indexes.js`](../../scripts/migrations/024-customer-refresh-tokens-indexes.js)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

A migração `023-sales-customers-and-modalities.js` ([ADR-0037](0037-internal-sales-mercadopago-and-modalities.js)) criou a tabela `customer_refresh_tokens` (`id`, `customer_id`, `token`, `expires_at`, `revoked`, `created_at`) com vínculo `REFERENCES customers(id) ON DELETE CASCADE`, mas a camada de autenticação de visitantes (`lib/auth/customer-auth.js` e `pages/api/customer/auth.js`) permaneceu operando apenas com um JWT stateless de `24h` (`customerToken`).

A auditoria semanal da Integração com o Google registrou essa lacuna como hipótese **H7** (`docs/melhoria_google.md`):

1. A tabela `customer_refresh_tokens` não tinha nenhum consumidor em produção nem índices secundários em `customer_id` ou `expires_at`.
2. `POST /api/customer/auth` com `action: 'logout'` apenas limpava o cookie `customerToken` no navegador do cliente — um JWT capturado continuava válido por até `24h` sem revogação server-side.
3. O vínculo inicial de conta Google por e-mail em `upsertGoogleCustomer` anulava `password_hash = NULL` para impedir pré-sequestro, mas não invalidava sessões de longa duração preexistentes do cliente.

## Decisão

Ativar integralmente o ciclo de vida de `customer_refresh_tokens` com isolamento estrito em relação ao sistema administrativo (`users` / `refresh_tokens`) e preservação completa das páginas existentes (`/`, `/entrar`, `/minha-conta`, `/checkout/[id]`):

1. **Redução da janela stateless do access token para `1h`:** `customerToken` (`HttpOnly; SameSite=Lax; Path=/`, `scope: 'customer'`, `HS256`) passa de `24h` (`86400s`) para `1h` (`3600s`).
2. **Emissão de refresh token opaco apenas por hash SHA-256:** `lib/auth/customer-auth.js` gera tokens opacos de `48` bytes (`96` caracteres hexadecimais) via `randomBytes` e deriva o digest SHA-256 (`hashCustomerRefreshToken`, retornando `null` em formato inválido antes de consultar o PostgreSQL). Somente o **hash** é persistido em `customer_refresh_tokens.token`.
3. **Cookie dedicado e confinado à rota de autenticação (`customerRefreshToken`):** enviado com `HttpOnly`, `SameSite=Strict`, `Path=/api/customer/auth`, `Max-Age=2592000` (`30` dias) e `Secure` em `NODE_ENV=production`. Nenhum token (`customerToken` ou `customerRefreshToken`) trafega no body JSON (alinhado ao [ADR-0011](0011-erro-de-banco-503-e-refresh-token-fora-do-body.md)).
4. **Resiliência na emissão de sessão (`register`, `login`, `google`):** se a gravação de `customer_refresh_tokens` falhar por erro transitório de banco, o evento é registrado com `logger.error` e o cookie `customerRefreshToken` **não** é gravado, preservando o acesso pelo `customerToken` de `1h` (mesma semântica de `lib/auth/auth.js`).
5. **Renovação idempotente em `GET /api/customer/auth`:** quando `customerToken` está ausente/expirado e existe `customerRefreshToken` válido e não revogado, o servidor reemite um novo `customerToken` (`1h`) sem rotacionar o refresh token durante leitura `GET` (evitando condições de corrida entre abas abertas e mantendo idempotência HTTP). Quando inválido/revogado/removido, limpa ambos os cookies.
6. **Rotação explícita de uso único (`POST action: 'refresh'`) e revogação real (`POST action: 'logout'`):**
   - `action: 'refresh'` consome atomicamente o hash (`UPDATE ... SET revoked = true WHERE token = $1 AND revoked = false AND expires_at > NOW() RETURNING ...`), emite novo par de cookies (`customerToken` + novo `customerRefreshToken`) e limpa ambos os cookies respondendo `401` se ausente no cookie, malformado, já consumido (replay) ou de cliente inexistente.
   - `action: 'logout'` (sob rate limit `api:customer:logout` de `30 req/min`) revoga o hash do refresh token no banco (`try/catch` tolerante a erro transitório) e limpa ambos os cookies.
7. **Revogação no primeiro vínculo Google (`upsertGoogleCustomer`):** `linkGoogleAccountByEmail` chama `revokeAllCustomerRefreshTokens(customer.id)` ao vincular `google_id` pela primeira vez (anulando `password_hash`), encerrando sessões anteriores baseadas em senha.
8. **Indexação dedicada (Migration `024`):** `scripts/migrations/024-customer-refresh-tokens-indexes.js` cria de forma idempotente `idx_customer_refresh_tokens_customer_id` e `idx_customer_refresh_tokens_expires_at`.

## Alternativas consideradas

- **Manter apenas JWT stateless de `24h` e remover a tabela `customer_refresh_tokens` (`DROP TABLE`):** descartada porque eliminaria a capacidade de revogação server-side e exigiria remoção destrutiva de tabela já migrada em `023`, contrariando `AGENTS.md` §6.
- **Criar uma nova rota `/api/customer/refresh` separada:** descartada porque aumentar o escopo de `pages/api/` altera desnecessariamente a superfície de endpoints monitorada pelo projeto; concentrar `action: 'refresh'` e o `GET` de sessão em `/api/customer/auth` permite confinar o cookie em `Path=/api/customer/auth` para `GET`, `refresh` e `logout` simultaneamente.
- **Rotacionar o `customerRefreshToken` dentro de `GET /api/customer/auth`:** descartada porque requisições `GET` simultâneas (ex.: carga inicial paralela ou múltiplas abas abertas ao mesmo tempo após expiração de `1h`) colidiriam na rotação de uso único e deslogariam falsamente o visitante.

## Consequências

### Positivas

- Janela stateless não revogável de sessões de visitante reduzida de `24h` para `1h`.
- `customer_refresh_tokens` passa a ter ciclo completo com armazenamento por hash SHA-256, proteção contra replay na rotação (`POST action: 'refresh'`) e revogação efetiva no logout e na vinculação inicial com Google.
- O cookie de longa duração nunca trafega para páginas públicas nem para `/api/checkout`, `/api/customer/orders` ou `/admin`.
- Zero dependências npm adicionais e compatibilidade transparente com `/`, `/entrar`, `/minha-conta` e `/checkout/[id]`.

### Negativas e riscos

- Logins, cadastros, logouts e renovações de visitantes passam a executar escrita adicional no PostgreSQL em `customer_refresh_tokens` (mitigado por resiliência no login e índices na migration `024`).
- Um `customerToken` ainda dentro da janela máxima de `1h` permanece válido até expirar mesmo após `logout` em outro dispositivo; a partir do vencimento de `1h`, a renovação falha porque o refresh token já foi revogado.
- Tokens expirados acumulados em `customer_refresh_tokens` permanecem na tabela até futura rotina de expurgo (índice `idx_customer_refresh_tokens_expires_at` já preparado na migration `024`).

## Revisão

Reavaliar se surgir necessidade de revogação imediata intra-hora (ex.: consulta de bloqueio de conta ou `token_version` em cache Redis) ou tarefa agendada de limpeza de linhas expiradas em `customer_refresh_tokens`.
