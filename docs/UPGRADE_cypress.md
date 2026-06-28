# Levantamento Analítico de Melhorias — `/cypress`

## Visão Geral

**Data da análise:** 28/06/2026  
**Versão do Cypress:** `^15.18.0`

Este documento identifica oportunidades de melhoria, pontos de atenção técnica e recomendações para a pasta `/cypress`, com base no estado atual dos arquivos. Nenhuma alteração foi aplicada.

> **Documentos de referência consultados:**
> - `/docs/resolvidos/UPGRADE_cypress.md` — Problemas já resolvidos em iteração anterior (8 itens, todos marcados como resolvidos).

---

## Resumo dos Pontos Identificados

| # | Categoria | Descrição | Gravidade |
|---|-----------|-----------|-----------|
| 1 | Cobertura | Comandos customizados não utilizados nos testes | Média |
| 2 | Cobertura | Fixture `posts.json` não é utilizada por nenhum teste | Média |
| 3 | Cobertura | Ausência de testes para múltiplas páginas do site | Alta |
| 4 | Manutenção | Dependência de slugs reais do banco PostgreSQL | Média |
| 5 | Configuração | `setupNodeEvents` vazio — sem plugins ou tarefas | Baixa |
| 6 | Organização | Arquivos de vídeo residuais sem `.gitignore` específico | Baixa |
| 7 | Cobertura | Testes sem verificação de erro e estados de loading | Média |
| 8 | Cobertura | Ausência de testes de formulário (admin, contato) | Alta |
| 9 | Manutenção | Home tests sem isolamento — dependem de conteúdo real | Média |
| 10 | Ferramenta | Sem code coverage configurado para Cypress | Média |

---

## 1. Comandos Customizados Não Utilizados

**Localização:** `cypress/support/commands.js`

**Descrição:**  
Dois comandos customizados definidos não são chamados por nenhum arquivo de teste atualmente:

- `cy.login()` — Simula login admin; nenhum teste atual acessa o admin autenticado
- `cy.createPost()` — Mocka criação de post; nenhum teste atual cria posts

**Impacto:** Código morto/mantido sem uso. Aumenta a superfície de manutenção sem benefício imediato.

**Recomendação:**  
- Remover os comandos não utilizados para manter o arquivo enxuto, ou
- Criar testes de admin que os utilizem (ex: login, CRUD de posts)

---

## 2. Fixture `posts.json` Não Utilizada

**Localização:** `cypress/fixtures/posts.json`

**Descrição:**  
O arquivo de fixture contém 1 post mockado (`Mulher Virtuosa`), mas nenhum teste o importa via `cy.fixture()`.

**Impacto:** Recurso definido mas não aproveitado. A fixture poderia centralizar dados de teste e evitar repetição de slugs/objetos nos arquivos de teste.

**Recomendação:**  
- Importar `posts.json` nos testes de blog e post via `cy.fixture('posts')`
- Expandir a fixture com mais posts para cenários variados

---

## 3. Ausência de Testes para Múltiplas Páginas do Site

**Localização:** Toda a pasta `/cypress/e2e`

**Descrição:**  
A cobertura atual abrange apenas 5 páginas/rotas: home, blog, post individual, navegação e lightbox. Não há testes para:

- **Admin** (`/admin`) — acesso com e sem autenticação, CRUD de posts/músicas/vídeos/produtos
- **Músicas** (`/musicas`)
- **Vídeos** (`/videos`)
- **Produtos** (`/produtos`)
- **Design System** (`/design-system`)
- **Página de post sem imagem** (diferente de 404)
- **Seções de compartilhamento** em outras páginas
- **Formulários de contato/cadastro**
- **Testes de API** (endpoints internos)

**Impacto:** Baixa cobertura de regressão. Funcionalidades críticas do site não são validadas automaticamente.

**Recomendação:**  
Priorizar a criação de testes para as páginas com funcionalidades mais relevantes (admin, músicas, vídeos) antes de páginas estáticas.

---

## 4. Dependência de Slugs Reais do Banco PostgreSQL

**Localização:**  
- `cypress/e2e/post.cy.js` — usa `mulher-virtuosa` como slug real
- `cypress/e2e/image_zoom.cy.js` — usa `mulher-virtuosa` e `post-inexistente`

**Descrição:**  
Os testes de post e image_zoom dependem de dados existentes no banco PostgreSQL. Se o banco não estiver populado, ou se o slug for removido/alterado, os testes falharão. O teste `post.cy.js` não possui mock de API, ao contrário de `image_zoom.cy.js` (que mocks em versões anteriores).

**Impacto:** Testes frágeis em ambientes de CI sem banco populado, ou em cenários de limpeza/seeding de dados.

**Recomendação:**  
- Adotar mock de API via `cy.intercept()` para isolar os testes do banco real
- Manter slugs reais apenas em testes de integração/fumaça específicos

---

## 5. `setupNodeEvents` Vazio — Sem Plugins ou Tarefas

**Localização:** `cypress.config.js` (linhas 41-44)

**Descrição:**  
O método `setupNodeEvents` está implementado mas vazio. Não há:
- Plugins registrados (ex: `cypress-axe` para acessibilidade automatizada)
- Tarefas customizadas para manipular banco de dados, arquivos ou estados
- Configuração de cobertura de código

**Impacto:** Oportunidade perdida de estender a capacidade dos testes com plugins e tarefas Node.

**Recomendação:**  
- Instalar e registrar `cypress-axe` para auditoria automatizada de acessibilidade (`npm install -D cypress-axe`)
- Adicionar tarefas para seed/clean de banco de dados em testes
- Configurar code coverage com `@cypress/code-coverage`

---

## 6. Arquivos de Vídeo Residuais

**Localização:** `/cypress/videos/` — 5 arquivos `.mp4` (blog, home, image_zoom, navigation, post)

**Descrição:**  
Os vídeos foram gerados em execuções anteriores e permanecem no repositório. Não há entrada específica no `.gitignore` para `cypress/videos/`, o que pode levar ao versionamento de arquivos binários grandes desnecessariamente.

**Impacto:** Crescimento desnecessário do repositório. Cada execução gera novos vídeos.

**Recomendação:**  
- Adicionar `cypress/videos/` ao `.gitignore`
- Adicionar `cypress/screenshots/` ao `.gitignore` (já que está vazio e é gerado sob demanda)
- Manter `video: true` apenas em CI, ou condicionar a variáveis de ambiente

---

## 7. Testes sem Verificação de Erro e Estados de Loading

**Localização:** Múltiplos arquivos

**Descrição:**  
Nenhum teste atual verifica:
- Comportamento em caso de erro de rede (ex: servidor offline, timeout)
- Estados de carregamento (skeleton, spinner, "carregando...")
- Mensagens de erro exibidas ao usuário
- Fallback quando conteúdo está vazio (ex: blog sem posts)

**Impacto:** Cenários reais de falha não são cobertos, podendo gerar bugs não detectados em produção.

**Recomendação:**  
Adicionar testes que simulem falhas de rede e verifiquem o comportamento da interface:
```js
cy.intercept('GET', '/api/posts', { forceNetworkError: true }).as('networkError');
```

---

## 8. Ausência de Testes de Formulário (Admin, Contato)

**Localização:** Toda a pasta `/cypress/e2e`

**Descrição:**  
Não existem testes que validem:
- Preenchimento e submissão de formulários
- Validação de campos obrigatórios
- Feedback de erro em campos inválidos
- Fluxo de autenticação (login inválido, token expirado, logout)
- CRUD de posts/músicas/vídeos via admin

**Impacto:** Funcionalidades interativas e críticas do site não possuem cobertura de regressão.

**Recomendação:**  
Criar suíte de testes para o painel admin:
- Login com credenciais inválidas e válidas
- Criação, edição e exclusão de posts
- Validação de formulários
- Upload de imagens

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

## Resumo Consolidado

| # | Problema | Tipo | Gravidade |
|---|---------|------|-----------|
| 1 | Comandos customizados não utilizados | Manutenção | Média |
| 2 | Fixture `posts.json` não utilizada | Manutenção | Média |
| 3 | Ausência de testes para páginas não cobertas | Cobertura | Alta |
| 4 | Dependência de slugs reais do banco | Confiabilidade | Média |
| 5 | `setupNodeEvents` vazio | Configuração | Baixa |
| 6 | Arquivos de vídeo residuais | Organização | Baixa |
| 7 | Sem verificação de erro/loading | Cobertura | Média |
| 8 | Ausência de testes de formulário | Cobertura | Alta |
| 9 | Home tests sem isolamento | Confiabilidade | Média |
| 10 | Sem code coverage configurado | Ferramenta | Média |

**Total:** 10 oportunidades identificadas — **0 aplicadas**, **10 pendentes** de análise/decisão.