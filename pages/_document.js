import Document, { Html, Head, Main, NextScript } from 'next/document';
import { siteConfig } from '../lib/seo/config';
import { extractCriticalCSS } from '../components/Performance/CriticalCSS';

/**
 * Documento HTML customizado e otimizado
 * 
 * Inclui:
 * - Preconnect para domínios críticos
 * - DNS prefetch
 * - CSS crítico inline
 * - Meta tags de segurança e performance
 */

export default function MyDocument(props) {
  const { nonce } = props;
  const criticalCSS = extractCriticalCSS();

  return (
    <Html lang={siteConfig.language}>
      <Head nonce={nonce}>
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

        {/* Favicon básico */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        
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
      </Head>
      
      <body>
        <Main />
        <NextScript nonce={nonce} />
        
        {/* Script para remover CSS crítico após carregamento */}
        <script
          nonce={nonce}
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

MyDocument.getInitialProps = async (ctx) => {
  const initialProps = await Document.getInitialProps(ctx);
  const nonce = ctx.req?.headers['x-nonce'];
  return { ...initialProps, nonce };
};
