import { useState, useEffect, useRef, useCallback } from 'react';

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
      const videoId = src.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&?\s]+)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    return null;
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
          
          {/* Botão Play */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: provider === 'youtube' ? '#FF0000' : '#1DB954',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="play-button"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="white"
                style={{ marginLeft: provider === 'youtube' ? '4px' : '0' }}
              >
                {provider === 'youtube' ? (
                  <path d="M8 5v14l11-7z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </div>
            <span
              style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: 500,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {placeholderText}
            </span>
          </div>
        </div>
      )}

      {/* Iframe */}
      {(isVisible || isIntersecting) && (
        <iframe
          ref={iframeRef}
          src={src}
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

      <style jsx>{`
        .play-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}
