# Análise de Correções, Melhorias e Performance — `/cypress`

## Visão Geral

**Data da análise:** 22/05/2026  
**Última atualização:** 22/05/2026  
**Commit de referência:** `e1b9c637e0f53414e076fe220d56ac9fbdd6bbad`  
**Versão do Cypress:** `^15.15.0`  

Este documento reporta problemas, oportunidades de melhoria e recomendações identificados na pasta `/cypress`, abrangendo o único arquivo de teste existente: `cypress/e2e/image_zoom.cy.js`. As correções e melhorias foram aplicadas conforme indicado em cada seção.

### Resumo dos Problemas Identificados

| Categoria | Quantidade | Gravidades |
|-----------|-----------|------------|
| Correção | 3 | 1 Alta, 2 Média |
| Melhoria | 5 | 1 Alta, 3 Média, 1 Baixa |
| **Total** | **8** | — |

### Tópicos Abordados

1. [Seletores CSS Frágeis Baseados em Estilo](#1-seletores-css-frágeis-baseados-em-estilo) — ✅ RESOLVIDO
2. [Mock de API Excessivamente Genérico](#2-mock-de-api-excessivamente-genérico) — ✅ RESOLVIDO
3. [Ausência de Testes de Borda (Edge Cases)](#3-ausência-de-testes-de-borda-edge-cases) — ✅ RESOLVIDO
4. [Ausência de Testes de Acessibilidade](#4-ausência-de-testes-de-acessibilidade) — ✅ RESOLVIDO
5. [Navegação Dependente de Slug Hardcoded](#5-navegação-dependente-de-slug-hardcoded) — ✅ RESOLVIDO
6. [Cobertura de Testes Insuficiente](#6-cobertura-de-testes-insuficiente) — ✅ RESOLVIDO
7. [Falta de Tratamento para Falha no Carregamento da Imagem](#7-falta-de-tratamento-para-falha-no-carregamento-da-imagem) — ✅ RESOLVIDO
8. [Configuração do Cypress Aprimorada](#8-configuração-do-cypress-aprimorada) — ✅ RESOLVIDO

---

## 1. Seletores CSS Frágeis Baseados em Estilo

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- Seletores baseados em atributos CSS inline (`style*="..."`) são extremamente frágeis.
- Qualquer mudança no CSS (remoção de estilo inline, alteração de unidade, refatoração de componente) quebra os testes.
- Dificultam a manutenção e não seguem boas práticas de testes E2E.

**O que foi feito:**

1. **`pages/blog/[slug].js`** — Adicionados atributos `data-testid` semânticos:
   - `data-testid="image-zoom-container"` no container clicável da imagem
   - `data-testid="image-zoom-thumb"` na miniatura da imagem
   - `data-testid="image-lightbox"` no overlay do lightbox
   - `data-testid="image-lightbox-img"` na imagem ampliada

2. **`cypress/e2e/image_zoom.cy.js`** — Seletores substituídos:
   ```js
   // Antes (frágeis):
   const imageContainer = 'div[style*="cursor: zoom-in"]';
   const lightbox = 'div[style*="position: fixed"]';

   // Depois (semânticos):
   cy.get('[data-testid="image-zoom-container"]');
   cy.get('[data-testid="image-lightbox"]');
   ```

---

## 2. Mock de API Excessivamente Genérico

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- O `cy.intercept` capturava **qualquer** requisição `GET /api/posts`, independentemente de parâmetros de query, paginação ou filtros.
- Caso a página `/blog/post-de-teste-com-imagem` fizesse mais de uma requisição para `/api/posts` ou endpoints relacionados (ex: `/api/posts?slug=...`), o mock poderia gerar comportamento inesperado.

**O que foi feito:**
- O mock agora é específico para o slug do post:
  ```js
  cy.intercept('GET', `/api/posts?slug=${postMock.slug}`, {
    statusCode: 200,
    body: [postMock]
  }).as('getPost');
  ```

---

## 3. Ausência de Testes de Borda (Edge Cases)

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- O único cenário de teste cobria apenas o **fluxo feliz** (happy path).

**O que foi feito:**
- Adicionados os seguintes cenários de borda no arquivo `cypress/e2e/image_zoom.cy.js`:

| Cenário | Descrição |
|---------|-----------|
| Post sem `image_url` (null) | Verifica que o container de zoom não é renderizado |
| Clique direto na imagem ampliada | Verifica que o lightbox não fecha (stopPropagation) |
| Múltiplas aberturas/fechamentos | 3 ciclos consecutivos de abrir/fechar |
| Viewport mobile (375×667) | Fluxo completo em viewport de iPhone |
| Viewport tablet (768×1024) | Fluxo completo em viewport de iPad |

---

## 4. Ausência de Testes de Acessibilidade

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- O teste não verificava atributos ARIA, foco ou acessibilidade do lightbox.

**O que foi feito:**

1. **`pages/blog/[slug].js`** — Adicionados atributos ARIA no lightbox:
   ```jsx
   role="dialog"
   aria-modal="true"
   aria-label={`Imagem ampliada: ${post.title}`}
   ```

2. **`cypress/e2e/image_zoom.cy.js`** — Adicionados testes de acessibilidade:
   - Verificação de `role="dialog"`, `aria-modal="true"`, `aria-label`
   - Verificação de foco movido para o lightbox ao abrir

---

## 5. Navegação Dependente de Slug Hardcoded

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- O slug `'post-de-teste-com-imagem'` estava hardcoded e dependia do mock estar sincronizado.
- Se o slug mudasse no mock, o `cy.visit` quebrava.
- Criava duplicidade de informação (slug no mock e slug na URL).

**O que foi feito:**
- O mock foi extraído para uma constante `postMock` no escopo do `describe`.
- A navegação agora usa o slug extraído do próprio mock:
  ```js
  const postMock = { slug: 'post-de-teste-com-imagem', /* ... */ };
  cy.visit(`/blog/${postMock.slug}`);
  ```

---

## 6. Cobertura de Testes Insuficiente

### Localização: Toda a pasta `/cypress`

### ✅ RESOLVIDO

**Problema:**
- A pasta continha apenas **1 arquivo de teste** com **1 cenário**.
- Pastas comuns como `support/`, `fixtures/` e `plugins/` não existiam.

**O que foi feito:**

1. **Estrutura criada:**
   ```
   cypress/
   ├── e2e/
   │   ├── image_zoom.cy.js    (refatorado + expandido)
   │   ├── home.cy.js          (novo)
   │   ├── blog.cy.js          (novo)
   │   ├── post.cy.js          (novo)
   │   └── navigation.cy.js    (novo)
   ├── fixtures/
   │   └── posts.json          (novo)
   ├── support/
   │   ├── commands.js         (novo)
   │   └── e2e.js              (novo)
   └── config.js               (atualizado)
   ```

2. **Novos arquivos de teste criados:**
   - `cypress/e2e/home.cy.js` — Testes da página inicial
   - `cypress/e2e/blog.cy.js` — Testes da listagem de posts
   - `cypress/e2e/post.cy.js` — Testes de post individual (com e sem imagem, compartilhamento)
   - `cypress/e2e/navigation.cy.js` — Testes de navegação entre páginas

3. **Total de cenários:** De **1** para **18+** cenários de teste.

---

## 7. Falta de Tratamento para Falha no Carregamento da Imagem

### Localização: `cypress/e2e/image_zoom.cy.js`

### ✅ RESOLVIDO

**Problema:**
- A URL `/placeholder.jpg` não existia no servidor de teste do Cypress.
- Se a imagem não carregasse, o teste poderia falhar silenciosamente ou exibir um broken image.
- Nenhuma verificação era feita para garantir que a imagem foi carregada.

**O que foi feito:**
1. **`public/placeholder.svg`** — Criado um SVG placeholder válido (1×1 pixel cinza).
2. **`cypress/e2e/image_zoom.cy.js`** — A URL foi alterada para `/placeholder.svg` e adicionada verificação:
   ```js
   cy.get('[data-testid="image-zoom-thumb"]')
     .should('be.visible')
     .and('have.attr', 'src')
     .and('not.be.empty');
   ```

---

## 8. Configuração do Cypress Aprimorada

### Localização: `cypress.config.js`

### ✅ RESOLVIDO

**Problema:**
- O arquivo `cypress.config.js` existia na raiz do projeto, mas estava com configurações mínimas.
- Faltavam configurações importantes como `defaultCommandTimeout`, `retries`, `viewport`, etc.

**O que foi feito:**
- Adicionadas ao `cypress.config.js`:
  - `defaultCommandTimeout: 10000` — Timeout padrão para comandos
  - `requestTimeout: 10000` — Timeout para requisições
  - `pageLoadTimeout: 30000` — Timeout para carregamento de página
  - `retries: { runMode: 2, openMode: 0 }` — 2 tentativas em modo CI
  - `viewportWidth: 1280`, `viewportHeight: 720` — Viewport padrão
  - `supportFile: 'cypress/support/e2e.js'` — Habilitado arquivo de suporte

---

## Resumo Final

| # | Problema | Tipo | Gravidade | Status |
|---|---------|------|-----------|--------|
| 1 | Seletores CSS baseados em estilo | Correção | Alta | ✅ RESOLVIDO |
| 2 | Mock de API genérico | Melhoria | Média | ✅ RESOLVIDO |
| 3 | Ausência de testes de borda | Melhoria | Média | ✅ RESOLVIDO |
| 4 | Ausência de testes de acessibilidade | Melhoria | Média | ✅ RESOLVIDO |
| 5 | Navegação com slug hardcoded | Correção | Baixa | ✅ RESOLVIDO |
| 6 | Cobertura de testes insuficiente | Melhoria | Alta | ✅ RESOLVIDO |
| 7 | Imagem mockada pode não existir | Correção | Média | ✅ RESOLVIDO |
| 8 | Configuração do Cypress sem revisão | Melhoria | Baixa | ✅ RESOLVIDO |

**Total:** 8 problemas identificados — **8 resolvidos**, **0 pendentes**. ✅