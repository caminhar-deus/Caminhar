import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { logger } from '../../../lib/infra/logger.js';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
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

import handler from '../../../pages/api/placeholder-image.js';
import fs from 'fs';
import { getSetting } from '../../../lib/domain/settings.js';

describe('API - Placeholder Image (/api/placeholder-image)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve retornar a imagem configurada no banco de dados', async () => {
    getSetting.mockResolvedValueOnce('/uploads/hero-image-123.jpg');
    fs.promises.readFile.mockResolvedValueOnce(Buffer.from('image-data'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/jpeg');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=86400, immutable');
    expect(res._getData()).toEqual(Buffer.from('image-data'));
  });

  it('deve ignorar erro no banco e tentar ler o diretório (fallback 1)', async () => {
    getSetting.mockRejectedValueOnce(new Error('DB falhou'));
    fs.promises.readdir.mockResolvedValueOnce(['hero-image-1.png', 'hero-image-2.webp']);
    fs.promises.readFile.mockResolvedValueOnce(Buffer.from('webp-data'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith('Placeholder', 'Não foi possível ler a configuração do banco:', expect.any(String));
    expect(res.getHeader('Content-Type')).toBe('image/webp');
  });

  it('deve retornar o SVG padrão se não houver configuração nem arquivo na pasta (fallback 2)', async () => {
    getSetting.mockResolvedValueOnce(null);
    fs.promises.readdir.mockRejectedValueOnce(new Error('Dir não existe'));
    
    const { req, res } = createMocks();
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/svg+xml');
    expect(res._getData()).toContain('<svg');
  });
});