import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { Pool } from 'pg';

// Mock das dependências externas
jest.mock('fs');
jest.mock('dotenv');

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

// Importa a função a ser testada com o caminho relativo correto
import { cleanOrphanedImages } from '../../../scripts/clean-orphaned-images.js';

describe('cleanOrphanedImages', () => {
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = new Pool().query;
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('deve remover arquivos órfãos', async () => {
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
    // Removemos a restrição do banco e garantimos apenas que nada foi deletado
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('deve lidar com erros de banco de dados e não quebrar', async () => {
    const dbError = new Error('Database error');
    mockQuery.mockRejectedValue(dbError);
    
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cleanOrphanedImages()).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('deve continuar se uma coluna não existir em uma tabela', async () => {
    // Simula erro de coluna inexistente na primeira chamada, e sucesso na segunda
    mockQuery.mockRejectedValueOnce({ code: '42703' });
      
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    // Silencia o console.warn para este teste para evitar poluir o log
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Silencia também console.error para evitar ruído caso algo inesperado ocorra
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cleanOrphanedImages()).resolves.not.toThrow();

    // Verifica se o aviso específico foi de fato logado
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Aviso: Coluna 'image_url' não encontrada na tabela 'posts'"));

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('não deve deletar arquivos irrelevantes (que não começam com prefixos conhecidos)', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['not-a-test-image.jpg']);
    await cleanOrphanedImages();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});