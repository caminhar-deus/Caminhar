import React, { useEffect, useCallback, useRef } from 'react';
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
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Prevenir scroll do body
  useEffect(() => {
    if (preventScroll && isOpen && document.body) {
      document.body.style.overflow = 'hidden';
    } else if (document.body) {
      document.body.style.overflow = '';
    }
    return () => {
      if (document.body) document.body.style.overflow = '';
    };
  }, [isOpen, preventScroll]);

  // Gerenciar Foco (Focus Trap) - Implementação própria
  useEffect(() => {
    if (!isOpen) return;

    // Salvar elemento com foco anterior
    previousFocusRef.current = document.activeElement;
    
    // Focar no modal após montagem
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = modalRef.current.querySelectorAll(focusableSelector);
        
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      // Restaurar foco ao elemento anterior quando fechar
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Gerenciar Teclado (ESC e Tab para focus trap)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }

    // Focus trap: manter foco dentro do modal com Tab
    if (e.key === 'Tab' && modalRef.current) {
      const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(focusableSelector)
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const currentFocused = document.activeElement;

      // Shift + Tab no primeiro elemento: vai para o último
      if (e.shiftKey && currentFocused === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } 
      // Tab no último elemento: vai para o primeiro
      else if (!e.shiftKey && currentFocused === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
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
      <div 
        ref={modalRef}
        className={modalClasses} 
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1"
      >
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
  if (typeof window !== 'undefined' && document.body) {
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