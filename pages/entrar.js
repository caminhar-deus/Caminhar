import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import { resolveNext } from '@/utils/resolve-next';
import styles from './styles/CustomerPages.module.css';

let googleScriptPromise = null;

function getGoogleClientId() {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
}

function resolveGoogleButtonWidth(hostEl) {
  const measuredWidth = hostEl?.clientWidth || hostEl?.parentElement?.clientWidth || 0;
  if (measuredWidth > 0) {
    return Math.max(200, Math.min(400, Math.floor(measuredWidth)));
  }
  const viewportWidth =
    typeof window !== 'undefined' && Number.isFinite(window.innerWidth) && window.innerWidth > 0
      ? window.innerWidth
      : 0;
  if (viewportWidth > 0) {
    return Math.max(200, Math.min(360, Math.floor(viewportWidth - 96)));
  }
  return 320;
}

function attachScriptListeners(scriptEl, resolve, reject) {
  scriptEl.addEventListener(
    'load',
    () => {
      scriptEl.dataset.loaded = 'true';
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        scriptEl.remove();
        reject(new Error('SDK do Google não inicializou corretamente.'));
      }
    },
    { once: true }
  );
  scriptEl.addEventListener(
    'error',
    () => {
      scriptEl.remove();
      reject(new Error('Não foi possível carregar o SDK do Google.'));
    },
    { once: true }
  );
}

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services disponível apenas no navegador.'));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }
  if (googleScriptPromise && !document.querySelector('script[data-google-gsi="true"]')) {
    googleScriptPromise = null;
  }
  if (!googleScriptPromise) {
    const currentPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-gsi="true"]');
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          existing.remove();
        } else {
          attachScriptListeners(existing, resolve, reject);
          return;
        }
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = 'true';
      attachScriptListeners(script, resolve, reject);
      document.head.appendChild(script);
    }).finally(() => {
      if (googleScriptPromise === currentPromise) {
        googleScriptPromise = null;
      }
    });
    googleScriptPromise = currentPromise;
  }
  return googleScriptPromise;
}

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleStatus, setGoogleStatus] = useState('idle');
  const [googleRetryCount, setGoogleRetryCount] = useState(0);

  const googleButtonRef = useRef(null);
  const nextUrl = resolveNext(router?.query, '/minha-conta');
  const nextUrlRef = useRef(nextUrl);
  const routerRef = useRef(router);
  nextUrlRef.current = nextUrl;
  routerRef.current = router;

  useEffect(() => {
    let active = true;
    fetch('/api/customer/auth')
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.authenticated) {
          router.replace(nextUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [nextUrl, router]);

  const handleGoogleCredentialResponse = useCallback(async (googleResponse) => {
    if (!googleResponse?.credential) {
      setErrorMessage(
        'Não foi possível obter a credencial do Google. Tente novamente ou use seu e-mail e senha.'
      );
      return;
    }

    setErrorMessage('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'google', credential: googleResponse.credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || 'Falha ao autenticar com Google.');
        setSubmitting(false);
        return;
      }
      await routerRef.current.push(nextUrlRef.current);
    } catch {
      setErrorMessage('Erro ao comunicar com o servidor durante o login com Google.');
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
      setGoogleStatus('unconfigured');
      return undefined;
    }

    let cancelled = false;
    setGoogleStatus('loading');

    loadGoogleIdentityScript()
      .then((googleId) => {
        if (cancelled || !googleButtonRef.current) return;

        googleId.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const buttonWidth = resolveGoogleButtonWidth(googleButtonRef.current);

        // Evita duplicação caso o React StrictMode re-execute o efeito em dev
        googleButtonRef.current.innerHTML = '';
        googleId.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'pt-BR',
          width: buttonWidth,
        });

        setGoogleStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleRetryCount, handleGoogleCredentialResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const payload =
        mode === 'register'
          ? { action: 'register', name, email, phone, password }
          : { action: 'login', email, password };

      const response = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data.message || 'Não foi possível concluir o acesso. Verifique os dados informados.');
        setSubmitting(false);
        return;
      }

      await router.push(nextUrl);
    } catch {
      setErrorMessage('Sem conexão com o servidor. Tente novamente em instantes.');
      setSubmitting(false);
    }
  };

  const handleGoogleFallbackClick = () => {
    setErrorMessage(
      'O acesso rápido com Google requer a configuração de NEXT_PUBLIC_GOOGLE_CLIENT_ID no ambiente. Utilize seu e-mail e senha abaixo.'
    );
  };

  const isGoogleHostVisible = googleStatus !== 'unconfigured' && googleStatus !== 'error';
  const googleHostClassName = !isGoogleHostVisible
    ? styles.googleButtonHostHidden
    : submitting
      ? styles.googleButtonHostDisabled
      : styles.googleButtonHost;

  return (
    <div className={styles.pageWrapper}>
      <Head>
        <title>{`${mode === 'login' ? 'Entrar na Conta' : 'Criar Conta'} — O Caminhar com Deus`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main id="main-content" className={styles.narrowCard}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <AppIcon name="chevronLeft" size={16} />
            Voltar ao site
          </Link>
        </div>

        <h1 className={styles.pageTitle}>
          {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
        </h1>
        <p className={styles.pageSubtitle}>
          Acompanhe seus pedidos e compras diretas realizadas na aba Produtos Religiosos.
        </p>

        <div className={styles.modeTabs} role="tablist" aria-label="Opções de acesso">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? styles.modeTabButtonActive : styles.modeTabButton}
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
          >
            Já tenho conta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? styles.modeTabButtonActive : styles.modeTabButton}
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
          >
            Criar conta
          </button>
        </div>

        {errorMessage && (
          <div className={styles.alertError} role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className={styles.formGroup}>
              <label htmlFor="customer-name" className={styles.label}>
                Nome completo
              </label>
              <input
                id="customer-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder="Ex.: Maria da Silva"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="customer-email" className={styles.label}>
              E-mail
            </label>
            <input
              id="customer-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="seuemail@exemplo.com"
            />
          </div>

          {mode === 'register' && (
            <div className={styles.formGroup}>
              <label htmlFor="customer-phone" className={styles.label}>
                Telefone / WhatsApp (opcional)
              </label>
              <input
                id="customer-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
                placeholder="(11) 99999-9999"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="customer-password" className={styles.label}>
              Senha {mode === 'register' ? '(mínimo de 8 caracteres)' : ''}
            </label>
            <input
              id="customer-password"
              type="password"
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            {mode === 'login' ? 'Entrar' : 'Cadastrar e Continuar'}
          </Button>
        </form>

        <div className={styles.divider}>ou</div>

        <div className={styles.googleSection}>
          <div
            ref={googleButtonRef}
            hidden={!isGoogleHostVisible}
            className={googleHostClassName}
            aria-busy={googleStatus === 'loading' || submitting}
          />

          {googleStatus === 'loading' && (
            <p className={styles.googleLoadingText} role="status">
              Carregando acesso com Google...
            </p>
          )}

          {googleStatus === 'error' && (
            <>
              <p className={styles.helperText} role="status">
                Não foi possível carregar o acesso com Google. Verifique sua conexão ou bloqueadores de script, ou use e-mail e senha acima.
              </p>
              <button
                type="button"
                onClick={() => {
                  setGoogleStatus('loading');
                  setGoogleRetryCount((c) => c + 1);
                }}
                disabled={submitting}
                className={styles.googleButton}
              >
                Tentar novamente com Google
              </button>
            </>
          )}

          {googleStatus === 'unconfigured' && (
            <button
              type="button"
              onClick={handleGoogleFallbackClick}
              disabled={submitting}
              className={styles.googleButton}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.77 0-.8-.08-1.57-.22-2.32Z"
                />
                <path
                  fill="currentColor"
                  d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.27 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H0v3.73C2.64 18.4 7.04 22 12.18 22Z"
                />
                <path
                  fill="currentColor"
                  d="M3.22 13.43a6.06 6.06 0 0 1 0-3.86V5.84H0a10.02 10.02 0 0 0 0 9.32l3.22-1.73Z"
                />
                <path
                  fill="currentColor"
                  d="M12.18 5.97c1.77 0 3.35.61 4.6 1.8l3.45-3.45C18.12 2.38 15.4 1.5 12.18 1.5 7.04 1.5 2.64 5.1 0 9.84l3.22 2.49c1.26-3.79 4.79-6.36 8.96-6.36Z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
