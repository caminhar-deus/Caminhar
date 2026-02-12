import React from 'react';
import styles from './Button.module.css';

/**
 * Button - Componente base de botão
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} fullWidth - Ocupa toda a largura disponível
 * @param {boolean} disabled - Desabilita o botão
 * @param {boolean} loading - Mostra spinner de loading
 * @param {ReactNode} leftIcon - Ícone à esquerda
 * @param {ReactNode} rightIcon - Ícone à direita
 * @param {function} onClick - Handler de click
 * @param {string} type - 'button' | 'submit' | 'reset'
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    (disabled || loading) && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={styles.spinnerTrack} />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={styles.spinnerArc} />
          </svg>
        </span>
      )}
      {!loading && leftIcon && (
        <span className={styles.leftIcon} aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={styles.content}>{children}</span>
      {!loading && rightIcon && (
        <span className={styles.rightIcon} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

export default Button;
