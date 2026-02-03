import { jest } from '@jest/globals';

// 1. Mock do child_process
// Definimos a implementação diretamente na fábrica para evitar problemas de hoisting
jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => callback(null, 'stdout', ''))
}));

// 2. Mock do fs - Manual mock para as funções síncronas utilizadas
jest.mock('fs', () => {
  const mockFs = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    appendFileSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    statSync: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockFs,
    ...mockFs,
  };
});

let fs;
let exec;
let createBackup;
let restoreBackup;

describe('Sistema de Backup e Restauração (PostgreSQL)', () => {
  beforeAll(async () => {
    // Import mocks dynamically to ensure we get the mocked versions
    const fsModule = await import('fs');
    fs = fsModule.default;
    const cpModule = await import('child_process');
    exec = cpModule.exec;

    const backupModule = await import('./lib/backup.js');
    createBackup = backupModule.createBackup;
    restoreBackup = backupModule.restoreBackup;
  });

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    // Define a variável de ambiente necessária para os testes
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/testdb';
    
    // Reseta comportamentos padrão dos mocks
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue(''); // Evita erro de 'split' of undefined no log
    exec.mockImplementation((cmd, cb) => cb(null, 'stdout', ''));
  });

  describe('createBackup', () => {
    it('deve executar o pg_dump com o comando correto e comprimir a saída', async () => {
      await createBackup();

      expect(exec).toHaveBeenCalledTimes(1);
      const command = exec.mock.calls[0][0];

      // Verifica se o comando de dump do postgres está correto
      expect(command).toContain('pg_dump "postgresql://user:pass@host:5432/testdb"');
      // Verifica se a saída está sendo comprimida com gzip
      expect(command).toContain('| gzip >');
      // Verifica se o arquivo de saída tem a extensão correta
      expect(command).toContain('.sql.gz');
    });

    it('deve criar o diretório de backup se ele não existir', async () => {
      // Simula que o diretório não existe na primeira verificação
      fs.existsSync.mockReturnValueOnce(false);
      await createBackup();
      // Verifica se mkdirSync foi chamado (usando stringContaining para ser flexível com o caminho absoluto)
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
    });

    it('deve limpar backups antigos após uma criação bem-sucedida', async () => {
      const maxBackups = 10;
      // Simula uma lista de arquivos de backup que excede o limite
      const fakeBackups = Array.from({ length: maxBackups + 2 }, (_, i) => {
        // Nomes em ordem decrescente para simular arquivos mais antigos
        const day = (15 - i).toString().padStart(2, '0');
        return `caminhar-pg-backup_2026-01-${day}_02-00-00.sql.gz`;
      });
      fs.readdirSync.mockReturnValue(fakeBackups);

      await createBackup();

      // Espera que os 2 arquivos mais antigos sejam removidos
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('restoreBackup', () => {
    it('deve primeiro criar um backup de segurança e depois restaurar o arquivo principal', async () => {
      const backupFile = 'caminhar-pg-backup_2026-02-03_02-00-00.sql.gz';
      await restoreBackup(backupFile);

      expect(exec).toHaveBeenCalledTimes(2);

      // 1. Verifica o comando do backup de segurança
      const backupCommand = exec.mock.calls[0][0];
      expect(backupCommand).toContain('pg_dump');
      expect(backupCommand).toContain('pre-restore-backup');

      // 2. Verifica o comando de restauração
      const restoreCommand = exec.mock.calls[1][0];
      expect(restoreCommand).toContain('gunzip <');
      expect(restoreCommand).toContain(backupFile);
      expect(restoreCommand).toContain('| psql "postgresql://user:pass@host:5432/testdb"');
    });

    it('deve lançar um erro se o arquivo de backup não for encontrado', async () => {
      // Simula que o diretório existe (true), mas o arquivo específico não (false)
      fs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('non-existent')) return false;
        return true;
      });

      const backupFile = 'non-existent-backup.sql.gz';

      // Verifica se a promessa é rejeitada com a mensagem de erro correta
      await expect(restoreBackup(backupFile)).rejects.toThrow('Backup file not found');
    });

    it('deve lançar um erro se o comando psql falhar', async () => {
      const errorMessage = 'Falha na conexão com o banco';
      // Simula uma falha na execução do comando de restauração
      exec.mockImplementation((command, callback) => {
        if (command.includes('psql')) {
          return callback(new Error(errorMessage), '', errorMessage);
        }
        return callback(null, 'stdout', ''); // Backup de segurança funciona
      });

      const backupFile = 'caminhar-pg-backup_2026-02-03_02-00-00.sql.gz';

      await expect(restoreBackup(backupFile)).rejects.toThrow(errorMessage);
    });
  });
});