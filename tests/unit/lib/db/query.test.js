import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { query, resetPool } from '../../../../lib/infra/db.js';
import { logger } from '../../../../lib/infra/logger.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Base Query Wrapper', () => {
    beforeEach(() => {
        restorePoolImplementation();
        resetPool();
        mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('deve executar uma query SQL com sucesso', async () => {
        mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
        await query('SELECT 1', []);
        expect(mockQuery).toHaveBeenCalledWith('SELECT 1', []);
    });

    it('deve logar erro no console e relançar exceção em caso de falha', async () => {
        const error = new Error('Connection lost');
        mockQuery.mockRejectedValue(error);

        await expect(query('SELECT 1')).rejects.toThrow('Connection lost');

        // Verifica se o log específico da função query foi chamado
        expect(logger.error).toHaveBeenCalledWith(
            'DB',
            'Erro ao executar consulta SQL',
            expect.objectContaining({
                code: undefined,
                duration: expect.any(String),
                message: 'Connection lost',
                query: 'SELECT 1'
            })
        );
    });
});