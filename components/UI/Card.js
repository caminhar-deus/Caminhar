import React from 'react';
import BaseCard from './BaseCard';

/**
 * Card - Componente de card do Design System
 * 
 * Agora implementado como um wrapper do BaseCard para unificar
 * o padrão visual do projeto.
 * Mantém a mesma API pública para compatibilidade retroativa.
 *
 * @param {string} variant - 'default' | 'outlined' | 'filled' | 'elevated'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {ReactNode} header - Conteúdo do header
 * @param {ReactNode} footer - Conteúdo do footer
 * @param {ReactNode} media - Imagem ou mídia no topo
 * @param {boolean} hoverable - Efeito hover
 * @param {boolean} clickable - Cursor pointer
 * @param {boolean} fullWidth - Ocupa 100% da largura disponível
 * @param {function} onClick - Handler de click
 */
export const Card = (props) => {
  return <BaseCard {...props} />;
};

// Preserva os sub-componentes estáticos de BaseCard
Card.Header = BaseCard.Header;
Card.Footer = BaseCard.Footer;

export default Card;
