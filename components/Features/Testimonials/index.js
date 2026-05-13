import React, { useState, useEffect, useRef } from 'react';
import { useApiFetch } from '@/hooks';

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

  // Atualiza as setas caso a janela seja redimensionada ou as dicas mudem
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [dicas]);

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
    <section className="testimonials-section">
      <div className="testimonials-header">
        <h2 className="testimonials-title">Dicas do Dia</h2>
        <p className="testimonials-subtitle">
          Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária.
        </p>
      </div>

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto' }}>
        {hasCarousel && canScrollLeft && (
          <button onClick={() => scroll('left')} className="nav-button left" aria-label="Anterior">
            ❮
          </button>
        )}

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={`dicas-container ${hasCarousel ? 'carousel' : 'grid'}`}
        >
        {dicas.map((dica) => (
          <div 
            key={dica.id} 
            className="dica-card"
          >
            <p className="dica-content">
              "{dica.content}"
            </p>
            
            <div className="dica-author">
              <div>
                <h4 className="dica-name">
                  {dica.name}
                </h4>
              </div>
            </div>
          </div>
        ))}
        </div>

        {hasCarousel && canScrollRight && (
          <button onClick={() => scroll('right')} className="nav-button right" aria-label="Próxima">
            ❯
          </button>
        )}
      </div>

      {totalPages > 1 && (
        <div className="testimonials-pagination">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`pag-btn ${currentPage <= 1 ? 'pag-disabled' : ''}`}
          >
            ← Anterior
          </button>

          <span className="pag-info">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`pag-btn ${currentPage >= totalPages ? 'pag-disabled' : ''}`}
          >
            Próximo →
          </button>
        </div>
      )}

      <style jsx>{`
        .testimonials-section {
          padding: var(--section-md) var(--spacing-4);
          background-color: var(--color-bg-secondary);
          border-radius: var(--border-radius-xl);
          margin: var(--spacing-8) 0;
        }
        .testimonials-header {
          text-align: center;
          margin-bottom: var(--spacing-12);
        }
        .testimonials-title {
          font-size: var(--font-size-4xl);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }
        .testimonials-subtitle {
          color: var(--color-text-secondary);
          font-size: var(--font-size-lg);
          max-width: 600px;
          margin: 0 auto;
        }
        .dicas-container {
          gap: var(--spacing-8);
          padding: var(--spacing-4) 0;
        }
        .dicas-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .dicas-container.carousel {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          scroll-behavior: smooth;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .dicas-container.carousel::-webkit-scrollbar {
          display: none;
        }
        .dica-card {
          background-color: var(--color-bg-primary);
          padding: var(--spacing-8);
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: var(--transition-transform), var(--transition-shadow);
        }
        .carousel .dica-card {
          flex: 0 0 auto;
          width: 320px;
        }
        .dica-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-cardHover);
        }
        .dica-content {
          color: var(--color-text-secondary);
          font-size: var(--font-size-base);
          line-height: var(--line-height-relaxed);
          margin-bottom: var(--spacing-6);
        }
        .dica-author {
          display: flex;
          align-items: center;
          gap: var(--spacing-4);
          margin-top: auto;
        }
        .dica-name {
          margin: 0;
          color: var(--color-text-primary);
          font-weight: var(--font-weight-semibold);
          font-size: var(--font-size-base);
        }
        .testimonials-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--spacing-4);
          margin-top: var(--spacing-8);
        }
        .pag-btn {
          padding: var(--spacing-2_5) var(--spacing-5);
          background-color: var(--color-bg-primary);
          color: var(--color-text-primary);
          border: var(--border-width-1) solid var(--color-border-light);
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          font-weight: var(--font-weight-medium);
          font-size: var(--font-size-sm);
          transition: var(--transition-all);
        }
        .pag-btn:hover:not(.pag-disabled) {
          background-color: var(--color-bg-secondary);
          border-color: var(--color-border-default);
        }
        .pag-disabled {
          background-color: var(--color-bg-secondary) !important;
          color: var(--color-text-tertiary) !important;
          cursor: not-allowed !important;
        }
        .pag-info {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }
        .nav-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: var(--z-docked);
          background: var(--color-bg-primary);
          border: var(--border-width-1) solid var(--color-border-light);
          border-radius: var(--border-radius-full);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--shadow-button);
          color: var(--color-text-primary);
          font-size: var(--font-size-xl);
          transition: var(--transition-background), transform 0.2s;
        }
        .nav-button:hover {
          background: var(--color-bg-secondary);
          transform: translateY(-50%) scale(1.1);
        }
        .nav-button.left { left: -20px; }
        .nav-button.right { right: -20px; }
        @media (max-width: 1240px) {
          .nav-button.left { left: 0px; }
          .nav-button.right { right: 0px; }
        }
      `}</style>
    </section>
  );
}