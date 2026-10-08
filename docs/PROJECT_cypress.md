# Análise da Pasta `/cypress`

## Visão Geral

A pasta `/cypress` contém os testes end-to-end (E2E) do projeto, utilizando o framework **Cypress** (`^16.1.0`). A estrutura conta com **5 arquivos de teste**, **25 cenários** distribuídos em 4 páginas/sistemas, e suporte com `fixtures/` e `support/`.

A configuração global do Cypress está em `cypress.config.js` (na raiz do projeto), e os scripts de execução estão definidos no `package.json`.

---

## Estrutura de Arquivos

```
cypress/
├── e2e/
│   ├── image_zoom.cy.js   (12 cenários) — Zoom de imagem (lightbox)
│   ├── home.cy.js          (4 cenários)  — Página inicial
│   ├── blog.cy.js          (3 cenários)  — Listagem do blog
│   ├── post.cy.js          (3 cenários)  — Post individual
│   └── navigation.cy.js    (3 cenários)  — Navegação entre páginas
├── fixtures/
│   └── posts.json
├── support/
│   ├── commands.js          (8 comandos customizados)
│   └── e2e.js
├── videos/                  (artefato de execução — fora do Git, ver `.gitignore`)
└── screenshots/             (artefato de execução em falha — fora do Git, ver `.gitignore`)
```

---

## Arquivos de Configuração

### `cypress.config.js` (raiz do projeto)

**Localização:** `/cypress.config.js`

**Propósito:**
Arquivo de configuração global do Cypress. Define timeouts, resolução de viewport, política de retentativas, gravação de vídeo e screenshots em falhas, além da URL base da aplicação e caminho do suporte.

**Principais configurações:**

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `projectId` | `kddcrf` | Identificador do projeto no Cypress Cloud |
| `defaultCommandTimeout` | 10000 ms | Timeout padrão para comandos |
| `requestTimeout` | 10000 ms | Timeout para requisições HTTP |
| `pageLoadTimeout` | 30000 ms | Timeout para carregamento de página |
| `retries.runMode` | 2 | Tentativas em modo headless (CI) |
| `retries.openMode` | 0 | Sem retentativas no modo interativo |
| `viewportWidth` | 1280 px | Largura padrão da viewport |
| `viewportHeight` | 720 px | Altura padrão da viewport |
| `baseUrl` | `http://localhost:3000` | URL base da aplicação |
| `video` | `true` | Grava vídeo da execução |
| `screenshotOnRunFailure` | `true` | Captura screenshot em falha |
| `supportFile` | `cypress/support/e2e.js` | Caminho do arquivo de suporte |
| `allowCypressEnv` | `false` | Bloqueia acesso inseguro a `Cypress.env()` no navegador |

**Observação:** O método `setupNodeEvents` está implementado porém vazio, sem plugins ou tarefas Node registradas.

---

### Scripts no `package.json`

**Localização:** `/package.json`

Os seguintes scripts gerenciam a execução dos testes E2E:

| Script | Comando | Descrição |
|--------|---------|-----------|
| `precypress:run` | `node scripts/warm-routes.js` | Hook de pré-aquecimento executado automaticamente antes de `npm run cypress:run`, **desde que o comando passe pelo npm** (`npm run cypress:run`, `npm run test:e2e`, `npm run test:e2e:record`). **Não roda** no E2E isolado: `scripts/e2e-isolated.js` chama `npx cypress run` diretamente e hooks de lifecycle do npm só disparam via `npm run <script>`. |
| `test:e2e` | `npm run cypress:run` | Pré-aquece e executa os testes em modo headless contra o banco de desenvolvimento |
| `test:e2e:isolated` | `node scripts/e2e-isolated.js` | E2E autocontido contra dados reais em **Postgres descartável** (Testcontainers `postgres:15`): container → migrations → seed de 4 posts → build (reaproveita `.next/BUILD_ID` se existir) → `next start` → `cypress run` com propagação de exit code → teardown em `try/finally`. Não depende do banco de desenvolvimento nem do pré-aquecimento. É o comando executado pelo workflow `.github/workflows/e2e.yml` (ver seção abaixo). |
| `test:e2e:record` | `npm run cypress:run -- --record --key "$CYPRESS_RECORD_KEY"` | Pré-aquece e executa com gravação no Cypress Cloud (chave via variável de ambiente) |
| `cypress:open` | `cypress open` | Abre o Cypress no modo interativo (sem pré-aquecimento) |
| `cypress:run` | `cypress run` | Pré-aquece e executa os testes em modo headless |

---

## Execução Isolada (`test:e2e:isolated`)

**Arquivos:** `scripts/e2e-isolated.js`, script npm `test:e2e:isolated` e workflow `.github/workflows/e2e.yml`.

**Por quê:** `npm run cypress:run` depende do banco de desenvolvimento (`.env` → `DATABASE_URL`) para renderizar `/blog`, `/blog/[slug]` e a home — os specs só passam se o banco estiver semeado do jeito certo, e a execução deixa sujeira nele. O orquestrador espelha o padrão que o repo já usa nos testes com banco real (`tests/global-setup.db.js`): PostgreSQL efêmero via Testcontainers.

**Fluxo (tudo dentro de `try/finally`):** sobe o container `postgres:15` (mesma tag do serviço `postgres` do CI e de `tests/global-setup.db.js`, **sem** `.withReuse(true)`) → `scripts/migrate.js` apontado para o container → semeia os posts → reaproveita `.next/BUILD_ID` se existir, senão `npx next build` → `npx next start -p 3000` → espera a app responder HTTP 200 → `npx cypress run` **propagando o exit code** → no `finally`: derruba os processos filhos, `container.stop()` e limpa `cypress/videos/` e `cypress/screenshots/` **apenas em execução local**. Na CI a limpeza é pulada de propósito (`isCI()`: `CI === 'true'` ou `GITHUB_ACTIONS === 'true'`), porque na CI esses diretórios são a evidência de uma falha e o step de upload do `e2e.yml` roda **depois** do script — apagá-los destruiria a única pista de uma reprovação.

**Garantia central:** o `DATABASE_URL` do banco de desenvolvimento **nunca** é passado aos filhos — é sempre sobrescrito com a URL do container (o `dotenv`/`@next/env` não sobrescreve variáveis já presentes no env), então o banco de dev não é referenciado em nenhum momento.

### Seed — 4 posts (decisão registrada)

- **Principal:** `mulher-virtuosa`, com imagem `public/e2e-fixture-mulher-virtuosa.jpg` — usado por `post.cy.js` e `image_zoom.cy.js`.
- **3 de apoio, sem `image_url`:** `components/Features/Blog/BlogSection.js:59` só renderiza o `<Link href="/blog">` sob `{limit && posts.length > limit && ...}` e a home é montada com `limit={3}` (`components/Features/ContentTabs/index.js:22`) — logo o link "ver mais" só aparece com **4+ posts publicados**, e `cypress/e2e/navigation.cy.js:4` depende dele. Com 1 post, esse teste é impossível por construção e a suíte ficaria 24/25. Os 3 sem `image_url` também exercitam o caminho "post sem imagem" (`pages/blog/[slug].js:86` só renderiza o zoom quando `image_url` é truthy).
- **`post-inexistente` NÃO é semeado:** é o caso de 404 que `image_zoom.cy.js:49` usa para provar que a página trata bem a ausência; criá-lo inverteria o sentido do teste.
- **Todos com `published=true`:** `pages/blog/[slug].js:192` filtra por `published = true` e `lib/domain/posts.js:18` marca a listagem como `publishedOnly`, mas o default do schema em `scripts/schemas/posts.json` é `false`.

### O que o E2E isolado não precisa

- **Não usa `warm-routes.js`.** O bug do Turbopack (rotas dinâmicas compiladas preguiçosamente) existe **apenas em `next dev`**; em `next build` tudo é compilado antes — e o E2E roda contra build de produção. O `warmCriticalRoute()` do `e2e-isolated.js` é **diagnóstico de pré-voo** (um fetch que confirma que a app serve o post semeado), não um contorno.
- **Não dispara o hook `precypress:run`** (hooks do npm só rodam via `npm run <script>`; o script chama `npx cypress run` direto).
- **Nenhum spec foi alterado** para fazer a suíte passar.

### Workflow `.github/workflows/e2e.yml` — 4º check

| Campo | Valor |
|-------|-------|
| Gatilhos | `push` em `main` + `workflow_dispatch` — **sem `pull_request`** (decisão deliberada: coletar flakiness real antes de cobrar o E2E em todo PR) |
| Runner / job | Job único, `ubuntu-latest`, `timeout-minutes: 15` |
| Permissões / secrets | `permissions: contents: read`; **nenhum secret** (o run não grava no Cypress Cloud) |
| Passos | checkout → setup-node (24.15.0, cache npm) → `npm ci` → `node scripts/e2e-isolated.js` (sem `continue-on-error`) → upload de `cypress/videos` (com `if-no-files-found: warn` — com `video: true` o Cypress sempre gera um vídeo por spec, então diretório vazio é anomalia e precisa aparecer) e de `cypress/screenshots` (mantém `ignore`, pois `screenshotOnRunFailure` só produz arquivo quando um teste reprova), ambos com `if: always()` e `retention-days: 7` |
| Papel | É o **4º check** pretendido para a branch protection, junto de `lint`, `coverage` e `coverage-report` (ver item R de `docs/PENDENCIAS_scripts_testes.md`) |

### Validação (08/10/2026)

**Local:**

- **25 de 25 testes passando, exit code 0** — specs: `blog` 3/3, `home` 4/4, `image_zoom` 12/12, `navigation` 3/3, `post` 3/3.
- **Execução com `.next` reaproveitado: 36,07 s.** **Execução fria, sem `.next` (compilando): 44,50 s.**
- **Zero resíduo:** banco de desenvolvimento com 0 posts antes e depois (nunca referenciado), 0 containers órfãos, 0 processos `next`/`cypress` vivos, porta 3000 livre.
- **Limpeza condicionada à CI (correção):** com `CI=true GITHUB_ACTIONS=true` o log é `🧹 [e2e-isolated] CI detectada — preservando cypress/videos e cypress/screenshots para o upload de artifact.` e os **5 `.mp4` sobrevivem** ao teardown (exit 0, 54,20 s); sem CI o log é `🧹 [e2e-isolated] Removidos 5 artefato(s) não rastreado(s) de cypress/videos/` e restam **0 vídeos** (exit 0).

**Na CI — primeira execução da história do repositório:** run **`37770170647`** (sha `bad320f`, 08/10/2026), workflow `E2E Isolated (Cypress)`, **`conclusion: "success"`**. Tempos por step: `npm ci` **42 s**; **`Run E2E Isolated` 59 s** (contra os 44,50 s medidos localmente — ~33% mais lento, esperado em runner compartilhado); job inteiro **1m56s**, contra o `timeout-minutes: 15`. O gate no mesmo push, run **`37770170612`** (mesmo sha `bad320f`), também terminou verde, com o step `Build Application` em **7 s**. Detalhe do run `37770170647`: ele foi **verde com `artifacts.total_count: 0`** — a limpeza incondicional do script apagava os vídeos antes do upload (corrigido logo em seguida; ver a nota em `/cypress/videos/`).

---

## Arquivos de Suporte

### `/cypress/support/e2e.js`

**Localização:** `cypress/support/e2e.js`

**Propósito:**
Ponto de entrada global de suporte. É processado automaticamente antes de cada arquivo de teste. Atualmente, apenas importa o arquivo de comandos customizados.

**Funcionalidades:**
- Importa `./commands.js` para disponibilizar comandos customizados globalmente.

---

### `/cypress/support/commands.js`

**Localização:** `cypress/support/commands.js`

**Propósito:**
Define comandos customizados reutilizáveis em todos os testes E2E, encapsulando operações repetitivas como login, manipulação de viewport e interações com o lightbox de imagens.

**Comandos disponíveis:**

| Comando | Parâmetros | Descrição |
|---------|-------------|-----------|
| `cy.login(email, password)` | `email` (default: `admin@caminhar.com`), `password` (default: `senha123`) | Simula login como admin via interceptação de API |
| `cy.createPost(post)` | `post` (objeto com dados do post) | Mocka a criação de um post via interceptação de API |
| `cy.viewportMobile()` | — | Altera viewport para 375×667 (iPhone SE) |
| `cy.viewportTablet()` | — | Altera viewport para 768×1024 (iPad) |
| `cy.lightboxShouldBeOpen()` | — | Verifica se o lightbox de imagem está visível |
| `cy.lightboxShouldBeClosed()` | — | Verifica se o lightbox de imagem foi removido do DOM |
| `cy.openLightbox()` | — | Clica no container de zoom e verifica abertura do lightbox |
| `cy.closeLightboxByOverlay()` | — | Fecha o lightbox clicando no overlay e verifica remoção |

**Observação:** Os comandos `cy.login()` e `cy.createPost()` **não são utilizados** por nenhum teste atual.

---

## Dados Mockados (Fixtures)

### `/cypress/fixtures/posts.json`

**Localização:** `cypress/fixtures/posts.json`

**Propósito:**
Arquivo JSON com dados mockados de posts para reutilização em testes.

**Conteúdo:** 1 post mockado:
- `id`: 1570
- `title`: "Mulher Virtuosa"
- `slug`: "mulher-virtuosa"
- `excerpt`: "Provérbios 31 : 10"
- `image_url`: `/uploads/post-image-6010b274-c22f-486a-80a9-dbf9c70d4535.png`
- `created_at`: "2026-05-18T10:27:42.121Z"
- `content`: Versículo bíblico de Provérbios 31:10

**Observação:** Nenhum teste atual importa esta fixture via `cy.fixture()`.

---

## Arquivos de Teste (E2E)

### `/cypress/e2e/home.cy.js`

**Localização:** `cypress/e2e/home.cy.js` — 4 cenários

**Propósito:**
Testa a página inicial do site (`/`), verificando carregamento básico, presença de título, elementos de navegação e seção de conteúdo principal.

**Cenários:**
1. Carregamento da página sem erros (`h1` existe)
2. Título da página não vazio
3. Existência de `<main>` e `<h1>`, e links de navegação
4. Seção de conteúdo principal (`<main>`)

**Observação:** O teste reconhece que a página atual não possui `<nav>` ou `<header>` HTML, validando navegação via links com `href` (`a[href*="/"]`).

---

### `/cypress/e2e/blog.cy.js`

**Localização:** `cypress/e2e/blog.cy.js` — 3 cenários

**Propósito:**
Testa a página de listagem do blog (`/blog`), verificando carregamento da página, título e presença de links para posts individuais.

**Cenários:**
1. Carregamento da listagem de posts (`h1` existe)
2. Título da página não vazio
3. Pelo menos 1 link apontando para `/blog/[slug]`

---

### `/cypress/e2e/post.cy.js`

**Localização:** `cypress/e2e/post.cy.js` — 3 cenários

**Propósito:**
Testa a página de post individual (`/blog/[slug]`), utilizando um slug real do banco de dados (`mulher-virtuosa`). Verifica exibição de imagem, conteúdo do post e botões de compartilhamento.

**Cenários:**
1. Carregamento do post com imagem (título e container de zoom)
2. Exibição do conteúdo textual do post (contém "Provérbios")
3. Exibição dos botões de compartilhamento (Facebook e WhatsApp)

**Slug utilizado:** `mulher-virtuosa` (existente no banco PostgreSQL)

**Observação:** Não possui mock de API — depende de dados reais do banco.

---

### `/cypress/e2e/navigation.cy.js`

**Localização:** `cypress/e2e/navigation.cy.js` — 3 cenários

**Propósito:**
Testa a navegação entre páginas do site, incluindo transições da home para o blog e para posts individuais, além do acesso à página admin sem autenticação.

**Cenários:**
1. Navegação da home (`/`) para `/blog`
2. Navegação da home para `/blog/[slug]`
3. Acesso à página `/admin` interceptando resposta de autenticação como 401 (não autenticado)

**Observação:** O cenário do admin usa `cy.intercept('GET', '/api/auth/check', ...)` para simular usuário não autenticado, mas apenas verifica que o `body` existe — não valida o comportamento de redirecionamento ou mensagem de erro.

---

### `/cypress/e2e/image_zoom.cy.js`

**Localização:** `cypress/e2e/image_zoom.cy.js` — 12 cenários

**Propósito:**
Testa a funcionalidade de zoom de imagem (lightbox) em páginas de post do blog, organizado em 4 grupos: fluxo principal, casos de borda, responsividade e acessibilidade.

**Slugs utilizados:**
- `mulher-virtuosa` — post real com imagem
- `post-inexistente` — slug fictício que retorna 404

**Grupos de teste:**

| Grupo | Cenários | Descrição |
|-------|----------|-----------|
| Fluxo principal (happy path) | 5 | Exibição do container/thumbnail, abertura do lightbox ao clicar, fechamento via overlay, fechamento via tecla Esc, reabertura após fechar |
| Testes de borda (edge cases) | 3 | Post inexistente (sem container), clique direto na imagem ampliada, múltiplos ciclos de abertura/fechamento |
| Responsividade | 2 | Funcionamento em viewport mobile (375×667) e tablet (768×1024) |
| Acessibilidade | 2 | Atributos ARIA corretos (`role="dialog"`, `aria-modal`, `aria-label`) e gerenciamento de foco |

**Seletores:** Utiliza exclusivamente atributos `data-testid` semânticos (`image-zoom-container`, `image-lightbox`, `image-lightbox-img`, etc.), tornando os testes resistentes a mudanças de estilo/CSS.

**Observação:** O teste de acessibilidade valida que o foco é movido para o lightbox ao abri-lo (gerenciado via `useRef` + `useEffect` + `tabIndex` no componente), e um dos testes de borda valida o comportamento atual da aplicação onde o clique na imagem ampliada fecha o lightbox (sem `stopPropagation`).

---

## Diretórios de Artefatos

### `/cypress/screenshots/`

**Estado atual:** Diretório **não existe** no disco (só é criado quando um teste falha em modo headless) e está **fora do Git** — regra `cypress/screenshots/` no `.gitignore`.

**Propósito:** Diretório onde o Cypress salva screenshots automaticamente quando um teste falha em modo headless. O fato de não existir indica que nunca houve falhas em execuções headless, ou que os testes nunca foram executados em modo headless desde que a pasta foi limpa/criada.

**Nota:** Incluída no `eslint.config.js` na lista de diretórios ignorados (`cypress/screenshots/**`).

---

### `/cypress/videos/`

**Estado atual:** os **5 arquivos `.mp4`** (≈ 2,8 MB) que eram versionados foram **desindexados** (`git rm --cached`) e a pasta passou a estar no `.gitignore` (regra `cypress/videos/`). Motivo: o Cypress deriva nomes determinísticos e **sobrescrevia os arquivos versionados a cada execução**, sujando o `git status`; vídeo de execução é resíduo, não fonte.

**Arquivos gerados a cada execução:**
- `blog.cy.js.mp4`
- `home.cy.js.mp4`
- `image_zoom.cy.js.mp4`
- `navigation.cy.js.mp4`
- `post.cy.js.mp4`

**Propósito:** Diretório onde o Cypress salva as gravações em vídeo de cada execução de arquivo de teste (gerado quando `video: true` na configuração). Útil para debug visual de falhas em CI — no `e2e.yml` os vídeos são subidos como artefato mesmo quando o job falha (`if: always()`).

**Nota:** Já incluído no `eslint.config.js` na lista de diretórios ignorados (`cypress/videos/**`). O `scripts/e2e-isolated.js` apaga esse conteúdo no `finally` de cada **execução local**; na CI o conteúdo é **preservado de propósito** (`isCI()`), para o upload de artifact do `e2e.yml`. Essa condição **não existia na versão original**, que apagava os arquivos de forma incondicional — e assim produziu um **run verde sem nenhuma evidência**: o primeiro run de E2E na CI, `37770170647` (sha `bad320f`, 08/10/2026), terminou com `conclusion: "success"` mas `GET /actions/runs/37770170647/artifacts` respondeu **`total_count: 0`** — o teardown destruía a única prova de uma falha e o step de upload passava em silêncio. Por isso o `if-no-files-found` do step de vídeo virou `warn` (com `video: true` o Cypress sempre gera um vídeo por spec, então diretório vazio ali é anomalia).

---

## Métricas Gerais

| Métrica | Valor |
|---------|-------|
| Total de arquivos de teste | 5 |
| Total de cenários (`it`) | 25 |
| Total de grupos de teste (`describe`/`context`) | 9 |
| Total de comandos customizados | 8 |
| Arquivos de suporte | 2 (`commands.js`, `e2e.js`) |
| Arquivos de fixture | 1 (`posts.json`) |
| Total de linhas (todos os testes) | ~215 |
| Diretórios de artefatos | 2 (`videos/`, `screenshots/` — gerados por execução e fora do Git) |

---

## Observações Gerais

- **Slugs reais do banco:** Os testes de `post.cy.js` e `image_zoom.cy.js` utilizam slugs que existem no banco PostgreSQL — no E2E isolado, os posts do container descartável semeados pelo próprio orquestrador (ver "Execução Isolada"), validando o comportamento real da aplicação (sem mocks).
- **Padrão `data-testid`:** Todos os seletores em `image_zoom.cy.js` utilizam atributos `data-testid` semânticos, prática recomendada para resiliência dos testes.
- **Comandos reutilizáveis:** Operações comuns do lightbox foram abstraídas em comandos customizados (`cy.openLightbox()`, `cy.lightboxShouldBeOpen()`, `cy.lightboxShouldBeClosed()`, `cy.closeLightboxByOverlay()`), promovendo reuso e legibilidade.
- **Lint configurado:** O `eslint.config.js` já inclui o `eslint-plugin-cypress` com as regras recomendadas para arquivos `cypress/**/*.js`, e ignora `cypress/videos/**` e `cypress/screenshots/**`.
- **Mocks por interceptação:** O comando `cy.login()` e `cy.createPost()` utilizam `cy.intercept()` para simular respostas de API sem necessidade de backend real (embora não sejam usados pelos testes atuais).
- **Sem dependências de plugins:** O arquivo de configuração não registra plugins ou tarefas customizadas no `setupNodeEvents`.
- **Execução local:** `npm run test:e2e` (ou `npm run cypress:run`) contra o banco de desenvolvimento, com pré-aquecimento pelo hook `precypress:run`, ou `npm run cypress:open` para o modo interativo. Alternativa **isolada**: `npm run test:e2e:isolated`, que sobe seu próprio Postgres descartável e não depende do estado do banco de dev (ver seção "Execução Isolada").
- **Execução no CI:** o E2E **entrou no pipeline** em 08/10/2026 pelo workflow dedicado `.github/workflows/e2e.yml` (job único, `timeout-minutes: 15`, `permissions: contents: read`, nenhum secret), que roda `node scripts/e2e-isolated.js` em `push` para `main` e via `workflow_dispatch` — **sem `pull_request`**, decisão deliberada de coletar flakiness real antes de cobrar o E2E em toda abertura de PR. É o **4º check** pretendido para a branch protection (junto de `lint`, `coverage` e `coverage-report`). O gate de cobertura (`.github/workflows/test-coverage.yml`) continua **sem** E2E: roda apenas `npm run lint`, a suíte Jest (`npx jest --ci --coverage`), `actionlint` e `knip` — e dispara em `pull_request`, em `push` para `main` e via `workflow_dispatch` (o histórico de **0 runs** era o estado até 07/10/2026, enquanto o gatilho era somente `pull_request` e o projeto fazia push direto na `main`).