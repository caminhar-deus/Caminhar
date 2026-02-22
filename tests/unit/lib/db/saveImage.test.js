import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import pg from 'pg';
import { saveImage } from '../../../../lib/db.js';

// Mock do pg definido dentro da factory para evitar ReferenceError e permitir importação estática
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
    end: jest.fn(),
    on: jest.fn(),
  };
  const Pool = jest.fn(() => mockPool);
  return {
    default: { Pool },
    Pool,
  };
});


describe('saveImage (Salvar Imagem)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve salvar os metadados da imagem corretamente no banco de dados', async () => {
    // Recupera o mock da query através da instância do Pool mockado
    const pool = new pg.Pool();
    const mockQuery = pool.query;

    const filename = 'test-image.png';
    const relativePath = '/uploads/test-image.png';
    const type = 'post-image';
    const fileSize = 2048;
    const userId = 1;

    const mockDbResult = {
      rows: [{
        id: 1,
        filename,
        path: relativePath,
        type,
        size: fileSize,
        user_id: userId,
        created_at: new Date().toISOString()
      }],
      rowCount: 1
    };

    mockQuery.mockResolvedValue(mockDbResult);

    const result = await saveImage(filename, relativePath, type, fileSize, userId);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Verifica os argumentos da query
    const [text, params] = mockQuery.mock.calls[0];
    
    expect(text).toContain('INSERT INTO images');
    expect(text).toContain('VALUES($1, $2, $3, $4, $5)');
    expect(params).toEqual([filename, relativePath, type, fileSize, userId]);
    
    // Verifica o retorno
    expect(result).toEqual(mockDbResult.rows[0]);
  });
});