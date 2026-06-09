# Relatório de Correções e Melhorias — Pasta `/examples`

## Status: ✅ Todos os itens foram implementados

---

## 1. Código Morto / Comentado — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** As funções `getStaticProps` e `getStaticPaths` estavam completamente comentadas (linhas 219-241), gerando ruído visual e falsa impressão de funcionalidade.

**Correção aplicada:** Removidas as funções `getStaticProps` e `getStaticPaths` por completo. Substituídas por um comentário no cabeçalho do arquivo explicando como implementá-las.

---

## 2. Duplicidade de Dados — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** O breadcrumb era renderizado de duas formas: via componente `<BreadcrumbSchema>` (JSON-LD) e via HTML manual com microdados Schema.org inline.

**Correção aplicada:** Removido o breadcrumb HTML manual (`<nav aria-label="Breadcrumb">`). Mantido apenas o componente `<BreadcrumbSchema>` com JSON-LD, que é a abordagem recomendada pelo Google.

---

## 3. Hardcoded de Dados — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** Os dados do post eram definidos como estado local (`useState`) com valores fixos, induzindo ao uso incorreto de `useState` para dados estáticos.

**Correção aplicada:** O componente agora recebe `post` como prop (`{ post: initialPost }`) e faz fallback para dados mockados apenas em desenvolvimento via `initialPost || { ... }`. Comentário no topo do arquivo documenta a abordagem correta com `getStaticProps`.

---

## 4. Imagem com Blur Data URL Inválida — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** O `blurDataUrl` continha um valor placeholder genérico que não representa uma imagem real.

**Correção aplicada:** Adicionado comentário explicativo alertando sobre a necessidade de gerar o `blurDataUrl` real em produção, com referências a ferramentas como `plaiceholder` e `next/blur`.

---

## 5. Acessibilidade: Links de Compartilhamento sem Texto Descritivo — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** Os botões de compartilhamento exibiam apenas o nome da rede social ("Facebook", "Twitter", "WhatsApp"), sem indicar visualmente a ação.

**Correção aplicada:** Texto visível alterado para "Compartilhar no Facebook", "Compartilhar no Twitter" e "Compartilhar no WhatsApp", mantendo `aria-label` consistente.

---

## 6. Tag `<meta>` com itemProp fora de contexto — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** Microdados Schema.org inline no breadcrumb HTML que poderiam não ser interpretados corretamente.

**Correção aplicada:** Resolvido automaticamente com a remoção completa do breadcrumb HTML (item 2). Agora apenas o JSON-LD via `<BreadcrumbSchema>` é utilizado.

---

## 7. Prop `blurDataUrl` sem o `placeholder` Explícito — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Problema:** Valores mockados de `blurDataUrl` poderiam quebrar se copiados sem ajustes.

**Correção aplicada:** Incluído comentário de alerta explicando a necessidade de gerar `blurDataUrl` válido em produção, com documentação das ferramentas recomendadas.

---

## 8. Import Não Utilizado — `homepage-seo-example.js`

**Localização:** `/examples/homepage-seo-example.js`

**Problema:** `getCriticalResources` era importado mas sua interface de retorno não era documentada.

**Correção aplicada:** Adicionado comentário no cabeçalho do arquivo documentando o formato esperado do retorno de `getCriticalResources` (`{ images: string[], domains: string[] }`).

---

## 9. Ausência de Tratamento de Erro — Todos os exemplos

**Localização:** `/examples/blog-post-seo-example.js`, `/examples/homepage-seo-example.js`, `/examples/musicas-seo-example.js`, `/examples/videos-seo-example.js`

**Problema:** Nenhum dos exemplos implementava tratamento de erro para falha no carregamento de dados, LazyIframe ou imagem.

**Correção aplicada em cada arquivo:**

- **`blog-post-seo-example.js`**: Fallback visual para imagem quebrada (`onError` no `ImageOptimized`), fallback para LazyIframe com link direto ao YouTube, e fallback para dados ausentes (`post` undefined/null)
- **`homepage-seo-example.js`**: Fallback visual para hero image não carregada (`onError` no `ImageOptimized`)
- **`musicas-seo-example.js`**: Fallback visual para dados ausentes (`musica` undefined/null) e embed do Spotify não carregado com link direto
- **`videos-seo-example.js`**: Fallback visual para dados ausentes (`video` undefined/null) e embed do YouTube não carregado com link direto

---

## 10. Dados Mockados sem Contexto — `musicas-seo-example.js` e `videos-seo-example.js`

**Localização:** `/examples/musicas-seo-example.js` e `/examples/videos-seo-example.js`

**Problema:** Ambos recebiam `{ musica }` e `{ video }` como props sem demonstrar a origem dos dados.

**Correção aplicada:** Adicionado comentário explicativo no cabeçalho de ambos os arquivos sobre a origem esperada dos dados (`getStaticProps`, `getServerSideProps` ou API), com exemplo de código.

---

## Resumo das Ações Realizadas

| # | Categoria | Item | Status |
|---|-----------|------|--------|
| 1 | **Correção** | Código morto em `getStaticProps`/`getStaticPaths` comentados | ✅ Corrigido |
| 2 | **Duplicidade** | Breadcrumb renderizado em JSON-LD e HTML manual | ✅ Corrigido |
| 3 | **Qualidade** | Dados hardcoded com `useState` em vez de props | ✅ Corrigido |
| 4 | **Performance** | Blur data URL inválido/padrão | ✅ Corrigido |
| 5 | **Acessibilidade** | Links de compartilhamento com texto vago | ✅ Corrigido |
| 6 | **Duplicidade** | Microdados Schema.org inline redundantes | ✅ Corrigido |
| 7 | **Qualidade** | blurDataUrl sem validação real | ✅ Corrigido |
| 8 | **Performance** | Import subutilizado de `getCriticalResources` | ✅ Corrigido |
| 9 | **Correção** | Ausência de tratamento de erro em todos os exemplos | ✅ Corrigido |
| 10 | **Qualidade** | Dados mockados sem contexto de origem | ✅ Corrigido |