import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * BaseCard - Componente de card reutilizável.
 * 
 * Extrai a estrutura base de container compartilhada entre 
 * ProductCard, MusicCard, VideoCard e PostCard.
 *
 * Props:
 * - children: Conteúdo principal do card
 * - media: Slot para área de mídia (imagem, vídeo, player, etc.)
 * - className: Classe CSS adicional
 * - style: Estilos inline adicionais
 * - itemScope, itemType: Atributos Schema.org para SEO
 * - hoverable: Se true, ativa efeito de elevação ao passar o mouse
 */

// CSS injetado globalmente uma única vez para o efeito hover
const hoverStyleId = 'base-card-hover-styles';
const hoverCSS = `
  .base-card-hover {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .base-card-hover:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.1);
  }
`;

export default function BaseCard({ children, media, className, style, itemScope, itemType, hoverable = false }) {
  const schemaProps = itemScope ? { itemScope, itemType } : {};

  // Injeta estilos hover globalmente apenas uma vez
  useEffect(() => {
    if (hoverable && !document.getElementById(hoverStyleId)) {
      const styleTag = document.createElement('style');
      styleTag.id = hoverStyleId;
      styleTag.textContent = hoverCSS;
      document.head.appendChild(styleTag);
    }
  }, [hoverable]);

  return (
    <div
      {...schemaProps}
      className={`${className || ''} ${hoverable ? 'base-card-hover' : ''}`.trim()}
      style={{
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        ...style,
      }}
    >
      {media && (
        <div style={{ position: 'relative' }}>
          {media}
        </div>
      )}
      {children && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}

BaseCard.propTypes = {
  children: PropTypes.node,
  media: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
  itemScope: PropTypes.bool,
  itemType: PropTypes.string,
  hoverable: PropTypes.bool,
};