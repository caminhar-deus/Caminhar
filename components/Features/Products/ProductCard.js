import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { parseImages } from '../../../lib/api/utils';
import { BaseCard, ImageLightbox } from '@/components/UI';
import styles from './styles/ProductCard.module.css';

function getStoreClass(link) {
  if (!link) return styles.linkMercadoLivre;
  const lower = link.toLowerCase();
  if (lower.includes('amazon.')) return styles.linkAmazon;
  if (lower.includes('shopee.')) return styles.linkShopee;
  return styles.linkMercadoLivre;
}

const ProductCard = memo(function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const images = parseImages(product.image_url);

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
              Carregando...
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
          {/* A API já manda `formatted_price` (Intl pt-BR); o fallback cobre
              chamadas diretas do componente com o valor cru. */}
          <span itemProp="price">{product.formatted_price || product.price}</span>
        </strong>
        
        <div className={styles.linksContainer}>
          {product.link && (
            <a 
              href={product.link} 
              target="_blank" 
              rel="noreferrer" 
              className={getStoreClass(product.link)}
              aria-label={`Comprar ${product.name} (abre em nova aba)`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-1.27 1.27"/><path d="m3 3 2 2-2 2 1.5 1.5L3 8l2.5 2.5a1 1 0 0 0 3-3l-2.5-2.5L8 3l-2 2Z"/>
              </svg>
              Comprar
            </a>
          )}
        </div>
      </BaseCard>

      <ImageLightbox
        isOpen={isLightboxOpen && images.length > 0}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        currentIndex={currentImageIndex}
        onIndexChange={setCurrentImageIndex}
        alt={product.name}
      />
    </>
  );
});

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    formatted_price: PropTypes.string,
    image_url: PropTypes.string,
    link: PropTypes.string,
    position: PropTypes.number,
  }).isRequired,
};

export default ProductCard;
