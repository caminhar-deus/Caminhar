import { useState } from 'react';
import styles from '../styles/VideoCard.module.css';

export default function VideoCard({ video }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleYoutubeClick = (e) => {
    e.preventDefault();
    // Abre o link do YouTube em uma nova aba
    if (video.url_youtube) {
      window.open(video.url_youtube, '_blank', 'noopener,noreferrer');
    }
  };

  // Converte URL do YouTube para embed
  const getYoutubeEmbedUrl = (youtubeUrl) => {
    try {
      if (!youtubeUrl) {
        return '';
      }
      
      // Extrai o ID do vídeo da URL
      const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
      }
      
      // Se não conseguir extrair o ID, tenta usar a URL original
      return youtubeUrl;
    } catch (error) {
      console.error('Erro ao converter URL do YouTube:', error);
      return youtubeUrl;
    }
  };

  return (
    <div className={styles.videoCard}>
      <div className={styles.videoContainer}>
        {video.url_youtube ? (
          <iframe
            src={getYoutubeEmbedUrl(video.url_youtube)}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`Player do YouTube para ${video.titulo}`}
            className={styles.youtubeEmbed}
            loading="lazy"
          ></iframe>
        ) : (
          <div className={styles.noVideoPlaceholder}>
            <span className={styles.noVideoIcon}>🎬</span>
            <p>Vídeo não disponível</p>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.titulo}>{video.titulo}</h3>
        {video.descricao && (
          <div>
            <p className={`${styles.descricao} ${isExpanded ? styles.expanded : ''}`}>
              {video.descricao}
            </p>
            {video.descricao.length > 120 && (
              <button 
                className={styles.readMoreBtn}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Ler menos' : 'Ler mais'}
              </button>
            )}
          </div>
        )}
        
        {video.url_youtube && (
          <button 
            className={styles.youtubeButton}
            onClick={handleYoutubeClick}
            aria-label={`Assistir ${video.titulo} no YouTube`}
          >
            <span className={styles.youtubeIcon}>▶️</span>
            Assistir no YouTube
          </button>
        )}
      </div>
    </div>
  );
}
