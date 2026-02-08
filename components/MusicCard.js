import styles from '../styles/MusicCard.module.css';

export default function MusicCard({ musica }) {
  const handleSpotifyClick = (e) => {
    e.preventDefault();
    // Abre o link do Spotify em uma nova aba
    window.open(musica.url_spotify, '_blank', 'noopener,noreferrer');
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