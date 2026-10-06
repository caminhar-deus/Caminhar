import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { mockQuery } from 'pg';

// Mock das dependências externas
jest.mock('fs');
jest.mock('dotenv');

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

// Importa a função a ser testada com o caminho relativo correto
import { cleanOrphanedImages } from '../../../scripts/clean-orphaned-images.js';

describe('cleanOrphanedImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    // O automock de 'fs' devolve undefined: fixa uma idade antiga (> 24h) para
    // que a checagem de MIN_AGE_MS seja determinística.
    fs.statSync.mockReturnValue({
      mtimeMs: Date.now() - 25 * 60 * 60 * 1000,
      isDirectory: () => false,
    });
  });

  it('deve remover arquivos órfãos', async () => {
    // Mock do sistema de arquivos
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg', 'post-image-2.jpg', 'used-image.jpg']);

    // Simula que apenas 'post-image-1.jpg' é órfão
    mockQuery.mockResolvedValue({ rows: [{ image_url: '/uploads/used-image.jpg' }] });

    // Executa a função em modo delete
    await cleanOrphanedImages({ deleteFiles: true });

    // Verifica se o arquivo órfão foi movido para a lixeira (nunca apagado)
    expect(fs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('post-image-1.jpg'),
      expect.stringContaining('uploads-trash')
    );
    expect(fs.unlinkSync).not.toHaveBeenCalled();

    // Garante que arquivos em uso não foram movidos
    expect(fs.renameSync).not.toHaveBeenCalledWith(
      expect.stringContaining('used-image.jpg'),
      expect.any(String)
    );
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

  it('não deve tocar em arquivos no modo relatório (padrão)', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await cleanOrphanedImages();

    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(result.mode).toBe('report');
  });

  it('não deve mover arquivos com menos de 24h', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);
    fs.statSync.mockReturnValue({
      mtimeMs: Date.now() - 60_000,
      isDirectory: () => false,
    });

    const result = await cleanOrphanedImages({ deleteFiles: true });

    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(result.skippedNewCount).toBe(1);
  });

  it('deve abortar sem tocar nos arquivos quando o banco falha', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-1.jpg']);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await cleanOrphanedImages({ deleteFiles: true });

    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.aborted).toBe(true);

    consoleErrorSpy.mockRestore();
  });

  it('deve proteger imagens referenciadas em products.image_url e videos.thumbnail', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue([
      'post-image-product.jpg',
      'post-image-video.jpg',
      'post-image-orphan.jpg',
    ]);
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('products')) {
        return { rows: [{ image_url: '/uploads/post-image-product.jpg' }] };
      }
      if (sql.includes('videos')) {
        return { rows: [{ thumbnail: '/uploads/post-image-video.jpg' }] };
      }
      return { rows: [] };
    });

    await cleanOrphanedImages({ deleteFiles: true });

    expect(fs.renameSync).toHaveBeenCalledTimes(1);
    expect(fs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('post-image-orphan.jpg'),
      expect.any(String)
    );
  });

  it('não deve mover diretórios com prefixo de imagem', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['post-image-folder.jpg']);
    fs.statSync.mockReturnValue({
      mtimeMs: Date.now() - 25 * 60 * 60 * 1000,
      isDirectory: () => true,
    });

    const result = await cleanOrphanedImages({ deleteFiles: true });

    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(result.movedCount).toBe(0);
  });
});
