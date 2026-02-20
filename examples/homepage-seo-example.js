/**
 * Exemplo de implementação SEO para Homepage
 */

import SEOHead from '../components/SEO/Head';
import { OrganizationSchema, WebsiteSchema } from '../components/SEO/StructuredData';
import { ImageOptimized, PreloadResources, getCriticalResources } from '../components/Performance';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';
import { siteConfig } from '../lib/seo/config';

export default function HomePage() {
  // Monitoramento de performance
  usePerformanceMetrics({
    reportToAnalytics: true,
  });

  // Recursos críticos para homepage
  const criticalResources = getCriticalResources('home');

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
          <ImageOptimized
            src="/hero-image.jpg"
            alt="O Caminhar com Deus"
            fill
            critical={true}
            priority={true}
            sizes="100vw"
          />
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
