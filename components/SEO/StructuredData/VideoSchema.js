import { siteConfig, siteUrl, formatSchemaDate, getImageUrl } from '../../../lib/seo/config';

/**
 * VideoSchema - Schema.org para vídeos (VideoObject)
 * 
 * Props:
 * - title: Título do vídeo (obrigatório)
 * - description: Descrição (obrigatório)
 * - thumbnail: URL da thumbnail (obrigatório)
 * - url: URL da página (obrigatório)
 * - embedUrl: URL de embed (YouTube iframe) (opcional)
 * - contentUrl: URL direta do vídeo (opcional)
 * - duration: Duração (ISO 8601 - ex: PT15M30S) (opcional)
 * - uploadDate: Data de upload (opcional)
 * - author: Nome do autor/canal (opcional)
 * - tags: Array de tags (opcional)
 * - views: Número de views (opcional)
 * - youtubeId: ID do YouTube (opcional)
 * - transcript: Transcrição do vídeo (opcional)
 */

export default function VideoSchema({
  title,
  description,
  thumbnail,
  url,
  embedUrl,
  contentUrl,
  duration,
  uploadDate,
  author = siteConfig.author.name,
  tags = [],
  views,
  youtubeId,
  transcript,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    thumbnailUrl: getImageUrl(thumbnail),
    url,
    ...(embedUrl && { embedUrl }),
    ...(contentUrl && { contentUrl }),
    ...(duration && { duration }),
    ...(uploadDate && { uploadDate: formatSchemaDate(uploadDate) }),
    ...(uploadDate && { datePublished: formatSchemaDate(uploadDate) }),
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: siteConfig.organization.logo.url,
      },
    },
    keywords: Array.isArray(tags) ? tags.join(', ') : tags,
    inLanguage: siteConfig.language,
    isAccessibleForFree: true,
    ...(views && { interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: views,
    }}),
    // YouTube specific
    ...(youtubeId && {
      identifier: youtubeId,
      sameAs: `https://youtube.com/watch?v=${youtubeId}`,
    }),
    // Accessibility
    ...(transcript && {
      transcript: {
        '@type': 'CreativeWork',
        text: transcript,
      },
    }),
    // Video quality hints
    videoQuality: 'HD',
    // Content category
    about: {
      '@type': 'Thing',
      name: 'Conteúdo Cristão',
      description: 'Vídeos de pregações, testemunhos e reflexões cristãs',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
