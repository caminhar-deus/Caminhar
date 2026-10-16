# ADR-0011: Erro de banco no painel responde 503 e não vaza mensagem; refresh token fora do body

- **Status:** Aceito
- **Data:** 2026-10-16
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../lib/api/adminCrudHandler.js`](../../lib/api/adminCrudHandler.js), [`../../lib/infra/db.js`](../../lib/infra/db.js), [`../../lib/api/helpers.js`](../../lib/api/helpers.js), [`../../pages/api/auth/login.js`](../../pages/api/auth/login.js), [`../../load-tests/`](../../load-tests), [`0010-admin-como-cargo-e-validacao-de-nome.md`](0010-admin-como-cargo-e-validacao-de-nome.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

Duas pendências foram registradas em
[`ADR-0010`](0010-admin-como-cargo-e-validacao-de-nome.md) e aqui decided-se sobre ambas.

**Pendência 1 — `?response=body` no login.** `pages/api/auth/login.js` oferece dois modos: o
padrão grava cookie httpOnly; com `?response=body` devolve o token no JSON. Esse segundo modo
devolveva **também** o `refresh_token` (`:113`) e o `refresh_token_expires_in` (`:115`).

A verificação de solo mostrou que o `refresh_token` **não tem consumidor**: a varredura em
`load-tests/` — único usuário do modo, fora do navegador — não acha nenhuma leitura do campo.
[`load-tests/helpers/auth.js:41`](../../load-tests/helpers/auth.js) devolve apenas
`{ token: body.data.token }`. O front usa o modo cookie: `AuthProvider.js:27`,
`pages/login.js:126` e `pages/admin.js:216` chamam `/api/auth/login` com `credentials: 'include'`
e sem o parâmetro.

O risco real hoje é baixo: sem CSP forte (`pages/_document.js:55-72` tem `script-src` com
`'unsafe-inline' 'unsafe-eval'`) não há alvo de XSS, e o único cliente é o k6. Mas o campo é
superfície sem uso — o pior tipo: expõe credencial de longa duração (30 dias) sem contrapartida.

**Pendência 2 — erro de banco virava 500 e vaza.** Em `adminCrudHandler.js`, o `catch` do passo 6
usava `let friendlyMessage = error.message` como **default**, substituindo a mensagem crua apenas
para três padrões de negócio (`unique constraint`, `foreign key`, `not null`). Qualquer outro erro
do `pg` — coluna inexistente, `permission denied`, erro de sintaxe — chegava **cru ao cliente**, com
nome de tabela e constraint, em produção. O log já recebia o objeto completo, então o detalhe não
era perdido.

O segundo problema era semântico: falha do Postgres é **indisponibilidade de dependência**, não bug
de aplicação. Um `500` fala "não sei o que aconteceu" e não sinaliza retry; o painel não tem como
distinguir "o banco caiu, tente de novo" de "meu código quebrou".

## Decisão

**1. O `refresh_token` sai do body do login.** `pages/api/auth/login.js` mantém o modo
`?response=body` com `token`, `token_type`, `expires_in` e `refresh_token_stored` — este último é
booleano, não credencial. O parâmetro e os load-tests permanecem: remover o modo exigiria migrar
os ~6 usos em `load-tests/` para cookie jar, custo desproporcional a um campo sem uso.

**2. Indisponibilidade de banco responde 503, com `Retry-After`.** O `catch` do passo 6 classifica
o erro antes de responder. São **dois sinais**, porque nenhum basta sozinho:

- `error.code` do `pg` num conjunto de SQLSTATEs: `53300` (`too_many_connections`), `08000`,
  `08003`, `08006` (connection exceptions) e `57P01`/`57P02`/`57P03`
  (admin_shutdown/crash_shutdown/cannot_connect_now);
- `error.code` **ou** `error.message` com os padrões de rede que
  [`lib/infra/db.js`](../../lib/infra/db.js) já reconhece no retry: `ECONNREFUSED`, `ETIMEDOUT`,
  `timeout`, `Connection terminated`, `socket not connected`.

O segundo sinal é obrigatório: `node_modules/pg/lib/client.js` constrói `Connection terminated`
com `new Error(msg)` **sem `code`** — sem o match por mensagem, essa falha cairia em 500.

**3. O cliente nunca mais recebe `error.message` cru.** As únicas mensagens que passam são as três
traduzidas por padrão de negócio — intencionais e úteis ao operador — e as duas novas de
indisponibilidade. Todo resto vira texto genérico; o detalhe fica **só no log**.

**4. As mensagens de paginação têm fonte única.** `INVALID_PAGINATION_MESSAGE` e
`INVALID_PARAMS_MESSAGE` em [`lib/api/helpers.js`](../../lib/api/helpers.js), substituindo 10
literais repetidos em 6 rotas. O módulo foi escolhido porque as seis **já importam** `getClientIP`
dele: zero import novo, e nada força o `helper/pagination.js` — cuja adoção está descartada por
razão de contrato (ver "Alternativas consideradas").

## Alternativas consideradas

- **Remover `?response=body` por completo.** Descartado: os ~6 usos em `load-tests/` dependeriam de
  cookie jar do k6, e `refresh.js:17` continua aceitando refresh pelo body — remover só a metade do
  login quebraria a renovação dos testes. Custo alto, ganho pequeno.
- **Condicionar `?response=body` a IP confiável ou variável de ambiente.** Descartado: adiciona
  configuração e allowlist para proteger um campo que foi simplesmente removido. O problema era o
  *conteúdo* da resposta, não *quem* a recebe.
- **Remover o parâmetro de `refresh.js` junto.** Descartado: aceitar refresh pelo body é a outra
  metade coerente do contrato "API externa". Isolado, não é risco — é o token que o próprio cliente
  possuía.
- **Validar o cargo contra lista estática em vez do banco** (alternativa surgida na auditoria de
  [`ADR-0010`](0010-admin-como-cargo-e-validacao-de-nome.md)). Descartado: a fonte da verdade é a
  tabela `roles`. Lista em código faz drift.
- **Deixar `friendlyMessage = error.message` e confiar no log.** Descartado: o vazamento é para o
  **cliente**, não para o log. O log sempre recebeu o detalhe.
- **Traduzir `unique constraint` para 503.** Descartado: é erro de negócio, não indisponibilidade.
  Permanece 500 com a mensagem amigável — decisão deste ADR, não do achado que a sugeriu.

## Consequências

### Positivas

- Credencial de 30 dias deixa de viajar em resposta de API sem consumidor.
- Erro do `pg` não chega mais ao cliente com nome de tabela, coluna ou constraint.
- O painel distingue temporário de permanente: 503 com `Retry-After: 5` diz para repetir.
- Alerta de monitoramento separa dependência caída de bug de aplicação.
- 10 literais duplicados viraram 2 constantes, sem import novo nas rotas.

### Negativas e riscos

- **O diagnóstico no navegador ficou mais pobre por desenho.** O operador vê "Erro interno ao
  processar a solicitação" e precisa do log para a causa. É a troca correta para segurança, mas é
  uma perda real de conveniência — e o painel **não mostra o `requestId` nem um caminho para o log**,
  o que torna a recuperação mais difícil do que deveria.
- **O match de rede é por substring e case-sensitive**, mesma convenção de `db.js`. Um erro de
  qualquer camada contendo `timeout` cai em 503, inclusive `AbortError` de `fetchWithTimeout` e
  possível statement timeout. Aceito por paridade com o retry de `db.js`; pode gerar 503 onde o
  correto seria 500.
- **O 503 vale para o handler inteiro**, não só para a validação de cargo: qualquer query de banco
  indisponível dentro de um handler admin responde 503.
- `?response=body` continua existindo e continua devendo ser tratado como superfície, não como
  caminho seguro.

## Revisão

Reavaliar se: (a) surgir consumidor de navegador de `?response=body` — aí o modo deixa de ter
usuário legítimo e a remoção completa volta à mesa; (b) o 503 ficar ruidoso em produção e
complicar alerta — medir antes de afrouxar a classificação, e considerar separar
`AbortError`/statement timeout do que é indisponibilidade real; (c) o painel passar a exibir
`requestId` na resposta de erro, o que tornaria o caminho de recuperação do usuário mais curto e
permitiria decidir com dado se o `Retry-After` é útil no front.