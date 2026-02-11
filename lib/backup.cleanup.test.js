import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo 'fs' para evitar operações reais no disco
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock do child_process (importado pelo backup.js, embora não usado nesta função específica)
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { cleanupOldBackups } from './backup.js';
import fs from 'fs';

describe('cleanupOldBackups (Rotação de Backups)', () => {
  const BACKUP_PREFIX = 'caminhar-pg-backup';

  beforeEach(() => {
    jest.clearAllMocks();
    // Configuração padrão dos mocks para evitar erros de log
    fs.readFileSync.mockReturnValue('');
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 });
  });

  it('deve remover backups antigos excedendo o limite de 10', async () => {
    // Gera 12 nomes de arquivos com datas sequenciais
    const files = [];
    for (let i = 1; i <= 12; i++) {
      // Dias 01 a 12. O dia 12 é o mais recente (2026-01-12).
      const day = i.toString().padStart(2, '0');
      files.push(`${BACKUP_PREFIX}_2026-01-${day}_12-00-00.sql.gz`);
    }

    // Mock do readdirSync para retornar a lista de arquivos simulada
    fs.readdirSync.mockReturnValue(files);

    await cleanupOldBackups();

    // A lógica deve ordenar por data (mais recente primeiro) e manter os top 10.
    // Arquivos mantidos: dias 12, 11, 10, 09, 08, 07, 06, 05, 04, 03.
    // Arquivos a remover: dias 02 e 01 (os mais antigos).
    
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    
    // Verifica se os arquivos removidos são os esperados (01 e 02)
    // Usamos stringContaining porque o caminho completo inclui diretórios
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(`2026-01-01`));
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining(`2026-01-02`));
    
    // Garante que o arquivo mais recente NÃO foi removido
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(expect.stringContaining(`2026-01-12`));
  });

  it('não deve remover nada se houver 10 ou menos backups', async () => {
    const files = [];
    for (let i = 1; i <= 10; i++) {
      const day = i.toString().padStart(2, '0');
      files.push(`${BACKUP_PREFIX}_2026-01-${day}_12-00-00.sql.gz`);
    }

    fs.readdirSync.mockReturnValue(files);

    await cleanupOldBackups();

    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('deve ignorar arquivos que não correspondem ao padrão de nome de backup', async () => {
    const files = [
      `${BACKUP_PREFIX}_2026-01-01_12-00-00.sql.gz`, // Válido
      'arquivo-aleatorio.txt', // Inválido
      'outro-backup.sql', // Inválido
    ];

    fs.readdirSync.mockReturnValue(files);

    await cleanupOldBackups();

    // Apenas 1 arquivo válido encontrado, limite não excedido -> nenhuma remoção
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});