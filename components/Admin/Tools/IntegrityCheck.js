import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/misc.module.css';

/**
 * Componente de Verificação de Integridade do Sistema.
 * Exibe diagnóstico completo: banco de dados, cache, armazenamento, backup e sistema.
 * Atualiza automaticamente a cada 30 segundos.
 */
function IntegrityCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIntegrity = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/integrity', {
        credentials: 'include',
      });

      if (response.status === 401) {
        // Sessão expirada — recarrega a página para voltar ao login
        window.location.reload();
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Erro ${response.status} ao carregar integridade`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('O servidor retornou uma resposta inesperada. Tente novamente.');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch inicial e auto-refresh a cada 30s
  useEffect(() => {
    fetchIntegrity();
    const interval = setInterval(() => fetchIntegrity(), 30000);
    return () => clearInterval(interval);
  }, [fetchIntegrity]);

  // ── Renderização de cada verificação ─────────────────────────
  const renderCheckCard = (key, check) => {
    if (!check) return null;

    const statusColors = {
      ok: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
      error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
      warning: { bg: '#fff3cd', text: '#856404', border: '#ffeeba' },
      degraded: { bg: '#fff3cd', text: '#856404', border: '#ffeeba' },
      unknown: { bg: '#e2e3e5', text: '#383d41', border: '#d6d8db' },
    };

    const colors = statusColors[check.status] || statusColors.unknown;
    const statusLabels = {
      ok: '✅ OK',
      error: '❌ Erro',
      warning: '⚠️ Atenção',
      degraded: '⚠️ Degradado',
      unknown: '❓ Desconhecido',
    };

    const details = check.details || {};

    return (
      <div
        key={key}
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, color: colors.text }}>{check.label}</h4>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: colors.text }}>
            {statusLabels[check.status] || '❓ Desconhecido'}
          </span>
        </div>
        <div style={{ fontSize: '0.9rem', color: colors.text }}>
          {renderDetails(key, details)}
        </div>
      </div>
    );
  };

  const renderDetails = (key, details) => {
    if (!details || Object.keys(details).length === 0) return <p style={{ margin: 0 }}>Nenhum detalhe disponível.</p>;

    switch (key) {
      case 'database':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            <span>Status:</span><span style={{ fontWeight: 600 }}>{details.connected ? 'Conectado' : 'Desconectado'}</span>
            <span>Latência:</span><span style={{ fontWeight: 600 }}>{details.latency || '—'}</span>
            <span>Tamanho:</span><span style={{ fontWeight: 600 }}>{details.size || '—'}</span>
            <span>Conexões:</span><span style={{ fontWeight: 600 }}>{details.connections ?? '—'}</span>
          </div>
        );

      case 'cache':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            <span>Status:</span><span style={{ fontWeight: 600 }}>{details.connected ? 'Conectado' : 'Desconectado'}</span>
            <span>Tipo:</span><span style={{ fontWeight: 600 }}>{details.type || details.message || '—'}</span>
            {details.error && <span style={{ gridColumn: '1 / -1', color: '#721c24' }}>Erro: {details.error}</span>}
          </div>
        );

      case 'storage':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            <span>Arquivos:</span><span style={{ fontWeight: 600 }}>{details.totalFiles ?? '—'}</span>
            <span>Tamanho:</span><span style={{ fontWeight: 600 }}>{details.totalSize || '—'}</span>
            <span>Disco Livre:</span><span style={{ fontWeight: 600 }}>{details.diskFree || '—'}</span>
            <span>Disco Total:</span><span style={{ fontWeight: 600 }}>{details.diskTotal || '—'}</span>
            {details.message && <span style={{ gridColumn: '1 / -1', color: '#856404' }}>{details.message}</span>}
          </div>
        );

      case 'backup':
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: details.lastBackup ? '8px' : 0 }}>
              <span>Total de Backups:</span><span style={{ fontWeight: 600 }}>{details.totalBackups ?? '—'}</span>
            </div>
            {details.lastBackup && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                <strong>Último backup:</strong><br />
                <span style={{ fontSize: '0.85rem' }}>{details.lastBackup.name}</span><br />
                <span style={{ fontSize: '0.85rem' }}>{details.lastBackup.size} — {details.lastBackup.age}</span>
              </div>
            )}
            {details.message && <span style={{ color: '#856404', fontSize: '0.85rem' }}>{details.message}</span>}
          </div>
        );

      case 'system':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            <span>Node.js:</span><span style={{ fontWeight: 600 }}>{details.nodeVersion || '—'}</span>
            <span>Uptime:</span><span style={{ fontWeight: 600 }}>{details.uptime || '—'}</span>
            <span>RAM:</span><span style={{ fontWeight: 600 }}>{details.memoryUsage || '—'}</span>
            <span>CPU:</span><span style={{ fontWeight: 600 }}>{details.cpuCores ? `${details.cpuCores} cores` : '—'}</span>
            <span>Plataforma:</span><span style={{ fontWeight: 600 }}>{details.platform || '—'} ({details.arch || '—'})</span>
            <span>Ambiente:</span><span style={{ fontWeight: 600 }}>{details.env || '—'}</span>
          </div>
        );

      default:
        return <pre style={{ margin: 0, fontSize: '0.8rem' }}>{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <h3 className={styles.subNavLink} style={{ marginBottom: '16px' }}>Verificação de Integridade</h3>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={styles.skeletonBox}
            style={{
              height: '80px',
              marginBottom: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-bg-tertiary)',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────
  if (error && !data) {
    return (
      <div>
        <h3 style={{ marginBottom: '16px' }}>Verificação de Integridade</h3>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>❌ Erro ao carregar verificação de integridade</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>{error}</p>
          <button
            onClick={() => { setLoading(true); fetchIntegrity(); }}
            className={styles.button}
            style={{ backgroundColor: '#721c24' }}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Success State ─────────────────────────────────────────
  const overallStatus = data?.status || 'unknown';
  const statusColors = {
    healthy: { bg: '#d4edda', text: '#155724' },
    degraded: { bg: '#f8d7da', text: '#721c24' },
    warning: { bg: '#fff3cd', text: '#856404' },
  };
  const overallColors = statusColors[overallStatus] || statusColors.warning;
  const overallLabels = {
    healthy: '✅ Sistema Saudável',
    degraded: '❌ Sistema Degradado',
    warning: '⚠️ Sistema com Alertas',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Verificação de Integridade</h3>
        <button
          onClick={() => fetchIntegrity(true)}
          className={styles.button}
          disabled={refreshing}
          style={{ padding: '6px 14px', fontSize: '0.85rem', opacity: refreshing ? 0.7 : 1 }}
        >
          {refreshing ? 'Atualizando...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* Status geral */}
      <div style={{
        padding: '16px',
        backgroundColor: overallColors.bg,
        borderRadius: '8px',
        color: overallColors.text,
        marginBottom: '16px',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '1.1rem',
      }}>
        {overallLabels[overallStatus] || overallStatus}
      </div>

      {/* Cards de cada verificação */}
      {data?.checks && Object.entries(data.checks).map(([key, check]) => renderCheckCard(key, check))}

      {/* Timestamp */}
      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
        Última verificação: {data?.timestamp ? new Date(data.timestamp).toLocaleString('pt-BR') : '—'}
      </div>
    </div>
  );
}

IntegrityCheck.displayName = 'IntegrityCheck';

IntegrityCheck.propTypes = {};

export default IntegrityCheck;