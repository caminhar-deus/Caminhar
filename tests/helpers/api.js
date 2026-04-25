/**
 * API Helpers
 * Utilitários para testes de API
 * 
 * Estes helpers simplificam a criação de mocks HTTP e verificação de respostas.
 * 
 * NOTA: Para verificações de resposta (status, JSON, headers), utilize os
 * matchers nativos do Jest disponíveis globalmente:
 *   - expect(res).toHaveStatus(status)
 *   - expect(res).toBeValidJSON(expected)
 *   - expect(res).toHaveHeader(name, value)
 */

import { createMocks } from 'node-mocks-http';

/**
 * Cria mocks de requisição/resposta HTTP
 * @param {Object} options - Opções para createMocks
 * @param {string} options.method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Corpo da requisição
 * @param {Object} options.query - Query parameters
 * @param {Object} options.headers - Headers da requisição
 * @param {Object} options.cookies - Cookies
 * @returns {Object} { req, res }
 */
export const createApiMocks = (options = {}) => {
  const { method = 'GET', body, query, headers = {}, cookies = {} } = options;
  
  return createMocks({
    method,
    body,
    query,
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
    cookies,
  });
};

/**
 * Cria uma requisição GET
 * @param {Object} query - Query parameters
 * @param {Object} headers - Headers adicionais
 * @returns {Object} { req, res }
 */
export const createGetRequest = (query = {}, headers = {}) =>
  createApiMocks({ method: 'GET', query, headers });

/**
 * Cria uma requisição POST
 * @param {Object} body - Corpo da requisição
 * @param {Object} headers - Headers adicionais
 * @returns {Object} { req, res }
 */
export const createPostRequest = (body = {}, headers = {}) =>
  createApiMocks({ method: 'POST', body, headers });

/**
 * Cria uma requisição PUT
 * @param {Object} body - Corpo da requisição
 * @param {Object} query - Query parameters
 * @param {Object} headers - Headers adicionais
 * @returns {Object} { req, res }
 */
export const createPutRequest = (body = {}, query = {}, headers = {}) =>
  createApiMocks({ method: 'PUT', body, query, headers });

/**
 * Cria uma requisição DELETE
 * @param {Object} body - Corpo da requisição (opcional)
 * @param {Object} query - Query parameters
 * @param {Object} headers - Headers adicionais
 * @returns {Object} { req, res }
 */
export const createDeleteRequest = (body, query = {}, headers = {}) =>
  createApiMocks({ method: 'DELETE', body, query, headers });

/**
 * Cria uma requisição PATCH
 * @param {Object} body - Corpo da requisição
 * @param {Object} headers - Headers adicionais
 * @returns {Object} { req, res }
 */
export const createPatchRequest = (body = {}, headers = {}) =>
  createApiMocks({ method: 'PATCH', body, headers });

/**
 * Executa um handler de API e retorna a resposta
 * @param {Function} handler - Handler da API
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resposta
 */
export const executeHandler = async (handler, req, res) => {
  await handler(req, res);
  const data = res._getData();
  return {
    status: res._getStatusCode(),
    data: data ? JSON.parse(data) : null,
    headers: res.getHeaders?.() || res._getHeaders?.() || {},
  };
};

/**
 * Simula um payload de webhook
 * @param {string} event - Tipo de evento
 * @param {Object} data - Dados do evento
 * @returns {Object} Payload do webhook
 */
export const createWebhookPayload = (event, data = {}) => ({
  event,
  timestamp: new Date().toISOString(),
  data,
});

/**
 * Cria uma requisição com autenticação Bearer
 * @param {string} token - Token JWT
 * @param {Object} options - Outras opções da requisição
 * @returns {Object} { req, res }
 */
export const createAuthRequest = (token, options = {}) =>
  createApiMocks({
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

/**
 * Cria uma requisição com cookie de autenticação
 * @param {string} token - Token JWT
 * @param {Object} options - Outras opções da requisição
 * @returns {Object} { req, res }
 */
export const createCookieAuthRequest = (token, options = {}) =>
  createApiMocks({
    ...options,
    cookies: {
      token,
      ...options.cookies,
    },
  });

/**
 * Extrai o corpo da resposta como objeto
 * @param {Object} res - Response object
 * @returns {Object} Corpo parseado
 */
export const getResponseBody = (res) => {
  try {
    return JSON.parse(res._getData());
  } catch {
    return res._getData();
  }
};

