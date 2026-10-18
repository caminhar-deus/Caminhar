import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('pg');

// Mock do logger REAL (lib/infra/db.js importa { logger }): sem isto, os testes
// de caminho de erro imprimem console.error e poluem a saída do Jest. Mesma
// convenção de tests/integration/api/musicas.test.js.
jest.mock('../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

import { query, closeDatabase, transaction, healthCheck, getDatabaseInfo, resetPool, getPool, resolveSslConfig } from '../../../lib/infra/db.js';
import { Pool, restorePoolImplementation } from 'pg';
import { logger } from '../../../lib/infra/logger.js';

describe('Library - Database', () => {
  let mockClient;
  let mockPoolInstance;

  beforeEach(() => {
    restorePoolImplementation();
    
    mockClient = { query: jest.fn(), release: jest.fn() };
    mockPoolInstance = {
      query: jest.fn(),
      connect: jest.fn(() => Promise.resolve(mockClient)),
      end: jest.fn(() => Promise.resolve()),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    
    Pool.mockImplementation(() => mockPoolInstance);
    resetPool();
    getPool(); // Inicializa o pool com a instância mockada para testes de closeDatabase
  });

  it('query: executa consulta SQL diretamente com sucesso', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const res = await query('SELECT * FROM users', [], { log: true });
    expect(res.rowCount).toBe(1);
    expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT * FROM users', []);
  });

  it('query: falha e lança erro ou retorna nulo dependendo das opções', async () => {
    // Usa mockImplementation para rejeitar SEMPRE (incluindo retry), 
    // pois o retry automático do query() faz duas tentativas
    mockPoolInstance.query.mockImplementation(() => Promise.reject(new Error('DB Timeout')));
    await expect(query('SELECT 1')).rejects.toThrow('DB Timeout');

    mockPoolInstance.query.mockImplementation(() => Promise.reject(new Error('DB Timeout')));
    const res = await query('SELECT 1', [], { throwOnError: false });
    expect(res).toBeNull();

    // O log de falha do query() era só ruído de console; com o logger mockado
    // ele também cobre a linha de logger.error em lib/infra/db.js.
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Erro ao executar consulta SQL',
      expect.objectContaining({ message: 'DB Timeout' })
    );
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

    // O log da falha da transação era só ruído de console; com o logger
    // mockado ele também cobre a linha de logger.error em lib/infra/db.js.
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Transação falhou e foi revertida',
      expect.objectContaining({ error: 'Tx Error', timestamp: expect.any(String) })
    );
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

  it('resolveSslConfig: valores de DATABASE_SSL mapeiam para a configuração do driver', () => {
    expect(resolveSslConfig({ DATABASE_SSL: 'true' })).toEqual({ rejectUnauthorized: false });
    expect(resolveSslConfig({ DATABASE_SSL: '1' })).toEqual({ rejectUnauthorized: false });
    expect(resolveSslConfig({ DATABASE_SSL: 'false' })).toBe(false);
    expect(resolveSslConfig({ DATABASE_SSL: '0' })).toBe(false);
    // Ausente (ou inválido) -> undefined: o driver respeita o sslmode da URL
    expect(resolveSslConfig({})).toBeUndefined();
    expect(resolveSslConfig({ DATABASE_SSL: '' })).toBeUndefined();
    expect(resolveSslConfig({ DATABASE_SSL: 'banana' })).toBeUndefined();
  });

  it('resolveSslConfig: sslmode na URL não é detectado como conflito quando o valor é apenas herdado', () => {
    // Sem valor explícito, sslmode é a única fonte de verdade — não é conflito.
    expect(resolveSslConfig({ DATABASE_URL: 'postgresql://u:p@h/d?sslmode=require' })).toBeUndefined();
    expect(resolveSslConfig({
      DATABASE_SSL: '',
      DATABASE_URL: 'postgresql://u:p@h/d?sslmode=require',
    })).toBeUndefined();
  });

  it('resolveSslConfig: valor explícito continua decidindo mesmo com sslmode na URL', () => {
    // O driver sobrescreve `ssl` pelo connectionString (ver pg/lib/connection-parameters.js),
    // então o valor explícito é o que `resolveSslConfig` devolve — e o app avisa.
    expect(resolveSslConfig({
      DATABASE_SSL: 'true',
      DATABASE_URL: 'postgresql://u:p@h/d?sslmode=require',
    })).toEqual({ rejectUnauthorized: false });
    expect(resolveSslConfig({
      DATABASE_SSL: 'false',
      DATABASE_URL: 'postgresql://u:p@h/d?sslmode=require',
    })).toBe(false);
  });

  it('não força SSL por causa de NODE_ENV: o transporte vem de DATABASE_SSL', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origDbSsl = process.env.DATABASE_SSL;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_SSL; // regressão: production sozinho não pode ligar SSL
      resetPool();
      Pool.mockClear();
      mockPoolInstance.query.mockResolvedValueOnce({ rows: [] });

      await query('SELECT 1');

      expect(Pool.mock.calls.at(-1)[0].ssl).toBeUndefined();
    } finally {
      if (origNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = origNodeEnv;
      if (origDbSsl === undefined) delete process.env.DATABASE_SSL;
      else process.env.DATABASE_SSL = origDbSsl;
      resetPool();
      getPool();
    }
  });

  it('DATABASE_SSL=true liga o SSL mesmo fora de produção', async () => {
    const origDbSsl = process.env.DATABASE_SSL;
    try {
      process.env.DATABASE_SSL = 'true';
      resetPool();
      Pool.mockClear();
      mockPoolInstance.query.mockResolvedValueOnce({ rows: [] });

      await query('SELECT 1');

      expect(Pool.mock.calls.at(-1)[0].ssl).toEqual({ rejectUnauthorized: false });
    } finally {
      if (origDbSsl === undefined) delete process.env.DATABASE_SSL;
      else process.env.DATABASE_SSL = origDbSsl;
      resetPool();
      getPool();
    }
  });

  it('closeDatabase: propaga erro se falhar', async () => {
    mockPoolInstance.end.mockRejectedValueOnce(new Error('Close Error'));
    await expect(closeDatabase()).rejects.toThrow('Close Error');

    // O log de falha do closeDatabase era só ruído de console; com o logger
    // mockado ele também cobre a linha de logger.error em lib/infra/db.js.
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Erro ao fechar connection pool',
      expect.objectContaining({ error: 'Close Error', timestamp: expect.any(String) })
    );
  });

  it('healthCheck: retorna falso se ocorrer erro na consulta', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('Health Error'));
    expect(await healthCheck()).toBe(false);

    // O log de falha do healthCheck era só ruído de console; com o logger
    // mockado ele também cobre a linha de logger.error em lib/infra/db.js.
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Health check do banco de dados falhou',
      expect.objectContaining({ error: 'Health Error', timestamp: expect.any(String) })
    );
  });

  it('getDatabaseInfo: propaga erro se falhar', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('Info Error'));
    await expect(getDatabaseInfo()).rejects.toThrow('Info Error');

    // O log de falha do getDatabaseInfo era só ruído de console; com o logger
    // mockado ele também cobre a linha de logger.error em lib/infra/db.js.
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Erro ao obter informações do banco de dados',
      expect.objectContaining({ error: 'Info Error', timestamp: expect.any(String) })
    );
  });
});