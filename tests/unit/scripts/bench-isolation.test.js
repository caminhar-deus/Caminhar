/**
 * Isolamento de memória dos benches (`scripts/bench/runner-comum.js`).
 *
 * O runner abre sessões reais; o marcador da árvore decide em qual projeto o
 * ai-memory grava e o `opencode.jsonc` da cópia decide se os modelos podem LER
 * esse projeto. As duas guardas rodam antes de qualquer spawn: aceitar só a
 * cópia de medição (`default/bench`) com o MCP `ai-memory` desligado, e recusar
 * o marcador do projeto real ou a memória legível.
 */
import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  exigirIsolamentoDeBench,
  exigirMarcadorDeBench,
  exigirMemoriaDesligada,
} from '../../../scripts/bench/runner-comum.js';

const copia = mkdtempSync(path.join(os.tmpdir(), 'bench-isolamento-'));
const marcador = path.join(copia, '.ai-memory.toml');
const config = path.join(copia, 'opencode.jsonc');

const CONFIG_COM_MEMORIA_DESLIGADA = `{
  "mcp": {
    "servers": {
      // ai-memory: desligado nesta cópia para o modelo não ler as respostas
      // das execuções anteriores do mesmo bench.
      "ai-memory": {
        "type": "remote",
        "url": "http://127.0.0.1:49374/mcp",
        "oauth": false,
        "disabled": true
      }
    }
  }
}
`;

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

describe('exigirMemoriaDesligada', () => {
  beforeEach(() => {
    rmSync(config, { force: true });
  });

  it('aceita o MCP ai-memory desligado na cópia', async () => {
    writeFileSync(config, CONFIG_COM_MEMORIA_DESLIGADA);
    await expect(exigirMemoriaDesligada(copia)).resolves.toBeUndefined();
  });

  it('recusa o MCP ai-memory ligado (memória legível pelo modelo)', async () => {
    writeFileSync(config, CONFIG_COM_MEMORIA_DESLIGADA.replace('"disabled": true', '"disabled": false'));
    await expect(exigirMemoriaDesligada(copia)).rejects.toThrow(/memória legível/i);
  });

  it('recusa config sem entrada do ai-memory', async () => {
    writeFileSync(config, '{ "mcp": { "servers": {} } }');
    await expect(exigirMemoriaDesligada(copia)).rejects.toThrow(/não desliga o MCP "ai-memory"/);
  });

  it('recusa árvore sem config de projeto', async () => {
    await expect(exigirMemoriaDesligada(copia)).rejects.toThrow(/sem opencode\.jsonc\/opencode\.json/i);
  });
});

describe('exigirIsolamentoDeBench', () => {
  it('aceita as duas guardas satisfeitas', async () => {
    writeFileSync(marcador, 'workspace = "default"\nproject = "bench"\n');
    writeFileSync(config, CONFIG_COM_MEMORIA_DESLIGADA);
    await expect(exigirIsolamentoDeBench(copia)).resolves.toBeUndefined();
  });

  it('recusa marcador isolado com memória legível', async () => {
    writeFileSync(marcador, 'workspace = "default"\nproject = "bench"\n');
    writeFileSync(config, CONFIG_COM_MEMORIA_DESLIGADA.replace('"disabled": true', '"disabled": false'));
    await expect(exigirIsolamentoDeBench(copia)).rejects.toThrow(/memória legível/i);
  });
});
