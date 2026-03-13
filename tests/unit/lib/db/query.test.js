import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { query } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('Base Query Wrapper', () => {
    let mockQuery;

    beforeEach(() => {
        // Reseta o mock para garantir um estado limpo para cada teste
        mockQuery = new Pool().query;
        mockQuery.mockReset();
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
        expect(consoleSpy).toHaveBeenCalledWith('Error executing query', { text: 'SELECT 1' });
        consoleSpy.mockRestore();
    });
});