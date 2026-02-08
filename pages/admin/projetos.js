import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';

export default function AdminProjetos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Check authentication status on component mount
  useEffect(() => {
    // Check if user is authenticated by checking for token
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Redirect to main admin page if not authenticated
          router.push('/admin');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erro de conexão com o servidor (${response.status})`);
      }

      if (!response.ok) {
        throw new Error((data && data.message) || 'Falha no login');
      }

      setIsAuthenticated(true);

    } catch (error) {
      setError(error.message);
      console.warn('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsAuthenticated(false);
      router.push('/admin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Admin - Projetos Futuros - O Caminhar com Deus</title>
        </Head>

        <main className={styles.main}>
          <div className={styles.loginContainer}>
            <h1>Projetos Futuros</h1>
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
              <button type="submit" className={styles.button}>
                Entrar
              </button>
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Admin - Projetos Futuros - O Caminhar com Deus</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>Projetos Futuros</h1>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>

          <div className={styles.navigation}>
            <a href="/admin" className={styles.navLink}>← Voltar ao Painel Principal</a>
          </div>

          <div className={styles.content}>
            <div className={styles.sectionHeader}>
              <h2>Áreas em Desenvolvimento</h2>
            </div>

            <div className={styles.placeholderContainer}>
              <div className={styles.placeholderCard}>
                <div className={styles.placeholderIcon}>🏗️</div>
                <h3>Em Desenvolvimento</h3>
                <p>Esta área está em desenvolvimento e será implementada em breve.</p>
                <div className={styles.placeholderImage}>
                  <div className={styles.imagePlaceholder}>
                    <span>Conteúdo será implementado</span>
                  </div>
                </div>
                <div className={styles.placeholderActions}>
                  <button className={styles.placeholderButton} disabled>
                    Em Breve
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <h3>Próximos Projetos</h3>
              <ul>
                <li>Área de Downloads</li>
                <li>Eventos e Agenda</li>
                <li>Testemunhos</li>
                <li>Ministérios</li>
                <li>Loja Virtual</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}