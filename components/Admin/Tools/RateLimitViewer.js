import { useState, useCallback, useEffect } from 'react';
import { AppIcon } from '@/components/UI/icons';
import styles from '../styles/misc.module.css';
import crudStyles from '../styles/crud.module.css';

/**
 * Componente de visualização de Rate Limiting.
 * Exibe IPs bloqueados, whitelist, logs de auditoria e permite
 * desbloquear IPs ou adicionar à whitelist.
 * Atualiza automaticamente a cada 15 segundos.
 */
function RateLimitViewer() {
  const [blockedIps, setBlockedIps] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // 'add' | ip para desbloqueio
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState('blocked'); // 'blocked' | 'whitelist' | 'audit'
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const [blockedRes, whitelistRes] = await Promise.all([
        fetch('/api/admin/rate-limit', { credentials: 'include' }),
        fetch('/api/admin/rate-limit?type=whitelist', { credentials: 'include' }),
      ]);

      if (blockedRes.status === 401 || whitelistRes.status === 401) {
        // Sessão expirada — recarrega a página para voltar ao login
        window.location.reload();
        return;
      }

      if (!blockedRes.ok) throw new Error('Falha ao carregar IPs bloqueados');
      if (!whitelistRes.ok) throw new Error('Falha ao carregar whitelist');

      const blockedData = await blockedRes.json();
      const whitelistData = await whitelistRes.json();

      setBlockedIps(Array.isArray(blockedData) ? blockedData : []);
      setWhitelist(Array.isArray(whitelistData) ? whitelistData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page = 1, search = '') => {
    try {
      const params = new URLSearchParams({ type: 'audit', page: page.toString(), limit: '10' });
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/rate-limit?${params}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        // Sessão expirada — recarrega a página para voltar ao login
        window.location.reload();
        return;
      }

      if (!response.ok) throw new Error('Falha ao carregar logs de auditoria');

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setAuditTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
    }
  }, []);

  // Fetch inicial e auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch auditoria quando a aba ou página mudar
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditPage, searchTerm);
    }
  }, [activeTab, auditPage, fetchAuditLogs]);

  // ── Ações ────────────────────────────────────────────────

  const handleUnblock = async (ip) => {
    setActionLoading(ip);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/rate-limit?ip=${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao desbloquear IP');
      }

      setBlockedIps(prev => prev.filter(item => item.ip !== ip));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToWhitelist = async (e) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    setActionLoading('add');
    setActionError(null);

    try {
      const response = await fetch('/api/admin/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIp.trim() }),
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao adicionar à whitelist');
      }

      setNewIp('');
      setWhitelist(prev => [...prev, newIp.trim()]);
      setBlockedIps(prev => prev.filter(item => item.ip !== newIp.trim()));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromWhitelist = async (ip) => {
    setActionLoading(ip);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/rate-limit?ip=${encodeURIComponent(ip)}&type=whitelist`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao remover da whitelist');
      }

      setWhitelist(prev => prev.filter(item => item !== ip));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchAudit = (e) => {
    e.preventDefault();
    setAuditPage(1);
    fetchAuditLogs(1, searchTerm);
  };

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.toolCard}>
        <div className={styles.toolHeader}>
          <h3 className={styles.toolTitle}>Rate Limiting</h3>
        </div>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`${crudStyles.skeletonBox} ${styles.skeletonCard}`}
          />
        ))}
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────
  if (error && blockedIps.length === 0) {
    return (
      <div className={styles.toolCard}>
        <div className={styles.toolHeader}>
          <h3 className={styles.toolTitle}>Rate Limiting</h3>
        </div>
        <div className={styles.statusAlertBox} role="alert">
          <p className={styles.statusAlertTitle}>
            <AppIcon name="xCircle" size={18} />
            <span>Erro ao carregar dados de rate limit</span>
          </p>
          <p className={styles.statusAlertBody}>{error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchData(); }}
            className={styles.dangerButton}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Abas internas ───────────────────────────────────────────
  const tabs = [
    { key: 'blocked', label: 'Bloqueados', icon: 'lock', count: blockedIps.length },
    { key: 'whitelist', label: 'Whitelist', icon: 'checkCircle', count: whitelist.length },
    { key: 'audit', label: 'Auditoria', icon: 'clipboard' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'blocked':
        return (
          <div>
            {blockedIps.length === 0 ? (
              <div className={styles.dashedEmptyBox}>
                <div className={styles.dashedEmptyIcon} aria-hidden="true">
                  <AppIcon name="lock" size={24} />
                </div>
                <p className={styles.dashedEmptyTitle}>Nenhum IP bloqueado no momento.</p>
                <p className={styles.dashedEmptyHint}>Todas as requisições estão dentro dos limites configurados.</p>
              </div>
            ) : (
              <div>
                <p className={styles.ipSummary}>
                  {blockedIps.length} IP(s) bloqueado(s) por exceder o limite de {blockedIps[0]?.count ? `${blockedIps[0].count - 1}+` : ''} tentativas.
                </p>
                <div className={styles.stackList}>
                  {blockedIps.map(item => (
                    <div
                      key={item.ip}
                      className={`${styles.ipCard} ${styles.statusDanger}`}
                    >
                      <div>
                        <code className={styles.ipCode}>{item.ip}</code>
                        <div className={styles.ipMeta}>
                          Tentativas: {item.count} | Desbloqueio em: {item.ttl} min
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblock(item.ip)}
                        disabled={actionLoading === item.ip}
                        className={styles.secondaryButton}
                      >
                        {actionLoading === item.ip ? '...' : 'Desbloquear'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'whitelist':
        return (
          <div>
            {/* Formulário para adicionar IP */}
            <form onSubmit={handleAddToWhitelist} className={styles.inlineForm}>
              <div className={styles.inlineFormRow}>
                <div className={styles.inlineFormField}>
                  <label htmlFor="rate-limit-whitelist-ip" className={styles.inlineLabel}>
                    Adicionar IP à Whitelist
                  </label>
                  <input
                    id="rate-limit-whitelist-ip"
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="Ex: 192.168.1.1"
                    aria-label="Endereço IP para adicionar à lista"
                    className={styles.inlineInput}
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === 'add' || !newIp.trim()}
                  className={styles.button}
                >
                  {actionLoading === 'add' ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
              {actionError && (
                <p className={styles.inlineError} role="alert">
                  <AppIcon name="xCircle" size={16} />
                  <span>{actionError}</span>
                </p>
              )}
            </form>

            {/* Lista de whitelist */}
            {whitelist.length === 0 ? (
              <div className={styles.dashedEmptyBox}>
                <div className={styles.dashedEmptyIcon} aria-hidden="true">
                  <AppIcon name="checkCircle" size={24} />
                </div>
                <p className={styles.dashedEmptyTitle}>Nenhum IP na whitelist.</p>
                <p className={styles.dashedEmptyHint}>Adicione IPs acima para liberar acesso irrestrito.</p>
              </div>
            ) : (
              <div className={styles.stackList}>
                {whitelist.map(ip => (
                  <div
                    key={ip}
                    className={`${styles.ipCard} ${styles.statusHealthy}`}
                  >
                    <code className={styles.ipCode}>{ip}</code>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromWhitelist(ip)}
                      disabled={actionLoading === ip}
                      className={styles.dangerButton}
                    >
                      {actionLoading === ip ? '...' : 'Remover'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'audit':
        return (
          <div>
            {/* Busca */}
            <form onSubmit={handleSearchAudit} className={styles.inlineForm}>
              <div className={styles.inlineFormRow}>
                <div className={styles.inlineFormField}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por IP ou usuário..."
                    aria-label="Buscar por IP ou usuário"
                    className={styles.inlineInput}
                  />
                </div>
                <button type="submit" className={styles.secondaryButton}>
                  <AppIcon name="search" size={16} />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

            {/* Lista de logs */}
            {auditLogs.length === 0 ? (
              <div className={styles.dashedEmptyBox}>
                <div className={styles.dashedEmptyIcon} aria-hidden="true">
                  <AppIcon name="clipboard" size={24} />
                </div>
                <p className={styles.dashedEmptyTitle}>Nenhum log de auditoria encontrado.</p>
              </div>
            ) : (
              <div className={styles.stackList}>
                {auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={styles.logCard}
                  >
                    <div className={styles.logHeader}>
                      <span className={styles.logAction}>{log.action}</span>
                      <span className={styles.logTime}>
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className={styles.logMeta}>
                      IP: <code>{log.ip}</code> | Usuário: {log.user}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginação */}
            {auditTotalPages > 1 && (
              <div className={styles.inlinePagination}>
                <button
                  type="button"
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className={styles.secondaryButton}
                >
                  Anterior
                </button>
                <span className={crudStyles.paginationInfo}>
                  Página {auditPage} de {auditTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className={styles.secondaryButton}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolHeader}>
        <h3 className={styles.toolTitle}>Rate Limiting</h3>
        <button
          type="button"
          onClick={() => fetchData(true)}
          className={styles.secondaryButton}
          disabled={refreshing}
        >
          <AppIcon name="refresh" size={16} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Abas internas */}
      <div className={styles.rateTabs} role="tablist" aria-label="Seções de rate limiting">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => { setActiveTab(tab.key); setActionError(null); }}
            className={`${styles.rateTabButton}${activeTab === tab.key ? ` ${styles.rateTabActive}` : ''}`}
          >
            <AppIcon name={tab.icon} size={16} />
            <span>{tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {renderTabContent()}

      {/* Nota de auto-refresh */}
      <div className={styles.timestampNote}>
        Atualização automática a cada 15s
      </div>
    </div>
  );
}

RateLimitViewer.displayName = 'RateLimitViewer';

RateLimitViewer.propTypes = {};

export default RateLimitViewer;