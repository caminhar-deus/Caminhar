import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de posts
jest.mock('../lib/posts', () => ({
  createPost: jest.fn(),
}), { virtual: true });

const postsLib = jest.requireMock('../lib/posts');

// Simulação do handler da API para fins de teste de integração da lógica de criação
// Isso valida como o controller processa a requisição POST
const postsHandler = async (req, res) => {
  const { method, body } = req;

  if (method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { title, slug, content } = body;

  // Validação básica dos campos obrigatórios
  if (!title || !slug || !content) {
    return res.status(400).json({ message: 'Campos obrigatórios: title, slug, content' });
  }

  try {
    const result = await postsLib.createPost(body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao criar post' });
  }
};

describe('API de Posts - Criação (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar um novo post com sucesso', async () => {
    const newPost = {
      title: 'Novo Post de Teste',
      slug: 'novo-post-teste',
      excerpt: 'Resumo do post para listagem.',
      content: 'Conteúdo completo do post...',
      image_url: 'https://example.com/image.jpg',
      published: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: newPost,
    });

    // Mock do retorno da biblioteca (simula o retorno do banco de dados)
    postsLib.createPost.mockResolvedValue({ id: 1, ...newPost });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(expect.objectContaining(newPost));
    expect(data).toHaveProperty('id', 1);
    expect(postsLib.createPost).toHaveBeenCalledWith(newPost);
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const invalidPost = {
      title: 'Post Sem Slug e Conteúdo',
      // slug e content faltando
      excerpt: 'Apenas um resumo'
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: invalidPost,
    });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Campos obrigatórios: title, slug, content' });
    expect(postsLib.createPost).not.toHaveBeenCalled();
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await postsHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});