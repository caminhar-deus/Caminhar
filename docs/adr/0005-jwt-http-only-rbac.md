# ADR-0005: Autenticação com JWT, cookies httpOnly e RBAC

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../docs/PROJECT_lib.md`](../../docs/PROJECT_lib.md), [`../../lib/auth/auth.js`](../../lib/auth/auth.js), [`../../lib/domain/permissions.js`](../../lib/domain/permissions.js), [`../../lib/api/adminCrudHandler.js`](../../lib/api/adminCrudHandler.js)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

[`lib/auth/auth.js`](../../lib/auth/auth.js) assina e verifica JWT com
`jsonwebtoken` (expiração de 1 hora), hash de senha com `bcryptjs` (10 rounds),
grava o token em cookie `httpOnly` (e refresh token com `sameSite: Strict`) e
aceita o token por header `Authorization: Bearer` ou por cookie; `verifyToken`
devolve `null` em falha, sem expor o motivo.
[`lib/domain/permissions.js`](../../lib/domain/permissions.js) define a lista
de permissões congelada com `Object.freeze` e normaliza `roles.permissions` de
forma fail-closed. [`lib/api/adminCrudHandler.js`](../../lib/api/adminCrudHandler.js)
aplica RBAC a todas as rotas em `pages/api/admin/` com semântica **disjuntiva**: a
permissão específica basta, e `role === 'admin'` pula a checagem de permissão — com 403
quando falta a permissão; só as rotas com `requireAdmin: true` (2 das 15) exigem papel
de admin, e nelas o papel de admin já dispensa a checagem de permissão. *(Correção em
2026-10-16: o texto original dizia "exigindo papel de admin **e** a permissão
específica" — conjunção que o código nunca implementou; ver ADR-0010.)* Os endpoints estão em
`pages/api/auth/{login,logout,check,refresh}.js`. O `JWT_SECRET` é obrigatório
fora de `development`/`teste` — o próprio módulo lança erro nesse caso (ver
[`lib/auth/auth.js`](../../lib/auth/auth.js)). O `CHANGELOG.md` 1.4.0
registra "JWT com 1h de expiração, cookies httpOnly".

Não há registro documentado da motivação original além dos fatos acima; este
ADR registra a decisão como está em vigor.

## Decisão

Autenticação stateless com JWT em cookie httpOnly, autorização por RBAC
verificado server-side em todas as rotas de admin.

## Alternativas consideradas

**Não há registro documentado das avaliações feitas à época.** As duas
alternativas abaixo aparecem apenas como referência do que a decisão implica,
não como avaliação documentada:

- **Sessão em servidor:** não há registro à época de avaliação; registre-se que
  anularia o benefício de stateless.
- **Leitura do token em `localStorage`:** não há registro à época de avaliação;
  exporia o token a XSS.

## Consequências

### Positivas

- O token não é acessível por JavaScript do navegador.
- A autorização é reaplicada no servidor em cada rota, não só escondida na UI.
- Expiração de 1h limita a janela de um token vazado.

### Negativas e riscos

- Sem revogação — um token emitido continua válido até expirar (não há lista de
  bloqueio).
- O refresh token amplia essa janela.
- `verifyToken` não distingue token expirado de token inválido, o que dificulta
  diagnóstico.
- Permissões em papel exigem consulta ao banco a cada verificação.

## Revisão

Reavaliar se a ausência de revogação for aceitável (exposição de conta,
comprometimento de token), ou se surgir requisito de logout imediato.
