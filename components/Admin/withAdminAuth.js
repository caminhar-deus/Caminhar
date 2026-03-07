import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';

// Componente de formulário de login extraído para reutilização
const LoginForm = ({ onLoginSuccess, title }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Falha no login');
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h1>{title}</h1>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
};

/**
 * Higher-Order Component (HOC) para proteger páginas administrativas.
 * Ele gerencia o estado de autenticação, exibe um formulário de login
 * ou renderiza o componente da página dentro de um layout padrão de admin.
 * @param {React.Component} WrappedComponent - O componente da página a ser protegido.
 * @param {object} options - Opções de configuração.
 * @param {string} options.title - O título a ser exibido no cabeçalho da página e no <Head>.
 */
const withAdminAuth = (WrappedComponent, { title }) => {
  const AuthenticatedComponent = (props) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/check', { method: 'GET', credentials: 'include' });
          if (response.ok) setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
        } finally {
          setIsChecking(false);
        }
      };
      checkAuth();
    }, []);

    const handleLogout = async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setIsAuthenticated(false);
      router.push('/admin');
    };

    if (isChecking) {
      return <div className={styles.container}><main className={styles.main}>Verificando autenticação...</main></div>;
    }

    if (!isAuthenticated) {
      return (
        <div className={styles.container}>
          <Head><title>Admin Login - {title}</title></Head>
          <main className={styles.main}><LoginForm title={title} onLoginSuccess={() => setIsAuthenticated(true)} /></main>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <Head><title>Admin - {title}</title></Head>
        <main className={styles.main}>
          <div className={styles.adminPanel}>
            <div className={styles.header}>
              <h1>{title}</h1>
              <button onClick={handleLogout} className={styles.logoutButton}>Sair</button>
            </div>
            <div className={styles.navigation}>
              <a href="/admin" className={styles.navLink}>← Voltar ao Painel Principal</a>
            </div>
            <WrappedComponent {...props} />
          </div>
        </main>
      </div>
    );
  };

  return AuthenticatedComponent;
};

export default withAdminAuth;