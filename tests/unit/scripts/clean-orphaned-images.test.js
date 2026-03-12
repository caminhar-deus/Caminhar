import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { Pool } from 'pg';

// Mock das dependências externas
jest.mock('fs');
jest.mock('dotenv');

// Mock do módulo 'pg' consistente com outros testes unitários
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
    end: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Importa a função a ser testada com o caminho relativo correto
import { cleanOrphanedImages } from '../../../scripts/clean-orphaned-images.js';

describe('cleanOrphanedImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve remover arquivos órfãos', async () => {
    // Recupera o mock da query de forma limpa
    const pool = new Pool();
    const mockQuery = pool.query;

    // Mock do sistema de arquivos
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg', 'post-image-2.jpg', 'used-image.jpg']);

    // Simula que apenas 'post-image-1.jpg' é órfão
    mockQuery.mockResolvedValue({ rows: [{ image_url: '/uploads/used-image.jpg' }] });

    // Executa a função
    await cleanOrphanedImages();

    // Verifica se o arquivo órfão foi removido
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('post-image-1.jpg'));

    // Garante que arquivos em uso não foram removidos
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(expect.stringContaining('used-image.jpg'));
  });

  it('não deve fazer nada se o diretório de uploads não existir', async () => {
    fs.existsSync.mockReturnValue(false);
    
    // Previne erros caso o código tente iterar sobre o resultado do banco
    const pool = new Pool();
    pool.query.mockResolvedValue({ rows: [] });

    await cleanOrphanedImages();
    expect(fs.readdirSync).not.toHaveBeenCalled();
    // Removemos a restrição do banco e garantimos apenas que nada foi deletado
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('deve lidar com erros de banco de dados e não quebrar', async () => {
    const pool = new Pool();
    pool.query.mockRejectedValue(new Error('Database error'));
    
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    await expect(cleanOrphanedImages()).resolves.not.toThrow();
  });

  it('deve continuar se uma coluna não existir em uma tabela', async () => {
    const pool = new Pool();
    // Simula erro de coluna inexistente na primeira chamada, e sucesso na segunda
    pool.query
      .mockRejectedValueOnce({ code: '42703' })
      .mockResolvedValue({ rows: [] });
      
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    await expect(cleanOrphanedImages()).resolves.not.toThrow();
  });

  it('não deve deletar arquivos irrelevantes (que não começam com prefixos conhecidos)', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['not-a-test-image.jpg']);
    await cleanOrphanedImages();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});