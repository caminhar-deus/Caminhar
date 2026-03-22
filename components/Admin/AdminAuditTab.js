import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AdminAuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/admin/audit', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erro na API (${res.status})`);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('A resposta do servidor não é um JSON válido');
        }
        return res.json();
      })
      .then(data => setLogs(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Histórico de Auditoria</h2>
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '400px' }}>
          <input
            type="text" placeholder="Buscar nos logs (ações ou detalhes)..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
          />
          <button onClick={fetchLogs} style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Data/Hora</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>ID do Usuário</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Ação Executada</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Detalhes da Alteração</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>Carregando trilha de auditoria...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>Nenhum registro de log encontrado.</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at || log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>#{log.user_id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      backgroundColor: log.action.includes('EXCLUIR') ? '#fee2e2' : log.action.includes('CRIAR') ? '#dcfce3' : '#e0e7ff',
                      color: log.action.includes('EXCLUIR') ? '#991b1b' : log.action.includes('CRIAR') ? '#166534' : '#3730a3'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}