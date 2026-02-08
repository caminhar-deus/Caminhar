import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';

export default function AdminVideos() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState([]);
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
          loadVideos();
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

  // Load mock videos data
  const loadVideos = () => {
    const mockVideos = [
      {
        id: 1,
        titulo: 'Espírito Santo - Mensagem Poderosa',
        url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      {
        id: 2,
        titulo: 'Aos Olhos do Pai - Louvor e Adoração',
        url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      {
        id: 3,
        titulo: 'Teu Espírito - Ministério de Louvor',
        url_youtube_embed: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    ];
    setVideos(mockVideos);
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
      loadVideos();

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
          <title>Admin - Vídeos - O Caminhar com Deus</title>
        </Head>

        <main className={styles.main}>
          <div className={styles.loginContainer}>
            <h1>Gestão de Vídeos</h1>
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
        <title>Admin - Vídeos - O Caminhar com Deus</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h1>Gestão de Vídeos</h1>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>

          <div className={styles.navigation}>
            <a href="/admin" className={styles.navLink}>← Voltar ao Painel Principal</a>
          </div>

          <div className={styles.content}>
            <div className={styles.sectionHeader}>
              <h2>Vídeos Cadastrados</h2>
              <button className={styles.addButton}>
                + Novo Vídeo
              </button>
            </div>

            {videos.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>YouTube URL</th>
                      <th>Preview</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video) => (
                      <tr key={video.id}>
                        <td>{video.id}</td>
                        <td>{video.titulo}</td>
                        <td>
                          <a 
                            href={video.url_youtube_embed} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.link}
                          >
                            Ver no YouTube
                          </a>
                        </td>
                        <td>
                          <div className={styles.videoPreview}>
                            <iframe
                              src={`https://www.youtube.com/embed/${video.url_youtube_embed.split('v=')[1]}?autoplay=0`}
                              width="120"
                              height="67.5"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={`Preview ${video.titulo}`}
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
                <p>Nenhum vídeo cadastrado ainda.</p>
                <button className={styles.addButton}>
                  Cadastrar Primeiro Vídeo
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}