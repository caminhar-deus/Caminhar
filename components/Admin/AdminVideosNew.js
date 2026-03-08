import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import UrlField from './fields/UrlField';
import ToggleField from './fields/ToggleField';
import ImageUploadField from './fields/ImageUploadField';
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
  { key: 'titulo', header: 'Título' },
  {
    key: 'url_youtube',
    header: 'YouTube',
    render: (item) => (
      <div>
        <a 
          href={item.url_youtube} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#ff0000', textDecoration: 'none', fontWeight: 500 }}
        >
          📺 Abrir no YouTube
        </a>
        <div style={{ marginTop: '10px' }}>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: '8px' }}
            src={`https://www.youtube.com/embed/${item.url_youtube.split('/').pop().split('?')[0]}?autoplay=0`}
            width="100%"
            height="160"
            frameBorder="0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            loading="lazy"
          />
        </div>
      </div>
    )
  },
  {
    key: 'publicado',
    header: 'Status',
    render: (item) => (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        backgroundColor: item.publicado ? '#d4edda' : '#fff3cd',
        color: item.publicado ? '#155724' : '#856404',
        border: `1px solid ${item.publicado ? '#c3e6cb' : '#ffeeba'}`
      }}>
        {item.publicado ? '✅ Publicado' : '📝 Rascunho'}
      </span>
    )
  }
];

/**
 * Dados iniciais do formulário
 */
const initialFormData = {
  titulo: '',
  descricao: '',
  url_youtube: '',
  thumbnail: '',
  publicado: false
};

/**
 * AdminVideosNew - Componente refatorado usando AdminCrudBase
 * 
 * Exemplo de uso do sistema CRUD reutilizável para gerenciamento de vídeos.
 * Demonstra como configurar campos, colunas e validação.
 */
export default function AdminVideosNew() {
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
    />
  );
}