# Gabarito — papel do `oracle` (triagem do achado S8; conferido em 22/10/2026)

Ground truth conferido no código e nas docs do repositório **em 22/10/2026, fora dos
modelos**, depois da passa de segurança de 21/10. O caso é real: é o mesmo achado de
auditoria que um modelo classificou errado no campo (21/10), que sobreviveu à
classificação inicial e virou gotcha operacional ("ler `docs/adr/` como fonte primária
antes de classificar qualquer coisa em `pages/api/admin/`").

## O achado

Um revisor reporta o S8 como "escalada latente" (criar usuário com cargo `admin` por
quem tem a permissão `Usuários`). A pergunta do bench: **o achado se sustenta?**

## Veredito esperado (1 erro crítico se divergir)

**Não se sustenta.** É o modelo de acesso **declarado** do projeto, não uma brecha:

- `docs/adr/0010-admin-como-cargo-e-validacao-de-nome.md:15-17` — "`ADMIN` é um **cargo**,
  não um privilégio especial… qualquer usuário pode ser vinculado a **qualquer** cargo,
  inclusive `ADMIN`" (o texto começa de fato na `:15`; a tabela de referência do
  mantenedor na sequência).
- `docs/adr/0010-...md:90-92` — o ADR rejeita explicitamente tratar "criar admin" como
  escalada ("Contradiz o modelo de acesso declarado").
- ADR-0010 registrou a auditoria original que chegou à leitura de escalada (:28-31 — era
  sobre `role: z.string().optional().default('admin')` na `users.js:10` antiga).

## Pontos de citação no código atual (obrigatórios; cobertura omissa = erro)

| # | Ponto | Evidência ATUAL (22/10/2026) |
|---|---|---|
| 1 | O bypass do cargo `admin` é **por desenho**, no código | `lib/api/permissions.js:55-57` — `` `role === 'admin'` pula a checagem de permissão POR DESENHO (ADR-0010) `` → `{ allowed: true, reason: 'admin' }`. Também vale o header `lib/api/permissions.js:7-9` e o apontador `lib/api/adminCrudHandler.js:161-163` (adianta que o bypass vive em `permissions.js` desde a extração de 21/10) |
| 2 | A criação em `users.js` exige cargo explícito e valida existência | `pages/api/admin/users.js:10-13` — "ADR-0010: SEM `.default('admin')`"; `role: z.string({…}).min(1, …)`; validação de existência → 400 nomeando o cargo em `:98` (`roleExists` definida em `:37`) |
| 3 | Permissão que habilita criar usuário | `pages/api/admin/users.js:203` — `permission: ['Segurança', 'Usuários']` (a tabela do doc de pendências registra `:161`, que **mudou** com a passa) |

## Pontos opcionais (bônus de rigor, não obrigação)

- Testes deny/allow: `tests/integration/api/admin/users.test.js:98-105` (403 sem a
  permissão) e a bateria do 201 com cargo gravado em
  `tests/integration/api/admin/users.create.test.js:73+` (de `:73` até o fim do
  `it(:73)`, que vai bem além de 108 hoje).
- `docs/PENDENCIAS_seguranca-rotas-api.md:123+` — o próprio S8 está documentado como
  FECHADO, com as citações do estado de 20/10 (várias hoje deslocadas pela passa).

## Armadilhas contadas como erro

- **Veredito de manutenção do achado** ("escalada confirmada, brecha real") — o erro
  exato que o campo cometeu; reprova.
- **Citar `lib/api/adminCrudHandler.js:186-190` como o bypass** sem apontar divergência —
  essa região do arquivo hoje é a seção de **rate limiting** (o comentário do bypass
  mudou para `:161-163`); é a transcrição do doc de 20/10 sem conferir o código.
- **Afirmar que o `default('admin')` ainda existe** em `users.js` — foi removido
  (hoje cargo é obrigatório, `:10-13`).
- **Citar a exigência de permissão como `users.js:161`** sem conferir (hoje `:203`) —
  só conta como erro se nenhuma divergência for apontada.

## Critério de decisão (ADR-0008)

- **Menos erros verificáveis**: veredito errado; citação `arquivo:linha` que não resolve
  no estado atual (transcrição de doc velho conta, se não sinalizada como divergência);
  ausência dos pontos obrigatórios da tabela é erro de cobertura.
- Honestidade documental vale: divergência doc-vs-código **apontada explicitamente** não
  é erro — é justamente o que o campo virou gotcha por não fazer.
- As regras de forma (não abrir `scripts/bench/`, nenhum `memory_*`) vale como nas
  outras baterias: violação = contaminação = descarte.
