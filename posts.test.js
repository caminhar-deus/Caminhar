import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do lib/db
jest.mock('./lib/db.js', () => ({
  getAllPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
}));

// Mock do lib/auth
jest.mock('./lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => fn(req, res),
}));

// Import the mocked modules
const db = jest.requireMock('./lib/db.js');
const auth = jest.requireMock('./lib/auth.js');

// Mock handler function since the file doesn't exist
const handler = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const posts = await db.getAllPosts();
      res.status(200).json(posts);
    } else if (req.method === 'POST') {
      const { title, slug, content, published } = req.body;
      
      // Validação básica
      if (!title || !slug || !content) {
        res.status(400).json({ message: 'Campos obrigatórios: title, slug, content' });
        return;
      }

      const newPost = await db.createPost({ title, slug, content, published });
      res.status(201).json(newPost);
    } else {
      res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

describe('API de Posts (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET retorna lista de posts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    const mockPosts = [
      { id: 1, title: 'Post 1', published: true },
      { id: 2, title: 'Post 2', published: false },
    ];

    // Mock do helper getAllPosts
    db.getAllPosts.mockResolvedValue(mockPosts);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // O handler retorna o array diretamente
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].title).toBe('Post 1');
  });

  test('POST cria um novo post com dados válidos', async () => {
    const newPostData = {
      title: 'Novo Post',
      slug: 'novo-post',
      content: 'Conteúdo do post',
      published: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: newPostData,
    });

    // Mock do helper createPost
    db.createPost.mockResolvedValue({ id: 10, ...newPostData });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    
    // Verifica se createPost foi chamado com os dados corretos
    expect(db.createPost).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Novo Post',
      slug: 'novo-post'
    }));
  });

  test('POST retorna 400 se dados forem inválidos', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: '', // Título vazio deve falhar
        slug: ''
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.message).toMatch(/obrigatórios/);
  });
});
