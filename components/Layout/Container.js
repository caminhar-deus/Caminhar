import React from 'react';
import styles from './Container.module.css';

/**
 * Container - Componente de container centralizado com max-width
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 * @param {boolean} centered - Centralizar horizontalmente
 * @param {boolean} fluid - Largura 100% com padding
 * @param {string} as - Elemento HTML (div, section, article, etc)
 */
export const Container = ({
  children,
  size = 'xl',
  centered = true,
  fluid = false,
  as: Component = 'div',
  className = '',
  ...props
}) => {
  const containerClasses = [
    styles.container,
    !fluid && styles[size],
    fluid && styles.fluid,
    centered && styles.centered,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={containerClasses} {...props}>
      {children}
    </Component>
  );
};

/**
 * Container.Section - Container específico para seções
 */
Container.Section = ({ children, className = '', ...props }) => (
  <section className={`${styles.section} ${className}`} {...props}>
    {children}
  </section>
);

/**
 * Container.Article - Container específico para artigos
 */
Container.Article = ({ children, className = '', ...props }) => (
  <article className={`${styles.article} ${className}`} {...props}>
    {children}
  </article>
);

export default Container;
