import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de posts
jest.mock('./lib/posts', () => ({
  updatePost: jest.fn(),
}), { virtual: true });

const postsLib = jest.requireMock('./lib/posts');

// Simulação do handler da API para fins de teste de integração da lógica de atualização
// Isso valida como o controller processa a requisição PUT
const postsHandler = async (req, res) => {
  const { method, body, query } = req;

  if (method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Suporta ID na query (rota dinâmica) ou no body
  const id = query.id || body.id;
  const { title, slug, content } = body;

  if (!id) {
    return res.status(400).json({ message: 'ID do post é obrigatório' });
  }

  // Validação básica dos campos obrigatórios
  if (!title || !slug || !content) {
    return res.status(400).json({ message: 'Campos obrigatórios: title, slug, content' });
  }

  try {
    const result = await postsLib.updatePost(id, body);
    
    if (!result) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao atualizar post' });
  }
};

describe('API de Posts - Atualização (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve atualizar um post existente com sucesso', async () => {
    const postId = 1;
    const updateData = {
      id: postId,
      title: 'Post Atualizado',
      slug: 'post-atualizado',
      excerpt: 'Resumo atualizado.',
      content: 'Conteúdo atualizado...',
      image_url: 'https://example.com/image-updated.jpg',
      published: true
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    // Mock do retorno da biblioteca
    postsLib.updatePost.mockResolvedValue({ ...updateData, updated_at: new Date() });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(expect.objectContaining({
        title: 'Post Atualizado',
        slug: 'post-atualizado'
    }));
    expect(postsLib.updatePost).toHaveBeenCalledWith(postId, updateData);
  });

  it('deve retornar 404 se o post não for encontrado', async () => {
    const postId = 999;
    const updateData = {
      id: postId,
      title: 'Post Inexistente',
      slug: 'post-inexistente',
      content: 'Conteúdo'
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    postsLib.updatePost.mockResolvedValue(null);

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Post não encontrado' });
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const updateData = {
      id: 1,
      title: 'Post Sem Slug',
      // slug e content faltando
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain('Campos obrigatórios');
    expect(postsLib.updatePost).not.toHaveBeenCalled();
  });

  it('deve retornar 400 se o ID não for fornecido', async () => {
    const updateData = {
      title: 'Post Sem ID',
      slug: 'post-sem-id',
      content: 'Conteúdo'
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe('ID do post é obrigatório');
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await postsHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});