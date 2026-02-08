import { useState, useMemo } from 'react';
import VideoCard from './VideoCard';
import styles from '../styles/VideoGallery.module.css';

// Dados temporários (Mock) para testar a interface
const videosMock = [
  {
    id: 1,
    titulo: 'Espírito Santo - Mensagem Poderosa',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 2,
    titulo: 'Aos Olhos do Pai - Louvor e Adoração',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 3,
    titulo: 'Teu Espírito - Ministério de Louvor',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 4,
    titulo: 'Santo Espírito - Culto de Ensino',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 5,
    titulo: 'Espírito Santo (Ao Vivo) - Gravação do CD',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 6,
    titulo: 'Espírito Santo (Acústico) - Versão Desplugada',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 7,
    titulo: 'Grande É o Senhor - Mensagem de Fé',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 8,
    titulo: 'Deus de Promessas - Estudo Bíblico',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 9,
    titulo: 'Ressuscita-me - Testemunho de Vida',
    url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }
];

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra os vídeos com base no termo de busca
  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) {
      return videosMock;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return videosMock.filter(video => 
      video.titulo.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className={styles.galleryContainer}>
      {/* Campo de busca */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Pesquisar por vídeo..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Campo de busca de vídeos"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className={styles.clearButton}
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.searchInfo}>
          {searchTerm ? (
            <span className={styles.resultCount}>
              {filteredVideos.length} resultado{filteredVideos.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className={styles.totalCount}>
              {videosMock.length} vídeos disponíveis
            </span>
          )}
        </div>
      </div>

      {/* Resultados da busca */}
      <div className={styles.galleryGrid}>
        {filteredVideos.length > 0 ? (
          filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))
        ) : (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🎬</div>
            <h3>Nenhum vídeo encontrado</h3>
            <p>Tente buscar por outro título de vídeo.</p>
            <button onClick={clearSearch} className={styles.clearSearchButton}>
              Limpar busca
            </button>
          </div>
        )}
      </div>
    </div>
  );
}