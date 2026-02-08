import { useState, useMemo } from 'react';
import MusicCard from './MusicCard';
import styles from '../styles/MusicGallery.module.css';

// Dados temporários (Mock) para testar a interface
const musicasMock = [
  {
    id: 1,
    titulo: 'Espírito Santo',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 2,
    titulo: 'Aos Olhos do Pai',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 3,
    titulo: 'Teu Espírito',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 4,
    titulo: 'Santo Espírito',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 5,
    titulo: 'Espírito Santo (Ao Vivo)',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 6,
    titulo: 'Espírito Santo (Acústico)',
    artista: 'Gabriel Guedes de Almeida',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 7,
    titulo: 'Grande É o Senhor',
    artista: 'Aline Barros',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 8,
    titulo: 'Deus de Promessas',
    artista: 'Diante do Trono',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  },
  {
    id: 9,
    titulo: 'Ressuscita-me',
    artista: 'Ana Paula Valadão',
    url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
    url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  }
];

export default function MusicGallery() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra as músicas com base no termo de busca
  const filteredMusicas = useMemo(() => {
    if (!searchTerm.trim()) {
      return musicasMock;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return musicasMock.filter(musica => 
      musica.titulo.toLowerCase().includes(term) ||
      musica.artista.toLowerCase().includes(term)
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
              {musicasMock.length} músicas disponíveis
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
