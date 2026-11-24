/** @jest-environment node */
/**
 * Funções puras do preflight de catálogo (`scripts/diagnostics/check-model-catalog.js`).
 *
 * O caminho que importa é o negativo: um id que saiu do catálogo precisa ser
 * REPORTADO (e o script sai com código 1). Sem este teste, a comparação só é
 * exercitada no dia em que alguém confia num id morto.
 */
import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  agentModels,
  debugAgentsArgs,
  exitCodeForReadStatus,
  expectedAgents,
  formatCatalogReadError,
  missingModels,
  parseCatalog,
  parseJsonc,
  parseModeArgs,
  presetModels,
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

describe('expectedAgents', () => {
  const config = {
    preset: 'zen',
    presets: {
      local: { orchestrator: { model: 'ollama/qwen3-coder:30b' } },
      zen: {
        extends: 'local',
        marketplace: { enabled: true },
        agents: { orchestrator: { mcps: [] } },
        orchestrator: { model: ['opencode/a', 'opencode/b'] },
        oracle: { model: 'opencode/c' },
      },
    },
    agents: { explorer: { mcps: [] }, fixer: { mcps: [] } },
  };

  it('lê os papéis do preset ativo e do bloco agents raiz, sem extends/marketplace', () => {
    expect(expectedAgents(config).sort()).toEqual(['explorer', 'fixer', 'oracle', 'orchestrator']);
  });

  it('devolve vazio quando o preset ativo não existe', () => {
    expect(expectedAgents({ preset: 'inexistente', presets: {}, agents: {} })).toEqual([]);
  });

  it('pega o plugin que não carregou: só title/build/plan compilados', () => {
    const compilados = new Set(['build', 'plan', 'title']);
    expect(expectedAgents(config).filter((agent) => !compilados.has(agent)).sort()).toEqual([
      'explorer', 'fixer', 'oracle', 'orchestrator',
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

describe('parseJsonc', () => {
  it('remove comentário de linha e de bloco e vírgula final', () => {
    const texto = `{
      // primário do orchestrator
      "preset": "zen", /* bloco
      comentado */
      "presets": { "zen": { "orchestrator": { "model": ["opencode/a", "opencode/b",] }, }, },
    }`;
    expect(parseJsonc(texto)).toEqual({
      preset: 'zen',
      presets: { zen: { orchestrator: { model: ['opencode/a', 'opencode/b'] } } },
    });
  });

  it('preserva `//` dentro de string e aspas escapadas', () => {
    const texto = '{ "url": "https://exemplo.test/a", "aspas": "diz \\"oi\\" // nao e comentario" }';
    expect(parseJsonc(texto)).toEqual({
      url: 'https://exemplo.test/a',
      aspas: 'diz "oi" // nao e comentario',
    });
  });

  it('explode em JSON inválido em vez de devolver preset meio-lido', () => {
    expect(() => parseJsonc('{ "preset": "zen" ')).toThrow();
  });
});

describe('presetModels', () => {
  const config = {
    preset: 'zen',
    presets: {
      local: { orchestrator: { model: 'ollama/qwen3-coder:30b' } },
      zen: {
        orchestrator: { model: ['opencode/deepseek-v4.1-flash-free', 'opencode/glm-5.3-flash-free'] },
        oracle: { model: 'opencode/minimax-m3.1-flash-free' },
        fixer: { mcps: {} },
      },
    },
  };

  it('lê só o preset ativo, na ordem, marcando a reserva pela posição', () => {
    expect(presetModels(config).agentes).toEqual([
      { agent: 'orchestrator', id: 'opencode/deepseek-v4.1-flash-free', posicao: 0 },
      { agent: 'orchestrator', id: 'opencode/glm-5.3-flash-free', posicao: 1 },
      { agent: 'oracle', id: 'opencode/minimax-m3.1-flash-free', posicao: 0 },
    ]);
  });

  it('devolve vazio quando o preset ativo não tem bloco', () => {
    expect(presetModels({ preset: 'inexistente', presets: {} })).toEqual({
      preset: 'inexistente', agentes: [],
    });
    expect(presetModels({})).toEqual({ preset: null, agentes: [] });
  });

  it('a reserva morta é pega pela mesma checagem do primário', () => {
    const { agentes } = presetModels(config);
    const catalog = parseCatalog('opencode/deepseek-v4.1-flash-free\nopencode/minimax-m3.1-flash-free\n');
    const reservas = agentes.filter(({ posicao }) => posicao > 0);
    expect(missingModels(reservas, catalog)).toEqual([
      { agent: 'orchestrator', id: 'opencode/glm-5.3-flash-free', posicao: 1 },
    ]);
  });
});

describe('formatCatalogReadError', () => {
  it('classifica ENOENT como NAO_VERIFICADO preservando motivo e resumindo o preset local válido', () => {
    const error = Object.assign(new Error('spawnSync opencode ENOENT'), { code: 'ENOENT' });
    const result = formatCatalogReadError(error, { preset: 'zen', total: 6, reservas: 1 });

    expect(result.status).toBe('NAO_VERIFICADO');
    expect(result.lines.join('\n')).toContain('status: NÃO VERIFICADO');
    expect(result.lines.join('\n')).toContain('motivo: spawnSync opencode ENOENT');
    expect(result.lines.join('\n')).toContain(
      'sintaxe válida (preset `zen`, 6 modelo(s), 1 reserva(s)), mas o catálogo vivo NÃO foi consultado.'
    );
  });

  it('reporta erro de sintaxe do preset local quando ENOENT ocorre com presetSummary.error', () => {
    const error = new Error('spawnSync opencode ENOENT');
    const result = formatCatalogReadError(error, { error: 'Unexpected token } in JSON' });

    expect(result.status).toBe('NAO_VERIFICADO');
    expect(result.lines.join('\n')).toContain(
      'preset local (.opencode/oh-my-opencode-slim.json): ERRO — Unexpected token } in JSON'
    );
  });

  it('classifica falhas diferentes de ENOENT como ERRO mantendo a mensagem padrão', () => {
    const error = Object.assign(new Error('Command failed: opencode models\ntimeout'), { code: 'ETIMEDOUT' });
    const result = formatCatalogReadError(error, { preset: 'zen', total: 6, reservas: 1 });

    expect(result.status).toBe('ERRO');
    expect(result).toEqual({
      status: 'ERRO',
      lines: [
        'models:check — não foi possível ler o catálogo do OpenCode.',
        '  motivo: Command failed: opencode models',
        '  conferir: `opencode debug agents` e `opencode models` respondem?',
      ],
    });
  });
});

describe('portabilidade do preflight', () => {
  it('lê a config do disco por padrão e o serviço só quando pedido', () => {
    expect(parseModeArgs([])).toEqual({ modo: 'standalone', erro: null });
    expect(parseModeArgs(['--standalone'])).toEqual({ modo: 'standalone', erro: null });
    expect(parseModeArgs(['--service'])).toEqual({ modo: 'service', erro: null });
  });

  it('rejeita flag desconhecida e as duas fontes ao mesmo tempo', () => {
    expect(parseModeArgs(['--turbo']).erro).toContain('--turbo');
    expect(parseModeArgs(['--standalone', '--service']).erro).toContain('OU');
  });

  it('monta `debug agents` com --standalone fora do modo serviço', () => {
    expect(debugAgentsArgs('standalone')).toEqual(['debug', 'agents', '--standalone']);
    expect(debugAgentsArgs('service')).toEqual(['debug', 'agents']);
  });

  it('separa "não verificado" (2) de falha real (1) no código de saída', () => {
    expect(exitCodeForReadStatus('NAO_VERIFICADO')).toBe(2);
    expect(exitCodeForReadStatus('ERRO')).toBe(1);
  });

  it('sai 2 com "NÃO VERIFICADO" quando o CLI opencode não está no PATH', () => {
    const script = path.join(process.cwd(), 'scripts', 'diagnostics', 'check-model-catalog.js');
    let erro;
    try {
      execFileSync(process.execPath, [script], {
        encoding: 'utf8',
        env: { ...process.env, PATH: '' },
        stdio: 'pipe',
      });
    } catch (capturado) {
      erro = capturado;
    }

    expect(erro?.status).toBe(2);
    expect(erro?.stderr).toContain('status: NÃO VERIFICADO');
    expect(erro?.stderr).toContain('spawnSync opencode ENOENT');
  });
});
