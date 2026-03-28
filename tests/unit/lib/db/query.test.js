import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { query, resetPool } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('Base Query Wrapper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(query('SELECT 1')).rejects.toThrow('Connection lost');
        
        // Verifica se o log específico da função query foi chamado
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao executar consulta SQL', {
            code: undefined,
            duration: expect.any(String),
            message: 'Connection lost',
            query: 'SELECT 1'
        });
        consoleSpy.mockRestore();
    });
});