import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Library - Infra - Logger', () => {
  const originalEnv = { ...process.env };
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;
  let tempDir;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE_PATH;
    delete process.env.NODE_ENV;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    tempDir = mkdtempSync(join(tmpdir(), 'logger-test-'));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.env = { ...originalEnv };
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Filtro por nível', () => {
    it('LOG_LEVEL=error suprime warn, info, success e debug', async () => {
      process.env.LOG_LEVEL = 'error';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.error('Mod', 'erro');
      logger.warn('Mod', 'aviso');
      logger.info('Mod', 'info');
      logger.success('Mod', 'sucesso');
      logger.debug('Mod', 'debug');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('LOG_LEVEL=warn suprime info, success e debug', async () => {
      process.env.LOG_LEVEL = 'warn';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.error('Mod', 'erro');
      logger.warn('Mod', 'aviso');
      logger.info('Mod', 'info');
      logger.success('Mod', 'sucesso');
      logger.debug('Mod', 'debug');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('LOG_LEVEL=info suprime apenas debug', async () => {
      process.env.LOG_LEVEL = 'info';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.info('Mod', 'info');
      logger.success('Mod', 'sucesso');
      logger.debug('Mod', 'debug');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('LOG_LEVEL=debug emite todos os níveis', async () => {
      process.env.LOG_LEVEL = 'debug';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.error('Mod', 'erro');
      logger.warn('Mod', 'aviso');
      logger.info('Mod', 'info');
      logger.success('Mod', 'sucesso');
      logger.debug('Mod', 'debug');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('default em NODE_ENV=test é error', async () => {
      process.env.NODE_ENV = 'test';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.info('Mod', 'info');
      logger.debug('Mod', 'debug');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Saída JSON em produção', () => {
    it('em NODE_ENV=production emite linha JSON parseável', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.error('Auth', 'Falha interna', { code: 500 });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const line = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('error');
      expect(parsed.module).toBe('Auth');
      expect(parsed.message).toBe('Falha interna');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.args).toEqual([{ code: 500 }]);
    });

    it('success é normalizado para info no JSON', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.success('Auth', 'Login ok');

      const line = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Login ok');
    });
  });

  describe('requestId via AsyncLocalStorage', () => {
    it('setRequestId injeta ID no JSON em produção', async () => {
      process.env.NODE_ENV = 'production';
      const { logger, setRequestId } = await import('../../../../lib/infra/logger.js');
      setRequestId('req-123');
      logger.info('Mod', 'mensagem');

      const line = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.requestId).toBe('req-123');
    });

    it('runWithRequestId propaga ID apenas dentro do callback', async () => {
      process.env.NODE_ENV = 'production';
      const { logger, runWithRequestId } = await import('../../../../lib/infra/logger.js');

      runWithRequestId('req-abc', () => {
        logger.warn('Mod', 'dentro');
      });

      const lineInside = consoleWarnSpy.mock.calls[0][0];
      const parsedInside = JSON.parse(lineInside);
      expect(parsedInside.requestId).toBe('req-abc');

      logger.info('Mod', 'fora');
      const lineOutside = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
      const parsedOutside = JSON.parse(lineOutside);
      expect(parsedOutside.requestId).toBeUndefined();
    });
  });

  describe('Sanitização', () => {
    it('serializa Error para { name, message, stack }', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await import('../../../../lib/infra/logger.js');
      const err = new Error('boom');
      logger.error('Mod', 'erro', err);

      const line = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.args[0].name).toBe('Error');
      expect(parsed.args[0].message).toBe('boom');
      expect(typeof parsed.args[0].stack).toBe('string');
    });

    it('não quebra com objeto circular', async () => {
      process.env.NODE_ENV = 'production';
      const { logger } = await import('../../../../lib/infra/logger.js');
      const obj = { name: 'x' };
      obj.self = obj;
      logger.info('Mod', 'circular', obj);

      const line = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(line);
      expect(parsed.args[0].self).toBe('[Circular]');
    });
  });

  describe('File transport', () => {
    it('LOG_FILE_PATH definido escreve linha JSON no arquivo', async () => {
      const filePath = join(tempDir, 'app.log');
      process.env.LOG_FILE_PATH = filePath;
      process.env.NODE_ENV = 'development';
      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.error('Mod', 'erro em arquivo');

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf8').trim();
      const parsed = JSON.parse(content);
      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('erro em arquivo');
    });

    it('rotaciona arquivo quando excede MAX_FILE_SIZE', async () => {
      const filePath = join(tempDir, 'rotate.log');
      process.env.LOG_FILE_PATH = filePath;
      process.env.NODE_ENV = 'development';

      // Pré-popula arquivo com conteúdo maior que 10MB
      const big = 'x'.repeat(11 * 1024 * 1024);
      writeFileSync(filePath, big);

      const { logger } = await import('../../../../lib/infra/logger.js');
      logger.info('Mod', 'após rotacao');

      expect(existsSync(`${filePath}.1`)).toBe(true);
      const rotatedSize = statSync(`${filePath}.1`).size;
      expect(rotatedSize).toBeGreaterThan(10 * 1024 * 1024);
      const content = readFileSync(filePath, 'utf8').trim();
      const parsed = JSON.parse(content);
      expect(parsed.message).toBe('após rotacao');
    });
  });
});