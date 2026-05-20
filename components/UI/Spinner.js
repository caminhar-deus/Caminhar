import React from 'react';
import PropTypes from 'prop-types';
import styles from './Spinner.module.css';

/**
 * Spinner - Componente de loading
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} color - 'primary' | 'secondary' | 'white' | 'dark'
 * @param {string} variant - 'border' | 'grow' | 'dots'
 * @param {string} label - Texto para acessibilidade
 * @param {boolean} centered - Centralizar na tela
 * @param {string} className - Classe CSS adicional
 */
export const Spinner = ({
  size = 'md',
  color = 'primary',
  variant = 'border',
  label = 'Carregando...',
  centered = false,
  className = '',
}) => {
  const accessibilityLabel = label || 'Carregando...';
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
    <div className={spinnerClasses} role="status" aria-label={accessibilityLabel}>
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

Spinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['primary', 'secondary', 'white', 'dark']),
  variant: PropTypes.oneOf(['border', 'grow', 'dots']),
  label: PropTypes.string,
  centered: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * Spinner.Container - Container para spinner centralizado
 */
Spinner.Container = ({ children, className = '' }) => (
  <div className={`${styles.container} ${className}`} role="status">
    {children}
  </div>
);

Spinner.Container.displayName = 'Spinner.Container';

Spinner.Container.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Spinner.Overlay - Overlay com spinner
 */
Spinner.Overlay = ({ label, className = '' }) => (
  <div className={`${styles.overlay} ${className}`}>
    <Spinner size="lg" label={label} />
  </div>
);

Spinner.Overlay.displayName = 'Spinner.Overlay';

Spinner.Overlay.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
};

export default Spinner;