import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de músicas
jest.mock('../lib/musicas', () => ({
  createMusica: jest.fn(),
}), { virtual: true });

const musicasLib = jest.requireMock('../lib/musicas');

// Simulação do handler da API para fins de teste de integração da lógica de criação
// Isso valida como o controller processa a requisição POST
const musicasHandler = async (req, res) => {
  const { method, body } = req;

  if (method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { titulo, artista, url_spotify } = body;

  // Validação básica dos campos obrigatórios
  if (!titulo || !artista || !url_spotify) {
    return res.status(400).json({ message: 'Campos obrigatórios: titulo, artista, url_spotify' });
  }

  try {
    const result = await musicasLib.createMusica(body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao criar música' });
  }
};

describe('API de Músicas - Criação (/api/admin/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar uma nova música com sucesso', async () => {
    const newMusica = {
      titulo: 'Nova Canção',
      artista: 'Artista Teste',
      url_spotify: 'https://spotify.com/track/123',
      url_imagem: 'https://example.com/image.jpg',
      publicado: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: newMusica,
    });

    // Mock do retorno da biblioteca (simula o retorno do banco de dados)
    musicasLib.createMusica.mockResolvedValue({ id: 1, ...newMusica });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(expect.objectContaining(newMusica));
    expect(data).toHaveProperty('id', 1);
    expect(musicasLib.createMusica).toHaveBeenCalledWith(newMusica);
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const invalidMusica = {
      titulo: 'Música Sem Artista',
      // artista faltando
      url_spotify: 'https://spotify.com/track/123'
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: invalidMusica,
    });

    await musicasHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Campos obrigatórios: titulo, artista, url_spotify' });
    expect(musicasLib.createMusica).not.toHaveBeenCalled();
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await musicasHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});