import { useState, useEffect } from 'react';
import styles from '../styles/Admin.module.css';

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    url_youtube: '',
    descricao: '',
    publicado: false
  });

  // Load videos on component mount
  useEffect(() => {
    loadVideos(1);
  }, []);

  const loadVideos = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/videos?page=${page}&limit=10`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.page);
      } else {
        throw new Error('Erro ao carregar vídeos');
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setError('Erro ao carregar vídeos');
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
      const url = isEditing ? '/api/admin/videos' : '/api/admin/videos';
      
      console.log('Enviando dados para API:', {
        method,
        url,
        formData,
        body: JSON.stringify({
          ...formData,
          id: isEditing ? editingId : undefined
        })
      });
      
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
        setSuccess(isEditing ? 'Vídeo atualizado com sucesso!' : 'Vídeo criado com sucesso!');
        setFormData({ titulo: '', url_youtube: '', descricao: '', publicado: false });
        setIsEditing(false);
        setEditingId(null);
        loadVideos(isEditing ? currentPage : 1);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar vídeo');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (video) => {
    setFormData({
      titulo: video.titulo,
      url_youtube: video.url_youtube,
      descricao: video.descricao || '',
      publicado: video.publicado
    });
    setIsEditing(true);
    setEditingId(video.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess('Vídeo excluído com sucesso!');
        loadVideos(currentPage);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir vídeo');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ titulo: '', url_youtube: '', descricao: '', publicado: false });
    setIsEditing(false);
    setEditingId(null);
  };

  // Extract YouTube video ID for preview
  const getYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const getYouTubePreviewUrl = (url) => {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=0` : null;
  };

  return (
    <div className={styles.content}>
      <div className={styles.sectionHeader}>
        <h2>Gestão de Vídeos</h2>
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
              setFormData({ titulo: '', url_youtube: '', descricao: '', publicado: false });
              setIsEditing(false);
              setEditingId(null);
            }} 
            className={styles.addButton}
            disabled={loading}
          >
            + Novo Vídeo
          </button>
        </div>
      </div>

      {/* Form */}
      <div className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Título do Vídeo</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
            </div>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Descrição</label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                className={styles.input}
                rows="3"
                maxLength={500}
                style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
              />
              <small className={styles.formHint} style={{ display: 'block', textAlign: 'right' }}>
                {formData.descricao.length}/500 caracteres
              </small>
            </div>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>URL do YouTube</label>
              <input
                type="url"
                name="url_youtube"
                value={formData.url_youtube}
                onChange={handleInputChange}
                className={styles.input}
                required
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <small className={styles.formHint}>
                Formatos aceitos: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
              </small>
            </div>
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
                Publicar vídeo imediatamente
              </label>
              <small className={styles.formHint}>
                Se desmarcado, o vídeo será salvo como rascunho.
              </small>
            </div>
          </div>

          {/* Preview */}
          {formData.url_youtube && getYouTubePreviewUrl(formData.url_youtube) && (
            <div className={styles.previewSection}>
              <label>Pré-visualização</label>
              <div className={styles.videoPreview}>
                <iframe
                  src={getYouTubePreviewUrl(formData.url_youtube)}
                  width="320"
                  height="180"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Preview do vídeo"
                ></iframe>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Vídeo' : 'Cadastrar Vídeo'}
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
              <th>YouTube URL</th>
              <th>Preview</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {videos.length > 0 ? (
              videos.map((video) => (
                <tr key={video.id}>
                  <td>{video.id}</td>
                  <td>{video.titulo}</td>
                  <td>
                    <a 
                      href={video.url_youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      Ver no YouTube
                    </a>
                  </td>
                  <td>
                    {getYouTubePreviewUrl(video.url_youtube) ? (
                      <div className={styles.videoPreview}>
                        <iframe
                          src={getYouTubePreviewUrl(video.url_youtube)}
                          width="120"
                          height="67.5"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`Preview ${video.titulo}`}
                        ></iframe>
                      </div>
                    ) : (
                      <span className={styles.noPreview}>URL inválida</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      backgroundColor: video.publicado ? '#d4edda' : '#fff3cd',
                      color: video.publicado ? '#155724' : '#856404',
                      border: `1px solid ${video.publicado ? '#c3e6cb' : '#ffeeba'}`
                    }}>
                      {video.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.editButton}
                        onClick={() => handleEdit(video)}
                      >
                        Editar
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={() => handleDelete(video.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={styles.emptyStateRow}>
                  Nenhum vídeo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => loadVideos(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={styles.cancelButton}
            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => loadVideos(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={styles.cancelButton}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}