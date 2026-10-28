import { useRef } from 'react';
import AdminCrudBase from '@/components/Admin/AdminCrudBase';
import TextField from '@/components/Admin/fields/TextField';
import { z } from 'zod';
import toast from 'react-hot-toast';

/**
 * Schema de validação para categorias (spec posts.md §3.4).
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
});

/**
 * Gera slug a partir do nome (mesmo algoritmo de AdminPosts).
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Colunas da tabela (sem coluna de status — categoria não tem publicado/rascunho).
 */
const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'name', header: 'Nome' },
  { key: 'slug', header: 'Slug' }
];

/**
 * Campos do modal de criação/edição.
 */
const fields = [
  {
    name: 'name',
    component: TextField,
    label: 'Nome',
    required: true,
    placeholder: 'Nome da categoria',
    gridColumn: 'span 2'
  },
  {
    name: 'slug',
    component: TextField,
    label: 'Slug (URL amigável)',
    required: true,
    placeholder: 'nome-da-categoria',
    hint: 'Gerado automaticamente a partir do nome; pode ser editado.',
    gridColumn: 'span 2'
  }
];

/**
 * Dados iniciais do formulário.
 */
const initialFormData = { name: '', slug: '' };

/**
 * AdminCategories - CRUD de categorias de posts dentro da aba "Posts/Artigos".
 *
 * Segue o padrão de {@link AdminDicas} (configuração do `AdminCrudBase`) com a
 * geração automática de slug de `AdminPosts`. A permissão não é verificada aqui:
 * a aba já é gated por "Posts/Artigos" em `pages/admin.js`.
 *
 * @component
 * @returns {JSX.Element} Painel de gerenciamento de categorias
 *
 * @example
 * <AdminCategories />
 */
export default function AdminCategories() {
  const slugGeneratedRef = useRef(false);

  /**
   * Renderizador customizado para campos especiais:
   * - `name`: `onBlur` gera o slug quando o campo slug está vazio (toast uma vez);
   * - `slug`: renderização normal do TextField.
   */
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue, error) => {
    if (fieldConfig.name === 'slug') {
      const fieldError = error?.errors?.[fieldConfig.name]?.[0];

      return (
        <div key="slug" style={{ gridColumn: fieldConfig.gridColumn || 'span 1' }}>
          <fieldConfig.component
            name="slug"
            label={fieldConfig.label}
            value={formData.slug ?? ''}
            onChange={handleInputChange}
            required={fieldConfig.required}
            placeholder={fieldConfig.placeholder}
            hint={fieldConfig.hint}
            error={fieldError}
          />
        </div>
      );
    }

    if (fieldConfig.name === 'name') {
      const fieldError = error?.errors?.[fieldConfig.name]?.[0];

      return (
        <div key="name" style={{ gridColumn: fieldConfig.gridColumn || 'span 1' }}>
          <TextField
            name="name"
            label={fieldConfig.label}
            value={formData.name ?? ''}
            onChange={handleInputChange}
            onBlur={() => {
              if (!formData.slug && formData.name) {
                setFieldValue('slug', generateSlug(formData.name));
                if (!slugGeneratedRef.current) {
                  slugGeneratedRef.current = true;
                  toast.success('Slug gerado automaticamente a partir do nome', { id: 'slug-generated' });
                }
              }
            }}
            required={fieldConfig.required}
            placeholder={fieldConfig.placeholder}
            error={fieldError}
          />
        </div>
      );
    }

    return null; // Deixa o AdminCrudBase renderizar os outros campos normalmente
  };

  return (
    <AdminCrudBase
      title="Gerenciar Categorias"
      apiEndpoint="/api/admin/categories"
      columns={columns}
      fields={fields}
      initialFormData={initialFormData}
      validationSchema={categorySchema}
      renderCustomFormField={renderCustomFormField}
      newButtonText="+ Nova Categoria"
      saveButtonText="Salvar"
      updateButtonText="Atualizar"
      emptyMessage="Nenhuma categoria cadastrada."
      searchable={true}
      showItemCount={true}
      itemNameSingular="categoria cadastrada"
      itemNamePlural="categorias cadastradas"
    />
  );
}
