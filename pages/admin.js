import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Cropper from 'react-easy-crop';
import styles from '../styles/Admin.module.css';
import AdminPostsNew from '../components/Admin/AdminPostsNew';
import RateLimitViewer from '../components/Admin/Tools/RateLimitViewer';
import IntegrityCheck from '../components/Admin/Tools/IntegrityCheck';
import BackupManager from '../components/Admin/Managers/BackupManager';
import CacheManager from '../components/Admin/Managers/CacheManager';
import AdminMusicasNew from '../components/Admin/AdminMusicasNew';
import AdminVideosNew from '../components/Admin/AdminVideosNew';

// Função utilitária para redimensionar imagens no navegador
const resizeImage = (file, maxWidth = 1100, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, file.type, quality);
      };
    };
  });
};

// Função utilitária para recortar a imagem (Crop)
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas is empty'));
        resolve(new File([blob], 'cropped.webp', { type: 'image/webp' }));
      }, 'image/webp', 0.95);
    };
    image.onerror = reject;
  });
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  const [imageFile, setImageFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Estados para o Cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const settings = await response.json();
          setTitle(settings.site_title || 'O Caminhar com Deus');
          setSubtitle(settings.site_subtitle || 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
          if (settings.home_image_url) setCurrentImageUrl(settings.home_image_url);
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
    formData.append('uploadType', 'setting_home_image');

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
          setOriginalSize(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleCancelSelection = () => {
    setImageFile(null);
    setOriginalSize(0);
    setIsCropping(false);
    setCropImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    try {
      const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      // Redimensiona após o crop para garantir largura máxima de 1100px
      const resizedFile = await resizeImage(croppedImage);
      setImageFile(resizedFile);
      setIsCropping(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao recortar imagem');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save title setting
      await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
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
        credentials: 'include',
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
              <span className="icon">📝</span>
              Posts/Artigos
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'projetos01' ? styles.activeTab : ''}`}
              disabled
            >
              <span className="icon">🏗️</span>
              Projetos Futuros 01
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'musicas' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('musicas')}
            >
              <span className="icon">🎵</span>
              Gestão de Músicas
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'videos' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <span className="icon">🎬</span>
              Gestão de Vídeos
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'projetos02' ? styles.activeTab : ''}`}
              disabled
            >
              <span className="icon">🏗️</span>
              Projetos Futuros 02
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'header' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('header')}
            >
              <span className="icon">🎨</span>
              Configuração de Cabeçalho
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'security' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span className="icon">🔒</span>
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Limite de segurança para processamento no navegador (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        alert('O arquivo é muito grande para ser processado (>10MB).');
                        e.target.value = '';
                        setImageFile(null);
                        setOriginalSize(0);
                        return;
                      }

                      setOriginalSize(file.size);
                      
                      // Lê o arquivo para o Cropper
                      const reader = new FileReader();
                      reader.addEventListener('load', () => {
                        setCropImageSrc(reader.result);
                        setIsCropping(true);
                      });
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={styles.input}
                />
                
                {isCropping && cropImageSrc ? (
                  <div style={{ margin: '20px 0', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: 400, width: '100%', background: '#333' }}>
                      <Cropper
                        image={cropImageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1100 / 320}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div style={{ padding: '15px', background: '#f8f9fa', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Zoom:</span>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        onClick={handleCropConfirm}
                        className={styles.button}
                        style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                      >
                        Recortar & Confirmar
                      </button>
                    </div>
                  </div>
                ) : imageFile && (
                  <div style={{ margin: '15px 0' }}>
                    <p style={{ marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Pré-visualização da seleção:</p>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                      <div>📦 <strong>Original:</strong> {(originalSize / 1024).toFixed(2)} KB</div>
                      <div>✨ <strong>Otimizado:</strong> {(imageFile.size / 1024).toFixed(2)} KB</div>
                      <div style={{ color: '#28a745', marginTop: '4px', fontWeight: '600' }}>📉 Economia de {originalSize > 0 ? ((1 - imageFile.size / originalSize) * 100).toFixed(0) : 0}%</div>
                    </div>
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Pré-visualização" 
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                )}
                {(imageFile || isCropping) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button 
                      onClick={handleCancelSelection} 
                      className={styles.button}
                      style={{ backgroundColor: '#6c757d' }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    onClick={handleImageUpload} 
                    className={styles.button}
                    disabled={!imageFile || isCropping}
                  >
                    Atualizar Imagem
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className={styles.button}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
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
            <AdminPostsNew />
          )}

          {activeTab === 'security' && (
            <>
              <RateLimitViewer />
              <IntegrityCheck />
              <BackupManager />
              <CacheManager />
            </>
          )}

          {activeTab === 'musicas' && (
            <AdminMusicasNew />
          )}

          {activeTab === 'videos' && (
            <AdminVideosNew />
          )}

          {activeTab === 'projetos01' && (
            <div className={styles.content}>
              <div className={styles.sectionHeader}>
                <h2>Projetos Futuros 01</h2>
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
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'projetos02' && (
            <div className={styles.content}>
              <div className={styles.sectionHeader}>
                <h2>Projetos Futuros 02</h2>
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
                  <li>Ministérios</li>
                  <li>Loja Virtual</li>
                  <li>Outros projetos</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}