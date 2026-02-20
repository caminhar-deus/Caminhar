import React from 'react';
import styles from './Grid.module.css';

/**
 * Grid - Sistema de grid flexível
 * @param {number} columns - Número de colunas (1-12)
 * @param {string} gap - Espaçamento entre itens ('xs' | 'sm' | 'md' | 'lg' | 'xl')
 * @param {string} align - Alinhamento vertical ('start' | 'center' | 'end' | 'stretch')
 * @param {string} justify - Alinhamento horizontal ('start' | 'center' | 'end' | 'between' | 'around' | 'evenly')
 */
export const Grid = ({
  children,
  columns = 3,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  className = '',
  ...props
}) => {
  const gridClasses = [
    styles.grid,
    styles[`cols${columns}`],
    styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    styles[`justify${justify.charAt(0).toUpperCase() + justify.slice(1)}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  );
};

/**
 * Grid.Item - Item individual do grid
 * @param {number} colSpan - Colunas a ocupar (1-12)
 * @param {number} colStart - Coluna inicial
 * @param {number} rowSpan - Linhas a ocupar
 */
Grid.Item = ({
  children,
  colSpan,
  colStart,
  rowSpan,
  className = '',
  ...props
}) => {
  const itemClasses = [
    styles.item,
    colSpan && styles[`span${colSpan}`],
    colStart && styles[`start${colStart}`],
    rowSpan && styles[`rowSpan${rowSpan}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={itemClasses} {...props}>
      {children}
    </div>
  );
};

/**
 * Grid.Auto - Grid com colunas automáticas
 * @param {string} minWidth - Largura mínima dos itens
 */
Grid.Auto = ({
  children,
  minWidth = '250px',
  gap = 'md',
  className = '',
  ...props
}) => {
  const autoClasses = [
    styles.grid,
    styles.auto,
    styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={autoClasses}
      style={{ '--min-width': minWidth }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Grid.Responsive - Grid responsivo
 * @param {object} responsive - Configuração responsiva { sm, md, lg, xl }
 */
Grid.Responsive = ({
  children,
  columns = { default: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 'md',
  className = '',
  ...props
}) => {
  const responsiveClasses = [
    styles.grid,
    styles.responsive,
    styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={responsiveClasses}
      style={{
        '--cols-default': columns.default || 1,
        '--cols-sm': columns.sm || columns.default || 1,
        '--cols-md': columns.md || columns.sm || columns.default || 1,
        '--cols-lg': columns.lg || columns.md || columns.sm || columns.default || 1,
        '--cols-xl': columns.xl || columns.lg || columns.md || columns.sm || columns.default || 1,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Grid;
