import BaseCard from '../../UI/BaseCard';
import styles from './styles/MusicCard.module.css';

export default function MusicCard({ musica }) {
  const handleSpotifyClick = (e) => {
    e.preventDefault();
    window.open(musica.url_spotify, '_blank', 'noopener,noreferrer');
  };

  const getSpotifyEmbedUrl = (spotifyUrl) => {
    try {
      const match = spotifyUrl.match(/(?:spotify\.com\/(?:intl-\w+\/)?track\/|spotify:track:)([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        return `https://open.spotify.com/embed/track/${match[1]}`;
      }
      return spotifyUrl;
    } catch (error) {
      console.error('Erro ao converter URL do Spotify:', error);
      return spotifyUrl;
    }
  };

  return (
    <BaseCard
      hoverable
      media={
        <div className={styles.embedWrapper}>
          <iframe
            data-testid="embed-iframe"
            className={styles.spotifyIframe}
            src={`${getSpotifyEmbedUrl(musica.url_spotify)}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            scrolling="no"
            title={`Player do Spotify para ${musica.titulo}`}
          ></iframe>
        </div>
      }
    >
      <h3 className={styles.musicTitle}>{musica.titulo}</h3>
      <p className={styles.musicArtist}>{musica.artista}</p>
      
      <button 
        onClick={handleSpotifyClick}
        aria-label={`Ouvir ${musica.titulo} no Spotify`}
        className={styles.spotifyButton}
      >
        🎵 Ouvir no Spotify
      </button>
    </BaseCard>
  );
}
