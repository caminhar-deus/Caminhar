import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Performance monitoring
    const handleRouteChange = (url) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Route changed to: ${url}`);
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
              background: '#d4edda',
              color: '#155724',
            },
            iconTheme: {
              primary: '#155724',
              secondary: '#d4edda',
            },
          },
          error: {
            style: {
              background: '#f8d7da',
              color: '#721c24',
            },
            iconTheme: {
              primary: '#721c24',
              secondary: '#f8d7da',
            },
          },
        }}
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
