import React from 'react';
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
 */
export default function BaseCard({ children, media, className, style, itemScope, itemType }) {
  const schemaProps = itemScope ? { itemScope, itemType } : {};

  return (
    <div
      {...schemaProps}
      className={className}
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
};