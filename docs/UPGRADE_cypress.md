# Levantamento Analítico de Melhorias — `/cypress`

## Visão Geral

**Data da análise:** 24/09/2026
**Versão do Cypress:** `^16.1.0` (confirmada no `package.json`)

Este documento identifica oportunidades de melhoria, pontos de atenção técnica e recomendações para a pasta `/cypress`, com base no estado atual dos arquivos. **Nenhuma alteração foi aplicada.**

> **Documentos de referência consultados:**
> - `/docs/antigos/PROJECT_cypress.md` — versão anterior, desatualizada (usada apenas como apoio)
> - `/docs/resolvidos/UPGRADE_cypress.md` — problemas já resolvidos em iteração anterior (8 itens, todos resolvidos)
> - `/docs/PROJECT_cypress.md` — análise consolidada atual da pasta `/cypress`

---

## Estrutura de Arquivos e Pastas

```
├── cypress/
│   ├── e2e/
│   │   ├── blog.cy.js
│   │   ├── home.cy.js
│   │   ├── image_zoom.cy.js
│   │   ├── navigation.cy.js
│   │   └── post.cy.js
│   ├── fixtures/
│   │   └── posts.json
│   ├── support/
│   │   ├── commands.js
│   │   └── e2e.js
│   └── videos/
│       ├── blog.cy.js.mp4
│       ├── home.cy.js.mp4
│       ├── image_zoom.cy.js.mp4
│       ├── navigation.cy.js.mp4
│       └── post.cy.js.mp4
└── cypress.config.js
```

---

## Resumo dos Pontos Identificados

| # | Categoria | Descrição | Gravidade |
|---|-----------|-----------|-----------|
| 1 | Segurança | Chave do Cypress Cloud ✅ **RESOLVIDO** — usa variável de ambiente | ~~Alta~~ |
| 2 | CI/CD | Testes E2E não executados no pipeline CI | **Alta** |
| 3 | Cobertura | Ausência de testes para múltiplas páginas do site | **Alta** |
| 4 | Manutenção | Duplicidade de testes entre `post.cy.js` e `image_zoom.cy.js` | Média |
| 5 | Manutenção | Comandos customizados não utilizados e fixture sem uso | Média |
| 6 | Confiabilidade | Dependência de slugs reais do banco PostgreSQL | Média |
| 7 | Configuração | `setupNodeEvents` vazio — sem plugins ou tarefas | Baixa |
| 8 | Cobertura | Testes sem verificação de erro e estados de loading | Média |
| 9 | Confiabilidade | Home tests sem isolamento — dependem de conteúdo real | Média |
| 10 | Ferramenta | Sem code coverage configurado para Cypress | Média |
| 11 | Organização | Vídeos `.mp4` residuais versionados no repositório | Baixa |
| 12 | Manutenção | Credenciais hardcoded em `cy.login()` | Média |

---

## Análise Individual de Arquivos

---

### Arquivo 1: `/cypress.config.js`

**Responsabilidade:** Configuração principal do Cypress, definindo timeouts, viewport, URL base, suporte e plugins.

**Configurações definidas:**

| Opção | Valor | Finalidade |
|-------|-------|------------|
| `projectId` | `kddcrf` | Identificação no Cypress Cloud |
| `defaultCommandTimeout` | `10000ms` | Timeout padrão para comandos |
| `requestTimeout` | `10000ms` | Timeout para requisições |
| `pageLoadTimeout` | `30000ms` | Timeout para carregamento de página |
| `retries.runMode` | `2` | Tentativas em modo headless |
| `retries.openMode` | `0` | Sem tentativas em modo interativo |
| `viewportWidth` | `1280` | Largura da viewport |
| `viewportHeight` | `720` | Altura da viewport |
| `e2e.baseUrl` | `http://localhost:3000` | URL base da aplicação |
| `e2e.video` | `true` | Gravação de vídeos das execuções |
| `e2e.screenshotOnRunFailure` | `true` | Screenshot automático em falhas |
| `e2e.allowCypressEnv` | `false` | Bloqueia acesso inseguro a Cypress.env() no navegador |
| `e2e.supportFile` | `cypress/support/e2e.js` | Caminho do arquivo de suporte |
| `setupNodeEvents()` | Vazio | Sem plugins ou tarefas registrados |

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — referenciado diretamente como `supportFile`
- `/cypress/support/commands.js` — importado pelo arquivo de suporte (verificado em análise posterior)

**Observações:**
- `video: true` ativo gera arquivos `.mp4` a cada execução, contribuindo para o crescimento do repositório
- `allowCypressEnv: false` é uma boa prática de segurança, impedindo que variáveis de ambiente Cypress sejam acessadas no navegador

**Problemas identificados:**

1. **`setupNodeEvents` vazio** — Sem plugins (ex: `cypress-axe`, `@cypress/code-coverage`) ou tarefas customizadas para seed/clean de banco
2. **Sem code coverage** — Não há instrumentação para medir cobertura E2E
3. **`video: true` sempre ativo** — Gera arquivos binários a cada execução, potencialmente grandes

**Melhorias recomendadas:**
- Registrar `cypress-axe` para auditoria automatizada de acessibilidade
- Adicionar tarefas Node para seed/clean de banco de dados
- Configurar `@cypress/code-coverage` para instrumentação Istanbul/Babel
- Avaliar desabilitar `video` localmente e manter apenas em CI via variável de ambiente

---

### Arquivo 2: `/cypress/support/e2e.js`

**Responsabilidade:** Arquivo de suporte global do Cypress, processado antes de cada arquivo de teste. Centraliza importações globais e comandos customizados.

**Conteúdo:**
- Importa `./commands.js` (comandos customizados)
- Comentário de documentação explicando a finalidade

**Arquivos acionados ou relacionados:**
- `/cypress/support/commands.js` — importado diretamente

**Observações:**
- Estrutura minimalista, apenas 9 linhas
- Não há hooks globais definidos (ex: `before`, `beforeEach`, `afterEach`)
- Não há configurações globais de interceptores ou timeouts

**Problemas identificados:**

1. **Possível falta de limpeza de estado entre testes** — Sem hooks globais de `beforeEach` para limpar localStorage, cookies ou resetar estado da aplicação

**Melhorias recomendadas:**
- Adicionar `beforeEach` para limpar localStorage/cookies antes de cada teste, garantindo isolamento
- Adicionar tratamento global de exceções não capturadas (ex: `Cypress.on('uncaught:exception')`)
- Adicionar interceptadores globais comuns se necessário

---

### Arquivo 3: `/cypress/support/commands.js`

**Responsabilidade:** Definir comandos customizados reutilizáveis para os testes E2E.

**Comandos definidos:**

| Comando | Descrição | Utilizado |
|---------|-----------|-----------|
| `cy.login(email, password)` | Simula login admin via mock de API | ❌ Não utilizado |
| `cy.createPost(post)` | Mocka criação de post | ❌ Não utilizado |
| `cy.viewportMobile()` | Define viewport mobile (375x667) | ✅ Em `image_zoom.cy.js` |
| `cy.viewportTablet()` | Define viewport tablet (768x1024) | ✅ Em `image_zoom.cy.js` |
| `cy.lightboxShouldBeOpen()` | Verifica se lightbox está aberto | ✅ Em `image_zoom.cy.js` |
| `cy.lightboxShouldBeClosed()` | Verifica se lightbox está fechado | ✅ Em `image_zoom.cy.js` |
| `cy.openLightbox()` | Abre lightbox clicando no container | ✅ Em `image_zoom.cy.js` |
| `cy.closeLightboxByOverlay()` | Fecha lightbox clicando no overlay | ✅ Em `image_zoom.cy.js` |

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — importa este arquivo
- `/cypress/e2e/image_zoom.cy.js` — utiliza `openLightbox`, `closeLightboxByOverlay`, `lightboxShouldBeOpen`, `lightboxShouldBeClosed`, `viewportMobile`, `viewportTablet`

**Observações:**
- Comandos de lightbox e viewport são extensivamente utilizados em `image_zoom.cy.js`
- Comandos `login` e `createPost` NÃO são utilizados por nenhum teste atual (verificado via busca)
- Credenciais hardcoded no `login`: `admin@caminhar.com` / `senha123`

**Problemas identificados:**

1. **Comandos não utilizados** — `cy.login()` e `cy.createPost()` são definidos mas nunca chamados em nenhum teste E2E atual
2. **Credenciais hardcoded** — O comando `cy.login()` possui credenciais de admin como valores padrão

**Código morto:**
- `cy.login()` — definido mas sem chamadas identificáveis nos testes E2E
- `cy.createPost()` — definido mas sem chamadas identificáveis nos testes E2E

**Melhorias recomendadas:**
- Remover comandos não utilizados ou criar testes de admin que os utilizem
- Mover credenciais para variáveis de ambiente (`Cypress.env('ADMIN_EMAIL')`, `Cypress.env('ADMIN_PASSWORD')`)

---

### Arquivo 4: `/cypress/fixtures/posts.json`

**Responsabilidade:** Armazenar dados mock de posts para uso nos testes E2E.

**Conteúdo:** Array com 1 objeto de post contendo:
- `id`: 1570
- `title`: "Mulher Virtuosa"
- `slug`: "mulher-virtuosa"
- `excerpt`: "Provérbios 31 : 10"
- `image_url`: "/uploads/post-image-6010b274-c22f-486a-80a9-dbf9c70d4535.png"
- `created_at`: "2026-05-18T10:27:42.121Z"
- `content`: citação de Provérbios 31:10

**Arquivos acionados ou relacionados:** Nenhum — não é importado por nenhum teste.

**Observações:**
- Dados correspondem ao post real "Mulher Virtuosa" utilizado nos testes `post.cy.js` e `image_zoom.cy.js`
- O slug `mulher-virtuosa` é diretamente referenciado nos testes E2E
- Fixture está disponível para centralizar dados mockados, mas não é utilizada

**Problemas identificados:**

1. **Fixture não utilizada** — Nenhum teste importa `posts.json` via `cy.fixture('posts')`. Os dados estão duplicados inline nos testes que referenciam o post "Mulher Virtuosa".

**Código morto:**
- Arquivo `posts.json` completo — definido mas sem referência em nenhum teste E2E

**Melhorias recomendadas:**
- Importar `posts.json` nos testes de blog/post via `cy.fixture('posts')` para centralizar dados e evitar duplicidade de slugs/objetos
- Ou remover o arquivo se não houver planos de uso

---

### Arquivo 5: `/cypress/e2e/navigation.cy.js`

**Responsabilidade:** Testar a navegação entre páginas da aplicação.

**Cenários de teste:**

| Cenário | Descrição | Mock utilizado |
|---------|-----------|----------------|
| Navegação Home → Blog | Verifica link `/blog` na home e navegação | ❌ Não |
| Navegação Home → Post | Verifica link de post na home e navegação | ❌ Não |
| Página Admin sem autenticação | Carrega `/admin` com mock de 401 | ✅ Sim — `cy.intercept('GET', '/api/auth/check')` |

**Mock definido:**
- `GET /api/auth/check` → retorna 401 com `{ error: 'Não autenticado' }`

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — suporte global (herdado)
- `/cypress/support/commands.js` — comandos customizados (não utilizados neste arquivo)

**Observações:**
- O teste de admin é superficial — apenas verifica que `body` existe, sem verificar se o formulário de login é exibido ou se há mensagem de erro
- Seletores usam `first()` para evitar falhas quando há múltiplos links

**Problemas identificados:**

1. **Teste de admin superficial** — Não verifica comportamento esperado (ex: exibição de formulário de login, mensagem de "não autenticado")

**Melhorias recomendadas:**
- Adicionar verificação de elementos do formulário de login no teste de admin
- Adicionar teste de navegação de volta (ex: blog → home)

---

### Arquivo 6: `/cypress/e2e/blog.cy.js`

**Responsabilidade:** Testar a página de listagem de posts do blog.

**Cenários de teste:**

| Cenário | Descrição | Mock utilizado |
|---------|-----------|----------------|
| Carregamento da listagem | Verifica que `h1` existe na página `/blog` | ❌ Não |
| Título da página | Verifica que `title` não está vazio | ❌ Não |
| Links para posts | Verifica existência de pelo menos 1 link para `/blog/` | ❌ Não |

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — suporte global (herdado)
- `/cypress/support/commands.js` — comandos customizados (não utilizados neste arquivo)

**Observações:**
- Testes dependem de dados reais do banco (posts devem existir para que a listagem tenha links)
- Verificações são genéricas — `h1` pode existir independentemente de posts estarem carregados
- Não há verificação de loading, erro ou estado vazio

**Problemas identificados:**

1. **Dependência de dados reais** — Testes falham se o banco estiver vazio ou posts não existirem
2. **Sem verificação de estados especiais** — Não testa estado vazio, erro de rede ou loading

**Melhorias recomendadas:**
- Adicionar mock de `/api/posts` para cenários controlados
- Adicionar teste para estado vazio (blog sem posts)
- Verificar conteúdo específico (ex: título do h1)

---

### Arquivo 7: `/cypress/e2e/home.cy.js`

**Responsabilidade:** Testar a página inicial da aplicação.

**Cenários de teste:**

| Cenário | Descrição | Mock utilizado |
|---------|-----------|----------------|
| Carregamento da página | Verifica que `h1` existe na home | ❌ Não |
| Título principal | Verifica que `title` não está vazio | ❌ Não |
| Elementos de navegação | Verifica `main`, `h1` e links de navegação | ❌ Não |
| Seção de conteúdo principal | Verifica que `main` existe | ❌ Não |

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — suporte global (herdado)
- `/cypress/support/commands.js` — comandos customizados (não utilizados neste arquivo)

**Observações:**
- O comentário no arquivo indica que a home **não possui `<nav>` ou `<header>` HTML** — os links de navegação estão dentro do conteúdo renderizado
- Testes são superficiais — verificam apenas a existência de elementos genéricos
- Não há verificação de conteúdo específico ou de imagens

**Problemas identificados:**

1. **Testes sem isolamento** — Dependem de conteúdo real renderizado pelo servidor, sem mock de dados
2. **Verificações genéricas** — `main`, `h1` podem existir mesmo com erros de conteúdo

**Melhorias recomendadas:**
- Adicionar mock de API para cenários controlados
- Verificar conteúdo específico (ex: nome do site, seções esperadas)

---

### Arquivo 8: `/cypress/e2e/post.cy.js`

**Responsabilidade:** Testar a página de post individual (`/blog/[slug]`).

**Cenários de teste:**

| Cenário | Descrição | Mock utilizado |
|---------|-----------|----------------|
| Carregamento do post com imagem | Verifica `h1` contendo "Mulher Virtuosa" e container de zoom | ❌ Não |
| Conteúdo do post | Verifica `h1`, container de zoom e `article` contendo "Provérbios" | ❌ Não |
| Botões de compartilhamento | Verifica links do Facebook e WhatsApp | ❌ Não |

**Slug utilizado:** `mulher-virtuosa` (dependência real do banco)

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — suporte global (herdado)
- `/cypress/support/commands.js` — comandos customizados (não utilizados neste arquivo)
- `/cypress/fixtures/posts.json` — dados do post correspondente (não importados)

**Observações:**
- Dependência de dados reais do banco (slug `mulher-virtuosa` deve existir)
- Verificações duplicadas com `image_zoom.cy.js` — ambos testam `image-zoom-container` e `h1` "Mulher Virtuosa"
- Não há mock de API, diferentemente de iterações anteriores do `image_zoom.cy.js`

**Duplicidades identificadas:**

1. **Verificação de `image-zoom-container`** — Testada tanto em `post.cy.js` quanto em `image_zoom.cy.js`
2. **Verificação de `h1` "Mulher Virtuosa"** — Testada em ambos os arquivos

**Problemas identificados:**

1. **Dependência de slug real** — Teste falha se o slug for removido/alterado no banco
2. **Sem verificação de erro** — Não testa comportamento quando post não existe (404)
3. **Duplicidade com image_zoom.cy.js** — Mesmas verificações em dois arquivos

**Melhorias recomendadas:**
- Adicionar mock de API via `cy.intercept()` para isolar testes
- Consolidar verificações de conteúdo em `post.cy.js` e manter `image_zoom.cy.js` apenas para o lightbox
- Adicionar teste para post inexistente (404)

---

### Arquivo 9: `/cypress/e2e/image_zoom.cy.js`

**Responsabilidade:** Testar a funcionalidade de zoom de imagem (lightbox) em posts individuais.

**Contextos de teste:**

| Contexto | Cenários | Mock utilizado |
|----------|----------|----------------|
| Fluxo principal | Container visível, abrir lightbox, fechar com overlay, fechar com Esc, reabrir | ❌ Não |
| Testes de borda | Slug inexistente (404), fechar clicando na imagem, múltiplas aberturas/fechamentos | ❌ Não |
| Responsividade | Funcionamento em mobile (375x667) e tablet (768x1024) | ❌ Não |
| Acessibilidade | Atributos ARIA, foco no lightbox | ❌ Não |

**Slugs utilizados:**
- `mulher-virtuosa` — post com imagem (real do banco)
- `post-inexistente` — slug que não existe (retorna 404)

**Comandos customizados utilizados:**
- `cy.openLightbox()` — abre o lightbox
- `cy.closeLightboxByOverlay()` — fecha clicando no overlay
- `cy.lightboxShouldBeOpen()` — verifica se está aberto
- `cy.lightboxShouldBeClosed()` — verifica se está fechado
- `cy.viewportMobile()` — viewport mobile
- `cy.viewportTablet()` — viewport tablet

**Arquivos acionados ou relacionados:**
- `/cypress/support/e2e.js` — suporte global (herdado)
- `/cypress/support/commands.js` — comandos customizados (utilizados extensivamente)

**Observações:**
- É o arquivo mais completo de testes, cobrindo múltiplos contextos
- Usa `failOnStatusCode: false` para testar página 404
- Dependência de dados reais do banco (slug `mulher-virtuosa` deve existir)
- Testes de acessibilidade verificam `role="dialog"`, `aria-modal="true"` e `aria-label`
- Foco gerenciado via `useRef` + `useEffect` + `tabIndex`

**Duplicidades identificadas:**

1. **Verificação de `image-zoom-container` e `h1` "Mulher Virtuosa"** — Sobreposta com `post.cy.js`

**Problemas identificados:**

1. **Dependência de slug real** — Testes falham se o slug for removido/alterado
2. **Duplicidade com post.cy.js** — Verificações de conteúdo duplicadas

**Melhorias recomendadas:**
- Adicionar mock de API para isolar testes
- Consolidar verificações duplicadas em `post.cy.js` e manter aqui apenas o lightbox

---

### Arquivos 10-14: `/cypress/videos/*.mp4`

**Responsabilidade:** Armazenar gravações das execuções de teste do Cypress (geradas automaticamente).

**Arquivos identificados:**

| Arquivo | Tamanho | Data |
|---------|---------|------|
| `navigation.cy.js.mp4` | 351K | 25/08/2026 |
| `image_zoom.cy.js.mp4` | 1.9M | 25/08/2026 |
| `home.cy.js.mp4` | 275K | 25/08/2026 |
| `blog.cy.js.mp4` | 179K | 25/08/2026 |
| `post.cy.js.mp4` | 88K | 25/08/2026 |

**Tamanho total:** ~2.8 MB

**Arquivos acionados ou relacionados:**
- `/cypress.config.js` — configura `video: true`, habilitando a gravação

**Observações:**
- Os vídeos são gerados automaticamente a cada execução do Cypress
- Os 5 vídeos correspondem aos 5 arquivos de teste E2E
- `image_zoom.cy.js.mp4` é o maior (1.9M) devido à quantidade de cenários
- Ignorados pelo ESLint via `eslint.config.js` (`cypress/videos/**`)

**Problemas identificados:**

1. **Vídeos residuais no repositório** — Arquivos binários desnecessários versionados, ocupando ~2.8 MB. A configuração `video: true` no `cypress.config.js` gera vídeos a cada execução, e estes permanecem no diretório sem limpeza automática.

**Melhorias recomendadas:**
- Confirmar se `cypress/videos/` está no `.gitignore` e adicionar se não estiver
- Avaliar desabilitar `video: true` localmente e manter apenas em CI via variável de ambiente
- Adicionar etapa de limpeza de vídeos antigos antes de execuções locais

---

## 1. Chave do Cypress Cloud — Análise Atualizada

**Localização:** `/package.json` — script `test:e2e:record`

**Descrição:**
O script `test:e2e:record` utiliza variável de ambiente (`$CYPRESS_RECORD_KEY`), o que é uma boa prática. A chave não está hardcoded no `package.json`.

**Status:** ✅ **Resolvido** — A chave não está mais exposta no `package.json`.

**Recomendação (preventiva):**
- Garantir que `$CYPRESS_RECORD_KEY` esteja configurada via secret do GitHub Actions ou variável de ambiente do CI
- Não commitar o arquivo `.cypress.env.json` (já ignorado pelo `.gitignore`)

---

## 2. Testes E2E Não Executados no Pipeline CI

**Localização:** `/ci.yml` + `/package.json`

**Descrição:**
O pipeline de CI (`ci.yml`) executa apenas `npm run test:ci`, que roda a suíte Jest (`jest --ci --coverage`). Os testes E2E do Cypress (`npm run test:e2e`) **não são executados em nenhum momento no CI**.

**Impacto:**
- Regressões em funcionalidades críticas (blog, post, lightbox, navegação) não são detectadas automaticamente
- A cobertura E2E existe, mas só é validada manualmente

**Recomendação:**
- Adicionar um job no CI para executar os testes E2E (ex: subir a aplicação + banco e rodar `cypress run`)
- Considerar o uso do Cache do Cypress/`cypress-io/github-action` para otimizar a execução
- Se a chave do Cypress Cloud for usada, garantir que seja injetada como secret do GitHub Actions

---

## 3. Ausência de Testes para Múltiplas Páginas do Site

**Localização:** Toda a pasta `/cypress/e2e`

**Descrição:**
A cobertura atual abrange apenas 5 rotas/páginas: home, blog, post individual, navegação e lightbox. Não há testes para:

- **Admin** (`/admin`) — acesso com autenticação, CRUD de posts/músicas/vídeos/produtos
- **Músicas** (`/musicas`)
- **Vídeos** (`/videos`)
- **Produtos** (`/produtos`)
- **Design System** (`/design-system`)
- **Página de post sem imagem** (diferente de 404)
- **Formulários de contato/cadastro**

**Impacto:** Baixa cobertura de regressão. Funcionalidades críticas do site não são validadas automaticamente.

**Recomendação:**
Priorizar a criação de testes para as páginas com funcionalidades mais relevantes (admin, músicas, vídeos) antes de páginas estáticas.

---

## 4. Duplicidade de Testes entre `post.cy.js` e `image_zoom.cy.js`

**Localização:**
- `cypress/e2e/post.cy.js`
- `cypress/e2e/image_zoom.cy.js`

**Descrição:**
Ambos os arquivos testam a **mesma página** (`/blog/mulher-virtuosa`) com verificações sobrepostas:

- `post.cy.js` cenário 1: verifica `h1` contendo "Mulher Virtuosa" e `[data-testid="image-zoom-container"]`
- `post.cy.js` cenário 2: verifica `h1`, container de zoom e `article` contendo "Provérbios"
- `image_zoom.cy.js` (fluxo principal): verifica o mesmo container, `h1`, conteúdo, etc.

Há duplicidade de verificação do `h1` e do `image-zoom-container` entre os dois arquivos.

**Impacto:**
- Manutenção duplicada — mudanças na página exigem revisar dois arquivos
- Execução redundante de verificações iguais

**Recomendação:**
- Consolidar as verificações de conteúdo do post em `post.cy.js`
- Manter em `image_zoom.cy.js` **apenas** as verificações específicas do lightbox (abrir, fechar, ARIA, foco)
- Alternativamente, remover verificações repetidas de um dos arquivos

---

## 5. Comandos Customizados Não Utilizados e Fixture Sem Uso

**Localização:**
- `cypress/support/commands.js` — comandos `cy.login()` e `cy.createPost()`
- `cypress/fixtures/posts.json`

**Descrição:**
Dois comandos customizados definidos não são chamados por nenhum arquivo de teste:

- `cy.login()` — Simula login admin; nenhum teste atual acessa o admin autenticado
- `cy.createPost()` — Mocka criação de post; nenhum teste atual cria posts

O arquivo de fixture `posts.json` contém 1 post mockado, mas nenhum teste o importa via `cy.fixture()`.

**Impacto:** Código morto/mantido sem uso. Aumenta a superfície de manutenção sem benefício imediato.

**Recomendação:**
- Remover os comandos não utilizados, **ou**
- Criar testes de admin que os utilizem (ex: login, CRUD de posts)
- Importar `posts.json` nos testes de blog/post via `cy.fixture('posts')` para centralizar dados e evitar duplicidade de slugs/objetos

---

## 6. Dependência de Slugs Reais do Banco PostgreSQL

**Localização:**
- `cypress/e2e/post.cy.js` — usa `mulher-virtuosa` como slug real
- `cypress/e2e/image_zoom.cy.js` — usa `mulher-virtuosa` e `post-inexistente`

**Descrição:**
Os testes de post e image_zoom dependem de dados existentes no banco PostgreSQL. Se o banco não estiver populado, ou se o slug for removido/alterado, os testes falharão. O teste `post.cy.js` não possui mock de API, ao contrário de iterações anteriores do `image_zoom.cy.js` (que já utilizou mocks).

**Impacto:** Testes frágeis em ambientes de CI sem banco populado, ou em cenários de limpeza/seeding de dados.

**Recomendação:**
- Adotar mock de API via `cy.intercept()` para isolar testes de cenários controlados
- Manter slugs reais apenas em testes de fumaça/integração específicos
- Ou garantir um passo de seed (`scripts/seed-posts.js`) antes da execução dos testes E2E

---

## 7. `setupNodeEvents` Vazio — Sem Plugins ou Tarefas

**Localização:** `cypress.config.js` (linhas 41-44)

**Descrição:**
O método `setupNodeEvents` está implementado porém vazio. Não há:
- Plugins registrados (ex: `cypress-axe` para acessibilidade automatizada)
- Tarefas customizadas para manipular banco de dados, arquivos ou estados
- Configuração de cobertura de código

**Observação:** A dependência `cypress-axe` foi mencionada como instalada em documento anterior (`docs/antigos`), mas **não está registrada** no `setupNodeEvents` nem configurada nos testes.

**Impacto:** Oportunidade perdida de estender a capacidade dos testes com plugins e tarefas Node.

**Recomendação:**
- Registrar `cypress-axe` no `setupNodeEvents` para auditoria automatizada de acessibilidade
- Adicionar tarefas para seed/clean de banco de dados
- Configurar code coverage com `@cypress/code-coverage`

---

## 8. Testes sem Verificação de Erro e Estados de Loading

**Localização:** Múltiplos arquivos

**Descrição:**
Nenhum teste atual verifica:
- Comportamento em caso de erro de rede (ex: servidor offline, timeout)
- Estados de carregamento (skeleton, spinner, "carregando...")
- Mensagens de erro exibidas ao usuário
- Fallback quando conteúdo está vazio (ex: blog sem posts)

**Impacto:** Cenários reais de falha não são cobertos, podendo gerar bugs não detectados em produção.

**Recomendação:**
Adicionar testes que simulem falhas de rede e verifiquem o comportamento da interface, por exemplo:
```js
cy.intercept('GET', '/api/posts', { forceNetworkError: true }).as('networkError');
```

---

## 9. Home Tests sem Isolamento — Dependem de Conteúdo Real

**Localização:** `cypress/e2e/home.cy.js`

**Descrição:**
Os testes da página inicial validam a existência de `<h1>`, `<main>`, links de navegação e título, mas todos dependem do conteúdo renderizado pelo servidor real. Não há mock de dados ou isolamento.

**Impacto:** Se a página inicial mudar de estrutura (ex: remover `<h1>` temporariamente), os testes falham sem indicar se é um problema real ou uma alteração esperada.

**Recomendação:**
- Adicionar verificações mais específicas de conteúdo esperado (texto, imagens, seções)
- Ou complementar com mocks para cenários controlados

---

## 10. Sem Code Coverage Configurado

**Localização:** `cypress.config.js`

**Descrição:**
Não há configuração de code coverage para os testes E2E do Cypress. Não é possível medir quantos componentes/funções são efetivamente exercitados pelos testes.

**Impacto:** Impossibilidade de identificar lacunas de cobertura e medir progresso.

**Recomendação:**
- Instalar e configurar `@cypress/code-coverage`
- Adicionar instrumentação ao código da aplicação (Istanbul/Babel)
- Configurar `setupNodeEvents` para usar o plugin de cobertura

---

## 11. Vídeos `.mp4` Residuais Versionados no Repositório

**Localização:** `/cypress/videos/` — 5 arquivos `.mp4`

**Descrição:**
Os vídeos foram gerados em execuções anteriores e permanecem no diretório. Embora o `eslint.config.js` já ignore `cypress/videos/**` e `cypress/screenshots/**` para o lint, **não há confirmação** de que esses diretórios estejam no `.gitignore` (arquivo bloqueado para leitura).

**Impacto:** Risco de versionamento de arquivos binários grandes desnecessariamente, crescendo o repositório a cada execução.

**Recomendação:**
- Confirmar se `cypress/videos/` e `cypress/screenshots/` estão no `.gitignore`
- Adicioná-los caso não estejam
- Manter `video: true` apenas em CI (via variável de ambiente), evitando gravação local desnecessária

---

## 12. Credenciais Hardcoded em Comando Customizado

**Localização:**
- `cypress/support/commands.js` — credenciais padrão `admin@caminhar.com` / `senha123` no comando `cy.login()`

**Descrição:**
O comando `cy.login()` possui credenciais de administrador hardcoded como valores padrão dos parâmetros.

**Impacto:** Credenciais sensíveis em texto plano no código versionado; qualquer mudança de senha exige alterar o código-fonte dos testes.

**Recomendação:**
- Mover credenciais para variáveis de ambiente (`Cypress.env('ADMIN_EMAIL')`, `Cypress.env('ADMIN_PASSWORD')`) usando `cypress.env.json` (já ignorado) ou variáveis de CI
- Manter os valores padrão apenas em ambiente de desenvolvimento local

---

## Resumo Consolidado

| # | Problema | Tipo | Gravidade |
|---|---------|------|-----------|
| 1 | Chave do Cypress Cloud ✅ **RESOLVIDO** | Segurança | ~~Alta~~ |
| 2 | Testes E2E não executados no CI | CI/CD | **Alta** |
| 3 | Ausência de testes para páginas não cobertas | Cobertura | **Alta** |
| 4 | Duplicidade entre `post.cy.js` e `image_zoom.cy.js` | Manutenção | Média |
| 5 | Comandos customizados e fixture não utilizados | Manutenção | Média |
| 6 | Dependência de slugs reais do banco | Confiabilidade | Média |
| 7 | `setupNodeEvents` vazio | Configuração | Baixa |
| 8 | Sem verificação de erro/loading | Cobertura | Média |
| 9 | Home tests sem isolamento | Confiabilidade | Média |
| 10 | Sem code coverage configurado | Ferramenta | Média |
| 11 | Vídeos residuais no repositório | Organização | Baixa |
| 12 | Credenciais hardcoded em `cy.login()` | Manutenção | Média |

**Total:** 12 pontos identificados — **1 resolvido** (chave do Cypress Cloud), **11 pendentes**.

> **Nota:** Os 8 problemas documentados em `/docs/resolvidos/UPGRADE_cypress.md` foram considerados **resolvidos** e não foram re-listados aqui, exceto quando permanecem relevantes no estado atual dos arquivos.