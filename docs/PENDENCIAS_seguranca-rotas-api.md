# Pendências — Segurança das rotas de API

**Escopo:** defeitos levantados nas baterias de medição de modelo (19/10/2026) e **não
implementados**, porque a correção muda comportamento de rotas públicas e merece
revisão própria. A revisão de 20/10 reclassificou um item (o **S8**, que não é defeito) e
apertou o diagnóstico de dois outros (o **S4** e o **S5**).

**Execução de 21/10/2026:** o dono aprovou a ordem de aplicação
(`A1 → B1+B2 → A2+A3+A4+A5+A6 → C1`). Os itens já aplicados nesta rodada estão marcados
**RESOLVIDO** com a data e com o que foi feito; os que dependem de decisão ou ainda não
foram aplicados seguem **ABERTO**. As decisões do dono que mudaram o plano original:
**B1** — aplicar a permissão `Gestão de Produtos` no servidor, direto em
`pages/api/products.js` (não criar `pages/api/admin/products.js`); **B2** — remover o
`POST` público de `/api/posts` (não apenas guardá-lo); **C1** — `?mode=health` continua
público e o diagnóstico passa a exigir token.

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

**Reanálise de 21/10/2026 (após os ajustes da outra sessão):** os itens foram reconferidos
no código **depois** das mudanças de 21/10 (`pages/api/products.js` com o branch de
reordenação, `admin/posts.js` e `admin/videos.js` com registro de Auditoria, e os documentos
de arquitetura `ARQUITETURA_SITE_PUBLICO.md` / `ARQUITETURA_SITE_PRIVADO.md`). **Resultado:
nenhum achado foi resolvido** — S1, S2, S3, S5, S6, S7 e S9 seguem como estavam (os arquivos
desses achados não foram tocados). **O S4 ficou mais forte** (a superfície de escrita sem
guarda passou de 3 para 4 operações) e **um achado novo entrou: o S10** (falta de proteção do
usuário `admin` e do cargo `admin` na API), que a outra sessão já tinha registrado no
documento da área privada (`ARQUITETURA_SITE_PRIVADO.md` §8, item 8) sem implementá-lo.
O **S8 continua fechado** — o `ADR-0010` e o código de `admin/users.js` e `admin/roles.js` não
mudaram.

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
| **Estado atual** | **RESOLVIDO em 21/10/2026.** A mensagem crua do driver saiu da resposta: `details.error` passou a ser uma mensagem fixa (`'Falha ao conectar ao banco de dados'`), com o `status: 'error'` e o HTTP **200** mantidos. O erro original continua no log do servidor — a camada de banco (`lib/infra/db.js`) já registra o `logger.error` com o erro cru. **O teste que faltava foi escrito:** `tests/integration/api/status.test.js` agora afirma que a mensagem do banco **não** aparece no corpo, o que impede a regressão de voltar em silêncio. |
| **Impacto** | Qualquer requisição GET a `/api/status` durante uma falha de banco devolve o texto do driver do Postgres — tipicamente host, porta e usuário (`connect ECONNREFUSED 10.0.0.5:5432 - password authentication failed for user "..."`). É informação de infraestrutura para um atacante, e a rota não exige nada para responder. O `status.data.database.status` = `'error'` e o HTTP **200** estão corretos (é health check) e **não** devem mudar. |
| **Correção proposta** | Trocar `error.message` por uma mensagem fixa e genérica, mantendo `status: 'error'` e o 200. O erro cru continua registrado no servidor pela camada de banco (`lib/infra/db.js:281`), então o diagnóstico não se perde. |
| **Teste que falta** | — (resolvido em 21/10/2026). O teste foi escrito: a falha do banco é montada com uma mensagem reconhecível e o caso afirma que ela **não** aparece no corpo JSON. |

## S2 — `pages/api/status.js` expõe diagnóstico do processo em rota pública

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** A rota foi **dividida**: `?mode=health` continua **público** (sem token, sem permissão) e é o que o health check de infraestrutura e o k6 usam; o **diagnóstico** (sem `?mode=health`) passou a exigir **token válido** — sem token ou com token inválido, responde 401. O payload do diagnóstico **não mudou**: as métricas de memória continuam lá, agora atrás de autenticação. A rota não exige permissão nem cargo — é diagnóstico, não painel. O consumidor que quebrava foi ajustado: o cenário k6 `memory_monitor` passou a receber o `data` do `setup()` e a enviar o token (e, sem token, sai sem fazer a requisição, como o `stress_test` já fazia). **Decisão do dono:** separar — proteger a rota inteira quebraria o health check público sem necessidade. |
| **Impacto** | Exposição de versão do Node e de fingerprinting do processo por uma rota sem autenticação. A versão do Node, em especial, reduz o espaço de ataque: permite casar a versão com CVEs conhecidas. |
| **Impacto (uso legítimo)** | `load-tests/performance/stress-test-combined.js:131` consome `/api/status` **sem** `?mode=health`; e o comentário do próprio arquivo (`:44`) diz que as métricas de memória existem "para monitoramento via k6 (P4)". Ou seja: há um consumidor que depende desses dados. A correção **não** pode ser "remover os campos" sem decidir o que o k6 passa a ler. |
| **Correção proposta** | — (aplicada em 21/10/2026). O contrato escolhido foi o terceiro caminho: `?mode=health` público, diagnóstico com token. |
| **Ação necessária** | — (resolvido em 21/10/2026). O dono escolheu a separação; o único consumidor afetado (`memory_monitor` do k6) foi ajustado. |

## S3 — `pages/api/helper/pagination.js` é código vivo dentro de `pages/api/`

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** O módulo foi movido de `pages/api/helper/pagination.js` para `lib/api/pagination.js` — fora de `pages/api/`, o Next não o registra mais como rota. Os dois importadores foram ajustados (`pages/api/dicas.js`, `pages/api/products.js`) e nenhum import do caminho antigo sobrou. **Verificado no manifest regerado:** a rota `/api/helper/pagination` não existe mais e o total de rotas em `/api/` caiu de 31 para **30**. A varredura de `pages/api/` confirma que **nenhum** arquivo ali ficou sem `export default` — a condição que criou o endpoint 500 não existe mais. |
| **Impacto** | Um endpoint público que só devolve 500 — superfície desnecessária, e um 500 em rota que o health check do load test (`load-tests/functional/health-check.js:11`) não cobre porque usa `?mode=health`. O achado é do modelo `minimax-2` e **bateu**: o erro dele foi na contagem ("32 rotas registradas"; são 31), não neste ponto. |
| **Correção proposta** | Mover o módulo para `lib/` e ajustar os dois imports (`pages/api/dicas.js:3`, `pages/api/products.js:5`). **Não remover**: é código vivo. A alternativa seria manter no lugar e aceitar o endpoint 500, o que é pior. |
| **Ação necessária** | — (resolvido em 21/10/2026). |

## S4 — `pages/api/products.js` não confere a permissão `Gestão de Produtos` nas escritas

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** A permissão `Gestão de Produtos` passou a ser exigida **no servidor**, em todas as operações de painel da rota: `GET` sem `?public=true` (o que devolve rascunhos), `POST`, `PUT` (incluindo o branch de reordenação) e `DELETE`. O `GET` com `?public=true` **continua público** — é o que o site público consome. A checagem saiu de dentro do `adminCrudHandler` para um módulo compartilhado, `lib/api/permissions.js` (`checkRolePermission`), usado agora pelas duas rotas — sem mudar o comportamento observável das 14 rotas `admin/`. O bypass do cargo `admin` continua valendo por desenho (ADR-0010). **Decisão do dono:** aplicar a permissão direto em `/api/products`, sem criar `/api/admin/products.js`. |
| **Por que é omissão, e não desenho** | A permissão **`Gestão de Produtos` existe** em `permissionsList` (`lib/domain/permissions.js:16`) — e é exatamente ela que o painel usa para esconder a aba de produtos do usuário sem permissão (`pages/admin.js:567` e `pages/admin.js:879`, `hasPermission('Gestão de Produtos')`). Ou seja: **a permissão é exigida só no cliente**. A rota que faz a escrita (`components/Admin/AdminProducts.js:149`, `apiEndpoint="/api/products"`, e o reorder em `:161`) não confere nada além do token. Some a isso que **não existe `pages/api/admin/products.js`** — o CRUD de produtos é o único da API admin sem rota própria —, enquanto `README.md:91` anuncia "API admin (15): CRUD de posts, músicas, vídeos, **produtos**, dicas…". O padrão do resto do projeto: `admin/posts.js:138` exige `Posts/Artigos`, `admin/dicas.js` exige `Gestão de Dicas`, `admin/fetch-ml.js:161` exige `Gestão de Produtos`. |
| **Impacto** | Um usuário com qualquer token válido — inclusive `role: 'user'`, o mais restrito — cria, altera e apaga o catálogo de produtos. A barreira existe na interface e **não** existe na API: chamar a rota direto contorna o `hasPermission`. |
| **Correção proposta** | Exigir a permissão `Gestão de Produtos` no servidor, no mesmo padrão de `admin/posts.js:138` — e escrever o teste de negação no par deny/allow de `docs/adr/0010`. |
| **Ação necessária** | — (resolvido em 21/10/2026). O dono escolheu a opção (b): a permissão foi aplicada direto em `pages/api/products.js`, sem criar rota nova na API admin. |

## S5 — `pages/api/posts.js` mantém um caminho de escrita sem permissão, duplicado do que já é guardado

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** O `POST` público foi **removido**: `pages/api/posts.js` ficou somente leitura e responde 405 a qualquer método que não seja GET. A criação de post é feita só pelo painel, em `/api/admin/posts`, que exige a permissão `Posts/Artigos`. Nenhum consumidor legítimo do `POST` existia (o front só lê; os load tests só leem). O comando morto `cy.createPost` foi removido junto, e o caso de 405 que o helper pulava (`skipMethodNotAllowed: true`) voltou a valer — a opção, que ficou sem chamador, foi removida do helper. **Decisão do dono:** remover o caminho, não apenas guardá-lo. |
| **Por que importa** | O painel **não** usa essa rota: `components/Admin/AdminPosts.js:230` aponta para `/api/admin/posts`, que exige `Posts/Artigos` (`pages/api/admin/posts.js:138`). Ou seja, existe **um caminho guardado e um caminho não guardado** para a mesma criação de post — e o conteúdo do post é público (`published` é campo aceito no schema, `pages/api/posts.js:116`). Nenhum consumidor legítimo de `POST /api/posts` foi encontrado: o front faz só `GET` (`components/Features/Blog/BlogSection.js:8`) e os load tests só leem. |
| **Impacto** | Qualquer usuário autenticado cria e publica post por uma rota que ninguém usa — superfície de escrita desnecessária e sem guarda. |
| **Correção proposta** | Duas saídas, ambas baratas: (a) exigir `Posts/Artigos` no `POST` público, ou (b) **remover** o `POST` de `pages/api/posts.js`, já que o `admin/posts.js` cobre o caso — o que também tornaria o título do teste existente verdadeiro: `tests/integration/api/posts.integration.test.js:93` se chama "deve rejeitar métodos não GET", mas só exercita o `PUT` (o `POST` não é testado). |
| **Ação necessária** | — (resolvido em 21/10/2026). O dono escolheu remover; o comando morto `cy.createPost` foi retirado junto. |

## S6 — `pages/api/auth/logout.js` aceita qualquer método HTTP

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** O handler agora aceita **apenas `POST`** e responde **405** nos demais métodos, no mesmo padrão de `pages/api/status.js`. A busca por consumidores de `GET /api/auth/logout` não achou nenhum — o que resolvia o caso do `<img src="/api/auth/logout">` de terceiro. |
| **Impacto** | Deslogar por navegação: `<img src="/api/auth/logout">` numa página de terceiro desloga a sessão do usuário. O cookie de auth é `SameSite=Lax` (`lib/auth/auth.js:201`) e o de refresh é `SameSite=Strict` (`:170`), então a requisição chega no contexto de navegação de topo. A consequência é negação de serviço de sessão, não exposição de dado. |
| **Correção proposta** | Aceitar só `POST` (ou `GET`+`POST` explícito) e responder 405 nos demais, como `pages/api/status.js:11-16` já faz. |
| **Ação necessária** | — (resolvido em 21/10/2026). Nenhum consumidor de `GET` foi encontrado. |

## S7 — `pages/api/auth/check.js` e `refresh.js` sem rate limit

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** As duas rotas passaram a ter rate limit por IP, no mesmo padrão do `login`: `pages/api/auth/check.js` (60 req/min, chave `api:auth:check`) e `pages/api/auth/refresh.js` (30 req/min, chave `api:auth:refresh`). O IP vem de `getClientIP`, que aplica o modelo `TRUST_PROXY` — nunca do `x-forwarded-for` cru. |
| **Impacto** | `check.js` valida um JWT a cada chamada e `refresh.js` renova token — ambos sem limite de tentativas, em rota pública. A magnitude depende de quanto cada uma custa ao servidor; `check.js` faz verificação de assinatura, que é barata. É a lacuna que o `proxy.js` já treatou para o `login` (o matcher dele cobre **só** `/api/auth/login`) e que não foi tratada nos outros dois. |
| **Correção proposta** | Rate limit por IP nos dois, no mesmo padrão do `login`. |
| **Ação necessária** | — (resolvido em 21/10/2026). Limites: 60 req/min em `check.js` e 30 req/min em `refresh.js`. O risco de NAT compartilhado segue valendo para `refresh.js`. |

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
| **Estado atual** | **RESOLVIDO em 21/10/2026.** As duas rotas (`pages/api/admin/fetch-spotify.js` e `pages/api/admin/fetch-ml.js`) agora separam o **erro de negócio** — que tem mensagem escrita à mão, como "Não foi possível identificar a música. Verifique se o link é válido." — do **erro inesperado**, que passou a devolver a mensagem genérica padrão do projeto, com o detalhe cru apenas no log do servidor. O `error.message` cru deixou de chegar ao cliente. |
| **Impacto** | **Menor** que S1: as duas rotas são de `admin/`, com RBAC — só quem tem a permissão vê. Ainda assim, a mensagem do driver vai para o cliente de um admin, e um admin não precisa da mensagem do driver para agir. |
| **Ação necessária** | — (resolvido em 21/10/2026), junto com o S1. |

## S10 — a API não protege o usuário `admin` nem o cargo `admin` (novo em 21/10)

| | |
|---|---|
| **Estado atual** | **RESOLVIDO em 21/10/2026.** A API agora recusa, com 400 nomeado: excluir o usuário administrador (identificado por `process.env.ADMIN_USERNAME`, com default `admin` — a mesma variável que o cria em `lib/auth/auth.js:361,374`), alterar o cargo desse usuário para algo diferente de `admin`, e excluir o cargo `admin`. No painel, o botão "Excluir" deixou de ser renderizado nas linhas protegidas (`canDelete` novo em `CrudTable`, repassado por `AdminUsersTab` e `AdminRolesTab`) — mas a garantia é a API, não a interface. A regra já existia escrita em `ARQUITETURA_SITE_PRIVADO.md` §9; o que faltava era a implementação. |
| **Onde já está registrado** | `docs/ARQUITETURA_SITE_PRIVADO.md` §8, item 8 ("Exclusão do admin"), com o status **aberto** e a marcação de "lacuna (falta implementar)" — e a regra de proteção correspondente em §9 ("Proteção do `admin`"). A regra **já existe**; o que falta é a implementação na API e a retirada do botão no painel. |
| **Impacto** | Um admin — ou qualquer um com a permissão `Usuários`/`Segurança` (a rota exige uma das duas, `users.js:161`) — pode remover o acesso administrativo do sistema. É o mesmo vetor do S8, pelo outro lado: o S8 diz que **vincular** `admin` é função da permissão; este diz que **desvincular e apagar** também é, e não há trava para nenhuma das duas. A diferença é que apagar o cargo `admin` **não é** recuperável pela interface (a semeadura da migração 018 é o que restaura `admin` e `user`, e só roda com `npm run migrate`). |
| **Correção proposta** | Na API: recusar a exclusão do usuário `admin` e do cargo `admin`, e recusar a alteração do cargo do usuário `admin` — com 400 nomeado, no padrão das validações existentes. No painel: não oferecer a ação nessas linhas. Regra do §9 do documento privado: "o usuário `admin` vem e permanece vinculado ao cargo `admin`; esse vínculo não pode ser alterado". |
| **Ação necessária** | — (resolvido em 21/10/2026). Executado antes do S4, como sugerido. |

---

## O que **não** é pendência (verificado nesta rodada)

- **A criação de usuário aceitar o cargo `admin`** — **não é pendência: é o modelo de acesso declarado** ([`ADR-0010`](adr/0010-admin-como-cargo-e-validacao-de-nome.md)), documentado no código (`adminCrudHandler.js:186-190`) e coberto por teste deny/allow (`users.test.js:98-105` e `:287-297`; `users.create.test.js:73-108`). Ver S8.
- **O `role === 'admin'` passar por cima da checagem de permissão** — **não** é bug: é o item 4 da decisão do ADR-0010 (`:80-82`), documentado em `adminCrudHandler.js:186-190`.
- **`pages/api/status.js` com `error.message`** — é o S1, aberto.
- **O `405` do gabarito do bench** — não é bug do projeto: o gabarito de `scripts/bench/orchestrator/` é do **bench**, e os três modelos medidos erram o item. Está registrado no `docs/adr/0008`.
- **`helper/pagination.js` como "código morto"** — **não** é: é importado por duas rotas de produção. O achado correto é o S3 (código vivo no lugar errado), não código morto.
- **A contagem de rotas** — o modelo `minimax-2` afirmou "32 rotas registradas pelo Next"; o `.next/routes-manifest.json` registra **31** rotas em `/api/` (30 com handler + `helper/pagination`, que não tem). O gabarito do bench está certo; o modelo errou.
- **A "escalada" em `admin/users.js` e `admin/roles.js`** — **não** é escalada: `ADMIN` é cargo comum (ADR-0010), e `roles.js` valida as permissões contra a lista oficial (`permissionsList`, `roles.js:14-28`), o que impede permissão com nome errado.
