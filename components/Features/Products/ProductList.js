import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import ProductCard from './ProductCard';
import { inputStyle, buttonBaseStyle } from './styles';
import { ErrorMessage, LoadingMessage, EmptyMessage } from '../../UI/StateMessages';
import { Spinner } from '@/components/UI';

export default function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  const listRef = useRef(null);
  const itemsPerPage = 12;

  // Unifica filtros em um único objeto com um único debounce
  // para evitar requisições desnecessárias ao backend
  const filters = useMemo(() => ({ search: searchTerm, minPrice, maxPrice }), [searchTerm, minPrice, maxPrice]);
  const debouncedFilters = useDebounce(filters, 500);

  // Reseta para página 1 quando os filtros debounced mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  // Verifica se há filtros ativos
  const hasActiveFilters = debouncedFilters.search || debouncedFilters.minPrice || debouncedFilters.maxPrice;

  // Conta quantos filtros estão ativos
  const activeFilterCount = [debouncedFilters.search, debouncedFilters.minPrice, debouncedFilters.maxPrice]
    .filter(Boolean).length;

  const limparFiltros = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
  };

  let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}&public=true&search=${encodeURIComponent(debouncedFilters.search)}`;
  if (debouncedFilters.minPrice) url += `&minPrice=${debouncedFilters.minPrice}`;
  if (debouncedFilters.maxPrice) url += `&maxPrice=${debouncedFilters.maxPrice}`;

  const { data: responseData, loading, error } = useApiFetch(url, {
    deps: [currentPage, debouncedFilters],
    staleTime: 5000,
    transform: (result) => {
      // Garante a ordenação do mais novo para o mais antigo (maior ID)
      const products = (result.data || []).sort((a, b) => {
        const posA = a.position ?? 9999;
        const posB = b.position ?? 9999;
        if (posA === posB) return b.id - a.id;
        return posA - posB;
      });
      return { products, totalPages: result.pagination?.totalPages || 1 };
    },
  });

  const products = responseData?.products || [];
  const totalPages = responseData?.totalPages || 1;

  // Controla loading específico de paginação (troca de página)
  useEffect(() => {
    if (!loading && pageLoading) {
      // Pequeno delay para garantir transição suave
      const timer = setTimeout(() => setPageLoading(false), 150);
      return () => clearTimeout(timer);
    }
  }, [loading, pageLoading]);

  // Rola suavemente para o topo da lista ao trocar de página
  useEffect(() => {
    if (!loading && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, loading]);

  const handlePageChange = (newPage) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;
    setPageLoading(true);
    setCurrentPage(newPage);
  };

  return (
    <div>
      {/* Filtros de Busca e Preço */}
      <div style={{ marginBottom: 'var(--spacing-8)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: 'var(--spacing-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', display: 'flex', pointerEvents: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </span>
          <input 
            type="text" 
            placeholder="Buscar produtos por nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle('46px')}
            aria-label="Buscar produtos por nome"
          />
          {/* Indicador de filtro ativo */}
          {hasActiveFilters && (
            <span style={{
              position: 'absolute',
              right: 'var(--spacing-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'var(--color-primary-500)',
              color: '#fff',
              borderRadius: 'var(--border-radius-full)',
              width: '20px',
              height: '20px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              {activeFilterCount}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <input 
            type="number" 
            placeholder="Mín (R$)" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={inputStyle()}
            min="0"
            step="0.01"
            aria-label="Preço mínimo"
          />
          <input 
            type="number" 
            placeholder="Máx (R$)" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={inputStyle()}
            min="0"
            step="0.01"
            aria-label="Preço máximo"
          />
        </div>

        {/* Botão limpar filtros — visível apenas quando há filtros ativos */}
        {hasActiveFilters && (
          <button
            onClick={limparFiltros}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--border-radius-md)',
              border: 'var(--border-width-1) solid var(--color-border-light)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'var(--transition-all)',
              outline: 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--color-focus-ring)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            aria-label="Limpar todos os filtros"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Container com altura mínima para evitar Layout Shift */}
      <div ref={listRef} style={{ minHeight: '600px' }}>
        {/* Tratamento de Estados */}
        {error && <ErrorMessage message={error} />}
        {loading && !error && !pageLoading && <LoadingMessage text="Buscando produtos..." />}
        {!loading && !error && products.length === 0 && (
          <EmptyMessage message={hasActiveFilters ? 'Nenhum produto encontrado com estes filtros.' : 'Nenhum produto cadastrado no momento.'} />
        )}
  
        {/* Listagem de Produtos */}
        {!error && products.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'clamp(16px, 3vw, 24px)',
              padding: '20px clamp(8px, 2vw, 20px)',
              opacity: pageLoading ? 0.4 : 1,
              transition: 'opacity 0.2s ease',
              pointerEvents: pageLoading ? 'none' : 'auto',
            }}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Loading overlay para troca de página */}
            {pageLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-120px', position: 'relative', zIndex: 1 }}>
                <Spinner size="md" />
              </div>
            )}
  
            {/* Controles de Paginação — sempre no DOM para evitar layout shift */}
            <div style={{ 
              display: 'flex', justifyContent: 'center', gap: 'clamp(8px, 2vw, 16px)', 
              marginTop: '30px', paddingBottom: '20px',
              visibility: totalPages > 1 ? 'visible' : 'hidden',
              pointerEvents: totalPages > 1 ? 'auto' : 'none',
              minHeight: '48px', alignItems: 'center', flexWrap: 'wrap',
            }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || pageLoading}
                style={paginationButtonStyle(currentPage === 1 || pageLoading)}
                aria-label="Página anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Anterior
              </button>
              
              {/* Botões de página numerados (para até 5 páginas visíveis) */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={pageNum === currentPage || pageLoading}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--border-radius-md)',
                        border: pageNum === currentPage
                          ? '2px solid var(--color-primary-500)'
                          : 'var(--border-width-1) solid var(--color-border-light)',
                        backgroundColor: pageNum === currentPage
                          ? 'var(--color-primary-50)'
                          : 'var(--color-bg-primary)',
                        color: pageNum === currentPage
                          ? 'var(--color-primary-700)'
                          : 'var(--color-text-secondary)',
                        fontWeight: pageNum === currentPage ? '700' : '500',
                        fontSize: '0.9rem',
                        cursor: pageLoading ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition-all)',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { if (pageNum !== currentPage && !pageLoading) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                      onMouseLeave={(e) => { if (pageNum !== currentPage) e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--color-focus-ring)'; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      aria-label={`Ir para página ${pageNum}`}
                      aria-current={pageNum === currentPage ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || pageLoading}
                style={paginationButtonStyle(currentPage === totalPages || pageLoading)}
                aria-label="Próxima página"
              >
                Próxima
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Estilos auxiliares para os botões de paginação
const paginationButtonStyle = (disabled) => buttonBaseStyle({
  backgroundColor: disabled ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
  color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : 'var(--shadow-sm)',
  display: 'flex',
  alignItems: 'center',
  minHeight: '40px',
  minWidth: '44px',
  justifyContent: 'center',
});