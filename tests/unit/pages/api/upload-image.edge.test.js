import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import handler from '../../../../pages/api/upload-image.js';
import fs from 'fs';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn((p) => {
      if (p && String(p).includes('uploads')) return false;
      return actualFs.existsSync(p);
    }),
    mkdirSync: jest.fn(),
    promises: {
      ...actualFs.promises,
      rename: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined)
    }
  };
});

jest.mock('formidable', () => {
  return {
    __esModule: true,
    default: () => ({
      parse: (req, cb) => cb(null, { uploadType: 'post_image' }, { image: [{ mimetype: 'image/jpeg', size: 1000, filepath: '/tmp/file', newFilename: 'test.jpg' }] })
    })
  };
});

jest.mock('../../../../lib/db.js', () => ({
  updateSetting: jest.fn()
}));

jest.mock('../../../../lib/middleware.js', () => ({
  externalAuthMiddleware: (handler) => handler
}));

describe('API - Upload Image (Edge Cases)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve criar o diretório de upload se ele não existir (linhas 22-23)', async () => {
    const req = { method: 'POST' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Garante que qualquer erro interno fará o teste falhar exibindo a mensagem e stack trace reais
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation((msg, err) => {
      if (err) throw err;
      throw new Error(msg);
    });

    await handler(req, res);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
    expect(res.status).toHaveBeenCalledWith(200);

    consoleSpy.mockRestore();
  });
});