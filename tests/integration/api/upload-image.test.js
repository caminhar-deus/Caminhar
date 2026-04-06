import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock do Formidable para simular o processamento do upload
jest.mock('formidable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock do File System para simular a movimentação do arquivo
jest.mock('fs', () => ({
  promises: {
    rename: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Mock do middleware de autenticação externo
jest.mock('../../../lib/middleware.js', () => ({
  externalAuthMiddleware: (fn) => (req, res) => fn(req, res),
}));

// Mock do Banco de Dados
jest.mock('../../../lib/db.js', () => ({
  updateSetting: jest.fn(),
}));

import handler from '../../../pages/api/upload-image.js';
import formidable from 'formidable';
import fs from 'fs';
import { updateSetting } from '../../../lib/db.js';

describe('API de Upload de Imagem (/api/upload-image)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.promises.rename.mockResolvedValue(undefined);
    fs.promises.unlink.mockResolvedValue(undefined);
  });

  test('POST deve processar upload de imagem corretamente', async () => {
    // Arquivo simulado que o formidable "processou"
    const mockFile = {
      originalFilename: 'test-image.jpg',
      filepath: '/tmp/test-image.jpg',
      newFilename: 'new-test-image.jpg',
      mimetype: 'image/jpeg',
      size: 1024
    };

    // Configura o mock do formidable
    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        // Simula sucesso no parse: (err, fields, files)
        // Formidable v3 retorna arrays para arquivos
        cb(null, { type: 'post' }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      // Propriedades opcionais que podem ser acessadas
      on: jest.fn(),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data;',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('path');
    expect(data.path).toContain('/uploads/');
    expect(data.path).toContain('.jpg');

    expect(fs.promises.rename).toHaveBeenCalled();
  });

  test('Deve retornar 400 se nenhum arquivo for enviado', async () => {
    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, {}, {}); // Sem arquivos
      }),
    }));

    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe('No image uploaded');
  });

  test('Deve retornar 400 se o arquivo não for uma imagem (validação de mimetype)', async () => {
    const mockFile = {
      originalFilename: 'documento.pdf',
      filepath: '/tmp/documento.pdf',
      newFilename: 'documento.pdf',
      mimetype: 'application/pdf',
      size: 1024
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { type: 'post' }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      on: jest.fn(),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data;',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe('Formato de arquivo inválido');
  });

  test('Deve retornar 400 se o arquivo for maior que 5MB', async () => {
    const mockFile = {
      originalFilename: 'large-image.jpg',
      filepath: '/tmp/large-image.jpg',
      newFilename: 'large-image.jpg',
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024 // 6MB
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { type: 'post' }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      on: jest.fn(),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data;',
      },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain('tamanho máximo 5MB');
  });

  test('Deve salvar o arquivo no diretório correto com o nome gerado corretamente', async () => {
    // Mock do Date.now para garantir um timestamp previsível no nome do arquivo
    const mockDate = 1672531200000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(mockDate);

    const mockFile = {
      originalFilename: 'teste-nome.png',
      filepath: '/tmp/teste-nome.png',
      newFilename: 'teste-nome.png',
      mimetype: 'image/png',
      size: 1024
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        // type: 'post' define o prefixo como 'post-image-'
        cb(null, { type: 'post' }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      on: jest.fn(),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data;' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // O nome esperado deve ser post-image-{timestamp}.png
    const expectedFilename = `post-image-${mockDate}.png`;

    // Verifica se o rename foi chamado movendo do temp para o destino final correto
    // Verifica se contém o diretório correto (public/uploads) e o nome do arquivo esperado
    expect(fs.promises.rename).toHaveBeenCalledWith(
      mockFile.filepath,
      expect.stringContaining('public/uploads')
    );
    
    expect(fs.promises.rename).toHaveBeenCalledWith(
      mockFile.filepath,
      expect.stringContaining(expectedFilename)
    );

    dateSpy.mockRestore();
  });

  test('Deve chamar updateSetting no banco de dados se for upload do hero-image', async () => {
    const mockFile = {
      originalFilename: 'db-test.jpg',
      filepath: '/tmp/db-test.jpg',
      newFilename: 'db-test.jpg',
      mimetype: 'image/jpeg',
      size: 1024
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { uploadType: 'setting_home_image' }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      on: jest.fn(),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data;' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    expect(updateSetting).toHaveBeenCalledTimes(1);
    expect(updateSetting).toHaveBeenCalledWith(
      'home_image_url', 
      expect.stringContaining('/uploads/hero-image-'), 
      'image', 
      'Imagem principal da home'
    );
  });

  test('Deve retornar 500 se o parse falhar', async () => {
    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(new Error('Erro de parsing'));
      }),
    }));

    const { req, res } = createMocks({ method: 'POST' });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    consoleSpy.mockRestore();
  });
  
  test('Deve retornar 405 se método não for POST', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
