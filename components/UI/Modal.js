import React, { useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';

// Contador de referência para gerenciar scroll lock com múltiplos modais
let modalCount = 0;
let originalBodyOverflow = '';

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

  // Prevenir scroll do body com contador de referência
  useEffect(() => {
    if (preventScroll) {
      if (isOpen) {
        if (modalCount === 0) {
          originalBodyOverflow = document.body?.style.overflow || '';
        }
        modalCount++;
        if (document.body) {
          document.body.style.overflow = 'hidden';
        }
      }
    }
    return () => {
      if (preventScroll && isOpen) {
        modalCount--;
        if (modalCount <= 0) {
          modalCount = 0;
          if (document.body) {
            document.body.style.overflow = originalBodyOverflow;
          }
        }
      }
    };
  }, [isOpen, preventScroll]);

  // Gerenciar Foco (Focus Trap)
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

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

    if (e.key === 'Tab' && modalRef.current) {
      const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(focusableSelector)
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const currentFocused = document.activeElement;

      if (e.shiftKey && currentFocused === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && currentFocused === lastFocusable) {
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