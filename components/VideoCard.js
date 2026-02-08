import styles from '../styles/VideoCard.module.css';

export default function VideoCard({ video }) {
  const handleYoutubeClick = (e) => {
    e.preventDefault();
    // Abre o link do YouTube em uma nova aba
    window.open(video.url_youtube_embed, '_blank', 'noopener,noreferrer');
  };

  // Converte URL do YouTube para embed
  const getYoutubeEmbedUrl = (youtubeUrl) => {
    try {
      // Extrai o ID do vídeo da URL
      const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
      }
      return youtubeUrl; // Retorna a URL original se não conseguir converter
    } catch (error) {
      console.error('Erro ao converter URL do YouTube:', error);
      return youtubeUrl;
    }
  };

  return (
    <div className={styles.videoCard}>
      <div className={styles.videoContainer}>
        <iframe
          src={getYoutubeEmbedUrl(video.url_youtube_embed)}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`Player do YouTube para ${video.titulo}`}
          className={styles.youtubeEmbed}
        ></iframe>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.titulo}>{video.titulo}</h3>
        
        <button 
          className={styles.youtubeButton}
          onClick={handleYoutubeClick}
          aria-label={`Assistir ${video.titulo} no YouTube`}
        >
          <span className={styles.youtubeIcon}>▶️</span>
          Assistir no YouTube
        </button>
      </div>
    </div>
  );
}