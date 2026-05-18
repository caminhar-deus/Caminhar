import Head from 'next/head';
import styles from './styles/Home.module.css';
import { useState, useEffect } from 'react';
import ContentTabs from '../components/Features/ContentTabs';
import Testimonials from '../components/Features/Testimonials';

const SETTINGS_CACHE_KEY = 'home_settings';
const SETTINGS_CACHE_TTL = 60000; // 1 minuto

export default function Home() {
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  const [imageSrc, setImageSrc] = useState('/api/placeholder-image');

  useEffect(() => {
    // Atualiza a URL da imagem no lado do cliente para evitar Hydration Mismatch
    setImageSrc(`/api/placeholder-image?t=${Date.now()}`);

    // Load settings from database com cache
    const loadSettings = async () => {
      // Verifica cache em sessionStorage
      try {
        const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < SETTINGS_CACHE_TTL) {
            setTitle(data.site_title || 'O Caminhar com Deus');
            setSubtitle(data.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
            return;
          }
        }
      } catch {
        // Cache corrompido, ignora
      }

      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setTitle(settings.site_title || 'O Caminhar com Deus');
          setSubtitle(settings.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
          
          // Atualiza cache
          try {
            sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
              data: settings,
              timestamp: Date.now()
            }));
          } catch {
            // sessionStorage cheio, ignora
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
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