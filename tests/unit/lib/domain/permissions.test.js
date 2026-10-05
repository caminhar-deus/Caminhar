import { describe, it, expect } from '@jest/globals';

import { toPermissionArray, getRolePermissions, isPermissionParseFailure } from '../../../../lib/domain/permissions.js';

describe('Domínio - Permissions (lib/domain/permissions.js)', () => {
  describe('toPermissionArray', () => {
    it('deve retornar [] para undefined', () => {
      expect(toPermissionArray(undefined)).toEqual([]);
      // Sem dado → nada para parser: NÃO é falha de parse (não alerta)
      expect(isPermissionParseFailure(undefined)).toBe(false);
      expect(isPermissionParseFailure(null)).toBe(false);
      expect(isPermissionParseFailure('')).toBe(false);
    });

    it('deve retornar [] para null', () => {
      expect(toPermissionArray(null)).toEqual([]);
    });

    it('deve fazer parse de uma string JSON válida de array', () => {
      expect(toPermissionArray('["A","B"]')).toEqual(['A', 'B']);
    });

    it('deve fazer passthrough de um array já normalizado', () => {
      expect(toPermissionArray(['A', 'B'])).toEqual(['A', 'B']);
    });

    it('deve retornar [] para string JSON de objeto (não-array)', () => {
      expect(toPermissionArray('{"a":1}')).toEqual([]);
      // Corrompido (não é lista de permissões) → call sites devem alertar
      expect(isPermissionParseFailure('{"a":1}')).toBe(true);
    });

    it('deve retornar [] para string JSON de número', () => {
      expect(toPermissionArray('123')).toEqual([]);
    });

    it('deve retornar [] para JSON inválido (fail-closed, sem lançar)', () => {
      expect(toPermissionArray('lixo')).toEqual([]);
      expect(isPermissionParseFailure('lixo')).toBe(true);
    });

    it('deve filtrar elementos não-string de um array', () => {
      expect(toPermissionArray(['A', 1, null, 'B'])).toEqual(['A', 'B']);
    });

    it('deve retornar [] para string JSON de array vazio', () => {
      expect(toPermissionArray('[]')).toEqual([]);
      // Caso legítimo de "cargo sem permissões": NÃO é falha de parse
      expect(isPermissionParseFailure('[]')).toBe(false);
    });

    it('deve devolver uma nova array sem mutar a entrada', () => {
      const input = ['A', 1, 'B'];
      const inputCopy = [...input];
      const result = toPermissionArray(input);

      expect(result).toEqual(['A', 'B']);
      expect(result).not.toBe(input);
      expect(input).toEqual(inputCopy);
    });
  });

  describe('getRolePermissions', () => {
    it('deve retornar [] quando a role é undefined', () => {
      expect(getRolePermissions(undefined)).toEqual([]);
    });

    it('deve normalizar a string JSON de permissions da row do banco', () => {
      expect(getRolePermissions({ permissions: '["A"]' })).toEqual(['A']);
    });
  });
});
