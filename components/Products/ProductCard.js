import React, { useState } from 'react';

export default function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Transforma o texto (URLs separadas por quebra de linha) em um array
  const images = product.images 
    ? product.images.split('\n').map(url => url.trim()).filter(Boolean) 
    : [];

  const nextImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <div style={{
      border: '1px solid #eaeaea',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Carrossel de Imagens */}
      <div style={{ position: 'relative', height: '250px', backgroundColor: '#f9f9f9' }}>
        {images.length > 0 ? (
          <>
            {imageLoading && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#eee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#aaa',
                fontSize: '0.9rem'
              }}>
                ⏳ Carregando...
              </div>
            )}
            <img 
              src={images[currentImageIndex]} 
              alt={product.title}
              onLoad={() => setImageLoading(false)}
              onClick={() => setIsLightboxOpen(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: imageLoading ? 0 : 1, transition: 'opacity 0.3s ease', cursor: 'pointer' }} 
            />
          </>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sem imagem</div>
        )}
        
        {images.length > 1 && (
          <>
            <button onClick={prevImage} style={navButtonStyle('left')}>◀</button>
            <button onClick={nextImage} style={navButtonStyle('right')}>▶</button>
            <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', color: '#555', fontSize: '12px' }}>
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Informações do Produto */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>{product.title}</h3>
        <p style={{ 
          margin: '0 0 16px 0', 
          color: '#666', 
          fontSize: '0.9rem', 
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }} title={product.description}>{product.description}</p>
        <strong style={{ fontSize: '1.3rem', color: '#2c3e50', marginBottom: '16px' }}>{product.price}</strong>
        
        {/* Links de Compra */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {product.link_ml && (
            <a href={product.link_ml} target="_blank" rel="noreferrer" style={linkStyle('#ffe600', '#333')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-1.27 1.27"/><path d="m3 3 2 2-2 2 1.5 1.5L3 8l2.5 2.5a1 1 0 0 0 3-3l-2.5-2.5L8 3l-2 2Z"/>
              </svg>
              Mercado Livre
            </a>
          )}
          {product.link_shopee && (
            <a href={product.link_shopee} target="_blank" rel="noreferrer" style={linkStyle('#ee4d2d', '#fff')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Shopee
            </a>
          )}
          {product.link_amazon && (
            <a href={product.link_amazon} target="_blank" rel="noreferrer" style={linkStyle('#ff9900', '#fff')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
              </svg>
              Amazon
            </a>
          )}
        </div>
      </div>
    </div>

    {/* Lightbox / Tela Cheia */}
    {isLightboxOpen && images.length > 0 && (
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}
        onClick={() => setIsLightboxOpen(false)}
      >
        <button 
          onClick={() => setIsLightboxOpen(false)}
          style={{ position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: '#fff', fontSize: '40px', cursor: 'pointer', zIndex: 10000 }}
          title="Fechar"
        >
          &times;
        </button>
        <img 
          src={images[currentImageIndex]} alt={product.title}
          style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
          onClick={(e) => e.stopPropagation()} 
        />
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} style={{ ...navButtonStyle('left'), width: '50px', height: '50px', fontSize: '24px' }}>◀</button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} style={{ ...navButtonStyle('right'), width: '50px', height: '50px', fontSize: '24px' }}>▶</button>
          </>
        )}
      </div>
    )}
    </>
  );
}

// Estilos auxiliares para manter o componente autocontido
const navButtonStyle = (side) => ({
  position: 'absolute',
  top: '50%',
  [side]: '10px',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer'
});
const linkStyle = (bg, color) => ({ 
  flex: 1, 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: '6px', 
  minWidth: '100px', 
  backgroundColor: bg, 
  color, 
  padding: '8px', 
  borderRadius: '4px', 
  textDecoration: 'none', 
  fontWeight: 'bold', 
  fontSize: '0.85rem' 
});