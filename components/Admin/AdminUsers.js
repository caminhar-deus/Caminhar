import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3, 'O usuário deve ter no mínimo 3 caracteres'),
  password: z.string().optional(), // Deixado opcional pois na edição a pessoa pode não querer alterar a senha
  role: z.string().min(1, 'A permissão é obrigatória')
});

/** Validação customizada para garantir a presença da senha ao criar um NOVO usuário */
const validateUser = (data) => {
  if (!data.id && (!data.password || data.password.trim().length < 6)) {
    return 'A senha deve ter no mínimo 6 caracteres para criar um novo acesso.';
  }
  return null;
};

const fields = [
  {
    name: 'username', component: TextField, label: 'Nome de Usuário',
    required: true, placeholder: 'Ex: novo.admin', gridColumn: 'span 2'
  },
  {
    name: 'password', component: TextField, label: 'Senha', type: 'password',
    placeholder: 'Deixe em branco para manter a senha atual (apenas na edição)', gridColumn: 'span 2',
    hint: 'Mínimo de 6 caracteres.'
  },
  {
    name: 'role', component: TextField, label: 'Cargo / Permissão',
    required: true, placeholder: 'Digite: admin ou user', gridColumn: 'span 2',
    hint: 'Apenas os cargos "admin" conseguem acessar este painel de administração.'
  }
];

const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'username', header: 'Usuário', render: (item) => <strong>{item.username}</strong> },
  { 
    key: 'role', header: 'Permissão', 
    render: (item) => (
      <span style={{ 
        padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
        backgroundColor: item.role === 'admin' ? '#d4edda' : '#e2e3e5',
        color: item.role === 'admin' ? '#155724' : '#383d41'
      }}>
        {item.role === 'admin' ? 'Administrador' : 'Usuário Restrito'}
      </span>
    ) 
  }
];

const initialFormData = { username: '', password: '', role: 'admin' };

export default function AdminUsers() {
  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/users"
      title="Gestão de Usuários e Admins"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={userSchema}
      validate={validateUser}
      newButtonText="+ Novo Usuário"
      saveButtonText="Salvar Usuário"
      updateButtonText="Atualizar Usuário"
      searchable={true}
    />
  );
}