import Head from 'next/head';

/**
 * PreloadResources - Componente para preconnect e preload de recursos críticos
 * 
 * Props:
 * - fonts: Array de URLs de fontes para preload
 * - images: Array de URLs de imagens críticas (LCP)
 * - scripts: Array de URLs de scripts críticos
 * - styles: Array de URLs de CSS críticos
 * - domains: Array de domínios para preconnect
 */

const DEFAULT_DOMAINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://www.youtube.com',
  'https://open.spotify.com',
  'https://img.youtube.com',
  'https://i.scdn.co', // Spotify images
];

export default function PreloadResources({
  fonts = [],
  images = [],
  scripts = [],
  styles = [],
  domains = [],
}) {
  const allDomains = [...new Set([...DEFAULT_DOMAINS, ...domains])];

  return (
    <Head>
      {/* Preconnect para domínios externos */}
      {allDomains.map((domain, index) => (
        <link
          key={`preconnect-${index}`}
          rel="preconnect"
          href={domain}
          crossOrigin={domain.includes('gstatic') ? 'anonymous' : undefined}
        />
      ))}

      {/* DNS Prefetch */}
      {allDomains.map((domain, index) => (
        <link
          key={`dns-${index}`}
          rel="dns-prefetch"
          href={domain}
        />
      ))}

      {/* Preload fontes críticas */}
      {fonts.map((font, index) => (
        <link
          key={`font-${index}`}
          rel="preload"
          href={font}
          as="font"
          type={font.endsWith('.woff2') ? 'font/woff2' : font.endsWith('.woff') ? 'font/woff' : 'font/ttf'}
          crossOrigin="anonymous"
        />
      ))}

      {/* Preload imagens críticas (LCP) */}
      {images.map((image, index) => (
        <link
          key={`image-${index}`}
          rel="preload"
          href={image}
          as="image"
          type={image.endsWith('.webp') ? 'image/webp' : image.endsWith('.png') ? 'image/png' : 'image/jpeg'}
          fetchpriority="high"
        />
      ))}

      {/* Preload scripts críticos */}
      {scripts.map((script, index) => (
        <link
          key={`script-${index}`}
          rel="preload"
          href={script}
          as="script"
        />
      ))}

      {/* Preload CSS crítico */}
      {styles.map((style, index) => (
        <link
          key={`style-${index}`}
          rel="preload"
          href={style}
          as="style"
        />
      ))}
    </Head>
  );
}

/**
 * Helper para definir recursos críticos baseado na página
 */
export function getCriticalResources(pageType) {
  const resources = {
    fonts: [],
    images: [],
    scripts: [],
    styles: [],
  };

  switch (pageType) {
    case 'home':
      resources.images = ['/hero-image.jpg', '/logo.png'];
      break;
    case 'blog':
      resources.images = ['/blog-hero.jpg'];
      break;
    case 'musicas':
      resources.images = ['/music-hero.jpg'];
      resources.domains = ['https://open.spotify.com'];
      break;
    case 'videos':
      resources.images = ['/video-hero.jpg'];
      resources.domains = ['https://www.youtube.com', 'https://img.youtube.com'];
      break;
    default:
      break;
  }

  return resources;
}
