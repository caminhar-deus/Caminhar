import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/hooks';
import styles from './styles/login.module.css';

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
    const router = useRouter();
    const { isAuthenticated, isChecking, handleLogin, handleLogout, loginLoading, loginError } = useAdminAuth({ onLogoutRedirect: () => router.push('/admin') });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

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
          <main className={styles.main}>
            <h1>{title}</h1>
            <form onSubmit={async (e) => { e.preventDefault(); await handleLogin(username, password); }} className={styles.loginForm}>
              <input
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.loginInput}
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.loginInput}
                required
              />
              <button type="submit" className={styles.button} disabled={loginLoading}>
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>
              {loginError && <div className={styles.error}>{loginError}</div>}
            </form>
          </main>
        </div>
      );
    }

    return (
      <div className={styles.container}>
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
