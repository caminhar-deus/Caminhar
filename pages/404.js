import Head from 'next/head';
import Link from 'next/link';
import { siteConfig } from '../lib/seo/config';
import styles from './styles/NotFound.module.css';

/**
 * Página 404 canônica do Pages Router.
 * Renderizada estaticamente para qualquer rota não encontrada ou quando
 * getServerSideProps retorna { notFound: true }.
 */
export default function Custom404() {
  const siteName = siteConfig.name;

  return (
    <>
      <Head>
        <title>{`Página não encontrada | ${siteName}`}</title>
        <meta name="description" content="A página que você está procurando não existe ou foi removida." />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      <main id="main-content" className={styles.main}>
        <div className={styles.card}>
          <span data-testid="not-found-code" className={styles.code}>
            404
          </span>
          <h1 data-testid="not-found-title" className={styles.title}>
            Página não encontrada
          </h1>
          <p data-testid="not-found-message" className={styles.message}>
            A página que você está procurando não existe, foi removida ou o endereço digitado está incorreto.
          </p>
          <Link href="/" data-testid="not-found-home-link" className={styles.homeLink}>
            ← Voltar para a Página Inicial
          </Link>
        </div>
      </main>
    </>
  );
}
