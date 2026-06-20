import { useState, useCallback, useEffect } from 'react';
import styles from '../styles/misc.module.css';

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
      <div>
        <h3 style={{ marginBottom: '16px' }}>Rate Limiting</h3>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: '60px',
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
  if (error && blockedIps.length === 0) {
    return (
      <div>
        <h3 style={{ marginBottom: '16px' }}>Rate Limiting</h3>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>❌ Erro ao carregar dados de rate limit</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className={styles.button}
            style={{ backgroundColor: '#721c24' }}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Abas internas ───────────────────────────────────────────
  const tabs = [
    { key: 'blocked', label: '🔒 Bloqueados', count: blockedIps.length },
    { key: 'whitelist', label: '✅ Whitelist', count: whitelist.length },
    { key: 'audit', label: '📋 Auditoria' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'blocked':
        return (
          <div>
            {blockedIps.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px dashed #dee2e6',
              }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>🔒</p>
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhum IP bloqueado no momento.</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Todas as requisições estão dentro dos limites configurados.</p>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#6c757d' }}>
                  {blockedIps.length} IP(s) bloqueado(s) por exceder o limite de {blockedIps[0]?.count ? `${blockedIps[0].count - 1}+` : ''} tentativas.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blockedIps.map(item => (
                    <div
                      key={item.ip}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <code style={{ fontWeight: 600, color: '#721c24', fontSize: '0.9rem' }}>{item.ip}</code>
                        <div style={{ fontSize: '0.8rem', color: '#856404', marginTop: '4px' }}>
                          Tentativas: {item.count} | Desbloqueio em: {item.ttl} min
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleUnblock(item.ip)}
                          disabled={actionLoading === item.ip}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: actionLoading === item.ip ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            opacity: actionLoading === item.ip ? 0.7 : 1,
                          }}
                        >
                          {actionLoading === item.ip ? '...' : 'Desbloquear'}
                        </button>
                      </div>
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
            <form onSubmit={handleAddToWhitelist} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#495057' }}>
                    Adicionar IP à Whitelist
                  </label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="Ex: 192.168.1.1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === 'add' || !newIp.trim()}
                  className={styles.button}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    opacity: actionLoading === 'add' || !newIp.trim() ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {actionLoading === 'add' ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
              {actionError && (
                <p style={{ color: '#721c24', fontSize: '0.85rem', marginTop: '8px' }}>❌ {actionError}</p>
              )}
            </form>

            {/* Lista de whitelist */}
            {whitelist.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px dashed #dee2e6',
              }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>✅</p>
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhum IP na whitelist.</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>Adicione IPs acima para liberar acesso irrestrito.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {whitelist.map(ip => (
                  <div
                    key={ip}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '8px',
                    }}
                  >
                    <code style={{ fontWeight: 600, color: '#155724', fontSize: '0.9rem' }}>{ip}</code>
                    <button
                      onClick={() => handleRemoveFromWhitelist(ip)}
                      disabled={actionLoading === ip}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading === ip ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        opacity: actionLoading === ip ? 0.7 : 1,
                      }}
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
            <form onSubmit={handleSearchAudit} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por IP ou usuário..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}
                />
                <button type="submit" className={styles.button} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Buscar
                </button>
              </div>
            </form>

            {/* Lista de logs */}
            {auditLogs.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px dashed #dee2e6',
              }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>📋</p>
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhum log de auditoria encontrado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{log.action}</span>
                      <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', color: '#495057' }}>
                      IP: <code>{log.ip}</code> | Usuário: {log.user}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginação */}
            {auditTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className={styles.button}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', opacity: auditPage <= 1 ? 0.5 : 1 }}
                >
                  Anterior
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#6c757d' }}>
                  Página {auditPage} de {auditTotalPages}
                </span>
                <button
                  onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className={styles.button}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', opacity: auditPage >= auditTotalPages ? 0.5 : 1 }}
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Rate Limiting</h3>
        <button
          onClick={() => fetchData(true)}
          className={styles.button}
          disabled={refreshing}
          style={{ padding: '6px 14px', fontSize: '0.85rem', opacity: refreshing ? 0.7 : 1 }}
        >
          {refreshing ? 'Atualizando...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* Abas internas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setActionError(null); }}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab.key ? 'var(--color-primary-500)' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#495057',
              border: activeTab === tab.key ? 'none' : '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.key ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {renderTabContent()}

      {/* Nota de auto-refresh */}
      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '12px' }}>
        Atualização automática a cada 15s
      </div>
    </div>
  );
}

RateLimitViewer.displayName = 'RateLimitViewer';

RateLimitViewer.propTypes = {};

export default RateLimitViewer;