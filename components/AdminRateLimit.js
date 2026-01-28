import { useState, useEffect } from 'react';

export default function AdminRateLimit() {
  const [blockedIps, setBlockedIps] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca IPs bloqueados
      const resBlocked = await fetch('/api/admin/rate-limit');
      // Busca Whitelist
      const resWhitelist = await fetch('/api/admin/rate-limit?type=whitelist');
      // Busca Logs de Auditoria
      const resAudit = await fetch(`/api/admin/rate-limit?type=audit&page=${auditPage}&limit=10&startDate=${auditStartDate}&endDate=${auditEndDate}&search=${encodeURIComponent(auditSearch)}`);

      if (resBlocked.ok && resWhitelist.ok && resAudit.ok) {
        const blockedData = await resBlocked.json();
        const whitelistData = await resWhitelist.json();
        const auditData = await resAudit.json();
        
        setBlockedIps(blockedData);
        setWhitelist(whitelistData);
        setAuditLogs(auditData.logs);
        setAuditTotalPages(auditData.pagination.totalPages);
        setError(null);
      } else {
        const err = await res.json();
        // Se for 501, é porque não tem Redis, então não mostramos erro crítico, apenas aviso
        if (res.status === 501) {
          setError('Redis não configurado. Gerenciamento indisponível.');
        } else {
          setError('Erro ao carregar dados.');
        }
      }
    } catch (e) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [auditPage, auditStartDate, auditEndDate, auditSearch]);

  const handleUnblock = async (ip) => {
    if (!confirm(`Deseja desbloquear o IP ${ip}?`)) return;

    const res = await fetch(`/api/admin/rate-limit?ip=${ip}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData(); // Recarrega a lista
      alert('IP desbloqueado com sucesso!');
    } else {
      alert('Erro ao desbloquear IP.');
    }
  };

  const handleAddToWhitelist = async (e) => {
    e.preventDefault();
    if (!newIp) return;

    const res = await fetch('/api/admin/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: newIp })
    });

    if (res.ok) {
      setNewIp('');
      fetchData();
      alert('IP adicionado à whitelist!');
    } else {
      alert('Erro ao adicionar IP.');
    }
  };

  const handleRemoveFromWhitelist = async (ip) => {
    if (confirm(`Remover ${ip} da whitelist?`)) {
      const res = await fetch(`/api/admin/rate-limit?ip=${ip}&type=whitelist`, { method: 'DELETE' });
      if (res.ok) fetchData();
    }
  };

  const handleGetMyIp = async () => {
    try {
      const res = await fetch('/api/admin/rate-limit?type=current_ip');
      if (res.ok) {
        const data = await res.json();
        setNewIp(data.ip);
      }
    } catch (error) {
      console.error('Erro ao obter IP:', error);
    }
  };

  const handleExportCsv = () => {
    window.location.href = `/api/admin/rate-limit?type=export_csv&startDate=${auditStartDate}&endDate=${auditEndDate}&search=${encodeURIComponent(auditSearch)}`;
  };

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fff5f5', color: '#c53030', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #feb2b2' }}>
        <strong>Segurança:</strong> {error}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#2d3748' }}>IPs Bloqueados (Rate Limit)</h3>
        <button onClick={fetchData} style={{ cursor: 'pointer', padding: '0.5rem', background: 'transparent', border: '1px solid #cbd5e0', borderRadius: '4px' }}>
          ↻ Atualizar
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : blockedIps.length === 0 ? (
        <p style={{ color: '#718096', fontStyle: 'italic' }}>Nenhum IP bloqueado no momento.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>IP</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>Tentativas</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>Expira em</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {blockedIps.map((item) => (
                <tr key={item.ip}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{item.ip}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', fontWeight: 'bold' }}>{item.count}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>{item.ttl} min</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                    <button onClick={() => handleUnblock(item.ip)} style={{ cursor: 'pointer', color: '#3182ce', background: 'none', border: 'none', textDecoration: 'underline' }}>Desbloquear</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>Whitelist (IPs Permitidos)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          IPs nesta lista nunca serão bloqueados pelo Rate Limit.
        </p>

        <form onSubmit={handleAddToWhitelist} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Digite o IP (ex: 192.168.1.1)" 
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', flex: 1, maxWidth: '300px' }}
          />
          <button 
            type="button" 
            onClick={handleGetMyIp}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#edf2f7', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '4px', cursor: 'pointer' }}
          >
            Meu IP
          </button>
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Adicionar IP
          </button>
        </form>

        {whitelist.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {whitelist.map(ip => (
              <div key={ip} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                backgroundColor: '#f0fff4', 
                border: '1px solid #9ae6b4', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '999px',
                fontSize: '0.9rem'
              }}>
                <span style={{ fontFamily: 'monospace' }}>{ip}</span>
                <button 
                  onClick={() => handleRemoveFromWhitelist(ip)}
                  style={{ border: 'none', background: 'none', color: '#c53030', cursor: 'pointer', fontWeight: 'bold', padding: '0 2px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#718096', fontStyle: 'italic', fontSize: '0.9rem' }}>Nenhum IP na whitelist.</p>
        )}
      </div>

      <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>Logs de Auditoria</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
              Histórico das últimas 100 ações de segurança.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Buscar IP ou Usuário"
              value={auditSearch}
              onChange={(e) => { setAuditPage(1); setAuditSearch(e.target.value); }}
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e0', minWidth: '150px' }}
            />
            <input 
              type="date" 
              value={auditStartDate}
              onChange={(e) => { setAuditPage(1); setAuditStartDate(e.target.value); }}
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
            <span style={{ color: '#718096' }}>até</span>
            <input 
              type="date" 
              value={auditEndDate}
              onChange={(e) => { setAuditPage(1); setAuditEndDate(e.target.value); }}
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
            <button 
              onClick={handleExportCsv}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#2b6cb0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '0.5rem' }}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {auditLogs.length > 0 ? (
          <>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f7fafc' }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>Data/Hora</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>Ação</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>IP Alvo</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '0.5rem', color: '#718096' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>{log.action}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{log.ip}</td>
                      <td style={{ padding: '0.5rem' }}>{log.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {auditTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  style={{ padding: '0.5rem 1rem', cursor: auditPage === 1 ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e0', borderRadius: '4px', background: 'white' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.9rem' }}>Página {auditPage} de {auditTotalPages}</span>
                <button 
                  onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage === auditTotalPages}
                  style={{ padding: '0.5rem 1rem', cursor: auditPage === auditTotalPages ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e0', borderRadius: '4px', background: 'white' }}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: '#718096', fontStyle: 'italic', fontSize: '0.9rem' }}>Nenhum registro de auditoria encontrado.</p>
        )}
      </div>
    </div>
  );
}