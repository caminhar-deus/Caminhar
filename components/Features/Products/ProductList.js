import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import ProductCard from './ProductCard';
import { inputStyle } from './styles';
import styles from './styles/ProductList.module.css';
import { ErrorMessage, LoadingMessage, EmptyMessage } from '../../UI/StateMessages';
import { Spinner } from '@/components/UI';

// Spec design-system/pages/home.md §1.3 — ordem exata das opções do seletor.
const SORT_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'positioned', label: 'Posicionados' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
];

export default function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('default');
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

  let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}&public=true&sort=${sortBy}&search=${encodeURIComponent(debouncedFilters.search)}`;
  if (debouncedFilters.minPrice) url += `&minPrice=${debouncedFilters.minPrice}`;
  if (debouncedFilters.maxPrice) url += `&maxPrice=${debouncedFilters.maxPrice}`;

  const { data: responseData, loading, error } = useApiFetch(url, {
    deps: [currentPage, debouncedFilters, sortBy],
    staleTime: 5000,
    transform: (result) => {
      // A ordenação é do servidor (sort no endpoint público) — nada de
      // re-ordenar no cliente (PLANO_ACAO F1.2).
      return {
        products: result.data || [],
        totalPages: result.pagination?.totalPages || 1,
        total: result.pagination?.total || 0,
      };
    },
  });

  const products = responseData?.products || [];
  const totalPages = responseData?.totalPages || 1;
  const totalItems = responseData?.total || 0;

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

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    // Trocar a ordenação sempre volta para a primeira página
    setCurrentPage(1);
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

        {/* Seletor de ordenação (spec home.md §1) — após preço, antes de "Limpar filtros" */}
        <div className={styles.sortWrapper}>
          <label htmlFor="sort-select-products" className={styles.sortLabel}>Ordenar por:</label>
          <select
            id="sort-select-products"
            value={sortBy}
            onChange={handleSortChange}
            className={`${styles.sortSelect} ${pageLoading ? styles.sortSelectDisabled : ''}`}
            aria-label="Ordenar produtos"
            disabled={pageLoading}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botão limpar filtros — visível apenas quando há filtros ativos */}
        {hasActiveFilters && (
          <button
            onClick={limparFiltros}
            className={styles.filterButton}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--border-radius-md)',
              border: 'var(--border-width-1) solid var(--color-border-light)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'var(--transition-all)',
              outline: 'none',
              whiteSpace: 'nowrap',
            }}
            aria-label="Limpar todos os filtros"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Contador de resultados (spec home.md §1.5) — mesmo padrão das outras abas */}
      {!loading && !error && products.length > 0 && (
        <div className={styles.searchInfo}>
          <span className={styles.resultCount}>
            {debouncedFilters.search
              ? `${totalItems} resultado${totalItems !== 1 ? 's' : ''} para "${debouncedFilters.search}"`
              : `Mostrando ${products.length} de ${totalItems} produto${totalItems !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}

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
            <div
              className={`${styles.productsGrid}${pageLoading ? ` ${styles.productsGridLoading}` : ''}`}
            >
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
  
            {/* Paginação no padrão das demais abas (spec home.md §4) —
                oculta quando há ≤ 1 página */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || pageLoading}
                  className={`${styles.pageButton} ${currentPage === 1 || pageLoading ? styles.pageButtonDisabled : ''}`}
                  aria-label="Página anterior"
                  type="button"
                >
                  ❮ Anterior
                </button>
                <span className={styles.pageInfo} aria-live="polite" aria-atomic="true">
                  Página {currentPage} de {totalPages}
                  {totalItems > 0 && <span className={styles.totalInfo}> ({totalItems} produto{totalItems !== 1 ? 's' : ''})</span>}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || pageLoading}
                  className={`${styles.pageButton} ${currentPage === totalPages || pageLoading ? styles.pageButtonDisabled : ''}`}
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
    </div>
  );
}