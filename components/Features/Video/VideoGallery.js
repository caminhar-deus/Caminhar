import { useState, useEffect, useMemo } from 'react';
import VideoCard from './VideoCard';
import styles from './styles/VideoGallery.module.css';

export default function VideoGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados da Paginação Local
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Exibindo 6 vídeos por página (igual músicas)

  // Função para carregar vídeos da API
  const loadVideos = async () => {
    try {
      setLoading(true);
      setError('');
        
      const response = await fetch('/api/v1/videos?public=true');
      if (response.ok) {
        const data = await response.json();
        // Verifica se a resposta tem a estrutura da API v1
        if (data.success && data.data && data.data.videos) {
          setVideos(data.data.videos);
        } else {
          // Caso seja a estrutura antiga (array direto)
          setVideos(data.videos || data.data || data);
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

  // Filtra os vídeos com base no termo de busca instantaneamente
  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) return videos;
    
    const term = searchTerm.toLowerCase().trim();
    return videos.filter(video => 
      (video.titulo && video.titulo.toLowerCase().includes(term)) ||
      (video.descricao && video.descricao.toLowerCase().includes(term))
    );
  }, [searchTerm, videos]);

  // Calcula e extrai apenas os vídeos da página atual
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage) || 1;
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Volta para a página 1 ao digitar
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.searchContainer}>
        <form onSubmit={handleSearch} className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Pesquisar por título ou descrição..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} className={styles.clearButton} aria-label="Limpar busca">
              ✕
            </button>
          )}
        </form>
        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#6b7280' }}>
          {searchTerm ? (
            <span>{filteredVideos.length} resultado{filteredVideos.length !== 1 ? 's' : ''}</span>
          ) : (
            <span>{videos.length} vídeos disponíveis</span>
          )}
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
            <button onClick={() => loadVideos()} className={styles.retryButton}>
              Tentar novamente
            </button>
          </div>
        ) : paginatedVideos.length > 0 ? (
          paginatedVideos.map((video) => (
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