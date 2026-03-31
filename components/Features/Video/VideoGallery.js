import { useState, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';
import styles from './styles/VideoGallery.module.css';

// Otimização: Hook para "debouncing", que aguarda o usuário parar de digitar
// para então fazer a requisição à API, evitando chamadas excessivas.
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6;

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: debouncedSearchTerm,
      });

      const response = await fetch(`/api/videos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Falha ao buscar vídeos da API.');
      }

      const data = await response.json();
      if (data.success) {
        setVideos(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      } else {
        throw new Error(data.error || 'A API retornou um erro inesperado.');
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setError('Erro ao carregar vídeos. Por favor, tente novamente.');
      setVideos([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, itemsPerPage]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Pesquisar por título ou descrição..."
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
          <span className={styles.totalCount}>
            {totalItems} vídeo{totalItems !== 1 ? 's' : ''} {debouncedSearchTerm ? 'encontrado(s)' : 'disponível(is)'}
          </span>
        </div>
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
            <button onClick={loadVideos} className={styles.retryButton}>
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

      {/* Controles de Paginação */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '20px' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', fontWeight: '500',
              border: '1px solid #d1d5db', backgroundColor: currentPage === 1 ? '#f3f4f6' : '#fff',
              color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Anterior
          </button>
          
          <span style={{ fontWeight: '500', color: '#4b5563' }}>
            Página {currentPage} de {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', fontWeight: '500',
              border: '1px solid #d1d5db', backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#fff',
              color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}