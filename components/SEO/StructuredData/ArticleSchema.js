import { siteConfig, siteUrl, formatSchemaDate, getImageUrl } from '../../../lib/seo/config';

/**
 * ArticleSchema - Schema.org para artigos do blog
 * 
 * Props:
 * - title: Título do artigo (obrigatório)
 * - description: Descrição/Resumo (obrigatório)
 * - image: URL da imagem principal (opcional)
 * - author: Nome do autor (opcional, usa default)
 * - authorUrl: URL do autor (opcional)
 * - publishedAt: Data de publicação ISO (obrigatório)
 * - modifiedAt: Data de modificação ISO (opcional)
 * - url: URL canônica do artigo (obrigatório)
 * - tags: Array de tags (opcional)
 * - category: Categoria do artigo (opcional)
 * - wordCount: Contagem de palavras (opcional)
 * - articleBody: Corpo do artigo (opcional - para AMP)
 */

export default function ArticleSchema({
  title,
  description,
  image,
  author = siteConfig.author.name,
  authorUrl = siteConfig.author.url,
  publishedAt,
  modifiedAt,
  url,
  tags = [],
  category = 'Reflexões',
  wordCount,
  articleBody,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: {
      '@type': 'ImageObject',
      url: getImageUrl(image),
      width: 1200,
      height: 630,
    },
    author: {
      '@type': 'Person',
      name: author,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: siteConfig.organization.logo.url,
        width: 512,
        height: 512,
      },
    },
    datePublished: formatSchemaDate(publishedAt),
    dateModified: formatSchemaDate(modifiedAt) || formatSchemaDate(publishedAt),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    articleSection: category,
    keywords: tags.join(', '),
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
    ...(wordCount && { wordCount }),
    ...(articleBody && { articleBody }),
    // BlogPosting is more specific than Article
    '@type': ['Article', 'BlogPosting'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
