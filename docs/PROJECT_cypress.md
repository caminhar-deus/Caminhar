# Análise da Pasta `/cypress`

## Visão Geral

A pasta `/cypress` contém os testes end-to-end (E2E) do projeto, utilizando o framework **Cypress**. Atualmente, a estrutura é composta por um único arquivo de teste dentro do subdiretório `e2e/`.

---

## Estrutura de Arquivos

```
cypress/
└── e2e/
    └── image_zoom.cy.js
```

---

## Análise dos Arquivos

### `/cypress/e2e/image_zoom.cy.js`

**Localização:** `cypress/e2e/image_zoom.cy.js`

**Propósito:**  
Testa a funcionalidade de **zoom de imagem (lightbox)** em páginas de posts do blog. O teste verifica os comportamentos de abrir e fechar o lightbox tanto por clique na imagem quanto pela tecla `Esc`.

**O que o arquivo faz em detalhes:**

1. **Mock da API (`cy.intercept`):**
   - Intercepta requisições `GET /api/posts` e retorna um post fictício contendo:
     - `id`, `title`, `slug`, `excerpt`, `image_url`, `created_at`, `content`.
   - Isso torna o teste independente do estado real do banco de dados.

2. **Navegação (`cy.visit`):**
   - Visita a URL `/blog/post-de-teste-com-imagem` (slug do post mockado).
   - Aguarda a requisição interceptada (`@getPosts`) ser concluída.

3. **Cenário de teste: "deve abrir e fechar o lightbox da imagem com clique e com a tecla Esc"**
   - **Verificação inicial:** Confirma que a imagem do post está visível no container com `cursor: zoom-in`.
   - **Abertura por clique:** Clica na imagem e verifica se o lightbox (`position: fixed`) e a imagem ampliada aparecem.
   - **Fechamento por clique no overlay:** Clica no canto superior esquerdo do lightbox para fechar e verifica se o elemento some.
   - **Reabertura:** Clica novamente na imagem para reabrir o lightbox.
   - **Fechamento por tecla Esc:** Pressiona `{esc}` no corpo da página e verifica se o lightbox foi fechado.

**Métricas do arquivo:**
- **Total de linhas:** 57
- **Total de `describe`/`context`:** 1 (`describe`)
- **Total de `it`:** 1
- **Total de `beforeEach`:** 1
- **Nível de aninhamento:** 1 nível (`describe` → `it`)

---

## Observações Gerais

- **Estrutura minimalista:** A pasta contém apenas 1 arquivo de teste, sem subpastas como `support/`, `fixtures/`, ou `plugins/`, que são comuns em projetos Cypress mais completos.
- **Cobertura limitada:** Apenas uma funcionalidade (zoom de imagem) é testada. Não há testes para outras páginas, fluxos de navegação, formulários, autenticação, etc.
- **Dependência de seletores frágeis:** O teste utiliza seletores CSS baseados em estilo (`div[style*="cursor: zoom-in"]`, `div[style*="position: fixed"]`), que são frágeis e podem quebrar com pequenas mudanças no CSS. Idealmente, deveriam usar `data-*` attributes ou classes semânticas.
- **Mock isolado:** O mock de API é feito no `beforeEach`, o que é uma boa prática para garantir que cada execução do teste comece com o mesmo estado.