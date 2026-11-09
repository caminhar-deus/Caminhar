import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import { resolveNext } from '@/utils/resolve-next';
import styles from './styles/CustomerPages.module.css';

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nextUrl = resolveNext(router?.query, '/minha-conta');

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

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
      setErrorMessage(
        'O acesso rápido com Google requer a configuração de NEXT_PUBLIC_GOOGLE_CLIENT_ID no ambiente. Utilize seu e-mail e senha abaixo.'
      );
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (googleResponse) => {
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
          await router.push(nextUrl);
        } catch {
          setErrorMessage('Erro ao comunicar com o servidor durante o login com Google.');
          setSubmitting(false);
        }
      },
    });
    window.google.accounts.id.prompt();
  };

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

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className={styles.googleButton}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.77 0-.8-.08-1.57-.22-2.32Z"
            />
            <path
              fill="currentColor"
              d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.27 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.94 22 12.18 22Z"
            />
          </svg>
          Sign in with Google
        </button>
      </main>
    </div>
  );
}
