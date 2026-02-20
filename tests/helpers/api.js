/**
 * API Helpers
 * Utilitários para testes de API
 * 
 * Estes helpers simplificam a criação de mocks HTTP e verificação de respostas.
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
 * Verifica se a resposta tem o status esperado
 * @param {Object} res - Objeto de resposta do node-mocks-http
 * @param {number} expectedStatus - Status esperado (default: 200)
 */
export const expectStatus = (res, expectedStatus = 200) => {
  const status = res._getStatusCode();
  if (status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, but got ${status}\n` +
      `Response body: ${res._getData()}`
    );
  }
};

/**
 * Verifica se a resposta contém JSON válido e opcionalmente dados esperados
 * @param {Object} res - Objeto de resposta
 * @param {Object|Array} expected - Dados esperados (opcional)
 * @returns {Object|Array} Dados parseados
 */
export const expectJson = (res, expected) => {
  const data = res._getData();
  let parsed;
  
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    throw new Error(`Invalid JSON in response: ${data}`);
  }
  
  if (expected !== undefined) {
    const pass = JSON.stringify(parsed) === JSON.stringify(expected) ||
      (typeof expected === 'object' && 
       Object.keys(expected).every(key => parsed[key] === expected[key]));
    
    if (!pass) {
      throw new Error(
        `JSON mismatch:\n` +
        `Expected: ${JSON.stringify(expected, null, 2)}\n` +
        `Received: ${JSON.stringify(parsed, null, 2)}`
      );
    }
  }
  
  return parsed;
};

/**
 * Verifica se a resposta é um array
 * @param {Object} res - Objeto de resposta
 * @param {number} minLength - Tamanho mínimo esperado (opcional)
 */
export const expectArray = (res, minLength) => {
  const data = expectJson(res);
  
  if (!Array.isArray(data)) {
    throw new Error(`Expected array, but got ${typeof data}`);
  }
  
  if (minLength !== undefined && data.length < minLength) {
    throw new Error(`Expected array with at least ${minLength} items, but got ${data.length}`);
  }
  
  return data;
};

/**
 * Verifica se a resposta tem o header esperado
 * @param {Object} res - Objeto de resposta
 * @param {string} headerName - Nome do header
 * @param {string} expectedValue - Valor esperado (opcional)
 */
export const expectHeader = (res, headerName, expectedValue) => {
  const headers = res.getHeaders?.() || res._getHeaders?.() || {};
  const actualValue = headers[headerName.toLowerCase()];
  
  if (expectedValue === undefined) {
    if (actualValue === undefined) {
      throw new Error(`Expected header "${headerName}" to exist`);
    }
  } else if (actualValue !== expectedValue) {
    throw new Error(
      `Expected header "${headerName}" to be "${expectedValue}", but got "${actualValue}"`
    );
  }
};

/**
 * Verifica se a resposta é um erro
 * @param {Object} res - Objeto de resposta
 * @param {number} expectedStatus - Status de erro esperado (default: 400)
 * @param {string} expectedMessage - Mensagem de erro esperada (opcional)
 */
export const expectError = (res, expectedStatus = 400, expectedMessage) => {
  expectStatus(res, expectedStatus);
  const data = expectJson(res);
  
  if (!data.message && !data.error) {
    throw new Error(`Expected error response with 'message' or 'error' field`);
  }
  
  const message = data.message || data.error;
  
  if (expectedMessage && !message.includes(expectedMessage)) {
    throw new Error(`Expected error message to include "${expectedMessage}", but got "${message}"`);
  }
  
  return data;
};

/**
 * Executa um handler de API e retorna a resposta
 * @param {Function} handler - Handler da API
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resposta
 */
export const executeHandler = async (handler, req, res) => {
  await handler(req, res);
  return {
    status: res._getStatusCode(),
    data: expectJson(res),
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

/**
 * Verifica se a resposta paginada está correta
 * @param {Object} res - Response object
 * @param {Object} expected - Valores esperados
 * @param {number} expected.page - Página esperada
 * @param {number} expected.limit - Limite por página
 * @param {number} expected.total - Total de itens
 */
export const expectPaginatedResponse = (res, expected) => {
  const data = expectJson(res);
  
  if (!data.pagination && !data.meta) {
    throw new Error('Expected paginated response with pagination or meta field');
  }
  
  const pagination = data.pagination || data.meta;
  
  if (expected.page !== undefined && pagination.page !== expected.page) {
    throw new Error(`Expected page ${expected.page}, but got ${pagination.page}`);
  }
  
  if (expected.limit !== undefined && pagination.limit !== expected.limit) {
    throw new Error(`Expected limit ${expected.limit}, but got ${pagination.limit}`);
  }
  
  if (expected.total !== undefined && pagination.total !== expected.total) {
    throw new Error(`Expected total ${expected.total}, but got ${pagination.total}`);
  }
  
  return data;
};
