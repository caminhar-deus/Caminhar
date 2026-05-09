import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { parseImages } from '../../lib/seo/helpers';
import { buttonBaseStyle } from './styles';
import BaseCard from '../UI/BaseCard';

// Estilos globais injetados para :focus-visible e :hover
const globalProductStyles = `
  .product-nav-btn:focus-visible,
  .product-close-btn:focus-visible,
  .product-link-btn:focus-visible {
    box-shadow: 0 0 0 3px #2c3e50 !important;
    outline: 2px solid #2c3e50 !important;
    outline-offset: 2px !important;
  }
  .product-nav-btn:hover {
    background-color: rgba(255, 255, 255, 0.95) !important;
    transform: translateY(-50%) scale(1.1) !important;
  }
  .product-link-btn:hover {
    opacity: 0.85 !important;
    transform: translateY(-1px) !important;
  }
  .product-close-btn:hover {
    opacity: 0.7 !important;
  }
`;

const ProductCard = memo(function ProductCard({ product }) {
  // Injetar estilos globais para focus-visible
  useEffect(() => {
    const styleId = 'product-card-focus-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = globalProductStyles;
      document.head.appendChild(style);
    }
  }, []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxRef = useRef(null);
  
  const images = parseImages(product.images);

  // Foco no lightbox ao abrir e tecla ESC para fechar
  useEffect(() => {
    if (isLightboxOpen) {
      const timer = setTimeout(() => {
        if (lightboxRef.current) {
          const firstBtn = lightboxRef.current.querySelector('button');
          if (firstBtn) firstBtn.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLightboxOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsLightboxOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isLightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLightboxOpen, handleKeyDown]);

  const nextImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const cardMedia = (
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
            itemProp="image"
            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
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
          <button onClick={prevImage} className="product-nav-btn" style={navButtonStyle('left')} aria-label="Imagem anterior">◀</button>
          <button onClick={nextImage} className="product-nav-btn" style={navButtonStyle('right')} aria-label="Próxima imagem">▶</button>
          <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', color: '#555', fontSize: '12px' }}>
            {currentImageIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <BaseCard hoverable itemScope itemType="https://schema.org/Product" media={cardMedia}>
        <h3 itemProp="name" style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>{product.title}</h3>
        <p itemProp="description" style={{ 
          margin: '0 0 16px 0', 
          color: '#666', 
          fontSize: '0.9rem', 
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }} title={product.description}>{product.description}</p>
        <strong itemProp="offers" itemScope itemType="https://schema.org/Offer" style={{ fontSize: '1.3rem', color: '#2c3e50', marginBottom: '16px' }}>
          <span itemProp="price">{product.price}</span>
        </strong>
        
        {/* Links de Compra */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {product.link_ml && (
            <a href={product.link_ml} target="_blank" rel="noreferrer" className="product-link-btn" style={linkStyle('#ffe600', '#333')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-1.27 1.27"/><path d="m3 3 2 2-2 2 1.5 1.5L3 8l2.5 2.5a1 1 0 0 0 3-3l-2.5-2.5L8 3l-2 2Z"/>
              </svg>
              Mercado Livre
            </a>
          )}
          {product.link_shopee && (
            <a href={product.link_shopee} target="_blank" rel="noreferrer" className="product-link-btn" style={linkStyle('#ee4d2d', '#fff')}>
              {/* Ícone oficial Shopee */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 8L8 14v24a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V14l-4-6H12Z" fill="#fff" stroke="#fff" strokeWidth="1.5" />
                <path d="M16 8V4a2 2 0 0 1 2-2h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M26 2h4a2 2 0 0 1 2 2v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 20c0-2 1.5-3 3-3s3 1 3 2.5-1.5 3.5-3 4.5-3 2-3 4 1.5 3 3 3 3-1 3-3" stroke="#ee4d2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Shopee
            </a>
          )}
          {product.link_amazon && (
            <a href={product.link_amazon} target="_blank" rel="noreferrer" className="product-link-btn" style={linkStyle('#ff9900', '#fff')}>
              {/* Ícone oficial Amazon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4Z" fill="#fff" />
                <path d="M10 28c3 4 8 7 14 7s11-3 14-7" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <text x="24" y="22" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif" fill="#ff9900" letterSpacing="0.5">amazon</text>
              </svg>
              Amazon
            </a>
          )}
        </div>
      </BaseCard>

      {/* Lightbox / Tela Cheia */}
      {isLightboxOpen && images.length > 0 && (
        <div 
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da imagem"
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
            className="product-close-btn"
            style={lightboxCloseButtonStyle}
            title="Fechar"
            aria-label="Fechar visualização ampliada"
          >
            &times;
          </button>
          <img 
            key={currentImageIndex}
            src={images[currentImageIndex]} alt={`${product.title} - Imagem ${currentImageIndex + 1}`}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()} 
          />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="product-nav-btn" style={{ ...navButtonStyle('left'), width: '50px', height: '50px', fontSize: '24px' }} aria-label="Imagem anterior">◀</button>
              <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="product-nav-btn" style={{ ...navButtonStyle('right'), width: '50px', height: '50px', fontSize: '24px' }} aria-label="Próxima imagem">▶</button>
            </>
          )}
        </div>
      )}
    </>
  );
});

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    price: PropTypes.string,
    images: PropTypes.string,
    link_ml: PropTypes.string,
    link_shopee: PropTypes.string,
    link_amazon: PropTypes.string,
    position: PropTypes.number,
  }).isRequired,
};

export default ProductCard;

// Estilos auxiliares para manter o componente autocontido
const navButtonStyle = (side) => ({
  position: 'absolute',
  top: '50%',
  [side]: '10px',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
  outline: 'none',
  boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
  transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
});
const lightboxCloseButtonStyle = {
  position: 'absolute', top: '20px', right: '30px',
  background: 'transparent', border: 'none', color: '#fff',
  fontSize: '40px', cursor: 'pointer', zIndex: 10000,
  outline: 'none', padding: '8px',
  transition: 'opacity 0.2s ease',
};
const linkStyle = (bg, color) => buttonBaseStyle({
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
  border: 'none',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
});