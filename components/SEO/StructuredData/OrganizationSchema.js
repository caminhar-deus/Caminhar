import { siteConfig, siteUrl } from '../../../lib/seo/config';

/**
 * OrganizationSchema - Schema.org para a organização
 * 
 * Props:
 * - name: Nome da organização (opcional, usa default)
 * - description: Descrição da organização (opcional)
 * - logo: URL do logo (opcional)
 * - sameAs: Array de URLs de redes sociais (opcional)
 * - contact: Objeto com dados de contato (opcional)
 */

export default function OrganizationSchema({
  name = siteConfig.organization.name,
  description = siteConfig.description,
  logo = siteConfig.organization.logo.url,
  sameAs = siteConfig.organization.sameAs,
  contact = siteConfig.organization.contactPoint,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      ...contact,
    },
    // Additional properties for a religious organization
    additionalType: 'https://schema.org/NGO',
    knowsAbout: [
      'Fé Cristã',
      'Espiritualidade',
      'Reflexões Bíblicas',
      'Ensinamentos Cristãos',
      'Vida com Deus',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
