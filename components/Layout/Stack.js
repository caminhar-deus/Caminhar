import React from 'react';
import PropTypes from 'prop-types';
import styles from './Stack.module.css';

/**
 * Stack - Componente para empilhamento vertical/horizontal
 * @param {string} direction - 'vertical' | 'horizontal' | 'row' | 'column'
 * @param {string} spacing - Espaçamento entre itens ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')
 * @param {string} gap - Alias para spacing. Se fornecido e spacing não, usa gap. spacing tem prioridade.
 * @param {string} align - Alinhamento dos itens ('start' | 'center' | 'end' | 'stretch' | 'baseline')
 * @param {string} justify - Distribuição dos itens ('start' | 'center' | 'end' | 'between' | 'around' | 'evenly')
 * @param {boolean} wrap - Permitir quebra de linha (apenas horizontal)
 * @param {boolean} inline - Display inline-flex
 * @param {boolean} responsive - Habilita responsividade automática (ajusta spacing em mobile)
 */
export const Stack = ({
  children,
  direction = 'vertical',
  spacing,
  gap: gapProp,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  inline = false,
  responsive = false,
  className = '',
  ...props
}) => {
  // gap é alias para spacing. spacing tem prioridade.
  const effectiveSpacing = spacing !== undefined ? spacing : (gapProp !== undefined ? gapProp : 'md');
  const flexDirection = direction === 'horizontal' || direction === 'row' ? 'row' : 'column';
  
  const stackClasses = [
    styles.stack,
    styles[flexDirection],
    styles[`spacing${effectiveSpacing.charAt(0).toUpperCase() + effectiveSpacing.slice(1)}`],
    styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`],
    styles[`justify${justify.charAt(0).toUpperCase() + justify.slice(1)}`],
    wrap && styles.wrap,
    inline && styles.inline,
    responsive && styles.responsive,
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

Stack.displayName = 'Stack';

Stack.propTypes = {
  /** Conteúdo do stack */
  children: PropTypes.node,
  /** Direção do empilhamento */
  direction: PropTypes.oneOf(['vertical', 'horizontal', 'row', 'column']),
  /** Espaçamento entre itens */
  spacing: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  /** Alias para spacing (spacing tem prioridade) */
  gap: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  /** Alinhamento dos itens no eixo transversal */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch', 'baseline']),
  /** Distribuição dos itens no eixo principal */
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around', 'evenly']),
  /** Permitir quebra de linha (apenas horizontal) */
  wrap: PropTypes.bool,
  /** Display inline-flex */
  inline: PropTypes.bool,
  /** Habilita responsividade automática */
  responsive: PropTypes.bool,
  /** Classes CSS adicionais */
  className: PropTypes.string,
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

Stack.Item.displayName = 'Stack.Item';

Stack.Item.propTypes = {
  /** Conteúdo do item */
  children: PropTypes.node,
  /** Permitir crescimento */
  grow: PropTypes.bool,
  /** Permitir encolhimento */
  shrink: PropTypes.bool,
  /** Alinhamento individual do item */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch']),
  /** Classes CSS adicionais */
  className: PropTypes.string,
};

/**
 * Stack.Divider - Divisor entre itens
 */
Stack.Divider = ({ className = '', ...props }) => (
  <div className={`${styles.divider} ${className}`} role="separator" {...props} />
);

Stack.Divider.displayName = 'Stack.Divider';

Stack.Divider.propTypes = {
  /** Classes CSS adicionais */
  className: PropTypes.string,
};

/**
 * Stack.Spacer - Espaçador flexível para ocupar espaço entre itens
 */
Stack.Spacer = ({ className = '', ...props }) => (
  <div className={`${styles.spacer} ${className}`} {...props} />
);

Stack.Spacer.displayName = 'Stack.Spacer';

Stack.Spacer.propTypes = {
  /** Classes CSS adicionais */
  className: PropTypes.string,
};

/**
 * Stack.VStack - Stack vertical (atalho)
 */
Stack.VStack = (props) => <Stack direction="vertical" {...props} />;

Stack.VStack.displayName = 'Stack.VStack';

Stack.VStack.propTypes = {
  /** Conteúdo do stack vertical */
  children: PropTypes.node,
  /** Espaçamento entre itens */
  spacing: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  /** Alinhamento dos itens no eixo transversal */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch', 'baseline']),
  /** Distribuição dos itens no eixo principal */
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around', 'evenly']),
  /** Habilita responsividade automática */
  responsive: PropTypes.bool,
  /** Classes CSS adicionais */
  className: PropTypes.string,
};

/**
 * Stack.HStack - Stack horizontal (atalho)
 */
Stack.HStack = (props) => <Stack direction="horizontal" {...props} />;

Stack.HStack.displayName = 'Stack.HStack';

Stack.HStack.propTypes = {
  /** Conteúdo do stack horizontal */
  children: PropTypes.node,
  /** Espaçamento entre itens */
  spacing: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  /** Alinhamento dos itens no eixo transversal */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch', 'baseline']),
  /** Distribuição dos itens no eixo principal */
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around', 'evenly']),
  /** Permitir quebra de linha */
  wrap: PropTypes.bool,
  /** Habilita responsividade automática */
  responsive: PropTypes.bool,
  /** Classes CSS adicionais */
  className: PropTypes.string,
};

export default Stack;