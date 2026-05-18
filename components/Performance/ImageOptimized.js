import Image from 'next/image';
import { useState, useCallback } from 'react';
import styles from './styles/ImageOptimized.module.css';

/**
 * ImageOptimized - Wrapper otimizado para next/image
 * 
 * Props (além das props do next/image):
 * - fallbackSrc: Imagem de fallback em caso de erro (opcional)
 * - placeholder: Tipo de placeholder (blur, empty, color) (opcional)
 * - blurDataUrl: URL para placeholder blur (opcional)
 * - onError: Callback de erro (opcional)
 * - onLoad: Callback de carregamento (opcional)
 * - loadingStrategy: Estratégia de loading (lazy, eager, auto) (padrão: lazy)
 * - critical: Se é imagem crítica (LCP) (padrão: false)
 */

export default function ImageOptimized({
  src,
  alt,
  fallbackSrc = '/default-image.jpg',
  placeholder = 'empty',
  blurDataUrl,
  onError,
  onLoad,
  loadingStrategy = 'lazy',
  critical = false,
  priority,
  quality = 75,
  sizes,
  style,
  className,
  fill,
  width,
  height,
  ...rest
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
      onError?.();
    }
  }, [fallbackSrc, hasError, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Define priority se for imagem crítica
  const isPriority = priority !== undefined ? priority : critical;

  // Loading strategy
  const loading = isPriority ? 'eager' : loadingStrategy;

  // Placeholder config
  const placeholderConfig = blurDataUrl 
    ? { placeholder: 'blur', blurDataURL: blurDataUrl }
    : { placeholder };

  // Aspect ratio style para evitar CLS
  const aspectRatioStyle = !fill && width && height
    ? { 
        ...style,
        aspectRatio: `${width} / ${height}`,
      }
    : style;

  return (
    <div 
      className={className}
      style={{
        position: 'relative',
        ...(fill 
          ? { width: '100%', height: '100%' }
          : !width && !height 
            ? {}
            : { width: '100%', maxWidth: width }
        ),
      }}
    >
      {/* Skeleton loader */}
      {!isLoaded && !hasError && (
        <div
          className={styles.skeletonLoader}
          style={{
            borderRadius: style?.borderRadius || 0,
          }}
        />
      )}
      
      <Image
        src={imgSrc}
        alt={alt}
        quality={quality}
        loading={loading}
        priority={isPriority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          ...aspectRatioStyle,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        {...placeholderConfig}
        {...rest}
      />
    </div>
  );
}
