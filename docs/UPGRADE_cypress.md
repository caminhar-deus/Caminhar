# Levantamento Analítico de Melhorias — `/cypress`

## Visão Geral

**Data da análise:** 31/07/2026  
**Versão do Cypress:** `^15.19.0` (confirmada no `package.json`)

Este documento identifica oportunidades de melhoria, pontos de atenção técnica e recomendações para a pasta `/cypress`, com base no estado atual dos arquivos. **Nenhuma alteração foi aplicada.**

> **Documentos de referência consultados:**
> - `/docs/antigos/PROJECT_cypress.md` — versão anterior, desatualizada (usada apenas como apoio)
> - `/docs/resolvidos/UPGRADE_cypress.md` — problemas já resolvidos em iteração anterior (8 itens, todos resolvidos)
> - `/docs/PROJECT_cypress.md` — análise consolidada atual da pasta `/cypress`

---

## Resumo dos Pontos Identificados

| # | Categoria | Descrição | Gravidade |
|---|-----------|-----------|-----------|
| 1 | Segurança | Chave do Cypress Cloud exposta no `package.json` | **Alta** |
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
| 12 | Manutenção | Credenciais e chaves hardcoded | Média |

---

## 1. Chave do Cypress Cloud Exposta no `package.json`

**Localização:** `/package.json` — script `test:e2e:record`

**Descrição:**
A chave de gravação do Cypress Cloud (`--key 1c15e96c-3b79-4a4d-b2ec-7f0ffa209246`) está hardcoded diretamente no script `test:e2e:record` do `package.json`.

**Impacto:**
- Exposição de credencial sensível no repositório versionado
- Qualquer pessoa com acesso ao repositório pode usar a chave
- Risco de consumo indevido do plano do Cypress Cloud

**Recomendação:**
- Remover a chave do `package.json`
- Utilizar variável de ambiente (`process.env.CYPRESS_RECORD_KEY`) ou o arquivo `.cypress.env.json` (já ignorado pelo `.gitignore`)
- Revogar a chave atual no painel do Cypress Cloud e gerar uma nova

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

## 12. Credenciais e Chaves Hardcoded

**Localização:**
- `cypress/support/commands.js` — credenciais padrão `admin@caminhar.com` / `senha123` no comando `cy.login()`
- `package.json` — chave do Cypress Cloud (ver item 1)

**Descrição:**
O comando `cy.login()` possui credenciais de administrador hardcoded como valores padrão dos parâmetros. A chave do Cypress Cloud está exposta no `package.json`.

**Impacto:** Credenciais sensíveis em texto plano no código versionado; qualquer mudança de senha exige alterar o código-fonte dos testes.

**Recomendação:**
- Mover credenciais para variáveis de ambiente (`Cypress.env('ADMIN_EMAIL')`, `Cypress.env('ADMIN_PASSWORD')`) usando `cypress.env.json` (já ignorado) ou variáveis de CI
- Manter os valores padrão apenas em ambiente de desenvolvimento local
- Revogar e regenerar a chave do Cypress Cloud

---

## Resumo Consolidado

| # | Problema | Tipo | Gravidade |
|---|---------|------|-----------|
| 1 | Chave do Cypress Cloud exposta no `package.json` | Segurança | **Alta** |
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
| 12 | Credenciais e chaves hardcoded | Manutenção | Média |

**Total:** 12 oportunidades identificadas — **0 aplicadas**, **12 pendentes** de análise/decisão.

> **Nota:** Os 8 problemas documentados em `/docs/resolvidos/UPGRADE_cypress.md` (seletores frágeis, mock genérico, edge cases, acessibilidade, slug hardcoded, cobertura, imagem inexistente, configuração) foram considerados **resolvidos** e não foram re-listados aqui, exceto quando permanecem relevantes no estado atual dos arquivos.