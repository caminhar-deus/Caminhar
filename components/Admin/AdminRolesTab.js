import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import { z } from 'zod';
import permissionsList from '@/lib/domain/permissions';
import styles from './styles/permissions.module.css';

// Componente customizado para selecionar as permissões do cargo via Checkboxes
const PermissionsSelectField = ({ name, value, onChange, label, error, gridColumn }) => {
  // Normaliza permissões antigas e remove duplicatas (ex: 'Dicas' para 'Gestão de Dicas')
  const rawSelected = Array.isArray(value) ? value : [];
  const selected = [...new Set(rawSelected.map(p => p === 'Dicas' ? 'Gestão de Dicas' : p))];

  const togglePerm = (perm) => {
    if (selected.includes(perm)) {
      onChange({ target: { name, value: selected.filter(p => p !== perm) } });
    } else {
      onChange({ target: { name, value: [...selected, perm] } });
    }
  };

  return (
    <div style={{ gridColumn }} className={styles.permissionsField}>
      <label className={styles.permissionsLabel}>{label}</label>
      <div className={`${styles.permissionsGrid}${error ? ` ${styles.permissionsGridError}` : ''}`}>
        {permissionsList.map(perm => (
          <label key={perm} className={styles.permissionsCheckbox}>
            <input
              type="checkbox"
              className={styles.permissionsCheckboxInput}
              checked={selected.includes(perm)}
              onChange={() => togglePerm(perm)}
            />
            {perm}
          </label>
        ))}
      </div>
      {error && <span className={styles.permissionsError}>{error}</span>}
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
      const rawPerms = Array.isArray(item.permissions) ? item.permissions : [];
      // Normaliza para exibição e filtra apenas as permissões válidas da lista atual
      const perms = [...new Set(rawPerms.map(p => p === 'Dicas' ? 'Gestão de Dicas' : p))].filter(p => permissionsList.includes(p));
      return (
        <div className={styles.permissionsBadgeContainer}>
          {perms.map(p => (
            <span key={p} className={styles.permissionsBadge}>{p}</span>
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