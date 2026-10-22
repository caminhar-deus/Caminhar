import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// A guarda consulta a tabela `roles` — devolve por padrão um cargo SEM
// permissões; cada teste sobrescreve com o cenário específico.
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());
jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}));

import { checkRolePermission } from '../../../../lib/api/permissions.js';
import { query } from '../../../../lib/infra/db.js';
import { logger } from '../../../../lib/infra/logger.js';

describe('lib/api/permissions — checkRolePermission', () => {
  beforeEach(() => {
    query.mockResolvedValue({ rows: [] });
  });

  it('deve permitir quando a permissão exigida está presente (reason: ok)', async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral", "Gestão de Produtos"]' }] });

    const result = await checkRolePermission('editor', 'Gestão de Produtos');

    expect(result).toEqual({ allowed: true, reason: 'ok' });
    expect(query).toHaveBeenCalledWith(
      'SELECT permissions FROM roles WHERE name = $1',
      ['editor'],
      { log: false },
    );
  });

  it('deve aceitar lista de permissões exigidas com semântica de OU', async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Auditoria"]' }] });

    const result = await checkRolePermission('auditor', ['Gestão de Produtos', 'Auditoria']);

    expect(result).toEqual({ allowed: true, reason: 'ok' });
  });

  it('deve negar quando a permissão exigida está ausente (reason: missing)', async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral"]' }] });

    const result = await checkRolePermission('user', 'Gestão de Produtos');

    expect(result).toEqual({ allowed: false, reason: 'missing' });
  });

  it("deve negar cargo sem permissões ('[]') com reason: missing", async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '[]' }] });

    const result = await checkRolePermission('user', 'Gestão de Produtos');

    expect(result).toEqual({ allowed: false, reason: 'missing' });
  });

  it("deve permitir role 'admin' com reason: 'admin' mesmo sem a permissão na lista", async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral"]' }] });

    const result = await checkRolePermission('admin', 'Gestão de Produtos');

    expect(result).toEqual({ allowed: true, reason: 'admin' });
    // A consulta roda MESMO para o admin (comportamento herdado do handler)
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('deve registrar logger.warn quando o parse de permissions está corrompido', async () => {
    query.mockResolvedValueOnce({ rows: [{ permissions: '{corrompido' }] });

    const result = await checkRolePermission('editor', 'Gestão de Produtos');

    expect(result).toEqual({ allowed: false, reason: 'missing' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('cargo "editor"'),
    );
    expect(logger.warn.mock.calls[0][1]).toContain('parse falhou');
  });

  it('deve negar com reason error (e o erro no campo error) quando a consulta falha e o cargo não é admin', async () => {
    const dbError = new Error('relation "roles" does not exist');
    query.mockRejectedValueOnce(dbError);

    const result = await checkRolePermission('editor', 'Gestão de Produtos');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.error).toBe(dbError);
  });

  it("deve permitir role 'admin' mesmo quando a consulta falha (banco indisponível)", async () => {
    query.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

    const result = await checkRolePermission('admin', 'Gestão de Produtos');

    expect(result.allowed).toBe(true);
  });
});
