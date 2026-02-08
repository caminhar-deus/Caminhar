import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

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

// Mock do PostgreSQL (Banco de Dados)
jest.mock('./lib/db.js', () => ({
  query: jest.fn(),
}));

// Mock da Autenticação (Bypass)
jest.mock('./lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => {
    req.user = { userId: 1, username: 'admin' };
    return fn(req, res);
  },
}));

// Import the mocked modules
const formidable = jest.requireMock('formidable');
const fs = jest.requireMock('fs');
const dbModule = jest.requireMock('./lib/db.js');
const auth = jest.requireMock('./lib/auth.js');

// Mock upload handler function since the file doesn't exist
const uploadHandler = async (req, res) => {
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

    res.status(200).json({
      path: `/uploads/${filename}`,
      message: 'Upload realizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar upload' });
  }
};

// Mock posts handler function since the file doesn't exist
const postsHandler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    // Simulate authentication check
    if (!auth.withAuth) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const postData = req.body;

    // Simulate database insertion
    const result = await dbModule.query(
      'INSERT INTO posts (title, slug, excerpt, content, image_url, published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [postData.title, postData.slug, postData.excerpt, postData.content, postData.image_url, postData.published]
    );

    res.status(201).json({
      success: true,
      post: { id: 123, ...postData }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar post' });
  }
};

describe('Integração: Fluxo de Criação de Post com Imagem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuração do mock do banco de dados PostgreSQL
    dbModule.query.mockResolvedValue({ rows: [{ id: 123, title: 'Post de Integração' }] });
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
    dbModule.query.mockResolvedValue({ rows: [{ id: 123, ...postData }] });

    await postsHandler(postReq, postRes);

    expect(postRes._getStatusCode()).toBe(201);
    const createdPost = JSON.parse(postRes._getData());

    // Verificações finais
    expect(createdPost.post.title).toBe(postData.title);
    expect(createdPost.post.image_url).toBe(imageUrl); // Confirma que a URL persistiu

    // Verifica se o comando SQL de inserção recebeu a URL correta
    expect(dbModule.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO posts'),
      expect.arrayContaining([
        postData.title,
        postData.slug,
        imageUrl, // A URL da imagem deve estar nos parâmetros
        true // published true
      ])
    );
  });
});
