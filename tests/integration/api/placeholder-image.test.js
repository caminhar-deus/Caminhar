import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  }
}));

jest.mock('../../../lib/domain/settings.js', () => ({
  getSetting: jest.fn(),
}));

jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

jest.mock('../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

const MOCK_STATS = { mtime: new Date('2026-01-01T00:00:00.000Z'), mtimeMs: 1767225600000 };

describe('API - Placeholder Image (/api/placeholder-image)', () => {
  let handler;
  let fsPromises;
  let getSetting;
  let logger;

  // Recarrega o módulo em cada teste para isolar o cache interno do filename
  // (evita contaminação de estado entre cenários).
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    handler = require('../../../pages/api/placeholder-image.js').default;
    fsPromises = require('fs').promises;
    getSetting = require('../../../lib/domain/settings.js').getSetting;
    logger = require('../../../lib/infra/logger.js').logger;
  });

  it('deve retornar a imagem configurada no banco de dados', async () => {
    getSetting.mockResolvedValueOnce('/uploads/hero-image-123.jpg');
    fsPromises.stat.mockResolvedValueOnce(MOCK_STATS);
    fsPromises.readFile.mockResolvedValueOnce(Buffer.from('image-data'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/jpeg');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=86400, immutable');
    expect(res.getHeader('Last-Modified')).toBe(MOCK_STATS.mtime.toUTCString());
    expect(res._getData()).toEqual(Buffer.from('image-data'));
  });

  it('deve responder 304 quando o navegador já possui a versão (If-None-Match)', async () => {
    getSetting.mockResolvedValueOnce('/uploads/hero-image-123.jpg');
    fsPromises.stat.mockResolvedValueOnce(MOCK_STATS);

    const { req, res } = createMocks({ headers: { 'if-none-match': '"hero-image-123.jpg"' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(304);
    expect(fsPromises.readFile).not.toHaveBeenCalled();
  });

  it('deve ignorar erro no banco e tentar ler o diretório (fallback 1)', async () => {
    getSetting.mockRejectedValueOnce(new Error('DB falhou'));
    fsPromises.readdir.mockResolvedValueOnce(['hero-image-1.png', 'hero-image-2.webp']);
    fsPromises.stat.mockResolvedValueOnce(MOCK_STATS);
    fsPromises.readFile.mockResolvedValueOnce(Buffer.from('webp-data'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith('Placeholder', 'Não foi possível ler a configuração do banco:', expect.any(String));
    expect(res.getHeader('Content-Type')).toBe('image/webp');
  });

  it('deve retornar o SVG padrão se não houver configuração nem arquivo na pasta (fallback 2)', async () => {
    getSetting.mockResolvedValueOnce(null);
    fsPromises.readdir.mockRejectedValueOnce(new Error('Dir não existe'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/svg+xml');
    expect(res._getData()).toContain('<svg');
  });
});