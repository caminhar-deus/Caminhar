import React from 'react';
import styles from './Stack.module.css';

/**
 * Stack - Componente para empilhamento vertical/horizontal
 * @param {string} direction - 'vertical' | 'horizontal' | 'row' | 'column'
 * @param {string} spacing - Espaçamento entre itens ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')
 * @param {string} align - Alinhamento dos itens ('start' | 'center' | 'end' | 'stretch' | 'baseline')
 * @param {string} justify - Distribuição dos itens ('start' | 'center' | 'end' | 'between' | 'around' | 'evenly')
 * @param {boolean} wrap - Permitir quebra de linha (apenas horizontal)
 * @param {boolean} inline - Display inline-flex
 */
export const Stack = ({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  inline = false,
  className = '',
  ...props
}) => {
  const flexDirection = direction === 'horizontal' || direction === 'row' ? 'row' : 'column';
  
  const stackClasses = [
    styles.stack,
    styles[flexDirection],
    styles[`spacing${spacing.charAt(0).toUpperCase() + spacing.slice(1)}`],
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    styles[`justify${justify.charAt(0).toUpperCase() + justify.slice(1)}`],
    wrap && styles.wrap,
    inline && styles.inline,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stackClasses} {...props}>
      {children}
    </div>
  );
};

/**
 * Stack.Item - Item individual do stack
 * @param {boolean} grow - Permitir crescimento
 * @param {boolean} shrink - Permitir encolhimento
 * @param {string} align - Alinhamento individual
 */
Stack.Item = ({
  children,
  grow = false,
  shrink = false,
  align,
  className = '',
  ...props
}) => {
  const itemClasses = [
    styles.item,
    grow && styles.grow,
    shrink && styles.shrink,
    align && styles[`itemAlign${align.charAt(0).toUpperCase() + align.slice(1)}`],
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
 * Stack.Divider - Divisor entre itens
 */
Stack.Divider = ({ className = '', ...props }) => (
  <div className={`${styles.divider} ${className}`} role="separator" {...props} />
);

/**
 * Stack.VStack - Stack vertical (atalho)
 */
Stack.VStack = (props) => <Stack direction="vertical" {...props} />;

/**
 * Stack.HStack - Stack horizontal (atalho)
 */
Stack.HStack = (props) => <Stack direction="horizontal" {...props} />;

export default Stack;
