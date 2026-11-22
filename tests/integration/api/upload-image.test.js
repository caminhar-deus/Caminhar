import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import path from 'path';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock do sharp para validação de metadados
jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' })
  });
});

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

// Mock do DB e auditoria
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());
jest.mock('../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn().mockResolvedValue(true),
}));

// Mock do middleware de autenticação
jest.mock('../../../lib/auth/auth.js', () => ({
  withAuth: (handler) => handler,
}));

// Mock do domínio de settings
jest.mock('../../../lib/domain/settings.js', () => ({
  updateSetting: jest.fn(),
}));

import handler from '../../../pages/api/upload-image.js';
import formidable from 'formidable';
import fs from 'fs';
import { query } from '../../../lib/infra/db.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { updateSetting } from '../../../lib/domain/settings.js';

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
    expect(JSON.parse(res._getData()).message).toBe('Nenhuma imagem enviada');
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

  test('Deve retornar 413 se o arquivo for maior que 5MB (checagem manual pós-parse)', async () => {
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
    expect(res._getStatusCode()).toBe(413);
    expect(JSON.parse(res._getData()).message).toContain('tamanho máximo 5MB');
  });

  test('Deve retornar 413 quando o formidable aborta o parse por exceder maxFileSize', async () => {
    // Caminho do `catch`: o `maxFileSize` interrompe o stream e o parse rejeita.
    // O módulo `formidable` está mockado, então o erro é montado à mão com os
    // mesmos `code`/`httpCode` da classe real (verdadeiro erro de tamanho, não
    // um erro genérico — este continua respondendo 500).
    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(Object.assign(new Error('options.maxFileSize exceeded'), { code: 1016, httpCode: 413 }));
      }),
    }));

    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(413);
    expect(JSON.parse(res._getData()).message).toContain('tamanho máximo 5MB');
  });

  test('Deve salvar o arquivo no diretório correto com o nome gerado corretamente', async () => {
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

    // Verifica se o rename foi chamado movendo do temp para o destino final correto
    // O nome do arquivo usa crypto.randomUUID(), então verificamos apenas o padrão.
    // Destino agora é o diretório de uploads FORA de `public/` (snapshot do
    // `next start` impedia servir arquivo gravado em runtime em `public/`).
    expect(fs.promises.rename).toHaveBeenCalledWith(
      mockFile.filepath,
      expect.stringContaining(path.join(process.cwd(), 'uploads'))
    );
    
    expect(fs.promises.rename).toHaveBeenCalledWith(
      mockFile.filepath,
      expect.stringMatching(/post-image-[a-f0-9-]+\.png$/)
    );
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

  test('Deve retornar 403 se usuário não tiver nenhuma permissão de upload', async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Visão Geral'] }] });

    const { req, res } = createMocks({
      method: 'POST',
      socket: { remoteAddress: '203.0.113.21' },
    });
    req.user = { userId: 2, username: 'viewer', role: 'viewer' };

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(formidable).not.toHaveBeenCalled();
  });

  test('Deve retornar 403 e limpar arquivo temporário se tentar uploadType=setting_home_image sem permissão Configuração de Cabeçalho', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ permissions: ['Posts/Artigos'] }] })
      .mockResolvedValueOnce({ rows: [{ permissions: ['Posts/Artigos'] }] });

    const mockFile = {
      originalFilename: 'hero.jpg',
      filepath: '/tmp/hero.jpg',
      newFilename: 'hero.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { uploadType: 'setting_home_image' }, { image: [mockFile] });
      }),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      socket: { remoteAddress: '203.0.113.22' },
    });
    req.user = { userId: 3, username: 'editor_posts', role: 'editor' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(fs.promises.unlink).toHaveBeenCalledWith('/tmp/hero.jpg');
    expect(fs.promises.rename).not.toHaveBeenCalled();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  test('Deve permitir setting_home_image e registrar logActivity para usuário com permissão Configuração de Cabeçalho', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ permissions: ['Configuração de Cabeçalho'] }] })
      .mockResolvedValueOnce({ rows: [{ permissions: ['Configuração de Cabeçalho'] }] });

    const mockFile = {
      originalFilename: 'hero.jpg',
      filepath: '/tmp/hero.jpg',
      newFilename: 'hero.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { uploadType: 'setting_home_image' }, { image: [mockFile] });
      }),
    }));

    const { req, res } = createMocks({
      method: 'POST',
      socket: { remoteAddress: '203.0.113.23' },
    });
    req.user = { userId: 4, username: 'designer', role: 'designer' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(updateSetting).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith(
      'designer',
      'ATUALIZAR IMAGEM CABEÇALHO',
      'UPLOAD',
      null,
      expect.stringContaining('Upload de imagem: hero-image-'),
      '203.0.113.23'
    );
  });

  test('Deve retornar 429 ao exceder o rate limit do upload', async () => {
    const mockFile = {
      originalFilename: 'rl.jpg',
      filepath: '/tmp/rl.jpg',
      newFilename: 'rl.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };

    formidable.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { uploadType: 'post' }, { image: [mockFile] });
      }),
    }));

    const clientIp = '203.0.113.29';
    for (let i = 0; i < 30; i++) {
      const { req, res } = createMocks({ method: 'POST', socket: { remoteAddress: clientIp } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    const { req, res } = createMocks({ method: 'POST', socket: { remoteAddress: clientIp } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
  });
});
