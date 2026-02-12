import React from 'react';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import TextAreaField from './fields/TextAreaField';
import UrlField from './fields/UrlField';
import ToggleField from './fields/ToggleField';
import styles from '../../styles/Admin.module.css';
import { z } from 'zod';

/**
 * Schema de validação para vídeos
 */
const videoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  url_youtube: z.string().min(1, 'URL do YouTube é obrigatória'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional()
});

/**
 * Extrai ID do YouTube da URL
 */
const getYouTubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

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
    component: TextAreaField,
    label: 'Descrição',
    rows: 3,
    maxLength: 500,
    placeholder: 'Descreva o vídeo...',
    gridColumn: 'span 2'
  },
  {
    name: 'url_youtube',
    component: UrlField,
    label: 'URL do YouTube',
    required: true,
    platform: 'youtube',
    showPreview: true,
    gridColumn: 'span 2',
    hint: 'Formatos aceitos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID'
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
      <a 
        href={item.url_youtube} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: '#FF0000', textDecoration: 'none', fontWeight: 500 }}
      >
        ▶️ Abrir no YouTube
      </a>
    )
  },
  {
    key: 'preview',
    header: 'Preview',
    render: (item) => {
      const videoId = getYouTubeId(item.url_youtube);
      if (!videoId) return <span style={{ color: '#6c757d', fontStyle: 'italic' }}>URL inválida</span>;
      
      return (
        <div className={styles.videoPreview}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
            width="120"
            height="67.5"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`Preview ${item.titulo}`}
          />
        </div>
      );
    }
  },
  { key: 'publicado', header: 'Status' }
];

/**
 * Dados iniciais do formulário
 */
const initialFormData = {
  titulo: '',
  descricao: '',
  url_youtube: '',
  publicado: false
};

/**
 * AdminVideosNew - Componente refatorado usando AdminCrudBase
 * 
 * Demonstra uso de paginação e campos complexos.
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
