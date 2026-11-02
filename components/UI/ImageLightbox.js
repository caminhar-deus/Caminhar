import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './ImageLightbox.module.css';

/**
 * ImageLightbox - Componente acessível e unificado para zoom de imagens.
 */
export function ImageLightbox({
  isOpen,
  onClose,
  images = [],
  image,
  currentIndex = 0,
  onIndexChange,
  alt = 'Imagem ampliada',
  overlayTestId = 'image-lightbox-overlay',
  imageTestId = 'image-lightbox-img',
}) {
  const closeButtonRef = useRef(null);
  const allImages = images.length > 0 ? images : image ? [image] : [];
  const activeImage = allImages[currentIndex] || allImages[0] || '';

  // Focus lock no botão fechar e bloqueio de scroll
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  // Fechamento via Escape e navegação via Arrow keys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.key === 'ArrowLeft' && allImages.length > 1 && onIndexChange) {
        e.preventDefault();
        onIndexChange((currentIndex - 1 + allImages.length) % allImages.length);
      } else if (e.key === 'ArrowRight' && allImages.length > 1 && onIndexChange) {
        e.preventDefault();
        onIndexChange((currentIndex + 1) % allImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allImages.length, currentIndex, onClose, onIndexChange]);

  if (!isOpen || !activeImage) return null;

  const handleClose = (e) => {
    e.stopPropagation();
    onClose?.();
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (onIndexChange && allImages.length > 1) {
      onIndexChange((currentIndex - 1 + allImages.length) % allImages.length);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (onIndexChange && allImages.length > 1) {
      onIndexChange((currentIndex + 1) % allImages.length);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualização ampliada da imagem"
      tabIndex={-1}
      className={styles.overlay}
      onClick={onClose}
      data-testid={overlayTestId}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={handleClose}
        className={styles.closeButton}
        aria-label="Fechar visualização ampliada"
        title="Fechar"
      >
        &times;
      </button>

      <div className={styles.contentWrapper}>
        <img
          key={activeImage}
          src={activeImage}
          alt={alt}
          className={styles.image}
          data-testid={imageTestId}
        />
      </div>

      {allImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className={styles.navButtonLeft}
            aria-label="Imagem anterior"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={styles.navButtonRight}
            aria-label="Próxima imagem"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div className={styles.counter} aria-hidden="true">
            {currentIndex + 1} / {allImages.length}
          </div>
        </>
      )}
    </div>
  );
}

ImageLightbox.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  images: PropTypes.arrayOf(PropTypes.string),
  image: PropTypes.string,
  currentIndex: PropTypes.number,
  onIndexChange: PropTypes.func,
  alt: PropTypes.string,
  overlayTestId: PropTypes.string,
  imageTestId: PropTypes.string,
};

export default ImageLightbox;
