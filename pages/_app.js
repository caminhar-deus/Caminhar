import './styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Performance monitoring - apenas quando LOG_ROUTE_CHANGES está ativo
    const handleRouteChange = (url) => {
      if (process.env.NEXT_PUBLIC_LOG_ROUTE_CHANGES === 'true') {
        console.log(`[Router] Route changed to: ${url}`);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            fontSize: '1rem',
            padding: '1rem',
          },
          success: {
            style: {
              background: 'var(--color-success-100, #d1fae5)',
              color: 'var(--color-success-800, #065f46)',
            },
            iconTheme: {
              primary: 'var(--color-success-800, #065f46)',
              secondary: 'var(--color-success-100, #d1fae5)',
            },
          },
          error: {
            style: {
              background: 'var(--color-error-100, #fee2e2)',
              color: 'var(--color-error-800, #991b1b)',
            },
            iconTheme: {
              primary: 'var(--color-error-800, #991b1b)',
              secondary: 'var(--color-error-100, #fee2e2)',
            },
          },
        }}
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
