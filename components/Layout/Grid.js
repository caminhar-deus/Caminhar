import React from 'react';
import styles from './Grid.module.css';

/** @type {string[]} */
const BREAKPOINTS = ['default', 'sm', 'md', 'lg', 'xl'];

/**
 * Retorna o valor de colunas para um determinado breakpoint, aplicando cascata
 * (breakpoint maior herda de breakpoints menores).
 *
 * @param {string} breakpoint - Nome do breakpoint ('default' | 'sm' | 'md' | 'lg' | 'xl')
 * @param {boolean|object} responsive - Configuração responsiva (booleano ou objeto com chaves de breakpoint)
 * @param {number} [fallbackCols=1] - Valor padrão de colunas usado quando responsive é booleano ou quando
 *                                     não há definição para nenhum breakpoint
 * @returns {number} Número de colunas para o breakpoint
 */
function getColsValue(breakpoint, responsive, fallbackCols = 1) {
  const index = BREAKPOINTS.indexOf(breakpoint);
  const isObject = typeof responsive === 'object';

  for (let i = index; i >= 0; i--) {
    const key = BREAKPOINTS[i];
    if (isObject && responsive[key] != null) {
      return Number(responsive[key]);
    }
    if (!isObject && i === 0) {
      return Number(fallbackCols);
    }
  }
  return 1;
}

/**
 * Grid - Sistema de grid flexível
 * @param {number} columns - Número de colunas (1-12)
 * @param {string} gap - Espaçamento entre itens ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')
 * @param {string} rowGap - Espaçamento entre linhas ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'). Sobrescreve gap para row-gap.
 * @param {string} columnGap - Espaçamento entre colunas ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'). Adicional ao gap.
 * @param {string} align - Alinhamento vertical ('start' | 'center' | 'end' | 'stretch')
 * @param {string} justify - Alinhamento horizontal ('start' | 'center' | 'end' | 'between' | 'around' | 'evenly')
 * @param {boolean|object} responsive - Habilita responsividade. Se objeto, usa { default, sm, md, lg, xl } como breakpoints.
 */
export const Grid = ({
  children,
  columns = 3,
  gap = 'md',
  rowGap,
  columnGap,
  align = 'stretch',
  justify = 'start',
  responsive,
  className = '',
  ...props
}) => {
  const gapClass = rowGap
    ? styles[`rowGap${rowGap.charAt(0).toUpperCase() + rowGap.slice(1)}`]
    : styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`];

  const columnGapClass = columnGap
    ? styles[`columnGap${columnGap.charAt(0).toUpperCase() + columnGap.slice(1)}`]
    : null;

  const responsiveStyle = responsive
    ? {
        '--cols-default': getColsValue('default', responsive, columns),
        '--cols-sm':     getColsValue('sm', responsive, columns),
        '--cols-md':     getColsValue('md', responsive, columns),
        '--cols-lg':     getColsValue('lg', responsive, columns),
        '--cols-xl':     getColsValue('xl', responsive, columns),
      }
    : undefined;

  const gridClasses = [
    styles.grid,
    !responsive && styles[`cols${columns}`],
    gapClass,
    columnGapClass,
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    styles[`justify${justify.charAt(0).toUpperCase() + justify.slice(1)}`],
    responsive && styles.responsive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClasses} style={responsiveStyle} {...props}>
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
        '--cols-default': getColsValue('default', columns, columns.default),
        '--cols-sm':     getColsValue('sm', columns, columns.default),
        '--cols-md':     getColsValue('md', columns, columns.default),
        '--cols-lg':     getColsValue('lg', columns, columns.default),
        '--cols-xl':     getColsValue('xl', columns, columns.default),
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Grid;