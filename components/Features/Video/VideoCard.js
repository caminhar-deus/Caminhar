import React from 'react';
import { LazyIframe } from '../../Performance';
import BaseCard from '../../UI/BaseCard';

/**
 * Componente VideoCard
 * Responsável por exibir um vídeo individual na lista.
 * 
 * Integração com Thumbnail Personalizada:
 * O componente recebe o objeto 'video' completo. Passamos 'video.thumbnail'
 * para o LazyIframe. Se existir (não for null), o LazyIframe usará essa imagem
 * como capa. Se for null, ele usará a capa padrão do YouTube gerada pelo ID.
 */
export default function VideoCard({ video }) {
  return (
    <BaseCard
      hoverable
      media={
        <LazyIframe
          src={video.url_youtube}
          title={video.titulo}
          thumbnail={video.thumbnail}
          provider="youtube"
          aspectRatio="16/9"
        />
      }
      style={{
        borderRadius: 'var(--border-radius-xl)',
        boxShadow: 'var(--shadow-card)',
        transition: 'var(--transition-transform)',
        height: '100%',
      }}
    >
      <h3 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
        {video.titulo}
      </h3>
      {video.descricao && (
        <p style={{ 
          margin: 0, 
          color: 'var(--color-text-tertiary)', 
          fontSize: 'var(--font-size-sm)', 
          lineHeight: 'var(--line-height-normal)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {video.descricao}
        </p>
      )}
    </BaseCard>
  );
}
