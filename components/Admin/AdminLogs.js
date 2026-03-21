import React from 'react';
import AdminCrudBase from './AdminCrudBase';

const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { 
    key: 'created_at', header: 'Data / Hora', width: '160px',
    render: (item) => new Date(item.created_at).toLocaleString('pt-BR') 
  },
  { key: 'username', header: 'Usuário', render: (item) => <strong>{item.username}</strong> },
  { 
    key: 'action', header: 'Ação', width: '100px',
    render: (item) => {
      const colors = {
        CREATE: { bg: '#d4edda', color: '#155724' },
        UPDATE: { bg: '#cce5ff', color: '#004085' },
        DELETE: { bg: '#f8d7da', color: '#721c24' }
      };
      const style = colors[item.action] || { bg: '#e2e3e5', color: '#383d41' };
      return (
        <span style={{ backgroundColor: style.bg, color: style.color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
          {item.action}
        </span>
      );
    }
  },
  { key: 'entity_type', header: 'Módulo', width: '100px' },
  { key: 'details', header: 'Detalhes' },
  { key: 'ip_address', header: 'IP', width: '120px', render: (item) => <span style={{ fontSize: '0.85rem', color: '#666' }}>{item.ip_address}</span> }
];

export default function AdminLogs() {
  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/logs"
      title="Log de Auditoria e Atividades"
      fields={[]} // Vazio porque não tem formulário
      columns={columns}
      initialFormData={{}}
      usePagination={true}
      itemsPerPage={50} // Exibe mais resultados por tela
      searchable={true}
      exportable={true} // Permite extrair o log de segurança em Excel!
      readOnly={true} // Trava qualquer tentativa de edição
    />
  );
}