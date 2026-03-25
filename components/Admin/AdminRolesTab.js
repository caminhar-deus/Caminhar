import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import { z } from 'zod';

// Permissões solicitadas para a configuração
const permissionsList = [
  'Visão Geral', 'Posts/Artigos', 'Gestão de Músicas', 'Gestão de Vídeos',
  'Gestão de Produtos', 'Gestão de Dicas', 'Configuração de Cabeçalho', 'Segurança', 'Usuários', 'Auditoria'
];

// Componente customizado para selecionar as permissões do cargo via Checkboxes
const PermissionsSelectField = ({ name, value, onChange, label, error, gridColumn }) => {
  const selected = Array.isArray(value) ? value : [];

  const togglePerm = (perm) => {
    if (selected.includes(perm)) {
      onChange({ target: { name, value: selected.filter(p => p !== perm) } });
    } else {
      onChange({ target: { name, value: [...selected, perm] } });
    }
  };

  return (
    <div style={{ gridColumn, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>{label}</label>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px', padding: '16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#f9fafb'
      }}>
        {permissionsList.map(perm => (
          <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={selected.includes(perm)}
              onChange={() => togglePerm(perm)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
            {perm}
          </label>
        ))}
      </div>
      {error && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</span>}
    </div>
  );
};

const roleSchema = z.object({
  name: z.string().min(2, 'O nome do cargo deve ter no mínimo 2 caracteres'),
  permissions: z.array(z.string()).min(1, 'Selecione pelo menos uma permissão')
});

const fields = [
  {
    name: 'name', component: TextField, label: 'Nome do Cargo',
    required: true, placeholder: 'Ex: Editor de Conteúdo', gridColumn: 'span 2'
  },
  {
    name: 'permissions', component: PermissionsSelectField, label: 'Permissões do Cargo',
    gridColumn: 'span 2'
  }
];

const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'name', header: 'Nome do Cargo', render: (item) => <strong>{item.name}</strong> },
  {
    key: 'permissions', header: 'Permissões Vinculadas',
    render: (item) => {
      const perms = Array.isArray(item.permissions) ? item.permissions : [];
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {perms.map(p => (
            <span key={p} style={{
              padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem',
              backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'
            }}>{p}</span>
          ))}
        </div>
      );
    }
  }
];

export default function AdminRolesTab() {
  return (
    <AdminCrudBase apiEndpoint="/api/admin/roles" title="Gestão de Cargos e Permissões"
      fields={fields} columns={columns} initialFormData={{ name: '', permissions: [] }}
      validationSchema={roleSchema} newButtonText="+ Novo Cargo" searchable={false}
      showItemCount={true} itemNameSingular="cargo cadastrado" itemNamePlural="cargos cadastrados" />
  );
}