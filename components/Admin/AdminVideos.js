import React, { useState } from 'react';
import toast from 'react-hot-toast';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import UrlField from './fields/UrlField';
import ToggleField from './fields/ToggleField';
import ImageUploadField from './fields/ImageUploadField';
import ExternalDataButton from './fields/ExternalDataButton';
import { handleReorder } from '@/lib/reorder';
import { extractYoutubeId } from '@/lib/youtube';
import LazyIframe from '@/components/Performance/LazyIframe';
import { z } from 'zod';

/**
 * Schema de validação para vídeos
 */
const videoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  url_youtube: z.string().min(1, 'URL do YouTube é obrigatória'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  thumbnail: z.string().optional()
});

/**
 * Configuração dos campos do formulário
 */
const fields = [
  {
    name: 'titulo',
    component: TextField,
    label: 'Título do Vídeo',
    required: true,
    placeholder: 'Nome do vídeo',
    gridColumn: 'span 2'
  },
  {
    name: 'descricao',
    component: TextField,
    label: 'Descrição',
    type: 'textarea',
    rows: 3,
    maxLength: 500,
    placeholder: 'Descrição do vídeo (máximo 500 caracteres)',
    gridColumn: 'span 2',
    hint: 'Use até 500 caracteres para descrever o vídeo'
  },
  {
    name: 'url_youtube',
    component: UrlField,
    label: 'Link do YouTube',
    required: true,
    platform: 'youtube',
    showPreview: true,
    gridColumn: 'span 2',
    hint: 'Formato: https://www.youtube.com/watch?v=...'
  },
  {
    name: 'thumbnail',
    component: ImageUploadField,
    label: 'Capa Personalizada',
    placeholder: 'https://... ou faça upload',
    uploadType: 'post',
    gridColumn: 'span 2',
    hint: 'Opcional. Se vazio, usará a miniatura padrão do YouTube.'
  },
  {
    name: 'publicado',
    component: ToggleField,
    label: 'Publicar vídeo imediatamente',
    description: 'Se desmarcado, o vídeo será salvo como rascunho.',
    gridColumn: 'span 2'
  }
];

/**
 * Configuração das colunas da tabela
 */
const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { 
    key: 'titulo', 
    header: 'Título',
    render: (item) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {item.thumbnail && (
          <img 
            src={item.thumbnail} 
            alt="Capa" 
            style={{ 
              width: '40px', 
              height: '40px', 
              objectFit: 'cover', 
              borderRadius: '4px',
              border: '1px solid #e9ecef'
            }} 
          />
        )}
        <span style={{ fontWeight: 500 }}>{item.titulo}</span>
      </div>
    )
  },
  {
    key: 'url_youtube',
    header: 'YouTube',
    width: '350px',
    render: (item) => {
      const videoId = extractYoutubeId(item.url_youtube);
      return (
        <div>
          <a 
            href={item.url_youtube} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#ff0000', textDecoration: 'none', fontWeight: 500 }}
          >
            📺 Abrir no YouTube
          </a>
          {videoId && (
            <div style={{ marginTop: '10px' }}>
              <LazyIframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
                title={`Pré-visualização do vídeo ${item.titulo}`}
                provider="youtube"
                aspectRatio="16/9"
                loadOnVisible={false}
                placeholderText="▶ Clique para carregar"
              />
            </div>
          )}
        </div>
      );
    }
  },
  {
    key: 'publicado',
    header: 'Status',
    // Customizando as cores especificamente para a aba de Vídeos (Estilo Youtube)
    activeBgColor: '#fee2e2', // Fundo vermelho claro
    activeColor: '#991b1b', // Texto vermelho escuro
    activeIcon: '🎬',
    inactiveBgColor: '#f3f4f6', // Fundo cinza padrão
    inactiveIcon: '⏸️'
  }
];

/**
 * Dados iniciais do formulário
 */
const initialFormData = {
  titulo: '',
  descricao: '',
  url_youtube: '',
  thumbnail: null,
  publicado: false
};

/**
 * AdminVideosNew - Componente refatorado usando AdminCrudBase
 * 
 * Exemplo de uso do sistema CRUD reutilizável para gerenciamento de vídeos.
 * Demonstra como configurar campos, colunas e validação.
 */
export default function AdminVideosNew() {
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

  // Configuração do botão "Puxar Dados" do YouTube
  const youtubeButtonConfig = {
    endpoint: '/api/admin/fetch-youtube',
    buttonColor: '#ff0000',
    buttonTextColor: '#fff',
    loadingMessage: 'Buscando dados no YouTube...',
    successMessage: 'Vídeo encontrado!',
    validateUrl: (url) => url && (url.includes('youtube.com') || url.includes('youtu.be')),
    invalidUrlMessage: 'Cole um link válido do YouTube primeiro!',
    fieldMappings: {
      titulo: 'title'
    }
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'url_youtube') {
      const { name, component: Component, gridColumn, ...props } = fieldConfig;
      return (
        <ExternalDataButton
          key={name}
          fieldName={name}
          gridColumn={gridColumn || 'span 1'}
          url={formData[name]}
          setFieldValue={setFieldValue}
          isFetching={isFetchingYoutube}
          setIsFetching={setIsFetchingYoutube}
          config={youtubeButtonConfig}
        >
          <Component name={name} value={formData[name] ?? ''} onChange={handleInputChange} {...props} />
        </ExternalDataButton>
      );
    }
    return null;
  };

  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/videos"
      title="Gestão de Vídeos"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={videoSchema}
      usePagination={true}
      itemsPerPage={10}
      newButtonText="+ Novo Vídeo"
      saveButtonText="Cadastrar Vídeo"
      updateButtonText="Atualizar Vídeo"
      emptyMessage="Nenhum vídeo cadastrado ainda."
      searchable={true}
      exportable={true}
      reorderable={true}
      onReorder={(items, page, perPage) => handleReorder('/api/admin/videos', items, page, perPage)}
      renderCustomFormField={renderCustomFormField}
      showItemCount={true}
      itemNameSingular="vídeo cadastrado"
      itemNamePlural="vídeos cadastrados"
    />
  );
}