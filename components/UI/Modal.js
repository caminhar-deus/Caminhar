import React, { useEffect, useCallback, useRef, useId } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';

// Constante para seletor de elementos focáveis (evita duplicação)
const FOCUSABLE_ELEMENTS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Contador de referência para gerenciar scroll lock com múltiplos modais
let modalCount = 0;
const BODY_MODAL_CLASS = 'modal-open';

/**
 * Modal - Componente base de modal
 * @param {boolean} isOpen - Controla visibilidade
 * @param {function} onClose - Handler para fechar
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {ReactNode} title - Título do modal
 * @param {ReactNode} description - Descrição do modal (para aria-describedby)
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
  description,
  footer,
  children,
  closeOnOverlayClick = true,
  showCloseButton = true,
  preventScroll = true,
  className = '',
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const focusableElementsRef = useRef([]);
  const titleId = useId();
  const descriptionId = useId();

  // Atualiza o cache de elementos focáveis quando o conteúdo do modal muda
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    focusableElementsRef.current = Array.from(
      modalRef.current.querySelectorAll(FOCUSABLE_ELEMENTS)
    );
  }, [isOpen, children, title, footer]);

  // Prevenir scroll do body com classe CSS (em vez de manipular style inline)
  useEffect(() => {
    if (preventScroll && isOpen) {
      if (modalCount === 0) {
        document.body?.classList.add(BODY_MODAL_CLASS);
      }
      modalCount++;
    }
    return () => {
      if (preventScroll && isOpen) {
        modalCount--;
        if (modalCount <= 0) {
          modalCount = 0;
          document.body?.classList.remove(BODY_MODAL_CLASS);
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
        const elements = modalRef.current.querySelectorAll(FOCUSABLE_ELEMENTS);

        if (elements.length > 0) {
          elements[0].focus();
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
      const elements = focusableElementsRef.current;

      if (elements.length === 0) return;

      const firstFocusable = elements[0];
      const lastFocusable = elements[elements.length - 1];
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
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div
        ref={modalRef}
        className={modalClasses}
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1"
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id={titleId} className={styles.title}>{title}</h2>
            )}
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Fechar modal"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
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