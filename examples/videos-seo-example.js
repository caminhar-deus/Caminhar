/**
 * Exemplo de implementação SEO para página de Vídeos
 * Demonstra VideoSchema e LazyIframe para YouTube
 */

import SEOHead from '../components/SEO/Head';
import { VideoSchema, BreadcrumbSchema } from '../components/SEO/StructuredData';
import { LazyIframe } from '../components/Performance';
import { siteConfig, getCanonicalUrl } from '../lib/seo/config';

export default function VideoPage({ video }) {
  const canonicalUrl = getCanonicalUrl(`/videos/${video.id}`);

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
        <LazyIframe
          src={`https://www.youtube.com/embed/${video.youtube_id}`}
          title={video.titulo}
          provider="youtube"
          thumbnail={video.thumbnail}
          placeholderText="▶ Assistir vídeo no YouTube"
        />

        <div className="video-meta">
          <p>Canal: {video.canal}</p>
          <p>Publicado: {new Date(video.data_publicacao).toLocaleDateString('pt-BR')}</p>
          <p>Visualizações: {video.view_count?.toLocaleString('pt-BR')}</p>
        </div>
      </main>
    </>
  );
}
