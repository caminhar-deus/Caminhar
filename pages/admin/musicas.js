import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';

export default function AdminMusicas() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [musicas, setMusicas] = useState([]);
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
          loadMusicas();
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

  // Load mock musicas data
  const loadMusicas = () => {
    const mockMusicas = [
      {
        id: 1,
        titulo: 'Espírito Santo',
        artista: 'Gabriel Guedes de Almeida',
        url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
        url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
      },
      {
        id: 2,
        titulo: 'Aos Olhos do Pai',
        artista: 'Gabriel Guedes de Almeida',
        url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
        url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
      },
      {
        id: 3,
        titulo: 'Teu Espírito',
        artista: 'Gabriel Guedes de Almeida',
        url_imagem: 'https://i.scdn.co/image/ab67616d0000b273145506915870515754553533',
        url_spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
      }
    ];
    setMusicas(mockMusicas);
  };

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
      loadMusicas();

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
          <title>Admin - Músicas - O Caminhar com Deus</title>
        </Head>

        <main className={styles.main}>
          <div className={styles.loginContainer}>
            <h1>Gestão de Músicas</h1>
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
        <title>Admin - Músicas - O Caminhar com Deus</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>Gestão de Músicas</h1>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>

          <div className={styles.navigation}>
            <a href="/admin" className={styles.navLink}>← Voltar ao Painel Principal</a>
          </div>

          <div className={styles.content}>
            <div className={styles.sectionHeader}>
              <h2>Músicas Cadastradas</h2>
              <button className={styles.addButton}>
                + Nova Música
              </button>
            </div>

            {musicas.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Artista</th>
                      <th>Imagem</th>
                      <th>Spotify URL</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {musicas.map((musica) => (
                      <tr key={musica.id}>
                        <td>{musica.id}</td>
                        <td>{musica.titulo}</td>
                        <td>{musica.artista}</td>
                        <td>
                          <img 
                            src={musica.url_imagem} 
                            alt={musica.titulo}
                            className={styles.tableImage}
                          />
                        </td>
                        <td>
                          <a 
                            href={musica.url_spotify} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.link}
                          >
                            Ver no Spotify
                          </a>
                          <div style={{ marginTop: '10px' }}>
                            <iframe 
                              data-testid="embed-iframe" 
                              style={{ borderRadius: '12px' }} 
                              src={`https://open.spotify.com/embed/track/${musica.url_spotify.split('/').pop()}?utm_source=generator&theme=0`} 
                              width="100%" 
                              height="352" 
                              frameBorder="0" 
                              allowfullscreen="" 
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                              loading="lazy"
                            ></iframe>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button className={styles.editButton}>Editar</button>
                            <button className={styles.deleteButton}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Nenhuma música cadastrada ainda.</p>
                <button className={styles.addButton}>
                  Cadastrar Primeira Música
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}