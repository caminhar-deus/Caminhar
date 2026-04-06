import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mocks para as dependências de banco e CRUD
jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../../../lib/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
}));

// Importações do módulo sendo testado
import {
  getPaginatedVideos,
  getPublicPaginatedVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  reorderVideos
} from '../../../lib/domain/videos.js';

import { query, transaction } from '../../../lib/db.js';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud.js';

describe('Domain - Vídeos (lib/domain/videos.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Simula a transação executando o callback imediatamente, injetando um 'client' falso
    transaction.mockImplementation(async (callback) => {
      const fakeClient = { isFakeClient: true };
      return await callback(fakeClient);
    });
  });

  describe('getPaginatedVideos()', () => {
    it('deve calcular paginação e retornar dados corretamente sem busca', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Vídeo Admin' }] }) // Retorno dos dados
        .mockResolvedValueOnce({ rows: [{ count: '20' }] });                 // Retorno do COUNT(*)

      const result = await getPaginatedVideos(2, 5); // page 2, limit 5

      expect(result.data).toEqual([{ id: 1, titulo: 'Vídeo Admin' }]);
      expect(result.pagination).toEqual({ page: 2, limit: 5, total: 20, totalPages: 4 });
      
      // Verifica se limit e offset ($1 e $2) foram passados nas posições corretas
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1 OFFSET $2'), [5, 5]);
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT(*)'), []);
    });

    it('deve incluir filtros de busca (LIKE) na query', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] }); 
      
      await getPaginatedVideos(1, 10, 'React');
      
      // Verifica se o searchTerm '%react%' é injetado como $1 e o limit/offset viram $2 e $3
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIKE $1'), ['%react%', 10, 0]);
    });
  });

  describe('getPublicPaginatedVideos()', () => {
    it('deve buscar obrigatoriamente apenas vídeos publicados (publicado = true)', async () => {
      query.mockResolvedValue({ rows: [] });

      await getPublicPaginatedVideos(1, 10, 'Next.js');

      // A API pública possui a cláusula fixa "publicado = true" além da busca
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE publicado = true AND (LOWER(titulo)'), ['%next.js%', 10, 0]);
    });
  });

  describe('createVideo()', () => {
    it('deve buscar a posição máxima e inserir o vídeo na próxima posição (max + 1)', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 5 }] }); // Maior posição atual é 5
      createRecord.mockResolvedValueOnce({ id: 10, position: 6 });

      const videoData = { titulo: 'Novo Vídeo', url_youtube: 'xyz' }; // Omite opcionais
      const result = await createVideo(videoData);

      expect(result.id).toBe(10);
      expect(createRecord).toHaveBeenCalledWith('videos', {
        titulo: 'Novo Vídeo',
        url_youtube: 'xyz',
        descricao: null,  // fallback validado
        thumbnail: null,  // fallback validado
        publicado: false, // fallback validado
        position: 6       // 5 + 1
      });
    });
    
    it('deve atribuir posição 1 se não houver vídeos anteriores na tabela', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // Tabela vazia (sem max_pos)
      createRecord.mockResolvedValueOnce({ id: 1, position: 1 });

      await createVideo({ titulo: 'Primeiro', url_youtube: 'abc' });

      expect(createRecord).toHaveBeenCalledWith('videos', expect.objectContaining({ position: 1 }));
    });
  });

  describe('updateVideo() e deleteVideo()', () => {
    it('deve chamar os módulos de CRUD e repassar as informações corretamente', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 1, titulo: 'Editado' }]);
      deleteRecords.mockResolvedValueOnce([{ id: 1 }]);

      expect(await updateVideo(1, { titulo: 'Editado' })).toEqual({ id: 1, titulo: 'Editado' });
      expect(updateRecords).toHaveBeenCalledWith('videos', { titulo: 'Editado' }, { id: 1 });

      expect(await deleteVideo(1)).toEqual({ id: 1 });
      expect(deleteRecords).toHaveBeenCalledWith('videos', { id: 1 });
    });
  });

  describe('reorderVideos()', () => {
    it('não deve fazer nada se o array de itens estiver vazio', async () => {
      await reorderVideos([]);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('deve atualizar a posição de cada vídeo mapeado dentro de uma única transação', async () => {
      const items = [{ id: 10, position: 1 }, { id: 20, position: 2 }];
      
      await reorderVideos(items);
      
      expect(transaction).toHaveBeenCalled();
      expect(query).toHaveBeenCalledTimes(2);
      
      // Garante que a query recebeu o 'client' isolado da transação
      expect(query).toHaveBeenNthCalledWith(1, 'UPDATE videos SET position = $1 WHERE id = $2', [1, 10], { client: { isFakeClient: true } });
      expect(query).toHaveBeenNthCalledWith(2, 'UPDATE videos SET position = $1 WHERE id = $2', [2, 20], { client: { isFakeClient: true } });
    });
  });
});