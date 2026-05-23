# Relatório de Análise de Falhas nos Testes Cypress (v3)

**Data:** 22/05/2026
**Analista:** Claude (Cline)
**Progresso:** 22/25 testes passando (88%) — 3 falhas restantes

---

## Resumo da Execução Atual

| Spec | Resultado | Testes | Passing | Failing |
|------|-----------|--------|---------|---------|
| blog.cy.js | ✅ | 3 | 3 | 0 |
| home.cy.js | ✅ | 4 | 4 | 0 |
| image_zoom.cy.js | ❌ | 12 | 9 | 3 |
| navigation.cy.js | ✅ | 3 | 3 | 0 |
| post.cy.js | ✅ | 3 | 3 | 0 |
| **Total** | **20% falhou** | **25** | **22** | **3** |

---

## Falha 1 — "não deve exibir o container de zoom quando o post não tem image_url"

### Erro
```
CypressError: `cy.visit()` failed trying to load:
http://localhost:3000/blog/post-inexistente
  > 404: Not Found
```

### Causa Raiz
O slug `post-inexistente` não existe no banco PostgreSQL. A página `/blog/[slug]` usa SSR com `getServerSideProps`, que executa:

```javascript
const result = await query('SELECT * FROM posts WHERE slug = $1 AND published = true', [params.slug]);
if (!post) {
  return { notFound: true };  // → Next.js renderiza página 404
}
```

O `cy.visit()` por padrão falha quando o status code não é 2xx (configuração `failOnStatusCode: true`).

### Problema Conceitual
Este teste tenta verificar o comportamento **"post sem imagem"**. Para isso, a abordagem correta seria usar um post que existe no banco mas tem `image_url = NULL`. No banco real, **não há posts publicados sem `image_url`**. Os slugs disponíveis são:

| slug | has_image | published |
|------|-----------|-----------|
| `mateus-capitulos-6-e-7` | ✅ sim | ✅ sim |
| `mulher-virtuosa` | ✅ sim | ✅ sim |
| `teste-51` | ✅ sim | ✅ sim |
| `teste-341` | ✅ sim | ✅ sim |

Todos os posts publicados têm `image_url`. Não há um caso real de "post publicado sem imagem" no banco atual.

### Soluções Possíveis
- Usar `{ failOnStatusCode: false }` para visitar o 404 e verificar que não há container, mas isso testaria página 404, não "post sem imagem"
- Seedar um post com `published = true` e `image_url = NULL` no banco de desenvolvimento
- Interceptar a query do banco (viável apenas com plugin Node, não via `cy.intercept`)

---

## Falha 2 — "não deve fechar o lightbox ao clicar diretamente na imagem ampliada"

### Erro
```
AssertionError: Timed out retrying after 10000ms: Expected to find element: [data-testid="image-lightbox"], but never found it.
```

### Causa Raiz
O teste espera que clicar na imagem ampliada **não** feche o lightbox. No entanto, a aplicação fecha o lightbox **sim**. Veja o código em `pages/blog/[slug].js`:

```jsx
<div
  data-testid="image-lightbox"
  onClick={() => setIsImageZoomed(false)}  // ← fecha lightbox ao clicar
  style={{ cursor: 'zoom-out', ... }}
>
  <img
    data-testid="image-lightbox-img"
    style={{ ... }}
  />
</div>
```

O evento `onClick` está no **div pai** (overlay). A imagem está **dentro** deste div. Quando o usuário clica na imagem (linha 58 do teste: `cy.get('[data-testid="image-lightbox-img"]').click({ force: true })`), o evento de clique **propaga** do `<img>` para o `<div>` pai (bubble phase), que executa `setIsImageZoomed(false)`. Isso fecha o lightbox.

O teste assume que há `e.stopPropagation()` no clique da imagem, mas **a aplicação não implementa isso**.

### Fluxo do Teste vs Realidade
```
TESTE espera: clicar na img → não propaga → lightbox permanece aberto ✓
APLICAÇÃO:    clicar na img → propaga para o div → lightbox fecha ✗
```

### Soluções Possíveis
- Adicionar `e.stopPropagation()` no clique da imagem (mudança na aplicação)
- Remover o teste e documentar que o clique na imagem fecha o lightbox (comportamento esperado da aplicação)
- Ajustar o teste para esperar o comportamento real

---

## Falha 3 — "deve mover o foco para o lightbox ao abrir"

### Erro
```
AssertionError: Timed out retrying after 10000ms: Expected to find element: `focused`, but never found it.
```

### Causa Raiz
O teste executa `cy.focused().should('exist')` esperando que o lightbox receba foco automaticamente ao abrir. No entanto, a aplicação **não implementa** lógica de gerenciamento de foco.

Em `pages/blog/[slug].js`, o lightbox é renderizado condicionalmente:

```jsx
{isImageZoomed && (
  <div
    data-testid="image-lightbox"
    role="dialog"
    aria-modal="true"
    // ... sem lógica de foco automático
  >
    <img data-testid="image-lightbox-img" ... />
  </div>
)}
```

O lightbox:
- Não possui `autoFocus` ou `ref` com `.focus()`
- Não usa `useEffect` para focar ao abrir
- O img não é um elemento focável por padrão (a menos que tenha `tabindex`)

O comando customizado `openLightbox` (de `cypress/support/commands.js`) apenas clica no container e verifica se o lightbox está visível:

```javascript
Cypress.Commands.add('openLightbox', () => {
  cy.get('[data-testid="image-zoom-container"]').click();
  cy.lightboxShouldBeOpen();
});
```

Após o clique, nenhum elemento recebe foco programaticamente.

### Soluções Possíveis
- Adicionar `useRef` + `useEffect` na aplicação para focar o lightbox ao abrir (`dialog.focus()`)
- Adicionar `autoFocus` ou `tabIndex` na imagem do lightbox
- Remover o teste de foco se o gerenciamento de foco não for um requisito

---

## Mapa de Causa e Efeito (3 falhas restantes)

```
┌──────────────────────────────────────────────────────────────────┐
│                   3 FALHAS EM image_zoom.cy.js                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Falha 1 — "post sem imagem" (linha 49)                         │
│  └─ Slug post-inexistente → 404 → cy.visit() falha              │
│  └─ Nenhum post publicado sem image_url no banco                │
│                                                                  │
│  Falha 2 — "clique na imagem ampliada" (linha 58)               │
│  └─ Lightbox fecha porque o clique propaga para o overlay       │
│  └─ Aplicação NÃO tem stopPropagation na imagem                 │
│                                                                  │
│  Falha 3 — "foco no lightbox" (linha 119)                       │
│  └─ Lightbox não implementa gerenciamento de foco               │
│  └─ Nenhum elemento recebe .focus() ao abrir                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Conclusão

**22 de 25 testes passando (88%).** As 3 falhas restantes são todas no arquivo `image_zoom.cy.js` e decorrem de comportamentos reais da aplicação que divergem das expectativas dos testes:

1. **Teste de "post sem imagem"** — Não há post publicado sem imagem no banco. Usar slug inexistente gera 404.
2. **Teste de "clique não fecha"** — A aplicação fecha o lightbox ao clicar na imagem porque o evento propaga para o overlay. O teste espera `stopPropagation` que não existe.
3. **Teste de "foco automático"** — A aplicação não gerencia foco programaticamente. O teste espera `autofocus` que não implementado.

**Nenhuma correção ou ajuste foi aplicada aos testes ou à aplicação.**