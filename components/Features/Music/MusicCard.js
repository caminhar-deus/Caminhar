import BaseCard from '../../UI/BaseCard';

export default function MusicCard({ musica }) {
  const handleSpotifyClick = (e) => {
    e.preventDefault();
    // Abre o link do Spotify em uma nova aba
    window.open(musica.url_spotify, '_blank', 'noopener,noreferrer');
  };

  // Converte URL do Spotify para embed
  const getSpotifyEmbedUrl = (spotifyUrl) => {
    try {
      // Extrai o ID da música da URL (suporta URLs internacionais)
      const match = spotifyUrl.match(/(?:spotify\.com\/(?:intl-\w+\/)?track\/|spotify:track:)([a-zA-Z0-9]+)/);
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
    <BaseCard
      hoverable
      media={
        <div style={{ padding: '16px', minWidth: '280px' }}>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: '12px', overflow: 'hidden', background: 'transparent' }}
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
      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{musica.titulo}</h3>
      <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '0.9rem' }}>{musica.artista}</p>
      
      <button 
        onClick={handleSpotifyClick}
        aria-label={`Ouvir ${musica.titulo} no Spotify`}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: '#1DB954',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.85rem',
          transition: 'opacity 0.2s ease',
        }}
      >
        🎵 Ouvir no Spotify
      </button>
    </BaseCard>
  );
}
