import React, { useEffect, useState } from 'react';
import styles from './Toast.module.css';
import { defaultIcons } from './Alert.js';

/**
 * Toast - Componente de notificação temporária
 * @param {string} status - 'info' | 'success' | 'warning' | 'error'
 * @param {ReactNode} title - Título do toast
 * @param {ReactNode} description - Descrição do toast
 * @param {boolean} isOpen - Controla visibilidade
 * @param {function} onClose - Handler para fechar
 * @param {number} duration - Duração em ms (default: 5000)
 * @param {boolean} isClosable - Permite fechar manualmente
 * @param {string} position - Posição na tela
 */
export const Toast = ({
  status = 'info',
  title,
  description,
  isOpen = true,
  onClose,
  duration = 5000,
  isClosable = true,
  position = 'top-right',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const toastClasses = [
    styles.toast,
    styles[status],
    styles[position],
    isExiting && styles.exiting,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const icons = defaultIcons;

  return (
    <div
      className={toastClasses}
      role="status"
      aria-live="polite"
    >
      <div className={styles.icon}>
        {icons[status]}
      </div>
      <div className={styles.content}>
        {title && <h6 className={styles.title}>{title}</h6>}
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {isClosable && (
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Fechar notificação"
        >
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      {duration > 0 && (
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Toast.Container - Container para múltiplos toasts
 */
Toast.Container = ({ children, position = 'top-right', className = '' }) => (
  <div className={`${styles.container} ${styles[position]} ${className}`}>
    {children}
  </div>
);

/**
 * Toast.useToast - Hook para gerenciar toasts
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    info: (props) => addToast({ status: 'info', ...props }),
    success: (props) => addToast({ status: 'success', ...props }),
    warning: (props) => addToast({ status: 'warning', ...props }),
    error: (props) => addToast({ status: 'error', ...props }),
  };

  return { toasts, addToast, removeToast, toast };
};

export default Toast;
