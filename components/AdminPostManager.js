import { useState, useEffect } from 'react';
import styles from '../styles/Admin.module.css'; // Assumindo que existe, ou use inline styles

export default function AdminPostManager() {
  const [posts, setPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    published: false
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      fetchPosts(searchTerm, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPosts = async (term = searchTerm, page = currentPage) => {
    const url = `/api/admin/posts?search=${encodeURIComponent(term)}&page=${page}&limit=5`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.data);
      setTotalPages(data.pagination.totalPages);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchPosts(searchTerm, newPage);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);
    data.append('type', 'post');

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: data
      });

      if (res.ok) {
        const result = await res.json();
        setFormData(prev => ({ ...prev, image_url: result.path }));
        showToast('Imagem enviada com sucesso!');
      } else {
        showToast('Erro ao fazer upload da imagem', 'error');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      showToast('Erro ao fazer upload da imagem', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpa o erro do servidor para este campo quando o usuário digita
    if (serverErrors[name]) {
      setServerErrors(prev => ({ ...prev, [name]: null }));
    }

    // Auto-generate slug from title
    if (name === 'title' && !isEditing) {
      const slug = value.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setServerErrors({});

    if (!formData.title || !formData.slug) {
      return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const body = isEditing ? { id: currentPost.id, ...formData } : formData;

    const res = await fetch('/api/admin/posts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok) {
      fetchPosts();
      resetForm();
      showToast(isEditing ? 'Post atualizado com sucesso!' : 'Post criado com sucesso!');
    } else {
      if (data.errors) {
        setServerErrors(data.errors);
        showToast('Erro de validação. Verifique os campos.', 'error');
      } else {
        showToast(data.message || 'Erro ao salvar post', 'error');
      }
    }
  };

  const handleEdit = (post) => {
    setHasSubmitted(false);
    setIsEditing(true);
    setCurrentPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      image_url: post.image_url || '',
      published: !!post.published
    });
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const res = await fetch(`/api/admin/posts?id=${itemToDelete}`, { method: 'DELETE' });
    if (res.ok) {
      fetchPosts();
      showToast('Post excluído com sucesso!');
    } else {
      showToast('Erro ao excluir post', 'error');
    }
    setShowModal(false);
    setItemToDelete(null);
  };

  const resetForm = () => {
    setHasSubmitted(false);
    setServerErrors({});
    setIsEditing(false);
    setCurrentPost(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      image_url: '',
      published: false
    });
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Gerenciar Artigos</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Lista de Posts */}
        <div>
          <h3>Lista de Posts</h3>
          <input
            type="text"
            placeholder="🔍 Buscar por título ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {posts.map(post => (
              <div key={post.id} style={{ 
                padding: '1rem', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                backgroundColor: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>{post.title}</h4>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    backgroundColor: post.published ? '#e6fffa' : '#fff5f5',
                    color: post.published ? '#2c7a7b' : '#c53030'
                  }}>
                    {post.published ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(post)} style={{ cursor: 'pointer', padding: '4px 8px' }}>Editar</button>
                  <button onClick={() => handleDelete(post.id)} style={{ cursor: 'pointer', padding: '4px 8px', color: 'red' }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 1rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Anterior
              </button>
              <span>Página {currentPage} de {totalPages}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '0.5rem 1rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Próxima
              </button>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', height: 'fit-content' }}>
          <h3>{isEditing ? 'Editar Post' : 'Novo Post'}</h3>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem' }}>Título</label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                style={{ 
                  width: '100%', 
                  padding: '0.5rem',
                  border: (hasSubmitted && !formData.title) || serverErrors.title ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              {serverErrors.title && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{serverErrors.title[0]}</span>}
            </div>

            <div>
              <label htmlFor="slug" style={{ display: 'block', marginBottom: '0.5rem' }}>Slug (URL)</label>
              <input
                id="slug"
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                style={{ 
                  width: '100%', 
                  padding: '0.5rem',
                  border: (hasSubmitted && !formData.slug) || serverErrors.slug ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              {serverErrors.slug && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{serverErrors.slug[0]}</span>}
            </div>

            <div>
              <label htmlFor="excerpt" style={{ display: 'block', marginBottom: '0.5rem' }}>Resumo</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                rows="3"
                style={{ width: '100%', padding: '0.5rem' }}
              />
              {serverErrors.excerpt && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{serverErrors.excerpt[0]}</span>}
            </div>

            <div>
              <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem' }}>Conteúdo</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="10"
                style={{ width: '100%', padding: '0.5rem' }}
              />
              {serverErrors.content && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{serverErrors.content[0]}</span>}
            </div>

            <div>
              <label htmlFor="image" style={{ display: 'block', marginBottom: '0.5rem' }}>Imagem</label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
              <input
                aria-label="URL da imagem"
                type="text"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="URL da imagem"
                style={{ width: '100%', padding: '0.5rem' }}
              />
              {serverErrors.image_url && <span style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{serverErrors.image_url[0]}</span>}
              {formData.image_url && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }} 
                  />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleInputChange}
                />
                Publicar imediatamente
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {isEditing ? 'Atualizar' : 'Criar Post'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#48bb78' : '#f56565',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: 'white' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: 'none', borderRadius: '4px', background: '#e53e3e', color: 'white' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}