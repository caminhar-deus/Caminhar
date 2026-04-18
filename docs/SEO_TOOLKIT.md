# SEO Toolkit

## Visão Geral

Guia rápido sobre as ferramentas de SEO (Search Engine Optimization) do projeto, garantindo que o conteúdo seja corretamente indexado pelos motores de busca.

## Funcionalidades Principais

- **Meta Tags Dinâmicas:** Geração automática de `title`, `description`, `Open Graph` e `Twitter Cards`.
- **Dados Estruturados (Schema.org):** Implementação de JSON-LD para descrever o contexto do conteúdo (artigos, vídeos, etc.).
- **URLs Canônicas:** Evita conteúdo duplicado definindo uma URL preferencial para cada página.
- **Sitemap e Robots.txt:** Geração automática de `sitemap.xml` e `robots.txt` para guiar os buscadores.

## Implementação

A lógica está centralizada no componente `<Seo />` (`components/SEO/Head.js`). Ele recebe `props` e gera dinamicamente todas as tags necessárias no `<head>` da página.

**Exemplo de uso em uma página:**

```jsx
import Seo from '@/components/SEO/Head';

export default function PostPage({ post }) {
  return (
    <>
      <Seo
        title={post.title}
        description={post.description}
        image={post.image_url}
        canonical={`https://seu-dominio.com/posts/${post.slug}`}
      />
      
      <article>
        <h1>{post.title}</h1>
        {/* ... */}
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