import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Cropper from 'react-easy-crop';
import loginStyles from '../components/Admin/styles/login.module.css';
import tabsStyles from '../components/Admin/styles/tabs.module.css';
import formStyles from '../components/Admin/styles/form.module.css';
import miscStyles from '../components/Admin/styles/misc.module.css';
import { toPermissionArray } from '../lib/domain/permissions.js';
import { Sidebar } from '@/components/Layout/Sidebar';
import { AppIcon } from '@/components/UI/icons';

/**
 * Ponto único de normalização do estado `currentUser`.
 * `permissions` é SEMPRE `string[]` venha de onde vier (login, /api/auth/check,
 * fallback) — `toPermissionArray` aceita array (passthrough) e string JSON.
 *
 * @param {Object|null} user
 * @returns {Object|null}
 */
const normalizeCurrentUser = (user) =>
  user ? { ...user, permissions: toPermissionArray(user.permissions) } : user;

// Ordem canônica das 10 abas principais (docs/ARQUITETURA_SITE_PRIVADO.md §2 e §9)
const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', permission: 'Visão Geral', label: 'Visão Geral', icon: 'chart' },
  { key: 'posts', permission: 'Posts/Artigos', label: 'Posts/Artigos', icon: 'fileText' },
  { key: 'musicas', permission: 'Gestão de Músicas', label: 'Gestão de Músicas', icon: 'music' },
  { key: 'videos', permission: 'Gestão de Vídeos', label: 'Gestão de Vídeos', icon: 'video' },
  { key: 'projetos02', permission: 'Gestão de Produtos', label: 'Gestão de Produtos', icon: 'package' },
  { key: 'dicas', permission: 'Gestão de Dicas', label: 'Gestão de Dicas', icon: 'lightbulb' },
  { key: 'header', permission: 'Configuração de Cabeçalho', label: 'Configuração de Cabeçalho', icon: 'palette' },
  { key: 'security', permission: 'Segurança', label: 'Segurança', icon: 'lock' },
  { key: 'users', permission: 'Usuários', label: 'Usuários', icon: 'users' },
  { key: 'logs', permission: 'Auditoria', label: 'Auditoria', icon: 'history' },
];

const SECURITY_SUBTABS = [
  { key: 'integrity', icon: 'shield', label: 'Verificação de Integridade' },
  { key: 'backup', icon: 'database', label: 'Backup do Sistema' },
  { key: 'ratelimit', icon: 'lock', label: 'Rate Limiting' },
  { key: 'cache', icon: 'zap', label: 'Cache do Sistema' },
];

// Mapeamento explícito para evitar conflito de classes com mesmo nome entre módulos
const styles = {
  // login.module.css
  container: loginStyles.container,
  authLoadingMain: loginStyles.authLoadingMain,
  authLoadingCard: loginStyles.authLoadingCard,
  authLoadingText: loginStyles.authLoadingText,

  // tabs.module.css
  adminMainContainer: tabsStyles.adminMainContainer,
  adminHeader: tabsStyles.adminHeader,
  adminUserGroup: tabsStyles.adminUserGroup,
  adminGreeting: tabsStyles.adminGreeting,
  logoutButton: tabsStyles.logoutButton,
  adminPanel: tabsStyles.adminPanel,
  tabs: tabsStyles.tabs,
  tabButton: tabsStyles.tabButton,
  activeTab: tabsStyles.activeTab,
  icon: tabsStyles.icon,

  // form.module.css
  formGroup: formStyles.formGroup,
  input: formStyles.input,

  // misc.module.css
  button: miscStyles.button,
  secondaryButton: miscStyles.secondaryButton,
  preview: miscStyles.preview,
  previewContent: miscStyles.previewContent,
  previewImage: miscStyles.previewImage,
  errorMessage: miscStyles.errorMessage,
  alertTitle: miscStyles.alertTitle,
  alertBody: miscStyles.alertBody,
  emptyState: miscStyles.emptyState,
  emptyStateTitle: miscStyles.emptyStateTitle,
  fileRow: miscStyles.fileRow,
  fileName: miscStyles.fileName,
  hiddenInput: miscStyles.hiddenInput,
  cropperBox: miscStyles.cropperBox,
  cropperStage: miscStyles.cropperStage,
  cropperControls: miscStyles.cropperControls,
  cropperZoomLabel: miscStyles.cropperZoomLabel,
  cropperRange: miscStyles.cropperRange,
  selectionPreview: miscStyles.selectionPreview,
  selectionTitle: miscStyles.selectionTitle,
  statsBox: miscStyles.statsBox,
  statLine: miscStyles.statLine,
  statSavings: miscStyles.statSavings,
  selectionImage: miscStyles.selectionImage,
  buttonGroup: miscStyles.buttonGroup,
};
import AdminPosts from '../components/Admin/AdminPosts';
import RateLimitViewer from '../components/Admin/Tools/RateLimitViewer';
import IntegrityCheck from '../components/Admin/Tools/IntegrityCheck';
import BackupManager from '../components/Admin/Managers/BackupManager';
import CacheManager from '../components/Admin/Managers/CacheManager';
import AdminMusicas from '../components/Admin/AdminMusicas';
import AdminVideos from '../components/Admin/AdminVideos';
import AdminProducts from '../components/Admin/AdminProducts';
import AdminDicas from '../components/Admin/AdminDicas';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/UI';
import AdminDashboard from '../components/Admin/AdminDashboard';
import AdminUsers from '../components/Admin/AdminUsers';
import AdminAudit from '../components/Admin/AdminAudit';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [title, setTitle] = useState('O Caminhar com Deus');
  const [subtitle, setSubtitle] = useState('Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã');
  const [imageFile, setImageFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSecurityTab, setActiveSecurityTab] = useState('integrity');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const controller = new AbortController();

    // Check if user is authenticated by checking for token
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            // O endpoint /api/auth/check retorna { success, data: { user: { ... } } }
            // Tenta extrair de data.data.user, data.user, ou usa o objeto inteiro como fallback
            const userData = data?.data?.user || data?.user || data;
            setCurrentUser(normalizeCurrentUser(userData));
          }
          setIsAuthenticated(true);
          await loadSettings();
        } else {
          router.replace('/login?next=/admin');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          // Ignora o erro se a requisição foi cancelada intencionalmente pelo React
          console.log('Verificação de autenticação cancelada pelo React.');
        } else {
          console.error('Auth check failed:', error);
          router.replace('/login?next=/admin');
        }
      }
    };

    checkAuth();

    return () => controller.abort();
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
          toast.success('Imagem atualizada com sucesso!');
        } else {
          console.error('Resposta inválida do servidor (não é JSON)');
          toast.error('Erro: O servidor retornou uma resposta inválida.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || errorData.error || 'Erro ao atualizar imagem');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao fazer upload da imagem');
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
      toast.error('Erro ao recortar imagem');
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

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Verifica se o usuário tem a permissão para acessar uma funcionalidade
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Administradores super-usuários sempre tem acesso a tudo
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(permission);
  };

  // Estados de permissão para não-admin (apresentação; não altera `hasPermission`).
  // `permissionsLoaded` vem do backend (`GET /api/auth/check` e refresh):
  // false = o servidor falhou ao ler os cargos; true + lista vazia = cargo sem permissões.
  const isNonAdmin = Boolean(currentUser) && currentUser.role !== 'admin';
  const permissionsLoadFailed = isNonAdmin && currentUser.permissionsLoaded === false;
  const hasNoPermissions = isNonAdmin
    && currentUser.permissionsLoaded === true
    && Array.isArray(currentUser.permissions)
    && currentUser.permissions.length === 0;

  // Aponta `aria-labelledby` da área de conteúdo para o item de navegação visível;
  // `undefined` omite o atributo quando a aba ativa não está liberada ao cargo.
  const activeNavItem = ADMIN_NAV_ITEMS.find((item) => item.key === activeTab);
  const activeTabButtonId = activeNavItem && hasPermission(activeNavItem.permission)
    ? `admin-tab-${activeTab}`
    : undefined;

  // Função responsável por encerrar a sessão
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    router.replace('/login?next=/admin');
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Admin - O Caminhar com Deus</title>
        </Head>

        <main className={styles.authLoadingMain}>
          <div className={styles.authLoadingCard}>
            <Spinner size="lg" />
            <p className={styles.authLoadingText}>
              Verificando permissões de acesso...
            </p>
          </div>
        </main>
      </div>
    );
  }

  const sidebarNavigation = (
    <Sidebar.Nav aria-label="Seções do painel administrativo">
      {ADMIN_NAV_ITEMS.filter((item) => hasPermission(item.permission)).map((item) => (
        <Sidebar.NavItem
          key={item.key}
          id={`admin-tab-${item.key}`}
          active={activeTab === item.key}
          icon={<AppIcon name={item.icon} size={20} />}
          label={item.label}
          onClick={() => {
            setActiveTab(item.key);
            setMobileMenuOpen(false);
          }}
        />
      ))}
    </Sidebar.Nav>
  );

  return (
    <div className={styles.container}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Head>
        <title>Admin - O Caminhar com Deus</title>
      </Head>

      <Sidebar
        position="left"
        width="md"
        persistCollapsed={true}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={setMobileMenuOpen}
        collapseLabels={{
          expand: 'Expandir menu lateral',
          collapse: 'Recolher menu lateral',
        }}
        mainId="main-content"
        sidebarLabel="Navegação administrativa"
        sidebar={sidebarNavigation}
      >
        <div className={styles.adminMainContainer}>
          <header className={styles.adminHeader}>
            <h1>Painel Administrativo</h1>
            <div className={styles.adminUserGroup}>
              {currentUser && (
                <span className={styles.adminGreeting}>
                  Olá, <strong>{currentUser.username}</strong>
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                Sair / Logout
              </button>
            </div>
          </header>

          {permissionsLoadFailed && (
            <div className={styles.errorMessage} role="alert">
              <strong className={styles.alertTitle}>Não foi possível carregar suas permissões</strong>
              <span className={styles.alertBody}>
                Houve uma falha ao verificar as permissões do seu cargo. Se o problema continuar depois de tentar novamente, fale com um administrador.
              </span>
              <button type="button" className={styles.button} onClick={() => router.reload()}>
                Tentar novamente
              </button>
            </div>
          )}

          {hasNoPermissions && (
            <section className={styles.emptyState} aria-labelledby="admin-sem-permissao-titulo">
              <h2 id="admin-sem-permissao-titulo" className={styles.emptyStateTitle}>Nenhuma permissão atribuída</h2>
              <p>
                O seu cargo ainda não tem acesso a nenhuma área do painel. Peça a um administrador para liberar as permissões.
              </p>
            </section>
          )}

          <div className={styles.adminPanel}>
            <section id="admin-tabpanel" aria-labelledby={activeTabButtonId}>
              {activeTab === 'header' && hasPermission('Configuração de Cabeçalho') && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="site-title-input">Título da Página</label>
                    <input
                      id="site-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="site-subtitle-input">Subtítulo</label>
                    <input
                      id="site-subtitle-input"
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="banner-file-input">Imagem Principal (1100x320)</label>
                    <div className={styles.fileRow}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className={styles.secondaryButton}
                      >
                        Escolher arquivo
                      </button>
                      <span aria-live="polite" className={styles.fileName}>
                        {imageFile ? imageFile.name : 'Nenhum arquivo escolhido'}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      id="banner-file-input"
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
                      className={styles.hiddenInput}
                    />

                    {isCropping && cropImageSrc ? (
                      <div className={styles.cropperBox}>
                        <div className={styles.cropperStage}>
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
                        <div className={styles.cropperControls}>
                          <span id="banner-crop-zoom-label" className={styles.cropperZoomLabel}>Zoom:</span>
                          <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="banner-crop-zoom-label"
                            onChange={(e) => setZoom(e.target.value)}
                            className={styles.cropperRange}
                          />
                          <button
                            type="button"
                            onClick={handleCropConfirm}
                            className={styles.button}
                          >
                            Recortar &amp; Confirmar
                          </button>
                        </div>
                      </div>
                    ) : imageFile && (
                      <div className={styles.selectionPreview}>
                        <p className={styles.selectionTitle}>Pré-visualização da seleção:</p>
                        <div className={styles.statsBox}>
                          <div className={styles.statLine}>
                            <AppIcon name="package" size={16} />
                            <span>
                              <strong>Original:</strong> {(originalSize / 1024).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB
                            </span>
                          </div>
                          <div className={styles.statLine}>
                            <AppIcon name="sparkles" size={16} />
                            <span>
                              <strong>Otimizado:</strong> {(imageFile.size / 1024).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB
                            </span>
                          </div>
                          <div className={styles.statSavings}>
                            <AppIcon name="trendingDown" size={16} />
                            <span>
                              Economia de {originalSize > 0 ? ((1 - imageFile.size / originalSize) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : 0}%
                            </span>
                          </div>
                        </div>
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Pré-visualização"
                          className={styles.selectionImage}
                        />
                      </div>
                    )}
                    {(imageFile || isCropping) && (
                      <div className={styles.buttonGroup}>
                        <button
                          type="button"
                          onClick={handleCancelSelection}
                          className={styles.secondaryButton}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.buttonGroup}>
                      <button
                        type="button"
                        onClick={handleImageUpload}
                        className={styles.secondaryButton}
                        disabled={!imageFile || isCropping}
                      >
                        Atualizar Imagem
                      </button>
                      <button
                        type="button"
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

              {activeTab === 'dashboard' && hasPermission('Visão Geral') && (
                <AdminDashboard setActiveTab={setActiveTab} userPermissions={currentUser?.permissions || []} isAdmin={currentUser?.role === 'admin'} />
              )}

              {activeTab === 'posts' && hasPermission('Posts/Artigos') && (
                <AdminPosts />
              )}

              {activeTab === 'security' && hasPermission('Segurança') && (
                <>
                  {/* Subabas horizontais de 2º nível da Segurança */}
                  <div
                    className={styles.tabs}
                    role="tablist"
                    aria-label="Ferramentas de segurança"
                  >
                    {SECURITY_SUBTABS.map((subTab) => (
                      <button
                        key={subTab.key}
                        type="button"
                        role="tab"
                        id={`security-tab-${subTab.key}`}
                        aria-selected={activeSecurityTab === subTab.key}
                        aria-controls={`security-tabpanel-${subTab.key}`}
                        className={`${styles.tabButton}${activeSecurityTab === subTab.key ? ` ${styles.activeTab}` : ''}`}
                        onClick={() => setActiveSecurityTab(subTab.key)}
                      >
                        <span className={styles.icon}>
                          <AppIcon name={subTab.icon} size={18} />
                        </span>
                        {subTab.label}
                      </button>
                    ))}
                  </div>

                  <div
                    role="tabpanel"
                    id={`security-tabpanel-${activeSecurityTab}`}
                    aria-labelledby={`security-tab-${activeSecurityTab}`}
                  >
                    {activeSecurityTab === 'integrity' && <IntegrityCheck />}
                    {activeSecurityTab === 'backup' && <BackupManager />}
                    {activeSecurityTab === 'ratelimit' && <RateLimitViewer />}
                    {activeSecurityTab === 'cache' && <CacheManager />}
                  </div>
                </>
              )}

              {activeTab === 'users' && hasPermission('Usuários') && (
                <AdminUsers />
              )}

              {activeTab === 'logs' && hasPermission('Auditoria') && (
                <AdminAudit />
              )}

              {activeTab === 'musicas' && hasPermission('Gestão de Músicas') && (
                <AdminMusicas />
              )}

              {activeTab === 'videos' && hasPermission('Gestão de Vídeos') && (
                <AdminVideos />
              )}

              {activeTab === 'dicas' && hasPermission('Gestão de Dicas') && (
                <AdminDicas />
              )}

              {activeTab === 'projetos02' && hasPermission('Gestão de Produtos') && (
                <AdminProducts />
              )}
            </section>
          </div>
        </div>
      </Sidebar>
    </div>
  );
}