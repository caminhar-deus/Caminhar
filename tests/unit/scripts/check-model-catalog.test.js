/** @jest-environment node */
/**
 * Funções puras do preflight de catálogo (`scripts/diagnostics/check-model-catalog.js`).
 *
 * O caminho que importa é o negativo: um id que saiu do catálogo precisa ser
 * REPORTADO (e o script sai com código 1). Sem este teste, a comparação só é
 * exercitada no dia em que alguém confia num id morto.
 */
import { describe, it, expect } from '@jest/globals';
import {
  agentModels,
  missingModels,
  parseCatalog,
} from '../../../scripts/diagnostics/model-catalog.js';

describe('parseCatalog', () => {
  it('lê uma linha por modelo e ignora vazias e texto sem provider', () => {
    const catalog = parseCatalog('opencode/big-pickle\n\nollama/qwen3-coder:30b\nalgum aviso\n');
    expect([...catalog]).toEqual(['opencode/big-pickle', 'ollama/qwen3-coder:30b']);
  });
});

describe('agentModels', () => {
  it('monta provider/id e aceita modelo em string', () => {
    expect(agentModels([
      { id: 'designer', model: { providerID: 'opencode', id: 'big-pickle' } },
      { id: 'build' },
      { id: 'legado', model: 'opencode/iceman-free' },
    ])).toEqual([
      { agent: 'designer', id: 'opencode/big-pickle' },
      { agent: 'legado', id: 'opencode/iceman-free' },
    ]);
  });
});

describe('missingModels', () => {
  it('aponta só o que não está no catálogo', () => {
    const catalog = parseCatalog('opencode/deepseek-v4.1-flash-free\nopencode/big-pickle\n');
    const models = agentModels([
      { id: 'orchestrator', model: { providerID: 'opencode', id: 'deepseek-v4.1-flash-free' } },
      { id: 'designer', model: { providerID: 'opencode', id: 'crouton-alpha-free' } },
    ]);
    expect(missingModels(models, catalog)).toEqual([
      { agent: 'designer', id: 'opencode/crouton-alpha-free' },
    ]);
  });
});
