import { useState } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import VideoCard from './VideoCard';
import styles from './styles/VideoGallery.module.css';

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    search: debouncedSearchTerm,
  });

  const { data: responseData, loading, error, refetch } = useApiFetch(`/api/videos?${params.toString()}`, {
    deps: [currentPage, debouncedSearchTerm],
  });

  const videos = responseData?.data || [];
  const totalPages = responseData?.pagination?.totalPages || 1;
  const totalItems = responseData?.pagination?.total || 0;

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
            <button onClick={refetch} className={styles.retryButton}>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-5)', marginTop: 'var(--spacing-10)', paddingBottom: 'var(--spacing-5)' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
            style={{ 
              padding: 'var(--spacing-2_5) var(--spacing-5)', borderRadius: 'var(--border-radius-lg)', fontWeight: 'var(--font-weight-medium)',
              border: 'var(--border-width-1) solid var(--color-border-light)', backgroundColor: currentPage === 1 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
              color: currentPage === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-all)'
            }}
          >
            Anterior
          </button>
          
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
            Página {currentPage} de {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
            style={{ 
              padding: 'var(--spacing-2_5) var(--spacing-5)', borderRadius: 'var(--border-radius-lg)', fontWeight: 'var(--font-weight-medium)',
              border: 'var(--border-width-1) solid var(--color-border-light)', backgroundColor: currentPage === totalPages ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
              color: currentPage === totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-all)'
            }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}