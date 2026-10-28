import Head from 'next/head';
import styles from './styles/Home.module.css';
import { useState, useEffect } from 'react';
import ContentTabs from '../components/Features/ContentTabs';
import Testimonials from '../components/Features/Testimonials';

export default function Home() {
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  // O banner vem da configuração `home_image_url` (gravada pelo painel). Cada
  // upload gera filename único, então a URL muda a cada troca e o cache do
  // navegador por URL é seguro. Fallback: endpoint que resolve o hero no
  // servidor (quando a setting não existe).
  const [imageSrc, setImageSrc] = useState('/api/placeholder-image');
  const [settingsError, setSettingsError] = useState(false);

  useEffect(() => {
    // Load settings from database. Sem cache em sessionStorage: o servidor já
    // cacheia as settings (TTL 2h, invalidado no PUT) — uma camada no cliente
    // só atrasava a visualização de mudanças feitas no painel.
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setTitle(settings.site_title || 'O Caminhar com Deus');
          setSubtitle(settings.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
          // Defesa em profundidade (revisão do oracle): a setting é gravada por
          // admin autenticado, mas o `src` não deve aceitar esquemas arbitrários
          // (javascript:, data:) — só caminho relativo ou URL http(s) da mesma
          // origem; caso contrário, mantém o fallback.
          const heroUrl = settings.home_image_url;
          const isSafeHeroUrl =
            typeof heroUrl === 'string' &&
            (heroUrl.startsWith('/') ||
              (() => {
                try {
                  return new URL(heroUrl, window.location.origin).origin === window.location.origin;
                } catch {
                  return false;
                }
              })());
          if (isSafeHeroUrl) {
            setImageSrc(heroUrl);
          }
          setSettingsError(false);
        } else {
          console.warn('Settings API retornou status', response.status, '- usando valores padrão');
          setSettingsError(true);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettingsError(true);
        // Valores padrão já estão definidos no useState, mantém os defaults
      }
    };

    loadSettings();
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={subtitle} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>
            {subtitle}
          </p>
          {settingsError && (
            <p className={styles.settingsError}>
              Configurações temporariamente indisponíveis
            </p>
          )}
        </div>

        <div className={styles.imageContainer}>
          <img
            src={imageSrc}
            alt="Caminhar com Deus"
            className={styles.heroImage}
            loading="lazy"
          />
        </div>

        <ContentTabs />
        
        <Testimonials />
      </main>
    </div>
  );
}