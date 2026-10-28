import { describe, it, expect } from '@jest/globals';
import { parseBackupTimestamp } from '../../../scripts/utils/date-format.js';

describe('parseBackupTimestamp', () => {
  it('extrai a data de criação de um nome de backup padrão (.enc)', () => {
    const date = parseBackupTimestamp('caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc');
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2026-05-22T10:18:54.000Z');
  });

  it('extrai a data de um nome .sql.gz sem criptografia', () => {
    const date = parseBackupTimestamp('caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz');
    expect(date.toISOString()).toBe('2026-05-21T19:56:57.000Z');
  });

  it('devolve null para nome sem timestamp', () => {
    expect(parseBackupTimestamp('arquivo-qualquer.txt')).toBeNull();
  });

  it('devolve null para entrada vazia ou não-string', () => {
    expect(parseBackupTimestamp('')).toBeNull();
    expect(parseBackupTimestamp(null)).toBeNull();
    expect(parseBackupTimestamp(undefined)).toBeNull();
    expect(parseBackupTimestamp(123)).toBeNull();
  });
});
