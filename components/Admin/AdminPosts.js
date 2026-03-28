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
  content: z.string().optional(),
  image_url: z.string().refine(val => 
    !val || val === '' || val.startsWith('http') || val.startsWith('/'), {
    message: 'Por favor, insira uma URL completa (https://...) ou um caminho local válido (/uploads/...).'
  }).optional(),
  published: z.boolean().optional()
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
  published: false
};

/**
 * AdminPostsNew - Componente refatorado usando AdminCrudBase
 * 
 * Demonstra uso de upload de imagens e geração automática de slug.
 */
export default function AdminPostsNew() {
  // Função responsável por calcular o offset em relação à página e salvar no DB de forma silenciosa
  const handleReorder = async (reorderedItems, currentPage = 1, itemsPerPage = 10) => {
    const offset = (currentPage - 1) * itemsPerPage;
    const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index }));
    
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', items: payload })
      });
      if (!response.ok) throw new Error('Falha ao reordenar');
    } catch (error) {
      console.error('Erro ao salvar reordenação:', error);
    }
  };

  /**
   * Função de validação customizada
   * Impede publicação de posts sem imagem
   */
  const validatePost = (formData) => {
    if (formData.published && !formData.image_url) {
      // Lança um erro estruturado para ser pego pelo hook e exibido no campo correto.
      const error = new Error('Para publicar um post, é necessário vincular uma imagem de capa.');
      error.errors = {
        image_url: ['A imagem de capa é obrigatória para posts publicados.']
      };
      throw error;
    }
  };

  /**
   * Renderizador customizado para campos especiais
   * Implementa geração automática de slug a partir do título
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

    // Campo de título com onBlur para gerar slug
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
      apiEndpoint="/api/admin/posts"
      title="Gerenciar Posts"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={postSchema}
      validate={validatePost}
      renderCustomFormField={renderCustomFormField}
      newButtonText="+ Novo Post"
      saveButtonText="Salvar"
      updateButtonText="Atualizar"
      emptyMessage="Nenhum post encontrado."
      searchable={true}
      exportable={true}
      reorderable={true}
      onReorder={handleReorder}
      showItemCount={true}
      itemNameSingular="post cadastrado"
      itemNamePlural="posts cadastrados"
    />
  );
}
