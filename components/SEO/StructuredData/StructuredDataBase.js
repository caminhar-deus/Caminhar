import { sanitizeJsonLd } from '@/lib/seo/config';

export { siteConfig, siteUrl, formatSchemaDate, getImageUrl } from '@/lib/seo/config';

/**
 * StructuredDataBase - Componente base para StructuredData
 * Centraliza o padrão de renderização JSX e os imports do config
 * 
 * @param {Object} schema - Objeto do schema.org para serializar
 * @returns {JSX.Element} Tag script com JSON-LD
 */
export default function StructuredDataBase({ schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(schema) }}
    />
  );
}