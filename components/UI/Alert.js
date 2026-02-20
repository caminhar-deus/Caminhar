import React, { useState } from 'react';
import styles from './Alert.module.css';

/**
 * Alert - Componente de alerta/avisos
 * @param {string} status - 'info' | 'success' | 'warning' | 'error'
 * @param {string} variant - 'subtle' | 'solid' | 'left-accent' | 'top-accent'
 * @param {ReactNode} title - Título do alerta
 * @param {ReactNode} children - Conteúdo do alerta
 * @param {ReactNode} icon - Ícone customizado
 * @param {boolean} closable - Permite fechar
 * @param {function} onClose - Handler ao fechar
 */
export const Alert = ({
  status = 'info',
  variant = 'subtle',
  title,
  children,
  icon,
  closable = false,
  onClose,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const alertClasses = [
    styles.alert,
    styles[status],
    styles[variant],
    closable && styles.closable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Ícones padrão por status
  const defaultIcons = {
    info: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2"/>
        <path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M12 9v4m0 4h.01M10.615 3.892 2.39 17.098c-.456.79-.684 1.184-.642 1.509.037.284.236.534.535.642.33.116.768-.015 1.643-.278L12 17.5l8.074.471c.875.263 1.313.394 1.643.278.299-.108.498-.358.535-.642.042-.325-.186-.72-.642-1.509L13.385 3.892c-.444-.77-.666-1.156-.955-1.295a1 1 0 0 0-.86 0c-.289.14-.511.525-.955 1.295z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M12 8v5m0 3h.01M2.347 17.11c-.62-1.078-.93-1.616-.89-2.18.035-.478.256-.914.608-1.21.38-.318.988-.456 2.204-.733l1.653-.367.18-.747c.268-1.114.402-1.672.62-2.183a4 4 0 0 1 1.06-1.43c.413-.353.936-.598 1.983-1.088l1.15-.537c1.03-.48 1.545-.72 2.086-.816a3.99 3.99 0 0 1 1.503 0c.54.096 1.056.336 2.085.816l1.15.537c1.047.49 1.57.735 1.983 1.088.418.357.77.825 1.06 1.43.218.511.352 1.069.62 2.183l.18.747 1.653.367c1.216.277 1.824.415 2.204.733.352.296.573.732.608 1.21.04.564-.27 1.102-.89 2.18l-.653 1.132c-.583 1.01-.875 1.515-1.256 1.92a4 4 0 0 1-1.17.853c-.513.253-1.094.379-2.255.63l-2.696.593c-1.06.233-1.59.35-2.127.402a4 4 0 0 1-1.247 0c-.537-.052-1.067-.169-2.127-.402l-2.696-.593c-1.16-.251-1.742-.377-2.255-.63a4 4 0 0 1-1.17-.853c-.38-.405-.673-.91-1.256-1.92l-.653-1.132z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };

  return (
    <div
      className={alertClasses}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.icon}>
        {icon || defaultIcons[status]}
      </div>
      <div className={styles.content}>
        {title && <h5 className={styles.title}>{title}</h5>}
        {children && <div className={styles.description}>{children}</div>}
      </div>
      {closable && (
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Fechar alerta"
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;
