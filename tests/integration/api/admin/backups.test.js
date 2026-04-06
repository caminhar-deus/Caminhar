import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks de sistema de arquivos e script de backup
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('../../../../scripts/backup', () => ({
  createBackup: jest.fn(),
}));

// Mocks para Auth (interceptando o middleware withAuth)
jest.mock('../../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = { userId: 1, username: 'admin', role: 'admin' };
    return handler(req, res);
  }),
}));

import fs from 'fs';
import { createBackup } from '../../../../scripts/backup';
import handler from '../../../../pages/api/admin/backups.js';

describe('API Admin - Gestão de Backups (/api/admin/backups)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/fake/cwd');
  });

  const getAuthenticatedMocks = (options = {}) => createMocks({
    ...options,
    headers: { ...options.headers, authorization: 'Bearer valid-token' },
  });

  describe('GET - Listar Backups', () => {
    it('deve retornar null se o diretório de backups não existir', async () => {
      fs.existsSync.mockReturnValue(false); // Diretório ausente

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ latest: null });
    });

    it('deve retornar a lista de backups ordenada por data com os últimos criados no topo', async () => {
      fs.existsSync.mockReturnValue(true);
      // Simula a pasta com três arquivos, sendo um deles ignorado (não-SQL)
      fs.readdirSync.mockReturnValue(['backup_old.sql', 'ignorame.txt', 'backup_new.sql.gz']);
      
      // Simula datas e tamanhos falsos para a ordenação ser testada
      fs.statSync.mockImplementation((filePath) => {
        if (filePath.includes('backup_old')) return { mtime: new Date('2026-01-01'), size: 1000 };
        if (filePath.includes('backup_new')) return { mtime: new Date('2026-04-01'), size: 2000 };
        return { mtime: new Date(), size: 0 }; // Fallback de segurança
      });

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      // Espera que o backup_new venha primeiro por ser mais recente
      expect(data.backups).toHaveLength(2);
      expect(data.latest.name).toBe('backup_new.sql.gz');
      expect(data.backups[1].name).toBe('backup_old.sql');
    });

    it('deve retornar 500 se o sistema de arquivos falhar', async () => {
      fs.existsSync.mockImplementation(() => { throw new Error('Erro de permissão no FS'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('POST - Criar Backup', () => {
    it('deve criar um backup via script e retornar 200', async () => {
      createBackup.mockResolvedValueOnce({ filename: 'novo_bkp.sql' });

      const { req, res } = getAuthenticatedMocks({ method: 'POST' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).success).toBe(true);
      expect(createBackup).toHaveBeenCalled();
    });

    it('deve retornar 500 se o script de backup falhar', async () => {
      createBackup.mockRejectedValueOnce(new Error('Processo pg_dump falhou'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = getAuthenticatedMocks({ method: 'POST' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('Tratamento de Rotas', () => {
    it('deve retornar 405 para métodos não permitidos', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});