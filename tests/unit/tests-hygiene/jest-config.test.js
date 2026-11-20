/** @jest-environment node */
/**
 * Higiene da configuração Jest e determinismo de ContentTabs.test.js.
 *
 * Por que este teste existe:
 * - Sem `workerIdleMemoryLimit`, workers `jsdom` com `coverageProvider: 'v8'`
 *   acumulam ~664 MB de heap por worker ao longo de ~244 suítes, gerando
 *   congelamentos simultâneos de 64-80 s e timeouts sob `--coverage`.
 * - Este invariante trava `workerIdleMemoryLimit` dentro da faixa segura
 *   (`200MB`–`512MB`), herança em `jest.config.js`, `workerGracefulExitTimeout`,
 *   `maxWorkers` e impede o retorno de `findByTestId` assíncrono em
 *   `ContentTabs.test.js` enquanto `ContentTabs` usar imports síncronos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import baseConfig from '../../../jest.config.base.js';
import jestConfig from '../../../jest.config.js';

function parseMemoryLimitMb(limit) {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return limit / (1024 * 1024);
  }
  if (typeof limit === 'string') {
    const match = /^(\d+)\s*MB$/i.exec(limit.trim());
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
}

describe('Higiene da configuração Jest e ContentTabs.test.js', () => {
  it('define workerIdleMemoryLimit em faixa segura (200MB a 512MB) na base e propaga para jest.config.js', () => {
    expect(baseConfig.workerIdleMemoryLimit).toBeDefined();

    const limitMb = parseMemoryLimitMb(baseConfig.workerIdleMemoryLimit);
    expect(limitMb).not.toBeNull();
    expect(limitMb).toBeGreaterThanOrEqual(200);
    expect(limitMb).toBeLessThanOrEqual(512);

    expect(jestConfig.workerIdleMemoryLimit).toBe(baseConfig.workerIdleMemoryLimit);
  });

  it('preserva workerGracefulExitTimeout >= 5000 e maxWorkers em 50%', () => {
    expect(baseConfig.workerGracefulExitTimeout).toBeGreaterThanOrEqual(5000);
    expect(baseConfig.maxWorkers).toBe('50%');
  });

  it('mantém ContentTabs.test.js síncrono enquanto ContentTabs usar imports estáticos', () => {
    const raiz = process.cwd();
    const contentTabsSrc = fs.readFileSync(
      path.join(raiz, 'components/Features/ContentTabs/index.js'),
      'utf8'
    );
    const contentTabsTest = fs.readFileSync(
      path.join(raiz, 'tests/unit/components/Features/ContentTabs/ContentTabs.test.js'),
      'utf8'
    );

    const usaLazy = /\bReact\.lazy\b|\blazy\s*\(/.test(contentTabsSrc);
    if (!usaLazy) {
      expect(contentTabsTest).not.toMatch(/\bfindByTestId\b/);
    }
  });
});
