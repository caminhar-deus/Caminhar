import { describe, it, expect, beforeAll } from '@jest/globals';

describe('date-format.js — Utilitário de formatação de datas', () => {
  let dateFormat;

  beforeAll(async () => {
    dateFormat = await import('../../../../scripts/utils/date-format.js');
  });

  describe('formatISODate()', () => {
    it('deve exportar a função formatISODate', () => {
      expect(typeof dateFormat.formatISODate).toBe('function');
    });

    it('deve formatar data no padrão ISO com ":" substituídos por "-"', () => {
      const result = dateFormat.formatISODate(new Date('2026-05-21T23:00:00.000Z'));
      expect(result).toBe('2026-05-21T23-00-00Z');
    });

    it('deve retornar uma string', () => {
      const result = dateFormat.formatISODate();
      expect(typeof result).toBe('string');
    });

    it('deve conter o formato esperado: YYYY-MM-DDTHH-mm-ssZ', () => {
      const result = dateFormat.formatISODate(new Date('2026-01-05T03:15:45.123Z'));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
      expect(result).toBe('2026-01-05T03-15-45Z');
    });

    it('deve usar a data atual se nenhuma for passada', () => {
      const before = Date.now();
      const result = dateFormat.formatISODate();
      const after = Date.now();

      // Extrai o timestamp do resultado e verifica se está dentro do intervalo
      const resultDate = result.replace(/(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2}Z)/, '$1:$2:$3');
      const resultTimestamp = new Date(resultDate).getTime();
      expect(resultTimestamp).toBeGreaterThanOrEqual(before - 1000);
      expect(resultTimestamp).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('formatLogDate()', () => {
    it('deve exportar a função formatLogDate', () => {
      expect(typeof dateFormat.formatLogDate).toBe('function');
    });

    it('deve formatar data no padrão "YYYY-MM-DD HH:mm:ss"', () => {
      const result = dateFormat.formatLogDate(new Date('2026-05-21T23:00:00.000Z'));
      expect(result).toBe('2026-05-21 23:00:00');
    });

    it('deve retornar uma string', () => {
      const result = dateFormat.formatLogDate();
      expect(typeof result).toBe('string');
    });

    it('deve conter o formato esperado com espaço entre data e hora', () => {
      const result = dateFormat.formatLogDate(new Date('2026-12-31T14:30:15.500Z'));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(result).toBe('2026-12-31 14:30:15');
    });

    it('deve usar a data atual se nenhuma for passada', () => {
      const before = Date.now();
      const result = dateFormat.formatLogDate();
      const after = Date.now();

      const resultTimestamp = new Date(result.replace(' ', 'T') + 'Z').getTime();
      expect(resultTimestamp).toBeGreaterThanOrEqual(before - 1000);
      expect(resultTimestamp).toBeLessThanOrEqual(after + 1000);
    });
  });
});