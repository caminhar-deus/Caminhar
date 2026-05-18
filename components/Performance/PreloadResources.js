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
      {/* Preconnect para domínios externos (já inclui DNS resolution) */}
      {allDomains.map((domain, index) => (
        <link
          key={`preconnect-${index}`}
          rel="preconnect"
          href={domain}
          crossOrigin={domain.includes('gstatic') ? 'anonymous' : undefined}
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
          fetchPriority="high"
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
 * Helper para definir recursos críticos baseado na página.
 * 
 * @param {Object} options - Configuração externa dos recursos
 * @param {string} options.pageType - Tipo de página (home, blog, musicas, videos)
 * @param {string[]} [options.images] - URLs de imagens críticas da página
 * @param {string[]} [options.domains] - Domínios adicionais para preconnect
 * @param {string[]} [options.fonts] - URLs de fontes críticas
 * @param {string[]} [options.scripts] - URLs de scripts críticos
 * @param {string[]} [options.styles] - URLs de CSS críticos
 * @returns {Object} Recursos organizados para o componente PreloadResources
 * 
 * @example
 * // Uso com dados dinâmicos vindos da página/API
 * getCriticalResources({
 *   pageType: 'home',
 *   images: ['/banner-principal.webp', '/logo.svg'],
 *   domains: ['https://fonts.googleapis.com']
 * });
 */
export function getCriticalResources({ pageType, images, domains, fonts, scripts, styles } = {}) {
  const resources = {
    fonts: fonts || [],
    images: images || [],
    scripts: scripts || [],
    styles: styles || [],
    domains: domains || [],
  };

  // Se pageType for fornecido sem dados específicos, usa fallbacks sensíveis
  if (!images && !domains && !fonts && !scripts && !styles) {
    switch (pageType) {
      case 'musicas':
        resources.domains.push('https://open.spotify.com');
        break;
      case 'videos':
        resources.domains.push('https://www.youtube.com', 'https://img.youtube.com');
        break;
    }
  }

  return resources;
}
