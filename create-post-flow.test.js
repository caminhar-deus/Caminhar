import { createMocks } from 'node-mocks-http';
import uploadHandler from '../../pages/api/upload-image';
import postsHandler from '../../pages/api/admin/posts';
import formidable from 'formidable';
import fs from 'fs';
import { open } from 'sqlite';
import { saveImage } from '../../lib/db';

// --- Mocks das Dependências ---

// Mock do Formidable (Upload)
jest.mock('formidable');

// Mock do File System (Upload)
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(),
    rename: jest.fn().mockResolvedValue(),
    unlink: jest.fn().mockResolvedValue(),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock do SQLite (Banco de Dados)
jest.mock('sqlite', () => ({
  open: jest.fn(),
}));
jest.mock('sqlite3', () => ({
  Database: jest.fn(),
}));

// Mock do lib/db (usado pelo upload-image para salvar metadados)
jest.mock('../../lib/db', () => ({
  saveImage: jest.fn().mockResolvedValue(true),
}));

// Mock da Autenticação (Bypass)
jest.mock('../../lib/auth', () => ({
  withAuth: (fn) => (req, res) => {
    req.user = { userId: 1, username: 'admin' };
    return fn(req, res);
  },
}));

describe('Integração: Fluxo de Criação de Post com Imagem', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuração do mock do banco de dados para os posts
    mockDb = {
      run: jest.fn(),
      get: jest.fn(),
      close: jest.fn(),
    };
    open.mockResolvedValue(mockDb);
  });

  test('Deve fazer upload de imagem e criar post com a URL retornada', async () => {
    // =================================================================
    // PASSO 1: Simular Upload da Imagem
    // =================================================================
    
    const mockFile = {
      originalFilename: 'fluxo-teste.jpg',
      filepath: '/tmp/fluxo-teste.jpg',
      newFilename: 'fluxo-teste.jpg',
      mimetype: 'image/jpeg',
      size: 1024
    };

    formidable.IncomingForm.mockImplementation(() => ({
      parse: jest.fn((req, cb) => {
        cb(null, { type: ['post'] }, { image: [mockFile] });
      }),
      uploadDir: '/tmp',
      keepExtensions: true,
      on: jest.fn(),
    }));

    const { req: uploadReq, res: uploadRes } = createMocks({
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data;' },
    });

    await uploadHandler(uploadReq, uploadRes);

    expect(uploadRes._getStatusCode()).toBe(200);
    const uploadData = JSON.parse(uploadRes._getData());
    const imageUrl = uploadData.path;

    expect(imageUrl).toBeDefined();
    expect(imageUrl).toContain('/uploads/');

    // =================================================================
    // PASSO 2: Criar Post usando a URL da Imagem
    // =================================================================

    const postData = {
      title: 'Post de Integração',
      slug: 'post-integracao',
      excerpt: 'Testando fluxo completo',
      content: 'Conteúdo do post com imagem.',
      image_url: imageUrl, // Usa a URL obtida no passo anterior
      published: true
    };

    const { req: postReq, res: postRes } = createMocks({
      method: 'POST',
      body: postData,
    });

    // Mock do retorno do banco após inserção
    mockDb.run.mockResolvedValue({ lastID: 123 });
    mockDb.get.mockResolvedValue({ id: 123, ...postData });

    await postsHandler(postReq, postRes);

    expect(postRes._getStatusCode()).toBe(201);
    const createdPost = JSON.parse(postRes._getData());

    // Verificações finais
    expect(createdPost.title).toBe(postData.title);
    expect(createdPost.image_url).toBe(imageUrl); // Confirma que a URL persistiu

    // Verifica se o comando SQL de inserção recebeu a URL correta
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO posts'),
      expect.arrayContaining([
        postData.title,
        postData.slug,
        imageUrl, // A URL da imagem deve estar nos parâmetros
        1 // published true -> 1
      ])
    );
  });
});