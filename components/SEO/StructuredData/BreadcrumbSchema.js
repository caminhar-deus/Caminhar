import { siteConfig, siteUrl } from '../../../lib/seo/config';

/**
 * BreadcrumbSchema - Schema.org para breadcrumbs/navegação
 * 
 * Props:
 * - items: Array de objetos {name, url, position} (obrigatório)
 *   position é opcional - será gerado automaticamente
 * 
 * Exemplo:
 * <BreadcrumbSchema
 *   items={[
 *     { name: 'Blog', url: '/blog' },
 *     { name: 'Título do Post', url: '/blog/slug' },
 *   ]}
 * />
 */

export default function BreadcrumbSchema({ items }) {
  // Adiciona home automaticamente se não for a primeira
  const breadcrumbItems = items[0]?.url === '/' || items[0]?.url === siteUrl
    ? items
    : [
        { name: 'Início', url: siteUrl },
        ...items,
      ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => {
      // Gera URL absoluta
      const absoluteUrl = item.url.startsWith('http') 
        ? item.url 
        : `${siteUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`;

      return {
        '@type': 'ListItem',
        position: item.position || index + 1,
        name: item.name,
        item: absoluteUrl,
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
