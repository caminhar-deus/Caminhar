/**
 * Isolamento de memória dos benches (`scripts/bench/runner-comum.js`).
 *
 * O runner abre sessões reais; o marcador da árvore decide em qual projeto o
 * ai-memory grava. A guarda tem de aceitar só a cópia de medição
 * (`default/bench`) e recusar o marcador do projeto real antes de qualquer
 * spawn.
 */
import { describe, it, expect, afterAll } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exigirMarcadorDeBench } from '../../../scripts/bench/runner-comum.js';

const copia = mkdtempSync(path.join(os.tmpdir(), 'bench-isolamento-'));
const marcador = path.join(copia, '.ai-memory.toml');

afterAll(() => {
  rmSync(copia, { recursive: true, force: true });
});

describe('exigirMarcadorDeBench', () => {
  it('aceita workspace default e project bench', async () => {
    writeFileSync(marcador, 'workspace = "default"\nproject = "bench"\n');
    await expect(exigirMarcadorDeBench(copia)).resolves.toBeUndefined();
  });

  it('recusa o marcador do projeto real', async () => {
    writeFileSync(marcador, 'workspace = "pessoal"\nproject = "caminhar"\n');
    await expect(exigirMarcadorDeBench(copia)).rejects.toThrow(/pessoal\/caminhar/);
  });

  it('recusa árvore sem marcador', async () => {
    rmSync(marcador, { force: true });
    await expect(exigirMarcadorDeBench(copia)).rejects.toThrow(/sem marcador isolado/i);
  });
});
