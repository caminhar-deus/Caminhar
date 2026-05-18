import React, { useState, useEffect, useRef } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import styles from './Testimonials.module.css';

const fallbackData = [
  {
    id: 1,
    name: 'Palavra do dia',
    content: 'Os artigos e reflexões mudaram a minha forma de ver as dificuldades do dia a dia. Encontrei muita paz e direcionamento nas mensagens.'
  },
  {
    id: 2,
    name: 'Oração do Dia',
    content: 'A curadoria de músicas e os vídeos recomendados têm sido fundamentais nos meus momentos de devocional e oração. Trabalho incrível!'
  },
  {
    id: 3,
    name: 'Anjos do Dia',
    content: 'Uso frequentemente os materiais do projeto para embasar os estudos com os jovens. É um conteúdo profundo e muito acessível.'
  }
];

export default function Testimonials() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;

  const { data: apiDicas, loading } = useApiFetch(`/api/dicas?page=${currentPage}&limit=${itemsPerPage}`, {
    initialData: { data: [], pagination: { totalPages: 1 } },
    transform: (result) => {
      if (result && result.success && Array.isArray(result.data)) {
        return result;
      }
      return { data: [], pagination: { totalPages: 1 } };
    },
    onError: (err) => console.error('Erro ao buscar as dicas do dia:', err),
    deps: [currentPage],
    staleTime: 60000, // 1 minuto de cache para evitar chamadas repetidas
  });

  // Usa dados da API se disponíveis, senão fallback
  const hasApiData = apiDicas?.data?.length > 0;
  const dicas = hasApiData ? apiDicas.data : fallbackData;
  const pagination = apiDicas?.pagination;

  // Atualiza totalPages quando a paginação chega
  useEffect(() => {
    if (pagination?.totalPages) {
      setTotalPages(pagination.totalPages);
    }
  }, [pagination]);

  // Reseta para página 1 quando muda o total de páginas (ex: exclusão)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Verifica a posição da rolagem para mostrar/esconder as setas
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  };

  const debouncedHandleScroll = useDebounce(handleScroll, 100);

  // Atualiza as setas caso a janela seja redimensionada ou as dicas mudem
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', debouncedHandleScroll);
    return () => window.removeEventListener('resize', debouncedHandleScroll);
  }, [dicas, debouncedHandleScroll]);

  const hasCarousel = dicas.length > 3;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <section className={styles['testimonials-section']}>
      <div className={styles['testimonials-header']}>
        <h2 className={styles['testimonials-title']}>Dicas do Dia</h2>
        <p className={styles['testimonials-subtitle']}>
          Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária.
        </p>
      </div>

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto' }}>
        {hasCarousel && canScrollLeft && (
          <button onClick={() => scroll('left')} className={`${styles['nav-button']} ${styles['left']}`} aria-label="Anterior" aria-controls="testimonials-carousel">
            ❮
          </button>
        )}

        <div 
          ref={scrollRef}
          id="testimonials-carousel"
          onScroll={handleScroll}
          className={`${styles['dicas-container']} ${hasCarousel ? styles['carousel'] : styles['grid']}`}
        >
        {dicas.map((dica) => (
          <div 
            key={dica.id} 
            className={styles['dica-card']}
          >
            <p className={styles['dica-content']}>
              "{dica.content}"
            </p>
            
            <div className={styles['dica-author']}>
              <div>
                <h4 className={styles['dica-name']}>
                  {dica.name}
                </h4>
              </div>
            </div>
          </div>
        ))}
        </div>

        {hasCarousel && canScrollRight && (
          <button onClick={() => scroll('right')} className={`${styles['nav-button']} ${styles['right']}`} aria-label="Próxima" aria-controls="testimonials-carousel">
            ❯
          </button>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles['testimonials-pagination']}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`${styles['pag-btn']} ${currentPage <= 1 ? styles['pag-disabled'] : ''}`}
          >
            ← Anterior
          </button>

          <span className={styles['pag-info']}>
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`${styles['pag-btn']} ${currentPage >= totalPages ? styles['pag-disabled'] : ''}`}
          >
            Próximo →
          </button>
        </div>
      )}
    </section>
  );
}