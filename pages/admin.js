import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Admin.module.css';
import AdminPostManager from '../components/AdminPostManager';
import AdminRateLimit from '../components/AdminRateLimit';
import AdminIntegrityCheck from '../components/AdminIntegrityCheck';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  const [imageFile, setImageFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
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
          await loadSettings();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  // Load settings from database
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const settings = await response.json();
          setTitle(settings.site_title || 'O Caminhar com Deus');
          setSubtitle(settings.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
          if (settings.site_image) setCurrentImageUrl(settings.site_image);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
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
        // Se não for JSON (ex: erro 404 ou 500 HTML), lança um erro legível
        throw new Error(`Erro de conexão com o servidor (${response.status})`);
      }

      if (!response.ok) {
        throw new Error((data && data.message) || 'Falha no login');
      }

      setIsAuthenticated(true);
      console.log('Login successful:', data.user);

    } catch (error) {
      setError(error.message);
      console.warn('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('uploadType', 'site_image');

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.path) setCurrentImageUrl(data.path);
          setImageFile(null);
          alert('Imagem atualizada com sucesso!');
        } else {
          console.error('Resposta inválida do servidor (não é JSON)');
          alert('Erro: O servidor retornou uma resposta inválida.');
        }
      } else {
        alert('Erro ao atualizar imagem');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao fazer upload da imagem');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save title setting
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'site_title',
          value: title,
          type: 'string',
          description: 'Website title'
        }),
      });

      // Save subtitle setting
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'site_subtitle',
          value: subtitle,
          type: 'string',
          description: 'Website subtitle'
        }),
      });

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Admin - O Caminhar com Deus</title>
        </Head>

        <main className={styles.main}>
          <div className={styles.loginContainer}>
            <h1>Área Administrativa</h1>
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
        <title>Admin - O Caminhar com Deus</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.adminPanel}>
          <h1>Painel Administrativo</h1>

          <div className={styles.tabs}>
            <button
              className={`${styles.tabButton} ${activeTab === 'posts' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Post/Artigos
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'header' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('header')}
            >
              Configurações de Cabeçalho
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'security' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Segurança
            </button>
          </div>

          {activeTab === 'header' && (
            <>
              <div className={styles.formGroup}>
                <label>Título da Página</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Subtítulo</label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Imagem Principal (1100x320)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className={styles.input}
                />
                <button onClick={handleImageUpload} className={styles.button}>
                  Atualizar Imagem
                </button>
              </div>

              <div className={styles.formGroup}>
                <button
                  onClick={handleSaveSettings}
                  className={styles.button}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>

              <div className={styles.preview}>
                <h3>Visualização</h3>
                <div className={styles.previewContent}>
                  <h2>{title}</h2>
                  <p>{subtitle}</p>
                  {imageFile ? (
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className={styles.previewImage}
                    />
                  ) : currentImageUrl && (
                    <img
                      src={currentImageUrl}
                      alt="Current Header"
                      className={styles.previewImage}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'posts' && (
            <AdminPostManager />
          )}

          {activeTab === 'security' && (
            <>
              <AdminRateLimit />
              <AdminIntegrityCheck />
            </>
          )}
        </div>
      </main>
    </div>
  );
}