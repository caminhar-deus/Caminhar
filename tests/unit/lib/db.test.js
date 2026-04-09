import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { query, closeDatabase, transaction, healthCheck, getDatabaseInfo, resetPool } from '../../../lib/db.js';
import { Pool } from 'pg';

jest.mock('pg');

describe('Library - Database', () => {
  let mockClient;
  let mockPoolInstance;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.log = () => {};
    console.error = () => {};
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    resetPool();
    jest.clearAllMocks();
    
    mockClient = { query: jest.fn(), release: jest.fn() };
    mockPoolInstance = {
      query: jest.fn(),
      connect: jest.fn(() => Promise.resolve(mockClient)),
      end: jest.fn()
    };
    
    Pool.mockImplementation(() => mockPoolInstance);
  });

  it('query: executa consulta SQL diretamente com sucesso', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const res = await query('SELECT * FROM users', [], { log: true });
    expect(res.rowCount).toBe(1);
    expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT * FROM users', []);
  });

  it('query: falha e lança erro ou retorna nulo dependendo das opções', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('DB Timeout'));
    await expect(query('SELECT 1')).rejects.toThrow('DB Timeout');

    mockPoolInstance.query.mockRejectedValueOnce(new Error('DB Timeout'));
    const res = await query('SELECT 1', [], { throwOnError: false });
    expect(res).toBeNull();
  });

  it('transaction: executa COMMIT em sucesso e injeta o client no callback', async () => {
    const client = await mockPoolInstance.connect();
    client.query.mockClear();
    
    const cb = jest.fn().mockResolvedValue('ok');
    const res = await transaction(cb);
    
    expect(res).toBe('ok');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(cb).toHaveBeenCalledWith(client);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('transaction: executa ROLLBACK em caso de exceção', async () => {
    const client = await mockPoolInstance.connect();
    const cb = jest.fn().mockRejectedValue(new Error('Tx Error'));
    
    await expect(transaction(cb)).rejects.toThrow('Tx Error');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('healthCheck e getDatabaseInfo: retornam status e métricas via consultas estáticas', async () => {
    mockPoolInstance.query.mockResolvedValue({ rows: [{ health_check: 1, version: '15.0', active_connections: '5', size_bytes: '1024' }] });
    expect(await healthCheck()).toBe(true);
    expect((await getDatabaseInfo()).version).toBe('15.0');
  });

  it('closeDatabase: encerra as conexões do pool de dados', async () => {
    await closeDatabase();
    expect(mockPoolInstance.end).toHaveBeenCalled();
  });

  it('deve usar SSL em ambiente de produção', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    resetPool(); // Força a recriação do pool
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [] });
    
    await query('SELECT 1');
    
    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
      ssl: { rejectUnauthorized: false }
    }));
    
    process.env.NODE_ENV = origEnv;
  });

  it('closeDatabase: propaga erro se falhar', async () => {
    mockPoolInstance.end.mockRejectedValueOnce(new Error('Close Error'));
    await expect(closeDatabase()).rejects.toThrow('Close Error');
  });

  it('healthCheck: retorna falso se ocorrer erro na consulta', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('Health Error'));
    expect(await healthCheck()).toBe(false);
  });

  it('getDatabaseInfo: propaga erro se falhar', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('Info Error'));
    await expect(getDatabaseInfo()).rejects.toThrow('Info Error');
  });
});