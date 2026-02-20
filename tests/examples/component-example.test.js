/**
 * Exemplo: Teste de Componente Completo
 * 
 * Este arquivo demonstra como usar todos os helpers
 * para criar testes de componentes React eficientes.
 * 
 * Cenário: Componente de lista de posts
 */

import React, { useState, useEffect } from 'react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Factories
import { 
  postFactory,
  resetPostIdCounter 
} from '../factories/post.js';

// Helpers de renderização
import {
  renderWithProviders,
  renderWithRouter,
  renderWithAuth,
  setMobileViewport,
  setDesktopViewport,
  fillForm,
  waitForAnimation,
} from '../helpers/render.js';

// Mocks
import { mockFetchSuccess, mockFetchError } from '../mocks/fetch.js';

// =============================================================================
// COMPONENTE SIMULADO (para demonstração)
// =============================================================================

/**
 * Componente de Post simulado
 * Na prática, você importaria o componente real:
 * import PostList from '../../components/PostList';
 */
const MockPostList = ({ posts: initialPosts = [], onDelete }) => {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (id) => {
    if (onDelete) {
      await onDelete(id);
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  if (loading) {
    return <div data-testid="loading">Carregando...</div>;
  }

  if (error) {
    return <div data-testid="error">{error}</div>;
  }

  if (posts.length === 0) {
    return <div data-testid="empty">Nenhum post encontrado</div>;
  }

  return (
    <div data-testid="post-list">
      <h1>Posts</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id} data-testid={`post-${post.id}`}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <span>{post.published ? 'Publicado' : 'Rascunho'}</span>
            <button 
              onClick={() => handleDelete(post.id)}
              data-testid={`delete-${post.id}`}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MockPostForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    published: false,
    ...initialData,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="post-form">
      <label htmlFor="title">Título</label>
      <input
        id="title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        data-testid="title-input"
      />
      
      <label htmlFor="slug">Slug</label>
      <input
        id="slug"
        value={formData.slug}
        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        data-testid="slug-input"
      />
      
      <label htmlFor="content">Conteúdo</label>
      <textarea
        id="content"
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        data-testid="content-input"
      />
      
      <label htmlFor="published">
        <input
          id="published"
          type="checkbox"
          checked={formData.published}
          onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
          data-testid="published-checkbox"
        />
        Publicado
      </label>
      
      <button type="submit" data-testid="submit-btn">
        Salvar
      </button>
    </form>
  );
};

// =============================================================================
// TESTES
// =============================================================================

describe('PostList Component - Exemplo Completo', () => {
  beforeEach(() => {
    resetPostIdCounter();
  });

  describe('Renderização Básica', () => {
    it('deve renderizar lista vazia', () => {
      const { container } = renderWithProviders(<MockPostList posts={[]} />);
      
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByText('Nenhum post encontrado')).toBeInTheDocument();
    });

    it('deve renderizar lista com posts', () => {
      // Usa factory para gerar dados
      const posts = postFactory.list(3);
      
      renderWithProviders(<MockPostList posts={posts} />);
      
      // Verifica se o título está presente
      expect(screen.getByText('Posts')).toBeInTheDocument();
      
      // Verifica se cada post foi renderizado
      posts.forEach(post => {
        expect(screen.getByText(post.title)).toBeInTheDocument();
        expect(screen.getByTestId(`post-${post.id}`)).toBeInTheDocument();
      });
    });

    it('deve mostrar status de publicação', () => {
      const publishedPost = postFactory({ published: true });
      const draftPost = postFactory({ published: false });
      
      renderWithProviders(
        <MockPostList posts={[publishedPost, draftPost]} />
      );
      
      expect(screen.getByText('Publicado')).toBeInTheDocument();
      expect(screen.getByText('Rascunho')).toBeInTheDocument();
    });
  });

  describe('Interações do Usuário', () => {
    it('deve chamar onDelete ao clicar em excluir', async () => {
      const posts = postFactory.list(2);
      const onDeleteMock = jest.fn().mockResolvedValue(undefined);
      
      const { user } = renderWithProviders(
        <MockPostList posts={posts} onDelete={onDeleteMock} />
      );
      
      // Clica no botão de excluir do primeiro post
      const deleteButton = screen.getByTestId(`delete-${posts[0].id}`);
      await user.click(deleteButton);
      
      // Verifica se a função foi chamada com o ID correto
      expect(onDeleteMock).toHaveBeenCalledWith(posts[0].id);
    });

    it('deve remover post da lista após excluir', async () => {
      const posts = postFactory.list(3);
      const onDeleteMock = jest.fn().mockResolvedValue(undefined);
      
      const { user } = renderWithProviders(
        <MockPostList posts={posts} onDelete={onDeleteMock} />
      );
      
      // Clica em excluir
      await user.click(screen.getByTestId(`delete-${posts[0].id}`));
      
      // Aguarda rerender
      await waitFor(() => {
        expect(screen.queryByTestId(`post-${posts[0].id}`)).not.toBeInTheDocument();
      });
      
      // Verifica se restam 2 posts
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  describe('Estados de Loading e Erro', () => {
    it('deve mostrar estado de loading', () => {
      const MockLoadingComponent = () => {
        const [loading] = useState(true);
        if (loading) return <div data-testid="loading">Carregando...</div>;
        return null;
      };
      
      renderWithProviders(<MockLoadingComponent />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve mostrar mensagem de erro', () => {
      const MockErrorComponent = () => {
        const [error] = useState('Erro ao carregar posts');
        if (error) return <div data-testid="error">{error}</div>;
        return null;
      };
      
      renderWithProviders(<MockErrorComponent />);
      
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Erro ao carregar posts')).toBeInTheDocument();
    });
  });
});

describe('PostForm Component - Formulários', () => {
  beforeEach(() => {
    resetPostIdCounter();
  });

  it('deve renderizar formulário vazio', () => {
    const onSubmit = jest.fn();
    
    renderWithProviders(<MockPostForm onSubmit={onSubmit} />);
    
    expect(screen.getByTestId('post-form')).toBeInTheDocument();
    expect(screen.getByTestId('title-input')).toHaveValue('');
    expect(screen.getByTestId('slug-input')).toHaveValue('');
    expect(screen.getByTestId('content-input')).toHaveValue('');
    expect(screen.getByTestId('published-checkbox')).not.toBeChecked();
  });

  it('deve preencher formulário com dados iniciais', () => {
    const onSubmit = jest.fn();
    const initialData = {
      title: 'Título Inicial',
      slug: 'titulo-inicial',
      content: 'Conteúdo inicial',
      published: true,
    };
    
    renderWithProviders(
      <MockPostForm onSubmit={onSubmit} initialData={initialData} />
    );
    
    expect(screen.getByTestId('title-input')).toHaveValue('Título Inicial');
    expect(screen.getByTestId('slug-input')).toHaveValue('titulo-inicial');
    expect(screen.getByTestId('content-input')).toHaveValue('Conteúdo inicial');
    expect(screen.getByTestId('published-checkbox')).toBeChecked();
  });

  it('deve atualizar campos ao digitar', async () => {
    const onSubmit = jest.fn();
    
    const { user } = renderWithProviders(<MockPostForm onSubmit={onSubmit} />);
    
    // Preenche o título
    const titleInput = screen.getByTestId('title-input');
    await user.type(titleInput, 'Novo Título');
    
    expect(titleInput).toHaveValue('Novo Título');
    
    // Preenche o slug
    const slugInput = screen.getByTestId('slug-input');
    await user.type(slugInput, 'novo-titulo');
    
    expect(slugInput).toHaveValue('novo-titulo');
  });

  it('deve enviar formulário com dados corretos', async () => {
    const onSubmit = jest.fn();
    
    const { user } = renderWithProviders(<MockPostForm onSubmit={onSubmit} />);
    
    // Preenche usando helper de formulário
    await fillForm(user, {
      'Título': 'Meu Post',
      'Slug': 'meu-post',
    });
    
    // Preenche o textarea separadamente (não funciona com fillForm)
    await user.type(screen.getByTestId('content-input'), 'Conteúdo do post');
    
    // Marca como publicado
    await user.click(screen.getByTestId('published-checkbox'));
    
    // Envia o formulário
    await user.click(screen.getByTestId('submit-btn'));
    
    // Verifica se onSubmit foi chamado com dados corretos
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Meu Post',
      slug: 'meu-post',
      content: 'Conteúdo do post',
      published: true,
    });
  });

  it('deve usar factory para preencher formulário', async () => {
    const onSubmit = jest.fn();
    const postData = postFactory();
    
    const { user } = renderWithProviders(
      <MockPostForm 
        onSubmit={onSubmit} 
        initialData={{
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          published: postData.published,
        }}
      />
    );
    
    // Verifica se os dados da factory foram aplicados
    expect(screen.getByTestId('title-input')).toHaveValue(postData.title);
    expect(screen.getByTestId('slug-input')).toHaveValue(postData.slug);
  });
});

describe('PostList - Responsividade', () => {
  beforeEach(() => {
    resetPostIdCounter();
  });

  afterEach(() => {
    // Reset para desktop após cada teste
    setDesktopViewport();
  });

  it('deve renderizar corretamente em mobile', () => {
    const posts = postFactory.list(2);
    
    // Configura viewport mobile
    setMobileViewport();
    
    renderWithProviders(<MockPostList posts={posts} />);
    
    // Verifica se posts estão presentes
    posts.forEach(post => {
      expect(screen.getByText(post.title)).toBeInTheDocument();
    });
  });

  it('deve renderizar corretamente em desktop', () => {
    const posts = postFactory.list(5);
    
    setDesktopViewport();
    
    renderWithProviders(<MockPostList posts={posts} />);
    
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});

describe('Componente com Router', () => {
  it('deve renderizar com router mockado', () => {
    const posts = postFactory.list(2);
    
    const { mockRouter } = renderWithRouter(
      <MockPostList posts={posts} />,
      {
        router: {
          pathname: '/admin/posts',
          query: { page: '1' },
        },
      }
    );
    
    // Verifica se o router foi configurado corretamente
    expect(mockRouter.pathname).toBe('/admin/posts');
    expect(mockRouter.query).toEqual({ page: '1' });
  });
});

describe('Componente com Autenticação', () => {
  it('deve renderizar para usuário autenticado', () => {
    const posts = postFactory.list(2);
    
    const { authContext } = renderWithAuth(
      <MockPostList posts={posts} />,
      {
        isAuthenticated: true,
        user: {
          id: 1,
          username: 'admin',
          role: 'admin',
        },
      }
    );
    
    // Verifica se o contexto de auth foi configurado
    expect(authContext.isAuthenticated).toBe(true);
    expect(authContext.user.username).toBe('admin');
  });

  it('deve renderizar para usuário não autenticado', () => {
    const posts = postFactory.list(2);
    
    const { authContext } = renderWithAuth(
      <MockPostList posts={posts} />,
      { isAuthenticated: false }
    );
    
    expect(authContext.isAuthenticated).toBe(false);
    expect(authContext.user).toBeNull();
  });
});

// =============================================================================
// EXEMPLO COM FETCH MOCKADO
// =============================================================================

describe('Componente com Fetch', () => {
  beforeEach(() => {
    resetPostIdCounter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve carregar posts da API', async () => {
    // Configura mock de fetch para retornar posts
    const posts = postFactory.list(3);
    global.fetch = mockFetchSuccess({ posts });
    
    const MockFetchComponent = () => {
      const [data, setData] = useState(null);
      
      useEffect(() => {
        fetch('/api/posts')
          .then(res => res.json())
          .then(setData);
      }, []);
      
      if (!data) return <div>Loading...</div>;
      
      return (
        <div>
          {data.posts.map(post => (
            <div key={post.id}>{post.title}</div>
          ))}
        </div>
      );
    };
    
    renderWithProviders(<MockFetchComponent />);
    
    // Aguarda o carregamento
    await waitFor(() => {
      posts.forEach(post => {
        expect(screen.getByText(post.title)).toBeInTheDocument();
      });
    });
    
    // Verifica se fetch foi chamado corretamente
    expect(global.fetch).toHaveBeenCalledWith('/api/posts');
  });

  it('deve mostrar erro quando fetch falha', async () => {
    global.fetch = mockFetchError(500, { message: 'Erro no servidor' });
    
    const MockErrorComponent = () => {
      const [error, setError] = useState(null);
      
      useEffect(() => {
        fetch('/api/posts')
          .then(async res => {
            if (!res.ok) throw new Error('Erro na requisição');
            return res.json();
          })
          .catch(err => setError(err.message));
      }, []);
      
      if (error) return <div data-testid="error">{error}</div>;
      return <div>Loading...</div>;
    };
    
    renderWithProviders(<MockErrorComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Erro na requisição');
    });
  });
});

// =============================================================================
// DICAS E BOAS PRÁTICAS
// =============================================================================

/**
 * BOAS PRÁTICAS PARA TESTES DE COMPONENTES:
 * 
 * 1. Use factories para gerar dados consistentes
 * 2. Teste comportamento, não implementação
 * 3. Use userEvent em vez de fireEvent quando possível
 * 4. Verifique acessibilidade com queries semânticas
 * 5. Limpe mocks em afterEach
 * 6. Teste diferentes estados: loading, error, empty, data
 * 7. Use screen.debug() para debug visual
 * 
 * QUERIES RECOMENDADAS (por ordem de prioridade):
 * 1. getByRole - melhor para acessibilidade
 * 2. getByLabelText - para inputs
 * 3. getByText - para texto visível
 * 4. getByTestId - último recurso
 * 
 * EXEMPLO DE TESTE ACESSÍVEL:
 * 
 * it('deve ter botão acessível', () => {
 *   renderWithProviders(<Button>Salvar</Button>);
 *   
 *   // Use role em vez de testId
 *   const button = screen.getByRole('button', { name: /salvar/i });
 *   expect(button).toBeInTheDocument();
 *   expect(button).toBeEnabled();
 * });
 */
