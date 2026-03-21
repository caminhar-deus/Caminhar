import { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import styles from './styles/VideoGallery.module.css';

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Função para carregar vídeos da API
  const loadVideos = async (term = '') => {
    try {
      setLoading(true);
      setError('');
      
      // Constrói a URL com o parâmetro de busca se existir
      const url = term 
        ? `/api/v1/videos?public=true&search=${encodeURIComponent(term)}` 
        : '/api/v1/videos?public=true';
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Verifica se a resposta tem a estrutura da API v1
        if (data.success && data.data && data.data.videos) {
          setVideos(data.data.videos);
        } else {
          // Caso seja a estrutura antiga (array direto)
          setVideos(data);
        }
      } else {
        throw new Error('Erro ao carregar vídeos');
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setError('Erro ao carregar vídeos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega vídeos iniciais na montagem do componente
  useEffect(() => {
    loadVideos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadVideos(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    loadVideos('');
  };

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.searchContainer}>
        <form onSubmit={handleSearch} className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Pesquisar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} className={styles.clearButton} aria-label="Limpar busca">
              ✕
            </button>
          )}
          <button type="submit" className={styles.searchButton}>
            Buscar
          </button>
        </form>
      </div>

      <div className={styles.galleryGrid}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingIcon}>🎬</div>
            <p>Carregando vídeos...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => loadVideos(searchTerm)} className={styles.retryButton}>
              Tentar novamente
            </button>
          </div>
        ) : videos.length > 0 ? (
          videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))
        ) : (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🎬</div>
            <h3>Nenhum vídeo encontrado</h3>
            <p>Tente buscar por outro termo.</p>
            {searchTerm && (
              <button onClick={clearSearch} className={styles.retryButton}>
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}