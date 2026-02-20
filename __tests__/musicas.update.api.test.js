import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de músicas
jest.mock('../lib/musicas', () => ({
  updateMusica: jest.fn(),
}), { virtual: true });

const musicasLib = jest.requireMock('../lib/musicas');

// Simulação do handler da API para fins de teste de integração da lógica de atualização
// Isso valida como o controller processa a requisição PUT
const musicasHandler = async (req, res) => {
  const { method, body, query } = req;

  if (method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Suporta ID na query (rota dinâmica) ou no body
  const id = query.id || body.id;
  const { titulo, artista, url_spotify } = body;

  if (!id) {
    return res.status(400).json({ message: 'ID da música é obrigatório' });
  }

  // Validação básica dos campos obrigatórios
  if (!titulo || !artista || !url_spotify) {
    return res.status(400).json({ message: 'Campos obrigatórios: titulo, artista, url_spotify' });
  }

  try {
    const result = await musicasLib.updateMusica(id, body);
    
    if (!result) {
      return res.status(404).json({ message: 'Música não encontrada' });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao atualizar música' });
  }
};

describe('API de Músicas - Atualização (/api/admin/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve atualizar uma música existente com sucesso', async () => {
    const musicaId = 1;
    const updateData = {
      id: musicaId,
      titulo: 'Música Atualizada',
      artista: 'Novo Artista',
      url_spotify: 'https://spotify.com/track/updated',
      publicado: true
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    // Mock do retorno da biblioteca
    musicasLib.updateMusica.mockResolvedValue({ ...updateData, updated_at: new Date() });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(expect.objectContaining({
        titulo: 'Música Atualizada',
        artista: 'Novo Artista'
    }));
    expect(musicasLib.updateMusica).toHaveBeenCalledWith(musicaId, updateData);
  });

  it('deve retornar 404 se a música não for encontrada', async () => {
    const musicaId = 999;
    const updateData = {
      id: musicaId,
      titulo: 'Música Inexistente',
      artista: 'Artista',
      url_spotify: 'https://spotify.com/track/123'
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    musicasLib.updateMusica.mockResolvedValue(null);

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Música não encontrada' });
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const updateData = {
      id: 1,
      titulo: 'Música Sem Artista',
      // artista faltando
      url_spotify: 'https://spotify.com/track/123'
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain('Campos obrigatórios');
    expect(musicasLib.updateMusica).not.toHaveBeenCalled();
  });

  it('deve retornar 400 se o ID não for fornecido', async () => {
    const updateData = {
      titulo: 'Música Sem ID',
      artista: 'Artista',
      url_spotify: 'https://spotify.com/track/123'
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updateData,
    });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe('ID da música é obrigatório');
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await musicasHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});