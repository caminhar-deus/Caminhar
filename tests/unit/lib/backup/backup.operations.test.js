import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock das dependências de sistema
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { createBackup, restoreBackup } from '../../../../scripts/backup.js';
import fs from 'fs';
import child_process from 'child_process';

describe('Operações de Backup (lib/backup.js)', () => {
  const DATABASE_URL = 'postgresql://user:pass@host:5432/testdb';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = DATABASE_URL;
    
    // Configuração padrão dos mocks
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('');
    fs.statSync.mockReturnValue({ size: 1024 });
    
    // Mock do exec para simular sucesso por padrão
    child_process.exec.mockImplementation((cmd, cb) => cb(null, 'stdout', ''));
  });

  describe('createBackup', () => {
    it('deve executar o pg_dump e criar o arquivo de backup', async () => {
      await createBackup();

      expect(child_process.exec).toHaveBeenCalled();
      const command = child_process.exec.mock.calls[0][0];
      
      expect(command).toContain(`pg_dump "${DATABASE_URL}"`);
      expect(command).toContain('| gzip >');
      expect(command).toContain('.sql.gz');
    });

    it('deve criar o diretório de backups se não existir', async () => {
      // Simula que o diretório não existe na primeira verificação
      fs.existsSync.mockReturnValueOnce(false); 
      
      await createBackup();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
    });

    it('deve limpar backups antigos após uma criação bem-sucedida', async () => {
        const maxBackups = 10;
        // Simula arquivos existentes para disparar a limpeza
        const fakeBackups = Array.from({ length: maxBackups + 2 }, (_, i) => {
            const day = (15 - i).toString().padStart(2, '0');
            return `caminhar-pg-backup_2026-01-${day}_02-00-00.sql.gz`;
        });
        fs.readdirSync.mockReturnValue(fakeBackups);
        
        await createBackup();
        
        // Espera que unlinkSync seja chamado para os arquivos excedentes
        expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });
    
    it('deve logar o sucesso da operação', async () => {
        await createBackup();
        expect(fs.appendFileSync).toHaveBeenCalledWith(expect.stringContaining('backup.log'), expect.stringContaining('[SUCCESS]'));
    });
  });

  describe('restoreBackup', () => {
    it('deve criar backup de segurança e restaurar o banco', async () => {
      const backupFile = 'backup-test.sql.gz';
      
      await restoreBackup(backupFile);
      
      expect(child_process.exec).toHaveBeenCalledTimes(2);
      
      // 1. Backup de segurança
      const safetyCmd = child_process.exec.mock.calls[0][0];
      expect(safetyCmd).toContain('pg_dump');
      expect(safetyCmd).toContain('pre-restore-backup');
      
      // 2. Restauração
      const restoreCmd = child_process.exec.mock.calls[1][0];
      expect(restoreCmd).toContain('gunzip <');
      expect(restoreCmd).toContain(backupFile);
      expect(restoreCmd).toContain('psql');
    });

    it('deve falhar se o arquivo de backup não existir', async () => {
       fs.existsSync.mockImplementation((p) => {
           // ensureBackupDirectory verifica o diretório
           if (typeof p === 'string' && p.endsWith('backups')) return true;
           // restoreBackup verifica o arquivo
           return false;
       });
       
       await expect(restoreBackup('missing.sql.gz')).rejects.toThrow('Backup file not found');
    });
  });
});