import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/videos';
import { query } from '../lib/db';

// Mock do banco de dados
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

// Mock do fetch global para simular autenticação bem-sucedida
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ authenticated: true }),
  })
);

describe('Integração: Fluxo Completo de Vídeos (API + DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve realizar o ciclo completo: criar, listar e excluir um vídeo', async () => {
    // =================================================================
    // PASSO 1: CRIAR VÍDEO (POST)
    // =================================================================
    const newVideo = {
      titulo: 'Vídeo de Integração',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Descrição teste fluxo completo'
    };

    const { req: createReq, res: createRes } = createMocks({
      method: 'POST',
      body: newVideo,
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do INSERT no banco
    query.mockResolvedValueOnce({
      rows: [{ id: 1, ...newVideo, created_at: new Date().toISOString() }]
    });

    await handler(createReq, createRes);

    // Verificações da Criação
    expect(createRes._getStatusCode()).toBe(201);
    const createdData = JSON.parse(createRes._getData());
    expect(createdData).toEqual(expect.objectContaining(newVideo));
    
    // Verifica se o SQL de INSERT foi gerado corretamente
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO videos'),
      expect.arrayContaining([newVideo.titulo, newVideo.url_youtube, newVideo.descricao])
    );

    // =================================================================
    // PASSO 2: LISTAR VÍDEOS (GET)
    // =================================================================
    const { req: listReq, res: listRes } = createMocks({
      method: 'GET',
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco (retorna o vídeo criado)
    // Precisamos mockar duas chamadas: uma para os vídeos e outra para a contagem total (paginação)
    query
      .mockResolvedValueOnce({
        rows: [{ id: 1, ...newVideo, created_at: new Date().toISOString() }]
      })
      .mockResolvedValueOnce({
        rows: [{ count: '1' }]
      });

    await handler(listReq, listRes);

    // Verificações da Listagem
    expect(listRes._getStatusCode()).toBe(200);
    const listData = JSON.parse(listRes._getData());
    expect(Array.isArray(listData.videos)).toBe(true);
    expect(listData.videos[0].titulo).toBe(newVideo.titulo);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM videos'),
      expect.anything()
    );

    // =================================================================
    // PASSO 3: EXCLUIR VÍDEO (DELETE)
    // =================================================================
    const { req: deleteReq, res: deleteRes } = createMocks({
      method: 'DELETE',
      body: { id: 1 },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do DELETE no banco
    query.mockResolvedValueOnce({
      rows: [{ id: 1 }]
    });

    await handler(deleteReq, deleteRes);

    // Verificações da Exclusão
    expect(deleteRes._getStatusCode()).toBe(200);
    expect(JSON.parse(deleteRes._getData())).toEqual({ message: 'Vídeo excluído com sucesso' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM videos'),
      expect.arrayContaining([1])
    );
  });
});