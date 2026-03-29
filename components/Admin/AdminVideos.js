import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
            height="200"
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
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

  // Função responsável por calcular o offset em relação à página e salvar no DB de forma silenciosa
  const handleReorder = async (reorderedItems, currentPage = 1, itemsPerPage = 10) => {
    const offset = (currentPage - 1) * itemsPerPage;
    const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index }));
    
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', items: payload })
      });
      if (!response.ok) throw new Error('Falha ao reordenar');
    } catch (error) {
      console.error('Erro ao salvar reordenação:', error);
    }
  };

  // Função para buscar dados do YouTube
  const handleFetchYoutube = async (url, setFieldValue) => {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      toast.error('Cole um link válido do YouTube primeiro!');
      return;
    }
    
    setIsFetchingYoutube(true);
    const loadingToast = toast.loading('Buscando dados no YouTube...');

    try {
      const res = await fetch('/api/admin/fetch-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha na busca.');
      }

      const data = await res.json();

      // Preenche o formulário
      setFieldValue('titulo', data.title);

      toast.success('Vídeo encontrado!', { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsFetchingYoutube(false);
    }
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'url_youtube') {
      const { name, component: Component, gridColumn, ...props } = fieldConfig;
      return (
        <div key={name} style={{ gridColumn: gridColumn || 'span 1', position: 'relative' }}>
          <button
            type="button"
            onClick={() => handleFetchYoutube(formData[name], setFieldValue)}
            disabled={isFetchingYoutube}
            title="Puxar Título automaticamente"
            style={{ position: 'absolute', right: '0', top: '0', padding: '4px 10px', backgroundColor: '#ff0000', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: isFetchingYoutube ? 'not-allowed' : 'pointer', opacity: isFetchingYoutube ? 0.7 : 1, zIndex: 10 }}
          >
            {isFetchingYoutube ? '⏳ Buscando...' : '⚡ Puxar Dados'}
          </button>
          <Component name={name} value={formData[name] ?? ''} onChange={handleInputChange} {...props} />
        </div>
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
      onReorder={handleReorder}
      renderCustomFormField={renderCustomFormField}
      showItemCount={true}
      itemNameSingular="vídeo cadastrado"
      itemNamePlural="vídeos cadastrados"
    />
  );
}