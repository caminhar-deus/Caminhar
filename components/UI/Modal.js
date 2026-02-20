import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';

/**
 * Modal - Componente base de modal
 * @param {boolean} isOpen - Controla visibilidade
 * @param {function} onClose - Handler para fechar
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {ReactNode} title - Título do modal
 * @param {ReactNode} footer - Conteúdo do footer
 * @param {boolean} closeOnOverlayClick - Fechar ao clicar no overlay
 * @param {boolean} showCloseButton - Mostrar botão de fechar
 * @param {boolean} preventScroll - Prevenir scroll do body
 */
export const Modal = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  footer,
  children,
  closeOnOverlayClick = true,
  showCloseButton = true,
  preventScroll = true,
  className = '',
}) => {
  // Prevenir scroll do body
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preventScroll]);

  // Fechar com ESC
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  const modalClasses = [
    styles.modal,
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const modal = (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={modalClasses} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 className={styles.title}>{title}</h2>
            )}
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Fechar modal"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>
          {children}
        </div>
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Usar portal para renderizar no body
  if (typeof window !== 'undefined') {
    return ReactDOM.createPortal(modal, document.body);
  }
  return modal;
};

/**
 * Modal.Footer - Sub-componente para footer estruturado
 */
Modal.Footer = ({ children, className = '' }) => (
  <div className={`${styles.footerContent} ${className}`}>
    {children}
  </div>
);

export default Modal;
