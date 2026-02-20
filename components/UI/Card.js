import React from 'react';
import styles from './Card.module.css';

/**
 * Card - Componente base de card
 * @param {string} variant - 'default' | 'outlined' | 'filled' | 'elevated'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {ReactNode} header - Conteúdo do header
 * @param {ReactNode} footer - Conteúdo do footer
 * @param {ReactNode} media - Imagem ou mídia no topo
 * @param {string} mediaAlt - Alt text para a mídia
 * @param {boolean} hoverable - Efeito hover
 * @param {boolean} clickable - Cursor pointer
 * @param {function} onClick - Handler de click
 */
export const Card = ({
  children,
  variant = 'default',
  size = 'md',
  header,
  footer,
  media,
  mediaAlt,
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[size],
    hoverable && styles.hoverable,
    clickable && styles.clickable,
    (onClick || clickable) && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {media && (
        <div className={styles.media}>
          {typeof media === 'string' ? (
            <img src={media} alt={mediaAlt || ''} className={styles.mediaImage} />
          ) : (
            media
          )}
        </div>
      )}
      {header && (
        <div className={styles.header}>
          {header}
        </div>
      )}
      <div className={styles.content}>
        {children}
      </div>
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Card.Header - Sub-componente para header estruturado
 */
Card.Header = ({ title, subtitle, action, icon, className = '' }) => (
  <div className={`${styles.headerContent} ${className}`}>
    {icon && (
      <div className={styles.headerIcon}>
        {icon}
      </div>
    )}
    <div className={styles.headerText}>
      {title && <h3 className={styles.headerTitle}>{title}</h3>}
      {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
    </div>
    {action && (
      <div className={styles.headerAction}>
        {action}
      </div>
    )}
  </div>
);

/**
 * Card.Footer - Sub-componente para footer estruturado
 */
Card.Footer = ({ children, align = 'start', className = '' }) => (
  <div className={`${styles.footerContent} ${styles[`footer${align.charAt(0).toUpperCase() + align.slice(1)}`]} ${className}`}>
    {children}
  </div>
);

export default Card;
