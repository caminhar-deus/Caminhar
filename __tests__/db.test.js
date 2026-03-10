import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { query, closeDatabase, saveImage, getRecentPosts, getAllPosts, createPost, updateSetting, setSetting, updatePost, deletePost, getSettings, getSetting, getAllSettings } from '../lib/db';

// Helper para normalizar queries SQL, removendo espaços extras e quebras de linha
const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

// Mock the pg module
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool), _pool: mockPool };
});

describe('db.js', () => {
  let pool;

  // antes de cada teste
  // limpa todos os mocks
  // configura o objeto pool para ser usado nos testes
  beforeEach(() => {
    jest.clearAllMocks();
    pool = new (require('pg').Pool)();
  });

  describe('query', () => {
    it('should execute a query and return the result', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };

      pool.query.mockResolvedValue(mockResult);
      const result = await query('SELECT * FROM test', []);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(result).toEqual(mockResult);
    });

    it('should log and throw an error if the query fails', async () => {
      const mockError = new Error('Test error');

      pool.query.mockRejectedValue(mockError);
      await expect(query('SELECT * FROM test', [])).rejects.toThrow(mockError);
    });

  });

  it('closeDatabase should end the pool', async () => {
    await closeDatabase();
    expect(pool.end).toHaveBeenCalled();
  });

  describe('saveImage', () => {
    it('should save image metadata to the database', async () => {
      const mockResult = { rows: [{ id: 1, filename: 'test.jpg' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await saveImage('test.jpg', '/uploads/test.jpg', 'post', 1024, 1);
      const expectedSql = `
        INSERT INTO images(filename, path, type, size, user_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['test.jpg', '/uploads/test.jpg', 'post', 1024, 1]);
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('getRecentPosts', () => {
    it('should retrieve recent published posts', async () => {
      const mockResult = { rows: [{ id: 1, title: 'Test Post' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getRecentPosts(5);
      const expectedSql = 'SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual([5, 0]);
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('getAllPosts', () => {
    it('should retrieve all posts', async () => {
      const mockResult = { rows: [{ id: 1, title: 'Test Post' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getAllPosts();
      const expectedSql = 'SELECT * FROM posts ORDER BY created_at DESC';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toBeUndefined();
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const mockResult = { rows: [{ id: 1, title: 'Test Post' }] };

      pool.query.mockResolvedValue(mockResult);

      const postData = { title: 'Test Post', slug: 'test-post', excerpt: 'Test excerpt', content: 'Test content', image_url: '/uploads/test.jpg', published: true };
      const result = await createPost(postData);
      const expectedSql = `
        INSERT INTO posts (title, slug, excerpt, content, image_url, published)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['Test Post', 'test-post', 'Test excerpt', 'Test content', '/uploads/test.jpg', true]);
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('updateSetting', () => {
    it('should update or insert a setting', async () => {
      const mockResult = { rows: [{ key: 'test_setting', value: 'test_value' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await updateSetting('test_setting', 'test_value', 'string', 'Test description');
      const expectedSql = `
        INSERT INTO settings (key, value, type, description, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['test_setting', 'test_value', 'string', 'Test description']);
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should handle errors when updating a setting', async () => {
      pool.query.mockRejectedValue(new Error('Update setting error'));

      await expect(updateSetting('test_setting', 'test_value', 'string', 'Test description')).rejects.toThrow(
        'Update setting error'
      );
    });
  });

  describe('setSetting', () => {
    it('should call updateSetting with the same arguments', async () => {
      const mockResult = { rows: [{ key: 'test_setting', value: 'test_value' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await setSetting('test_setting', 'test_value', 'string', 'Test description');
      const expectedSql = `
        INSERT INTO settings (key, value, type, description, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('updatePost', () => {
    it('should update an existing post', async () => {
      const mockResult = { rows: [{ id: 1, title: 'Updated Post' }] };

      pool.query.mockResolvedValue(mockResult);

      const postData = { title: 'Updated Post', slug: 'updated-post', excerpt: 'Updated excerpt', content: 'Updated content', image_url: '/uploads/updated.jpg', published: false };
      const result = await updatePost(1, postData);
      const expectedSql = `
        UPDATE posts
        SET title = $1, slug = $2, excerpt = $3, content = $4, image_url = $5, published = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['Updated Post', 'updated-post', 'Updated excerpt', 'Updated content', '/uploads/updated.jpg', false, 1]);
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      const mockResult = { rows: [{ id: 1 }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await deletePost(1);
      const expectedSql = 'DELETE FROM posts WHERE id = $1 RETURNING id';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual([1]);
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('getSettings', () => {
    it('should retrieve all settings as a key-value object', async () => {
      const mockResult = { rows: [{ key: 'setting1', value: 'value1' }, { key: 'setting2', value: 'value2' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getSettings();
      const expectedSql = 'SELECT * FROM settings';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toBeUndefined();
      expect(result).toEqual({ setting1: 'value1', setting2: 'value2' });
    });
  });

  describe('getSetting', () => {
    it('should retrieve a specific setting by key', async () => {
      const mockResult = { rows: [{ value: 'value1' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getSetting('setting1');
      const expectedSql = 'SELECT value FROM settings WHERE key = $1';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['setting1']);
      expect(result).toBe('value1');
    });
    
    it('should handle errors when retrieving a specific setting by key', async () => {
      pool.query.mockRejectedValue(new Error('Get setting error'));

      await expect(getSetting('setting1')).rejects.toThrow(
        'Get setting error'
      );
    });

    it('should return null if setting is not found', async () => {
      const mockResult = { rows: [] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getSetting('nonexistent');
      const expectedSql = 'SELECT value FROM settings WHERE key = $1';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toEqual(['nonexistent']);
      expect(result).toBeNull();
    });
  });

  describe('getAllSettings', () => {
    it('should retrieve all settings as an array of objects', async () => {
      const mockResult = { rows: [{ key: 'setting1', value: 'value1' }, { key: 'setting2', value: 'value2' }] };

      pool.query.mockResolvedValue(mockResult);

      const result = await getAllSettings();
      const expectedSql = 'SELECT * FROM settings';
      expect(normalizeSql(pool.query.mock.calls[0][0])).toBe(normalizeSql(expectedSql));
      expect(pool.query.mock.calls[0][1]).toBeUndefined();
      expect(result).toEqual(mockResult.rows);
    });

    it('should handle errors when retrieving all settings as an array of objects', async () => {
      pool.query.mockRejectedValue(new Error('Get all settings error'));

      await expect(getAllSettings()).rejects.toThrow(
        'Get all settings error'
      );
    });
  });
});
