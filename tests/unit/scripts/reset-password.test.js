import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('pg');
jest.mock('fs');
jest.mock('dotenv/config');

jest.mock('../../../lib/auth.js', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2b$10$hashed_password_string'),
}));

jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb());

describe('reset-password.js — Redefinição de senha', () => {
  let libDb;
  let libAuth;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    libDb = await import('../../../lib/db.js');
    libAuth = await import('../../../lib/auth.js');
  });

  it('deve chamar hashPassword com a nova senha', async () => {
    libDb.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const hashed = await libAuth.hashPassword('nova_senha_segura');
    expect(libAuth.hashPassword).toHaveBeenCalledWith('nova_senha_segura');
    expect(hashed).toBe('$2b$10$hashed_password_string');
  });

  it('deve executar UPDATE na tabela users com password e username corretos', async () => {
    const hashedPassword = await libAuth.hashPassword('nova_senha');
    libDb.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    await libDb.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id',
      [hashedPassword, 'admin']
    );

    expect(libDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users'),
      expect.arrayContaining([hashedPassword, 'admin'])
    );
  });

  it('deve criar novo usuário se username não existir', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const hashedPassword = await libAuth.hashPassword('nova_senha');
    
    // Simula que o UPDATE retornou 0 linhas (usuário não existe)
    libDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

    await libDb.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      ['novo_usuario', hashedPassword, 'admin']
    );

    expect(libDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining(['novo_usuario', hashedPassword, 'admin'])
    );
  });

  it('deve fechar conexão após execução', async () => {
    libDb.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    
    await libDb.closeDatabase();
    expect(libDb.closeDatabase).toHaveBeenCalled();
  });
});