import { describe, it, expect } from '@jest/globals';
import apiIndex from '../../../../lib/api/index.js';

describe('Library - API - Index', () => {
  it('deve exportar o objeto default com todos os submódulos da API', () => {
    // Verifica as exportações do objeto default
    expect(apiIndex).toBeDefined();
    expect(apiIndex.errors).toBeDefined();
    expect(apiIndex.response).toBeDefined();
    expect(apiIndex.validate).toBeDefined();
    expect(apiIndex.middleware).toBeDefined();

    // Verifica que os submódulos expõem as funções esperadas
    expect(apiIndex.errors.ApiError).toBeDefined();
    expect(apiIndex.response.success).toBeDefined();
    expect(apiIndex.validate.validateBody).toBeDefined();
    expect(apiIndex.middleware.composeMiddleware).toBeDefined();
  });
});
