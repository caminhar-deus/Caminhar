import { useState } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import { LoadingMessage, ErrorMessage } from '@/components/UI/StateMessages';
import MusicCard from './MusicCard';
import styles from './styles/MusicGallery.module.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Ordem padrão' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'alpha', label: 'A-Z' },
];

export default function MusicGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('default');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: musicasResponse, loading, error } = useApiFetch(
    `/api/musicas?public=true&page=${currentPage}&limit=6&search=${debouncedSearchTerm}&sort=${sortBy}`,
    {
      deps: [currentPage, debouncedSearchTerm, sortBy],
    }
  );

  // Extrai o array de músicas com fallback para diferentes formatos de resposta
  const musicas = Array.isArray(musicasResponse)
    ? musicasResponse
    : musicasResponse?.data || [];

  // Extrai dados de paginação de forma consistente
  const getPaginationData = (response) => {
    if (!response || typeof response !== 'object') {
      return { totalPages: 1, totalItems: 0 };
    }

    // Formato direto: { totalPages, total, data }
    if (response.totalPages !== undefined && response.total !== undefined) {
      return {
        totalPages: Number(response.totalPages) || 1,
        totalItems: Number(response.total) || 0,
      };
    }

    // Formato aninhado: { pagination: { totalPages, total } }
    if (response.pagination) {
      return {
        totalPages: Number(response.pagination.totalPages) || 1,
        totalItems: Number(response.pagination.total) || 0,
      };
    }

    // Fallback seguro baseado no array de dados
    const items = Array.isArray(response) ? response : response.data || [];
    const calculatedPages = Math.ceil(items.length / 6);
    return {
      totalPages: calculatedPages > 0 ? calculatedPages : 1,
      totalItems: items.length,
    };
  };

  const { totalPages, totalItems } = getPaginationData(musicasResponse);

  const handleSearch = (e) => {
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
              placeholder="Pesquisar por música ou artista..."
              value={searchTerm}
              onChange={handleSearch}
              className={styles.searchInput}
              aria-label="Buscar música ou artista"
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
            <label htmlFor="sort-select" className={styles.sortLabel}>Ordenar:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className={styles.sortSelect}
              aria-label="Ordenar músicas"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!loading && (searchTerm || musicas.length > 0) && (
          <div className={styles.searchInfo}>
            <span className={styles.resultCount}>
              {searchTerm
                ? `${totalItems} resultado${totalItems !== 1 ? 's' : ''} para "${searchTerm}"`
                : `Mostrando ${musicas.length} de ${totalItems} música${totalItems !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>

      {loading && <LoadingMessage text="Carregando músicas..." />}

      {error && <ErrorMessage message="Erro ao carregar músicas. Tente novamente." />}

      {!loading && !error && musicas.length === 0 && (
        <div className={styles.noResults}>
          <div className={styles.noResultsIcon}>🎵</div>
          <h3>Nenhuma música encontrada</h3>
          <p>
            {searchTerm
              ? `Nenhum resultado para "${searchTerm}". Tente buscar por outro título ou artista.`
              : 'Nenhuma música disponível no momento.'}
          </p>
          {searchTerm && (
            <button onClick={clearSearch} className={styles.clearSearchButton} type="button">
              Limpar busca
            </button>
          )}
        </div>
      )}

      {!loading && !error && musicas.length > 0 && (
        <>
          <div className={styles.galleryGrid}>
            {musicas.map((musica, index) => (
              <MusicCard key={musica.id || index} musica={musica} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`${styles.pageButton} ${currentPage <= 1 ? styles.pageButtonDisabled : ''}`}
                aria-label="Página anterior"
              >
                ❮ Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {currentPage} de {totalPages}
                {totalItems > 0 && <span className={styles.totalInfo}> ({totalItems} música{totalItems !== 1 ? 's' : ''})</span>}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`${styles.pageButton} ${currentPage >= totalPages ? styles.pageButtonDisabled : ''}`}
                aria-label="Próxima página"
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
