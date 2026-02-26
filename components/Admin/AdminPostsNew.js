import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import ImageUploadField from './fields/ImageUploadField';
import ToggleField from './fields/ToggleField';
import { z } from 'zod';

/**
 * Schema de validação para posts
 */
const postSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  excerpt: z.string().max(500, 'Resumo deve ter no máximo 500 caracteres').optional(),
  content: z.string().optional()
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
    render: (item) => (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        backgroundColor: item.published ? '#d4edda' : '#fff3cd',
        color: item.published ? '#155724' : '#856404',
        border: `1px solid ${item.published ? '#c3e6cb' : '#ffeeba'}`
      }}>
        {item.published ? '✅ Publicado' : '📝 Rascunho'}
      </span>
    )
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
  published: false
};

/**
 * AdminPostsNew - Componente refatorado usando AdminCrudBase
 * 
 * Demonstra uso de upload de imagens e geração automática de slug.
 */
export default function AdminPostsNew() {
  /**
   * Renderizador customizado para campos especiais
   * Implementa geração automática de slug a partir do título
   */
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    // Campo de slug com geração automática
    if (fieldConfig.name === 'slug') {
      const handleTitleBlur = () => {
        if (!formData.slug && formData.title) {
          setFieldValue('slug', generateSlug(formData.title));
        }
      };

      return (
        <div key="slug" style={{ gridColumn: fieldConfig.gridColumn || 'span 1' }}>
          <fieldConfig.component
            name="slug"
            label={fieldConfig.label}
            value={formData.slug}
            onChange={handleInputChange}
            required={fieldConfig.required}
            placeholder={fieldConfig.placeholder}
            hint={fieldConfig.hint}
          />
        </div>
      );
    }

    // Campo de título com onBlur para gerar slug
    if (fieldConfig.name === 'title') {
      const originalOnChange = handleInputChange;
      const handleChangeWithBlur = (e) => {
        originalOnChange(e);
      };

      return (
        <div key="title" style={{ gridColumn: fieldConfig.gridColumn || 'span 1' }}>
          <TextField
            name="title"
            label={fieldConfig.label}
            value={formData.title}
            onChange={handleChangeWithBlur}
            onBlur={() => {
              if (!formData.slug && formData.title) {
                setFieldValue('slug', generateSlug(formData.title));
              }
            }}
            required={fieldConfig.required}
            placeholder={fieldConfig.placeholder}
          />
        </div>
      );
    }

    return null; // Deixa o AdminCrudBase renderizar os outros campos normalmente
  };

  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/posts"
      title="Gerenciar Posts"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={postSchema}
      renderCustomFormField={renderCustomFormField}
      newButtonText="+ Novo Post"
      saveButtonText="Salvar"
      updateButtonText="Atualizar"
      emptyMessage="Nenhum post encontrado."
    />
  );
}
