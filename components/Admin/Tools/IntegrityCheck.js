import { useState, useCallback, useEffect } from 'react';
import { AppIcon } from '@/components/UI/icons';
import styles from '../styles/misc.module.css';
import crudStyles from '../styles/crud.module.css';

const CHECK_STATUS_CONFIG = {
  ok: { className: styles.statusHealthy, icon: 'checkCircle', label: 'OK' },
  error: { className: styles.statusDanger, icon: 'xCircle', label: 'Erro' },
  warning: { className: styles.statusWarning, icon: 'alertTriangle', label: 'Atenção' },
  degraded: { className: styles.statusWarning, icon: 'alertTriangle', label: 'Degradado' },
  unknown: { className: styles.statusNeutral, icon: 'info', label: 'Desconhecido' },
};

const OVERALL_STATUS_CONFIG = {
  healthy: { className: styles.statusHealthy, icon: 'checkCircle', label: 'Sistema Saudável' },
  degraded: { className: styles.statusDanger, icon: 'xCircle', label: 'Sistema Degradado' },
  warning: { className: styles.statusWarning, icon: 'alertTriangle', label: 'Sistema com Alertas' },
};

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

    const statusMeta = CHECK_STATUS_CONFIG[check.status] || CHECK_STATUS_CONFIG.unknown;
    const details = check.details || {};

    return (
      <div
        key={key}
        className={`${styles.checkCard} ${statusMeta.className}`}
      >
        <div className={styles.checkCardHeader}>
          <h4 className={styles.checkCardTitle}>{check.label}</h4>
          <span className={styles.checkStatusPill}>
            <AppIcon name={statusMeta.icon} size={16} />
            <span>{statusMeta.label}</span>
          </span>
        </div>
        <div className={styles.checkDetails}>
          {renderDetails(key, details)}
        </div>
      </div>
    );
  };

  const renderDetails = (key, details) => {
    if (!details || Object.keys(details).length === 0) {
      return <p className={styles.dashedEmptyTitle}>Nenhum detalhe disponível.</p>;
    }

    switch (key) {
      case 'database':
        return (
          <div className={styles.checkGrid}>
            <span>Status:</span><span className={styles.checkValue}>{details.connected ? 'Conectado' : 'Desconectado'}</span>
            <span>Latência:</span><span className={styles.checkValue}>{details.latency || '—'}</span>
            <span>Tamanho:</span><span className={styles.checkValue}>{details.size || '—'}</span>
            <span>Conexões:</span><span className={styles.checkValue}>{details.connections ?? '—'}</span>
          </div>
        );

      case 'cache':
        return (
          <div className={styles.checkGrid}>
            <span>Status:</span><span className={styles.checkValue}>{details.connected ? 'Conectado' : 'Desconectado'}</span>
            <span>Tipo:</span><span className={styles.checkValue}>{details.type || details.message || '—'}</span>
            {details.error && <span className={styles.checkSpanFull}>Erro: {details.error}</span>}
          </div>
        );

      case 'storage':
        return (
          <div className={styles.checkGrid}>
            <span>Arquivos:</span><span className={styles.checkValue}>{details.totalFiles ?? '—'}</span>
            <span>Tamanho:</span><span className={styles.checkValue}>{details.totalSize || '—'}</span>
            <span>Disco Livre:</span><span className={styles.checkValue}>{details.diskFree || '—'}</span>
            <span>Disco Total:</span><span className={styles.checkValue}>{details.diskTotal || '—'}</span>
            {details.message && <span className={styles.checkSpanFull}>{details.message}</span>}
          </div>
        );

      case 'backup':
        return (
          <div>
            <div className={styles.checkGrid}>
              <span>Total de Backups:</span><span className={styles.checkValue}>{details.totalBackups ?? '—'}</span>
            </div>
            {details.lastBackup && (
              <div className={styles.nestedDetailBox}>
                <strong>Último backup:</strong><br />
                <span>{details.lastBackup.name}</span><br />
                <span>{details.lastBackup.size} — {details.lastBackup.age}</span>
              </div>
            )}
            {details.message && <p className={styles.dashedEmptyHint}>{details.message}</p>}
          </div>
        );

      case 'system':
        return (
          <div>
            <p className={styles.sectionSubtitle}>Sistema operacional</p>
            <div className={styles.checkGrid}>
              <span>Node.js:</span><span className={styles.checkValue}>{details.nodeVersion || '—'}</span>
              <span>Uptime:</span><span className={styles.checkValue}>{details.uptime || '—'}</span>
              <span>RAM:</span><span className={styles.checkValue}>{details.memoryUsage || '—'}</span>
              <span>CPU:</span><span className={styles.checkValue}>{details.cpuCores ? `${details.cpuCores} cores` : '—'}</span>
              <span>Plataforma:</span><span className={styles.checkValue}>{details.platform || '—'} ({details.arch || '—'})</span>
              <span>Ambiente:</span><span className={styles.checkValue}>{details.env || '—'}</span>
            </div>
          </div>
        );

      default:
        return <pre className={styles.checkDetails}>{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.toolCard}>
        <div className={styles.toolHeader}>
          <h3 className={styles.toolTitle}>Verificação de Integridade</h3>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`${crudStyles.skeletonBox} ${styles.skeletonCard}`}
          />
        ))}
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────
  if (error && !data) {
    return (
      <div className={styles.toolCard}>
        <div className={styles.toolHeader}>
          <h3 className={styles.toolTitle}>Verificação de Integridade</h3>
        </div>
        <div className={styles.statusAlertBox} role="alert">
          <p className={styles.statusAlertTitle}>
            <AppIcon name="xCircle" size={18} />
            <span>Erro ao carregar verificação de integridade</span>
          </p>
          <p className={styles.statusAlertBody}>{error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchIntegrity(); }}
            className={styles.dangerButton}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Success State ─────────────────────────────────────────
  const overallStatus = data?.status || 'unknown';
  const overallMeta = OVERALL_STATUS_CONFIG[overallStatus] || OVERALL_STATUS_CONFIG.warning;

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolHeader}>
        <h3 className={styles.toolTitle}>Verificação de Integridade</h3>
        <button
          type="button"
          onClick={() => fetchIntegrity(true)}
          className={styles.secondaryButton}
          disabled={refreshing}
        >
          <AppIcon name="refresh" size={16} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Status geral */}
      <div className={`${styles.statusBanner} ${overallMeta.className}`}>
        <AppIcon name={overallMeta.icon} size={20} />
        <span>{OVERALL_STATUS_CONFIG[overallStatus]?.label || overallStatus}</span>
      </div>

      {/* Cards de cada verificação */}
      {data?.checks && Object.entries(data.checks).map(([key, check]) => renderCheckCard(key, check))}

      {/* Timestamp */}
      <div className={styles.timestampNote}>
        Última verificação: {data?.timestamp ? new Date(data.timestamp).toLocaleString('pt-BR') : '—'}
      </div>
    </div>
  );
}

IntegrityCheck.displayName = 'IntegrityCheck';

IntegrityCheck.propTypes = {};

export default IntegrityCheck;