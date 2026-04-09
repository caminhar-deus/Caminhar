import { describe, it, expect } from '@jest/globals';
import apiIndex, { ApiError, success, validateBody, composeMiddleware } from '../../../../lib/api/index.js';

describe('Library - API - Index', () => {
  it('deve re-exportar todos os submódulos da API e exportar o objeto default', () => {
    // Verifica as exportações do objeto default
    expect(apiIndex).toBeDefined();
    expect(apiIndex.errors).toBeDefined();
    expect(apiIndex.response).toBeDefined();
    expect(apiIndex.validate).toBeDefined();
    expect(apiIndex.middleware).toBeDefined();

    // Verifica se o 'export *' está funcionando puxando funções específicas
    expect(ApiError).toBeDefined();
    expect(success).toBeDefined();
    expect(validateBody).toBeDefined();
    expect(composeMiddleware).toBeDefined();
  });
});