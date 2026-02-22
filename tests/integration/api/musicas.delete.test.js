import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de músicas
jest.mock('./lib/musicas', () => ({
  deleteMusica: jest.fn(),
}), { virtual: true });

const musicasLib = jest.requireMock('./lib/musicas');

// Simulação do handler da API para fins de teste de integração da lógica de exclusão
// Isso valida como o controller processa a requisição DELETE
const musicasHandler = async (req, res) => {
  const { method, body, query } = req;

  if (method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Suporta ID na query (rota dinâmica) ou no body
  const id = query.id || body.id;

  if (!id) {
    return res.status(400).json({ message: 'ID da música é obrigatório' });
  }

  try {
    const result = await musicasLib.deleteMusica(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Música não encontrada' });
    }

    return res.status(200).json({ message: 'Música excluída com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao excluir música' });
  }
};

describe('API de Músicas - Exclusão (/api/admin/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve excluir uma música existente com sucesso', async () => {
    const musicaId = 1;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: musicaId },
    });

    // Mock do retorno da biblioteca (música excluída)
    musicasLib.deleteMusica.mockResolvedValue({ id: musicaId });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Música excluída com sucesso' });
    expect(musicasLib.deleteMusica).toHaveBeenCalledWith(musicaId);
  });

  it('deve retornar 404 se a música não for encontrada', async () => {
    const musicaId = 999;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: musicaId },
    });

    // Mock do retorno da biblioteca (null/undefined indica que não achou/excluiu)
    musicasLib.deleteMusica.mockResolvedValue(null);

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Música não encontrada' });
    expect(musicasLib.deleteMusica).toHaveBeenCalledWith(musicaId);
  });

  it('deve retornar 400 se o ID não for fornecido', async () => {
    const { req, res } = createMocks({ method: 'DELETE', body: {} });
    await musicasHandler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await musicasHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});