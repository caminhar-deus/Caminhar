import { useState, useEffect } from 'react';

export default function AdminPostManager() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    published: false
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts', {
        credentials: 'include'
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          setPosts(data);
        } else {
          setError(data.error || 'Falha ao carregar posts');
        }
      } else {
        setError(`Erro no servidor: Resposta inválida (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Erro de conexão ao carregar posts');
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
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploadType', 'post');

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, image_url: data.path }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || errorData.message || `Erro ${res.status}: Falha no upload`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão');
    }
  };

  // Auto-generate slug from title if slug is empty
  const handleTitleBlur = () => {
    if (!formData.slug && formData.title) {
        const slug = formData.title
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
        setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const method = currentPost ? 'PUT' : 'POST';
    const body = currentPost ? { ...formData, id: currentPost.id } : formData;

    try {
        const res = await fetch('/api/admin/posts', {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (res.ok) {
            setIsEditing(false);
            setCurrentPost(null);
            setFormData({ title: '', slug: '', excerpt: '', content: '', image_url: '', published: false });
            fetchPosts();
        } else {
            const data = await res.json();
            alert(data.message || 'Erro ao salvar');
        }
    } catch (err) {
        alert('Erro de conexão');
    } finally {
        setLoading(false);
    }
  };

  const handleEdit = (post) => {
    setCurrentPost(post);
    setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content || '',
        image_url: post.image_url || '',
        published: post.published
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;
    
    try {
        const res = await fetch('/api/admin/posts', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        if (res.ok) {
            fetchPosts();
        } else {
            alert('Erro ao excluir');
        }
    } catch (err) {
        alert('Erro de conexão');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentPost(null);
    setFormData({ title: '', slug: '', excerpt: '', content: '', image_url: '', published: false });
  };

  if (loading && !posts.length && !isEditing) return <div>Carregando posts...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Gerenciar Posts</h3>
        {!isEditing && (
            <button 
                onClick={() => { setIsEditing(true); setCurrentPost(null); setFormData({ title: '', slug: '', excerpt: '', content: '', image_url: '', published: false }); }}
                style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
                Novo Post
            </button>
        )}
      </div>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {isEditing ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Título</label>
                <input 
                    name="title" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    onBlur={handleTitleBlur}
                    required 
                    style={{ width: '100%', padding: '8px' }}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Slug (URL amigável)</label>
                <input 
                    name="slug" 
                    value={formData.slug} 
                    onChange={handleInputChange} 
                    required 
                    style={{ width: '100%', padding: '8px' }}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Resumo</label>
                <textarea 
                    name="excerpt" 
                    value={formData.excerpt} 
                    onChange={handleInputChange} 
                    rows={3}
                    style={{ width: '100%', padding: '8px' }}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Conteúdo</label>
                <textarea 
                    name="content" 
                    value={formData.content} 
                    onChange={handleInputChange} 
                    rows={10}
                    style={{ width: '100%', padding: '8px' }}
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>URL da Imagem</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        name="image_url" 
                        value={formData.image_url} 
                        onChange={handleInputChange} 
                        style={{ flex: 1, padding: '8px' }}
                        placeholder="https://... ou faça upload"
                    />
                    <label 
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#0070f3', 
                            color: 'white', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        Upload
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
                {formData.image_url && (
                    <div style={{ marginTop: '10px' }}>
                        <img 
                            src={formData.image_url} 
                            alt="Preview" 
                            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }} 
                        />
                    </div>
                )}
            </div>
            <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="checkbox" 
                        name="published" 
                        checked={formData.published} 
                        onChange={handleInputChange} 
                    />
                    Publicado
                </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {currentPost ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancelar
                </button>
            </div>
        </form>
      ) : (
        <>
            {posts.length === 0 ? <p>Nenhum post encontrado.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                {posts.map(post => (
                    <li key={post.id} style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong style={{ fontSize: '1.1em' }}>{post.title}</strong>
                        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                            {post.published ? <span style={{ color: 'green' }}>✅ Publicado</span> : <span style={{ color: 'orange' }}>📝 Rascunho</span>}
                            <span style={{ margin: '0 10px' }}>|</span>
                            {new Date(post.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => handleEdit(post)}
                            style={{ padding: '5px 10px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => handleDelete(post.id)}
                            style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Excluir
                        </button>
                    </div>
                    </li>
                ))}
                </ul>
            )}
        </>
      )}
    </div>
  );
}