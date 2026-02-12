/**
 * Exemplo: Teste de API Completo
 * 
 * Este arquivo demonstra como usar todos os helpers e factories
 * para criar testes de API eficientes e organizados.
 * 
 * Cenário: API de Posts administrativa (CRUD completo)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Factories - geram dados de teste
import { 
  postFactory, 
  createPostInput, 
  updatePostInput,
  resetPostIdCounter 
} from '../factories/post.js';

import { 
  musicFactory, 
  createMusicInput 
} from '../factories/music.js';

// Helpers para API
import {
  createApiMocks,
  createGetRequest,
  createPostRequest,
  createPutRequest,
  createDeleteRequest,
  expectStatus,
  expectJson,
  expectArray,
  expectError,
  expectPaginatedResponse,
  executeHandler,
} from '../helpers/api.js';

// Helpers de autenticação
import {
  createAuthToken,
  mockAuthenticatedUser,
  mockAuthenticatedAdmin,
} from '../helpers/auth.js';

// Mocks
import { mockQuery, mockDbModule } from '../mocks/db.js';

// =============================================================================
// HANDLER SIMULADO (simula um handler real de API)
// =============================================================================

/**
 * Handler simulado de API para demonstração
 * Na prática, você importaria o handler real:
 * import handler from '../../pages/api/admin/posts';
 */
const mockPostsHandler = async (req, res) => {
  const { method, body, query } = req;

  // Simula verificação de autenticação
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  try {
    switch (method) {
      case 'GET': {
        // Listar posts (com paginação opcional)
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const search = query.search || '';
        
        // Simula busca no banco
        const posts = postFactory.list(limit);
        
        return res.status(200).json({
          posts,
          pagination: {
            page,
            limit,
            total: 100,
            totalPages: 10,
          },
        });
      }

      case 'POST': {
        // Criar novo post
        const { title, slug, content } = body;
        
        if (!title || !slug || !content) {
          return res.status(400).json({ 
            message: 'Campos obrigatórios: title, slug, content' 
          });
        }
        
        const newPost = postFactory({ title, slug, content, ...body });
        return res.status(201).json(newPost);
      }

      case 'PUT': {
        // Atualizar post
        const { id } = query;
        
        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }
        
        const updatedPost = postFactory({ 
          id: parseInt(id), 
          ...body 
        });
        
        return res.status(200).json(updatedPost);
      }

      case 'DELETE': {
        // Deletar post
        const { id } = query;
        
        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }
        
        return res.status(200).json({ 
          message: 'Post excluído com sucesso',
          id: parseInt(id),
        });
      }

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// =============================================================================
// TESTES
// =============================================================================

describe('API Posts - Exemplo Completo', () => {
  // Resetar contadores antes de cada teste
  beforeEach(() => {
    resetPostIdCounter();
    jest.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('deve retornar 401 quando não há token', async () => {
      const { req, res } = createGetRequest();
      
      await mockPostsHandler(req, res);
      
      // Usando matchers customizados
      expect(res).toHaveStatus(401);
      expect(res).toBeValidJSON({ message: 'Não autenticado' });
    });

    it('deve permitir acesso com token válido', async () => {
      const { token, headers } = mockAuthenticatedAdmin();
      const { req, res } = createGetRequest({}, headers);
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(200);
    });
  });

  describe('Listar Posts (GET)', () => {
    it('deve listar posts com paginação padrão', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createGetRequest({}, headers);
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(200);
      
      const data = expectJson(res);
      expect(data.posts).toHaveLength(10); // default limit
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it('deve respeitar parâmetros de paginação', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createGetRequest(
        { page: '2', limit: '5' },
        headers
      );
      
      await mockPostsHandler(req, res);
      
      // Usando helper de paginação
      expectPaginatedResponse(res, { page: 2, limit: 5 });
    });

    it('deve suportar busca', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createGetRequest(
        { search: 'teste' },
        headers
      );
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(200);
      
      const data = expectJson(res);
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
    });
  });

  describe('Criar Post (POST)', () => {
    it('deve criar post com sucesso', async () => {
      const { headers } = mockAuthenticatedAdmin();
      
      // Usa factory para gerar dados de entrada
      const postData = createPostInput({
        title: 'Meu Novo Post',
        slug: 'meu-novo-post',
      });
      
      const { req, res } = createPostRequest(postData, headers);
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(201);
      
      const data = expectJson(res);
      expect(data.title).toBe('Meu Novo Post');
      expect(data.slug).toBe('meu-novo-post');
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('created_at');
    });

    it('deve validar campos obrigatórios', async () => {
      const { headers } = mockAuthenticatedAdmin();
      
      // Dados incompletos
      const incompleteData = { title: 'Apenas Título' };
      
      const { req, res } = createPostRequest(incompleteData, headers);
      
      await mockPostsHandler(req, res);
      
      // Usando helper de erro
      expectError(res, 400, 'Campos obrigatórios');
    });

    it('deve criar post como rascunho', async () => {
      const { headers } = mockAuthenticatedAdmin();
      
      const draftData = createPostInput({ published: false });
      
      const { req, res } = createPostRequest(draftData, headers);
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(201);
      
      const data = expectJson(res);
      expect(data.published).toBe(false);
    });
  });

  describe('Atualizar Post (PUT)', () => {
    it('deve atualizar post existente', async () => {
      const { headers } = mockAuthenticatedAdmin();
      
      const updateData = updatePostInput({
        title: 'Título Atualizado',
      });
      
      const { req, res } = createPutRequest(
        updateData,
        { id: '1' },
        headers
      );
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(200);
      
      const data = expectJson(res);
      expect(data.id).toBe(1);
      expect(data.title).toBe('Título Atualizado');
    });

    it('deve retornar erro quando ID é obrigatório', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createPutRequest(
        { title: 'Test' },
        {}, // sem id
        headers
      );
      
      await mockPostsHandler(req, res);
      
      expectError(res, 400, 'ID é obrigatório');
    });
  });

  describe('Excluir Post (DELETE)', () => {
    it('deve excluir post com sucesso', async () => {
      const { headers } = mockAuthenticatedAdmin();
      
      const { req, res } = createDeleteRequest(
        null,
        { id: '1' },
        headers
      );
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(200);
      expect(res).toBeValidJSON({ message: 'Post excluído com sucesso' });
    });

    it('deve retornar erro quando ID não é fornecido', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createDeleteRequest(null, {}, headers);
      
      await mockPostsHandler(req, res);
      
      expectError(res, 400, 'ID é obrigatório');
    });
  });

  describe('Métodos não permitidos', () => {
    it('deve retornar 405 para PATCH', async () => {
      const { headers } = mockAuthenticatedAdmin();
      const { req, res } = createMocks({
        method: 'PATCH',
        headers: {
          ...headers,
          'content-type': 'application/json',
        },
      });
      
      await mockPostsHandler(req, res);
      
      expect(res).toHaveStatus(405);
    });
  });
});

// =============================================================================
// EXEMPLO COM MOCK DE BANCO DE DADOS
// =============================================================================

describe('API Posts - Com Mock de DB', () => {
  let queryMock;
  
  beforeEach(() => {
    resetPostIdCounter();
    queryMock = mockQuery([]);
  });

  it('deve usar mock de query corretamente', async () => {
    // Configura mock para retornar dados
    const mockPost = postFactory({ id: 1, title: 'Mocked Post' });
    queryMock = mockQuery([mockPost]);
    
    // Simula chamada ao banco
    const result = await queryMock('SELECT * FROM posts WHERE id = $1', [1]);
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Mocked Post');
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT * FROM posts WHERE id = $1',
      [1]
    );
  });

  it('deve simular INSERT no banco', async () => {
    const newPost = createPostInput({ title: 'Novo Post' });
    
    queryMock = jest.fn().mockResolvedValue({
      rows: [{ id: 1, ...newPost, created_at: new Date().toISOString() }],
      rowCount: 1,
    });
    
    const result = await queryMock(
      'INSERT INTO posts (title, slug, content) VALUES ($1, $2, $3) RETURNING *',
      [newPost.title, newPost.slug, newPost.content]
    );
    
    expect(result.rows[0].title).toBe('Novo Post');
  });
});

// =============================================================================
// DICAS E BOAS PRÁTICAS (comentários no final do arquivo)
// =============================================================================

/**
 * BOAS PRÁTICAS PARA TESTES DE API:
 * 
 * 1. Use factories para gerar dados consistentes
 * 2. Sempre teste autenticação/autorização primeiro
 * 3. Teste casos de sucesso E casos de erro
 * 4. Use matchers customizados para assertions mais legíveis
 * 5. Mocks devem ser limpos em beforeEach
 * 6. Nomeie testes de forma descritiva
 * 7. Agrupe testes relacionados com describe
 * 
 * EXEMPLO DE TESTE FLUENTE:
 * 
 * it('deve criar post', async () => {
 *   const { headers } = mockAuthenticatedAdmin();
 *   const postData = createPostInput();
 *   const { req, res } = createPostRequest(postData, headers);
 *   
 *   await handler(req, res);
 *   
 *   expect(res)
 *     .toHaveStatus(201)
 *     .toHaveHeader('content-type', 'application/json')
 *     .toBeValidJSON({ title: postData.title });
 * });
 */
