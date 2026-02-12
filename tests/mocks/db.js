/**
 * Database Mocks
 * Mocks para operações de banco de dados
 */

/**
 * Cria um mock de query que retorna valores
 * @param {Object|Array|Function} returnValue - Valor(es) a retornar
 * @returns {Function} Mock de query
 */
export const mockQuery = (returnValue) => {
  return jest.fn().mockImplementation((query, params) => {
    const result = typeof returnValue === 'function' 
      ? returnValue(query, params) 
      : returnValue;
    
    return Promise.resolve({
      rows: Array.isArray(result) ? result : [result].filter(Boolean),
      rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
      command: query.trim().split(' ')[0].toUpperCase(),
    });
  });
};

/**
 * Cria um mock de query que retorna um único resultado
 * @param {Object} row - Linha a retornar
 * @returns {Function} Mock de query
 */
export const mockQueryOne = (row) => {
  return mockQuery(row ? [row] : []);
};

/**
 * Cria um mock de query que retorna múltiplos resultados
 * @param {Array} rows - Linhas a retornar
 * @returns {Function} Mock de query
 */
export const mockQueryMany = (rows = []) => {
  return mockQuery(rows);
};

/**
 * Cria um mock de query que retorna erro
 * @param {Error|string} error - Erro a lançar
 * @returns {Function} Mock de query
 */
export const mockQueryError = (error) => {
  const errorObj = error instanceof Error ? error : new Error(error);
  return jest.fn().mockRejectedValue(errorObj);
};

/**
 * Cria um mock de query que simula INSERT
 * @param {Object} insertedRow - Dados inseridos
 * @returns {Function} Mock de query
 */
export const mockInsert = (insertedRow = {}) => {
  return jest.fn().mockImplementation((query, params) => {
    if (!query.toLowerCase().includes('insert')) {
      throw new Error('Expected INSERT query');
    }
    
    return Promise.resolve({
      rows: [{ id: insertedRow.id || 1, ...insertedRow }],
      rowCount: 1,
      command: 'INSERT',
    });
  });
};

/**
 * Cria um mock de query que simula UPDATE
 * @param {Object} updatedRow - Dados atualizados
 * @returns {Function} Mock de query
 */
export const mockUpdate = (updatedRow = {}) => {
  return jest.fn().mockImplementation((query, params) => {
    if (!query.toLowerCase().includes('update')) {
      throw new Error('Expected UPDATE query');
    }
    
    return Promise.resolve({
      rows: [{ ...updatedRow }],
      rowCount: 1,
      command: 'UPDATE',
    });
  });
};

/**
 * Cria um mock de query que simula DELETE
 * @param {number|string} deletedId - ID deletado
 * @returns {Function} Mock de query
 */
export const mockDelete = (deletedId) => {
  return jest.fn().mockImplementation((query, params) => {
    if (!query.toLowerCase().includes('delete')) {
      throw new Error('Expected DELETE query');
    }
    
    return Promise.resolve({
      rows: [{ id: deletedId }],
      rowCount: 1,
      command: 'DELETE',
    });
  });
};

/**
 * Cria um mock de transaction
 * @param {Function} callback - Função a executar dentro da transaction
 * @returns {Promise} Resultado da callback
 */
export const mockTransaction = async (callback) => {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cria um mock de pool de conexões
 * @param {Object} options - Opções do pool
 * @returns {Object} Pool mockado
 */
export const mockPool = (options = {}) => {
  return {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    ...options,
  };
};

/**
 * Verifica se uma query SQL foi chamada
 * @param {Function} queryMock - Mock da query
 * @param {string|RegExp} pattern - Padrão a buscar
 * @returns {boolean} Se foi chamada
 */
export const queryWasCalledWith = (queryMock, pattern) => {
  return queryMock.mock.calls.some(call => {
    const query = call[0];
    if (pattern instanceof RegExp) {
      return pattern.test(query);
    }
    return query.includes(pattern);
  });
};

/**
 * Verifica os parâmetros de uma query
 * @param {Function} queryMock - Mock da query
 * @param {number} callIndex - Índice da chamada (default: última)
 * @returns {Array|null} Parâmetros ou null
 */
export const getQueryParams = (queryMock, callIndex = -1) => {
  const calls = queryMock.mock.calls;
  const targetCall = callIndex === -1 ? calls[calls.length - 1] : calls[callIndex];
  return targetCall ? targetCall[1] : null;
};

/**
 * Cria um mock completo do módulo db
 * @param {Object} options - Opções
 * @returns {Object} Módulo db mockado
 */
export const mockDbModule = (options = {}) => {
  return {
    query: options.query || jest.fn().mockResolvedValue({ rows: [] }),
    transaction: options.transaction || mockTransaction,
    pool: options.pool || mockPool(),
    connect: options.connect || jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  };
};

/**
 * Simula um resultado de paginação
 * @param {Array} data - Dados completos
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @returns {Object} Resultado paginado
 */
export const mockPaginatedResult = (data, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginated = data.slice(offset, offset + limit);
  
  return {
    rows: paginated,
    rowCount: paginated.length,
    total: data.length,
    page,
    limit,
    totalPages: Math.ceil(data.length / limit),
  };
};

/**
 * Limpa todos os mocks de query
 * @param {...Function} queryMocks - Mocks a limpar
 */
export const clearQueryMocks = (...queryMocks) => {
  queryMocks.forEach(mock => {
    if (mock && mock.mockClear) {
      mock.mockClear();
    }
  });
};

/**
 * Helper para criar respostas sequenciais
 * @param {Array} responses - Lista de respostas
 * @returns {Function} Mock sequencial
 */
export const mockQuerySequence = (responses) => {
  let callIndex = 0;
  
  return jest.fn().mockImplementation(() => {
    const response = responses[callIndex++] || responses[responses.length - 1];
    const result = typeof response === 'function' ? response() : response;
    
    return Promise.resolve({
      rows: Array.isArray(result) ? result : [result].filter(Boolean),
      rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
    });
  });
};
