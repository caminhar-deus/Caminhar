import React from 'react';
import PropTypes from 'prop-types';
import styles from './BaseCard.module.css';

/**
 * BaseCard - Componente de card reutilizável e principal do Design System.
 *
 * Extrai a estrutura base de container compartilhada entre
 * ProductCard, MusicCard, VideoCard, PostCard e Design System.
 * Unificado com Card.js (que era apenas um wrapper) para eliminar duplicidade.
 *
 * Props:
 * - children: Conteúdo principal do card
 * - media: Slot para área de mídia (imagem, vídeo, player, etc.)
 * - header: Conteúdo do header
 * - footer: Conteúdo do footer
 * - variant: 'default' | 'outlined' | 'filled' | 'elevated'
 * - size: 'sm' | 'md' | 'lg'
 * - className: Classe CSS adicional
 * - style: Estilos inline adicionais
 * - itemScope, itemType: Atributos Schema.org para SEO
 * - hoverable: Se true, ativa efeito de elevação ao passar o mouse
 * - clickable: Se true, cursor pointer
 * - fullWidth: Ocupa 100% da largura disponível
 * - onClick: Handler de click
 * - ariaLabel: Label acessível para leitores de tela quando interativo
 */

export default function BaseCard({
  children,
  media,
  header,
  footer,
  variant = 'default',
  size = 'md',
  className = '',
  style,
  itemScope,
  itemType,
  hoverable = false,
  clickable = false,
  fullWidth = false,
  onClick,
  ariaLabel,
  ...props
}) {
  const schemaProps = itemScope ? { itemScope, itemType } : {};

  const classNames = [
    styles.card,
    variant !== 'default' && styles[variant],
    hoverable && styles.hoverable,
    (onClick || clickable) && styles.interactive,
    clickable && styles.clickable,
    fullWidth && styles.fullWidth,
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      {...schemaProps}
      className={classNames}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (ariaLabel || 'Card clicável') : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={style}
      {...props}
    >
      {media && (
        <div className={styles.media}>
          {typeof media === 'string' ? (
            <img src={media} alt="" className={styles.mediaImage} />
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
      {children && (
        <div className={styles.content}>
          {children}
        </div>
      )}
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * BaseCard.Header - Sub-componente para header estruturado
 */
BaseCard.Header = ({ title, subtitle, action, icon, className = '' }) => (
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
 * BaseCard.Footer - Sub-componente para footer estruturado
 */
BaseCard.Footer = ({ children, align = 'start', className = '' }) => (
  <div className={`${styles.footerContent} ${styles[`footer${align.charAt(0).toUpperCase() + align.slice(1)}`]} ${className}`}>
    {children}
  </div>
);

BaseCard.propTypes = {
  children: PropTypes.node,
  media: PropTypes.node,
  header: PropTypes.node,
  footer: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'outlined', 'filled', 'elevated']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  style: PropTypes.object,
  itemScope: PropTypes.bool,
  itemType: PropTypes.string,
  hoverable: PropTypes.bool,
  clickable: PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
};