import { useState, useEffect } from 'react';
import styles from '../styles/Admin.module.css';

export default function AdminMusicas() {
  const [musicas, setMusicas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    artista: '',
    url_imagem: '',
    url_spotify: '',
    publicado: false
  });

  // Load musicas on component mount
  useEffect(() => {
    loadMusicas();
  }, []);

  const loadMusicas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/musicas', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMusicas(data);
      } else {
        throw new Error('Erro ao carregar músicas');
      }
    } catch (error) {
      console.error('Error loading musicas:', error);
      setError('Erro ao carregar músicas');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? '/api/admin/musicas' : '/api/admin/musicas';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: isEditing ? editingId : undefined
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(isEditing ? 'Música atualizada com sucesso!' : 'Música criada com sucesso!');
        setFormData({ titulo: '', artista: '', url_imagem: '', url_spotify: '', publicado: false });
        setIsEditing(false);
        setEditingId(null);
        loadMusicas();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar música');
      }
    } catch (error) {
      console.error('Error saving musica:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (musica) => {
    setFormData({
      titulo: musica.titulo,
      artista: musica.artista,
      url_imagem: musica.url_imagem || '',
      url_spotify: musica.url_spotify,
      publicado: musica.publicado
    });
    setIsEditing(true);
    setEditingId(musica.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta música?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/musicas', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess('Música excluída com sucesso!');
        loadMusicas();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir música');
      }
    } catch (error) {
      console.error('Error deleting musica:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ titulo: '', artista: '', url_imagem: '', url_spotify: '', publicado: false });
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className={styles.content}>
      <div className={styles.sectionHeader}>
        <h2>Gestão de Músicas</h2>
        <div className={styles.formActions}>
          <button 
            onClick={handleCancel} 
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              setFormData({ titulo: '', artista: '', url_imagem: '', url_spotify: '', publicado: false });
              setIsEditing(false);
              setEditingId(null);
            }} 
            className={styles.addButton}
            disabled={loading}
          >
            + Nova Música
          </button>
        </div>
      </div>

      {/* Form */}
      <div className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Título da Música</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Nome do Artista</label>
              <input
                type="text"
                name="artista"
                value={formData.artista}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label>Link do Spotify</label>
            <input
              type="url"
              name="url_spotify"
              value={formData.url_spotify}
              onChange={handleInputChange}
              className={styles.input}
              required
              placeholder="https://open.spotify.com/track/..."
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="publicado"
                  checked={formData.publicado}
                  onChange={handleInputChange}
                  style={{ width: 'auto', margin: 0 }}
                />
                Publicar música imediatamente
              </label>
              <small className={styles.formHint}>
                Se desmarcado, a música será salva como rascunho.
              </small>
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Música' : 'Cadastrar Música'}
            </button>
          </div>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
      
      {success && (
        <div className={styles.successMessage}>
          {success}
        </div>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Artista</th>
              <th>Spotify URL</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {musicas.length > 0 ? (
              musicas.map((musica) => (
                <tr key={musica.id}>
                  <td>{musica.id}</td>
                  <td>{musica.titulo}</td>
                  <td>{musica.artista}</td>
                  <td>
                    <a 
                      href={musica.url_spotify} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      Ver no Spotify
                    </a>
                    <div style={{ marginTop: '10px' }}>
                      <iframe 
                        data-testid="embed-iframe" 
                        style={{ borderRadius: '12px' }} 
                        src={`https://open.spotify.com/embed/track/${musica.url_spotify.split('/').pop()}?utm_source=generator&theme=0`} 
                        width="100%" 
                        height="352" 
                        frameBorder="0" 
                        allowfullscreen="" 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy"
                      ></iframe>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      backgroundColor: musica.publicado ? '#d4edda' : '#fff3cd',
                      color: musica.publicado ? '#155724' : '#856404',
                      border: `1px solid ${musica.publicado ? '#c3e6cb' : '#ffeeba'}`
                    }}>
                      {musica.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleEdit(musica)}
                      >
                        Editar
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={() => handleDelete(musica.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className={styles.emptyStateRow}>
                  Nenhuma música cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}