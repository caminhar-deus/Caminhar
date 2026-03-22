import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const fetchLogs = (targetPage = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: targetPage,
      limit: 50
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    fetch(`/api/admin/audit?${params.toString()}`, { credentials: 'include' })
      .then(async res => {
        if (res.status === 401) {
          toast.error('Sessão expirada. Faça login novamente.');
          router.reload(); // Recarrega a página para voltar à tela de login
          throw new Error('Acesso não autorizado');
        }
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
      .then(resData => {
        setLogs(Array.isArray(resData.data) ? resData.data : []);
        setPage(resData.pagination?.page || 1);
        setTotalPages(resData.pagination?.totalPages || 1);
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const filteredLogs = logs.filter(log =>
    (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.user_id || '').toLowerCase().includes(search.toLowerCase())
  );

  // Função para exportar os logs visíveis para CSV
  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Detalhes'];

    const csvRows = filteredLogs.map(log => {
      const date = new Date(log.created_at || log.timestamp).toLocaleString('pt-BR');
      const user = log.user_id || '';
      const action = log.action || '';
      const details = log.details || '';

      const escapeCSV = (val) => {
        let str = String(val).replace(/"/g, '""'); // Escapa aspas para o padrão CSV
        if (str.includes(',') || str.includes('"') || str.includes('\n')) str = `"${str}"`;
        return str;
      };

      return [escapeCSV(date), escapeCSV(user), escapeCSV(action), escapeCSV(details)].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '700px', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .skeleton-box {
          height: 20px;
          background-color: #e2e8f0;
          border-radius: 4px;
          animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Histórico Global de Auditoria</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text" placeholder="Buscar ações, usuários ou detalhes..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px', minWidth: '200px', flex: 1, maxWidth: '300px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
          />
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
            title="Data Inicial"
          />
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
            title="Data Final"
          />
          <button onClick={handleExportCSV} type="button" style={{ padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' }}>
            Exportar CSV
          </button>
          <button onClick={() => fetchLogs(1)} style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, maxHeight: '600px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb', boxShadow: 'inset 0 -2px 0 #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Data/Hora</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Usuário</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Ação Executada</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}><div className="skeleton-box" style={{ width: '130px' }}></div></td>
                  <td style={{ padding: '12px 16px' }}><div className="skeleton-box" style={{ width: '80px' }}></div></td>
                  <td style={{ padding: '12px 16px' }}><div className="skeleton-box" style={{ width: '100px' }}></div></td>
                  <td style={{ padding: '12px 16px' }}><div className="skeleton-box" style={{ width: '100%', maxWidth: '300px' }}></div></td>
                </tr>
              ))
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>Nenhum registro de log encontrado.</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at || log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{log.user_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>{log.action}</td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px 0' }}>
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page === 1 || loading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: page === 1 || loading ? '#f3f4f6' : '#fff', color: page === 1 || loading ? '#9ca3af' : '#374151', cursor: page === 1 || loading ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page === totalPages || loading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: page === totalPages || loading ? '#f3f4f6' : '#fff', color: page === totalPages || loading ? '#9ca3af' : '#374151', cursor: page === totalPages || loading ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}