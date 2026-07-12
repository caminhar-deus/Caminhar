import { useState, useEffect, useRef, useCallback } from 'react';
import { extractYoutubeId } from '@/lib/youtube';

// Gerenciador global de fila de carregamento de iframes
// Limita a 2 carregamentos simultâneos para evitar contenção de banda
const iframeLoadingQueue = {
  concurrent: 0,
  maxConcurrent: 2,
  queue: [],
  processQueue() {
    while (this.queue.length > 0 && this.concurrent < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.concurrent++;
        next();
      }
    }
  },
  add(loadFn) {
    return new Promise((resolve, reject) => {
      const wrapped = () => {
        loadFn()
          .then((result) => {
            this.concurrent = Math.max(0, this.concurrent - 1);
            this.processQueue();
            resolve(result);
          })
          .catch((err) => {
            this.concurrent = Math.max(0, this.concurrent - 1);
            this.processQueue();
            reject(err);
          });
      };
      this.queue.push(wrapped);
      this.processQueue();
    });
  },
};

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
  placeholderText = '',
  loadOnVisible = true,
  threshold = 0.1,
  style,
  className,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!loadOnVisible);
  const [canRender, setCanRender] = useState(false);
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
          // Torna o componente visível e agenda na fila de carregamento
          setIsVisible(true);
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

  // Quando o componente se torna visível, agenda na fila global de carregamento
  // para limitar a 2 iframes carregando simultaneamente
  useEffect(() => {
    if (!isVisible || canRender) return;

    iframeLoadingQueue.add(() => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          setCanRender(true);
          resolve();
        });
      });
    });
  }, [isVisible, canRender]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleClick = useCallback(() => {
    // Clique do usuário sempre carrega imediatamente, sem fila
    setCanRender(true);
    setIsVisible(true);
  }, []);

  // Gera thumbnail baseado no provider
  const getThumbnail = () => {
    if (thumbnail) return thumbnail;
    
    if (provider === 'youtube') {
      const videoId = extractYoutubeId(src);
      if (videoId) {
        // Usa hqdefault.jpg (480x360, ~20-50KB) em vez de maxresdefault.jpg (1080p, ~200-400KB)
        // A thumbnail pré-play não precisa da resolução máxima, e a redução de tamanho
        // acelera significativamente o carregamento inicial da página
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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
  const shouldShowPlaceholder = !canRender;

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

      {/* Iframe — só monta quando canRender for true (liberado pela fila ou clique do usuário) */}
      {canRender && (
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
