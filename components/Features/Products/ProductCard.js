import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { parseImages } from '../../../lib/api/utils';
import BaseCard from '../../UI/BaseCard';
import styles from './styles/ProductCard.module.css';

const ProductCard = memo(function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxRef = useRef(null);
  
  const images = parseImages(product.images);

  // Foco no lightbox ao abrir
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
    <div className={styles.cardMedia}>
      {images.length > 0 ? (
        <>
          {imageLoading && (
            <div className={styles.imageLoading}>
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
            className={styles.productImage}
            style={{ opacity: imageLoading ? 0 : 1 }}
          />
        </>
      ) : (
        <div className={styles.noImage}>Sem imagem</div>
      )}
      
      {images.length > 1 && (
        <>
          <button onClick={prevImage} className={styles.navButtonLeft} aria-label="Imagem anterior">◀</button>
          <button onClick={nextImage} className={styles.navButtonRight} aria-label="Próxima imagem">▶</button>
          <div className={styles.imageCounter}>
            {currentImageIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <BaseCard hoverable itemScope itemType="https://schema.org/Product" media={cardMedia}>
        <h3 itemProp="name" className={styles.productName}>{product.title}</h3>
        <p itemProp="description" className={styles.productDescription} title={product.description}>{product.description}</p>
        <strong itemProp="offers" itemScope itemType="https://schema.org/Offer" className={styles.productPrice}>
          <span itemProp="price">{product.price}</span>
        </strong>
        
        <div className={styles.linksContainer}>
          {product.link_ml && (
            <a href={product.link_ml} target="_blank" rel="noreferrer" className={styles.linkMercadoLivre}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-1.27 1.27"/><path d="m3 3 2 2-2 2 1.5 1.5L3 8l2.5 2.5a1 1 0 0 0 3-3l-2.5-2.5L8 3l-2 2Z"/>
              </svg>
              Mercado Livre
            </a>
          )}
          {product.link_shopee && (
            <a href={product.link_shopee} target="_blank" rel="noreferrer" className={styles.linkShopee}>
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8L8 14v24a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V14l-4-6H12Z" fill="#fff" stroke="#fff" strokeWidth="1.5" />
                <path d="M16 8V4a2 2 0 0 1 2-2h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M26 2h4a2 2 0 0 1 2 2v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 20c0-2 1.5-3 3-3s3 1 3 2.5-1.5 3.5-3 4.5-3 2-3 4 1.5 3 3 3 3-1 3-3" stroke="#ee4d2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Shopee
            </a>
          )}
          {product.link_amazon && (
            <a href={product.link_amazon} target="_blank" rel="noreferrer" className={styles.linkAmazon}>
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4Z" fill="#fff" />
                <path d="M10 28c3 4 8 7 14 7s11-3 14-7" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <text x="24" y="22" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif" fill="#ff9900" letterSpacing="0.5">amazon</text>
              </svg>
              Amazon
            </a>
          )}
        </div>
      </BaseCard>

      {isLightboxOpen && images.length > 0 && (
        <div 
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da imagem"
          className={styles.lightbox}
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className={styles.lightboxCloseButton}
            title="Fechar"
            aria-label="Fechar visualização ampliada"
          >
            &times;
          </button>
          <img 
            key={currentImageIndex}
            src={images[currentImageIndex]} alt={`${product.title} - Imagem ${currentImageIndex + 1}`}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()} 
          />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className={`${styles.navButtonLeft} ${styles.lightboxNavButton}`} aria-label="Imagem anterior">◀</button>
              <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className={`${styles.navButtonRight} ${styles.lightboxNavButton}`} aria-label="Próxima imagem">▶</button>
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
