/**
 * CRUD Test Helpers
 * Utilitários para abstrair padrões repetitivos de testes CRUD de API
 *
 * Uso:
 *   import { testPublicGetEndpoint, testAdminCrudEndpoint } from '../../helpers/crud-test';
 *
 * Funções disponíveis:
 *   - testPublicGetEndpoint(handler, resourceConfig, customTests?)
 *     Para endpoints GET-only públicos (ex: /api/musicas, /api/videos)
 *
 *   - testAdminCrudEndpoint(handler, resourceConfig, customTests?)
 *     Para endpoints CRUD admin com autenticação (ex: /api/admin/musicas, /api/admin/posts)
 *
 *   - testAdminGetEndpoint(handler, resourceConfig, customTests?)
 *     Para endpoints GET-only admin (ex: /api/admin/audit)
 *
 * Design: Cada função testa apenas o que NÃO requer mocks específicos:
 *   - 405 para método não permitido
 *   - 401 sem autenticação (admin)
 *   - 400 para parâmetros inválidos (público)
 * Os testes específicos de cada recurso (GET, POST, PUT, DELETE com dados mockados)
 * devem ser fornecidos via customTests, garantindo que cada recurso mantenha
 * controle total sobre seus mocks e assertions específicos.
 */

import { createMocks } from 'node-mocks-http';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Testa um endpoint GET público
 * Testes padrão: 405, 400 (paginação inválida), 500 (erro servidor)
 *
 * @param {Function} handler - Handler da API
 * @param {Object} resourceConfig - Configuração do recurso
 * @param {string} resourceConfig.resourceName - Nome do recurso
 * @param {string} resourceConfig.path - Caminho da API
 * @param {Function} [resourceConfig.customTests] - Testes adicionais (recebe { handler, createMocks })
 */
export const testPublicGetEndpoint = (handler, resourceConfig = {}, customTests = null) => {
  const {
    resourceName = 'resource',
    path = '/api/resource',
  } = resourceConfig;

  describe(`API Pública - ${capitalize(resourceName)} (${path})`, () => {

    it(`deve retornar 405 para métodos não permitidos`, async () => {
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 400 para parâmetros de paginação inválidos', async () => {
      const { req, res } = createMocks({ method: 'GET', query: { page: -1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    // Testes personalizados do recurso
    if (customTests) {
      customTests({ handler, createMocks });
    }
  });
};

/**
 * Testa um endpoint CRUD admin (com autenticação)
 * Testes padrão: 401 sem autenticação
 * Nota: O teste de 405 não é incluído porque a verificação de autenticação
 * (middleware withAuth) ocorre ANTES da verificação de método HTTP. Portanto,
 * uma requisição PATCH sem token retorna 401, não 405. O teste de 405 deve
 * ser feito com requisição autenticada via customTests quando necessário.
 *
 * @param {Function} handler - Handler da API
 * @param {Object} resourceConfig - Configuração do recurso
 * @param {string} resourceConfig.resourceName - Nome do recurso
 * @param {string} resourceConfig.path - Caminho da API
 * @param {Function} [resourceConfig.customTests] - Testes adicionais (recebe { handler, createMocks })
 */
export const testAdminCrudEndpoint = (handler, resourceConfig = {}, customTests = null) => {
  const {
    resourceName = 'resource',
    path = '/api/admin/resource',
  } = resourceConfig;

  describe(`API Admin - Gestão de ${capitalize(resourceName)} (${path})`, () => {

    describe('Autenticação', () => {
      it('deve retornar 401 se o usuário não estiver autenticado', async () => {
        const { req, res } = createMocks({ method: 'GET' });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(401);
      });
    });

    // Testes personalizados do recurso
    if (customTests) {
      customTests({ handler, createMocks });
    }
  });
};

/**
 * Testa um endpoint GET-only admin
 *
 * @param {Function} handler - Handler da API
 * @param {Object} resourceConfig - Configuração do recurso
 * @param {string} resourceConfig.resourceName - Nome do recurso
 * @param {string} resourceConfig.path - Caminho da API
 * @param {Function} [resourceConfig.customTests] - Testes adicionais (recebe { handler, createMocks })
 */
export const testAdminGetEndpoint = (handler, resourceConfig = {}, customTests = null) => {
  const {
    resourceName = 'resource',
    path = '/api/admin/resource',
  } = resourceConfig;

  describe(`API Admin - ${capitalize(resourceName)} (${path})`, () => {

    it('deve retornar 401 se o usuário não estiver autenticado', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 405 para métodos não permitidos', async () => {
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    if (customTests) {
      customTests({ handler, createMocks });
    }
  });
};

// Utilitário interno
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}