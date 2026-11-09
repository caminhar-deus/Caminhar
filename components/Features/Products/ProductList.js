import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import ProductCard from './ProductCard';
import styles from './styles/ProductList.module.css';
import { ErrorMessage, LoadingMessage, EmptyMessage } from '../../UI/StateMessages';
import { Spinner, Pagination } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';

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
  const [category, setCategory] = useState('');
  const [modality, setModality] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [pageLoading, setPageLoading] = useState(false);
  const listRef = useRef(null);
  const itemsPerPage = 12;

  // Unifica filtros em um único objeto com um único debounce
  // para evitar requisições desnecessárias ao backend
  const filters = useMemo(
    () => ({ search: searchTerm, minPrice, maxPrice, category, modality }),
    [searchTerm, minPrice, maxPrice, category, modality]
  );
  const debouncedFilters = useDebounce(filters, 500);

  // Reseta para página 1 quando os filtros debounced mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  // Verifica se há filtros ativos
  const hasActiveFilters = Boolean(
    debouncedFilters.search
    || debouncedFilters.minPrice
    || debouncedFilters.maxPrice
    || debouncedFilters.category
    || debouncedFilters.modality
  );

  // Conta quantos filtros estão ativos
  const activeFilterCount = [
    debouncedFilters.search,
    debouncedFilters.minPrice,
    debouncedFilters.maxPrice,
    debouncedFilters.category,
    debouncedFilters.modality,
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
    setModality('');
  };

  let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}&public=true&sort=${sortBy}&search=${encodeURIComponent(debouncedFilters.search)}`;
  if (debouncedFilters.minPrice) url += `&minPrice=${debouncedFilters.minPrice}`;
  if (debouncedFilters.maxPrice) url += `&maxPrice=${debouncedFilters.maxPrice}`;
  if (debouncedFilters.category) url += `&category=${encodeURIComponent(debouncedFilters.category)}`;
  if (debouncedFilters.modality) url += `&modality=${encodeURIComponent(debouncedFilters.modality)}`;

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
        categories: result.categories || [],
      };
    },
  });

  const products = responseData?.products || [];
  const totalPages = responseData?.totalPages || 1;
  const totalItems = responseData?.total || 0;
  const categories = responseData?.categories || [];

  // Controla loading específico de paginação (troca de página)
  useEffect(() => {
    if (!loading && pageLoading) {
      // Pequeno delay para garantir transição suave
      const timer = setTimeout(() => setPageLoading(false), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
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
    <div className={styles.productListContainer}>
      {/* Filtros de Busca, Preço, Categoria e Ordenação */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <AppIcon name="search" size={18} />
          </span>
          <input
            type="text"
            placeholder="Buscar produtos por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${styles.searchInput} ${(searchTerm || hasActiveFilters) ? styles.searchInputWithControls : ''}`}
            aria-label="Buscar produtos por nome"
          />
          {(searchTerm || hasActiveFilters) && (
            <div className={styles.searchRightControls}>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={styles.clearButton}
                  aria-label="Limpar pesquisa"
                >
                  <AppIcon name="close" size={15} />
                </button>
              )}
              {hasActiveFilters && (
                <span className={styles.activeFilterBadge}>
                  {activeFilterCount}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={styles.priceGroup}>
          <input
            type="number"
            placeholder="Mín (R$)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={styles.priceInput}
            min="0"
            step="0.01"
            aria-label="Preço mínimo"
          />
          <input
            type="number"
            placeholder="Máx (R$)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={styles.priceInput}
            min="0"
            step="0.01"
            aria-label="Preço máximo"
          />
        </div>

        {/* Seletor de modalidade (Venda direta vs Lojas parceiras) */}
        <div className={styles.sortWrapper}>
          <label htmlFor="modality-filter-products" className={styles.sortLabel}>Modalidade:</label>
          <select
            id="modality-filter-products"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className={`${styles.sortSelect} ${pageLoading ? styles.sortSelectDisabled : ''}`}
            aria-label="Filtrar por modalidade"
            disabled={pageLoading}
          >
            <option value="">Todos</option>
            <option value="internal">Venda direta</option>
            <option value="external">Lojas parceiras</option>
          </select>
        </div>

        {/* Seletor de categoria (facet da API) — antes da ordenação */}
        {categories.length > 0 && (
          <div className={styles.sortWrapper}>
            <label htmlFor="category-filter-products" className={styles.sortLabel}>Categoria:</label>
            <select
              id="category-filter-products"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${styles.sortSelect} ${pageLoading ? styles.sortSelectDisabled : ''}`}
              disabled={pageLoading}
            >
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

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
            type="button"
            onClick={limparFiltros}
            className={styles.filterButton}
            aria-label="Limpar todos os filtros"
          >
            <AppIcon name="close" size={14} />
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
      <div ref={listRef} className={styles.listViewport}>
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
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Loading overlay para troca de página */}
            {pageLoading && (
              <div className={styles.pageLoadingOverlay}>
                <Spinner size="md" />
              </div>
            )}

            {/* Paginação unificada no padrão das demais abas */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemLabel="produto"
              disabled={pageLoading}
              onPageChange={handlePageChange}
            />
          </>
        )}

        {/* Aviso de divulgação de afiliados (decisão D2 do dono, 28/10/2026) */}
        <p className={styles.affiliateDisclaimer}>
          Alguns links são de afiliados: podemos receber uma comissão pelas compras realizadas, sem custo adicional para você.
        </p>
      </div>
    </div>
  );
}
