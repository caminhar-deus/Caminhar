# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Não publicado]

### Adicionado

- **Instrumento do papel do `oracle`, em `scripts/bench/papeis/`: caso real S8, cujo veredito certo é "não se sustenta".** `tarefa-oracle.md` + `gabarito-oracle.md` medem o papel no seu traje: um "achado" de escalada de privilégio (o cargo `admin` aceito na criação/edição de usuário em `pages/api/admin/users.js`) que precisa ser **recusado com fundamentação** — modelo de acesso declarado (`ADR-0010:15-17/:63-67/:90-92`), bypass intencional (`lib/api/permissions.js:55-58`), `requireAdmin = false` por desenho (`lib/api/adminCrudHandler.js:120`), validação real do cargo (`users.js:100-105`), testes deny/allow conferidos, e as divergências doc×código que sim existem (README sem a tabela que o `ADR-0010:18` cita; `ARQUITETURA_SITE_PRIVADO.md:224` atrás do código). Ground truth conferido FORA do modelo.

- **Baterias de **papel** para `designer` e `fixer`, em `scripts/bench/papeis/`.** O bench do orchestrator mede o papel do agente primário, que é único; para os outros papéis o mecanismo é o inverso — o papel é o **agente** (`--agent designer`) e o modelo é o que se troca (`--model` sobrepõe o modelo do preset sem mudar prompt, skills nem permissões). Tarefas e gabaritos próprios por papel, porque as do orchestrator (auditoria de `pages/api/`) não têm relação com conformidade de token nem com correção de código. `designer`: conformidade de foco e contraste (o `:focus-visible` do `Button` usa só o `box-shadow` do anel, proibido por `MASTER.md:149-150`; a proibição do `--color-text-tertiary`; e os quatro usos do token no `Input`, um deles violando). `fixer`: vazamento de `error.message` em rota pública — e aqui o veredito **não** é a resposta do modelo: a correção de cada execução é reaplicada e a suíte rodada de verdade (o teste novo tem de falhar no código original, passar no corrigido, e a suíte inteira ficar verde).

- **Bench do papel do `orchestrator`, em `scripts/bench/orchestrator/`.** É a medição que o ADR-0008 apontava como evidência faltante e que nunca tinha sobrevivido: o script antigo morava em `/tmp/opencode/bench-orch/` e se perdeu com a limpeza do `/tmp`, e exigia `OPENCODE_API_KEY` porque chamava a API do Zen de fora — caminho que o free tier recusa ("can only be used from within OpenCode"). A versão nova roda `opencode run --model ... --format json --auto`, que abre uma **sessão real** pelo host com a credencial já guardada: **sem chave**, e mais fiel, porque medir o orchestrator por proxy (outro agente exercitando o papel) é a fraqueza que o ADR registra desde 15/10. `--model` troca só o agente primário — os subagentes seguem com os modelos do preset, o que isola a variável. A tarefa (`tarefa.md`) é uma auditoria de autenticação de `pages/api/` com gabarito conferido em `arquivo:linha` (`gabarito.md`: 32 arquivos, 31 rotas, quatro grupos de autenticação, e a rota cuja segurança vive no `next.config.js`); a `rubrica.md` separa o que o `conferir.js` mede sem juízo (delegou, citações válidas, contaminação) do que só julgamento humano mede (acerto, e a qualidade da orquestração — que é o alvo). A fraqueza é declarada: o gabarito precisa ficar no repositório e o modelo tem leitura do repositório inteiro, então a tarefa proíbe ler `scripts/bench/`, o runner reforça, e uma saída que mencione o diretório é marcada como **contaminada** — execução descartada, não nota zero. Saída em streaming e `--timeout-min` para que execução morta deixe evidência. Comandos: `npm run bench:orch:rodar` e `npm run bench:orch:conferir`. O `resultados/` foi para o `.gitignore` (exceção para o `.gitkeep`): são transcripts crus de sessão. **Dois achados do smoke test** ficaram registrados na `LEIA-ME.md` e na `rubrica.md`: (a) `opencode run` lançado via `spawn` do Node com o `stdio` padrão **trava lendo stdin** — zero bytes, nenhum processo, nenhum erro, enquanto o mesmo comando do bash passa; o `spawn` precisa de `stdio: ['ignore', 'pipe', 'pipe']`; (b) **delegação com `background: true` encerra o turno** — o `opencode run` devolve com a resposta final sendo só "lançei o agente, aguardo", e o resultado do subagente chega depois, na sessão. E o detector de contaminação só olha os campos que representam arquivo (`path`, `pattern`, `command`), porque o modelo repassou ao subagente a própria proibição de ler `scripts/bench/` — uma busca em qualquer campo marcava toda execução como contaminada.

- **Cobertura de teste para os gates da suíte k6**, que até agora não tinha nenhuma — nada em `load-tests/` era exercitado por jest.
  - `tests/unit/load-tests/profiles.test.js`: 11 testes de `getProfile`/`PROFILES`. Travam a **semântica de merge dos thresholds** (por padrão o perfil base é preservado e só as chaves repetidas são substituídas pelo override) e o escape hatch `replaceThresholds: true`, que descarta o base por inteiro sem vazar para o `options` do k6. Incluem invariantes da matriz de perfis e um controle negativo que prova ter força (mutar o resultado de `getProfile` não contamina `PROFILES`).
  - `tests/unit/github-workflows/k6-version-pin.test.js`: varre **todos** os `.yml` de `.github/workflows/` em vez de fixar um arquivo, e exige que todo uso de `grafana/setup-k6-action` tenha `k6-version` **sem prefixo `v`**, com um helper que torna explícita a formação da URL de release. É a regra que teria reprovado o run #15 no CI de push, em vez de 20 horas depois no cron.
  - `tests/unit/load-tests/error-gate-coverage.test.js`: 11 testes que travam a **cobertura de gate de erro** da suíte — a parte estática de toda URL de requisição é ASCII (o byte UTF-8 cru é o que provocava o 400), os 6 scripts que esperam 4xx por desenho **não** declaram `http_req_failed`, os 4 marcadores de `check` do warm-up/teardown existem, o `posts-tags` declara `rate<0.20`, e quem declara `http_req_failed` entre os perfis.
  - `tests/unit/load-tests/sort-contract-coverage.test.js`: **7 testes** (5 na criação, 23/10/2026; +2 na correção do item a) que travam o **contrato de `sort`** entre a suíte e as rotas públicas — extraem do código-fonte o conjunto de valores que cada rota aceita (enum inline `sort: z.enum([...])` ou constante `*_SORT_ENUM`) e exigem que todo valor de `sort` que um script de ordenação envie esteja no enum vigente. Depois do endurecimento de `/api/videos`, as três rotas de catálogo são estritas: o formato legado `sort=<campo>&order=<dir>` saiu do runner (`sortMode` é obrigatório), toda chave top-level de um `resourceConfig` de ordenação tem que ser consumida pelo runner (mata a classe do `useExplicitSort`) e o `limit` do teste de vídeos tem que casar com o do `VideoGallery`. É a guarda que teria reprovado o cron #19 **antes** do disparo, e não 20 horas depois.
  - Todos com **prova de mutação executada e registrada**: reintroduzir `k6-version: 'v2.3.0'` reprova 3 asserções do segundo arquivo; reverter o `getProfile` para a semântica antiga reprova exatamente os 2 casos de merge do primeiro; e as 5 mudanças da Fase 2 do item AD revertidas uma a uma reprovaram o teste correspondente (5/5). No arquivo novo: voltar o `musicas-sort-test` para `sort=recent` reprova 2 das 5 asserções, e tirar `default` do enum da rota reprova 3.

### Corrigido

- **Embeds do Spotify exibiam "Page not found" e o card renderizava iframe quebrado para URLs que não eram faixa — P-01 resolvido com validação track-only e fallback gracioso (ADR-0023).** O utilitário `lib/media/spotify.js` só extrai ID de **track** (`/track/`, `spotify:track:`, `/intl-XX/track/`), mas quando nada casava `getSpotifyEmbedUrl()` devolvia a **URL original** sem avisar — e `MusicCard.js` (`components/Features/Music/MusicCard.js`) renderizava `<iframe>` de qualquer jeito: link de playlist/álbum, em branco na página ou com "Page not found" do próprio Spotify. Não havia fallback no componente. **Correção em quatro pontos:** (1) `getSpotifyEmbedUrl()` agora retorna `null` quando não extrair ID de track (contrato explícito, sem URL crua passando silenciosamente) e entrou o helper `isSpotifyTrackUrl()`; (2) `MusicCard.js` só renderiza o iframe quando a conversão produz URL de `/embed/track/` válida — caso contrário exibe "Prévia indisponível" **em vez de iframe quebrado**, mantendo o botão "🎵 Ouvir no Spotify" apontando para a URL original (fecha o §7/P-08 que faltava); (3) o cadastro (`pages/api/admin/musicas.js`, POST e PUT) trocou `url.includes('spotify.com')` por `isSpotifyTrackUrl()` e recusa playlist, álbum ou episódio com mensagem clara ("Apenas links de faixa (track) são suportados para embed."); (4) o "⚡ Puxar Dados" (`pages/api/admin/fetch-spotify.js`) também passa a recusar URL não-track antes das três estratégias de busca. O teste `tests/unit/components/Features/Music/MusicCard.test.js` foi ajustado ao novo contrato (URL não-Spotify/non-track agora resulta em fallback sem iframe, com botão presente). Banco conferido em 27/10/2026: os 13 registros de teste (`musicas`, IDs 44–56) são todos `VALID_TRACK` — nenhum dado precisou ser alterado na base de exercício. O card público muda de comportamento apenas quando um registro tiver URL não-track — hoje, com a base confirmada, nenhuma exibição muda de fato. Decisão: `docs/adr/0023-spotify-embed-limitado-a-tracks-com-fallback.md`. (27/10/2026)

- **O teste de carga de vídeos validava o fallback da rota, não o parâmetro `sort` — e a rota agora é estrita.** O `videos-sort-test.js` mandava `?sort=created_at&order=desc`: `created_at` não é chave do enum de `/api/videos` e o formato `order` nunca existiu em nenhuma rota, então a requisição caía no fallback `recent` — o check "Ordenação correta" passava por acaso (validava o default). Além disso `useExplicitSort: true` era config morta (o runner nunca a desestruturou) e `optionsOverrides.thresholds.checks: ['rate>0.85']` afrouxava o gate `rate==1.0` do par músicas. **Correção (P0+P1+P4):** o script agora manda `sortMode: 'recent'` + `limit: 12` (o mesmo do componente `VideoGallery.js`, porque a chave de cache pública é `public_videos:<page>:<limit>[:<search>]:<sort>` e outro limit mediria outra entrada); a rota `pages/api/videos.js` passou a validar com Zod (enum `recent|oldest|alpha|alpha_desc`, default `recent`; 400 com `INVALID_PARAMS_MESSAGE` fora do enum, `INVALID_PAGINATION_MESSAGE` para página/limit inválidos, `search` limitado a 200) e o `SORT_MAP` ganhou desempate determinístico por `id` na mesma direção da coluna; o runner `createSortDefault` abandonou o formato legado (`sortMode` obrigatório, URL montada por concatenação simples da query string — `URLSearchParams` não é garantido no runtime do k6 — com `limit` opcional) e os soft passes viraram falha (payload não-array e data inválida reprovam; só `<2` itens segue inconclusivo). `tests/integration/api/videos.pagination.api.test.js`, que mockava um caminho inexistente e testava um handler falso, foi reescrito contra o handler real; e `sort-contract-coverage.test.js` ganhou guarda bidirecional de chaves do `resourceConfig` (mata a classe do `useExplicitSort`) e paridade teste×componente para o `limit`. Lição repetida do cron #19: contrato de API muda e o script fica para trás — a guarda agora é automatizada.

- **A `main` publicada voltou a conter o commit `WIP - bench role explorer instrument (amend later)` e quatro arquivos com linhas antigas ressuscitadas; a história foi reescrita.** O `fdc29ac` nasceu de um `--amend` depois do push — que em vez de substituir criou o irmão `348af62` — e o `pull --rebase` seguinte montou `ae16132` sobre ele, duplicando um bloco deste changelog e derrubando a entrada do `explorer` (corrigido em `6be27a6`..`19c18cb`). A tentativa de limpar o WIP criou a branch squashada `327b18d` sobre `2993de7` **sem** reaplicar esses commits; ela foi mergeada pelo PR #2 (`8f82791`, `3dc25b3`) e o merge 3-way manteve os dois lados das linhas sobrepostas, sem conflito: chave `"orchestrator"` duplicada em `.opencode/oh-my-opencode-slim.json` (reprovando `json/no-duplicate-keys` no run #64), dois bullets contraditórios no changelog, heading órfão no ADR-0008 e `if (!opts.agente)` duplicado em `rodar.js`. A cadeia foi reconstruída localmente (`2993de7 → a7c6a59 → 225fb1b → fa65789 → a4b0360 → 07924f7 → c829a2f`), provada idêntica a `19c18cb` por comparação de `tree` (diff vazio, eslint 0, 195 suítes / 1418 testes passando / 73 pulados) e publicada com `--force-with-lease=main:3dc25b3`; CI verde no `c829a2f` (runs #65, #59 e #50) e a branch remota `squash-wip` apagada. O procedimento de verificação ficou no `docs/adr/0018-rewrite-wip-history-before-publishing.md`. (22/10/2026, tarde)

- **O instrumento do papel do `fixer` media um bug que não existia mais — agora ele é plantado de volta.** O S1 (vazamento de `error.message` em `pages/api/status.js`) foi corrigido no HEAD em 21/10, e a primeira execução do bench de 22/10 (`glm-5.3-flash-free`, preservada como `fixer-glm-5.3-flash-free-1-sem-objeto.ndjson`) diagnosticou com honestidade que a correção já estava no disco e **não editou nada** — comportamento correto, medição sem objeto. Agora `scripts/bench/papeis/regressao-s1.js` devolve o disco ao estado do bug antes do spawn (`rodar.js`), o `conferir-fixer.js` reaplica a mesma regressão antes de revalidar as edições do candidato, e a tarefa declara isso explicitamente ("bug deliberadamente reintroduzido; ignore `git log`"). `pages/api/status.js` é rastreado, então a limpeza padrão desfaz a regressão. **Prova fora do modelo:** com a regressão aplicada, o teste existente `tests/integration/api/status.test.js:51-63` (`not.toContain('DB Offline')`) falha (1 failed / 7 passed); no HEAD, 8/8 verdes. O helper falha alto se o bloco de `catch` mudar — recalibração prevista pelo hook do ADR-0008. (22/10/2026, tarde)

- **O gabarito do papel do `designer` apontava linhas de um `MASTER.md` que mudou em 21/10.** Referências recalibradas com as linhas de hoje: a declaração exata do foco do botão está em `MASTER.md:130` (era `:104`), o anti-padrão "box-shadow como único indicador" em `:202-203` (era `:149-150`), `outline: none` seco em `:201` (era `:147-148`), a proibição do `#a3a3a3` para texto informativo em `:50-51` (era `:49-51`), texto informativo em contraste baixo em `:205-206`; §2 normativo hoje é `:48-52` e §9 é `:200-206`. Os quatro usos do token no `Input.module.css` (`:39/:49/:102/:167`) e a nota do `BaseCard.module.css:129` não mudaram — confirmados no código. (22/10/2026, tarde)

- **O `explorer` estava parado com um id morto no preset — e a bateria nova apontou o `deepseek-v4.1-flash-free`.** O `longcat-2.5-preview-free`, no papel desde a fusão do `librarian` (medições em 15/10 e 19/10), saiu do catálogo do OpenCode Zen junto com o `minimax-m3.1-flash-free` (inventário reconferido em 22/10/2026: **9** modelos free), e um id fora do catálogo não spawna — o agente não responde. Rodou a bateria do papel com gabarito recalibrado (a passa de segurança de 21/10 invalidou o ground truth de 19/10): o `deepseek-v4.1-flash-free` — órfão por decisão medida de 19/10 — venceu com **0 erros verificáveis** (Parte A: 6/6 pontos de `withAuth` conferidos em `arquivo:linha`, armadilhas de imports/comentários/`status.js` iludidas; Parte B: citações do repo externo do Next conferidas no source, lacunas declaradas `NÃO DETERMINADO`) e assume o papel na config do preset do slim. O estreante `flint-40b-free` não entregou as partes: a sessão caiu com `provider.internal` 503 em 287s, sem resposta final. Registrado no ADR-0008 §22/10/2026 (mais tarde).

- **O `orchestrator` passou a rodar no `big-pickle`, com `glm-5.3-flash-free` como reserva declarada.** O `minimax-m3.1-flash-free`, primário desde a saída do `space-bunny-free` (19/10), também saiu do catálogo. Entre os vivos, o `big-pickle` é o único com medição no papel real (bench de 19/10: 19/24 itens da Camada B, 1 erro verificável por execução — contra 21/24 e 0 erros do `minimax` que saiu). A reserva declarada agora é o `glm-5.3-flash-free`: naquele momento nunca medido no papel, mas o default do provider — o modelo em que as sessões vêm caindo na prática quando um id morre —, de modo que a cadeia escrita passou a descrever o comportamento real. **Medido depois, na mesma data** (bateria completa nos cinco papéis, 22/10/2026 tarde): Camada A limpa nos 5 papéis e Camada B 7/8 como analista de config, então a reserva deixou de ser "nunca medida" — ver ADR-0008 §"22/10/2026 (tarde)". O `model` da sessão, em `opencode.jsonc`, aponta para o `big-pickle`.

- **O cron #19 da suíte k6 reprovou — e a causa não foi a Fase 2, foi a troca de contrato de `sort` do ADR-0014.** O `musicas-sort-test.js` continuava mandando `?sort=recent`, valor que o ADR-0014 (21/10/2026) tirou do conjunto de `/api/musicas` (`default | positioned | oldest | alpha | alpha_desc`): a rota valida com `z.enum`, então o 400 veio de volta, 2 dos 3 checks falharam, o threshold `checks: ['rate==1.0']` reprovou o script e o job inteiro caiu (17m55s de bateria — o orquestrador registra a falha e **continua**, por isso o run inteiro rodou). **A causa foi confirmada no log do step "Run Tests"**, não inferida: o bloco "❌ DETALHES DOS ERROS" do orquestrador nomeia **um** reprovado — o `musicas-sort-test`, exit 99, com `checks` em 33,33% (1 ✓ / 2 ✗) e exatamente os dois checks "Status é 200" e "Retornou lista de musicas" — sobre **30 scripts · 29 passed · 1 failed · 0 skipped**. Agora o script manda `sortMode: 'default'` — "Padrão" = "Mais recentes" (`created_at DESC`), exatamente a ordenação que o check "Ordenação correta (Decrescente)" valida. A Fase 2, que mudou 5 scripts (`posts-tags`, `musicas-search`, `search-content`, `musicas-crud`, `videos-crud`), **não** está envolvida: nenhum deles é o `musicas-sort-test`, e nenhuma das rotas que eles tocam mudou — e o log confirma que **os 5 passaram**, o que valida a Fase 2 em produção (o gate novo do `posts-tags` segurou com 0 requisições falhas; o warm-up do `musicas-search`, antes invisível para o gate, agora coberto por `checks: ['rate==1.0']`, passou). O detalhamento do incidente — o que foi **medido** na API pública do GitHub, o que o **log do step "Run Tests"** confirmou, e o que ainda depende de token para ser lido (a tabela de `metrics.*.thresholds` por script do artifact) — está em `docs/PROJECT_load-tests.md`. **Confirmado em produção no cron #20** (run `39931445152`, sha `1fc79d56`, 23/10/2026): `conclusion: success` com o step "Run Tests" verde, o que pelo exit code do orquestrador significa **30/30** scripts, e o inventário dos **81 thresholds efetivos** — resolvido em Node puro pelo mesmo pipeline do k6 (`script → factory → getProfile`), sem tocar no repositório — fechou com **0 scripts sem nenhum threshold** e **10 com gate de `http_req_failed`**, batendo com os 80 thresholds do #18 mais o único que a Fase 2 acrescentou. Com isso o item AD foi **encerrado** (`docs/PENDENCIAS_scripts_testes.md`).

- **Nove defeitos de segurança em `pages/api/` foram corrigidos, com o dono decidindo o contrato de cada um.** Partiram de uma auditoria de modelo, foram reconferidos em `arquivo:linha` e viraram o documento `docs/PENDENCIAS_seguranca-rotas-api.md`; a execução foi na ordem `A1 → B1+B2 → A2+A3+A4+A5+A6 → C1`. **(1) A API não protegia o administrador.** `admin/users.js` só recusava excluir a própria conta logada: qualquer um com a permissão `Usuários`/`Segurança` excluía o usuário `admin` ou apagava o cargo `admin` — e o `PUT` trocava o cargo dele. Agora a API recusa, com 400 nomeado, excluir o administrador (identificado por `process.env.ADMIN_USERNAME`, a mesma variável que o cria), alterar o cargo dele e excluir o cargo `admin`; no painel, o "Excluir" some das linhas protegidas. A regra já estava escrita em `ARQUITETURA_SITE_PRIVADO.md` §9 — o que faltava era a implementação. **(2) `/api/products` escrevia sem exigir a permissão que já existia.** `Gestão de Produtos` está em `permissionsList` e o painel a exigia **só no cliente** (`pages/admin.js`), de modo que chamar a rota direto contornava a barreira: qualquer token válido criava, alterava, apagava e reordenava o catálogo. A permissão passou a ser conferida **no servidor**, inclusive no branch de reordenação (que reescreve o `position` de qualquer produto). A checagem saiu de dentro do `adminCrudHandler` para `lib/api/permissions.js`, compartilhada pelas duas rotas, **sem** mudar o comportamento observável das 14 rotas `admin/` — o bypass do cargo `admin` por desenho (ADR-0010) e o fail-closed continuam idênticos. **(3) `/api/posts` tinha um caminho de escrita duplicado e sem guarda.** O `POST` público criava post sem conferir cargo, enquanto o painel usava `/api/admin/posts` (permissão `Posts/Artigos`); nenhum consumidor legítimo existia. O `POST` foi **removido** — a rota ficou somente leitura, e o comando morto `cy.createPost` saiu junto. **(4) Um helper compartilhado dentro de `pages/api/` virava rota.** `helper/pagination.js` não tem `export default`, mas o Next o registrava como estático: `/api/helper/pagination` respondia **500** a qualquer visitante. O módulo foi movido para `lib/api/pagination.js`; a rota sumiu do manifest (31 → 30 rotas em `/api/`) e **nenhum** arquivo em `pages/api/` ficou sem handler. **(5) A mensagem do banco vazava em rota pública.** `status.js` devolvia o `error.message` do Postgres — host, porta e usuário — a qualquer requisição; agora é uma mensagem fixa, com o 200 e o `status: 'error'` mantidos e o erro cru apenas no log do servidor. **O teste que faltava foi escrito** (o corpo não pode conter a mensagem do banco). **(6) O diagnóstico do processo era público.** `NODE_ENV`, versão do Node, platform, uptime e memória saíam de `/api/status` sem autenticação. A rota foi **dividida**: `?mode=health` continua público e o diagnóstico passa a exigir token válido (401 sem token ou com token inválido), com o payload intacto. O único consumidor afetado — o cenário `memory_monitor` do k6 — passou a enviar o token. **(7) `auth/logout.js` aceitava qualquer método**: um `GET` deslogava a sessão; agora só `POST` passa e o resto responde 405. **(8) `auth/check.js` e `auth/refresh.js` não tinham rate limit** (só o `login` tinha): os dois passaram a ter limite por IP, pelo `getClientIP` (que aplica `TRUST_PROXY`). **(9) Duas rotas `admin/` devolviam `error.message` cru** (`fetch-spotify`, `fetch-ml`): agora separam o erro de negócio — mensagem escrita à mão — do erro inesperado, que vira mensagem genérica. **Cada correção tem teste de negação, com mutação verificada**: desligar a guarda de produtos reprovou 6 casos, desligar o bypass do `admin` reprovou 2, reintroduzir o `POST` de posts reprovou o 405, reativar o `error.message` reprovou o teste de vazamento e remover a exigência de token do diagnóstico reprovou os dois casos de 401.

- **O warm-up do `musicas-search-test` mandava byte UTF-8 cru no request target e recebia 400 — e a suíte reportava PASS.** `?search=Graça` ia para o socket sem percent-encoding, e o parser HTTP do Node respondia **400 Bad Request antes de a aplicação ver a requisição**: `http_req_failed` ficou em 0,142857 (1 de 7) **idêntico** nos runs #15, #17 e #18 — não era variação de runner, era a mesma requisição falhando três runs seguidos. E o warm-up não tinha `check` nem gate, então o 400 era invisível para o veredito. Agora a URL usa `encodeURIComponent()` e os 2 warm-ups têm `check` de status. **Reproduzido localmente:** a URL crua devolve 400, `Gra%C3%A7a` devolve 200.

- **3 pontos cegos da suíte k6 (warm-up e teardown) sem `check`, e 1 script cujo `check` não enxergava o erro.** `functional/search-content-test.js` (3 warm-ups) e `performance/musicas-crud-test.js` / `videos-crud-test.js` (teardown: listagem admin + delete dos itens "K6") agora têm `check` de status — a limpeza que falha deixava lixo no banco **sem** reprovar a execução. Em `functional/posts-tags-test.js`, cada requisição roda 3 checks, mas numa resposta 500 só 1 falha (o check de "lista de posts" cai no fallback `[]`, que passa no `Array.isArray`): até 2 das 5 (40%) poderiam falhar e a execução ainda passaria com `checks: ['rate>0.80']`. Esse foi o **único script que recebeu gate de taxa** — `http_req_failed: ['rate<0.20']`, que reprova já na primeira falha (1 de 5 = 20%). Os 6 scripts que esperam 4xx por desenho (`video-validation`, `ddos-search`, `ip-spoofing`, `rate-limit`, `recovery`, `login-negative`) seguem **sem** `http_req_failed`, e os outros 14 continuam cobertos por `check` — gate que nunca reprova nada é ruído que dá falsa sensação de cobertura. **Correção de uma recomendação anterior:** calibrar `http_req_failed` por contagem absoluta (`count<…`) é **impossível** — no k6 v2.3.0, `js/modules/k6/metrics/metric_type.go` devolve `[]string{tokenRate}` para o tipo `Rate`, que **só** aceita o token `rate` (`count` é token de `Counter`); um `count<` ali não produziria gate nenhum, em vez de medir o que se propunha. Decisão: `docs/adr/0012-gate-da-suite-k6-por-metrica-propria.md`; estado: `docs/PENDENCIAS_scripts_testes.md`, item AD.

- **O `orchestrator` estava rodando num modelo que saiu do catálogo — e a reserva não assumiu.** `space-bunny-free` deixou de existir no catálogo do OpenCode Zen (três provas: `opencode models` não lista, a busca por "space-bunny" volta zero, e o spawn responde `provider.no-route: "Model unavailable"`), e era o **primário** da cadeia do preset. A sessão não caiu na reserva (`big-pickle`): caiu no **default do provider**. A causa está no log do slim — o hook `v2.session.retry` registra `failover: false` para o erro de id fora do catálogo, porque `provider.no-route` não é classificado como failover (a cadeia só age em rate limit, 401/403, 5xx e timeout). **A reserva da cadeia cobre rate limit e 5xx, não a saída do primário do catálogo** — o que protege contra esse modo de falha é conferir `opencode models` e trocar o id apontado. O `model` da sessão em `opencode.jsonc` apontava para o mesmo id morto e foi corrigido. O primário passou a `minimax-m3.1-flash-free`, medido no papel real do orchestrator: 3 execuções, 2 turnos por sessão, 21/24 itens do Camada B e **0 erros verificáveis**, contra 19/24 e 1 erro do `big-pickle` — o desempate é o critério desta decisão ("menos erros verificáveis"). A reserva (`big-pickle`) segue declarada, com o alcance delimitado.

- **O bench do orchestrator media contaminado, por três vias que ninguém tinha visto.** (a) **A memória do projeto é uma via de contaminação do gabarito**: o modelo sob teste grava a *resposta* da tarefa em `notes/auditoria-auth-pages-api-2026-10-19.md` e a execução seguinte a lê de volta — o mesmo que ler o gabarito, por um caminho que o detector de `scripts/bench/` não via. (b) **Falso positivo de contaminação**: `ls scripts/bench/` (confirmar que o diretório existe, sem abrir nada) era tratado como leitura do gabarito, e a execução era descartada. (c) **Falso positivo de citação**: `MASTER.md` e `Input.module.css` são escritos na forma relativa ao diretório que o modelo conhece; resolvidos por prefixo fixo, apontavam para o arquivo errado e a citação certa era reprovada. Os três foram corrigidos, e a correção está documentada no ADR-0008 — o próximo bench de qualquer papel vai esbarrar neles.

- **A bateria de papel do `fixer` media a tarefa errada depois da primeira execução.** A tarefa é corrigir um defeito *real* do código; o primeiro fixer corrigiu `pages/api/status.js` e as execuções seguintes herdaram o arquivo já corrigido — o bench passou a medir quem escreve teste para um arquivo pronto. O runner agora restaura o repositório entre execuções (`git checkout --` em arquivo rastreado, remoção em não rastreado, **nunca** `git reset --hard`, e preservando o que é do bench).

- **Pontuação do Camada B do bench do orchestrator, item a item, por script** (`scripts/bench/orchestrator/pontuar.js`). O gabarito é a verdade e o script confere cada item — a contagem de arquivos e rotas, o ponto de aplicação da autenticação, a proteção externa e o `405`. Isso revelou que o `minimax` erra a contagem de rotas registradas pelo Next (afirma 32; o manifest registra 31) e que **os três** modelos erram o `405` — lacuna comum, não o que os separa.

- **`designer` estava completamente fora de operação.** O `muse-spark-1.3-contributor-free` saiu do catálogo do OpenCode Zen em 18/10/2026 (só restou o `muse-spark-1.3` **pago**), e o preset ainda apontava para o id que saiu. O host rejeita o spawn na hora com `Model "opencode/muse-spark-1.3-contributor-free" is not available` — falha explícita, mas invisível para quem só lê a config, porque o preset continua válido para o schema e `opencode debug config` passa. Trocado para `beam-free`, que já tinha medição **do mesmo papel** em 16/10 (4/4, e apontou o `--color-text-tertiary` como proibido para texto informativo, exatamente o teste que reprovou o `nemotron-3.5-super-vl-free` no designer). Revalidado contra o catálogo atual no dia. O `beam-free` não era primário de ninguém, então não houve repetição. Contagem de modelos free: 11 → 10. O `deepseek-v4.1-flash-free` continua órfão e ativo: **não** foi promovido por analogia, porque o papel que ele sabia fazer (doc externa) foi fundido no `explorer` e nenhum dos dois candidatos foi medido no papel novo.

- **O agente `librarian` não existe mais: o slim 3.0.5 fundiu-o no `explorer`.** A tool `subagent` passou a recusar o nome, sem aviso. Não foi config do projeto — é mudança upstream entre 3.0.4 e 3.0.5, verificada no `dist/index.js` instalado (`MARKETPLACE_BUILTIN_RENAMES = { librarian: "explorer" }`, e `SUBAGENT_NAMES` perdeu o nome; o schema do 3.0.5 não menciona `librarian`). Duas armadilhas se somando: o alias `librarian -> explorer` funde campos mas **o canônico vence**, então as permissões do librarian não migravam sozinhas; e a linha `agent.librarian.permission` que sobrou no `opencode.jsonc` criava um **agente fantasma** — `mode: primary`, sem prompt, sem modelo — que aparecia no `opencode debug agents` e não confirmava nada. Por escolha do mantenedor, o contexto7 e o gh_grep migraram para o `explorer`, que passou a ser também o agente de documentação externa; as regras de conduta foram do `librarian_append.md` para o `explorer_append.md`. O modelo `deepseek-v4.1-flash-free`, que era do librarian, ficou órfão — está ativo no catálogo, sem dono, à espera de bateria de medição no papel novo. **Requer reinício do OpenCode**: o slim não recarrega config a quente.

- **Arquivo colocado em `/uploads/` executava script em navegação direta.** O diretório só recebe imagem pela API, que restringe a extensão a uma whitelist — mas nada impede que um arquivo seja colocado lá por fora, e o CSP da aplicação é `<meta http-equiv>` em `pages/_document.js`, que **por definição não vale para uma resposta servida como documento próprio**. Um `.svg` no diretório seria servido como `image/svg+xml` e rodaria script na origem do site, com o cookie de sessão travelling junto (é httpOnly, mas é enviado nas requisições). Agora `/uploads/:path*` recebe `Content-Security-Policy: default-src 'none'; sandbox` pelo `headers()` do `next.config.js` — e não pela rota, porque `headers` roda antes do filesystem e do `afterFiles` rewrite, o que faz a regra alcançar também o arquivo **legado** em `public/uploads/`, servido estaticamente e nunca passado pela rota. `X-Content-Type-Options: nosniff` já era global desde sempre e não foi repetido. Verificado com `next start`: os dois caminhos devolvem 200 com o header e os bytes idênticos, e uma página normal não o recebe.

- **O gate de conteúdo do upload era a única barreira contra payload forjado, e não tinha teste.** `imageFile.mimetype` vem do `Content-Type` da parte multipart, controlado pelo cliente (`Formidable.js:371`), então a validação de mimetype passa com qualquer payload declarado como imagem. O que realmente impede a gravação é o `sharp`, e nenhum teste cobria os dois ramos de rejeição dele. Agora `tests/integration/api/upload-image-disk.test.js` tem 5 casos com `formidable`, `fs` e `sharp` reais, incluindo imagem acima de 1920px e payload não-imagem declarado `image/jpeg`. **Mutation check**: remover a checagem de dimensão reprova 1 teste; burlar o `sharp` reprova 2. Junto: a mensagem "Arquivo corrompido ou formato não suportado" foi trocada por "Não foi possível ler a imagem. Envie um arquivo JPG, PNG, WebP ou GIF válido." — o `sharp` lê **só o header**, então um JPEG truncado com header íntegro passa, e o texto antigo prometia integridade que o gate não verifica.

- **Upload de imagem acima de 5MB devolvia 500 em vez de 413.** O `maxFileSize` do formidable abortava o parse e o erro caía no `catch` que responde 500, tornando inalcançável a checagem de tamanho do próprio handler. Agora o excesso de tamanho responde `413` com a mensagem do limite, e a mensagem chega ao usuário em vez de um rótulo genérico.

- **`expectedStatuses` não é uma chave válida de params do k6 — os 2 scripts que a usavam tinham a opção silenciosamente ignorada.** A opção correta é `responseCallback`, e `http.expectedStatuses(...)` é uma *função* que constrói o callback; como o parse de params do k6 não tem `default:`, a chave desconhecida era descartada sem warning. Em `security/ddos-search-test.js` isso fazia os 429 — que são justamente o **sinal de que a proteção funcionou** — contarem como requisição falha, e o artifact registrava `http_req_failed` em 99,94% num teste cuja proteção estava de pé. Em `functional/recovery-test.js` a mesma chave servia para aceitar qualquer status. Ambos agora usam `responseCallback`.

- **Versão do k6 não era pinada na CI.** `.github/workflows/test-base.yml` chamava `grafana/setup-k6-action@v1` sem `k6-version`, instalando a *latest* a cada semana — e uma troca de versão pode alterar métricas, thresholds e o comportamento de `responseCallback` sem que nada no repositório mude. Agora pinada em `2.3.0`, a versão que os runs #12–#14 instalaram: pinar não altera o comportamento já medido, só impede a deriva. O valor vai **sem o prefixo `v`**, porque a action monta a URL como `releases/download/v<k6-version>/…` — passar `v2.3.0` gera `vv2.3.0` e 404, que foi exatamente a falha do run #15 (18/10/2026).

- **`functional/recovery-test.js` não tinha nenhum threshold.** O perfil `recovery` define `thresholds: {}` e o script não acrescentava nada, sendo o único da bateria sem gate. Pior: o agregado `checks` dele é 100% por construção (cada ramo do `if` declara um único check que sempre passa), logo não distingue "saudável" de "caído". Agora tem a métrica própria `recovery_unhealthy_rate` com threshold `rate<0.10`, no mesmo padrão de `search_block_rate` e `ip_rotation_evasion_rate`. Baseline medida no run #14: 0,00%.

- **JWT do admin semeado vazava em texto claro no artifact do cron de carga.** O `sanitizeToken` do `load-tests/helpers/report.js` só ocultava o token quando `setup_data` chegava como objeto `{ token }`, mas `createLoadSetup` retorna `loginRes.json('data.token')` — uma **string crua**, forma que o sanitizador nunca alcançava. Resultado medido nos runs #12–#14 do cron: 2 dos 9 JSON com `setup_data` (`musicas_load_test.json` e `videos_load_test.json`) publicavam o token, e o artifact é baixável por qualquer pessoa durante a retenção de 30 dias. Agora os dois formatos são tratados. A cópia morta da função em `resource-test-runner.js` foi removida junto (ver `docs/UPGRADE_load-tests.md` §4.4).

- **4 dos 30 scripts k6 não gravavam relatório nenhum.** `cache-warmup-test`, `cache-performance-test`, `create-post-flow` e `health-check` não tinham `handleSummary`, o que explica o artifact de 28 arquivos para 30 scripts: as métricas desses quatro existiam só no log do job, que expira junto com o run. Agora gravam `reports/k6-summaries/{cache_warmup_test,cache_performance_test,create_post_flow,health_check}.json`. Mudança estritamente aditiva — nenhuma opção, threshold, cenário ou `setup`/`teardown` foi tocado.

- **`getProfile` descartava os thresholds do perfil base sempre que o override trazia `thresholds`** — e os 5 factories reagem a isso de formas diferentes, de modo que **23 dos 30 scripts da bateria ficaram sem nenhum threshold efetivo de `http_req_failed`**, já em produção, sem que ninguém perceba (o job continuava verde). Agora `getProfile` **mescla por padrão, chave a chave**: a chave repetida é substituída pelo override e a que só existe no perfil base é preservada. O descarte total continua disponível, mas só de forma **explícita**, via `overrides.replaceThresholds: true` — consumida dentro da função para não vazar no `options` do k6. Efeito medido contra o run #17: **13 thresholds voltaram para 11 scripts, nenhum foi removido**, e os thresholds efetivos de `http_req_failed` saem de 7 para 9 de 30. Os 2 scripts de carga passam a ser o piloto vivo do gate de taxa — que a Fase 2 usou para calibrar limites, sem escalar o gate para os demais (ver a entrada da Fase 2 abaixo). Contexto: `docs/PENDENCIAS_scripts_testes.md`, item AD; decisão: `docs/adr/0012-gate-da-suite-k6-por-metrica-propria.md`.

### Alterado

- **Deduplicação de código do Spotify e ajuste fino do `MusicCard` — sem mudança de comportamento.** (27/10/2026) A regex de track em `lib/media/spotify.js` existia em duas funções; agora `extractSpotifyId()` é a única definição e `isSpotifyTrackUrl()` delega a ela. O `MusicCard.js` trocou `try/catch` + checagem redundante de `/embed/track/` pela confiança no contrato do utilitário (`null` fora de track — ADR-0023), preservando os parâmetros `?utm_source=generator&theme=0` do embed; o teste "deve usar a URL original (fallback)..." foi renomeado para descrever o que as asserções de fato verificam (fallback sem iframe).

### Documentação

- **Reconciliação doc×código da seção A do relatório de pendências.** (27/10/2026) Status desatualizados alinhados ao código e ao banco: no doc público (§7), itens 2/3/4 marcados **obsoletos** (tabelas `videos`, `posts` e `dicas` limpas pelo dono — o dado que gerava os problemas não existe mais) e item 5 como **parcial** (`home_image_url` agora aponta para arquivo existente em `public/uploads/`; confirmação visual pendente); no doc privado (§8), itens 2 e 8 como **corrigidos em 2026-10-21** (log de vídeo e proteção do admin, já no código); referências a S1 e ao S10 em `docs/PENDENCIAS_seguranca-rotas-api.md` atualizadas. Verificação de duplicação: a tabela §2.1 (mapeamento público↔privado) existe nos dois docs **por decisão do dono** — não é duplicação; a regex do Spotify agora tem uma única definição (ver Alterado).

- **A bateria por papel do `glm-5.3-flash-free` rodou nos cinco papéis, um por vez; nenhuma troca de atribuição — e a reserva do `orchestrator` deixa de ser "nunca medida".** (22/10/2026, tarde) Veredictos conferidos FORA do modelo, pelo critério do ADR-0008 (citação em `arquivo:linha` fora do modelo; medição vale por papel): Camada A limpa nos 5 papéis (0 citação inválida, 0 contaminação; duas exposições INCIDENTAIS de grep declaradas de forma transparente). `explorer` PASSA (6/6 pontos de `withAuth` + armadilhas; Parte B com zero `Cache-Control` declarado na doc do Route Handler e `NÃO DETERMINADO` honesto). `designer` PASSA com ressalva (P1/P2 corretos com as linhas atuais do `MASTER.md`; P3 parcial — listou os 4 usos, inclusive o `helperText` violador, sem julgamento por uso). `fixer` PASSA sob o instrumento novo (regressão plantada: `/api/status` corrigido, teste novo falha no original regredido e passa no corrigido, suíte inteira verde na cópia do bench (1421/73 = 1418 do repo + 3 casos novos), regra "não editar teste existente" respeitada). `oracle` PASSA (veredito correto no S8 — "não se sustenta" — com fundamentação em `ADR-0010`/`ADR-0017`, código atual e testes; divergências doc×código reais). `orchestrator`: Camada B 7/8 (só o item `proxy.js`) — a melhor execução única da tabela do `pontuar.js` — e Camada C **NÃO ORQUESTROU** (nenhum tool `subagent`; mediu bem como analista, não como primário). Atribuições mantidas: `big-pickle` primário do `orchestrator` com o `glm` como reserva medida (Camada B forte, Camada C sem condução — reserva cobre queda de modelo, não substitui condução), `mimo` no `fixer`, `nemotron-3.5-super-vl` no `oracle`, `deepseek-v4.1-flash-free` no `explorer`, `beam-free` no `designer`; o glm estreia como segundo candidato vivo nos papéis `fixer` e `oracle` com medição maior que zero. Gravado no ADR-0008 §22/10 (tarde).

- **A bateria do papel do `explorer` rodou de novo, com gabarito recalibrado; o `deepseek` assume.** (22/10/2026) O instrumento é novo: `scripts/bench/papeis/tarefa-explorer.md` + `gabarito-explorer.md` — o ground truth de 19/10 já não valia, porque a passa de segurança de 21/10 mudou a superfície de `pages/api/`. Recalibrado FORA do modelo: 6 pontos (1 definição + 5 aplicações de `withAuth`, com as armadilhas de imports, comentários e da rota `status.js` que usa `verifyToken`) e a Parte B conferida na doc instalada (Next 16.4.2): `revalidate` documentado em `route.md:270-284`, **zero** ocorrências de `Cache-Control` no doc do Route Handler e receita manual só no `headers.md`. 2 candidatos, 1 execução cada, sequencial, citações conferidas FORA do modelo — as 5 citações que o validador local reprovou (caminhos do repo externo `vercel/next.js`) são reais: `app-route.ts:461` e `self-hosting.mdx:99` conferem linha a linha na canary. Veredito e cadeia nova no ADR-0008 §22/10/2026 (mais tarde). Detector de contaminação do `conferir.js` ampliado: tools `memory_*` também contam — a memória do projeto é via de contaminação, como já registrado para o bench do orchestrator. A regra de recalibração permanece: mudou a superfície de `pages/api/`, recalibra gabarito e rubrica na mesma rodada.

- **Fase 2 do item AD aplicada e registrada** (21/10/2026): as 5 mudanças de código, a cobertura por teste, a calibração do gate e a correção do `count<` (impossível em métrica `Rate`) ficaram em `docs/PROJECT_load-tests.md`, `docs/adr/0012-gate-da-suite-k6-por-metrica-propria.md` e `docs/PENDENCIAS_scripts_testes.md` (item AD). **A entrada no ar é o cron #19 (22/10/2026)**: o esperado é `http_req_failed` com threshold em **10 dos 30** scripts, `musicas_search` com 0/7 e 30/30 passed — a conferir no artifact, não no código, que é onde a Fase 1 mostrou que a mentira mora.

- **Run #18 do cron de carga validou a Fase 1 em produção** (21/10/2026, `success`, 30/30, 17m59s): os 13 thresholds recuperados pelo merge do `getProfile` estão presentes e **80 thresholds avaliados, todos `ok`**, nenhum removido, e a contagem de scripts com `http_req_failed` efetivo subiu de 7 para 9 de 30. Os 2 scripts de carga — os primeiros a ter gate de taxa de erro sobre requisições — passaram com 0,00% de falha sobre 68 e 133 requisições, o que calibrou o gate da Fase 2 sem copiá-lo de um perfil. Registros dos runs #15 a #18, a 5ª amostra do experimento do item AB e a medição de 6 regiões de runner em 6 runs, em `docs/PROJECT_load-tests.md`.

- **Pendências de segurança das rotas de API, em `docs/PENDENCIAS_seguranca-rotas-api.md`.** As baterias de medição de modelo levantaram defeitos reais na superfície de `pages/api/`, e todos foram **reconferidos no código** (`arquivo:linha`), não repassados do que o modelo afirmou: o `error.message` do banco exposto em rota pública (`pages/api/status.js:61`), o diagnóstico do processo na mesma rota (`:31,41-47`), o `helper/pagination.js` — código **vivo** dentro de `pages/api/`, que o Next registra como rota e que responde 500, o `products.js` e o `posts.js` sem conferência de permissão nas escritas, o `logout.js` aceitando qualquer método e o `check.js`/`refresh.js` sem rate limit. Onde o modelo errou também está registrado: `helper/pagination.js` **não** é código morto, e a contagem de rotas registradas pelo Next é 31, não 32. **Revisão de 20/10:** a leitura do modelo de permissões (`docs/adr/0010`) reclassificou um dos itens — a criação de usuário aceitar o cargo `admin` **não é defeito**, é o modelo de acesso declarado, documentado em `adminCrudHandler.js:186-190` e coberto por teste deny/allow; e os dois itens de escrita ficaram com diagnóstico firme (a permissão `Gestão de Produtos` existe e já é exigida **só no cliente**, em `pages/admin.js:567,879`, enquanto a rota que escreve não confere nada no servidor). **Reanálise de 21/10**, depois dos ajustes da outra sessão: **nenhum achado foi resolvido** — S1, S2, S3, S5, S6, S7 e S9 seguem abertos (os arquivos não foram tocados), o S4 ficou mais forte (o branch de reordenação em `pages/api/products.js:152-179` também passa só por `requireAuth` e reescreve o `position` de qualquer produto — 4 operações de escrita sem guarda), e entrou um achado novo, o **S10**: a API não protege o usuário `admin` nem o cargo `admin` da exclusão nem da troca de cargo, embora a regra já esteja escrita em `ARQUITETURA_SITE_PRIVADO.md` §8 item 8 e §9.

- **O `orchestrator-bench` rodou: `space-bunny-free` se sustenta como primário.** Era a evidência que o ADR-0008 apontava como faltante desde 15/10/2026 — o orchestrator é o agente primário da sessão, não existe como subagente, e toda medição anterior dele foi por proxy. Seis execuções (3 por modelo, primário e reserva), em **dois turnos da mesma sessão**, com a tarefa de `scripts/bench/orchestrator/` e gabarito conferido em `arquivo:linha` fora do modelo. **Veredito: nenhuma troca é justificada** — os dois modelos cometeram 1 erro verificável cada um, na mesma fronteira, e o critério desta decisão é "menos erros verificáveis". 6/6 delegaram exatamente uma vez para o `explorer`, zero contaminações e **zero citações de arquivo/linha inválidas**; o `big-pickle` teve 5 citações em caminho abreviado, o `space-bunny-free` 0. No papel de orquestração, o `big-pickle-3` é que se sobressaiu: recebeu do `@oracle` que o `proxy.js` era código morto por não se chamar `middleware.js`, **verificou na doc local do Next** ("Starting with Next.js 16, Middleware is now called Proxy") e rejeitou o subagente, registrando o conflito — conferido, a correção dele está certa. **Dois achados de método que mudam como o bench é rodado:** (a) a tool `subagent` ignora `background` e sempre despacha em background, então `opencode run` encerra o turno antes da reconciliação — **nenhuma das 6 execuções de turno único entregou resposta final**, e sem o segundo turno (`--turno 2`) a série mediria o dispatcher, não o orchestrator; (b) o detector de citações teve dois falso positivo reais, corrigidos — caminho relativo ao diretório auditado (`admin/users.js`) sendo lido como inexistente, e `` `check.js`: 401 `` (status HTTP em prosa) sendo lido como citação de linha 401. **E o gabarito estava errado:** perguntava por "alguma" proteção externa e respondia só pelo CSP do `next.config.js`, esquecendo o rate limit de `/api/auth/login` no `proxy.js` — erro meu, pego na conferência fora do modelo, corrigido e datado no próprio gabarito.

- **A bateria do `explorer` no papel novo rodou; nada foi trocado.** O `deepseek-v4.1-flash-free`, órfão desde o merge do slim 3.0.5, foi medido contra o incumbent `longcat-2.5-preview-free` na tarefa que o `explorer` faz hoje (repo + doc externa via `context7`/`gh_grep`), com uma execução por modelo e todas as citações conferidas em `arquivo:linha` fora do agente: **7/7 nos pontos pedidos para os dois**, `longcat` 16/16 e `deepseek` 15/16 nas aplicações em produção (o `deepseek` omitiu `pages/api/ip-diagnostico.js:186`), zero erros verificáveis. Empate no pedido, incumbent mais completo — **o `explorer` continua com o `longcat`** e o `deepseek` passa a ser órfão por decisão medida. Registrado em `docs/adr/0008` §19/10/2026. No caminho, dois bloqueios da sessão anterior caíram: **os MCPs estavam de pé** (`list_mcp_resources` devolver `[]` é falso negativo — esses servidores expõem ferramentas, não recursos), e **`opencode models --all` não existe mais no v2.0.32**; sem a flag a listagem já traz os **10** modelos free, o mesmo número do preset. O `orchestrator-bench` segue aberto: o script se foi com a limpeza do `/tmp` e exige `OPENCODE_API_KEY`, ausente no ambiente.

- **Corrigido o dado de atraso do cron de carga.** O intervalo registrado (+6h4 a +19h1) era contaminado: o "+19h07 (pior caso)" vinha do `run_started_at` do run #7 na sua **segunda tentativa** (re-run manual), não do disparo do agendado. Medidos os **15** runs agendados de #1 a #16 (05–20/10/2026), o atraso real é **+4h19 a +7h46**, mediana **+6h34** — e está diminuindo. Tabela, critério de medição e correção registrados em `.github/workflows/load-tests.yml`, que passa a ser a fonte única do dado (a tabela duplicada em `PROJECT_load-tests.md` virou ponteiro).

- **Runs #12 a #17 do cron registrados** em `docs/PROJECT_load-tests.md`, com o resultado do experimento do **item AB** (ordem da bateria) em 5 amostras pós-mudança, o outlier de p95 do run #14 atribuído à **região do runner** (`eastus` → `mexicocentral`), e a 2ª medição da Fase 0 no run #17 confirmando que o estado validado no #16 é estável.

## [1.4.0] - 2026-05-10

### Adicionado

- **Sistema de Testes de Carga com k6** (28 scripts)
  - Testes de carga para músicas, vídeos e posts (CRUD, paginação, busca, filtro, ordenação)
  - Testes de segurança: DDoS search, rate limit, login negativo, IP spoofing
  - Testes de saúde: health check, backup, recovery
  - Testes de cache: headers de cache e performance
  - Fluxos combinados: stress test e upload flow
  - Workflow CI/CD no GitHub Actions com execução diária e upload de relatórios

- **Workflow de Testes de Segurança** (`security-tests.yml`)
  - Execução automatizada de testes de segurança com k6
  - Cenários: DDoS, Rate Limit, Login Negativo, IP Spoofing

- **Sistema de Backup com Criptografia**
  - Compressão gzip, criptografia AES-256-GCM, verificação SHA-256
  - Retenção configurável (10 backups), agendador cron
  - Operações: criar, restaurar, limpar, listar backups

- **Rate Limiting para Rota de Login**
  - Limite: 5 tentativas por IP a cada 15 minutos
  - Whitelist para IPs locais e configurável via variável de ambiente
  - Sistema de banimento progressivo com multiplicador de tempo
  - Notificação webhook para bloqueios recorrentes
  - Fallback entre Redis e memória local

### Melhorado

- **Cobertura de Testes**
  - Thresholds mínimos: branches 92%, funções 95%, linhas 98%, statements 98%
  - ~157 arquivos de teste no total (39 integração + ~96 unitários + infraestrutura)
  - Matchers customizados: toBeISODate, toBeValidJSON, toHaveHeader, toHaveProperties, toHaveStatus
  - Factories para posts, músicas, vídeos e usuários

- **Infraestrutura de Cache**
  - Cache com Redis (Upstash) + fallback local
  - Padrão Cache-Aside com `getOrSetCache`
  - Métricas de monitoramento de cache

- **Sistema de Autenticação**
  - JWT com 1h de expiração, cookies httpOnly
  - Middleware `withAuth()` para proteção de rotas
  - Criação de admin via variáveis de ambiente

### Segurança

- Headers de segurança no Next.js: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- CORS configurado para rotas `/api/*` com suporte a `ALLOWED_ORIGINS`
- SQL parametrizado em todas as operações CRUD com validação preventiva contra SQL injection
- Middleware de segurança: validação de token JWT, rate limit distribuído, logging de requisições

### SEO

- Geração automática de sitemaps XML e `robots.txt` via `next-sitemap`
- Schema.org JSON-LD: Article, Organization, BreadcrumbList, Website, Music, Video
- Open Graph e Twitter Cards em todas as páginas públicas
- Componentes de SEO: `SEOHead`, `ArticleSchema`, `BreadcrumbSchema`, `MusicSchema`, `VideoSchema`, `OrganizationSchema`, `WebsiteSchema`

### Componentes UI

- Biblioteca de componentes: Alert, Badge, Button, Card, Input, Modal, Select, Spinner, TextArea, Toast
- Componentes de layout: Container, Grid, Stack, Sidebar
- Componentes de performance: ImageOptimized, LazyIframe, PreloadResources, CriticalCSS
- Componentes de admin: AdminCrudBase (CRUD genérico), AdminDashboard, AdminUsers, AdminPosts, AdminMusicas, AdminVideos, AdminProducts, AdminDicas, AdminAudit
- Componentes de funcionalidades: BlogSection, PostCard, MusicGallery, MusicCard, MusicPlayer, ContentTabs, Testimonials, ProductCard, ProductList

### Infraestrutura

- Next.js 16 com Pages Router
- React 19
- PostgreSQL + SQLite (desenvolvimento local)
- Redis (Upstash) para cache e rate limiting
- Jest 30 para testes unitários e de integração
- Cypress 15 para testes E2E
- k6 para testes de carga
- GitHub Actions para CI/CD (3 workflows: CI, cobertura em PRs, testes de carga)

---

## [1.3.0] - 2026-04-XX

### Adicionado

- **Páginas da Aplicação**
  - Página inicial (`/`) com hero image, ContentTabs e Testimonials
  - Página dinâmica de posts (`/[slug]`) com SEO completo
  - Painel administrativo (`/admin`)
  - Página de design system (`/design-system`)

- **API REST**
  - Endpoints públicos: `/api/posts`, `/api/musicas`, `/api/videos`, `/api/products`, `/api/settings`, `/api/dicas`, `/api/stats`, `/api/status`
  - Endpoints administrativos: CRUD completo para todos os recursos
  - API versão 1: `/api/v1/health`, `/api/v1/posts`, `/api/v1/settings`, `/api/v1/status`
  - Autenticação: `/api/auth/login`, `/api/auth/logout`

- **Hooks Customizados**
  - `useTheme`: gerenciamento de tema light/dark com tokens de design
  - `useAuth`: contexto global de autenticação
  - `useAdminAuth`: autenticação específica do admin com redirect
  - `useAdminCrud`: CRUD reutilizável para painéis admin
  - `useApiFetch`: hook genérico de fetch com loading/error/cache
  - `useDebounce`: hook utilitário de debounce
  - `usePerformanceMetrics`: monitoramento de Core Web Vitals

### Infraestrutura

- Configuração Jest com ambiente jsdom, transformação Babel e mapeamento de aliases
- Setup global de testes com polyfills para JSDOM
- Teardown global com fechamento de conexões Redis e PostgreSQL
- Configuração Cypress para testes E2E

---

## [1.2.0] - 2026-03-XX

### Adicionado

- **Sistema de Admin**
  - Componente base genérico `AdminCrudBase` para operações CRUD
  - Tabela com colunas configuráveis, ordenação e paginação
  - Formulário dinâmico baseado em configuração de campos
  - Drag & Drop para reordenação
  - Exportação CSV, busca local
  - Toggle de status (Publicado/Rascunho) com atualização otimista
  - Validação via Zod

- **Gerenciadores Admin**
  - BackupManager: gerenciamento de backups
  - CacheManager: gerenciamento de cache Redis
  - IntegrityCheck: verificação de integridade
  - RateLimitViewer: visualizador de rate limit

### Infraestrutura

- Configuração Babel exclusiva para testes Jest
- Mocks manuais: cookie, pg, styleMock
- Mocks globais para testes: db.js, fetch.js, next.js

---

## [1.1.0] - 2026-02-XX

### Adicionado

- **Scripts de Automação**
  - Scripts de inicialização: init-server, seed-all, seed por recurso
  - Scripts de banco de dados: db-shell, create-backup, restore-backup, clear-db
  - Scripts de manutenção: clean-orphaned-images, clean-k6-reports, monitor-disk-space
  - Scripts de migração de banco de dados
  - Scripts de diagnóstico
  - Scripts de teste: validação de schema, verificação de servidor

- **Exemplos de Implementação**
  - SEO para posts de blog (exemplo completo com 242 linhas)
  - SEO para homepage
  - SEO para seção de músicas
  - SEO para seção de vídeos

---

## [1.0.0] - 2026-01-XX

### Adicionado

- **Lançamento Inicial do Projeto "Caminhar com Deus"**
  - Configuração Next.js com Pages Router
  - Estrutura de banco de dados PostgreSQL
  - Sistema de autenticação com JWT e bcrypt
  - Layout responsivo com suporte a tema light/dark
  - Integração com Spotify, YouTube e Mercado Livre
  - Estrutura inicial de componentes e páginas
  - Configuração de CI/CD básica

### Infraestrutura Inicial

- Node.js 24.22.0 como engine
- ES Modules como padrão
- Configuração de lint e formatação
- Estrutura de diretórios do projeto
- Configuração de aliases de importação (`@/`, `@tests/`, `@factories/`, etc.)

---

[1.4.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/caminhar-deus/Caminhar/releases/tag/v1.0.0