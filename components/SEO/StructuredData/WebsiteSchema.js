import { siteConfig, siteUrl } from '../../../lib/seo/config';

/**
 * WebsiteSchema - Schema.org para o website
 * 
 * Props:
 * - name: Nome do site (opcional)
 * - description: Descrição (opcional)
 * - searchUrl: URL de busca (opcional)
 */

export default function WebsiteSchema({
  name = siteConfig.website.name,
  description = siteConfig.description,
  searchUrl = `${siteUrl}/blog?q={search_term_string}`,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
    // Creative work properties
    about: {
      '@type': 'Thing',
      name: 'Fé Cristã',
      description: 'Conteúdo cristão para edificação espiritual',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
