# ADR-0017: A checagem de permissão é um módulo compartilhado, e a proteção por rota passa a ser conferida no servidor

- **Status:** Aceito
- **Data:** 2026-10-21
- **Decisores:** manutenção do projeto
- **Relacionados:** [ADR-0010](0010-admin-como-cargo-e-validacao-de-nome.md), [ADR-0005](0005-jwt-http-only-rbac.md), [ADR-0011](0011-erro-de-banco-503-e-refresh-token-fora-do-body.md), [`../../lib/api/permissions.js`](../../lib/api/permissions.js), [`../../lib/api/adminCrudHandler.js`](../../lib/api/adminCrudHandler.js), [`../../pages/api/products.js`](../../pages/api/products.js), [`../../pages/api/posts.js`](../../pages/api/posts.js), [`../../pages/api/status.js`](../../pages/api/status.js), [`../../pages/api/admin/users.js`](../../pages/api/admin/users.js), [`../../pages/api/admin/roles.js`](../../pages/api/admin/roles.js), [`../ARQUITETURA_SITE_PRIVADO.md`](../ARQUITETURA_SITE_PRIVADO.md) §9, [`../PENDENCIAS_seguranca-rotas-api.md`](../PENDENCIAS_seguranca-rotas-api.md)

## Contexto

Uma auditoria da superfície de `pages/api/` (20/10/2026) levantou uma classe de defeitos com a mesma raiz: **a autorização existia, mas não onde decides a ação**. Três fatos do código, conferidos em `arquivo:linha`:

1. **A permissão existia e era exigida só no cliente.** `Gestão de Produtos` está em `permissionsList` (`lib/domain/permissions.js:16`) e o painel a checa em `pages/admin.js:567,879` — mas a rota que escreve (`/api/products`) exigia apenas token (`requireAuth`, `pages/api/products.js:81`). Um `role: 'user'`, que só tem `Visão Geral`, criava, alterava, apagava e reordenava o catálogo. Não existe `pages/api/admin/products.js`: é o único CRUD da API admin sem rota própria, embora `README.md:91` anuncie "CRUD de … produtos".
2. **Havia dois caminhos para a mesma criação de post, um deles sem guarda.** O painel cria post em `/api/admin/posts`, que exige `Posts/Artigos` (`pages/api/admin/posts.js:143`); o `POST` público de `/api/posts` aceitava qualquer token autenticado. Nenhum consumidor legítimo do `POST` público existia.
3. **A regra de proteção do administrador existia escrita e não implementada.** `ARQUITETURA_SITE_PRIVADO.md` §9 diz que o usuário `admin` e o cargo `admin` não podem ser excluídos e que o vínculo do primeiro com o cargo `admin` não pode ser alterado — mas `admin/users.js` só recusava excluir a própria conta logada, e `admin/roles.js` não tinha trava nenhuma.

A causa de fundo da primeira e da segunda é a mesma: a checagem de permissão estava **presa** ao `createAdminHandler`, que só as rotas `admin/` usam. Uma rota fora do painel não tinha como conferir permissão sem duplicar a lógica — e duplicar lógica de segurança é como ela começa a divergir.

O `ADR-0010` já tinha fixado a **semântica** do modelo de acesso (`ADMIN` é um cargo comum; a permissão é a unidade de autorização; o bypass do `admin` é por desenho). Este ADR **não muda a semântica**: muda **onde a checagem vive** e **quais rotas passam a usá-la**.

## Decisão

**A checagem de permissão passa a ser um módulo compartilhado, e a proteção passa a ser conferida no servidor em cada rota que escreve.**

1. **`lib/api/permissions.js` passa a ser a única implementação da checagem.** A função `checkRolePermission(role, requiredPermissions)` consulta a tabela `roles`, normaliza com `getRolePermissions` (fail-closed), registra `logger.warn` quando o `permissions` do cargo está corrompido, **permite o cargo `admin` por desenho** (inclusive quando a leitura do banco falha) e devolve `{ allowed, reason, error }`. O `adminCrudHandler` passou a usá-la, e o comportamento observável das 14 rotas `admin/` **não mudou** — as mensagens de 403 e a assinatura do `logger.error` continuam as mesmas, porque a decisão de logar (e com que tag) continua no `adminCrudHandler`, que conhece o nome do handler.
2. **`/api/products` passa a exigir `Gestão de Produtos` no servidor** em toda operação de painel: o `GET` sem `?public=true` (que devolve rascunhos), `POST`, `PUT` (inclusive o branch `action: 'reorder'`, que reescreve o `position` de qualquer produto) e `DELETE`. O `GET` com `?public=true` **continua público**, sem token e sem permissão — é o que o site público consome.
3. **O `POST` público de `/api/posts` foi removido.** A rota ficou somente leitura, e a criação de post é feita só pelo painel, em `/api/admin/posts`. O comando de Cypress `cy.createPost`, que interceptava esse `POST` e não era usado por nenhum spec, foi removido junto.
4. **`/api/status` foi dividido**: `?mode=health` continua **público** (é o que o health check de infraestrutura e o k6 usam) e o **diagnóstico** passa a exigir token válido. O payload do diagnóstico não mudou — as métricas de memória continuam lá, agora atrás de autenticação. A rota não exige permissão nem cargo: é diagnóstico, não painel.
5. **A API passou a proteger o administrador**, implementando a regra que já estava escrita em `ARQUITETURA_SITE_PRIVADO.md` §9: recusar, com 400 nomeado, excluir o usuário administrador, alterar o cargo dele para algo diferente de `admin` e excluir o cargo `admin`. O usuário protegido é identificado por `process.env.ADMIN_USERNAME` (default `admin`) — a mesma variável que o cria em `lib/auth/auth.js:361,374`. No painel, o botão "Excluir" deixa de ser renderizado nas linhas protegidas; a garantia é a API, e a interface apenas evita a ação inútil.

## Alternativas consideradas

- **Criar `pages/api/admin/products.js` com `permission: 'Gestão de Produtos'` e apontar o painel para ela.** Mais consistente com as outras 14 rotas da API admin e com o que o `README.md` anuncia. **Descartada pelo dono** em favor de aplicar a permissão na rota existente: exigiria extrair os handlers de escrita de `pages/api/products.js`, montar o CRUD admin e migrar o painel — mais trabalho e mais risco de regressão para o mesmo resultado de segurança. O preço aceito é que o CRUD de produtos continua fora de `pages/api/admin/`, e o `README.md:91` segue descrevendo a API admin como se o tivesse.
- **Duplicar a checagem de permissão dentro de `pages/api/products.js`.** Descartada: duas implementações da mesma regra de segurança divergem com o tempo, e a divergência silenciosa é o pior modo de falha possível aqui. Extrair foi mais barato.
- **Guardar o `POST` de `/api/posts` com a permissão `Posts/Artigos` em vez de removê-lo.** Descartada pelo dono: nenhum consumidor legítimo existia, e a rota duplicada do painel era superfície de escrita sem uso. Remover elimina a superfície em vez de reforçá-la.
- **Proteger `/api/status` inteira, inclusive o `?mode=health`.** Descartada pelo dono: quebraria o health check público de infraestrutura (`load-tests/functional/health-check.js`) sem necessidade. A divisão mantém o endpoint público mínimo e protege só o diagnóstico.
- **Tirar do diagnóstico os campos sensíveis (versão do Node, `NODE_ENV`, memória) em vez de exigir token.** Descartada pelo dono: o cenário `memory_monitor` do k6 existe para monitorar memória (`load-tests/performance/stress-test-combined.js`), e remover os campos deixaria o monitoramento sem fonte.
- **Tratar a proteção do `admin` como não implementada por decision do dono e deixar a regra só no documento.** Descartada: a regra já estava escrita em `ARQUITETURA_SITE_PRIVADO.md` §9 como proteção do painel; a API recusava o que o painel devia recusar. A decisão aqui foi implementar a regra, não discuti-la.

## Consequências

### Positivas

- A regra de autorização do painel deixou de depender do `adminCrudHandler`: qualquer rota pode conferi-la, e há **uma** implementação.
- O `GET ?public=true` de `/api/products` continua público — a vitrine do site não pagou nada por isso.
- A proteção do administrador é do servidor: vale para quem chamar a API direto, não só para quem usa o painel.
- O `/api/status` deixa de expor fingerprinting do processo por rota anônima, sem quebrar o health check.
- A criação de post tem **um** caminho, e ele exige `Posts/Artigos`.
- Nenhum arquivo de `pages/api/` ficou sem `export default` — a condição que produzia a rota 500 (`/api/helper/pagination`) foi eliminada junto com o endpoint.

### Negativas e riscos

- **`/api/products` faz uma consulta extra à tabela `roles` por operação de painel.** É o preço de conferir permissão fora do `adminCrudHandler`; a mesma consulta já era feita pelas 14 rotas `admin/`.
- **O `memory_monitor` do k6 depende do token do `setup()`** — sem ele, o cenário sai sem fazer a requisição (e não gera falha). É o mesmo comportamento que o `stress_test` já tinha.
- **`/api/status` deixou de ser consultável sem token.** Consumidores externos que usassem a rota sem `?mode=health` passam a receber 401 — nenhum foi encontrado no repositório (só os dois scripts do k6, ambos ajustados).
- **O painel identifica o administrador pelo literal `admin`, a API por `ADMIN_USERNAME`.** Se a variável for mudada, a API continua correta e o painel volta a mostrar o botão "Excluir" na linha do administrador — a recusa volta a vir do servidor, com 400 nomeado. É a direção segura do desvio, mas é um desvio.
- **A checagem compartilhada passa a ser ponto único de falha de segurança.** Mudar `lib/api/permissions.js` muda o comportamento de 15 rotas de uma vez. Omitido de propósito: o `adminCrudHandler` mantinha a mensagem de 403 e a telemetria de falha de banco, e o comportamento observável das 14 rotas `admin/` foi conferido por suíte.

## Revisão

Reavaliar se: (a) a consulta extra à tabela `roles` em `/api/products` passar a custar mais do que o ganho de segurança — aí avaliar cache curto de permissões por cargo; (b) surgir uma terceira rota fora do painel que precise de RBAC — aí `lib/api/permissions.js` deixa de ser o ponto compartilhado e vira o padrão; (c) o dono decidir unificar o CRUD de produtos em `/api/admin/products.js`, o que faria este ADR conviver com a forma canônica da API admin; (d) o modelo de acesso mudar para ter cargos de sistema com privilégio que não se concede — situação em que o `ADR-0010` precisa ser substituído, não editado, e este ADR junto.
