import React from 'react';
import styles from './Badge.module.css';

/**
 * Converte string kebab-case para camelCase
 * Exemplo: 'top-right' → 'topRight'
 * @param {string} str
 * @returns {string}
 */
const kebabToCamel = (str) =>
  str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

/**
 * Badge - Componente de insígnia/etiqueta
 * @param {string} variant - 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'soft'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {ReactNode} children - Conteúdo do badge
 * @param {ReactNode} leftIcon - Ícone à esquerda
 * @param {ReactNode} rightIcon - Ícone à direita
 * @param {boolean} pulse - Efeito pulsante
 * @param {boolean} dot - Mostrar apenas um ponto
 * @param {string} position - Posição absoluta ('top-right' | 'top-left' | 'bottom-right' | 'bottom-left')
 */
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  pulse = false,
  dot = false,
  position,
  className = '',
  ...props
}) => {
  // Normaliza position de kebab-case para camelCase (ex: 'top-right' → 'topRight')
  const normalizedPosition = position ? kebabToCamel(position) : null;

  const badgeClasses = [
    styles.badge,
    styles[variant],
    styles[size],
    dot && styles.dot,
    pulse && styles.pulse,
    normalizedPosition && styles[normalizedPosition],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (dot) {
    return <span className={badgeClasses} aria-label={children} {...props} />;
  }

  return (
    <span className={badgeClasses} {...props}>
      {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
      <span className={styles.content}>{children}</span>
      {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
    </span>
  );
};

/**
 * Badge.Counter - Badge numérico com comportamento específico
 */
Badge.Counter = ({
  count,
  max = 99,
  variant = 'error',
  size = 'sm',
  showZero = false,
  className = '',
}) => {
  if (!showZero && count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size={size} className={className}>
      {displayCount}
    </Badge>
  );
};

/**
 * Badge.Dot - Apenas um ponto indicador
 */
Badge.Dot = ({
  variant = 'error',
  size = 'md',
  pulse = true,
  className = '',
}) => (
  <span
    className={`${styles.badge} ${styles.dot} ${styles[variant]} ${styles[size]} ${pulse ? styles.pulse : ''} ${className}`}
    aria-label="Notificação"
  />
);

export default Badge;