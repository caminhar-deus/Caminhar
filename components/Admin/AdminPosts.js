import { useRef, useState } from 'react';
import AdminCrudBase from './AdminCrudBase';
import AdminCategories from './AdminCategories';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ImageUploadField from './fields/ImageUploadField';
import ToggleField from './fields/ToggleField';
import { handleReorder } from '@/utils/reorder';
import { useApiFetch } from '@/hooks/useApiFetch';
import { z } from 'zod';
import toast from 'react-hot-toast';
import styles from './styles/adminPosts.module.css';

/**
 * Schema de validação para posts
 */
const postSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  excerpt: z.string().max(500, 'Resumo deve ter no máximo 500 caracteres').optional().nullable(),
  content: z.string().optional().nullable(),
  image_url: z.string().refine(val =>
    !val || val === '' || val.startsWith('http') || val.startsWith('/'), {
    message: 'Por favor, insira uma URL completa (https://...) ou um caminho local válido (/uploads/...).'
  }).optional().nullable(),
  published: z.boolean().optional(),
  // Campo opcional: post sem categoria é válido (spec posts.md §2.2)
  category_ids: z.array(z.number()).optional()
});

/**
 * Gera slug a partir do título
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Campo de seleção de categorias do formulário de post (spec posts.md §2.1–§2.2).
 *
 * Grupo de checkboxes com wrap (mesma estrutura do `PermissionsSelectField` de
 * `AdminRolesTab.js`), valor como `number[]` de ids.
 *
 * @param {Object} props
 * @param {string} props.name - Nome do campo (`category_ids`)
 * @param {number[]} props.value - Ids das categorias selecionadas
 * @param {Function} props.onChange - Handler no formato `{ target: { name, value } }`
 * @param {string} props.label - Rótulo visível acima do grupo
 * @param {string} [props.error] - Mensagem de erro de validação
 * @param {string} [props.hint] - Texto auxiliar abaixo do grupo
 * @param {string} [props.gridColumn] - Grid column aplicado pelo AdminCrudBase
 * @param {Array<{id:number,name:string,slug:string}>} props.options - Categorias cadastradas
 */
const CategorySelectField = ({ name, value, onChange, label, error, hint, gridColumn, options = [] }) => {
  const selected = Array.isArray(value) ? value : [];
  const labelId = `${name}-label`;
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;

  const toggleCategory = (categoryId) => {
    const next = selected.includes(categoryId)
      ? selected.filter((id) => id !== categoryId)
      : [...selected, categoryId];
    onChange({ target: { name, value: next } });
  };

  return (
    <div style={{ gridColumn }} className={styles.categoryField}>
      <label id={labelId} className={styles.categoryLabel}>{label}</label>
      <div
        className={error ? `${styles.categoryGroup} ${styles.categoryGroupError}` : styles.categoryGroup}
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
      >
        {options.length === 0 ? (
          <p className={styles.categoryEmpty} aria-live="polite">
            Nenhuma categoria cadastrada. Crie na aba &quot;Categorias&quot;.
          </p>
        ) : (
          options.map((category, index) => (
            <label key={category.id ?? category.slug} className={styles.categoryOption}>
              <input
                type="checkbox"
                id={index === 0 ? `${name}-${category.id}` : undefined}
                checked={selected.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              {category.name}
            </label>
          ))
        )}
      </div>
      {hint && !error && <p id={hintId} className={styles.categoryHint}>{hint}</p>}
      {error && <span id={errorId} className={styles.categoryError}>{error}</span>}
    </div>
  );
};

/**
 * Configuração dos campos do formulário
 */
const fields = [
  {
    name: 'title',
    component: TextField,
    label: 'Título',
    required: true,
    placeholder: 'Título do post',
    gridColumn: 'span 2'
  },
  {
    name: 'slug',
    component: TextField,
    label: 'Slug (URL amigável)',
    required: true,
    placeholder: 'exemplo-de-slug',
    hint: 'Usado na URL do post. Ex: meusite.com/blog/exemplo-de-slug',
    gridColumn: 'span 2'
  },
  {
    name: 'excerpt',
    component: TextAreaField,
    label: 'Resumo',
    rows: 3,
    maxLength: 500,
    placeholder: 'Breve descrição do post...',
    hint: 'Aparece na listagem do blog',
    gridColumn: 'span 2'
  },
  {
    name: 'content',
    component: TextAreaField,
    label: 'Conteúdo',
    rows: 10,
    placeholder: 'Conteúdo completo do post...',
    gridColumn: 'span 2'
  },
  {
    name: 'image_url',
    component: ImageUploadField,
    label: 'Imagem de Capa',
    placeholder: 'https://... ou faça upload',
    uploadType: 'post',
    gridColumn: 'span 2'
  },
  {
    name: 'published',
    component: ToggleField,
    label: 'Publicar post imediatamente',
    description: 'Se desmarcado, o post será salvo como rascunho.',
    activeLabel: 'Publicado',
    inactiveLabel: 'Rascunho',
    gridColumn: 'span 2'
  },
  {
    name: 'category_ids',
    component: CategorySelectField,
    label: 'Categorias',
    gridColumn: 'span 2',
    hint: 'Opcional. Selecione uma ou mais categorias.'
  }
];

/**
 * Configuração das colunas da tabela
 */
const columns = [
  { 
    key: 'id', 
    header: 'ID',
    width: '60px'
  },
  { 
    key: 'title', 
    header: 'Título',
    render: (item) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {item.image_url && (
          <img 
            src={item.image_url} 
            alt="" 
            style={{ 
              width: '40px', 
              height: '40px', 
              objectFit: 'cover', 
              borderRadius: '4px',
              border: '1px solid #e9ecef'
            }} 
          />
        )}
        <span style={{ fontWeight: 500 }}>{item.title}</span>
      </div>
    )
  },
  { 
    key: 'published', 
    header: 'Status',
    activeBgColor: '#e0f2fe', // Fundo azul claro
    activeColor: '#0369a1', // Texto azul escuro
    activeIcon: '📰', // Ícone de Jornal
    inactiveBgColor: '#f3f4f6', // Fundo cinza padrão
    inactiveIcon: '📝' // Ícone de rascunho
  },
  { 
    key: 'created_at', 
    header: 'Data',
    format: (value) => new Date(value).toLocaleDateString('pt-BR')
  }
];

/**
 * Dados iniciais do formulário
 */
const initialFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image_url: '',
  published: false,
  category_ids: []
};

/**
 * Validação customizada para posts
 * Garante que post publicado possua imagem de capa
 */
const validate = (data) => {
  if (data.published && !data.image_url) {
    throw new Error('Para publicar um post, é necessário vincular uma imagem de capa.');
  }
};

/**
 * AdminPostsNew - Componente refatorado usando AdminCrudBase
 * 
 * Demonstra uso de upload de imagens e geração automática de slug.
 * Inclui o toggle "Posts | Categorias" (spec posts.md §3) que alterna entre
 * este CRUD e o {@link AdminCategories}.
 */
export default function AdminPostsNew() {
  const slugGeneratedRef = useRef(false);

  // Aba interna: 'posts' (default) ou 'categories' (spec posts.md §3.2)
  const [view, setView] = useState('posts');

  // Lista completa de categorias para o campo de atribuição (spec posts.md §2.2)
  const { data: categoriesData } = useApiFetch('/api/admin/categories?all=1', {
    options: { credentials: 'include' },
    initialData: { data: [] },
  });
  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  // Anexa as opções ao campo `category_ids` (o array base é constante)
  const formFields = fields.map((field) => (
    field.name === 'category_ids' ? { ...field, options: categories } : field
  ));

  /**
   * Ao editar, preenche `category_ids` a partir de `post.categories` (ids) —
   * o hook grava o item inteiro no formulário (spec posts.md §2.2).
   */
  const mapItemToFormData = (item) => ({
    ...item,
    category_ids: Array.isArray(item.categories)
      ? item.categories.map((category) => category.id)
      : [],
  });

  /**
   * Renderizador customizado para campos especiais
   * Implementa geração automática de slug a partir do título com feedback visual
   */
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue, error) => {
    // Campo de slug com geração automática
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

    // Campo de título com onBlur para gerar slug automaticamente
    if (fieldConfig.name === 'title') {
      const fieldError = error?.errors?.[fieldConfig.name]?.[0];

      return (
        <div key="title" style={{ gridColumn: fieldConfig.gridColumn || 'span 1' }}>
          <TextField
            name="title"
            label={fieldConfig.label}
            value={formData.title ?? ''}
            onChange={handleInputChange}
            onBlur={() => {
              if (!formData.slug && formData.title) {
                setFieldValue('slug', generateSlug(formData.title));
                if (!slugGeneratedRef.current) {
                  slugGeneratedRef.current = true;
                  toast.success('Slug gerado automaticamente a partir do título', { id: 'slug-generated' });
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

  const toggleButtonClass = (active) => (
    active ? `${styles.toggleButton} ${styles.toggleButtonActive}` : styles.toggleButton
  );

  return (
    <>
      {/* Toggle "Posts | Categorias" (spec posts.md §3.2–§3.3) */}
      <div
        role="group"
        aria-label="Visualização da aba Posts/Artigos"
        className={styles.toggle}
      >
        <button
          type="button"
          aria-pressed={view === 'posts'}
          onClick={() => setView('posts')}
          className={toggleButtonClass(view === 'posts')}
        >
          Posts
        </button>
        <button
          type="button"
          aria-pressed={view === 'categories'}
          onClick={() => setView('categories')}
          className={toggleButtonClass(view === 'categories')}
        >
          Categorias
        </button>
      </div>

      {view === 'posts' ? (
        <AdminCrudBase
          apiEndpoint="/api/admin/posts"
          title="Gerenciar Posts"
          fields={formFields}
          columns={columns}
          initialFormData={initialFormData}
          validationSchema={postSchema}
          validate={validate}
          renderCustomFormField={renderCustomFormField}
          mapItemToFormData={mapItemToFormData}
          newButtonText="+ Novo Post"
          saveButtonText="Salvar"
          updateButtonText="Atualizar"
          emptyMessage="Nenhum post encontrado."
          searchable={true}
          exportable={true}
          reorderable={true}
          onReorder={(items, page, perPage) => handleReorder('/api/admin/posts', items, page, perPage)}
          showItemCount={true}
          itemNameSingular="post cadastrado"
          itemNamePlural="posts cadastrados"
        />
      ) : (
        <AdminCategories />
      )}
    </>
  );
}
