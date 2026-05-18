import React, { useState, useEffect, useMemo } from 'react';
import styles from './styles/dashboard.module.css';

const PERMISSION_ITEM_MAP = {
  posts: 'Posts/Artigos',
  musicas: 'Gestão de Músicas',
  videos: 'Gestão de Vídeos',
  products: 'Gestão de Produtos',
  dicas: 'Gestão de Dicas',
  users: 'Usuários',
};

export default function AdminDashboard({ setActiveTab, userPermissions = [], isAdmin = false }) {
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
          if (Date.now() - timestamp < CACHE_TTL) {
            setStats(data);
            setLoading(false);
            return;
          }
        }

        const response = await fetch('/api/admin/stats', { credentials: 'include' });
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
    return Math.max(stats.posts || 0, stats.musicas || 0, stats.videos || 0, stats.products || 0, stats.users || 0, stats.dicas || 0, 1);
  }, [stats]);

  const allStatItems = useMemo(() => {
    if (!stats) return [];
    return [
      { 
        key: 'posts', 
        label: 'Artigos', 
        count: stats.posts, 
        icon: '📝', 
        color: 'var(--color-primary-500)', 
        tabId: 'posts',
        details: `✅ ${stats.postsPublished || 0} Pub | 📝 ${stats.postsDraft || 0} Rasc`
      },
      { 
        key: 'musicas', 
        label: 'Músicas', 
        count: stats.musicas, 
        icon: '🎵', 
        color: '#1DB954', 
        tabId: 'musicas',
        details: `✅ ${stats.musicasPublished || 0} Pub | 📝 ${stats.musicasDraft || 0} Rasc`
      },
      { 
        key: 'videos', 
        label: 'Vídeos', 
        count: stats.videos, 
        icon: '🎬', 
        color: 'var(--color-error-500)', 
        tabId: 'videos',
        details: `✅ ${stats.videosPublished || 0} Pub | 📝 ${stats.videosDraft || 0} Rasc`
      },
      { 
        key: 'products', 
        label: 'Produtos', 
        count: stats.products, 
        icon: '📦', 
        color: '#ff9900', 
        tabId: 'projetos02',
        details: `✅ ${stats.productsPublished || 0} Pub | 📝 ${stats.productsDraft || 0} Rasc`
      },
      { 
        key: 'dicas', 
        label: 'Dicas', 
        count: stats.dicas || 0, 
        icon: '💡', 
        color: 'var(--color-primary-500)', 
        tabId: 'dicas',
        details: `✅ ${stats.dicasPublished || 0} Pub | 📝 ${stats.dicasDraft || 0} Rasc`
      },
      { 
        key: 'users', 
        label: 'Usuários', 
        count: stats.users, 
        icon: '👥', 
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
      <div className={styles.content} style={{ minHeight: '600px' }}>
        <div className={styles.sectionHeader}>
          <h2>Visão Geral do Sistema</h2>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '50px', color: 'var(--color-text-secondary)' }}>⏳ Carregando painel de estatísticas...</div>}
        {error && <div style={{ textAlign: 'center', padding: '50px', color: 'var(--color-error-500)' }}>❌ Erro: {error}</div>}
      </div>
    );
  }

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
            className={styles.statCard} 
            onClick={() => item.tabId && setActiveTab && setActiveTab(item.tabId)}
            style={{ cursor: item.tabId ? 'pointer' : 'default' }}
          >
            <div className={styles.statIcon}>{item.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statNumber}>{item.count}</span>
              <span className={styles.statLabel}>{item.label}</span>
              {item.details && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '4px', fontWeight: '500' }}>{item.details}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Horizontal Baseado em CSS */}
      <div className={styles.chartSection}>
        <h3 style={{ margin: '0 0 25px 0', color: 'var(--color-text-primary)', fontSize: '1.2rem' }}>Distribuição de Conteúdo</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {statItems.map(item => {
            const widthPercent = (item.count / maxVal) * 100;
            return (
              <div key={`chart-${item.key}`} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '80px', fontWeight: '600', color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'right' }}>
                  {item.label}
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--color-border-light)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.max(widthPercent, 2)}%`,
                      maxWidth: '100%',
                      minWidth: 'fit-content',
                      boxSizing: 'border-box',
                      backgroundColor: item.color, 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px'
                    }}
                  >
                    {item.count > 0 && <span style={{ color: 'var(--color-text-inverse)', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.count}</span>}
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