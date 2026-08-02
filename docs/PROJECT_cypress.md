# Análise da Pasta `/cypress`

## Visão Geral

A pasta `/cypress` contém os testes end-to-end (E2E) do projeto, utilizando o framework **Cypress** (`^15.19.0`). A estrutura conta com **5 arquivos de teste**, **25 cenários** distribuídos em 4 páginas/sistemas, e suporte com `fixtures/` e `support/`.

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
├── screenshots/            (vazio — gerado sob demanda em falhas)
├── support/
│   ├── commands.js          (8 comandos customizados)
│   └── e2e.js
└── videos/                 (5 vídeos .mp4 de execuções anteriores)
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
| `test:e2e` | `npx cypress run` | Executa os testes em modo headless |
| `test:e2e:record` | `npx cypress run --record --key ...` | Executa com gravação no Cypress Cloud |
| `cypress:open` | `cypress open` | Abre o Cypress no modo interativo |
| `cypress:run` | `cypress run` | Executa os testes em modo headless |

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

**Estado atual:** Vazio.

**Propósito:** Diretório onde o Cypress salva screenshots automaticamente quando um teste falha em modo headless. O fato de estar vazio indica que não houve falhas em execuções recentes, ou que o diretório foi limpo.

**Nota:** Já incluído no `eslint.config.js` na lista de diretórios ignorados (`cypress/screenshots/**`).

---

### `/cypress/videos/`

**Estado atual:** Contém 5 arquivos `.mp4`.

**Arquivos:**
- `blog.cy.js.mp4`
- `home.cy.js.mp4`
- `image_zoom.cy.js.mp4`
- `navigation.cy.js.mp4`
- `post.cy.js.mp4`

**Propósito:** Diretório onde o Cypress salva as gravações em vídeo de cada execução de arquivo de teste (gerado quando `video: true` na configuração). Útil para debug visual de falhas em CI.

**Nota:** Já incluído no `eslint.config.js` na lista de diretórios ignorados (`cypress/videos/**`).

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
| Diretórios de artefatos | 2 (`screenshots/`, `videos/`) |

---

## Observações Gerais

- **Slugs reais do banco:** Os testes de `post.cy.js` e `image_zoom.cy.js` utilizam slugs que existem no banco PostgreSQL, validando o comportamento real da aplicação (sem mocks).
- **Padrão `data-testid`:** Todos os seletores em `image_zoom.cy.js` utilizam atributos `data-testid` semânticos, prática recomendada para resiliência dos testes.
- **Comandos reutilizáveis:** Operações comuns do lightbox foram abstraídas em comandos customizados (`cy.openLightbox()`, `cy.lightboxShouldBeOpen()`, `cy.lightboxShouldBeClosed()`, `cy.closeLightboxByOverlay()`), promovendo reuso e legibilidade.
- **Lint configurado:** O `eslint.config.js` já inclui o `eslint-plugin-cypress` com as regras recomendadas para arquivos `cypress/**/*.js`, e ignora `cypress/videos/**` e `cypress/screenshots/**`.
- **Mocks por interceptação:** O comando `cy.login()` e `cy.createPost()` utilizam `cy.intercept()` para simular respostas de API sem necessidade de backend real (embora não sejam usados pelos testes atuais).
- **Sem dependências de plugins:** O arquivo de configuração não registra plugins ou tarefas customizadas no `setupNodeEvents`.
- **Execução manual:** Os testes E2E são executados manualmente via `npm run test:e2e` ou `npm run cypress:open`. O pipeline de CI (`ci.yml`) roda apenas a suíte Jest (`npm run test:ci`), não incluindo os testes E2E.