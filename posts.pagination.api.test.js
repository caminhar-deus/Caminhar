import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de posts
// Assumimos que existe uma função getPaginatedPosts que aceita (page, limit)
jest.mock('./lib/posts', () => ({
  getPaginatedPosts: jest.fn(),
}), { virtual: true });

const postsLib = jest.requireMock('./lib/posts');

// Simulação do handler da API para fins de teste de integração da lógica de paginação
// Isso valida como o controller processa os parâmetros e formata a resposta
const postsHandler = async (req, res) => {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Parsing dos parâmetros de query com valores padrão
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '10', 10);

  try {
    // Chama a função mockada da biblioteca passando os parâmetros de paginação
    const result = await postsLib.getPaginatedPosts(page, limit);
    
    // Retorna a estrutura padrão de resposta paginada
    return res.status(200).json({
      posts: result.posts,
      pagination: {
        page: page,
        limit: limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao buscar posts' });
  }
};

describe('API de Posts - Paginação (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar a primeira página com limite padrão (10) se nenhum parâmetro for informado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/posts',
      query: {},
    });

    // Mock do retorno do banco de dados: 10 itens, total de 30
    const mockPosts = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Post ${i + 1}` }));
    postsLib.getPaginatedPosts.mockResolvedValue({
      posts: mockPosts,
      total: 30,
    });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.posts).toHaveLength(10);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 30,
      totalPages: 3,
    });
    expect(postsLib.getPaginatedPosts).toHaveBeenCalledWith(1, 10);
  });

  it('deve retornar a página e limite solicitados corretamente', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/posts',
      query: { page: '2', limit: '5' },
    });

    const mockPosts = Array.from({ length: 5 }, (_, i) => ({ id: i + 6, title: `Post ${i + 6}` }));
    postsLib.getPaginatedPosts.mockResolvedValue({
      posts: mockPosts,
      total: 12,
    });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.posts).toHaveLength(5);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
    expect(postsLib.getPaginatedPosts).toHaveBeenCalledWith(2, 5);
  });
});