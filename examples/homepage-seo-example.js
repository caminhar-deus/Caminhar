/**
 * Exemplo de implementação SEO para Homepage
 * 
 * Nota: Os dados da homepage normalmente viriam de getStaticProps.
 * As props de recursos críticos são obtidas via getCriticalResources(),
 * que retorna um objeto no formato:
 *   { images: string[], domains: string[] }
 */

import SEOHead from '../components/SEO/Head';
import { OrganizationSchema, WebsiteSchema } from '../components/SEO/StructuredData';
import { ImageOptimized, PreloadResources, getCriticalResources } from '../components/Performance';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';
import { siteConfig } from '../lib/seo/config';
import { useState } from 'react';

export default function HomePage() {
  // Monitoramento de performance
  usePerformanceMetrics({
    reportToAnalytics: true,
  });

  // Recursos críticos para homepage
  const criticalResources = getCriticalResources('home');

  // Estado de erro para imagem LCP
  const [heroError, setHeroError] = useState(false);

  return (
    <>
      {/* Preload de recursos críticos */}
      <PreloadResources
        images={criticalResources.images}
        domains={criticalResources.domains}
      />

      {/* SEO Head */}
      <SEOHead
        title={siteConfig.name}
        description={siteConfig.description}
        image="/hero-image.jpg"
        type="website"
      />

      {/* Structured Data */}
      <OrganizationSchema />
      <WebsiteSchema />

      <main id="main-content">
        {/* Hero Section com imagem LCP */}
        <section className="hero">
          {heroError ? (
            <div className="hero-fallback" style={{ width: '100%', height: 400, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>Imagem não disponível</span>
            </div>
          ) : (
            <ImageOptimized
              src="/hero-image.jpg"
              alt="O Caminhar com Deus"
              fill
              critical={true}
              priority={true}
              sizes="100vw"
              onError={() => setHeroError(true)}
            />
          )}
          <div className="hero-content">
            <h1>{siteConfig.name}</h1>
            <p>{siteConfig.description}</p>
          </div>
        </section>

        {/* Conteúdo... */}
      </main>
    </>
  );
}