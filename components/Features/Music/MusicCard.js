import { BaseCard } from '@/components/UI';
import LazyIframe from '../../Performance/LazyIframe';
import { getSpotifyEmbedUrl } from '@/lib/media/spotify';
import styles from './styles/MusicCard.module.css';

export default function MusicCard({ musica }) {
  const temSpotify = Boolean(musica.url_spotify);

  // `getSpotifyEmbedUrl` devolve a URL de embed só para track válido e `null`
  // caso contrário — contrato do ADR-0023. Fora do track, o card cai no
  // fallback ("Prévia indisponível") sem renderizar iframe quebrado.
  const embedSrc = temSpotify ? getSpotifyEmbedUrl(musica.url_spotify) : null;
  const embedUrl = embedSrc ? `${embedSrc}?utm_source=generator&theme=0` : '';

  const handleSpotifyClick = (e) => {
    e.preventDefault();
    if (temSpotify) {
      window.open(musica.url_spotify, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <BaseCard
      hoverable
      media={
        <div className={styles.embedWrapper}>
          {embedUrl ? (
            <LazyIframe
              src={embedUrl}
              title={`Player do Spotify para ${musica.titulo}`}
              provider="spotify"
              placeholderText=""
              style={{ aspectRatio: 'auto', height: '152px' }}
              data-testid="embed-iframe"
            />
          ) : (
            <div className={styles.noEmbed}>
              <p>Prévia indisponível</p>
            </div>
          )}
        </div>
      }
    >
      <h3 className={styles.musicTitle}>{musica.titulo}</h3>
      <p className={styles.musicArtist}>{musica.artista}</p>
      
      {temSpotify && (
        <button 
          onClick={handleSpotifyClick}
          aria-label={`Ouvir ${musica.titulo} no Spotify`}
          className={styles.spotifyButton}
        >
          🎵 Ouvir no Spotify
        </button>
      )}
    </BaseCard>
  );
}
