import React, { useState } from 'react';
import styles from './styles/crud.module.css';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import UrlField from './fields/UrlField';
import ToggleField from './fields/ToggleField';
import ExternalDataButton from './fields/ExternalDataButton';
import { handleReorder } from '@/lib/reorder';
import { z } from 'zod';

/**
 * Schema de validação para músicas
 */
const musicaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  artista: z.string().min(1, 'Artista é obrigatório'),
  url_spotify: z.string().min(1, 'URL do Spotify é obrigatória')
});

/**
 * Configuração dos campos do formulário
 */
const fields = [
  {
    name: 'titulo',
    component: TextField,
    label: 'Título da Música',
    required: true,
    placeholder: 'Nome da música',
    gridColumn: 'span 1'
  },
  {
    name: 'artista',
    component: TextField,
    label: 'Nome do Artista',
    required: true,
    placeholder: 'Nome do artista',
    gridColumn: 'span 1'
  },
  {
    name: 'url_spotify',
    component: UrlField,
    label: 'Link do Spotify',
    required: true,
    platform: 'spotify',
    showPreview: true,
    gridColumn: 'span 2',
    hint: 'Formato: https://open.spotify.com/track/...'
  },
  {
    name: 'publicado',
    component: ToggleField,
    label: 'Publicar música imediatamente',
    description: 'Se desmarcado, a música será salva como rascunho.',
    gridColumn: 'span 2'
  }
];

/**
 * Configuração das colunas da tabela
 */
const columns = [
  { key: 'id', header: 'ID', width: '60px' },
  { key: 'titulo', header: 'Título' },
  { key: 'artista', header: 'Artista' },
  {
    key: 'url_spotify',
    header: 'Spotify',
    width: '350px',
    render: (item) => (
      <div>
        <a
          href={item.url_spotify}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.spotifyLink}
        >
          🎵 Abrir no Spotify
        </a>
        <div style={{ marginTop: '10px', minWidth: '300px' }}>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: '12px', overflow: 'hidden', background: 'transparent' }}
            src={`https://open.spotify.com/embed/track/${item.url_spotify.split('/').pop().split('?')[0]}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            scrolling="no"
          />
        </div>
      </div>
    )
  },
  {
    key: 'publicado',
    header: 'Status',
    activeBgColor: '#dcfce3', // Fundo verde claro (Estilo Spotify)
    activeColor: '#166534', // Texto verde escuro
    activeIcon: '🎵',
    inactiveBgColor: '#f3f4f6', // Fundo cinza padrão
    inactiveIcon: '⏸️'
  }
];

/**
 * Dados iniciais do formulário
 */
const initialFormData = {
  titulo: '',
  artista: '',
  url_spotify: '',
  publicado: false
};

/**
 * AdminMusicasNew - Componente refatorado usando AdminCrudBase
 * 
 * Exemplo de uso do sistema CRUD reutilizável para gerenciamento de músicas.
 * Demonstra como configurar campos, colunas e validação.
 */
export default function AdminMusicasNew() {
  const [isFetchingSpotify, setIsFetchingSpotify] = useState(false);

  // Configuração do botão "Puxar Dados" do Spotify
  const spotifyButtonConfig = {
    endpoint: '/api/admin/fetch-spotify',
    buttonColor: '#1DB954',
    buttonTextColor: '#fff',
    loadingMessage: 'Buscando dados no Spotify...',
    successMessage: 'Música encontrada!',
    validateUrl: (url) => url && url.includes('spotify'),
    invalidUrlMessage: 'Cole um link válido do Spotify primeiro!',
    fieldMappings: {
      titulo: 'title',
      artista: 'artist'
    }
  };

  // Função para processar dados do Spotify (pode incluir lógica extra além do mapeamento)
  const handleFetchSpotifySuccess = (data, setFieldValue) => {
    setFieldValue('titulo', data.title);
    setFieldValue('artista', data.artist);
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'url_spotify') {
      const { name, component: Component, gridColumn, ...props } = fieldConfig;
      return (
        <ExternalDataButton
          key={name}
          fieldName={name}
          gridColumn={gridColumn || 'span 1'}
          url={formData[name]}
          setFieldValue={setFieldValue}
          isFetching={isFetchingSpotify}
          setIsFetching={setIsFetchingSpotify}
          config={spotifyButtonConfig}
          onSuccess={handleFetchSpotifySuccess}
        >
          <Component name={name} value={formData[name] ?? ''} onChange={handleInputChange} {...props} />
        </ExternalDataButton>
      );
    }
    return null;
  };

  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/musicas"
      title="Gestão de Músicas"
      fields={fields}
      columns={columns}
      initialFormData={initialFormData}
      validationSchema={musicaSchema}
      newButtonText="+ Nova Música"
      saveButtonText="Cadastrar Música"
      updateButtonText="Atualizar Música"
      emptyMessage="Nenhuma música cadastrada ainda."
      searchable={true}
      exportable={true}
      reorderable={true}
      onReorder={(items, page, perPage) => handleReorder('/api/admin/musicas', items, page, perPage)}
      renderCustomFormField={renderCustomFormField}
      showItemCount={true}
      itemNameSingular="música cadastrada"
      itemNamePlural="músicas cadastradas"
    />
  );
}