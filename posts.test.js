import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// 1. Mock das dependências usando unstable_mockModule para suporte a ESM
jest.unstable_mockModule('./lib/db.js', () => ({
  getAllPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
}));

jest.unstable_mockModule('./lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => fn(req, res),
}));

// 2. Importação dinâmica dos módulos (após os mocks)
const { default: handler } = await import('./pages/api/admin/posts.js');
const { getAllPosts, createPost } = await import('./lib/db.js');

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
    getAllPosts.mockResolvedValue(mockPosts);

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
    createPost.mockResolvedValue({ id: 10, ...newPostData });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    
    // Verifica se createPost foi chamado com os dados corretos
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
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
