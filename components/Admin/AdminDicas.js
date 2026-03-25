import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ToggleField from './fields/ToggleField';

export default function AdminDicas() {
  // Define as colunas que aparecerão na tabela de listagem
  const columns = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'name', header: 'Nome' },
    { 
      key: 'content', 
      header: 'Conteúdo', 
      format: (val) => val && val.length > 80 ? `${val.substring(0, 80)}...` : val 
    },
    { 
      key: 'published', 
      header: 'Status', 
      width: '120px',
      activeBgColor: '#dcfce7',
      activeColor: '#166534',
      activeIcon: '✅',
      inactiveBgColor: '#f3f4f6',
      inactiveColor: '#4b5563',
      inactiveIcon: '📝'
    }
  ];

  // Define os campos do modal de Criação/Edição
  const fields = [
    { name: 'name', component: TextField, label: 'Nome da Dica', required: true, placeholder: 'Ex: Palavra do dia' },
    { name: 'content', component: TextAreaField, label: 'Conteúdo da Mensagem', required: true, placeholder: 'Digite a mensagem inspiradora...', rows: 4 },
    { name: 'published', component: ToggleField, label: 'Status de Publicação', description: 'Ative para exibir esta dica no site público' }
  ];

  return (
    <AdminCrudBase
      title="Gerenciar Dicas do Dia"
      apiEndpoint="/api/admin/dicas"
      columns={columns}
      fields={fields}
      initialFormData={{ name: '', content: '', published: true }}
      itemNameSingular="dica"
      itemNamePlural="dicas"
      searchable={true}
    />
  );
}