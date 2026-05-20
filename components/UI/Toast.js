import React, { useEffect, useState, useCallback } from 'react';
import styles from './Toast.module.css';
import { defaultIcons } from './icons';

/**
 * Gera um ID único com fallback para ambientes sem crypto.randomUUID
 * @returns {string}
 */
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para navegadores antigos ou Node.js < 19
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const STATUS_LABELS = {
  info: 'Informação',
  success: 'Sucesso',
  warning: 'Atenção',
  error: 'Erro',
};

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

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, handleClose]);

  if (!isVisible) return null;

  // Mapeia posição para animação de saída correspondente
  const getExitAnimation = (pos) => {
    const exitMap = {
      'top-right': 'exitRight',
      'bottom-right': 'exitRight',
      'top-left': 'exitLeft',
      'bottom-left': 'exitLeft',
      'top-center': 'exitUp',
      'bottom-center': 'exitDown',
    };
    return exitMap[pos] || 'exiting';
  };

  const toastClasses = [
    styles.toast,
    styles[status],
    styles[position],
    isExiting && styles[getExitAnimation(position)],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const statusLabel = STATUS_LABELS[status] || status;

  return (
    <div
      className={toastClasses}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.icon}>
        {defaultIcons[status]}
      </div>
      <div className={styles.content}>
        {/* Texto oculto para leitores de tela anunciarem o status */}
        <span className={styles.srOnly}>{statusLabel}: </span>
        {title && <h6 className={styles.title}>{title}</h6>}
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {isClosable && (
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label={`Fechar notificação de ${statusLabel.toLowerCase()}`}
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
    const id = generateId();
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