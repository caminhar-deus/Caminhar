import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery } from 'pg';
import { getPaginatedMusicas, createMusica, updateMusica, deleteMusica, getAllMusicas } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('Funções de Músicas (DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('getPaginatedMusicas', () => {
    it('deve retornar músicas paginadas com parâmetros padrão', async () => {
      // Mock robusto que responde com base no conteúdo da query
      mockQuery.mockImplementation((text) => {
        if (text.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: [{ id: 1, title: 'Música 1' }] });
      });

      const result = await getPaginatedMusicas();

      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verifica a chamada da query de dados (independente da ordem do Promise.all)
      const dataCall = mockQuery.mock.calls.find(call => call[0].includes('SELECT * FROM musicas'));
      const normalizedSqlData = dataCall[0].replace(/\s+/g, ' ').trim();
      expect(normalizedSqlData).toContain('ORDER BY position ASC, created_at DESC LIMIT $1 OFFSET $2');
      expect(dataCall[1]).toEqual([10, 0]); // Padrão: limit=10, offset=0

      // Verifica a chamada da query de contagem
      const countCall = mockQuery.mock.calls.find(call => call[0].includes('COUNT(*)'));
      expect(countCall[0].replace(/\s+/g, ' ').trim()).toBe('SELECT COUNT(*) FROM musicas');
      expect(countCall[1]).toEqual([]);

      // Verifica o objeto de retorno
      expect(result).toEqual(expect.objectContaining({
        musicas: [{ id: 1, title: 'Música 1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }));
    });

    it('deve lidar corretamente com o parâmetro de busca', async () => {
      mockQuery.mockImplementation((text) => {
        if (text.includes('COUNT(*)')) return Promise.resolve({ rows: [{ count: '0' }] });
        return Promise.resolve({ rows: [] });
      });

      await getPaginatedMusicas(1, 10, 'Teste');

      const dataCall = mockQuery.mock.calls.find(call => call[0].includes('SELECT * FROM musicas'));
      const normalizedSqlData = dataCall[0].replace(/\s+/g, ' ').trim();
      expect(normalizedSqlData).toContain('WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)');
      expect(normalizedSqlData).toContain('LIMIT $2 OFFSET $3');
      expect(dataCall[1]).toEqual(['%teste%', 10, 0]);

      const countCall = mockQuery.mock.calls.find(call => call[0].includes('COUNT(*)'));
      expect(countCall[0].replace(/\s+/g, ' ').trim()).toContain('WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)');
      expect(countCall[1]).toEqual(['%teste%']);
    });

    it('deve calcular o offset corretamente para a página 2', async () => {
      mockQuery.mockImplementation(() => Promise.resolve({ rows: [] }));

      await getPaginatedMusicas(2, 5);

      const dataCall = mockQuery.mock.calls.find(call => call[0].includes('SELECT * FROM musicas'));
      expect(dataCall[1]).toEqual([5, 5]); // limit=5, offset=(2-1)*5=5
    });
  });

  describe('createMusica', () => {
    it('deve criar uma nova música com todos os campos', async () => {
      const novaMusica = {
        titulo: 'Nova Música',
        artista: 'Artista Teste',
        descricao: 'Descrição Teste',
        url_spotify: 'https://spotify.com/track/123',
        publicado: true
      };

      const mockDbResponse = { id: 1, ...novaMusica, created_at: new Date().toISOString() };
      mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

      const result = await createMusica(novaMusica);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO musicas'),
        [novaMusica.titulo, novaMusica.artista, novaMusica.descricao, novaMusica.url_spotify, novaMusica.publicado]
      );
      expect(result).toEqual(mockDbResponse);
    });

    it('deve lidar com campos opcionais nulos na criação', async () => {
      const novaMusica = { titulo: 'Música Básica' }; // Outros campos undefined
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      await createMusica(novaMusica);

      const params = mockQuery.mock.calls[0][1];
      // Espera null para campos opcionais e false para publicado
      expect(params).toEqual(['Música Básica', null, null, null, false]);
    });
  });

  describe('updateMusica', () => {
    it('deve atualizar uma música existente', async () => {
      const id = 1;
      const atualizacao = {
        titulo: 'Música Atualizada',
        artista: 'Artista Atualizado',
        publicado: false
      };
      mockQuery.mockResolvedValue({ rows: [{ id, ...atualizacao }] });

      const result = await updateMusica(id, atualizacao);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE musicas'),
        expect.arrayContaining([atualizacao.titulo, atualizacao.artista, id])
      );
      // Verifica a ordem exata dos parâmetros incluindo os nulos implícitos
      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual([atualizacao.titulo, atualizacao.artista, null, null, false, id]);
      
      expect(result).toEqual({ id, ...atualizacao });
    });
  });

  describe('deleteMusica', () => {
    it('deve deletar uma música pelo ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 123 }] });

      const result = await deleteMusica(123);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM musicas WHERE id = $1'), [123]);
      expect(result).toEqual({ id: 123 });
    });
  });

  describe('getAllMusicas', () => {
    it('deve retornar todas as músicas quando sem busca', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await getAllMusicas();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM musicas ORDER BY'), []);
    });

    it('deve filtrar por termo de busca', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await getAllMusicas('Rock');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE LOWER(titulo) LIKE $1'), ['%rock%']);
    });
  });
});