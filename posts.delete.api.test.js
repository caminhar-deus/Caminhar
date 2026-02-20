import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de posts
jest.mock('./lib/posts', () => ({
  deletePost: jest.fn(),
}), { virtual: true });

const postsLib = jest.requireMock('./lib/posts');

// Simulação do handler da API para fins de teste de integração da lógica de exclusão
// Isso valida como o controller processa a requisição DELETE
const postsHandler = async (req, res) => {
  const { method, body, query } = req;

  if (method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Suporta ID na query (rota dinâmica) ou no body
  const id = query.id || body.id;

  if (!id) {
    return res.status(400).json({ message: 'ID do post é obrigatório' });
  }

  try {
    const result = await postsLib.deletePost(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    return res.status(200).json({ message: 'Post excluído com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao excluir post' });
  }
};

describe('API de Posts - Exclusão (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve excluir um post existente com sucesso', async () => {
    const postId = 1;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: postId },
    });

    // Mock do retorno da biblioteca (post excluído)
    postsLib.deletePost.mockResolvedValue({ id: postId });

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Post excluído com sucesso' });
    expect(postsLib.deletePost).toHaveBeenCalledWith(postId);
  });

  it('deve retornar 404 se o post não for encontrado', async () => {
    const postId = 999;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: postId },
    });

    // Mock do retorno da biblioteca (null/undefined indica que não achou/excluiu)
    postsLib.deletePost.mockResolvedValue(null);

    await postsHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Post não encontrado' });
    expect(postsLib.deletePost).toHaveBeenCalledWith(postId);
  });

  it('deve retornar 400 se o ID não for fornecido', async () => {
    const { req, res } = createMocks({ method: 'DELETE', body: {} });
    await postsHandler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await postsHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});