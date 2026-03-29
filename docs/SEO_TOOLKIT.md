# SEO Toolkit

## Visão Geral

Este documento descreve o conjunto de ferramentas e componentes de SEO (Search Engine Optimization) implementados no projeto. O objetivo é garantir que o conteúdo seja facilmente descoberto e corretamente indexado pelos motores de busca, como Google e Bing.

## Funcionalidades Principais

- **Meta Tags Dinâmicas:** Geração automática de tags essenciais (`title`, `description`) e de redes sociais (`Open Graph` para Facebook/LinkedIn, `Twitter Cards` para Twitter).
- **URLs Canônicas:** Definição de uma URL preferencial para cada página, evitando conteúdo duplicado.
- **Dados Estruturados (Schema.org):** Implementação de JSON-LD para descrever o conteúdo de forma que os motores de busca entendam o contexto (ex: artigos, vídeos).
- **Sitemap Dinâmico:** Geração automática de `sitemap.xml`, que lista todas as URLs públicas do site para facilitar o rastreamento.
- **Robots.txt Otimizado:** Arquivo que instrui os robôs dos motores de busca sobre quais páginas podem ou não ser rastreadas.

## Implementação

A maior parte da lógica de SEO está centralizada no componente `<Seo />`, localizado em `components/SEO/Seo.js`.

Este componente recebe propriedades (props) e gera dinamicamente todas as meta tags necessárias no `<head>` da página.

**Exemplo de uso em uma página:**

```jsx
import Seo from '../components/SEO/Seo';

export default function PostPage({ post }) {
  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        imageUrl={post.image_url}
        canonicalUrl={`https://seu-dominio.com/posts/${post.slug}`}
        schema={{
          '@type': 'Article',
          'headline': post.title,
          'datePublished': post.created_at,
          'image': post.image_url
        }}
      />
      
      <article>
        <h1>{post.title}</h1>
        {/* ... resto do conteúdo ... */}
      </article>
    </>
  );
}
```

## Rotas Automáticas

- **`/sitemap.xml`**: Gerado dinamicamente no servidor para incluir todos os posts e páginas públicas.
- **`/robots.txt`**: Arquivo estático em `/public` que aponta para o sitemap e define as regras de rastreamento.

## Validação

Para verificar se as tags de SEO estão sendo geradas corretamente, você pode usar:

- **"Exibir código-fonte da página"** no seu navegador e procurar pelas tags `<meta>` dentro do `<head>`.
- **Ferramentas online:**
  - Facebook Sharing Debugger (para Open Graph)
  - Twitter Card Validator (para Twitter Cards)
  - Google Rich Results Test (para Schema.org)

## Documentação Relacionada

- Arquitetura
- Deploy