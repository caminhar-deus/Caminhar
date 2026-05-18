import { useState, useEffect, useRef, useCallback } from 'react';
import { extractYoutubeId } from '@/lib/youtube';

/**
 * LazyIframe - Componente para lazy loading de iframes (YouTube, Spotify, etc)
 * 
 * Props:
 * - src: URL do iframe (obrigatório)
 * - title: Título para acessibilidade (obrigatório)
 * - thumbnail: URL da thumbnail (opcional, para preview)
 * - provider: 'youtube' | 'spotify' | 'generic' (padrão: generic)
 * - aspectRatio: Aspect ratio (padrão: 16/9)
 * - allow: Permissões do iframe (padrão: accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture)
 * - onLoad: Callback quando carrega (opcional)
 * - placeholderText: Texto do botão de play (padrão: 'Clique para carregar')
 * - loadOnVisible: Carregar quando visível no viewport (padrão: true)
 * - threshold: Limite de interseção (padrão: 0.1)
 */

export default function LazyIframe({
  src,
  title,
  thumbnail,
  provider = 'generic',
  aspectRatio = '16/9',
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  onLoad,
  placeholderText = '▶ Clique para carregar',
  loadOnVisible = true,
  threshold = 0.1,
  style,
  className,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!loadOnVisible);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!loadOnVisible || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loadOnVisible, threshold]);

  // Carrega iframe quando visível + usuário clica (privacidade)
  useEffect(() => {
    if (isIntersecting && !loadOnVisible) {
      setIsVisible(true);
    }
  }, [isIntersecting, loadOnVisible]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleClick = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Gera thumbnail baseado no provider
  const getThumbnail = () => {
    if (thumbnail) return thumbnail;
    
    if (provider === 'youtube') {
      const videoId = extractYoutubeId(src);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    return null;
  };

  // Garante URL de embed correta para YouTube
  const getEmbedSrc = () => {
    if (provider === 'youtube') {
      const videoId = extractYoutubeId(src);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return src;
  };

  const thumbUrl = getThumbnail();
  const shouldShowPlaceholder = !isVisible || !isIntersecting;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        ...style,
      }}
    >
        {/* Placeholder / Thumbnail */}
      {shouldShowPlaceholder && (
        <div
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={placeholderText.replace(/[▶●■]/g, '').trim() || `Carregar: ${title}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: '#1a1a1a',
            backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay escuro */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: thumbUrl ? 'rgba(0,0,0,0.4)' : 'transparent',
            }}
          />

          {/* Botão de play */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="white"
              aria-hidden="true"
            >
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </div>

          {/* Texto do placeholder */}
          <span
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            {placeholderText}
          </span>
        </div>
      )}
REPLACE

      {/* Iframe */}
      {(isVisible || isIntersecting) && (
        <iframe
          ref={iframeRef}
          src={getEmbedSrc()}
          title={title}
          allow={allow}
          allowFullScreen
          loading="lazy"
          onLoad={handleLoad}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          {...rest}
        />
      )}

    </div>
  );
}
