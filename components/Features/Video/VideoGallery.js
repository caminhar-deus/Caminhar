import { useState } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import { LoadingMessage, ErrorMessage } from '@/components/UI/StateMessages';
import VideoCard from './VideoCard';
import styles from './styles/VideoGallery.module.css';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'alpha', label: 'A-Z' },
  { value: 'alpha_desc', label: 'Z-A' },
];

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: '6',
    search: debouncedSearchTerm,
    sort: sortBy,
  });

  const { data: responseData, loading, error, refetch } = useApiFetch(`/api/videos?${params.toString()}`, {
    deps: [currentPage, debouncedSearchTerm, sortBy],
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

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.searchContainer}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Pesquisar por título ou descrição..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
              aria-label="Buscar vídeos"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className={styles.clearButton}
                aria-label="Limpar pesquisa"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
          <div className={styles.sortWrapper}>
            <label htmlFor="sort-select-videos" className={styles.sortLabel}>Ordenar:</label>
            <select
              id="sort-select-videos"
              value={sortBy}
              onChange={handleSortChange}
              className={styles.sortSelect}
              aria-label="Ordenar vídeos"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!loading && (searchTerm || videos.length > 0) && (
          <div className={styles.searchInfo}>
            <span className={styles.resultCount}>
              {searchTerm
                ? `${totalItems} resultado${totalItems !== 1 ? 's' : ''} para "${searchTerm}"`
                : `Mostrando ${videos.length} de ${totalItems} vídeo${totalItems !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>

      {loading && <LoadingMessage text="Carregando vídeos..." />}

      {error && (
        <>
          <ErrorMessage message={`${error}`} />
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
            <button onClick={refetch} className={styles.retryButton} type="button">
              Tentar novamente
            </button>
          </div>
        </>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className={styles.noResults}>
          <div className={styles.noResultsIcon}>🎬</div>
          <h3>Nenhum vídeo encontrado</h3>
          <p>
            {searchTerm
              ? `Nenhum resultado para "${searchTerm}". Tente buscar por outro termo.`
              : 'Nenhum vídeo disponível no momento.'}
          </p>
          {searchTerm && (
            <button onClick={clearSearch} className={styles.clearSearchButton} type="button">
              Limpar busca
            </button>
          )}
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          <div className={styles.galleryGrid}>
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`${styles.pageButton} ${currentPage <= 1 ? styles.pageButtonDisabled : ''}`}
                aria-label="Página anterior"
                type="button"
              >
                ❮ Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {currentPage} de {totalPages}
                {totalItems > 0 && <span className={styles.totalInfo}> ({totalItems} vídeo{totalItems !== 1 ? 's' : ''})</span>}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`${styles.pageButton} ${currentPage >= totalPages ? styles.pageButtonDisabled : ''}`}
                aria-label="Próxima página"
                type="button"
              >
                Próxima ❯
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}