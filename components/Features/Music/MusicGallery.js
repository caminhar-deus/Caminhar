import { useState } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import MusicCard from './MusicCard';
import styles from './styles/MusicGallery.module.css';

export default function MusicGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: musicasResponse, loading, error } = useApiFetch(
    `/api/musicas?public=true&page=${currentPage}&limit=6&search=${debouncedSearchTerm}`,
    {
      deps: [currentPage],
      transform: (result) => {
        return result;
      },
    }
  );

  // Extrai o array de músicas com fallback para diferentes formatos de resposta
  const musicas = Array.isArray(musicasResponse)
    ? musicasResponse
    : musicasResponse?.data || [];

  // Extrai dados de paginação com fallback
  const totalPages = musicasResponse?.totalPages
    || (musicasResponse?.pagination?.totalPages)
    || Math.ceil((musicasResponse?.total || musicasResponse?.pagination?.total || musicas.length) / 6)
    || 1;

  const totalItems = musicasResponse?.total
    || musicasResponse?.pagination?.total
    || musicas.length;

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Pesquisar por música ou artista..."
          value={searchTerm}
          onChange={handleSearch}
          className={styles.searchInput}
          aria-label="Buscar música ou artista"
        />
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingIcon}>🎵</div>
          <p>Carregando músicas...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>Erro ao carregar músicas. Tente novamente.</p>
        </div>
      )}

      {!loading && !error && musicas.length === 0 && (
        <div className={styles.noResults}>
          <div className={styles.noResultsIcon}>🔍</div>
          <p>Nenhuma música encontrada.</p>
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
                {totalItems && <span className={styles.totalInfo}> ({totalItems} músicas)</span>}
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