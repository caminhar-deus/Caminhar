import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>O Caminhar com Deus</title>
        <meta name="description" content="Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>O Caminhar com Deus</h1>
          <p className={styles.subtitle}>
            Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã
          </p>
        </div>

        <div className={styles.imageContainer}>
          <img
            src="/api/placeholder-image"
            alt="Caminhar com Deus"
            className={styles.heroImage}
            loading="lazy"
          />
        </div>
      </main>
    </div>
  );
}