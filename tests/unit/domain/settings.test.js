import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mocks para isolar o banco de dados
jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../../../lib/crud.js', () => ({
  upsertRecord: jest.fn(),
  // Simulamos a função 'raw' para podermos rastrear exatamente onde ela foi usada
  raw: jest.fn((val) => `RAW(${val})`), 
}));

// Importa as funções que serão testadas
import { 
  getSetting, 
  getSettings, 
  updateSetting, 
  setSetting, 
  getAllSettings 
} from '../../../lib/domain/settings.js';

// Importa os mocks para asserções
import { query } from '../../../lib/db.js';
import { upsertRecord, raw } from '../../../lib/crud.js';

describe('Domain - Configurações (lib/domain/settings.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reestabelece a implementação do mock caso o Jest o resete automaticamente
    raw.mockImplementation((val) => `RAW(${val})`);
  });

  describe('getSetting()', () => {
    it('deve retornar o valor da configuração quando for encontrada no banco', async () => {
      query.mockResolvedValueOnce({ rows: [{ value: 'dark' }] });
      
      const result = await getSetting('theme');
      
      expect(result).toBe('dark');
      expect(query).toHaveBeenCalledWith(
        'SELECT value FROM settings WHERE key = $1', 
        ['theme'], 
        { log: false }
      );
    });

    it('deve retornar o valor padrão (default) quando a configuração não existir', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // Simula que a query não achou nada
      
      const result = await getSetting('theme', 'light');
      
      expect(result).toBe('light'); // Retorna o fallback passado por parâmetro
    });
  });

  describe('getSettings()', () => {
    it('deve retornar um objeto mapeando chave-valor com todas as configurações', async () => {
      query.mockResolvedValueOnce({ 
        rows: [
          { key: 'theme', value: 'light' },
          { key: 'site_name', value: 'Projeto Caminhar' }
        ] 
      });
      
      const result = await getSettings();
      
      expect(result).toEqual({
        theme: 'light',
        site_name: 'Projeto Caminhar'
      });
      expect(query).toHaveBeenCalledWith('SELECT key, value FROM settings', [], { log: false });
    });
  });

  describe('updateSetting() / setSetting()', () => {
    it('deve preparar os dados e chamar upsertRecord corretamente', async () => {
      upsertRecord.mockResolvedValueOnce({ key: 'theme', value: 'dark' });
      
      const result = await updateSetting('theme', 'dark', 'string', 'Tema do site');
      
      expect(result).toEqual({ key: 'theme', value: 'dark' });
      expect(raw).toHaveBeenCalledWith('CURRENT_TIMESTAMP');
      
      const expectedInsertData = { key: 'theme', value: 'dark', type: 'string', description: 'Tema do site', updated_at: 'RAW(CURRENT_TIMESTAMP)' };
      const expectedUpdateData = { value: 'dark', type: 'string', description: 'Tema do site', updated_at: 'RAW(CURRENT_TIMESTAMP)' };

      // Garante que o CRUD de upsert será chamado instruindo inserção ou atualização dependendo da key
      expect(upsertRecord).toHaveBeenCalledWith('settings', expectedInsertData, 'key', expectedUpdateData);
    });

    it('setSetting deve ser um alias exato para updateSetting', () => {
      expect(setSetting).toBe(updateSetting);
    });
  });

  describe('getAllSettings()', () => {
    it('deve retornar o array completo com todos os registros', async () => {
      const mockRows = [
        { id: 1, key: 'theme', value: 'light', type: 'string' },
        { id: 2, key: 'site_name', value: 'Caminhar', type: 'string' }
      ];
      query.mockResolvedValueOnce({ rows: mockRows });
      
      const result = await getAllSettings();
      
      expect(result).toEqual(mockRows);
      expect(query).toHaveBeenCalledWith('SELECT * FROM settings ORDER BY key ASC', [], { log: false });
    });
  });
});