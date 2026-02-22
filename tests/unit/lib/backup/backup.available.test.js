import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock completo do 'fs' para isolar o teste
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock do 'child_process' pois é uma dependência de 'backup.js'
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { getAvailableBackups } from '../../../../scripts/backup.js';
import fs from 'fs';

describe('getAvailableBackups', () => {
  const BACKUP_PREFIX = 'caminhar-pg-backup';

  beforeEach(() => {
    jest.clearAllMocks();
    // Comportamento padrão: o diretório de backup existe
    fs.existsSync.mockReturnValue(true);
  });

  it('deve listar, formatar e ordenar corretamente os arquivos de backup', async () => {
    const fakeFiles = [
      `${BACKUP_PREFIX}_2026-01-10_12-00-00.sql.gz`, // Antigo
      'arquivo-qualquer.txt',
      `${BACKUP_PREFIX}_2026-01-12_12-00-00.sql.gz`, // Mais novo
      `${BACKUP_PREFIX}_2026-01-11_12-00-00.sql.gz`, // Intermediário
    ];
    const fakeSize = 54321;

    fs.readdirSync.mockReturnValue(fakeFiles);
    fs.statSync.mockReturnValue({ size: fakeSize });

    const backups = await getAvailableBackups();

    // Deve ter filtrado o 'arquivo-qualquer.txt'
    expect(backups).toHaveLength(3);

    // Deve estar ordenado do mais novo para o mais antigo
    expect(backups[0].filename).toContain('2026-01-12');
    expect(backups[1].filename).toContain('2026-01-11');
    expect(backups[2].filename).toContain('2026-01-10');

    // Deve ter o formato correto
    expect(backups[0]).toEqual({
      filename: `${BACKUP_PREFIX}_2026-01-12_12-00-00.sql.gz`,
      timestamp: '2026-01-12 12-00-00',
      size: fakeSize,
      compressed: true,
    });

    // Deve ter verificado o status de cada arquivo de backup válido
    expect(fs.statSync).toHaveBeenCalledTimes(3);
  });

  it('deve retornar um array vazio se não houver arquivos de backup no diretório', async () => {
    fs.readdirSync.mockReturnValue(['log.txt', 'temp.file']);
    const backups = await getAvailableBackups();
    expect(backups).toEqual([]);
  });

  it('deve criar o diretório de backup se ele não existir e retornar um array vazio', async () => {
    fs.existsSync.mockReturnValue(false); // Simula que o diretório não existe
    fs.readdirSync.mockReturnValue([]); // O diretório recém-criado estará vazio
    const backups = await getAvailableBackups();
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(backups).toEqual([]);
  });
});