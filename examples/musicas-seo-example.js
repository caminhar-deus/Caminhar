/**
 * Exemplo de implementação SEO para página de Músicas
 * Demonstra MusicSchema e LazyIframe para Spotify
 */

import SEOHead from '../components/SEO/Head';
import { MusicSchema, BreadcrumbSchema } from '../components/SEO/StructuredData';
import { LazyIframe } from '../components/Performance';
import { siteConfig, getCanonicalUrl } from '../lib/seo/config';

export default function MusicaPage({ musica }) {
  const canonicalUrl = getCanonicalUrl(`/musicas/${musica.id}`);

  return (
    <>
      <SEOHead
        title={`${musica.titulo} - ${musica.artista}`}
        description={`Ouça ${musica.titulo} de ${musica.artista}. Música gospel cristã para edificar sua fé.`}
        image={musica.capa}
        type="music.song"
        tags={['música gospel', 'louvor', musica.genero]}
      />

      {/* Structured Data para música */}
      <MusicSchema
        title={musica.titulo}
        artist={musica.artista}
        album={musica.album}
        image={musica.capa}
        url={canonicalUrl}
        audioUrl={musica.spotify_url}
        genre={musica.genero}
        spotifyId={musica.spotify_id}
        releaseDate={musica.data_lancamento}
      />

      <BreadcrumbSchema
        items={[
          { name: 'Músicas', url: '/musicas' },
          { name: musica.titulo, url: `/musicas/${musica.id}` },
        ]}
      />

      <main id="main-content">
        <h1>{musica.titulo}</h1>
        <p>{musica.artista}</p>

        {/* Player Spotify com lazy loading */}
        <LazyIframe
          src={`https://open.spotify.com/embed/track/${musica.spotify_id}`}
          title={`${musica.titulo} - ${musica.artista} no Spotify`}
          provider="spotify"
          thumbnail={musica.capa}
          aspectRatio="100/152"
        />
      </main>
    </>
  );
}
