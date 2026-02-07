import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import fs from 'fs';
import { TextEncoder, TextDecoder } from 'util';
import formidable from 'formidable';
import handler from './pages/api/upload-image.js';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock do Formidable para simular o processamento do upload
jest.mock('formidable');

// Mock do File System para simular a movimentação do arquivo
jest.mock('fs', () => ({
  promises: {
    rename: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock da Autenticação
jest.mock('./lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => {
    req.user = { username: 'admin' };
    return fn(req, res);
  },
}));

describe('API de Upload de Imagem (/api/upload-image)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    formidable.IncomingForm.mockImplementation(() => ({
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
    
    // Verifica se retornou o caminho da imagem
    expect(data).toHaveProperty('path');
    expect(data.path).toContain('/uploads/');
    expect(data.path).toContain('.jpg');

    // Verifica se o arquivo foi movido do temp para o destino final
    expect(fs.promises.rename).toHaveBeenCalled();
  });

  test('Deve retornar 400 se nenhum arquivo for enviado', async () => {
    formidable.IncomingForm.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, {}, {}); // Sem arquivos
      }),
    }));

    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  test('Deve retornar 400 se o arquivo não for uma imagem (validação de mimetype)', async () => {
    const mockFile = {
      originalFilename: 'documento.pdf',
      filepath: '/tmp/documento.pdf',
      newFilename: 'documento.pdf',
      mimetype: 'application/pdf',
      size: 1024
    };

    formidable.IncomingForm.mockImplementation(() => ({
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
  });

  test('Deve retornar 400 se o arquivo for maior que 5MB', async () => {
    const mockFile = {
      originalFilename: 'large-image.jpg',
      filepath: '/tmp/large-image.jpg',
      newFilename: 'large-image.jpg',
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024 // 6MB
    };

    formidable.IncomingForm.mockImplementation(() => ({
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
    expect(JSON.parse(res._getData()).message).toContain('tamanho máximo');
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

    formidable.IncomingForm.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        // type: 'post' define o prefixo como 'post-image-'
        cb(null, { type: ['post'] }, { image: [mockFile] });
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
});
