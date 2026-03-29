import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { resetPool } from '../../../../lib/db.js';
import { updateSetting, setSetting, getSetting, getSettings, getAllSettings } from '../../../../lib/domain/settings.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('Settings Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restorePoolImplementation();
    resetPool();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('updateSetting', () => {
    it('deve inserir ou atualizar uma configuração corretamente', async () => {
      const mockResult = { rows: [{ key: 'site_name', value: 'Caminhar', type: 'string' }] };
      mockQuery.mockResolvedValue(mockResult);

      const result = await updateSetting('site_name', 'Caminhar', 'string', 'Nome do site');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [text, values] = mockQuery.mock.calls[0];

      // Normaliza o SQL para remover espaços/quebras de linha extras, tornando o teste mais robusto.
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      const expectedSql = 'INSERT INTO settings (key, value, type, description, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $5, type = $6, description = $7, updated_at = CURRENT_TIMESTAMP RETURNING *';
      expect(normalizedText).toBe(expectedSql);

      // Verifica os parâmetros para INSERT e UPDATE, que agora são 7 no total.
      const expectedValues = ['site_name', 'Caminhar', 'string', 'Nome do site', 'Caminhar', 'string', 'Nome do site'];
      expect(values).toEqual(expectedValues);

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('deve propagar erro e logar no console em caso de falha', async () => {
        const error = new Error('DB Error');
        mockQuery.mockRejectedValue(error);
        
        // Silencia o console.error
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(updateSetting('key', 'val', 'str', 'desc')).rejects.toThrow('DB Error');
        
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
  });

  describe('setSetting', () => {
      it('deve ser um alias para updateSetting e funcionar igual', async () => {
          const mockResult = { rows: [{ key: 'test', value: '123' }] };
          mockQuery.mockResolvedValue(mockResult);
          
          const result = await setSetting('test', '123', 'string', 'desc');
          
          expect(mockQuery).toHaveBeenCalled();
          expect(result).toEqual(mockResult.rows[0]);
      });
  });

  describe('getSetting', () => {
      it('deve retornar apenas o valor da configuração se ela existir', async () => {
          mockQuery.mockResolvedValue({ rows: [{ value: 'my_value' }] });
          
          const result = await getSetting('my_key');
          
          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT value FROM settings'), ['my_key']);
          expect(result).toBe('my_value');
      });

      it('deve retornar null se a configuração não existir', async () => {
          const result = await getSetting('missing_key');
          expect(result).toBeNull();
      });

      it('deve tratar erros corretamente', async () => {
          mockQuery.mockRejectedValue(new Error('Fail'));
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
          
          await expect(getSetting('key')).rejects.toThrow('Fail');
          
          consoleSpy.mockRestore();
      });
  });

  describe('getSettings (Objeto)', () => {
      it('deve retornar todas as configurações formatadas como objeto chave-valor', async () => {
          mockQuery.mockResolvedValue({ 
              rows: [
                  { key: 'site_title', value: 'Title' },
                  { key: 'admin_email', value: 'admin@test.com' }
              ] 
          });

          const result = await getSettings();
          
          expect(result).toEqual({
              site_title: 'Title',
              admin_email: 'admin@test.com'
          });
      });
  });

  describe('getAllSettings (Array)', () => {
       it('deve retornar a lista bruta de configurações', async () => {
           const rows = [{ key: 'a', value: '1', description: 'desc' }];
           mockQuery.mockResolvedValue({ rows });
           
           const result = await getAllSettings();
           
           expect(result).toEqual(rows);
       });

       it('deve tratar erros ao buscar lista', async () => {
          mockQuery.mockRejectedValue(new Error('Fail'));
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
          
          await expect(getAllSettings()).rejects.toThrow('Fail');
          
          consoleSpy.mockRestore();
      });
  });
});