# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Não publicado]

### Corrigido

- **O `orchestrator` estava rodando num modelo que saiu do catálogo — e a reserva não assumiu.** `space-bunny-free` deixou de existir no catálogo do OpenCode Zen (três provas: `opencode models` não lista, a busca por "space-bunny" volta zero, e o spawn responde `provider.no-route: "Model unavailable"`), e era o **primário** da cadeia do preset. A sessão não caiu na reserva (`big-pickle`): caiu no **default do provider**. A causa está no log do slim — o hook `v2.session.retry` registra `failover: false` para o erro de id fora do catálogo, porque `provider.no-route` não é classificado como failover (a cadeia só age em rate limit, 401/403, 5xx e timeout). **A reserva da cadeia cobre rate limit e 5xx, não a saída do primário do catálogo** — o que protege contra esse modo de falha é conferir `opencode models` e trocar o id apontado. O `model` da sessão em `opencode.jsonc` apontava para o mesmo id morto e foi corrigido. O primário passou a `minimax-m3.1-flash-free`, medido no papel real do orchestrator: 3 execuções, 2 turnos por sessão, 21/24 itens do Camada B e **0 erros verificáveis**, contra 19/24 e 1 erro do `big-pickle` — o desempate é o critério desta decisão ("menos erros verificáveis"). A reserva (`big-pickle`) segue declarada, com o alcance delimitado.

- **O bench do orchestrator media contaminado, por três vias que ninguém tinha visto.** (a) **A memória do projeto é uma via de contaminação do gabarito**: o modelo sob teste grava a *resposta* da tarefa em `notes/auditoria-auth-pages-api-2026-10-19.md` e a execução seguinte a lê de volta — o mesmo que ler o gabarito, por um caminho que o detector de `scripts/bench/` não via. (b) **Falso positivo de contaminação**: `ls scripts/bench/` (confirmar que o diretório existe, sem abrir nada) era tratado como leitura do gabarito, e a execução era descartada. (c) **Falso positivo de citação**: `MASTER.md` e `Input.module.css` são escritos na forma relativa ao diretório que o modelo conhece; resolvidos por prefixo fixo, apontavam para o arquivo errado e a citação certa era reprovada. Os três foram corrigidos, e a correção está documentada no ADR-0008 — o próximo bench de qualquer papel vai esbarrar neles.

- **A bateria de papel do `fixer` media a tarefa errada depois da primeira execução.** A tarefa é corrigir um defeito *real* do código; o primeiro fixer corrigiu `pages/api/status.js` e as execuções seguintes herdaram o arquivo já corrigido — o bench passou a medir quem escreve teste para um arquivo pronto. O runner agora restaura o repositório entre execuções (`git checkout --` em arquivo rastreado, remoção em não rastreado, **nunca** `git reset --hard`, e preservando o que é do bench).

- **Pontuação do Camada B do bench do orchestrator, item a item, por script** (`scripts/bench/orchestrator/pontuar.js`). O gabarito é a verdade e o script confere cada item — a contagem de arquivos e rotas, o ponto de aplicação da autenticação, a proteção externa e o `405`. Isso revelou que o `minimax` erra a contagem de rotas registradas pelo Next (afirma 32; o manifest registra 31) e que **os três** modelos erram o `405` — lacuna comum, não o que os separa.

### Adicionado

- **Baterias de **papel** para `designer` e `fixer`, em `scripts/bench/papeis/`.** O bench do orchestrator mede o papel do agente primário, que é único; para os outros papéis o mecanismo é o inverso — o papel é o **agente** (`--agent designer`) e o modelo é o que se troca (`--model` sobrepõe o modelo do preset sem mudar prompt, skills nem permissões). Tarefas e gabaritos próprios por papel, porque as do orchestrator (auditoria de `pages/api/`) não têm relação com conformidade de token nem com correção de código. `designer`: conformidade de foco e contraste (o `:focus-visible` do `Button` usa só o `box-shadow` do anel, proibido por `MASTER.md:149-150`; a proibição do `--color-text-tertiary`; e os quatro usos do token no `Input`, um deles violando). `fixer`: vazamento de `error.message` em rota pública — e aqui o veredito **não** é a resposta do modelo: a correção de cada execução é reaplicada e a suíte rodada de verdade (o teste novo tem de falhar no código original, passar no corrigido, e a suíte inteira ficar verde).

- **Cobertura de teste para os gates da suíte k6**, que até agora não tinha nenhuma — nada em `load-tests/` era exercitado por jest.
  - `tests/unit/load-tests/profiles.test.js`: 9 testes de caracterização de `getProfile`/`PROFILES`. Travam o comportamento atual, incluindo o descarte de thresholds do perfil base quando o override traz `thresholds`, com os 2 casos do descarte marcados como limitação conhecida e apontando o item AD. Inclui controle negativo que prova ter força (mutar o resultado de `getProfile` não contamina `PROFILES`).
  - `tests/unit/github-workflows/k6-version-pin.test.js`: varre **todos** os `.yml` de `.github/workflows/` em vez de fixar um arquivo, e exige que todo uso de `grafana/setup-k6-action` tenha `k6-version` **sem prefixo `v`**, com um helper que torna explícita a formação da URL de release. É a regra que teria reprovado o run #15 no CI de push, em vez de 20 horas depois no cron.
  - Ambos com **prova de mutação executada e registrada**: reintroduzir `k6-version: 'v2.3.0'` reprova 3 asserções do segundo arquivo; simular a Fase 1 no `profiles.js` reprova exatamente os 2 casos de caracterização marcados como limitação.

### Corrigido

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

### Adicionado

- **Bench do papel do `orchestrator`, em `scripts/bench/orchestrator/`.** É a medição que o ADR-0008 apontava como evidência faltante e que nunca tinha sobrevivido: o script antigo morava em `/tmp/opencode/bench-orch/` e se perdeu com a limpeza do `/tmp`, e exigia `OPENCODE_API_KEY` porque chamava a API do Zen de fora — caminho que o free tier recusa ("can only be used from within OpenCode"). A versão nova roda `opencode run --model ... --format json --auto`, que abre uma **sessão real** pelo host com a credencial já guardada: **sem chave**, e mais fiel, porque medir o orchestrator por proxy (outro agente exercitando o papel) é a fraqueza que o ADR registra desde 15/10. `--model` troca só o agente primário — os subagentes seguem com os modelos do preset, o que isola a variável. A tarefa (`tarefa.md`) é uma auditoria de autenticação de `pages/api/` com gabarito conferido em `arquivo:linha` (`gabarito.md`: 32 arquivos, 31 rotas, quatro grupos de autenticação, e a rota cuja segurança vive no `next.config.js`); a `rubrica.md` separa o que o `conferir.js` mede sem juízo (delegou, citações válidas, contaminação) do que só julgamento humano mede (acerto, e a qualidade da orquestração — que é o alvo). A fraqueza é declarada: o gabarito precisa ficar no repositório e o modelo tem leitura do repositório inteiro, então a tarefa proíbe ler `scripts/bench/`, o runner reforça, e uma saída que mencione o diretório é marcada como **contaminada** — execução descartada, não nota zero. Saída em streaming e `--timeout-min` para que execução morta deixe evidência. Comandos: `npm run bench:orch:rodar` e `npm run bench:orch:conferir`. O `resultados/` foi para o `.gitignore` (exceção para o `.gitkeep`): são transcripts crus de sessão. **Dois achados do smoke test** ficaram registrados na `LEIA-ME.md` e na `rubrica.md`: (a) `opencode run` lançado via `spawn` do Node com o `stdio` padrão **trava lendo stdin** — zero bytes, nenhum processo, nenhum erro, enquanto o mesmo comando do bash passa; o `spawn` precisa de `stdio: ['ignore', 'pipe', 'pipe']`; (b) **delegação com `background: true` encerra o turno** — o `opencode run` devolve com a resposta final sendo só "lançei o agente, aguardo", e o resultado do subagente chega depois, na sessão. E o detector de contaminação só olha os campos que representam arquivo (`path`, `pattern`, `command`), porque o modelo repassou ao subagente a própria proibição de ler `scripts/bench/` — uma busca em qualquer campo marcava toda execução como contaminada.

### Documentação

- **O `orchestrator-bench` rodou: `space-bunny-free` se sustenta como primário.** Era a evidência que o ADR-0008 apontava como faltante desde 15/10/2026 — o orchestrator é o agente primário da sessão, não existe como subagente, e toda medição anterior dele foi por proxy. Seis execuções (3 por modelo, primário e reserva), em **dois turnos da mesma sessão**, com a tarefa de `scripts/bench/orchestrator/` e gabarito conferido em `arquivo:linha` fora do modelo. **Veredito: nenhuma troca é justificada** — os dois modelos cometeram 1 erro verificável cada um, na mesma fronteira, e o critério desta decisão é "menos erros verificáveis". 6/6 delegaram exatamente uma vez para o `explorer`, zero contaminações e **zero citações de arquivo/linha inválidas**; o `big-pickle` teve 5 citações em caminho abreviado, o `space-bunny-free` 0. No papel de orquestração, o `big-pickle-3` é que se sobressaiu: recebeu do `@oracle` que o `proxy.js` era código morto por não se chamar `middleware.js`, **verificou na doc local do Next** ("Starting with Next.js 16, Middleware is now called Proxy") e rejeitou o subagente, registrando o conflito — conferido, a correção dele está certa. **Dois achados de método que mudam como o bench é rodado:** (a) a tool `subagent` ignora `background` e sempre despacha em background, então `opencode run` encerra o turno antes da reconciliação — **nenhuma das 6 execuções de turno único entregou resposta final**, e sem o segundo turno (`--turno 2`) a série mediria o dispatcher, não o orchestrator; (b) o detector de citações teve dois falso positivo reais, corrigidos — caminho relativo ao diretório auditado (`admin/users.js`) sendo lido como inexistente, e `` `check.js`: 401 `` (status HTTP em prosa) sendo lido como citação de linha 401. **E o gabarito estava errado:** perguntava por "alguma" proteção externa e respondia só pelo CSP do `next.config.js`, esquecendo o rate limit de `/api/auth/login` no `proxy.js` — erro meu, pego na conferência fora do modelo, corrigido e datado no próprio gabarito.

- **A bateria do `explorer` no papel novo rodou; nada foi trocado.** O `deepseek-v4.1-flash-free`, órfão desde o merge do slim 3.0.5, foi medido contra o incumbent `longcat-2.5-preview-free` na tarefa que o `explorer` faz hoje (repo + doc externa via `context7`/`gh_grep`), com uma execução por modelo e todas as citações conferidas em `arquivo:linha` fora do agente: **7/7 nos pontos pedidos para os dois**, `longcat` 16/16 e `deepseek` 15/16 nas aplicações em produção (o `deepseek` omitiu `pages/api/ip-diagnostico.js:186`), zero erros verificáveis. Empate no pedido, incumbent mais completo — **o `explorer` continua com o `longcat`** e o `deepseek` passa a ser órfão por decisão medida. Registrado em `docs/adr/0008` §19/10/2026. No caminho, dois bloqueios da sessão anterior caíram: **os MCPs estavam de pé** (`list_mcp_resources` devolver `[]` é falso negativo — esses servidores expõem ferramentas, não recursos), e **`opencode models --all` não existe mais no v2.0.32**; sem a flag a listagem já traz os **10** modelos free, o mesmo número do preset. O `orchestrator-bench` segue aberto: o script se foi com a limpeza do `/tmp` e exige `OPENCODE_API_KEY`, ausente no ambiente.

- **Corrigido o dado de atraso do cron de carga.** O intervalo registrado (+6h4 a +19h1) era contaminado: o "+19h07 (pior caso)" vinha do `run_started_at` do run #7 na sua **segunda tentativa** (re-run manual), não do disparo do agendado. Medidos os 13 runs agendados de #1 a #14 (05–17/10/2026), o atraso real é **+4h19 a +7h46**, mediana +6h49 — e está diminuindo. Tabela, critério de medição e correção registrados em `.github/workflows/load-tests.yml`, que passa a ser a fonte única do dado (a tabela duplicada em `PROJECT_load-tests.md` virou ponteiro).
- **Runs #12, #13 e #14 do cron registrados** em `docs/PROJECT_load-tests.md`, com o resultado do experimento do **item AB** (ordem da bateria) em 3 amostras pós-mudança, e o outlier de p95 do run #14 atribuído à **região do runner** (`eastus` → `mexicocentral`), descartando por medição as hipóteses de stall de checkpoint e de regressão de código.

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