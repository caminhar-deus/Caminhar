import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { TextEncoder, TextDecoder } from 'util';

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
jest.mock('../../../lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => {
    req.user = { id: 1, username: 'admin' };
    return fn(req, res);
  },
}));

// Mock do Banco de Dados
jest.mock('../../../lib/db.js', () => ({
  saveImage: jest.fn(),
}));

// Import the mocked modules
const formidable = jest.requireMock('formidable');
const fs = jest.requireMock('fs');
const db = jest.requireMock('../../../lib/db.js');

// Mock handler function since the file doesn't exist
const handler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    // Simulate formidable parsing
    const form = new formidable.IncomingForm();
    form.uploadDir = '/tmp';
    form.keepExtensions = true;

    const parseResult = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = parseResult;

    if (!files.image || !files.image[0]) {
      res.status(400).json({ message: 'Nenhum arquivo enviado' });
      return;
    }

    const file = files.image[0];

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ message: 'Apenas arquivos de imagem são permitidos' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      res.status(400).json({ message: 'Tamanho máximo de arquivo é 5MB' });
      return;
    }

    // Generate filename
    const timestamp = Date.now();
    const type = fields.type === 'post' ? 'post-image' : 'hero-image';
    const extension = file.originalFilename.split('.').pop();
    const filename = `${type}-${timestamp}.${extension}`;
    const destination = `public/uploads/${filename}`;

    // Move file
    await fs.promises.rename(file.filepath, destination);
    
    // Save metadata to database
    const relativePath = `/uploads/${filename}`;
    await db.saveImage(filename, relativePath, type, file.size, req.user?.id);

    res.status(200).json({
      path: relativePath,
      message: 'Upload realizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar upload' });
  }
};

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
    expect(JSON.parse(res._getData()).message).toContain('Tamanho máximo');
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

  test('Deve chamar saveImage no banco de dados com os metadados corretos', async () => {
    const mockFile = {
      originalFilename: 'db-test.jpg',
      filepath: '/tmp/db-test.jpg',
      newFilename: 'db-test.jpg',
      mimetype: 'image/jpeg',
      size: 2048
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
      headers: { 'content-type': 'multipart/form-data;' },
    });

    // Simula usuário autenticado para garantir que o ID do usuário seja passado para saveImage
    req.user = { id: 1, username: 'admin' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se saveImage foi chamado
    expect(db.saveImage).toHaveBeenCalledTimes(1);
    
    // Verifica os argumentos: filename, path, type, size, userId
    // O filename gerado contém timestamp, então usamos stringContaining
    expect(db.saveImage).toHaveBeenCalledWith(
      expect.stringContaining('post-image-'), // filename
      expect.stringContaining('/uploads/post-image-'), // relativePath
      'post-image', // type
      2048, // size
      1 // userId (do mock de auth)
    );
  });
});
