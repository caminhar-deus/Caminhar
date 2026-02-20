import { siteConfig, siteUrl, formatSchemaDate, getImageUrl } from '../../../lib/seo/config';

/**
 * MusicSchema - Schema.org para músicas (MusicRecording + AudioObject)
 * 
 * Props:
 * - title: Título da música (obrigatório)
 * - artist: Artista/Banda (obrigatório)
 * - album: Álbum (opcional)
 * - duration: Duração (ISO 8601 - ex: PT3M45S) (opcional)
 * - genre: Gênero (opcional, default: Gospel)
 * - image: URL da capa (opcional)
 * - url: URL da página (obrigatório)
 * - audioUrl: URL direta do áudio/Spotify (opcional)
 * - releaseDate: Data de lançamento (opcional)
 * - lyrics: Letra da música (opcional)
 * - spotifyId: ID do Spotify (opcional)
 * - youtubeId: ID do YouTube (opcional)
 * - description: Descrição (opcional)
 */

export default function MusicSchema({
  title,
  artist,
  album,
  duration,
  genre = 'Gospel Cristão',
  image,
  url,
  audioUrl,
  releaseDate,
  lyrics,
  spotifyId,
  youtubeId,
  description,
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: title,
    byArtist: {
      '@type': 'MusicGroup',
      name: artist,
    },
    ...(album && {
      inAlbum: {
        '@type': 'MusicAlbum',
        name: album,
      },
    }),
    ...(duration && { duration }),
    genre,
    image: getImageUrl(image),
    url,
    ...(audioUrl && {
      audio: {
        '@type': 'AudioObject',
        contentUrl: audioUrl,
        encodingFormat: 'audio/mpeg',
      },
    }),
    ...(releaseDate && { datePublished: formatSchemaDate(releaseDate) }),
    ...(lyrics && { recordingOf: {
      '@type': 'MusicComposition',
      lyrics: {
        '@type': 'CreativeWork',
        text: lyrics,
      },
    }}),
    description: description || `Ouça ${title} de ${artist} - Música gospel cristã`,
    isAccessibleForFree: true,
    // Additional properties
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
    // Music service links
    ...(spotifyId && {
      sameAs: [
        `https://open.spotify.com/track/${spotifyId}`,
      ],
    }),
    ...(youtubeId && {
      sameAs: [
        ...(spotifyId ? [`https://open.spotify.com/track/${spotifyId}`] : []),
        `https://youtube.com/watch?v=${youtubeId}`,
      ],
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
