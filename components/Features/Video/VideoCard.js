import React from 'react';
import { LazyIframe } from '../../Performance';
import { BaseCard } from '@/components/UI';
import { extractYoutubeId } from '@/lib/media/youtube';
import styles from './styles/VideoCard.module.css';

/**
 * Monta a URL canônica de watch do YouTube a partir de qualquer formato
 * suportado (watch/embed/youtu.be). Se o ID não puder ser extraído, usa a
 * URL crua como fallback (degradação graciosa — spec home.md §3.6).
 * @param {string} url - A URL original do vídeo.
 * @returns {string} URL canônica de watch ou a URL original.
 */
function getCanonicalWatchUrl(url) {
  const videoId = extractYoutubeId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

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
      {/* Link externo no rodapé do cartão (spec home.md §3) — nunca sobre o player */}
      <a
        href={getCanonicalWatchUrl(video.url_youtube)}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.watchLink}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Assistir no YouTube
      </a>
    </BaseCard>
  );
}
