import Head from 'next/head';
import { useState } from 'react';
import { useAdminAuth } from '@/hooks';
import styles from './styles/Admin.module.css';

/**
 * Higher-Order Component (HOC) para proteger páginas administrativas.
 * Utiliza o hook useAdminAuth para gerenciar autenticação,
 * exibe formulário de login ou renderiza o componente protegido.
 * @param {React.Component} WrappedComponent - O componente da página a ser protegido.
 * @param {object} options - Opções de configuração.
 * @param {string} options.title - O título a ser exibido no cabeçalho da página e no <Head>.
 */
const withAdminAuth = (WrappedComponent, { title }) => {
  const AuthenticatedComponent = (props) => {
    const { isAuthenticated, isChecking, handleLogin, handleLogout, loginLoading, loginError } = useAdminAuth();

    if (isChecking) {
      return (
        <div className={styles.container}>
          <main className={styles.main}>Verificando autenticação...</main>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className={styles.container}>
          <Head><title>Admin Login - {title}</title></Head>
          <main className={styles.main}>
            <LoginForm
              title={title}
              onLogin={handleLogin}
              loginLoading={loginLoading}
              loginError={loginError}
            />
          </main>
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

// Componente de formulário de login (presentacional, recebe props)
const LoginForm = ({ title, onLogin, loginLoading, loginError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className={styles.loginContainer}>
      <h1>{title}</h1>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
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
        <button type="submit" className={styles.button} disabled={loginLoading}>
          {loginLoading ? 'Entrando...' : 'Entrar'}
        </button>
        {loginError && <div className={styles.error}>{loginError}</div>}
      </form>
    </div>
  );
};

export default withAdminAuth;