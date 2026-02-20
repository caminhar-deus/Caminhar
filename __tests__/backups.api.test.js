import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do JWT para controlar a verificação do token
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Mock da lógica de backup para não executar comandos reais.
// Assumimos que existe uma função `listBackups` que o endpoint utiliza.
jest.mock('../lib/backup.js', () => ({ //
  listBackups: jest.fn().mockResolvedValue([{ file: 'backup-teste.sql.gz', size: 1024 }]), //
  createBackup: jest.fn().mockResolvedValue('/path/to/new-backup.sql.gz'), //
  restoreBackup: jest.fn().mockResolvedValue(true),
}), { virtual: true });

// Simulação do middleware de autenticação `withAuth`
// Esta simulação foca em validar o header 'Authorization'
const withAuth = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  const token = authHeader.split(' ')[1];
  const jwt = jest.requireMock('jsonwebtoken');

  try {
    const decoded = jwt.verify(token, 'secret-placeholder');
    req.user = decoded; // Anexa o usuário à requisição
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Simulação do handler da API de backups, pois o arquivo não foi fornecido.
// Assumimos que ele responde a GET para listar os backups.
const backupsHandler = async (req, res) => {
  const backupLib = jest.requireMock('../lib/backup.js');
  const { url, method, body } = req;

  // Simula um roteador mais robusto que verifica o método e a URL exata
  switch (method) {
    case 'GET':
      if (url === '/api/admin/backups') {
        const backups = await backupLib.listBackups();
        return res.status(200).json({ backups });
      }
      break;
    case 'POST':
      if (url === '/api/admin/backups') {
        const backupPath = await backupLib.createBackup();
        return res.status(200).json({ message: 'Backup criado com sucesso!', path: backupPath });
      }
      if (url === '/api/admin/backups/restore') {
        const { filename } = body;
        if (!filename) {
          return res.status(400).json({ message: 'O nome do arquivo é obrigatório.' });
        }
        await backupLib.restoreBackup(filename);
        return res.status(200).json({ message: 'Backup restaurado com sucesso!' });
      }
      break;
  }

  return res.status(405).json({ message: 'Método não permitido para a rota solicitada.' });
};

// Rota da API protegida pelo middleware
const protectedBackupsApiRoute = withAuth(backupsHandler);


describe('API de Backups (/api/admin/backups)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 401 Unauthorized se o usuário não estiver autenticado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/backups',
      headers: {}, // Sem header de autorização
    });

    await protectedBackupsApiRoute(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Não autenticado' });
  });

  it('deve retornar 200 OK e a lista de backups para um usuário autenticado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/backups',
      headers: { 'Authorization': 'Bearer valid.token' },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockReturnValue({ userId: 1, username: 'admin' });

    await protectedBackupsApiRoute(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty('backups');
    expect(JSON.parse(res._getData()).backups[0].file).toBe('backup-teste.sql.gz');
  });

  it('deve retornar 200 OK e uma mensagem de sucesso ao criar um backup (POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/backups',
      headers: { 'Authorization': 'Bearer valid.token' },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockReturnValue({ userId: 1, username: 'admin' });

    const backupLib = jest.requireMock('../lib/backup.js'); //
    backupLib.createBackup.mockResolvedValue('/path/to/new-backup.sql.gz'); //

    await protectedBackupsApiRoute(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).message).toBe('Backup criado com sucesso!');
    expect(JSON.parse(res._getData()).path).toBe('/path/to/new-backup.sql.gz');
  });

  it('deve retornar 200 OK ao restaurar um backup com sucesso (POST para /restore)', async () => {
    const backupFilename = 'backup-a-restaurar.sql.gz';
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/backups/restore', // URL específica para a ação de restaurar
      headers: { 'Authorization': 'Bearer valid.token' },
      body: {
        filename: backupFilename,
      },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockReturnValue({ userId: 1, username: 'admin' });

    const backupLib = jest.requireMock('../lib/backup.js');

    await protectedBackupsApiRoute(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).message).toBe('Backup restaurado com sucesso!');
    // Verifica se a função de restauração foi chamada com o nome de arquivo correto
    expect(backupLib.restoreBackup).toHaveBeenCalledWith(backupFilename);
  });

  it('deve retornar 405 Method Not Allowed para métodos não suportados (ex: PUT)', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      url: '/api/admin/backups',
      headers: { 'Authorization': 'Bearer valid.token' },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockReturnValue({ userId: 1, username: 'admin' });

    await protectedBackupsApiRoute(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData()).message).toBe('Método não permitido para a rota solicitada.');
  });
});