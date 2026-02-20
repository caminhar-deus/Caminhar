import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/musicas';
import { query } from '../lib/db';

// Mock do banco de dados (simulando a camada mais baixa)
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('Integração API Pública: Validação de Segurança (Banco de Dados)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve garantir que a query SQL inclua "WHERE publicado = true"', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Mock do retorno do banco
    query.mockResolvedValueOnce({
      rows: [
        { id: 1, titulo: 'Música Publicada', publicado: true }
      ]
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query enviada ao banco realmente contém o filtro de segurança
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true'),
      expect.any(Array)
    );
  });

  it('deve manter o filtro "publicado = true" mesmo quando houver busca', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'Hino' }
    });

    query.mockResolvedValueOnce({ rows: [] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se ambos os filtros estão presentes na query (segurança + busca)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE publicado = true AND'),
      expect.arrayContaining(['%hino%'])
    );
  });
});