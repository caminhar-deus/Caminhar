# Relatório de Análise de Falhas nos Testes Cypress

**Data:** 22/05/2026
**Analista:** Claude (Cline)
**Contexto:** 5 spec files executados, 25 testes, **5 passing**, **15 failing**, **5 skipped** (100% de spec files com falha)

---

## Sumário Executivo

Os testes foram escritos assumindo que as páginas fazem chamadas HTTP (`fetch`/`axios`) para APIs internas durante o carregamento. No entanto, a aplicação utiliza **Server-Side Rendering (SSR)** com **queries diretas ao banco de dados PostgreSQL** no momento da renderização. Isso invalida a estratégia de mock via `cy.intercept()` para 12 das 15 falhas, gerando timeouts em cadeia.

---

## 1. blog.cy.js — 3 falhas

### Causa Raiz: **Mock de requisição HTTP que nunca ocorre**

| Teste | Erro | Causa |
|-------|------|-------|
| deve carregar a listagem de posts | Timeout em `cy.wait('@getPosts')` | — |
| deve exibir o título da página | Timeout em `cy.wait('@getPosts')` | — |
| deve exibir links para posts individuais | Timeout em `cy.wait('@getPosts')` | — |

**Análise Detalhada:**

O `beforeEach` mocka:
```javascript
cy.intercept('GET', '/api/posts*', { ... }).as('getPosts');
```

Mas a página `/blog` (`pages/blog/index.js`) usa:
```javascript
export async function getServerSideProps({ query: queryParams }) {
  const postsResult = await query('SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
  // ...
}
```

**Problema:** O SSR faz query **direta ao banco PostgreSQL**, não uma chamada HTTP para `/api/posts`. O `cy.intercept` mocka algo que **nunca** será chamado. O `cy.wait('@getPosts')` aguarda 10s até timeout.

**Evidência:** Não existe endpoint `/api/posts` que retorne listagem — a listagem é montada exclusivamente via SSR com query SQL direta.

---

## 2. home.cy.js — 1 falha

### Causa Raiz: **Uso de API inexistente no Cypress**

| Teste | Erro | Causa |
|-------|------|-------|
| deve ter links de navegação no header | `TypeError: cy.get(...).should(...).or is not a function` | — |

**Código problemático (linha 14 de `home.cy.js`):**
```javascript
cy.get('nav').should('exist').or('header').should('exist');
```

**Análise:** O Cypress **não** possui um método `.or()` encadeável após `.should()`. Esta é uma sintaxe inválida. A API do Cypress permite encadeamento com `.and()`, mas não `.or()`.

**Soluções possíveis (apenas para diagnóstico):**
- Usar múltiplos seletores CSS: `cy.get('nav, header').should('exist')`
- Usar um callback de função: `cy.get('body').then($body => { const hasNav = $body.find('nav').length > 0; const hasHeader = $body.find('header').length > 0; expect(hasNav || hasHeader).to.be.true; })`

**Observação:** Os outros 3 testes deste spec passam normalmente, indicando que a página home carrega sem erros.

---

## 3. image_zoom.cy.js — 7 falhas (5 skipped)

### Causa Raiz: **Mock de requisição HTTP que nunca ocorre** (mesmo padrão do blog.cy.js)

| Teste | Erro | Causa |
|-------|------|-------|
| "before each" hook (Fluxo principal) | Timeout em `cy.wait('@getPost')` | — |
| não deve exibir container sem image_url | Timeout em `cy.wait('@getPostSemImagem')` | — |
| não deve fechar lightbox ao clicar na imagem | Timeout em `cy.wait('@getPost')` | — |
| múltiplas aberturas/fechamentos | Timeout em `cy.wait('@getPost')` | — |
| viewport mobile | Timeout em `cy.wait('@getPost')` | — |
| viewport tablet | Timeout em `cy.wait('@getPost')` | — |
| atributos ARIA | Timeout em `cy.wait('@getPost')` | — |

**Análise Detalhada:**

O `beforeEach` mocka:
```javascript
cy.intercept('GET', '/api/posts?slug=mulher-virtuosa', { body: [postMock] }).as('getPost');
```

Mas a página `/blog/[slug]` (`pages/blog/[slug].js`) usa:
```javascript
export async function getServerSideProps({ params }) {
  const result = await query('SELECT * FROM posts WHERE slug = $1 AND published = true', [params.slug]);
  // ...
}
```

**Problema:** Mesmo cenário do blog.cy.js — SSR com query direta ao banco, não chamada HTTP. O `cy.wait('@getPost')` nunca resolve.

**Impacto em cascata:**
- Os 2 primeiros testes de cada suite (Fluxo principal, Acessibilidade) falham no `beforeEach`
- Isso faz com que os demais testes no mesmo `describe` sejam **pulados** (5 skipped)
- O teste `getPostSemImagem` usa uma rota intercept diferente (`getPostSemImagem`) mas o problema é o mesmo

**Observação:** Mesmo que o banco estivesse rodando, o mock do `cy.intercept` continuaria sendo ignorado porque a página usa SSR.

---

## 4. navigation.cy.js — 1 falha

### Causa Raiz: **URL incorreta no cy.intercept**

| Teste | Erro | Causa |
|-------|------|-------|
| deve carregar admin sem erros de autenticação | Timeout em `cy.wait('@checkAuth')` | — |

**Código problemático (linha 37 de `navigation.cy.js`):**
```javascript
cy.intercept('GET', '/api/auth/me', {
  statusCode: 401,
  body: { error: 'Unauthorized' }
}).as('checkAuth');

cy.visit('/admin');
cy.wait('@checkAuth');
```

**Análise:** A página `/admin` (`pages/admin.js`) na montagem faz uma requisição para:
```javascript
fetch('/api/auth/check', { credentials: 'include' })
```

**Problema:** O mock intercepta `/api/auth/me`, mas a página chama `/api/auth/check`. A rota `checkAuth` nunca é chamada, gerando timeout de 10s.

**Observação:** Existe o endpoint `/api/auth/check` (`pages/api/auth/check.js`) que é funcional e retorna 401 quando não há token. O mock deveria interceptar `/api/auth/check`.

---

## 5. post.cy.js — 3 falhas

### Causa Raiz: **Mock de requisição HTTP que nunca ocorre** (mesmo padrão)

| Teste | Erro | Causa |
|-------|------|-------|
| deve carregar o post com imagem | Timeout em `cy.wait('@getPost')` | — |
| deve exibir o conteúdo do post | Timeout em `cy.wait('@getPostCompleto')` | — |
| deve exibir botões de compartilhamento | Timeout em `cy.wait('@getPostCompartilhar')` | — |

**Análise:** Mesmo problema do blog.cy.js e image_zoom.cy.js. A página `/blog/[slug]` usa SSR com query direta ao banco, não chamada HTTP. Os 3 intercepts nunca são chamados.

**Detalhe adicional:** O teste `getPostCompleto` mocka um post com conteúdo completo:
```javascript
cy.intercept('GET', '/api/posts?slug=mulher-virtuosa', {
  body: [{
    ...postMock,
    content: 'Conteúdo detalhado do post para testar a exibição completa...'
  }]
}).as('getPostCompleto');
```

E `getPostCompartilhar` mocka o mesmo post. Ambos nunca são chamados pela mesma razão.

---

## Mapa de Causa e Efeito

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PROBLEMA SISTÊMICO PRINCIPAL                        │
│                                                                     │
│  Páginas usam SSR (getServerSideProps) com query direta ao banco   │
│  └── Testes mockam cy.intercept() para chamadas HTTP                │
│      └── Requisição mockada NUNCA ocorre                           │
│          └── cy.wait() atinge timeout de 10s após 3 retries        │
│              └── 12 testes afetados (blog, image_zoom, post)       │
├─────────────────────────────────────────────────────────────────────┤
│                    PROBLEMAS SECUNDÁRIOS                             │
│                                                                     │
│  1. home.cy.js: Uso de API inexistente .or() no Cypress            │
│  2. navigation.cy.js: URL errada (/api/auth/me vs /api/auth/check) │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resumo das Falhas por Categoria

| Categoria | Quantidade | Specs Afetados |
|-----------|-----------|----------------|
| SSR + mock HTTP inexistente | 12 | blog.cy.js (3), image_zoom.cy.js (7), post.cy.js (3) |
| API Cypress inválida (`.or()`) | 1 | home.cy.js (1) |
| URL de intercept incorreta | 1 | navigation.cy.js (1) |
| Testes skipped em cascata | 5 | image_zoom.cy.js (5) |

---

## Linha do Tempo de Execução

| Spec | Duração | Testes | Resultado |
|------|---------|--------|-----------|
| blog.cy.js | 1m 34s | 3 | 3 falhas (cada uma com 3 retries = 9 screenshots) |
| home.cy.js | 2s | 4 | 3 pass, 1 fail (3 retries no fail = 3 screenshots) |
| image_zoom.cy.js | 3m 40s | 12 | 7 falhas, 5 skipped (21 screenshots) |
| navigation.cy.js | 33s | 3 | 2 pass, 1 fail (3 retries = 3 screenshots) |
| post.cy.js | 1m 34s | 3 | 3 falhas (9 screenshots) |

**Duração total:** 7 min 26s

---

## Diagnóstico Final

1. **Problema nº 1 — Arquitetura de testes incompatível com SSR (12 falhas):**
   Os testes foram escritos como se as páginas fossem SPAs que consomem APIs REST via fetch, mas a aplicação utiliza Next.js com SSR e queries SQL diretas. Para corrigir, seria necessário ou:
   - Rodar um banco PostgreSQL real com dados de seed durante os testes
   - Ou mockar as funções de query do banco (camada `lib/db.js`)
   - Ou reescrever os testes para não dependerem de dados mockados via intercept

2. **Problema nº 2 — Sintaxe inválida no Cypress (1 falha):**  
   Uso de `.or()` que não existe na API do Cypress.

3. **Problema nº 3 — URL de endpoint incorreta (1 falha):**  
   `/api/auth/me` não existe; o endpoint real é `/api/auth/check`.