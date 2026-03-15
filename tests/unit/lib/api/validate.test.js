import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { createMocks } from 'node-mocks-http';
import { 
  validateBody, 
  validateQuery, 
  validateParams, 
  validateHeaders, 
  validateRequest, 
  createPaginationSchema, 
  createSearchSchema,
  formatZodErrors
} from '../../../../lib/api/validate.js';
import { validationError } from '../../../../lib/api/response.js';

// Mock do módulo response.js para isolar a validação
jest.mock('../../../../lib/api/response.js', () => ({
  validationError: jest.fn(),
}));

describe('API Validation Middleware (lib/api/validate.js)', () => {
  let req, res, handler;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock básico do handler que seria chamado após a validação
    handler = jest.fn();
    // Cria mocks de request e response http
    ({ req, res } = createMocks());
  });

  describe('formatZodErrors', () => {
    it('deve formatar erros do Zod em uma estrutura limpa', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(18)
      });
      
      const result = schema.safeParse({ name: 123, age: 10 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      const formatted = formatZodErrors(result.error);
      expect(formatted).toHaveLength(2);
      expect(formatted).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'name', message: expect.any(String) }),
        expect.objectContaining({ field: 'age', message: expect.any(String) })
      ]));
    });
  });

  describe('validateBody', () => {
    const schema = z.object({ title: z.string() });

    it('deve chamar o handler se o body for válido', async () => {
      req.method = 'POST';
      req.body = { title: 'Post Válido' };
      
      const middleware = validateBody(schema)(handler);
      await middleware(req, res);
      
      expect(handler).toHaveBeenCalledWith(req, res);
      expect(validationError).not.toHaveBeenCalled();
    });

    it('deve ignorar validação para métodos GET (sem body)', async () => {
      req.method = 'GET';
      req.body = {}; // Mesmo vazio ou inválido, deve passar
      
      const middleware = validateBody(schema)(handler);
      await middleware(req, res);
      
      expect(handler).toHaveBeenCalled();
    });

    it('deve impedir execução e retornar erro se o body for inválido', async () => {
      req.method = 'POST';
      req.body = { title: 123 }; // Esperava string
      
      const middleware = validateBody(schema)(handler);
      await middleware(req, res);
      
      expect(handler).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        res, 
        'Erro de validação no corpo da requisição', 
        expect.arrayContaining([expect.objectContaining({ field: 'title' })])
      );
    });

    it('deve tratar erros inesperados (não-Zod)', async () => {
        req.method = 'POST';
        // Simula um erro crítico no schema ou parsing
        const errorSchema = { parse: () => { throw new Error('Erro Inesperado'); } };
        const middleware = validateBody(errorSchema)(handler);
        
        // Silencia console.error para este teste
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        await middleware(req, res);
        
        expect(validationError).toHaveBeenCalledWith(res, 'Erro ao validar dados da requisição');
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({ 
      page: z.string().transform(Number),
      active: z.string().optional()
    });

    it('deve transformar e validar query params corretamente', async () => {
      req.query = { page: '10' };
      
      const middleware = validateQuery(schema)(handler);
      await middleware(req, res);
      
      // Verifica se houve transformação (string -> number)
      expect(req.query.page).toBe(10);
      expect(handler).toHaveBeenCalled();
    });

    it('deve retornar erro se query params forem inválidos', async () => {
      // Schema específico que falha se não for numérico (regex garante isso antes do transform)
      const failingSchema = z.object({ 
        page: z.string().regex(/^\d+$/).transform(Number)
      });
      req.query = { page: 'não-numero' };
      
      const middleware = validateQuery(failingSchema)(handler);
      await middleware(req, res);
      
      expect(handler).not.toHaveBeenCalled();
      expect(validationError).toHaveBeenCalledWith(
        res, 
        'Erro ao validar parâmetros da URL', 
        expect.any(Array)
      );
    });
  });

  describe('validateParams', () => {
      const schema = z.object({ id: z.string().uuid() });

      it('deve validar params extraídos de req.query (comportamento Next.js)', async () => {
          // Next.js Pages Router coloca params dinâmicos em req.query
          req.query = { id: '123e4567-e89b-12d3-a456-426614174000' };
          
          const middleware = validateParams(schema)(handler);
          await middleware(req, res);
          
          expect(req.params).toEqual({ id: '123e4567-e89b-12d3-a456-426614174000' });
          expect(handler).toHaveBeenCalled();
      });
  });

  describe('validateHeaders', () => {
      const schema = z.object({ 'x-api-key': z.string().min(1) });

      it('deve validar headers independente de maiúsculas/minúsculas', async () => {
          req.headers = { 'X-API-KEY': 'minha-senha-secreta' };
          
          const middleware = validateHeaders(schema)(handler);
          await middleware(req, res);
          
          expect(handler).toHaveBeenCalled();
      });

      it('deve falhar se header obrigatório estiver faltando', async () => {
          req.headers = { 'content-type': 'application/json' };
          const middleware = validateHeaders(schema)(handler);
          await middleware(req, res);
          
          expect(validationError).toHaveBeenCalledWith(res, 'Erro de validação nos headers', expect.any(Array));
      });
  });

  describe('validateRequest (Composto)', () => {
      const schemas = {
          body: z.object({ title: z.string() }),
          query: z.object({ version: z.string() })
      };

      it('deve validar body e query com sucesso', async () => {
          req.method = 'POST';
          req.body = { title: 'Post' };
          req.query = { version: '1.0' };
          
          const middleware = validateRequest(schemas)(handler);
          await middleware(req, res);
          expect(handler).toHaveBeenCalled();
      });

      it('deve acumular erros de múltiplas fontes', async () => {
          req.method = 'POST';
          req.body = { title: 123 }; // Erro no body
          req.query = { version: 1 }; // Erro na query
          
          const middleware = validateRequest(schemas)(handler);
          await middleware(req, res);
          
          expect(validationError).toHaveBeenCalled();
          const errors = validationError.mock.calls[0][2];
          
          expect(errors).toEqual(expect.arrayContaining([
              expect.objectContaining({ location: 'body', field: 'title' }),
              expect.objectContaining({ location: 'query', field: 'version' })
          ]));
      });
  });

  describe('Helpers de Schema', () => {
      describe('createPaginationSchema', () => {
          const schema = createPaginationSchema({ defaultLimit: 20, maxLimit: 50 });

          it('deve aplicar valores padrão para inputs vazios ou inválidos', () => {
              const result = schema.parse({});
              expect(result).toEqual({ page: 1, limit: 20 });
          });

          it('deve limitar o valor máximo (maxLimit)', () => {
              const result = schema.parse({ limit: '1000' });
              expect(result.limit).toBe(50);
          });
      });

      describe('createSearchSchema', () => {
          const schema = createSearchSchema({ minLength: 3 });

          it('deve validar tamanho mínimo da busca', () => {
              expect(() => schema.parse({ search: 'oi' })).toThrow();
              expect(schema.parse({ search: 'olá' })).toEqual({ search: 'olá' });
          });
      });
  });
});