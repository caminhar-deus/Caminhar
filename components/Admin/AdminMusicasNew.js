import React from 'react';
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
    render: (item) => (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        backgroundColor: item.publicado ? '#d4edda' : '#fff3cd',
        color: item.publicado ? '#155724' : '#856404',
        border: `1px solid ${item.publicado ? '#c3e6cb' : '#ffeeba'}`,
        whiteSpace: 'nowrap'
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
    />
  );
}