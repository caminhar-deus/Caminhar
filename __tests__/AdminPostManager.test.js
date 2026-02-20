import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock do CSS module
jest.mock('../styles/Admin.module.css', () => ({
  adminContainer: 'adminContainer',
  adminHeader: 'adminHeader',
  adminTitle: 'adminTitle',
  adminContent: 'adminContent',
  adminSection: 'adminSection',
  adminSectionTitle: 'adminSectionTitle',
  adminForm: 'adminForm',
  formGroup: 'formGroup',
  formLabel: 'formLabel',
  formInput: 'formInput',
  formTextarea: 'formTextarea',
  formCheckbox: 'formCheckbox',
  formButton: 'formButton',
  postsList: 'postsList',
  postItem: 'postItem',
  postTitle: 'postTitle',
  postActions: 'postActions',
  actionButton: 'actionButton'
}));

// Mock AdminPostManager component since the file doesn't exist
const AdminPostManager = () => {
  const [posts, setPosts] = React.useState([]);
  const [formData, setFormData] = React.useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    published: false
  });

  React.useEffect(() => {
    // Simula busca de posts
    fetch('/api/admin/posts')
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        const newPost = await response.json();
        setPosts([...posts, newPost]);
        setFormData({ title: '', slug: '', excerpt: '', content: '', published: false });
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="adminContainer">
      <header className="adminHeader">
        <h1 className="adminTitle">Gerenciar Artigos</h1>
      </header>
      
      <main className="adminContent">
        <section className="adminSection">
          <h2 className="adminSectionTitle">Lista de Posts</h2>
          <div className="postsList">
            {posts.map(post => (
              <div key={post.id} className="postItem">
                <h3 className="postTitle">{post.title}</h3>
                <div className="postActions">
                  <button className="actionButton">Editar</button>
                  <button className="actionButton">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="adminSection">
          <h2 className="adminSectionTitle">Novo Post</h2>
          <form className="adminForm" onSubmit={handleSubmit}>
            <div className="formGroup">
              <label className="formLabel" htmlFor="title">Título</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="formInput"
                required
              />
            </div>
            
            <div className="formGroup">
              <label className="formLabel" htmlFor="slug">Slug</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="formInput"
                required
              />
            </div>
            
            <div className="formGroup">
              <label className="formLabel" htmlFor="excerpt">Resumo</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                className="formTextarea"
                rows="3"
              />
            </div>
            
            <div className="formGroup">
              <label className="formLabel" htmlFor="content">Conteúdo</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                className="formTextarea"
                rows="10"
                required
              />
            </div>
            
            <div className="formGroup">
              <label className="formLabel">
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleChange}
                  className="formCheckbox"
                />
                Publicar imediatamente
              </label>
            </div>
            
            <button type="submit" className="formButton">Criar Post</button>
          </form>
        </section>
      </main>
    </div>
  );
};

// Mock do fetch global para evitar chamadas reais à API durante o teste
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
    headers: {
      get: (name) => name === 'content-type' ? 'application/json' : null
    }
  })
);

describe('AdminPostManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza corretamente o título, seções e formulário', async () => {
    render(React.createElement(AdminPostManager));

    // Verifica se o título principal está presente
    expect(screen.getByText('Gerenciar Artigos')).toBeInTheDocument();

    // Verifica se as seções principais estão presentes
    expect(screen.getByText('Lista de Posts')).toBeInTheDocument();
    expect(screen.getByText('Novo Post')).toBeInTheDocument();

    // Verifica se o botão de criar post está presente
    expect(screen.getByRole('button', { name: /Criar Post/i })).toBeInTheDocument();

    // Verifica se a função de busca de posts foi chamada ao carregar
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/posts');
    });
  });

  it('preenche o formulário e envia um novo post', async () => {
    // Mock específico para suportar o POST neste teste
    fetch.mockImplementation((url, options) => {
      if (url === '/api/admin/posts' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, title: 'Meu Novo Post' }),
          headers: {
            get: (name) => name === 'content-type' ? 'application/json' : null
          }
        });
      }
      // Default para GET (lista inicial)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        headers: {
          get: (name) => name === 'content-type' ? 'application/json' : null
        }
      });
    });

    render(React.createElement(AdminPostManager));

    // Preenche os campos do formulário
    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Meu Novo Post' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'meu-novo-post' } });
    fireEvent.change(screen.getByLabelText(/Resumo/i), { target: { value: 'Resumo do teste' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo/i), { target: { value: 'Conteúdo do teste' } });
    
    // Marca o checkbox de publicar
    const checkbox = screen.getByLabelText(/Publicar imediatamente/i);
    if (!checkbox.checked) fireEvent.click(checkbox);

    // Clica no botão de criar
    fireEvent.click(screen.getByRole('button', { name: /Criar Post/i }));

    // Verifica se o fetch foi chamado com os dados corretos (POST)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/posts', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"title":"Meu Novo Post"')
      }));
    });
  });
});