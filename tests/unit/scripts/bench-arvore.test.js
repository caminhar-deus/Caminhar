/** @jest-environment node */
/**
 * Higiene da árvore do bench de papéis (`scripts/bench/arvore.js`).
 *
 * `restaurarArvore()` é destrutiva por desenho e roda depois de sessões reais.
 * Os testes usam um repositório git temporário e cobrem o que a versão antiga
 * errava: caminho com espaço/acento (o `git status` sem `-z` cita o nome),
 * renomeação (antes restaurava o par errado em silêncio) e arquivo do próprio
 * bench (antes era apagado como "sujeira").
 */
import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exigirArvoreLimpa, restaurarArvore } from '../../../scripts/bench/arvore.js';

function git(raiz, ...args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Cria um repo mínimo e roda o cenário; a limpeza é sempre da pasta temporária.
 * O commit base contém: `tracked.txt`, `scripts/bench/tracked.txt`, `.gitignore`
 * (resultados do bench) e uma pasta `docs/` com arquivo rastreado.
 */
async function comRepo(cenario) {
  const raiz = mkdtempSync(path.join(os.tmpdir(), 'bench-arvore-'));
  try {
    git(raiz, 'init', '-q');
    git(raiz, 'config', 'user.email', 'bench@teste.local');
    git(raiz, 'config', 'user.name', 'Bench Teste');
    mkdirSync(path.join(raiz, 'scripts', 'bench'), { recursive: true });
    mkdirSync(path.join(raiz, 'docs'), { recursive: true });
    writeFileSync(path.join(raiz, '.gitignore'), 'scripts/bench/resultados/\n');
    writeFileSync(path.join(raiz, 'tracked.txt'), 'base\n');
    writeFileSync(path.join(raiz, 'scripts', 'bench', 'tracked.txt'), 'bench base\n');
    writeFileSync(path.join(raiz, 'docs', 'guia.md'), 'base\n');
    git(raiz, 'add', '.');
    git(raiz, 'commit', '-qm', 'base');
    return await cenario(raiz);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

describe('exigirArvoreLimpa', () => {
  it('aceita árvore limpa e ignora o que é do bench', async () => {
    await comRepo(async (raiz) => {
      writeFileSync(path.join(raiz, 'scripts', 'bench', 'anotacao.txt'), 'trabalho do projeto\n');
      mkdirSync(path.join(raiz, 'scripts', 'bench', 'resultados'), { recursive: true });
      writeFileSync(path.join(raiz, 'scripts', 'bench', 'resultados', 'x.ndjson'), '{}\n');
      await expect(exigirArvoreLimpa(raiz)).resolves.toBeUndefined();
    });
  });

  it('recusa trabalho não commitado fora do bench e mostra os caminhos', async () => {
    await comRepo(async (raiz) => {
      writeFileSync(path.join(raiz, 'novo arquivo.txt'), 'rascunho\n');
      writeFileSync(path.join(raiz, 'docs', 'guia.md'), 'alterado\n');
      await expect(exigirArvoreLimpa(raiz)).rejects.toThrow(/novo arquivo\.txt/);
      await expect(exigirArvoreLimpa(raiz)).rejects.toThrow(/docs\/guia\.md/);
    });
  });

  it('recusa renomeação, que a restauração não sabe desfazer', async () => {
    await comRepo(async (raiz) => {
      git(raiz, 'mv', 'tracked.txt', 'renomeado.txt');
      await expect(exigirArvoreLimpa(raiz)).rejects.toThrow(/renomeado\.txt/);
    });
  });

  it('recusa renomeação que cruza a fronteira do bench', async () => {
    await comRepo(async (raiz) => {
      git(raiz, 'mv', 'tracked.txt', 'scripts/bench/entrou.txt');
      await expect(exigirArvoreLimpa(raiz)).rejects.toThrow(/entrou\.txt/);
    });
  });
});

describe('restaurarArvore', () => {
  it('restaura rastreado alterado, remove não rastreado e preserva o bench', async () => {
    await comRepo(async (raiz) => {
      writeFileSync(path.join(raiz, 'tracked.txt'), 'alterado\n');
      writeFileSync(path.join(raiz, 'docs', 'guia.md'), 'alterado\n');
      writeFileSync(path.join(raiz, 'rascunho com espaço.txt'), 'temporário\n');
      mkdirSync(path.join(raiz, 'pasta nova', 'sub'), { recursive: true });
      writeFileSync(path.join(raiz, 'pasta nova', 'sub', 'arquivo.js'), '1\n');
      writeFileSync(path.join(raiz, 'scripts', 'bench', 'anotacao.txt'), 'preservar\n');
      writeFileSync(path.join(raiz, 'scripts', 'bench', 'tracked.txt'), 'bench alterado\n');

      await expect(restaurarArvore(raiz)).resolves.toEqual({ ok: true, motivo: '' });

      expect(readFileSync(path.join(raiz, 'tracked.txt'), 'utf8')).toBe('base\n');
      expect(readFileSync(path.join(raiz, 'docs', 'guia.md'), 'utf8')).toBe('base\n');
      expect(existsSync(path.join(raiz, 'rascunho com espaço.txt'))).toBe(false);
      expect(existsSync(path.join(raiz, 'pasta nova'))).toBe(false);
      expect(readFileSync(path.join(raiz, 'scripts', 'bench', 'anotacao.txt'), 'utf8')).toBe('preservar\n');
      expect(readFileSync(path.join(raiz, 'scripts', 'bench', 'tracked.txt'), 'utf8')).toBe('bench alterado\n');
    });
  });

  it('desfaz arquivo novo já adicionado ao índice', async () => {
    await comRepo(async (raiz) => {
      writeFileSync(path.join(raiz, 'adicionado.txt'), 'novo\n');
      git(raiz, 'add', 'adicionado.txt');

      await expect(restaurarArvore(raiz)).resolves.toEqual({ ok: true, motivo: '' });

      expect(existsSync(path.join(raiz, 'adicionado.txt'))).toBe(false);
      expect(git(raiz, 'status', '--porcelain=v1').trim()).toBe('');
    });
  });

  it('falha fechada em renomeação em vez de adivinhar o lado a restaurar', async () => {
    await comRepo(async (raiz) => {
      git(raiz, 'mv', 'tracked.txt', 'renomeado.txt');

      const resultado = await restaurarArvore(raiz);

      expect(resultado.ok).toBe(false);
      expect(resultado.motivo).toMatch(/renomeação\/cópia não suportada/);
      expect(resultado.motivo).toMatch(/renomeado\.txt/);
      // Nada foi tocado: o runner aborta e o estado fica para inspeção.
      expect(existsSync(path.join(raiz, 'renomeado.txt'))).toBe(true);
      expect(existsSync(path.join(raiz, 'tracked.txt'))).toBe(false);
    });
  });

  it('devolve ok quando não há nada a restaurar', async () => {
    await comRepo(async (raiz) => {
      writeFileSync(path.join(raiz, 'scripts', 'bench', 'nota.md'), 'do bench\n');
      await expect(restaurarArvore(raiz)).resolves.toEqual({ ok: true, motivo: '' });
    });
  });
});
