import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import BlogSection from '../components/BlogSection';

export default function Home() {
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');

  useEffect(() => {
    // Load settings from database
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setTitle(settings.site_title || 'O Caminhar com Deus');
          setSubtitle(settings.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
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
            src={`/api/placeholder-image?t=${Date.now()}`}
            alt="Caminhar com Deus"
            className={styles.heroImage}
            loading="lazy"
          />
        </div>

        <BlogSection limit={3} />
      </main>
    </div>
  );
}