import Head from 'next/head';
import Link from 'next/link';
import { siteConfig } from '../lib/seo/config';

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

      <main
        id="main-content"
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-primary, #f8f9fa)',
          color: 'var(--color-text-primary, #1e293b)',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: 'var(--color-bg-card, #ffffff)',
            padding: '48px 32px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            border: '1px solid var(--color-border-light, #e2e8f0)',
          }}
        >
          <span
            data-testid="not-found-code"
            style={{
              fontSize: '4.5rem',
              fontWeight: '800',
              color: 'var(--color-primary-500, #2563eb)',
              display: 'block',
              lineHeight: '1',
              marginBottom: '16px',
            }}
          >
            404
          </span>
          <h1
            data-testid="not-found-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--color-text-primary, #1e293b)',
            }}
          >
            Página não encontrada
          </h1>
          <p
            data-testid="not-found-message"
            style={{
              fontSize: '1rem',
              color: 'var(--color-text-secondary, #64748b)',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            A página que você está procurando não existe, foi removida ou o endereço digitado está incorreto.
          </p>
          <Link
            href="/"
            data-testid="not-found-home-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 28px',
              backgroundColor: 'var(--color-primary-500, #2563eb)',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'background-color 0.2s ease',
            }}
          >
            ← Voltar para a Página Inicial
          </Link>
        </div>
      </main>
    </>
  );
}
