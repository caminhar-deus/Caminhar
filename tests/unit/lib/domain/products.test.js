import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../../../../lib/crud/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  raw: jest.fn((value) => value),
}));

import {
  getPaginatedProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../../../lib/domain/products.js';
import { query } from '../../../../lib/infra/db.js';
import { createRecord, updateRecords, deleteRecords } from '../../../../lib/crud/crud.js';

describe('Domínio - Products (lib/domain/products.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaginatedProducts', () => {
    it('deve retornar produtos paginados e formatar o preço em Real', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // COUNT
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Camiseta', price: '49.90' }] }); // SELECT

      const result = await getPaginatedProducts(1, 2, {});

      expect(result.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].formatted_price).toContain('49,90');
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('deve aplicar filtros de busca, preço mínimo e máximo no WHERE', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Bíblia', price: null }] });

      const result = await getPaginatedProducts(1, 10, { search: 'bíblia', minPrice: 10, maxPrice: 100 });

      const selectSql = query.mock.calls[0][0];
      expect(selectSql).toContain('published = true');
      expect(selectSql).toContain('ILIKE');
      expect(selectSql).toContain('price >= $2');
      expect(selectSql).toContain('price <= $3');
      // Preço nulo cai no fallback R$ 0,00
      expect(result.data[0].formatted_price).toContain('0,00');
    });
  });

  describe('getAllProducts', () => {
    it('deve retornar todos os produtos sem filtros', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '4' }] });
      query.mockResolvedValueOnce({ rows: [{ id: 9, name: 'Produto', price: '10' }] });

      const result = await getAllProducts(1, 20);

      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
      expect(query).toHaveBeenLastCalledWith(
        'SELECT * FROM products ORDER BY position ASC, id ASC LIMIT $1 OFFSET $2',
        [20, 0],
      );
    });
  });

  describe('createProduct', () => {
    it('deve definir a posição como próximo item e criar o produto', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 5 }] });
      createRecord.mockResolvedValueOnce({ id: 6, name: 'Novo' });

      const result = await createProduct({
        name: 'Novo',
        description: 'desc',
        price: 10,
        image_url: 'img',
        category: 'livro',
        link: 'link',
      });

      expect(query).toHaveBeenCalledWith('SELECT COALESCE(MAX(position), 0) as max_pos FROM products');
      expect(createRecord).toHaveBeenCalledWith('products', {
        name: 'Novo',
        description: 'desc',
        price: 10,
        image_url: 'img',
        category: 'livro',
        link: 'link',
        position: 6,
      });
      expect(result).toEqual({ id: 6, name: 'Novo' });
    });

    it('deve usar posição 1 e aplicar defaults quando não houver produtos', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: null }] });
      createRecord.mockResolvedValueOnce({ id: 1, name: 'X' });

      await createProduct({ name: 'X', price: 5 });

      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({
        position: 1,
        description: '',
        image_url: '',
        category: 'geral',
        link: '',
      }));
    });
  });

  describe('updateProduct', () => {
    it('deve atualizar apenas os campos informados e adicionar updated_at', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 1, name: 'Editado' }]);

      const result = await updateProduct(1, { name: 'Editado', price: 20 });

      expect(updateRecords).toHaveBeenCalledWith(
        'products',
        { name: 'Editado', price: 20, updated_at: 'CURRENT_TIMESTAMP' },
        { id: 1 },
      );
      expect(result).toEqual({ id: 1, name: 'Editado' });
    });

    it('deve lançar erro quando nenhum campo for informado', async () => {
      await expect(updateProduct(1, {})).rejects.toThrow('NO_DATA_TO_UPDATE');
      expect(updateRecords).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('deve remover o produto pelo id', async () => {
      deleteRecords.mockResolvedValueOnce([{ id: 7 }]);

      const result = await deleteProduct(7);

      expect(deleteRecords).toHaveBeenCalledWith('products', { id: 7 });
      expect(result).toEqual({ id: 7 });
    });
  });
});