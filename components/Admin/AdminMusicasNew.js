import React, { useState } from 'react';
import toast from 'react-hot-toast';
import styles from '../../styles/Admin.module.css';
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import UrlField from './fields/UrlField';
import ToggleField from './fields/ToggleField';
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
        <div className={styles.embedContainer}>
          <iframe
            data-testid="embed-iframe"
            className={styles.spotifyEmbed}
            src={`https://open.spotify.com/embed/track/${item.url_spotify.split('/').pop().split('?')[0]}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
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

  // Função responsável por calcular o offset em relação à página e salvar no DB de forma silenciosa
  const handleReorder = async (reorderedItems, currentPage = 1, itemsPerPage = 10) => {
    const offset = (currentPage - 1) * itemsPerPage;
    const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index }));
    
    try {
      const response = await fetch('/api/admin/musicas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', items: payload })
      });
      if (!response.ok) throw new Error('Falha ao reordenar');
    } catch (error) {
      console.error('Erro ao salvar reordenação:', error);
    }
  };

  // Função para buscar dados do Spotify
  const handleFetchSpotify = async (url, setFieldValue) => {
    if (!url || !url.includes('spotify')) {
      toast.error('Cole um link válido do Spotify primeiro!');
      return;
    }
    
    setIsFetchingSpotify(true);
    const loadingToast = toast.loading('Buscando dados no Spotify...');

    try {
      const res = await fetch('/api/admin/fetch-spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha na busca.');
      }

      const data = await res.json();

      // Preenche os formulários
      setFieldValue('titulo', data.title);
      setFieldValue('artista', data.artist);

      toast.success('Música encontrada!', { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsFetchingSpotify(false);
    }
  };

  // Intercepta a renderização do campo para adicionar o botão
  const renderCustomFormField = (fieldConfig, formData, handleInputChange, setFieldValue) => {
    if (fieldConfig.name === 'url_spotify') {
      const { name, component: Component, gridColumn, ...props } = fieldConfig;
      return (
        <div key={name} style={{ gridColumn: gridColumn || 'span 1', position: 'relative' }}>
          <button
            type="button"
            onClick={() => handleFetchSpotify(formData[name], setFieldValue)}
            disabled={isFetchingSpotify}
            title="Puxar Título e Artista automaticamente"
            style={{ position: 'absolute', right: '0', top: '0', padding: '4px 10px', backgroundColor: '#1DB954', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: isFetchingSpotify ? 'not-allowed' : 'pointer', opacity: isFetchingSpotify ? 0.7 : 1, zIndex: 10 }}
          >
            {isFetchingSpotify ? '⏳ Buscando...' : '⚡ Puxar Dados'}
          </button>
          <Component name={name} value={formData[name] ?? ''} onChange={handleInputChange} {...props} />
        </div>
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
      onReorder={handleReorder}
      renderCustomFormField={renderCustomFormField}
      showItemCount={true}
      itemNameSingular="música cadastrada"
      itemNamePlural="músicas cadastradas"
    />
  );
}