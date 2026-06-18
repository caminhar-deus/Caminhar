# Análise da Pasta `/cypress`

## Visão Geral

A pasta `/cypress` contém os testes end-to-end (E2E) do projeto, utilizando o framework **Cypress** (`^15.15.0`). Atualmente, a estrutura conta com **5 arquivos de teste**, **31+ cenários**, e suporte completo com `fixtures/` e `support/`.

> **Documento complementar:** Para uma análise detalhada de correções, melhorias e recomendações aplicadas, consulte [`/docs/UPGRADE_cypress.md`](/docs/UPGRADE_cypress.md).

---

## Estrutura de Arquivos

```
cypress/
├── e2e/
│   ├── image_zoom.cy.js   (18 cenários) — Zoom de imagem (lightbox)
│   ├── home.cy.js          (4 cenários)  — Página inicial
│   ├── blog.cy.js          (3 cenários)  — Listagem do blog
│   ├── post.cy.js          (3 cenários)  — Post individual
│   └── navigation.cy.js    (3 cenários)  — Navegação entre páginas
├── fixtures/
│   └── posts.json
└── support/
    ├── commands.js          (8 comandos customizados)
    └── e2e.js
```

---

## Análise dos Arquivos

### `/cypress/e2e/image_zoom.cy.js`

**Localização:** `cypress/e2e/image_zoom.cy.js`

**Propósito:**  
Testa a funcionalidade de **zoom de imagem (lightbox)** em páginas de posts do blog, incluindo fluxo principal, casos de borda, responsividade e acessibilidade.

**Estrutura do arquivo:**
- `context('Fluxo principal (happy path)')` — 5 testes
- `context('Testes de borda (edge cases)')` — 3 testes
- `context('Responsividade')` — 2 testes
- `context('Acessibilidade')` — 2 testes

**O que o arquivo faz em detalhes:**

1. **Mock da API:** Intercepta requisições específicas por slug (`/api/posts?slug=...`), retornando post fictício. Extraído para constante `postMock` no escopo do `describe`.
2. **Navegação:** Usa o slug extraído do mock: `cy.visit(\`/blog/${postMock.slug}\`)`.
3. **Seletores:** Utiliza atributos `data-testid` semânticos (`image-zoom-container`, `image-lightbox`, etc.) em vez de seletores CSS frágeis.

**Métricas do arquivo:**
- **Total de linhas:** ~115
- **Total de `describe`/`context`:** 5
- **Total de `it`:** 12
- **Total de `beforeEach`:** 3
- **Nível de aninhamento:** 2 níveis (`describe` → `context` → `it`)

---

### `/cypress/e2e/home.cy.js`

**Localização:** `cypress/e2e/home.cy.js`

**Propósito:**  
Testa a página inicial do site, verificando carregamento, título, navegação e conteúdo principal.

**Métricas do arquivo:**
- **Total de linhas:** ~20
- **Total de `describe`:** 1
- **Total de `it`:** 4

---

### `/cypress/e2e/blog.cy.js`

**Localização:** `cypress/e2e/blog.cy.js`

**Propósito:**  
Testa a página de listagem do blog, com mock de 2 posts e verificação de links para posts individuais.

**Métricas do arquivo:**
- **Total de linhas:** ~50
- **Total de `describe`:** 1
- **Total de `beforeEach`:** 1
- **Total de `it`:** 3

---

### `/cypress/e2e/post.cy.js`

**Localização:** `cypress/e2e/post.cy.js`

**Propósito:**  
Testa a página de post individual, incluindo cenários com/sem imagem, exibição de conteúdo e botões de compartilhamento.

**Métricas do arquivo:**
- **Total de linhas:** ~60
- **Total de `describe`:** 1
- **Total de `it`:** 3

---

### `/cypress/e2e/navigation.cy.js`

**Localização:** `cypress/e2e/navigation.cy.js`

**Propósito:**  
Testa a navegação entre páginas (home → blog, home → post, e acesso à página admin sem autenticação).

**Métricas do arquivo:**
- **Total de linhas:** ~40
- **Total de `describe`:** 1
- **Total de `it`:** 3

---

### `/cypress/support/commands.js`

**Localização:** `cypress/support/commands.js`

**Propósito:**  
Define comandos customizados reutilizáveis nos testes E2E.

**Comandos disponíveis:**
| Comando | Descrição |
|---------|-----------|
| `cy.login()` | Simula login como admin via mock de API |
| `cy.createPost(post)` | Mocka criação de post |
| `cy.viewportMobile()` | Altera viewport para 375×667 |
| `cy.viewportTablet()` | Altera viewport para 768×1024 |
| `cy.lightboxShouldBeOpen()` | Verifica se o lightbox está visível |
| `cy.lightboxShouldBeClosed()` | Verifica se o lightbox não existe |
| `cy.openLightbox()` | Abre o lightbox clicando na imagem |
| `cy.closeLightboxByOverlay()` | Fecha o lightbox clicando no overlay |

---

### `/cypress/fixtures/posts.json`

**Localização:** `cypress/fixtures/posts.json`

**Propósito:**  
Arquivo de fixture com dados mockados de posts para reutilização em múltiplos testes.

---

## Métricas Gerais da Pasta `/cypress`

| Métrica | Valor |
|---------|-------|
| Total de arquivos de teste | 5 |
| Total de cenários (`it`) | 31+ |
| Total de comandos customizados | 8 |
| Arquivos de suporte | 2 (commands.js, e2e.js) |
| Arquivos de fixture | 1 (posts.json) |
| Total de linhas (todos os testes) | ~285 |

---

## Observações Gerais

> Para uma análise detalhada de problemas, correções e melhorias identificados na pasta `/cypress`, consulte [`/docs/UPGRADE_cypress.md`](/docs/UPGRADE_cypress.md).

- **Mock isolado:** O mock de API é feito no `beforeEach`, o que é uma boa prática para garantir que cada execução do teste comece com o mesmo estado.
- **Padrão `data-testid`:** Todos os seletores no arquivo `image_zoom.cy.js` utilizam atributos `data-testid` semânticos, tornando os testes resistentes a mudanças de estilo.
- **Comandos reutilizáveis:** Operações comuns do lightbox foram abstraídas em comandos customizados (`cy.openLightbox()`, `cy.lightboxShouldBeOpen()`, etc.).
- **Instalação adicional:** O plugin `cypress-axe` foi instalado como dependência de desenvolvimento para futuras auditorias automatizadas de acessibilidade.