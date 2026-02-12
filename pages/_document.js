import { Html, Head, Main, NextScript } from 'next/document';
import { siteConfig } from '../lib/seo/config';
import { extractCriticalCSS } from '../components/Performance/CriticalCSS';

/**
 * Documento HTML customizado e otimizado
 * 
 * Inclui:
 * - Preconnect para domínios críticos
 * - DNS prefetch
 * - CSS crítico inline
 * - Favicons para todas plataformas
 * - Meta tags de segurança e performance
 */

export default function Document() {
  const criticalCSS = extractCriticalCSS();

  return (
    <Html lang={siteConfig.language}>
      <Head>
        {/* Preconnect crítico (deve ser no head) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://open.spotify.com" />
        <link rel="preconnect" href="https://i.scdn.co" />
        <link rel="preconnect" href="https://img.youtube.com" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://open.spotify.com" />
        <link rel="dns-prefetch" href="https://i.scdn.co" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />

        {/* CSS Crítico Inline */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} id="critical-css" />

        {/* Meta tags de segurança */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="origin-when-cross-origin" />
        
        {/* Content Security Policy (ajuste conforme necessário) */}
        <meta 
          httpEquiv="Content-Security-Policy" 
          content="
            default-src 'self';
            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://open.spotify.com https://*.googletagmanager.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: https: blob: https://img.youtube.com https://i.scdn.co https://*.googleusercontent.com;
            media-src 'self' https: blob:;
            connect-src 'self' https:;
            frame-src 'self' https://www.youtube.com https://open.spotify.com https://*.youtube.com;
            object-src 'none';
            base-uri 'self';
            form-action 'self';
            upgrade-insecure-requests;
          "
        />

        {/* Permissions Policy */}
        <meta 
          httpEquiv="Permissions-Policy" 
          content="
            accelerometer=(),
            camera=(),
            geolocation=(),
            gyroscope=(self),
            magnetometer=(),
            microphone=(),
            payment=(),
            usb=()
          "
        />

        {/* Favicons para todas plataformas */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        
        {/* Ícones para Android/Chrome */}
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        
        {/* Microsoft Tile */}
        <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
        <meta name="msapplication-TileColor" content="#2c3e50" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color para navegadores */}
        <meta name="theme-color" content="#2c3e50" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a252f" media="(prefers-color-scheme: dark)" />

        {/* Meta tags Apple */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.shortName} />
        
        {/* Meta tags Microsoft */}
        <meta name="application-name" content={siteConfig.name} />
        <meta name="msapplication-tooltip" content={siteConfig.description} />
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-navbutton-color" content="#2c3e50" />

        {/* Canonical base */}
        <link rel="canonical" href={siteConfig.url} />

        {/* Alternate - RSS Feed */}
        <link 
          rel="alternate" 
          type="application/rss+xml" 
          title={`${siteConfig.name} - Feed RSS`}
          href="/feed.xml" 
        />
        
        {/* Alternate - Sitemap */}
        <link 
          rel="sitemap" 
          type="application/xml" 
          title="Sitemap" 
          href="/sitemap.xml" 
        />

        {/* Preload de recursos críticos */}
        <link 
          rel="preload" 
          href="/fonts/main-font.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
      </Head>
      
      <body>
        <Main />
        <NextScript />
        
        {/* Script para remover CSS crítico após carregamento */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Remove critical CSS after fonts and main CSS load
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    var style = document.getElementById('critical-css');
                    if (style) {
                      style.remove();
                    }
                  }, 100);
                });
                
                // Performance marks
                if (window.performance && window.performance.mark) {
                  performance.mark('document_loaded');
                }
              })();
            `,
          }}
        />
      </body>
    </Html>
  );
}
