import { useState, useMemo, useEffect } from 'react';
import MusicCard from './MusicCard';
import styles from '../styles/MusicGallery.module.css';

export default function MusicGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [musicas, setMusicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Carrega as músicas do banco de dados
  useEffect(() => {
    const loadMusicas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/musicas');
        if (response.ok) {
          const data = await response.json();
          setMusicas(data);
        } else {
          throw new Error('Erro ao carregar músicas');
        }
      } catch (error) {
        console.error('Error loading musicas:', error);
        setError('Erro ao carregar músicas');
      } finally {
        setLoading(false);
      }
    };

    loadMusicas();
  }, []);

  // Filtra as músicas com base no termo de busca
  const filteredMusicas = useMemo(() => {
    if (!searchTerm.trim()) {
      return musicas;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return musicas.filter(musica => 
      musica.titulo.toLowerCase().includes(term) ||
      musica.artista.toLowerCase().includes(term)
    );
  }, [searchTerm, musicas]);

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
            placeholder="Pesquisar por música ou artista..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Campo de busca de músicas"
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
              {filteredMusicas.length} resultado{filteredMusicas.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className={styles.totalCount}>
              {musicas.length} músicas disponíveis
            </span>
          )}
        </div>
      </div>

      {/* Resultados da busca */}
      <div className={styles.galleryGrid}>
        {filteredMusicas.length > 0 ? (
          filteredMusicas.map((musica) => (
            <MusicCard key={musica.id} musica={musica} />
          ))
        ) : loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingIcon}>🎵</div>
            <p>Carregando músicas...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Erro ao carregar músicas</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>🎵</div>
            <h3>Nenhuma música encontrada</h3>
            <p>Tente buscar por outro artista ou nome de música.</p>
            <button onClick={clearSearch} className={styles.clearSearchButton}>
              Limpar busca
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
