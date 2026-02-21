import React from 'react';
import { LazyIframe } from '../../Performance';
import styles from './styles/VideoCard.module.css';

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
    <div style={{ 
      border: '1px solid #eaeaea', 
      borderRadius: '12px', 
      overflow: 'hidden',
      backgroundColor: '#fff',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s ease',
      height: '100%'
    }}>
      <LazyIframe
        src={video.url_youtube}
        title={video.titulo}
        thumbnail={video.thumbnail} // ✅ AQUI: Passa a capa personalizada do banco
        provider="youtube"
        aspectRatio="16/9"
      />
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 600 }}>
          {video.titulo}
        </h3>
        {video.descricao && (
          <p style={{ 
            margin: 0, 
            color: '#666', 
            fontSize: '0.9rem', 
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {video.descricao}
          </p>
        )}
      </div>
    </div>
  );
}