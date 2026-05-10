import React, { useState, useEffect } from 'react';
import { useApiFetch, useDebounce } from '@/hooks';
import ProductCard from './ProductCard';
import { inputStyle, buttonBaseStyle } from './styles';
import { ErrorMessage, LoadingMessage, EmptyMessage } from '../../UI/StateMessages';

export default function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const itemsPerPage = 12;

  const debouncedSearch = useDebounce(searchTerm, 500);
  const debouncedMin = useDebounce(minPrice, 500);
  const debouncedMax = useDebounce(maxPrice, 500);

  // Reseta para página 1 quando os filtros debounced mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, debouncedMin, debouncedMax]);

  let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}&public=true&search=${encodeURIComponent(debouncedSearch)}`;
  if (debouncedMin) url += `&minPrice=${debouncedMin}`;
  if (debouncedMax) url += `&maxPrice=${debouncedMax}`;

  const { data: responseData, loading, error } = useApiFetch(url, {
    deps: [currentPage, debouncedSearch, debouncedMin, debouncedMax],
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

  return (
    <div>
      {/* Filtros de Busca e Preço */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', display: 'flex' }}>
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
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <input 
            type="number" 
            placeholder="Mín (R$)" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={inputStyle()}
          />
          <input 
            type="number" 
            placeholder="Máx (R$)" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={inputStyle()}
          />
        </div>
      </div>

      {/* Container com altura mínima para evitar Layout Shift */}
      <div style={{ minHeight: '600px' }}>
        {/* Tratamento de Estados */}
        {error && <ErrorMessage message={error} />}
        {loading && !error && <LoadingMessage text="Buscando produtos..." />}
        {!loading && !error && products.length === 0 && (
          <EmptyMessage message={debouncedSearch || debouncedMin || debouncedMax ? 'Nenhum produto encontrado com estes filtros.' : 'Nenhum produto cadastrado no momento.'} />
        )}
  
        {/* Listagem de Produtos */}
        {!loading && !error && products.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
              padding: '20px 0'
            }}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
  
            {/* Controles de Paginação — sempre no DOM para evitar layout shift */}
            <div style={{ 
              display: 'flex', justifyContent: 'center', gap: '16px', 
              marginTop: '30px', paddingBottom: '20px',
              visibility: totalPages > 1 ? 'visible' : 'hidden',
              pointerEvents: totalPages > 1 ? 'auto' : 'none',
              minHeight: '48px', alignItems: 'center'
            }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={paginationButtonStyle(currentPage === 1)}
              >
                Anterior
              </button>
              
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: '#555', fontWeight: '500' }}>
                Página {currentPage} de {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={paginationButtonStyle(currentPage === totalPages)}
              >
                Próxima
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
  backgroundColor: disabled ? '#f7fafc' : '#fff',
  color: disabled ? '#a0aec0' : '#2d3748',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
});
