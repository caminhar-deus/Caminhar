/**
 * Exemplo de implementação SEO para página de Músicas
 * Demonstra MusicSchema e LazyIframe para Spotify
 * 
 * Nota: A prop `musica` normalmente viria de getStaticProps, getServerSideProps ou de uma API.
 * Exemplo:
 *   export async function getServerSideProps({ params }) {
 *     const musica = await getMusicaById(params.id);
 *     return { props: { musica } };
 *   }
 */

import SEOHead from '../components/SEO/Head';
import { MusicSchema, BreadcrumbSchema } from '../components/SEO/StructuredData';
import { LazyIframe } from '../components/Performance';
import { getCanonicalUrl } from '../lib/seo/config';
import { useState } from 'react';

export default function MusicaPage({ musica }) {
  const canonicalUrl = getCanonicalUrl(`/musicas/${musica.id}`);

  // Estado de erro para o embed do Spotify
  const [embedError, setEmbedError] = useState(false);

  // Fallback visual para dados ausentes
  if (!musica || !musica.titulo) {
    return (
      <main id="main-content" className="container">
        <div className="error-state" role="alert">
          <h1>Música não disponível</h1>
          <p>A música solicitada não pôde ser carregada. Tente novamente mais tarde.</p>
          <a href="/musicas" className="btn">Voltar para Músicas</a>
        </div>
      </main>
    );
  }

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
        {embedError ? (
          <div className="fallback-content" role="alert">
            <p>O player do Spotify não pôde ser carregado.</p>
            {musica.spotify_url && (
              <a href={musica.spotify_url} target="_blank" rel="noopener noreferrer">
                Ouvir no Spotify
              </a>
            )}
          </div>
        ) : (
          <LazyIframe
            src={`https://open.spotify.com/embed/track/${musica.spotify_id}`}
            title={`${musica.titulo} - ${musica.artista} no Spotify`}
            provider="spotify"
            thumbnail={musica.capa}
            aspectRatio="100/152"
            onError={() => setEmbedError(true)}
          />
        )}
      </main>
    </>
  );
}