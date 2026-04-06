import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mocks para isolar o banco de dados e outras dependências
jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../../../lib/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  raw: jest.fn((val) => `RAW(${val})`),
}));

jest.mock('../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

// Importa as funções que serão testadas
import {
  getRecentPosts,
  getAllPosts,
  getPaginatedPosts,
  createPost,
  updatePost,
  deletePost,
  createPostWithAudit
} from '../../../lib/domain/posts.js';

// Importa os mocks para controle de asserções
import { query, transaction } from '../../../lib/db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../../../lib/crud.js';
import { logActivity } from '../../../lib/domain/audit.js';

describe('Domain - Posts (lib/domain/posts.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reestabelece a implementação do raw SQL
    raw.mockImplementation((val) => `RAW(${val})`);
    
    // Simula a transação executando o callback imediatamente e repassando um 'client' falso
    transaction.mockImplementation(async (callback) => {
      const fakeClient = { isFakeClient: true };
      return await callback(fakeClient);
    });
  });

  describe('getRecentPosts()', () => {
    it('deve calcular corretamente limit, offset e totalPages (sem busca)', async () => {
      // Simula o retorno de dados e a contagem total
      query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Post 1' }] }) // Posts
        .mockResolvedValueOnce({ rows: [{ count: '15' }] });           // Total

      const result = await getRecentPosts(10, 2, ''); // limit 10, page 2

      expect(result.data).toEqual([{ id: 1, title: 'Post 1' }]);
      expect(result.pagination).toEqual({ page: 2, limit: 10, total: 15, totalPages: 2 });
      
      // Verifica se os parâmetros [limit, offset] foram repassados na ordem correta
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1 OFFSET $2'), [10, 10]);
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT(*)'), []);
    });

    it('deve adicionar filtros de busca (title/content) na query', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await getRecentPosts(5, 1, 'Jesus'); // limit 5, page 1, search 'Jesus'

      // A query de dados recebe [searchTerm, limit, offset]
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIKE $1'), ['%jesus%', 5, 0]);
      // A query de count recebe apenas [searchTerm]
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIKE $1'), ['%jesus%']);
    });
  });

  describe('getPaginatedPosts()', () => {
    it('deve usar uma query diferente focada na ordenação por position (Painel Admin)', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await getPaginatedPosts(1, 20, '');

      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('ORDER BY position ASC, created_at DESC'), [20, 0]);
    });
  });

  describe('getAllPosts()', () => {
    it('deve buscar todos os posts sem filtros', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await getAllPosts();
      expect(result).toEqual([{ id: 1 }]);
      expect(query).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC');
    });
  });

  describe('createPost()', () => {
    it('deve tratar valores ausentes e preencher os defaults corretamente', async () => {
      createRecord.mockResolvedValueOnce({ id: 10, title: 'Novo' });

      const postData = { title: 'Novo', slug: 'novo', content: 'Conteudo' }; // Sem excerpt, image_url, etc.
      const result = await createPost(postData);

      expect(result).toEqual({ id: 10, title: 'Novo' });
      expect(createRecord).toHaveBeenCalledWith('posts', {
        title: 'Novo',
        slug: 'novo',
        excerpt: null,        // Assumiu o fallback nulo
        content: 'Conteudo',
        image_url: null,      // Assumiu o fallback nulo
        published: false      // Assumiu o fallback false
      }, {});
    });
  });

  describe('updatePost() e deletePost()', () => {
    it('updatePost deve formatar dados e incluir o timestamp atual via função raw', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 1 }]);
      await updatePost(1, { title: 'Editado', content: 'C', slug: 'e' });
      
      expect(updateRecords).toHaveBeenCalledWith('posts', expect.objectContaining({
        title: 'Editado',
        updated_at: 'RAW(CURRENT_TIMESTAMP)' // Valida que a data será sobreescrita na query
      }), { id: 1 }, {});
    });

    it('deletePost deve chamar deleteRecords do CRUD', async () => {
      deleteRecords.mockResolvedValueOnce([{ id: 1 }]);
      await deletePost(1);
      expect(deleteRecords).toHaveBeenCalledWith('posts', { id: 1 }, {});
    });
  });

  describe('createPostWithAudit()', () => {
    it('deve garantir que o post e o log sejam criados compartilhando o mesmo client transacional', async () => {
      createRecord.mockResolvedValueOnce({ id: 99, title: 'Post Auditado' });

      const postData = { title: 'Post Auditado', slug: 'aud', content: 'C' };
      const auditData = { username: 'admin', ipAddress: '127.0.0.1' };

      await createPostWithAudit(postData, auditData);

      expect(transaction).toHaveBeenCalled(); // Garante que a transação foi aberta
      
      // Garante que o falso "client" de DB gerado no beforeEach foi passado pro createPost (via createRecord)
      expect(createRecord).toHaveBeenCalledWith('posts', expect.any(Object), { client: { isFakeClient: true } });
      
      // Garante que o logActivity também recebeu o MESMO client
      expect(logActivity).toHaveBeenCalledWith(
        'admin', 'CREATE', 'POST', 99, 'Post created: Post Auditado', '127.0.0.1', 
        { client: { isFakeClient: true } }
      );
    });
  });
});