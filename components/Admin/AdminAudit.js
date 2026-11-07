import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { exportToCSV } from '@/utils/csvExport';
import { useUnauthorized } from '@/hooks/useUnauthorized';
import { AppIcon } from '@/components/UI/icons';
import crudStyles from './styles/crud.module.css';
import DateTimeBRField from './fields/DateTimeBRField';

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
          // Aguarda 500ms para o toast aparecer antes do reload
          return useUnauthorized(router, 500);
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

  const filteredLogs = useMemo(() =>
    logs.filter(log =>
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user_id || '').toLowerCase().includes(search.toLowerCase())
    ),
    [logs, search]
  );

  // Função para exportar os logs visíveis para CSV
  const handleExportCSV = () => {
    exportToCSV({
      data: filteredLogs,
      columns: [
        {
          key: 'created_at',
          header: 'Data/Hora',
          format: (val, item) => new Date(val || item.timestamp).toLocaleString('pt-BR')
        },
        { key: 'user_id', header: 'Usuário' },
        { key: 'action', header: 'Ação Executada' },
        { key: 'details', header: 'Detalhes' }
      ],
      filename: `auditoria_export_${new Date().toISOString().slice(0, 10)}`,
      onEmpty: () => toast.error('Não há dados para exportar.')
    });
  };

  return (
    <div className={crudStyles.content}>
      <div className={crudStyles.auditHeader}>
        <h2>Histórico Global de Auditoria</h2>
        <div className={crudStyles.auditFilterBar}>
          <div className={`${crudStyles.searchWrapper} ${crudStyles.auditSearchWrapper}`}>
            <span className={crudStyles.searchIcon} aria-hidden="true">
              <AppIcon name="search" size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar ações, usuários ou detalhes..."
              aria-label="Buscar ações, usuários ou detalhes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={crudStyles.searchInput}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className={crudStyles.searchClearButton}
                aria-label="Limpar busca"
              >
                <AppIcon name="close" size={14} />
              </button>
            )}
          </div>
          <DateTimeBRField
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            ariaLabel="Data Inicial"
            title="Data Inicial"
          />
          <DateTimeBRField
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            ariaLabel="Data Final"
            title="Data Final"
          />
          <button
            onClick={handleExportCSV}
            type="button"
            className={crudStyles.exportButton}
          >
            <AppIcon name="download" size={16} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => fetchLogs(1)}
            disabled={loading}
            type="button"
            className={crudStyles.secondaryButton}
          >
            <AppIcon name="refresh" size={16} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className={crudStyles.tableContainer}>
        <table className={crudStyles.table} aria-label="Histórico Global de Auditoria">
          <thead className={crudStyles.stickyThead}>
            <tr>
              <th scope="col">Data/Hora</th>
              <th scope="col">Usuário</th>
              <th scope="col">Ação Executada</th>
              <th scope="col">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td><div className={crudStyles.skeletonBox} style={{ width: '130px' }} /></td>
                  <td><div className={crudStyles.skeletonBox} style={{ width: '80px' }} /></td>
                  <td><div className={crudStyles.skeletonBox} style={{ width: '100px' }} /></td>
                  <td><div className={crudStyles.skeletonBox} style={{ width: '100%', maxWidth: '300px' }} /></td>
                </tr>
              ))
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="4" className={crudStyles.emptyStateRow}>
                  Nenhum registro de log encontrado.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className={crudStyles.nowrapCell}>
                    {new Date(log.created_at || log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className={crudStyles.cellTitle}>{log.user_id}</td>
                  <td><strong>{log.action}</strong></td>
                  <td className={crudStyles.secondaryCell}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className={crudStyles.pagination}>
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page === 1 || loading}
            type="button"
            className={crudStyles.paginationButton}
          >
            Anterior
          </button>
          <span className={crudStyles.paginationInfo} aria-live="polite" aria-atomic="true">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page === totalPages || loading}
            type="button"
            className={crudStyles.paginationButton}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}