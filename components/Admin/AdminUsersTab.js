import React, { useState, useEffect } from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3, 'O usuário/email deve ter no mínimo 3 caracteres'),
  password: z.string().optional(),
  role: z.string().min(1, 'A permissão/cargo é obrigatória')
});

const validateUser = (data) => {
  if (!data.id && (!data.password || data.password.trim().length < 6)) {
    return 'A senha deve ter no mínimo 6 caracteres para criar um novo acesso.';
  }
  return null;
};

// Componente customizado para buscar e listar os cargos dinamicamente
const RoleSelectField = ({ value, onChange, label, error, hint, gridColumn }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/roles')
      .then(async res => {
        if (!res.ok) throw new Error(`Erro na API (${res.status})`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('A resposta do servidor não é um JSON válido');
        }
        return res.json();
      })
      .then(data => setRoles(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => console.error("Erro ao buscar cargos:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn }}>
      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px', borderRadius: '6px', backgroundColor: '#f9fafb',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`, width: '100%', fontSize: '0.95rem'
        }}
        disabled={loading}
      >
        <option value="">{loading ? 'Carregando cargos...' : 'Selecione um cargo'}</option>
        {/* Fallbacks para caso a tabela de cargos ainda esteja vazia */}
        {roles.length === 0 && !loading && (
          <>
            <option value="admin">Administrador (Padrão)</option>
            <option value="user">Usuário Restrito (Padrão)</option>
          </>
        )}
        {roles.map(r => (
          <option key={r.id} value={r.name}>{r.name}</option>
        ))}
      </select>
      {hint && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{hint}</span>}
      {error && <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '2px' }}>{error}</span>}
    </div>
  );
};

const fields = [
  {
    name: 'username', component: TextField, label: 'Nome de Usuário / E-mail',
    required: true, placeholder: 'Ex: novo.admin', gridColumn: 'span 2'
  },
  {
    name: 'password', component: TextField, label: 'Senha', type: 'password',
    placeholder: 'Deixe em branco para manter a senha atual (apenas na edição)', gridColumn: 'span 2',
    hint: 'Mínimo de 6 caracteres. Armazenada com hash seguro.'
  },
  {
    name: 'role', component: RoleSelectField, label: 'Cargo / Permissão',
    required: true, gridColumn: 'span 2',
    hint: 'O cargo define os níveis de acesso deste usuário no sistema.'
  }
];

const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'username', header: 'Usuário', render: (item) => <strong>{item.username}</strong> },
  { key: 'role', header: 'Cargo', render: (item) => (
      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#374151' }}>
        {item.role}
      </span>
  )}
];

export default function AdminUsersTab() {
  return (
    <AdminCrudBase apiEndpoint="/api/admin/users" title="Gestão de Usuários e Admins"
      fields={fields} columns={columns} initialFormData={{ username: '', password: '', role: '' }}
      validationSchema={userSchema} validate={validateUser} newButtonText="+ Novo Usuário" searchable={false}
      showItemCount={true} itemNameSingular="usuário cadastrado" itemNamePlural="usuários cadastrados" />
  );
}