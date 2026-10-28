import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

import {
  slugify,
  getPaginatedCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setPostCategories,
  attachCategoriesToPosts,
} from '../../../../lib/domain/categories.js';
import { query } from '../../../../lib/infra/db.js';

describe('Domínio - Categories (lib/domain/categories.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('slugify', () => {
    it('deve lowerca, remover acentos e converter não-alfanuméricos em hífen', () => {
      expect(slugify('Reflexões de Aprendizado')).toBe('reflexoes-de-aprendizado');
      expect(slugify('São João')).toBe('sao-joao');
      expect(slugify('Jesus & Fé 2024!')).toBe('jesus-fe-2024');
      expect(slugify('10 Mandamentos')).toBe('10-mandamentos');
    });

    it('deve colapsar hífens repetidos e aparar as pontas', () => {
      expect(slugify('a---b')).toBe('a-b');
      expect(slugify('  Olá   Mundo  ')).toBe('ola-mundo');
      expect(slugify('-Início-')).toBe('inicio');
      expect(slugify('')).toBe('');
    });
  });

  describe('getPaginatedCategories', () => {
    it('deve paginar com orderBy name ASC e busca em name/slug', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Aviso', slug: 'aviso' }] }) // SELECT dados
        .mockResolvedValueOnce({ rows: [{ count: '7' }] }); // COUNT

      const result = await getPaginatedCategories(2, 5, 'avis');

      // categories não tem position/created_at — orderBy explícito 'name ASC'
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('ORDER BY name ASC'),
        ['%avis%', 5, 5],
      );
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('(name ILIKE $1 OR slug ILIKE $1)'),
        ['%avis%', 5, 5],
      );
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT(*)'), ['%avis%']);
      expect(result.pagination).toEqual({ page: 2, limit: 5, total: 7, totalPages: 2 });
      expect(result.data).toEqual([{ id: 1, name: 'Aviso', slug: 'aviso' }]);
    });
  });

  describe('getAllCategories', () => {
    it('deve retornar todas as categorias em ordem alfabética', async () => {
      const rows = [{ id: 1, name: 'Aviso', slug: 'aviso' }];
      query.mockResolvedValueOnce({ rows });

      const result = await getAllCategories();

      expect(query).toHaveBeenCalledWith('SELECT id, name, slug FROM categories ORDER BY name ASC LIMIT 500');
      expect(result).toEqual(rows);
    });
  });

  describe('createCategory', () => {
    it('deve recusar nome sem alfanuméricos (slug gerado ficaria vazio) com INVALID_SLUG', async () => {
      await expect(createCategory({ name: '!!!' })).rejects.toMatchObject({
        code: 'INVALID_SLUG',
      });
      // Nada é inserido
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('deve gerar o slug a partir do nome quando não informado', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 3, name: 'Reflexões', slug: 'reflexoes' }] });

      const created = await createCategory({ name: 'Reflexões' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['Reflexões', 'reflexoes'],
        expect.objectContaining({}),
      );
      expect(created).toEqual({ id: 3, name: 'Reflexões', slug: 'reflexoes' });
    });

    it('deve normalizar o slug explícito e usá-lo no INSERT', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 4, name: 'X', slug: 'meu-slug' }] });

      await createCategory({ name: 'X', slug: ' Meu Slug ' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['X', 'meu-slug'],
        expect.objectContaining({}),
      );
    });

    it('deve transformar violação UNIQUE (23505) em erro DUPLICATE_SLUG', async () => {
      const dbError = Object.assign(
        new Error('duplicate key value violates unique constraint "categories_slug_key"'),
        { code: '23505' },
      );
      query.mockRejectedValueOnce(dbError);

      await expect(createCategory({ name: 'Duplicada', slug: 'aviso' })).rejects.toMatchObject({
        code: 'DUPLICATE_SLUG',
        message: 'Já existe uma categoria com esse slug',
      });
    });
  });

  describe('updateCategory', () => {
    it('deve atualizar com slug regenerado do nome e devolver a linha atualizada', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Editada', slug: 'editada' }] });

      const updated = await updateCategory(1, { name: 'Editada' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        ['Editada', 'editada', 1],
        expect.objectContaining({}),
      );
      expect(updated).toEqual({ id: 1, name: 'Editada', slug: 'editada' });
    });

    it('deve normalizar o slug quando informado explicitamente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'A', slug: 'slug-novo' }] });

      await updateCategory(1, { slug: 'Slug Novo' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        ['slug-novo', 1],
        expect.objectContaining({}),
      );
    });

    it('deve lançar NO_DATA_TO_UPDATE sem tocar no banco quando não há campos', async () => {
      await expect(updateCategory(1, {})).rejects.toThrow('NO_DATA_TO_UPDATE');
      expect(query).not.toHaveBeenCalled();
    });

    it('deve transformar violação UNIQUE (23505) em erro DUPLICATE_SLUG', async () => {
      const dbError = Object.assign(new Error('duplicate key'), { code: '23505' });
      query.mockRejectedValueOnce(dbError);

      await expect(updateCategory(1, { slug: 'aviso' })).rejects.toMatchObject({
        code: 'DUPLICATE_SLUG',
      });
    });
  });

  describe('deleteCategory', () => {
    it('deve remover a categoria pelo id', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 9 }] });

      const deleted = await deleteCategory(9);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories'),
        [9],
        expect.objectContaining({}),
      );
      expect(deleted).toEqual({ id: 9 });
    });
  });

  describe('setPostCategories', () => {
    it('deve substituir os vínculos: DELETE, validação de existência e INSERT com os ids', async () => {
      query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT de existência

      const persisted = await setPostCategories(5, [1, 2]);

      expect(query).toHaveBeenNthCalledWith(
        1,
        'DELETE FROM post_categories WHERE post_id = $1',
        [5],
        { client: null },
      );
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT COUNT(*) FROM categories'),
        [[1, 2]],
        { client: null },
      );
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO post_categories'),
        [5, 1, 2],
        { client: null },
      );
      expect(persisted).toEqual([1, 2]);
    });

    it('deve fazer só o DELETE quando a lista é vazia', async () => {
      await setPostCategories(5, []);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM post_categories WHERE post_id = $1',
        [5],
        { client: null },
      );
    });

    it('deve deduplicar ids repetidos antes de validar e inserir', async () => {
      query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT (ids já dedupados)

      await setPostCategories(5, [1, 1, 2]);

      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT COUNT(*) FROM categories'),
        [[1, 2]],
        { client: null },
      );
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO post_categories'),
        [5, 1, 2],
        { client: null },
      );
    });

    it('deve lançar INVALID_CATEGORY_ID quando um id não existe (antes do INSERT)', async () => {
      query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT: só 1 dos 2 existe

      await expect(setPostCategories(5, [1, 999])).rejects.toMatchObject({
        code: 'INVALID_CATEGORY_ID',
      });
      // INSERT nunca é chamado — a validação vem antes
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_categories'),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('attachCategoriesToPosts', () => {
    it('deve agrupar as categorias por post e anexar arrays vazios quando não há vínculos', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      query.mockResolvedValueOnce({
        rows: [
          { post_id: 1, id: 10, name: 'Aviso', slug: 'aviso' },
          { post_id: 1, id: 11, name: 'Reflexão', slug: 'reflexao' },
          { post_id: 2, id: 12, name: 'Música', slug: 'musica' },
        ],
      });

      const result = await attachCategoriesToPosts(rows);

      // ANY($1) recebe o array de ids como um único parâmetro
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM post_categories'), [[1, 2]]);
      expect(result[0].categories).toEqual([
        { id: 10, name: 'Aviso', slug: 'aviso' },
        { id: 11, name: 'Reflexão', slug: 'reflexao' },
      ]);
      expect(result[1].categories).toEqual([{ id: 12, name: 'Música', slug: 'musica' }]);
      expect(result).toBe(rows);
    });

    it('deve devolver lista vazia sem consultar o banco quando não há posts', async () => {
      const result = await attachCategoriesToPosts([]);

      expect(result).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
