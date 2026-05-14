/**
 * Exemplo de implementação SEO para página de Vídeos
 * Demonstra VideoSchema e LazyIframe para YouTube
 * 
 * Nota: A prop `video` normalmente viria de getStaticProps, getServerSideProps ou de uma API.
 * Exemplo:
 *   export async function getServerSideProps({ params }) {
 *     const video = await getVideoById(params.id);
 *     return { props: { video } };
 *   }
 */

import SEOHead from '../components/SEO/Head';
import { VideoSchema, BreadcrumbSchema } from '../components/SEO/StructuredData';
import { LazyIframe } from '../components/Performance';
import { siteConfig, getCanonicalUrl } from '../lib/seo/config';
import { useState } from 'react';

export default function VideoPage({ video }) {
  const canonicalUrl = getCanonicalUrl(`/videos/${video.id}`);

  // Estado de erro para o embed do YouTube
  const [embedError, setEmbedError] = useState(false);

  // Fallback visual para dados ausentes
  if (!video || !video.titulo) {
    return (
      <main id="main-content" className="container">
        <div className="error-state" role="alert">
          <h1>Vídeo não disponível</h1>
          <p>O vídeo solicitado não pôde ser carregado. Tente novamente mais tarde.</p>
          <a href="/videos" className="btn">Voltar para Vídeos</a>
        </div>
      </main>
    );
  }

  return (
    <>
      <SEOHead
        title={video.titulo}
        description={video.descricao}
        image={video.thumbnail}
        type="video.other"
        tags={video.tags}
      />

      {/* Structured Data para vídeo */}
      <VideoSchema
        title={video.titulo}
        description={video.descricao}
        thumbnail={video.thumbnail}
        url={canonicalUrl}
        embedUrl={`https://www.youtube.com/embed/${video.youtube_id}`}
        uploadDate={video.data_publicacao}
        author={video.canal}
        tags={video.tags}
        youtubeId={video.youtube_id}
        views={video.view_count}
      />

      <BreadcrumbSchema
        items={[
          { name: 'Vídeos', url: '/videos' },
          { name: video.titulo, url: `/videos/${video.id}` },
        ]}
      />

      <main id="main-content">
        <h1>{video.titulo}</h1>
        
        {/* Player YouTube com lazy loading e privacidade */}
        {embedError ? (
          <div className="fallback-content" role="alert">
            <p>O player do YouTube não pôde ser carregado.</p>
            <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer">
              Assistir no YouTube
            </a>
          </div>
        ) : (
          <LazyIframe
            src={`https://www.youtube.com/embed/${video.youtube_id}`}
            title={video.titulo}
            provider="youtube"
            thumbnail={video.thumbnail}
            placeholderText="▶ Assistir vídeo no YouTube"
            onError={() => setEmbedError(true)}
          />
        )}

        <div className="video-meta">
          <p>Canal: {video.canal}</p>
          <p>Publicado: {new Date(video.data_publicacao).toLocaleDateString('pt-BR')}</p>
          <p>Visualizações: {video.view_count?.toLocaleString('pt-BR')}</p>
        </div>
      </main>
    </>
  );
}