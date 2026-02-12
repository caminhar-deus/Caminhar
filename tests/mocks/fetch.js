/**
 * Fetch Mocks
 * Mocks para requisições fetch
 */

/**
 * Cria um mock de fetch que retorna uma resposta
 * @param {Object|Function} response - Resposta ou função que retorna resposta
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetch = (response, options = {}) => {
  return jest.fn().mockImplementation((url, init) => {
    const result = typeof response === 'function' 
      ? response(url, init) 
      : response;
    
    return Promise.resolve({
      ok: options.ok !== false,
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      headers: new Headers(options.headers || {}),
      json: () => Promise.resolve(result),
      text: () => Promise.resolve(JSON.stringify(result)),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      formData: () => Promise.resolve(new FormData()),
      clone: () => mockFetch(response, options),
      ...options.overrides,
    });
  });
};

/**
 * Cria um mock de fetch que retorna sucesso
 * @param {Object} data - Dados da resposta
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetchSuccess = (data = {}, options = {}) =>
  mockFetch(data, { ok: true, status: 200, ...options });

/**
 * Cria um mock de fetch que retorna erro
 * @param {number} status - Status HTTP de erro
 * @param {Object|string} error - Dados do erro
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetchError = (status = 400, error = { message: 'Error' }, options = {}) =>
  mockFetch(error, { ok: false, status, statusText: 'Error', ...options });

/**
 * Cria um mock de fetch que retorna 404
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetchNotFound = (options = {}) =>
  mockFetchError(404, { message: 'Not Found' }, options);

/**
 * Cria um mock de fetch que retorna 401
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetchUnauthorized = (options = {}) =>
  mockFetchError(401, { message: 'Unauthorized' }, options);

/**
 * Cria um mock de fetch que retorna 500
 * @param {Object} options - Opções adicionais
 * @returns {Function} Mock de fetch
 */
export const mockFetchServerError = (options = {}) =>
  mockFetchError(500, { message: 'Internal Server Error' }, options);

/**
 * Cria um mock de fetch que simula network error
 * @param {string} message - Mensagem de erro
 * @returns {Function} Mock de fetch
 */
export const mockFetchNetworkError = (message = 'Network error') => {
  return jest.fn().mockRejectedValue(new Error(message));
};

/**
 * Cria um mock de fetch com respostas baseadas em URL
 * @param {Object} urlMap - Mapa de URL para resposta
 * @param {Object} defaultResponse - Resposta padrão
 * @returns {Function} Mock de fetch
 */
export const mockFetchWithRoutes = (urlMap, defaultResponse = {}) => {
  return jest.fn().mockImplementation((url) => {
    const matchingRoute = Object.keys(urlMap).find(route => {
      if (route instanceof RegExp) {
        return route.test(url);
      }
      return url.includes(route);
    });
    
    const response = matchingRoute ? urlMap[matchingRoute] : defaultResponse;
    const result = typeof response === 'function' ? response(url) : response;
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(result),
      text: () => Promise.resolve(JSON.stringify(result)),
    });
  });
};

/**
 * Mock de fetch que retorna respostas em sequência
 * @param {Array} responses - Lista de respostas
 * @returns {Function} Mock de fetch
 */
export const mockFetchSequence = (responses) => {
  let callIndex = 0;
  
  return jest.fn().mockImplementation(() => {
    const response = responses[callIndex++] || responses[responses.length - 1];
    const result = typeof response === 'function' ? response() : response;
    
    return Promise.resolve({
      ok: result.ok !== false,
      status: result.status || 200,
      json: () => Promise.resolve(result.data || result),
      text: () => Promise.resolve(JSON.stringify(result.data || result)),
    });
  });
};

/**
 * Cria um delay simulado para fetch
 * @param {number} ms - Milissegundos de delay
 * @returns {Promise} Promise resolvida após o delay
 */
export const fetchDelay = (ms = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Configura o mock global de fetch
 * @param {Function} mockImpl - Implementação do mock
 */
export const setupFetchMock = (mockImpl = mockFetchSuccess({})) => {
  global.fetch = mockImpl;
};

/**
 * Limpa o mock de fetch
 */
export const clearFetchMock = () => {
  global.fetch = undefined;
};

/**
 * Helper para verificar se fetch foi chamado com URL específica
 * @param {Function} fetchMock - Mock do fetch
 * @param {string|RegExp} url - URL esperada
 * @returns {boolean} Se foi chamado
 */
export const fetchWasCalledWith = (fetchMock, url) => {
  return fetchMock.mock.calls.some(call => {
    const calledUrl = call[0];
    if (url instanceof RegExp) {
      return url.test(calledUrl);
    }
    return calledUrl.includes(url);
  });
};

/**
 * Helper para obter o último call do fetch
 * @param {Function} fetchMock - Mock do fetch
 * @returns {Array|null} Último call ou null
 */
export const getLastFetchCall = (fetchMock) => {
  const calls = fetchMock.mock.calls;
  return calls.length > 0 ? calls[calls.length - 1] : null;
};
