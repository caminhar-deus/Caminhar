# Pendências — Segurança das rotas de API

**Escopo:** defeitos levantados nas baterias de medição de modelo (19/10/2026) e **não
implementados**, porque a correção muda comportamento de rotas públicas e merece
revisão própria. A revisão de 20/10 reclassificou um item (o **S8**, que não é defeito) e
apertou o diagnóstico de dois outros (o **S4** e o **S5**).

**Origem dos achados:** a bateria de papel do `fixer` (`scripts/bench/papeis/`) rodou a
tarefa "corrija o vazamento de `error.message` em rota pública" e o
`orchestrator-bench` auditou a superfície de autenticação de `pages/api/`. **Todos os
itens abaixo foram reconferidos no código** — em `arquivo:linha` —, não repassados do
que o modelo afirmou. Onde o modelo errou, está registrado.

**Revisão de 20/10/2026 (estrutura de permissões):** os itens foram revistos contra o
modelo de acesso declarado em [`docs/adr/0010`](adr/0010-admin-como-cargo-e-validacao-de-nome.md)
(`ADMIN` é um cargo comum, não um privilégio especial) e contra a semeadura de cargos
(`scripts/migrations/018-seed-default-roles.js`). **O diagnóstico mudou em três itens:**
o **S8 não é defeito** (é a decisão do ADR-0010, e está testado como tal), e o **S4 e o S5**
passaram de "será que é intencional?" para omissão **com alvo identificado** — a permissão
que faltava existe e já é usada em outro lugar do painel.

**Já implementados (para contraste):** o rate limit de `/api/auth/login` (por IP em
`proxy.js:27-29` + matcher em `proxy.js:96-98`, e por usuário em
`pages/api/auth/login.js:51,82`), o par deny/allow de RBAC nos 9 endpoints `admin/` com
`permission` (`docs/adr/0010`), e o CSP sandbox de `/uploads/*`
(`next.config.js:175-180`).

**O modelo de permissões, em uma linha:** a lista oficial é `permissionsList`
(`lib/domain/permissions.js:11-22`, 10 permissões congeladas); a autorização é por
**cargo + permissão**, com semântica de **OU** (`adminCrudHandler.js:191` —
`requiredPermissions.some(...)`) e com o cargo `admin` passando por cima da checagem de
permissão **por desenho** (`adminCrudHandler.js:186-190`, documentado no ADR-0010).

---

## S1 — `pages/api/status.js` expõe a mensagem do banco em rota pública

| | |
|---|---|
| **Estado atual** | **ABERTO.** A rota é **pública** (sem `withAuth` nem `requireAuth` — conferido: `pages/api/status.js` não importa nenhum dos dois). No `catch` do health check ela coloca a mensagem crua do driver na resposta: `pages/api/status.js:61` — `status.data.database.details.error = error.message;`. |
| **Impacto** | Qualquer requisição GET a `/api/status` durante uma falha de banco devolve o texto do driver do Postgres — tipicamente host, porta e usuário (`connect ECONNREFUSED 10.0.0.5:5432 - password authentication failed for user "..."`). É informação de infraestrutura para um atacante, e a rota não exige nada para responder. O `status.data.database.status` = `'error'` e o HTTP **200** estão corretos (é health check) e **não** devem mudar. |
| **Correção proposta** | Trocar `error.message` por uma mensagem fixa e genérica, mantendo `status: 'error'` e o 200. O erro cru continua registrado no servidor pela camada de banco (`lib/infra/db.js:281`), então o diagnóstico não se perde. |
| **Teste que falta** | `tests/integration/api/status.test.js` cobre hoje o 200 e `status === 'error'` (`:31-35`), mas **não** cobre que a mensagem do banco não aparece no corpo. Sem esse teste, a regressão volta em silêncio. |

## S2 — `pages/api/status.js` expõe diagnóstico do processo em rota pública

| | |
|---|---|
| **Estado atual** | **ABERTO.** A mesma rota pública devolve, em `GET /api/status` (sem `?mode=health`): `environment` (`NODE_ENV`) em `status.js:31`, `nodeVersion` em `:41`, `platform` em `:42`, `uptime` em `:43` e métricas de memória (`rss`, `heapTotal`, `heapUsed`) em `:45-47`. |
| **Impacto** | Exposição de versão do Node e de fingerprinting do processo por uma rota sem autenticação. A versão do Node, em especial, reduz o espaço de ataque: permite casar a versão com CVEs conhecidas. |
| **Impacto (uso legítimo)** | `load-tests/performance/stress-test-combined.js:131` consome `/api/status` **sem** `?mode=health`; e o comentário do próprio arquivo (`:44`) diz que as métricas de memória existem "para monitoramento via k6 (P4)". Ou seja: há um consumidor que depende desses dados. A correção **não** pode ser "remover os campos" sem decidir o que o k6 passa a ler. |
| **Correção proposta** | Decidir o contrato: ou `/api/status` deixa de ser público e passa a exigir token, ou os dados sensíveis (versão, fingerprint) saem e ficam só em `?mode=health` — o que exige ajustar o `stress-test-combined.js` junto. |
| **Ação necessária** | Decisão do mantenedor sobre o contrato da rota, porque as duas saídas mexem em consumidores diferentes. |

## S3 — `pages/api/helper/pagination.js` é código vivo dentro de `pages/api/`

| | |
|---|---|
| **Estado atual** | **ABERTO.** O arquivo **não** é código morto: é importado por duas rotas de produção (`pages/api/dicas.js:3` e `pages/api/products.js:5`) e o `knip` **não** o acusa, porque o import existe. Mas, por estar dentro de `pages/api/`, o Next o registra como rota estática: `/api/helper/pagination` aparece em `.next/routes-manifest.json`. O arquivo não tem `export default` (só três exports nomeados, `pages/api/helper/pagination.js:20,43,58`), então a rota não tem handler e responde 500. |
| **Impacto** | Um endpoint público que só devolve 500 — superfície desnecessária, e um 500 em rota que o health check do load test (`load-tests/functional/health-check.js:11`) não cobre porque usa `?mode=health`. O achado é do modelo `minimax-2` e **bateu**: o erro dele foi na contagem ("32 rotas registradas"; são 31), não neste ponto. |
| **Correção proposta** | Mover o módulo para `lib/` e ajustar os dois imports (`pages/api/dicas.js:3`, `pages/api/products.js:5`). **Não remover**: é código vivo. A alternativa seria manter no lugar e aceitar o endpoint 500, o que é pior. |
| **Ação necessária** | Ajustar os imports e o caminho do módulo; verificar se algum teste importa o caminho antigo. |

## S4 — `pages/api/products.js` não confere a permissão `Gestão de Produtos` nas escritas

| | |
|---|---|
| **Estado atual** | **ABERTO — omissão confirmada (revisão de 20/10).** O `GET` sem `?public=true` e o `GET` com `?public=true` separam (`pages/api/products.js:190-198`), mas `POST`, `PUT` e `DELETE` exigem **apenas token**: `requireAuth` (`:65-80`) valida o JWT e nada mais — o arquivo **não menciona `role`, `permission` nem `requireAdmin` em lugar nenhum** (conferido por busca no arquivo inteiro). `POST` (`:203`), `PUT` (`:207`) e `DELETE` (`:211`) ficam abertos a qualquer usuário autenticado, inclusive `role: 'user'` (que tem só `Visão Geral` — `scripts/migrations/018-seed-default-roles.js:41`). |
| **Por que é omissão, e não desenho** | A permissão **`Gestão de Produtos` existe** em `permissionsList` (`lib/domain/permissions.js:16`) — e é exatamente ela que o painel usa para esconder a aba de produtos do usuário sem permissão (`pages/admin.js:567` e `pages/admin.js:879`, `hasPermission('Gestão de Produtos')`). Ou seja: **a permissão é exigida só no cliente**. A rota que faz a escrita (`components/Admin/AdminProducts.js:149`, `apiEndpoint="/api/products"`, e o reorder em `:161`) não confere nada além do token. Some a isso que **não existe `pages/api/admin/products.js`** — o CRUD de produtos é o único da API admin sem rota própria —, enquanto `README.md:91` anuncia "API admin (15): CRUD de posts, músicas, vídeos, **produtos**, dicas…". O padrão do resto do projeto: `admin/posts.js:138` exige `Posts/Artigos`, `admin/dicas.js` exige `Gestão de Dicas`, `admin/fetch-ml.js:161` exige `Gestão de Produtos`. |
| **Impacto** | Um usuário com qualquer token válido — inclusive `role: 'user'`, o mais restrito — cria, altera e apaga o catálogo de produtos. A barreira existe na interface e **não** existe na API: chamar a rota direto contorna o `hasPermission`. |
| **Correção proposta** | Exigir a permissão `Gestão de Produtos` no servidor, no mesmo padrão de `admin/posts.js:138` — e escrever o teste de negação no par deny/allow de `docs/adr/0010`. |
| **Ação necessária** | **Decisão do mantenedor sobre qual rota sobrevive:** (a) criar `pages/api/admin/products.js` com `permission: 'Gestão de Produtos'` e apontar o painel para ela, **ou** (b) aplicar a permissão direto em `pages/api/products.js`. A (a) é mais consistente com o resto da API admin; a (b) é menor. O que **não** está em discussão é que a escrita precisa de servidor, e não só de interface. |

## S5 — `pages/api/posts.js` mantém um caminho de escrita sem permissão, duplicado do que já é guardado

| | |
|---|---|
| **Estado atual** | **ABERTO — caminho duplicado (revisão de 20/10).** O `POST` aplica `withAuth` (`pages/api/posts.js:152`), que valida o token mas **não** o cargo — o arquivo não menciona `role` nem `admin`. O `GET` é público por desenho (`:18-19`). |
| **Por que importa** | O painel **não** usa essa rota: `components/Admin/AdminPosts.js:230` aponta para `/api/admin/posts`, que exige `Posts/Artigos` (`pages/api/admin/posts.js:138`). Ou seja, existe **um caminho guardado e um caminho não guardado** para a mesma criação de post — e o conteúdo do post é público (`published` é campo aceito no schema, `pages/api/posts.js:116`). Nenhum consumidor legítimo de `POST /api/posts` foi encontrado: o front faz só `GET` (`components/Features/Blog/BlogSection.js:8`) e os load tests só leem. |
| **Impacto** | Qualquer usuário autenticado cria e publica post por uma rota que ninguém usa — superfície de escrita desnecessária e sem guarda. |
| **Correção proposta** | Duas saídas, ambas baratas: (a) exigir `Posts/Artigos` no `POST` público, ou (b) **remover** o `POST` de `pages/api/posts.js`, já que o `admin/posts.js` cobre o caso — o que também tornaria o título do teste existente verdadeiro: `tests/integration/api/posts.integration.test.js:93` se chama "deve rejeitar métodos não GET", mas só exercita o `PUT` (o `POST` não é testado). |
| **Ação necessária** | **Decisão do mantenedor:** guardar ou remover. Se remover, conferir o `cypress/support/commands.js:23`, que intercepta `POST /api/posts`. |

## S6 — `pages/api/auth/logout.js` aceita qualquer método HTTP

| | |
|---|---|
| **Estado atual** | **ABERTO.** O handler não checa `req.method`: `pages/api/auth/logout.js:3` vai direto para revogar o refresh token e limpar os cookies. Um `GET` desloga a sessão. |
| **Impacto** | Deslogar por navegação: `<img src="/api/auth/logout">` numa página de terceiro desloga a sessão do usuário. O cookie de auth é `SameSite=Lax` (`lib/auth/auth.js:201`) e o de refresh é `SameSite=Strict` (`:170`), então a requisição chega no contexto de navegação de topo. A consequência é negação de serviço de sessão, não exposição de dado. |
| **Correção proposta** | Aceitar só `POST` (ou `GET`+`POST` explícito) e responder 405 nos demais, como `pages/api/status.js:11-16` já faz. |
| **Ação necessária** | Verificar se algum consumidor faz `GET` no logout (o `pages/admin.js` ou o frontend). |

## S7 — `pages/api/auth/check.js` e `refresh.js` sem rate limit

| | |
|---|---|
| **Estado atual** | **ABERTO.** Só `pages/api/auth/login.js` tem rate limit (`:51` por IP, `:82` por usuário). `auth/check.js` e `auth/refresh.js` não têm nenhum: não importam `checkRateLimit`. O matcher do `proxy.js` (`:96-98`) cobre **apenas** `/api/auth/login`. |
| **Impacto** | `check.js` valida um JWT a cada chamada e `refresh.js` renova token — ambos sem limite de tentativas, em rota pública. A magnitude depende de quanto cada uma custa ao servidor; `check.js` faz verificação de assinatura, que é barata. É a lacuna que o `proxy.js` já treatou para o `login` (o matcher dele cobre **só** `/api/auth/login`) e que não foi tratada nos outros dois. |
| **Correção proposta** | Rate limit por IP nos dois, no mesmo padrão do `login`. |
| **Ação necessária** | Decidir o limite. Atenção ao `refresh.js`: um limite por IP afeta usuários atrás de NAT compartilhado. |

## S8 — `pages/api/admin/users.js` aceita qualquer cargo existente → **FECHADO: não é defeito**

**Reclassificado em 20/10/2026.** Este item estava registrado como "escalada latente".
**A classificação estava errada:** não é uma brecha condicional nem um risco
latente — é o **comportamento declarado e testado** do modelo de acesso. Sai da lista
de pendências e passa a ser registro de decisão.

| | |
|---|---|
| **O que o código faz** | Na criação de usuário, o cargo é validado contra a **existência** (`roleExists`, `pages/api/admin/users.js:86`) e nada mais: `:82` (desestruturação do corpo validado), `:86` (só existência) e `:97` (`createRecord` grava o cargo como veio) aceitam qualquer cargo já cadastrado, inclusive `admin`. Quem chega à rota precisa da permissão `Segurança` **ou** `Usuários` (`pages/api/admin/users.js:161`, semântica de OU em `adminCrudHandler.js:191`). |
| **Por que isso é o modelo, e não uma brecha** | O [`ADR-0010`](adr/0010-admin-como-cargo-e-validacao-de-nome.md) **declara** o modelo de acesso: "`ADMIN` é um **cargo**, não um privilégio especial… qualquer usuário pode ser vinculado a **qualquer** cargo, inclusive `ADMIN`" (`:16-18`), com uma tabela de referência de usuários e cargos (`:20-26`) em que o `USUÁRIO C` é `ADMIN`. E o ADR **rejeitou explicitamente** a leitura de escalada: "**Tratar 'criar admin' como escalada e fechar.** Descartado: contradiz o modelo de acesso declarado. Quem tem a permissão `Usuários` existe para gerenciar usuários e seus cargos; proibir o cargo `ADMIN` traria o `USUÁRIO C` da tabela de referência para fora." (`:90-92`). Não existe cargo de sistema nem flag de superusuário em lugar nenhum do código (`:38-39`) — `admin` é uma linha da tabela `roles`, semeada como qualquer outra (`scripts/migrations/018-seed-default-roles.js:54`, com `permissionsList` serializado). |
| **O comportamento está documentado no código** | `lib/api/adminCrudHandler.js:186-190`: o cargo `admin` pula a checagem de permissão **por desenho** — "não é bug de autorização nem escalada de privilégio. Ver ADR-0010". O `ADR-0010` decidiu isso no item 4 (`:80-82`): documentar em código, para que a próxima auditoria não reabra o mesmo falso positivo. Foi exatamente isso que aconteceu aqui — a auditoria de modelo reabriu o ponto sem ler o ADR. |
| **O comportamento está testado** | Lado da negação: `tests/integration/api/admin/users.test.js:98-105` (cargo `comum` sem a permissão → **403**) e `:287-297` (cargo `editor` com `['Posts/Artigos','Configurações']` → **403**). Lado da permissão: `tests/integration/api/admin/users.create.test.js:73-108` (permissões `['Segurança','Usuários']` → **201**, com `role` gravada e senha hasheada). O par deny/allow está no padrão descrito em `docs/PENDENCIAS_scripts_testes.md`. |
| **O que a semeadura garante** | `scripts/migrations/018-seed-default-roles.js:54` semeia `admin` (todas as permissões) e `user` (só `Visão Geral`, `:41`). Com esses dois cargos, um `user` **não** alcança `/api/admin/users` — a rota exige `Segurança` ou `Usuários` (`:161`), que o `user` não tem. |
| **E se o mantenedor mudar o modelo?** | O próprio ADR prevê isso: "o modelo de acesso mudar para ter cargos de sistema com privilégio que não se concede — situação em que este ADR precisa ser **substituído**, não editado" (`:137-139`). Se um dia `admin` deixar de ser "cargo comum com todas as permissões", aí sim este item reabre — e a correção passa a ser o que o ADR proíbe hoje: restringir a criação a cargos que o autor pode conceder. |
| **Ação necessária** | **Nenhuma.** Item fechado por decisão de projeto. Se um dia o modelo mudar, reabrir pelo gatilho acima. |

## S9 — `pages/api/admin/fetch-spotify.js` e `fetch-ml.js` devolvem `error.message`

| | |
|---|---|
| **Estado atual** | **ABERTO.** `pages/api/admin/fetch-spotify.js:116` e `pages/api/admin/fetch-ml.js:155` devolvem a mensagem crua do erro. |
| **Impacto** | **Menor** que S1: as duas rotas são de `admin/`, com RBAC — só quem tem a permissão vê. Ainda assim, a mensagem do driver vai para o cliente de um admin, e um admin não precisa da mensagem do driver para agir. |
| **Ação necessária** |junto com S1, na mesma revisão de tratamento de erro. |

---

## O que **não** é pendência (verificado nesta rodada)

- **A criação de usuário aceitar o cargo `admin`** — **não é pendência: é o modelo de acesso declarado** ([`ADR-0010`](adr/0010-admin-como-cargo-e-validacao-de-nome.md)), documentado no código (`adminCrudHandler.js:186-190`) e coberto por teste deny/allow (`users.test.js:98-105` e `:287-297`; `users.create.test.js:73-108`). Ver S8.
- **O `role === 'admin'` passar por cima da checagem de permissão** — **não** é bug: é o item 4 da decisão do ADR-0010 (`:80-82`), documentado em `adminCrudHandler.js:186-190`.
- **`pages/api/status.js` com `error.message`** — é o S1, aberto.
- **O `405` do gabarito do bench** — não é bug do projeto: o gabarito de `scripts/bench/orchestrator/` é do **bench**, e os três modelos medidos erram o item. Está registrado no `docs/adr/0008`.
- **`helper/pagination.js` como "código morto"** — **não** é: é importado por duas rotas de produção. O achado correto é o S3 (código vivo no lugar errado), não código morto.
- **A contagem de rotas** — o modelo `minimax-2` afirmou "32 rotas registradas pelo Next"; o `.next/routes-manifest.json` registra **31** rotas em `/api/` (30 com handler + `helper/pagination`, que não tem). O gabarito do bench está certo; o modelo errou.
- **A "escalada" em `admin/users.js` e `admin/roles.js`** — **não** é escalada: `ADMIN` é cargo comum (ADR-0010), e `roles.js` valida as permissões contra a lista oficial (`permissionsList`, `roles.js:14-28`), o que impede permissão com nome errado.
