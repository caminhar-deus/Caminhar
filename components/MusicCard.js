import styles from '../styles/MusicCard.module.css';

export default function MusicCard({ musica }) {
  const handleSpotifyClick = (e) => {
    e.preventDefault();
    // Abre o link do Spotify em uma nova aba
    window.open(musica.url_spotify, '_blank', 'noopener,noreferrer');
  };

  // Converte URL do Spotify para embed
  const getSpotifyEmbedUrl = (spotifyUrl) => {
    try {
      // Extrai o ID da música da URL
      const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)(\?|$)/);
      if (match && match[1]) {
        return `https://open.spotify.com/embed/track/${match[1]}`;
      }
      return spotifyUrl; // Retorna a URL original se não conseguir converter
    } catch (error) {
      console.error('Erro ao converter URL do Spotify:', error);
      return spotifyUrl;
    }
  };

  return (
    <div className={styles.musicCard}>
      <div className={styles.imageContainer}>
        <img 
          src={musica.url_imagem} 
          alt={`${musica.titulo} - ${musica.artista}`}
          className={styles.albumArt}
          loading="lazy"
        />
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.titulo}>{musica.titulo}</h3>
        <p className={styles.artista}>{musica.artista}</p>
        
        <div className={styles.spotifyContainer}>
          <iframe
            src={getSpotifyEmbedUrl(musica.url_spotify)}
            width="100%"
            height="80"
            frameBorder="0"
            allowtransparency="true"
            allow="encrypted-media"
            title={`Player do Spotify para ${musica.titulo}`}
            className={styles.spotifyEmbed}
          ></iframe>
        </div>
        
        <button 
          className={styles.spotifyButton}
          onClick={handleSpotifyClick}
          aria-label={`Ouvir ${musica.titulo} no Spotify`}
        >
          <span className={styles.spotifyIcon}>🎵</span>
          Ouvir no Spotify
        </button>
      </div>
    </div>
  );
}
