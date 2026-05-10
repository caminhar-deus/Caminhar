# Análise de Correções, Melhorias e Performance — `/cypress`

## Visão Geral

Este documento reporta problemas e oportunidades de melhoria identificados na pasta `/cypress`, abrangendo o único arquivo de teste existente: `cypress/e2e/image_zoom.cy.js`. Nenhuma alteração foi aplicada, apenas diagnósticos.

---

## 1. Seletores CSS Frágeis Baseados em Estilo

### Localização: `cypress/e2e/image_zoom.cy.js` — linhas 27-28

```js
const imageContainer = 'div[style*="cursor: zoom-in"]';
const lightbox = 'div[style*="position: fixed"]';
```

**Problema:**
- Seletores baseados em atributos CSS inline (`style*="..."`) são extremamente frágeis.
- Qualquer mudança no CSS (remoção de estilo inline, alteração de unidade, refatoração de componente) quebra os testes.
- Dificultam a manutenção e não seguem boas práticas de testes E2E.

**Recomendação:**
- Adicionar atributos `data-*` semânticos nos componentes, como `data-testid="image-zoom-container"` e `data-testid="image-lightbox"`.
- Utilizar `cy.get('[data-testid="image-zoom-container"]')` no lugar dos seletores atuais.

---

## 2. Mock de API Excessivamente Genérico

### Localização: `cypress/e2e/image_zoom.cy.js` — linhas 5-18

**Problema:**
- O `cy.intercept` captura **qualquer** requisição `GET /api/posts`, independentemente de parâmetros de query, paginação ou filtros.
- Caso a página `/blog/post-de-teste-com-imagem` faça mais de uma requisição para `/api/posts` ou para endpoints relacionados (ex: `/api/posts?slug=...`), o mock pode gerar comportamento inesperado.

**Recomendação:**
- Especificar o mock de forma mais precisa, por exemplo:
  ```js
  cy.intercept('GET', '/api/posts?slug=post-de-teste-com-imagem', { ... }).as('getPost');
  ```
- Ou utilizar um alias mais específico e aguardar a requisição correta.

---

## 3. Ausência de Testes de Borda (Edge Cases)

### Localização: `cypress/e2e/image_zoom.cy.js`

**Problema:**
- O único cenário de teste cobre apenas o **fluxo feliz** (happy path).
- Não há testes para:
  - Imagem com `image_url` ausente ou `null`.
  - Post sem imagem (deve ocultar o container de zoom).
  - Lightbox aberto e clique direto na imagem ampliada (em vez do overlay).
  - Múltiplas aberturas e fechamentos consecutivos.
  - Comportamento em diferentes viewports (mobile, tablet).
  - Acessibilidade: foco deve retornar ao elemento original ao fechar o lightbox.

**Recomendação:**
- Adicionar testes parametrizados ou cenários separados para cobrir os edge cases listados.

---

## 4. Ausência de Testes de Acessibilidade

### Localização: `cypress/e2e/image_zoom.cy.js`

**Problema:**
- O teste não verifica:
  - Se o foco do teclado é movido para o lightbox ao abrir.
  - Se a tecla `Tab` navega corretamente dentro do lightbox.
  - Se `aria-*` attributes estão presentes (ex: `aria-label`, `role="dialog"`).
  - Se o `aria-hidden` é alternado corretamente no conteúdo de fundo.

**Recomendação:**
- Utilizar o plugin `cypress-axe` para auditoria automatizada de acessibilidade.
- Adicionar verificações de foco e atributos ARIA.

---

## 5. Navegação Dependente de Slug Hardcoded

### Localização: `cypress/e2e/image_zoom.cy.js` — linha 21

```js
cy.visit('/blog/post-de-teste-com-imagem');
```

**Problema:**
- O slug `'post-de-teste-com-imagem'` está hardcoded e depende do mock estar sincronizado.
- Se o slug mudar no mock, o `cy.visit` quebra.
- Cria duplicidade de informação (slug no mock e slug na URL).

**Recomendação:**
- Extrair o slug do próprio mock:
  ```js
  cy.intercept('GET', '/api/posts', { body: [postMock] }).as('getPosts');
  cy.visit(`/blog/${postMock.slug}`);
  ```

---

## 6. Cobertura de Testes Insuficiente

### Localização: Toda a pasta `/cypress`

**Problema:**
- A pasta contém apenas **1 arquivo de teste** com **1 cenário**.
- Pastas comuns como `support/`, `fixtures/` e `plugins/` não existem.
- Funcionalidades críticas do projeto (autenticação, CRUD de posts, blog, busca, etc.) não possuem testes E2E.

**Recomendação:**
- Expandir a suíte de testes para cobrir as principais funcionalidades do projeto.
- Criar a estrutura padrão do Cypress:
  ```
  cypress/
  ├── e2e/
  ├── fixtures/
  │   └── posts.json
  ├── support/
  │   ├── commands.js
  │   └── e2e.js
  └── plugins/
      └── index.js
  ```

---

## 7. Falta de Tratamento para Falha no Carregamento da Imagem

### Localização: `cypress/e2e/image_zoom.cy.js` — linha 13

```js
image_url: '/placeholder.jpg'
```

**Problema:**
- A URL `/placeholder.jpg` pode não existir no servidor de teste do Cypress.
- Se a imagem não carregar, o teste pode falhar silenciosamente ou exibir um broken image.
- Nenhuma verificação é feita para garantir que a imagem de fato foi carregada.

**Recomendação:**
- Usar uma imagem real ou garantir que o arquivo exista em `/public/placeholder.jpg`.
- Adicionar verificação de carregamento da imagem:
  ```js
  cy.get('img').should('have.attr', 'src').and('not.include', 'placeholder');
  ```

---

## 8. Ausência de `cypress.config.js` na Pasta

### Localização: Raiz do projeto vs `/cypress`

**Problema:**
- O arquivo `cypress.config.js` existe na **raiz do projeto**, mas não há configurações específicas dentro da pasta `/cypress` (como `baseUrl`, `viewport`, `retries`, `screenshotOnRunFailure`, etc. centralizadas no config).
- A configuração existente na raiz não foi analisada, mas a ausência de um padrão claro pode causar inconsistências.

**Recomendação:**
- Revisar o `cypress.config.js` na raiz e garantir que as configurações de `baseUrl`, `defaultCommandTimeout`, `retries`, `video` e `screenshots` estejam adequadas ao projeto.

---

## Resumo dos Problemas Encontrados

| # | Problema | Tipo | Gravidade |
|---|---------|------|-----------|
| 1 | Seletores CSS baseados em estilo | Correção | Alta |
| 2 | Mock de API genérico | Melhoria | Média |
| 3 | Ausência de testes de borda | Melhoria | Média |
| 4 | Ausência de testes de acessibilidade | Melhoria | Média |
| 5 | Navegação com slug hardcoded | Correção | Baixa |
| 6 | Cobertura de testes insuficiente | Melhoria | Alta |
| 7 | Imagem mockada pode não existir | Correção | Média |
| 8 | Configuração do Cypress sem revisão | Melhoria | Baixa |