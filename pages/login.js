import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/UI';
import styles from './styles/Login.module.css';

/**
 * Página de login geral do site (rota /login).
 * Spec: design-system/pages/login.md (override do MASTER).
 * Contrato da API: POST /api/auth/login com { username, password } (cookie httpOnly).
 */

const MSG = {
  summaryValidation: 'Não foi possível entrar:',
  invalidCredentials: 'Usuário ou senha incorretos. Tente de novo.',
  rateLimited: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  generic: 'Não foi possível entrar. Tente de novo em instantes.',
  network: 'Sem conexão. Verifique sua internet e tente de novo.',
  emptyUsername: 'Informe seu nome de usuário.',
  emptyPassword: 'Informe sua senha.',
};

/** Valida um campo individualmente (usado no blur e no submit). */
function validateField(name, value) {
  if (name === 'username') {
    return value.trim() ? '' : MSG.emptyUsername;
  }
  return value ? '' : MSG.emptyPassword;
}

/**
 * Resolve o destino pós-login a partir de ?next= / ?returnUrl=.
 * Validação por resolução de URL (não por substring): o candidato precisa
 * começar com "/", não conter "//", "://", caracteres de controle (CRLF etc.)
 * nem "\\", e ao resolver contra um host fixo precisa manter a mesma origem.
 * Qualquer outro valor cai para /admin (evita open redirect).
 */
function resolveNext(query) {
  const first = (value) => (Array.isArray(value) ? value[0] : value);
  const candidate = first(query?.next) || first(query?.returnUrl);
  if (typeof candidate !== 'string') return '/admin';
  if (
    !candidate.startsWith('/') ||
    candidate.includes('//') ||
    candidate.includes('://') ||
    // eslint-disable-next-line no-control-regex -- rejeição deliberada de controles (CRLF etc.)
    /[\x00-\x1F\x7F\\]/.test(candidate)
  ) {
    return '/admin';
  }
  try {
    const resolved = new URL(candidate, 'https://x.local');
    return resolved.origin === 'https://x.local' ? candidate : '/admin';
  } catch {
    return '/admin';
  }
}

const cx = (...classes) => classes.filter(Boolean).join(' ');

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.69 3.69m7.879 7.879L21 21M6.228 6.228l15.757 15.757" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const summaryRef = useRef(null);
  const passwordRef = useRef(null);

  // Foco programático no resumo após falha no submit
  useEffect(() => {
    if (summary) {
      summaryRef.current?.focus();
    }
  }, [summary]);

  const handleBlur = (field) => () => {
    const value = field === 'username' ? username : password;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  // Alterna a visibilidade sem limpar o valor nem tirar o foco do input
  const handleTogglePassword = () => {
    setShowPassword((visible) => !visible);
    passwordRef.current?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const errors = {
      username: validateField('username', username),
      password: validateField('password', password),
    };
    setFieldErrors(errors);

    const items = [];
    if (errors.username) items.push({ href: '#login-usuario', text: errors.username });
    if (errors.password) items.push({ href: '#login-senha', text: errors.password });

    if (items.length > 0) {
      setSummary({ message: MSG.summaryValidation, items });
      return;
    }

    setSummary(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        await router.push(resolveNext(router.query));
        return;
      }

      let message;
      if (res.status === 401) {
        message = MSG.invalidCredentials;
      } else if (res.status === 429) {
        message = MSG.rateLimited;
      } else {
        // 400/403/500: copy genérica do arquivo; data.message só como fallback
        message = MSG.generic || data.message;
      }
      setSummary({ message });
    } catch {
      setSummary({ message: MSG.network });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Entrar | Caminhar</title>
        <meta name="robots" content="noindex,follow" />
      </Head>

      <main className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Acesso à conta</p>
          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>Acesse sua conta para continuar.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={loading}>
          {summary && (
            <div
              className={styles.errorSummary}
              role="alert"
              tabIndex={-1}
              id="login-erro-resumo"
              ref={summaryRef}
            >
              <p>{summary.message}</p>
              {summary.items && summary.items.length > 0 && (
                <ul className={styles.summaryList}>
                  {summary.items.map((item) => (
                    <li key={item.href}>
                      <a href={item.href}>{item.text}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className={styles.requiredNote}>Todos os campos são obrigatórios</p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-usuario">
              Usuário
            </label>
            <input
              className={cx(styles.input, fieldErrors.username && styles.inputInvalid)}
              id="login-usuario"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="Seu nome de usuário"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={handleBlur('username')}
              disabled={loading}
              aria-invalid={fieldErrors.username ? 'true' : undefined}
              aria-describedby={fieldErrors.username ? 'login-usuario-erro' : undefined}
            />
            {fieldErrors.username && (
              <p className={styles.fieldError} id="login-usuario-erro">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-senha">
              Senha
            </label>
            <div className={styles.inputWrap}>
              <input
                ref={passwordRef}
                className={cx(
                  styles.input,
                  styles.hasToggle,
                  fieldErrors.password && styles.inputInvalid
                )}
                id="login-senha"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={handleBlur('password')}
                disabled={loading}
                aria-invalid={fieldErrors.password ? 'true' : undefined}
                aria-describedby={fieldErrors.password ? 'login-senha-erro' : undefined}
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={handleTogglePassword}
                onMouseDown={(event) => event.preventDefault()}
                disabled={loading}
                aria-label="Mostrar senha"
                aria-pressed={showPassword}
                aria-controls="login-senha"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className={styles.fieldError} id="login-senha-erro">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className={styles.forgotRow}>
            <a className={styles.link} href="/esqueci-senha">
              Esqueci minha senha
            </a>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            className={styles.submitButton}
          >
            <span aria-live="polite">{loading ? 'Entrando…' : 'Entrar'}</span>
          </Button>

          {loading && (
            <p role="status" className={styles.loadingStatus}>
              Entrando…
            </p>
          )}
        </form>

        <p className={styles.footer}>
          Ainda não tem conta?{' '}
          <a className={styles.link} href="/">
            Voltar ao início
          </a>
        </p>
      </main>
    </div>
  );
}
