import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
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

jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
  });
});

jest.mock('formidable', () => {
  return {
    __esModule: true,
    default: () => ({
      parse: (req, cb) => cb(null, { uploadType: 'post_image' }, { image: [{ mimetype: 'image/jpeg', size: 1000, filepath: '/tmp/file', newFilename: 'test.jpg' }] })
    })
  };
});

jest.mock('../../../../lib/domain/settings.js', () => ({
  updateSetting: jest.fn()
}));

jest.mock('../../../../lib/auth.js', () => ({
  withAuth: (handler) => handler
}));

describe('API - Upload Image (Edge Cases)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve criar o diretório de upload se ele não existir (linhas 22-23)', async () => {
    const { req, res } = createMocks({ method: 'POST' });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation((msg, err) => {
      if (err) throw err;
      throw new Error(msg);
    });

    await handler(req, res);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
    expect(res._getStatusCode()).toBe(200);

    consoleSpy.mockRestore();
  });
});
