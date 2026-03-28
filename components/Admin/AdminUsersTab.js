import React, { useState, useEffect } from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';

const userSchema = z.object({
  username: z.string().min(3, 'O usuário/email deve ter no mínimo 3 caracteres'),
  password: z.string().optional(),
  role: z.string().min(1, 'A permissão/cargo é obrigatória')
});

const validateUser = (data) => {
  // Validação para novos usuários: a senha é obrigatória e deve ter no mínimo 6 caracteres.
  if (!data.id && (!data.password || data.password.trim().length < 6)) {
    const error = new Error('A senha é obrigatória e deve ter no mínimo 6 caracteres.');
    error.errors = {
      password: ['A senha deve ter no mínimo 6 caracteres para novos usuários.']
    };
    throw error;
  }
  // Validação para atualização: se uma nova senha for fornecida, ela também deve ter no mínimo 6 caracteres.
  if (data.id && data.password && data.password.trim().length > 0 && data.password.trim().length < 6) {
    const error = new Error('A nova senha deve ter no mínimo 6 caracteres.');
    error.errors = {
      password: ['A nova senha deve ter no mínimo 6 caracteres.']
    };
    throw error;
  }
};

// Função para formatar a data de forma amigável
const formatLastLogin = (dateString) => {
  if (!dateString) {
    return <span style={{ color: '#888' }}>Nunca</span>;
  }
  try {
    // Formata a data para um formato relativo (ex: "há 2 horas")
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true, // Adiciona o "há" na frente
      locale: ptBR,    // Usa o formato em português
    });
  } catch (error) {
    return <span style={{ color: 'red' }}>Data inválida</span>;
  }
};

// Componente customizado para buscar e listar os cargos dinamicamente
const RoleSelectField = ({ name, value, onChange, label, error, hint, gridColumn }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/roles', { credentials: 'include' })
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
      .then(data => setRoles(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn }}>
      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>{label}</label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
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
  )},
  { 
    key: 'last_login_at', 
    header: 'Último Login', 
    render: (item) => formatLastLogin(item.last_login_at) 
  }
];

export default function AdminUsersTab() {
  return (
    <AdminCrudBase apiEndpoint="/api/admin/users" title="Gestão de Usuários e Admins"
      fields={fields} columns={columns} initialFormData={{ username: '', password: '', role: '' }}
      validationSchema={userSchema} validate={validateUser} newButtonText="+ Novo Usuário" searchable={false}
      showItemCount={true} itemNameSingular="usuário cadastrado" itemNamePlural="usuários cadastrados" />
  );
}