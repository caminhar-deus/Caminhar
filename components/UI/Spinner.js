import React from 'react';
import styles from './Spinner.module.css';

/**
 * Spinner - Componente de loading
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} color - 'primary' | 'secondary' | 'white' | 'dark'
 * @param {string} variant - 'border' | 'grow' | 'dots'
 * @param {string} label - Texto para acessibilidade
 * @param {boolean} centered - Centralizar na tela
 */
export const Spinner = ({
  size = 'md',
  color = 'primary',
  variant = 'border',
  label = 'Carregando...',
  centered = false,
  className = '',
}) => {
  const spinnerClasses = [
    styles.spinner,
    styles[variant],
    styles[size],
    styles[color],
    centered && styles.centered,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={spinnerClasses} role="status" aria-label={label}>
      <span className={styles.visuallyHidden}>{label}</span>
      {variant === 'dots' && (
        <>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </>
      )}
    </div>
  );
};

/**
 * Spinner.Container - Container para spinner centralizado
 */
Spinner.Container = ({ children, className = '' }) => (
  <div className={`${styles.container} ${className}`}>
    {children}
  </div>
);

/**
 * Spinner.Overlay - Overlay com spinner
 */
Spinner.Overlay = ({ label, className = '' }) => (
  <div className={`${styles.overlay} ${className}`} role="status" aria-label={label || 'Carregando'}>
    <Spinner size="lg" label={label} />
  </div>
);

export default Spinner;
