/** @jest-environment node */
/**
 * Higiene de sincronização entre `package.json` e `package-lock.json`.
 *
 * Por que este teste existe:
 * - Em 23/11/2026 (`ae84c187` e `d3d3e3de`), 6 execuções consecutivas dos
 *   workflows do GitHub Actions falharam em `npm ci` (`EUSAGE`) porque
 *   `package.json` foi alterado sem atualizar `package-lock.json`
 *   (incidente posteriormente corrigido em `1793f90f`).
 * - Este invariante detecta localmente qualquer dessincronia de dependências
 *   antes do push; caso falhe, execute `npm install --package-lock-only`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';

describe('Higiene de sincronia package.json ↔ package-lock.json', () => {
  it('mantém lockfile >= v2 com dependencies, devDependencies e optionalDependencies sincronizadas com package.json', () => {
    const rootDir = process.cwd();
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8'));

    expect(lock.lockfileVersion).toBeGreaterThanOrEqual(2);
    expect(lock.packages).toBeDefined();

    const lockRoot = lock.packages[''];
    expect(lockRoot).toBeDefined();

    expect(lockRoot.dependencies || {}).toEqual(pkg.dependencies || {});
    expect(lockRoot.devDependencies || {}).toEqual(pkg.devDependencies || {});

    if (pkg.optionalDependencies || lockRoot.optionalDependencies) {
      expect(lockRoot.optionalDependencies || {}).toEqual(pkg.optionalDependencies || {});
    }
  });
});
