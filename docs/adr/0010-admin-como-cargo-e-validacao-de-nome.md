# ADR-0010: `ADMIN` é um cargo comum; autorização por cargo e permissão, com validação de nome

- **Status:** Aceito
- **Data:** 2026-10-16
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../../lib/api/adminCrudHandler.js`](../../lib/api/adminCrudHandler.js), [`../../lib/domain/permissions.js`](../../lib/domain/permissions.js), [`../../pages/api/admin/users.js`](../../pages/api/admin/users.js), [`../../pages/api/admin/roles.js`](../../pages/api/admin/roles.js), [`../../scripts/migrations/018-seed-default-roles.js`](../../scripts/migrations/018-seed-default-roles.js), [`0005-jwt-http-only-rbac.md`](0005-jwt-http-only-rbac.md)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

Uma auditoria de segurança tecnicamente correta chegou a uma conclusão errada, e vale
registrar por quê — o erro é mais instrutivo que o achado.

**O modelo de acesso, declarado pelo mantenedor.** `ADMIN` é um **cargo**, não um
privilégio especial. Ele contém todas as permissões porque foi criado assim, e qualquer
usuário pode ser vinculado a **qualquer** cargo, inclusive `ADMIN`. A tabela de
[referência do mantenedor](../../README.md):

| Usuário | Cargo |
|---|---|
| ADMIN | ADMIN |
| USUÁRIO A | POST |
| USUÁRIO B | DICAS |
| USUÁRIO C | ADMIN |
| USUÁRIO D | POST / DICAS |

**O que a auditoria encontrou.** `pages/api/admin/users.js:10` cria usuário com
`role: z.string().optional().default('admin')`, sem `enum` nem `.refine()`. A auditoria
concluiu que "um editor com a permissão `Usuários` cria um admin — escalada de
privilégio".

**Por que essa conclusão estava errada.** No modelo acima, vincular o cargo `ADMIN` a um
usuário com a permissão `Usuários` **é a função dessa permissão**, não uma brecha. O
`ADMIN` é uma linha na tabela `roles`, não um atributo do usuário: a própria migração
[`018-seed-default-roles.js`](../../scripts/migrations/018-seed-default-roles.js:54)
cria `admin` e `user` como dois registros comuns, e `ADMIN_PERMISSIONS` é só
`permissionsList` serializado. Não existe cargo "de sistema" nem flag de superusuário em
nenhum lugar do código.

**O que sobreviveu da auditoria, e é o problema real.** `z.string()` sem `enum` aceita um
nome de cargo **inexistente**. Com `role: 'typo'`:

1. `adminCrudHandler.js:97-105` roda `SELECT permissions FROM roles WHERE name = 'typo'`
2. `rows[0]` é `undefined`
3. `getRolePermissions(undefined)` devolve `[]` (`permissions.js:76`)
4. o `if` de permissão falha e o acesso é **negado**

O fail-closed funciona. O defeito é o oposto de escalada: um usuário com cargo legítimo
pode perder acesso por erro de digitação, sem mensagem que diga "cargo inexistente" — o
403 fala de permissão faltando, não de cargo inexistente.

**Agravante já documentado:** `.default('admin')` em `users.js:10`. Pela interface
ele é inatingível (`AdminUsersTab.js:14` exige `role` com `min(1)` e o select abre em
`value=""`), mas um POST direto sem `role` cria administrador sem ninguém pedir.

**Desalinhamento documental:** [`ADR-0005`](0005-jwt-http-only-rbac.md:20-22) diz que o
handler exige "papel de admin **e** a permissão específica". O código faz **ou**: com
`requireAdmin = false` (`adminCrudHandler.js:53`), a permissão basta e `role === 'admin'`
pula a checagem (`:118`). `requireAdmin: true` existe em 2 das 15 rotas — a documentação
descreve uma conjunção onde há disjunção.

## Decisão

Mantemos autorização por **cargo e permissão**, na semântica já implementada: `requireAdmin`
é a exceção que exige `role === 'admin'`, e a permissão específica é o caminho padrão.
Não mudamos quem acessa o quê.

O que fazemos é **fechar a lacuna de integridade do nome do cargo**, sem tocar no modelo
de acesso:

1. `users.js` passa a validar `role` contra os cargos **existentes** no banco, em vez de
   aceitar string livre. Nome de cargo inexistente passa a ser erro de validação explícito,
   não um 403 confuso depois.
2. Removemos o `.default('admin')`. Sem `role`, a criação é rejeitada — o chamador tem que
   dizer qual cargo está concedendo.
3. `roles.js` passa a validar `permissions` contra a `permissionsList` congelada de
   `permissions.js:8-19`, hoje apenas `z.array(z.string())`. Permissão inventada hoje cria
   um cargo que não concede nada e não denuncia erro de digitação.
4. `adminCrudHandler.js:118` passa a ser **documentado em código** como comportamento
   intencional, para a próxima auditoria não tratá-lo como bug — foi o achado que três dos
   quatro modelos reportaram como falha.
5. `ADR-0005` é corrigido para descrever a disjunção real.

**Não** mudamos `requireAdmin` para `true`, **não** restringimos `?response=body`, e
**não** bloqueamos auto-concessão em `roles.js`. Ver "Alternativas consideradas".

## Alternativas consideradas

- **Tratar "criar admin" como escalada e fechar.** Descartado: contradiz o modelo de acesso
  declarado. Quem tem a permissão `Usuários` existe para gerenciar usuários e seus cargos;
  proibir o cargo `ADMIN` traria o `USUÁRIO C` da tabela de referência para fora.
- **Virar `requireAdmin` para `true` em todas as rotas.** Descartado por dano colateral
  desproporcional: `adminCrudHandler.js:53` afeta as 15 rotas, e as 13 com `permission` mas
  sem `requireAdmin` passariam a exigir `role === 'admin'`, **trancando `USUÁRIO D`**
  (cargo `POST / DICAS`) de editar posts e dicas. Pior: mascararia o defeito real de
  integridade do nome, fazendo a equipe acreditar que o problema de autorização está
  resolvido.
- **Bloquear auto-atribuição de permissão em `roles.js`.** Descartado por ser **dentro do
  modelo**: um cargo não pode conceder o que ele próprio não tem, ou nenhum cargo
  intermediário bornaria de um cargo restrito. O cargo `POST / DICAS` é justamente um cargo
  derivado. O risco aqui é integridade (permissão com nome errado), não autorização — e
  esse fica coberto pelo item 3 da Decisão.
- **Remover `?response=body` do login.** Descartado por escopo: é superfície de exposição de
  sessão, não de autorização, e só importa se algum consumidor externo o usar. Não há
  evidência de que exista.

## Consequências

### Positivas

- Cargo inexistente vira erro de validação nomeado, não um 403 que mente sobre a causa.
- `.default('admin')` removido: nenhum caminho cria administrador sem pedido explícito.
- Permissão com nome errado em `roles.js` é rejeitada na escrita, com a lista oficial como
  fonte da verdade.
- `adminCrudHandler.js:118` documentado como intencional: a próxima auditoria não gasta
  tempo reabrindo o mesmo falso positivo.
- `ADR-0005` corrigido: o registro passa a descrever a disjunção que o código implementa.

### Negativas e riscos

- **As escritas de `users.js` passam a consultar `roles` no banco** para validar o nome. É
  uma query a mais no caminho de criação/edição, dentro do mesmo `try` que já trata falha
  de banco como 403 (`adminCrudHandler.js:127-143`). Custo baixo, mas existe.
- **Um usuário cujo cargo foi apagado fica sem acesso**, sem nada no token que indique isso.
  A detecção depende do `if (permission)` e do fail-closed, não de um erro explícito.
- **O fail-closed mascarava o problema.** Um nome de cargo inválido produzia um 403
  convincente e difícil de diagnosticar. Corrigir a validação remove essa cobertura
  acidental; a partir de agora a falha é visível, e precisa estar no log.
- **A revisão de `?response=body` fica pendente** e registrada aqui, não resolvida.

## Revisão

Reavaliar se: (a) a validação de cargo em `users.js` passar a custar mais do que a query
extra justifica — aí evaluatei-se validar contra a lista de cargos do front em vez do
banco; (b) surgir consumidor externo de `?response=body`, o que reabre a decisão de
restringi-lo por IP confiável (`login.js:105-127`); (c) o modelo de acesso mudar para ter
cargos de sistema com privilégio que não se concede — situação em que este ADR precisa ser
substituído, não editado.