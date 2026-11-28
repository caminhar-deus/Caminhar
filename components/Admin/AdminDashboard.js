import { useState, useEffect, useMemo } from 'react';
import { Spinner } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import { notifyAdminUnauthorized } from '@/utils/adminSession';
import styles from './styles/dashboard.module.css';

const PERMISSION_ITEM_MAP = {
  posts: 'Posts/Artigos',
  musicas: 'Gestão de Músicas',
  videos: 'Gestão de Vídeos',
  products: 'Gestão de Produtos',
  sales: 'Gestão de Vendas',
  internalProducts: 'Gestão de Vendas',
  dicas: 'Gestão de Dicas',
  users: 'Usuários',
};

export default function AdminDashboard({ setActiveTab, setActiveSalesSubTab, userPermissions = [], isAdmin = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const CACHE_KEY = 'admin_dashboard_stats';
    const CACHE_TTL = 30000; // 30 segundos

    const fetchStats = async () => {
      try {
        // Verifica cache em sessionStorage
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const hasValidSalesSchema = Boolean(
            data &&
            'sales' in data &&
            'salesPaymentPix' in data &&
            'salesOrderPaid' in data &&
            'internalProducts' in data
          );
          if (Date.now() - timestamp < CACHE_TTL && hasValidSalesSchema) {
            setStats(data);
            setLoading(false);
            return;
          }
        }

        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        if (response?.status === 401) {
          try {
            sessionStorage.removeItem(CACHE_KEY);
          } catch {
            // sessionStorage pode estar indisponível; ignora
          }
          if (notifyAdminUnauthorized('expired')) return;
        }
        if (!response.ok) throw new Error('Falha ao carregar estatísticas');

        // Verifica se a resposta é JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('O servidor retornou uma resposta inesperada. Tente novamente mais tarde.');
        }

        const data = await response.json();

        // Armazena no cache
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch {
          // sessionStorage pode estar cheio ou indisponível; ignora erro de cache
        }

        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Hooks useMemo devem vir antes de qualquer early return
  const maxVal = useMemo(() => {
    if (!stats) return 1;
    return Math.max(
      stats.posts || 0,
      stats.musicas || 0,
      stats.videos || 0,
      stats.products || 0,
      stats.sales || 0,
      stats.internalProducts || 0,
      stats.users || 0,
      stats.dicas || 0,
      1
    );
  }, [stats]);

  const allStatItems = useMemo(() => {
    if (!stats) return [];
    return [
      { 
        key: 'posts', 
        label: 'Artigos', 
        count: stats.posts, 
        icon: 'fileText', 
        color: 'var(--color-primary-500)', 
        tabId: 'posts',
        details: `${stats.postsPublished || 0} publicados • ${stats.postsDraft || 0} rascunhos`
      },
      { 
        key: 'musicas', 
        label: 'Músicas', 
        count: stats.musicas, 
        icon: 'music', 
        color: 'var(--color-success-700)', 
        tabId: 'musicas',
        details: `${stats.musicasPublished || 0} publicados • ${stats.musicasDraft || 0} rascunhos`
      },
      { 
        key: 'videos', 
        label: 'Vídeos', 
        count: stats.videos, 
        icon: 'video', 
        color: 'var(--color-error-600)', 
        tabId: 'videos',
        details: `${stats.videosPublished || 0} publicados • ${stats.videosDraft || 0} rascunhos`
      },
      { 
        key: 'products', 
        label: 'Produtos', 
        count: stats.products, 
        icon: 'package', 
        color: 'var(--color-warning-700)', 
        tabId: 'projetos02',
        details: `${stats.productsPublished || 0} publicados • ${stats.productsDraft || 0} rascunhos`
      },
      {
        key: 'sales',
        label: 'Gestão de Vendas',
        count: stats.sales || 0,
        icon: 'shoppingBag',
        color: 'var(--color-info-700)',
        tabId: 'vendas',
        subTabId: 'orders',
        detailColumns: [
          {
            title: 'Pagamento',
            items: [
              `PIX (${stats.salesPaymentPix || 0})`,
              `Cartão de crédito (${stats.salesPaymentCreditCard || 0})`,
              `Cartão de débito (${stats.salesPaymentDebitCard || 0})`,
              `Boleto bancário (${stats.salesPaymentTicket || 0})`,
            ],
          },
          {
            title: 'Andamento',
            items: [
              `Aguardando pagamento (${stats.salesOrderAwaitingPayment || 0})`,
              `Pago (${stats.salesOrderPaid || 0})`,
              `Em separação (${stats.salesOrderPreparing || 0})`,
              `Enviado (${stats.salesOrderShipped || 0})`,
              `Entregue (${stats.salesOrderDelivered || 0})`,
              `Cancelado (${stats.salesOrderCancelled || 0})`,
            ],
          },
        ],
      },
      {
        key: 'internalProducts',
        label: 'Produtos Internos',
        count: stats.internalProducts || 0,
        icon: 'package',
        color: 'var(--color-warning-800)',
        tabId: 'vendas',
        subTabId: 'internal-products',
        details: `${stats.internalProductsPublished || 0} publicados • ${stats.internalProductsDraft || 0} rascunhos`,
      },
      { 
        key: 'dicas', 
        label: 'Dicas', 
        count: stats.dicas || 0, 
        icon: 'lightbulb', 
        color: 'var(--color-secondary-800)', 
        tabId: 'dicas',
        details: `${stats.dicasPublished || 0} publicados • ${stats.dicasDraft || 0} rascunhos`
      },
      { 
        key: 'users', 
        label: 'Usuários', 
        count: stats.users, 
        icon: 'users', 
        color: 'var(--color-primary-700)', 
        tabId: 'users',
        details: `Ativos: Hoje (${stats.usersToday || 0}) • Mês (${stats.usersMonth || 0}) • Ano (${stats.usersYear || 0})`
      },
    ];
  }, [stats]);

  // Filtra itens conforme as permissões do usuário
  const statItems = useMemo(() => isAdmin
    ? allStatItems
    : allStatItems.filter(item => {
        const requiredPermission = PERMISSION_ITEM_MAP[item.key];
        return !requiredPermission || userPermissions.includes(requiredPermission);
      }), [allStatItems, isAdmin, userPermissions]);

  // Renderização unificada de carregamento/erro para evitar "pulos" de tela (Layout Shift)
  if (loading || error || !stats) {
    return (
      <div className={`${styles.content} ${styles.contentMinHeight}`}>
        <div className={styles.sectionHeader}>
          <h2>Visão Geral do Sistema</h2>
        </div>
        {loading && (
          <div aria-live="polite" className={styles.statusState}>
            <Spinner size="sm" />
            <span>Carregando painel de estatísticas...</span>
          </div>
        )}
        {error && (
          <div role="alert" className={styles.errorState}>
            <AppIcon name="xCircle" size={18} />
            <span>Erro: {error}</span>
          </div>
        )}
      </div>
    );
  }

  const handleCardActivate = (item) => {
    if (!item.tabId || !setActiveTab) return;
    if (item.subTabId && setActiveSalesSubTab) {
      setActiveSalesSubTab(item.subTabId);
    }
    setActiveTab(item.tabId);
  };

  return (
    <div className={styles.content}>
      <div className={styles.sectionHeader}>
        <h2>Visão Geral do Sistema</h2>
      </div>

      {/* Cartões Superiores */}
      <div className={styles.statsGrid}>
        {statItems.map(item => (
          <div 
            key={item.key} 
            className={`${styles.statCard}${item.detailColumns ? ` ${styles.statCardWide}` : ''}`} 
            onClick={() => handleCardActivate(item)}
            onKeyDown={(e) => {
              if (item.tabId && setActiveTab && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleCardActivate(item);
              }
            }}
            role={item.tabId ? 'button' : undefined}
            tabIndex={item.tabId ? 0 : undefined}
            aria-label={item.tabId ? `Ir para ${item.label}: ${item.count} itens cadastrados` : undefined}
          >
            <div className={styles.statIcon} aria-hidden="true">
              <AppIcon name={item.icon} size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statNumber}>{item.count}</span>
              <span className={styles.statLabel}>{item.label}</span>
              {item.detailColumns ? (
                <div className={styles.statColumns}>
                  {item.detailColumns.map((col) => (
                    <div key={col.title} className={styles.statColumn}>
                      <span className={styles.statColumnTitle}>{col.title}</span>
                      {col.items.map((entry) => (
                        <span key={entry} className={styles.statColumnItem}>{entry}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                item.details && <span className={styles.statDetails}>{item.details}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Horizontal Baseado em CSS */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>Distribuição de Conteúdo</h3>
        
        <div className={styles.chartList}>
          {statItems.map(item => {
            const widthPercent = (item.count / maxVal) * 100;
            return (
              <div key={`chart-${item.key}`} className={styles.chartRow}>
                <div className={styles.chartLabel}>
                  {item.label}
                </div>
                <div className={styles.chartTrack}>
                  <div 
                    className={styles.chartFill}
                    style={{ 
                      width: `${Math.max(widthPercent, 2)}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    {item.count > 0 && <span className={styles.chartValue}>{item.count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}