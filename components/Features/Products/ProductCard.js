import React, { memo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { parseImages } from '../../../lib/api/utils';
import { BaseCard } from '@/components/UI';
import styles from './styles/ProductCard.module.css';

const ProductCard = memo(function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxRef = useRef(null);
  
  const images = parseImages(product.image_url);

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

  // Oculta elementos de fundo do leitor de tela quando lightbox está aberto
  useEffect(() => {
    const main = document.getElementById('__next');
    if (isLightboxOpen) {
      main?.setAttribute('aria-hidden', 'true');
    } else {
      main?.removeAttribute('aria-hidden');
    }
    return () => main?.removeAttribute('aria-hidden');
  }, [isLightboxOpen]);

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
            alt={product.name}
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
          <button onClick={prevImage} className={styles.navButtonLeft} aria-label="Imagem anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button onClick={nextImage} className={styles.navButtonRight} aria-label="Próxima imagem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
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
        <h3 itemProp="name" className={styles.productName}>{product.name}</h3>
        <p itemProp="description" className={styles.productDescription} title={product.description}>{product.description}</p>
        <strong itemProp="offers" itemScope itemType="https://schema.org/Offer" className={styles.productPrice}>
          <span itemProp="price">{product.price}</span>
        </strong>
        
        <div className={styles.linksContainer}>
          {product.link && (
            <a href={product.link} target="_blank" rel="noreferrer" className={styles.linkMercadoLivre}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-1.27 1.27"/><path d="m3 3 2 2-2 2 1.5 1.5L3 8l2.5 2.5a1 1 0 0 0 3-3l-2.5-2.5L8 3l-2 2Z"/>
              </svg>
              Comprar
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
          tabIndex={-1}
          onKeyDown={(e) => e.key === 'Escape' && setIsLightboxOpen(false)}
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
            src={images[currentImageIndex]} alt={`${product.name} - Imagem ${currentImageIndex + 1}`}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()} 
          />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className={`${styles.navButtonLeft} ${styles.lightboxNavButton}`} aria-label="Imagem anterior">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className={`${styles.navButtonRight} ${styles.lightboxNavButton}`} aria-label="Próxima imagem">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
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
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    price: PropTypes.string,
    image_url: PropTypes.string,
    link: PropTypes.string,
    position: PropTypes.number,
  }).isRequired,
};

export default ProductCard;
