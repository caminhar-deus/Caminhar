import { jest, describe, it, expect } from '@jest/globals';

// Mocks para as dependências de banco e CRUD (padrão de videos.test.js)
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

jest.mock('../../../lib/crud/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  raw: jest.fn((val) => ({ raw: true, value: val })),
}));

// Importações do módulo sendo testado
import {
  getPaginatedProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  normalizePrice
} from '../../../lib/domain/products.js';

import { query } from '../../../lib/infra/db.js';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud/crud.js';

describe('Domain - Produtos (lib/domain/products.js)', () => {
  describe('normalizePrice()', () => {
    it('deve normalizar formatos pt-BR e simples para número', () => {
      expect(normalizePrice('R$ 89,90')).toBe(89.9);
      expect(normalizePrice('89,90')).toBe(89.9);
      expect(normalizePrice('89.90')).toBe(89.9);
      expect(normalizePrice('R$ 1.234,56')).toBe(1234.56);
      expect(normalizePrice('100')).toBe(100);
      expect(normalizePrice(89.9)).toBe(89.9);
      expect(normalizePrice('  R$ 50,00  ')).toBe(50);
    });

    it('deve retornar null para lixo, vazio, negativo e indefinido', () => {
      expect(normalizePrice('abc')).toBeNull();
      expect(normalizePrice('')).toBeNull();
      expect(normalizePrice('   ')).toBeNull();
      expect(normalizePrice(null)).toBeNull();
      expect(normalizePrice(undefined)).toBeNull();
      expect(normalizePrice(-5)).toBeNull();
      expect(normalizePrice('R$ -1,00')).toBeNull();
      expect(normalizePrice(NaN)).toBeNull();
    });
  });

  describe('getPaginatedProducts()', () => {
    it('deve converter os filtros de preço para número antes de consultar (bug do VARCHAR)', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })   // COUNT(*)
        .mockResolvedValueOnce({ rows: [] });                // dados

      await getPaginatedProducts(1, 10, { minPrice: '50', maxPrice: 'R$ 100,00' });

      // O COUNT usa as mesmas condições com os filtros como NÚMEROS
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE published = true AND price >= $1 AND price <= $2'),
        expect.anything()
      );

      // A query de dados recebe [filtros numéricos, limit, offset] — antes da
      // correção, os filtros iam como string ("50", "R$ 100,00") e o SQL
      // comparava lexicograficamente.
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY created_at DESC LIMIT $3 OFFSET $4'),
        [50, 100, 10, 0]
      );
    });

    it('deve ignorar filtros de preço inválidos em vez de quebrar a query', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getPaginatedProducts(1, 10, { minPrice: 'lixo', maxPrice: '' });

      // Nenhuma condição de preço na query — só published; a query de dados
      // recebe apenas [limit, offset] (o array de params é o mesmo objeto
      // entre as duas chamadas, por isso a asserção na 2ª).
      expect(query).toHaveBeenNthCalledWith(1, expect.not.stringContaining('price >='), expect.anything());
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE published = true'), [10, 0]);
    });

    it('deve suportar ordenação por preço (price_asc / price_desc)', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getPaginatedProducts(1, 10, {}, 'price_asc');

      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY price ASC'), expect.anything());
    });

    it('deve formatar formatted_price a partir do preço numérico', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, price: 89.9 }] });

      const result = await getPaginatedProducts(1, 10);

      // Intl usa espaço não-separável (U+00A0) após "R$"
      expect(result.data[0].formatted_price).toBe('R$\u00A089,90');
    });
  });

  describe('getAllProducts()', () => {
    it('deve paginar pela position (curadoria do painel) e formatar preço', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, price: 1234.5 }] });

      const result = await getAllProducts(1, 100);

      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY position ASC, id ASC'),
        [100, 0]
      );
      expect(result.data[0].formatted_price).toBe('R$\u00A01.234,50');
    });
  });

  describe('createProduct()', () => {
    it('deve normalizar o price ("R$ 89,90" → 89.9) e aplicar defaults', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 3 }] }); // MAX(position)
      createRecord.mockResolvedValueOnce({ id: 10 });

      await createProduct({ name: 'Bíblia', price: 'R$ 89,90' });

      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({
        name: 'Bíblia',
        price: 89.9,
        category: 'geral',
        position: 4,
      }));
    });

    it('deve gravar price null quando o valor é lixo (não quebrar a criação)', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 0 }] });
      createRecord.mockResolvedValueOnce({ id: 11 });

      await createProduct({ name: 'X', price: 'não sei' });

      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({
        price: null,
      }));
    });

    it('deve respeitar published=false na criação (rascunho)', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 0 }] });
      createRecord.mockResolvedValueOnce({ id: 12 });

      await createProduct({ name: 'Rascunho', price: 10, published: false });

      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({
        published: false,
      }));
    });

    it('não deve enviar published quando o campo não veio (mantém o default do banco)', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 0 }] });
      createRecord.mockResolvedValueOnce({ id: 13 });

      await createProduct({ name: 'Sem flag', price: 10 });

      const record = createRecord.mock.calls.at(-1)[1];
      expect(record).not.toHaveProperty('published');
    });

    it('deve aplicar o default "geral" quando a categoria vem vazia', async () => {
      query.mockResolvedValueOnce({ rows: [{ max_pos: 0 }] });
      createRecord.mockResolvedValueOnce({ id: 14 });

      await createProduct({ name: 'Sem categoria', price: 10, category: '' });

      expect(createRecord).toHaveBeenCalledWith('products', expect.objectContaining({
        category: 'geral',
      }));
    });
  });

  describe('updateProduct()', () => {
    it('deve atualizar apenas os campos fornecidos, normalizando o price', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 5, price: 50 }]);

      await updateProduct(5, { price: '50,00' });

      expect(updateRecords).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({ price: 50 }),
        { id: 5 }
      );
    });

    it('deve lançar NO_DATA_TO_UPDATE quando nada é enviado', async () => {
      await expect(updateProduct(5, {})).rejects.toThrow('NO_DATA_TO_UPDATE');
      expect(updateRecords).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct()', () => {
    it('deve remover pelo id', async () => {
      deleteRecords.mockResolvedValueOnce([{ id: 7 }]);

      const result = await deleteProduct(7);

      expect(deleteRecords).toHaveBeenCalledWith('products', { id: 7 });
      expect(result).toEqual({ id: 7 });
    });
  });
});
