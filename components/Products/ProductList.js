import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [debouncedMin, setDebouncedMin] = useState('');
  const [debouncedMax, setDebouncedMax] = useState('');
  const itemsPerPage = 12; // Define quantos produtos aparecerão por página

  // Efeito de Debounce: Aguarda 500ms após o usuário parar de digitar para chamar a API
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setDebouncedMin(minPrice);
      setDebouncedMax(maxPrice);
      setCurrentPage(1); // Reseta para a página 1 ao fazer uma nova busca
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, minPrice, maxPrice]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}&public=true&search=${encodeURIComponent(debouncedSearch)}`;
        if (debouncedMin) url += `&minPrice=${debouncedMin}`;
        if (debouncedMax) url += `&maxPrice=${debouncedMax}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const result = await response.json();
        
        // Garante a ordenação no Front-end do mais novo para o mais antigo (maior ID)
        const sortedProducts = (result.data || []).sort((a, b) => {
          const posA = a.position ?? 9999;
          const posB = b.position ?? 9999;
          if (posA === posB) return b.id - a.id;
          return posA - posB;
        });
        setProducts(sortedProducts);
        setTotalPages(result.pagination?.totalPages || 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, debouncedSearch, debouncedMin, debouncedMax]);

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
            style={{
              width: '100%', padding: '14px 16px 14px 46px',
              borderRadius: '8px', border: '1px solid #e2e8f0',
              fontSize: '1rem', outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease', backgroundColor: '#fff',
              color: '#2d3748'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
          <input 
            type="number" 
            placeholder="Mín (R$)" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px',
              borderRadius: '8px', border: '1px solid #e2e8f0',
              fontSize: '1rem', outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease', backgroundColor: '#fff',
              color: '#2d3748'
            }}
          />
          <input 
            type="number" 
            placeholder="Máx (R$)" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px',
              borderRadius: '8px', border: '1px solid #e2e8f0',
              fontSize: '1rem', outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease', backgroundColor: '#fff',
              color: '#2d3748'
            }}
          />
        </div>
      </div>

      {/* Container com altura mínima para evitar Layout Shift ao carregar ou trocar de página */}
      <div style={{ minHeight: '600px' }}>
        {/* Tratamento de Estados (Erro, Loading, Vazio) */}
        {error && <div style={{ textAlign: 'center', color: 'red', padding: '40px' }}>❌ {error}</div>}
        {loading && !error && <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Buscando produtos...</div>}
        {!loading && !error && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            {debouncedSearch || debouncedMin || debouncedMax ? 'Nenhum produto encontrado com estes filtros.' : 'Nenhum produto cadastrado no momento.'}
          </div>
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
  
            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '30px', paddingBottom: '20px' }}>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Estilos auxiliares para os botões de paginação
const paginationButtonStyle = (disabled) => ({
  padding: '8px 20px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: disabled ? '#f7fafc' : '#fff',
  color: disabled ? '#a0aec0' : '#2d3748',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: '600',
  transition: 'all 0.2s ease',
  boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
});