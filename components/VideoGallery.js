import { useState, useMemo, useEffect } from 'react';
import VideoCard from './VideoCard';
import styles from '../styles/VideoGallery.module.css';

export default function VideoGallery() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Carrega os vídeos do banco de dados
  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/videos');
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        } else {
          throw new Error('Erro ao carregar vídeos');
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setError('Erro ao carregar vídeos');
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  // Filtra os vídeos com base no termo de busca
  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) {
      return videos;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return videos.filter(video => 
      video.titulo.toLowerCase().includes(term)
    );
  }, [searchTerm, videos]);

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
              {videos.length} vídeos disponíveis
            </span>
          )}
        </div>
      </div>

      {/* Resultados da busca */}
      <div className={styles.galleryGrid}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Carregando vídeos...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Erro ao carregar vídeos</h3>
            <p>{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🎬</div>
            <h3>Nenhum vídeo cadastrado</h3>
            <p>Ainda não há vídeos cadastrados. Cadastre o primeiro vídeo no painel administrativo.</p>
          </div>
        ) : filteredVideos.length > 0 ? (
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