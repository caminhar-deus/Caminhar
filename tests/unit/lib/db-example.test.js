/**
 * Testes para o exemplo de banco de dados (lib/db-example.js)
 * 
 * Este arquivo demonstra como testar o módulo de banco de dados
 * seguindo as boas práticas de arquitetura estabelecidas.
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Helper para normalizar queries SQL, removendo espaços extras e quebras de linha
const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

// Mock do módulo 'pg' para testes
jest.mock('pg', () => ({
  Pool: jest.fn(() => {
    const mQuery = jest.fn();
    const mEnd = jest.fn();
    const mConnect = jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    }));
    return {
      query: mQuery,
      end: mEnd,
      connect: mConnect,
      on: jest.fn(),
    };
  }),
}));

// Mock do módulo lib/middleware.js
jest.mock('../../../lib/middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

import { Pool } from 'pg';
import * as dbExample from '../../../lib/db-example.js';
import { logger } from '../../../lib/middleware.js';

describe('Database Example Module', () => {
  let mockQuery;
  let mockConnect;

  beforeAll(() => {
    // Captura as referências dos mocks
    const mockPoolInstance = Pool.mock.results[0].value;
    mockQuery = mockPoolInstance.query;
    mockConnect = mockPoolInstance.connect;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query function', () => {
    it('should execute query with logging', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }], rowCount: 1 };
      mockQuery.mockResolvedValue(mockResult);

      const result = await dbExample.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe('SELECT * FROM users WHERE id = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual([1]);

      expect(logger.info).toHaveBeenCalledWith('Executando consulta SQL', expect.objectContaining({ query: 'SELECT * FROM users WHERE id = $1', params: [1] }));
      expect(logger.info).toHaveBeenCalledWith('Consulta SQL executada com sucesso', expect.objectContaining({
        duration: expect.any(String),
        rowCount: 1
      }));
      expect(result).toEqual(mockResult);
    });

    it('should handle errors with logging', async () => {
      const error = new Error('Database error');
      error.code = '23505';
      error.detail = 'Key already exists';
      mockQuery.mockRejectedValue(error);

      await expect(dbExample.query('INSERT INTO users VALUES ($1)', ['test'])).rejects.toThrow('Database error');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe('INSERT INTO users VALUES ($1)');
      expect(mockQuery.mock.calls[0][1]).toEqual(['test']);

      expect(logger.error).toHaveBeenCalledWith('Erro ao executar consulta SQL', expect.objectContaining({
        code: '23505',
        message: 'Database error',
        detail: 'Key already exists',
      }));
    });

    it('should not log when log option is false', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockQuery.mockResolvedValue(mockResult);

      await dbExample.query('SELECT 1', [], { log: false });
      
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe('SELECT 1');
      expect(mockQuery.mock.calls[0][1]).toEqual([]);
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('transaction function', () => {
    it('should execute transaction successfully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockClient.query.mockResolvedValue({ rows: [] });
      mockConnect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('transaction result');

      const result = await dbExample.transaction(callback);

      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('transaction result');
    });

    it('should rollback on transaction error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockClient.query.mockResolvedValue({ rows: [] });
      mockConnect.mockResolvedValue(mockClient);

      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(dbExample.transaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith('Transação falhou e foi revertida', expect.objectContaining({
        error: 'Transaction failed'
      }));
    });
  });

  describe('healthCheck function', () => {
    it('should return true when database is healthy', async () => {
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });

      const result = await dbExample.healthCheck();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe('SELECT 1 as health_check');
      expect(mockQuery.mock.calls[0][1]).toEqual([]);
      expect(result).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      const result = await dbExample.healthCheck();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Health check do banco de dados falhou', expect.objectContaining({
        error: 'Connection failed'
      }));
    });
  });

  describe('getDatabaseInfo function', () => {
    it('should return database information', async () => {
      const mockVersion = { rows: [{ version: 'PostgreSQL 15.0' }] };
      const mockConnections = { rows: [{ active_connections: '5' }] };
      const mockSize = { rows: [{ size_bytes: '1000000' }] };

      mockQuery
        .mockResolvedValueOnce(mockVersion)
        .mockResolvedValueOnce(mockConnections)
        .mockResolvedValueOnce(mockSize);

      const result = await dbExample.getDatabaseInfo();

      expect(result).toEqual({
        version: 'PostgreSQL 15.0',
        activeConnections: 5,
        sizeBytes: 1000000,
        timestamp: expect.any(String)
      });
    });
  });

  describe('CRUD operations', () => {
    it('should create record', async () => {
      const mockResult = { rows: [{ id: 1, name: 'John' }] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await dbExample.createRecord('users', {
        name: 'John',
        email: 'john@example.com'
      }, ['id', 'name']);

      const expectedSql = `
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING id, name
      `;

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(mockQuery.mock.calls[0][1]).toEqual(['John', 'john@example.com']);
      expect(result).toEqual({ id: 1, name: 'John' });
    });

    it('should read records with pagination', async () => {
      const mockData = { rows: [{ id: 1, name: 'John' }] };
      const mockCount = { rows: [{ total: '100' }] };

      mockQuery
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce(mockCount);

      const result = await dbExample.readRecords('users', {
        where: { active: true },
        orderBy: ['name ASC'],
        limit: 10,
        offset: 0,
        select: ['*'],
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);

      const expectedDataSql = `
        SELECT *
        FROM users
        WHERE active = $1
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `;
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedDataSql));
      expect(mockQuery.mock.calls[0][1]).toEqual([true, 10, 0]);

      const expectedCountSql = `SELECT COUNT(*) as total FROM users WHERE active = $1`;
      expect(normalizeSql(mockQuery.mock.calls[1][0])).toBe(normalizeSql(expectedCountSql));
      expect(mockQuery.mock.calls[1][1]).toEqual([true]);
      
      expect(result).toEqual({
        data: [{ id: 1, name: 'John' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
          hasNext: true,
          hasPrev: false
        }
      });
    });

    it('should update records', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Updated John' }] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await dbExample.updateRecords('users', {
        name: 'Updated John'
      }, { id: 1 }, ['id', 'name']);

      const expectedSql = `
        UPDATE users
        SET name = $1
        WHERE id = $2
        RETURNING id, name
      `;

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(mockQuery.mock.calls[0][1]).toEqual(['Updated John', 1]);
      expect(result).toEqual([{ id: 1, name: 'Updated John' }]);
    });

    it('should delete records', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await dbExample.deleteRecords('users', { id: 1 }, ['id']);

      const expectedSql = `
        DELETE FROM users
        WHERE id = $1
        RETURNING id
      `;
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(mockQuery.mock.calls[0][1]).toEqual([1]);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('domain operations', () => {
    it('should save image', async () => {
      const mockResult = { rows: [{ id: 1, filename: 'test.jpg' }] };
      mockQuery.mockResolvedValue(mockResult);

      const imageData = {
        filename: 'test.jpg',
        relativePath: '/uploads/test.jpg',
        type: 'image/jpeg',
        fileSize: 1024,
        userId: 1
      };

      const result = await dbExample.saveImage(imageData);

      const expectedSql = `
        INSERT INTO images (filename, path, type, size, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(mockQuery.mock.calls[0][1]).toEqual(['test.jpg', '/uploads/test.jpg', 'image/jpeg', 1024, 1]);

      expect(logger.info).toHaveBeenCalledWith('Imagem salva no banco de dados', expect.objectContaining({
        filename: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        userId: 1
      }));
      expect(result).toEqual({ id: 1, filename: 'test.jpg' });
    });

    it('should get recent posts', async () => {
      const mockData = { rows: [{ id: 1, title: 'Post 1' }] };
      const mockCount = { rows: [{ total: '50' }] };

      mockQuery
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce(mockCount);

      const result = await dbExample.getRecentPosts(10, 1);

      expect(mockQuery).toHaveBeenCalledTimes(2);

      const expectedDataSql = `
        SELECT id, title, slug, excerpt, image_url, created_at, updated_at
        FROM posts 
        WHERE published = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedDataSql));
      expect(mockQuery.mock.calls[0][1]).toEqual([10, 0]);

      const expectedCountSql = `SELECT COUNT(*) as total FROM posts WHERE published = true`;
      expect(normalizeSql(mockQuery.mock.calls[1][0])).toBe(normalizeSql(expectedCountSql));
      expect(mockQuery.mock.calls[1][1]).toEqual([]);

      expect(result).toEqual({
        posts: [{ id: 1, title: 'Post 1' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5
        }
      });
    });

    it('should create post', async () => {
      const mockResult = { rows: [{ id: 1, title: 'New Post' }] };
      mockQuery.mockResolvedValue(mockResult);

      const postData = {
        title: 'New Post',
        slug: 'new-post',
        excerpt: 'Post excerpt',
        content: 'Post content',
        image_url: 'image.jpg',
        published: true
      };

      const result = await dbExample.createPost(postData);

      const expectedSql = `
        INSERT INTO posts (title, slug, excerpt, content, image_url, published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(normalizeSql(mockQuery.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(mockQuery.mock.calls[0][1]).toEqual(['New Post', 'new-post', 'Post excerpt', 'Post content', 'image.jpg', true]);

      expect(logger.info).toHaveBeenCalledWith('Post criado com sucesso', expect.objectContaining({
        id: 1,
        title: 'New Post',
        slug: 'new-post',
        published: true
      }));
      expect(result).toEqual({ id: 1, title: 'New Post' });
    });
  });
});