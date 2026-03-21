import React, { useState, useEffect } from 'react';
import styles from '../../styles/Admin.module.css';

export default function AdminDashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        if (!response.ok) throw new Error('Falha ao carregar estatísticas');
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Renderização unificada de carregamento/erro para evitar "pulos" de tela (Layout Shift)
  if (loading || error || !stats) {
    return (
      <div className={styles.content} style={{ minHeight: '600px' }}>
        <div className={styles.sectionHeader}>
          <h2>Visão Geral do Sistema</h2>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>⏳ Carregando painel de estatísticas...</div>}
        {error && <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>❌ Erro: {error}</div>}
      </div>
    );
  }

  const maxVal = Math.max(stats.posts, stats.musicas, stats.videos, stats.products, stats.users, 1); // Garante que nunca seja 0

  const statItems = [
    { 
      key: 'posts', 
      label: 'Artigos', 
      count: stats.posts, 
      icon: '📝', 
      color: '#007bff', 
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
      color: '#ff0000', 
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
      key: 'users', 
      label: 'Usuários', 
      count: stats.users, 
      icon: '👥', 
      color: '#6f42c1', 
      tabId: 'users',
      details: `Ativos: Hoje (${stats.usersToday || 0}) • Mês (${stats.usersMonth || 0}) • Ano (${stats.usersYear || 0})`
    }
  ];

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
              {item.details && <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', fontWeight: '500' }}>{item.details}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Horizontal Baseado em CSS */}
      <div className={styles.chartSection}>
        <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50', fontSize: '1.2rem' }}>Distribuição de Conteúdo</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {statItems.map(item => {
            const widthPercent = (item.count / maxVal) * 100;
            return (
              <div key={`chart-${item.key}`} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '80px', fontWeight: '600', color: '#495057', fontSize: '0.9rem', textAlign: 'right' }}>
                  {item.label}
                </div>
                <div style={{ flex: 1, backgroundColor: '#e9ecef', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.max(widthPercent, 2)}%`, // Mínimo de 2% para a barra sempre aparecer
                      maxWidth: '100%', // Limite máximo de segurança
                      minWidth: 'fit-content', // Garante que números grandes não fiquem espremidos
                      boxSizing: 'border-box', // Impede que o padding some na largura
                      backgroundColor: item.color, 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px'
                    }}
                  >
                    {item.count > 0 && <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.count}</span>}
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