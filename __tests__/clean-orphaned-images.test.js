import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock das dependências externas
jest.mock('fs');
jest.mock('dotenv');

// Importa a função a ser testada
import { cleanOrphanedImages } from '../lib/clean-orphaned-images.js';

describe('cleanOrphanedImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve remover arquivos órfãos', async () => {
    // Mock do Pool do PostgreSQL
    const mockQuery = jest.fn();
    Pool.mockImplementation(() => ({
      query: mockQuery,
      end: jest.fn(),
    }));

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

    await cleanOrphanedImages();

    expect(fs.readdirSync).not.toHaveBeenCalled();
    expect(Pool).not.toHaveBeenCalled();
  });

  it('deve lidar com erros de banco de dados', async () => {
    const mockQuery = jest.fn();
    Pool.mockImplementation(() => ({
      query: mockQuery,
      end: jest.fn(),
    }));

    mockQuery.mockRejectedValue(new Error('Database error'));
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    // Garante que a função não lança erro
    await expect(cleanOrphanedImages()).resolves.not.toThrow();
  });

  it('deve continuar se uma coluna não existir em uma tabela', async () => {
    const mockQuery = jest.fn();
    Pool.mockImplementation(() => ({
      query: mockQuery,
      end: jest.fn(),
    }));

    // Simula um erro de coluna inexistente
    mockQuery.mockRejectedValueOnce({ code: '42703' });
    mockQuery.mockResolvedValue({ rows: [] }); //mock segunda chamada
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    // Garante que a função não lança erro
    await expect(cleanOrphanedImages()).resolves.not.toThrow();
  });

  it('não deve deletar arquivos que não começam com post-image ou hero-image', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['not-a-test-image.jpg']);
    await cleanOrphanedImages();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});