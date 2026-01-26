import Head from 'next/head';
import { useState } from 'react';
import styles from '../styles/Admin.module.css';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  const [imageFile, setImageFile] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple authentication - in production, use proper auth
    if (username === 'admin' && password === 'password') {
      setIsAuthenticated(true);
    } else {
      alert('Credenciais inválidas');
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Imagem atualizada com sucesso!');
      } else {
        alert('Erro ao atualizar imagem');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao fazer upload da imagem');
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

          <div className={styles.preview}>
            <h3>Visualização</h3>
            <div className={styles.previewContent}>
              <h2>{title}</h2>
              <p>{subtitle}</p>
              {imageFile && (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className={styles.previewImage}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}