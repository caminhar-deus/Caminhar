/** @jest-environment node */
/**
 * E2E do caminho de timeout do runner de papéis (`scripts/bench/papeis/rodar.js`).
 *
 * O teste unitário do runner comum prova que `executarSessao()` marca
 * `excedeu: true`; ele não prova o que o runner de papéis FAZ com isso. Aqui a
 * bateria roda de verdade numa fixture git mínima, com `opencode` falso e
 * `--timeout-min 0.05` (3 s): o objetivo é fechar o risco de o timeout só
 * existir no teste unitário.
 *
 * A fixture também prova as duas guardas em volta da sessão:
 * - timeout não pula a restauração (rastreado volta, não rastreado some,
 *   `repoRestaurado: true` e `.meta.json` com `excedeuTimeout: true`);
 * - commit do agente muda HEAD, a restauração falha fechada e a bateria aborta
 *   com código 1 sem mascarar o commit.
 *
 * O bench real nunca roda nesta fixture: `opencode` é um script `sh` no PATH.
 */
import { describe, it, expect, afterAll } from '@jest/globals';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.setTimeout(60000);

const RAIZ_PROJETO = process.cwd();
const temporarios = [];

afterAll(() => {
  for (const dir of temporarios) rmSync(dir, { recursive: true, force: true });
});

function git(raiz, ...args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Copia um arquivo do projeto preservando o caminho relativo. */
function copiarDoProjeto(raiz, relativo) {
  const destino = path.join(raiz, relativo);
  mkdirSync(path.dirname(destino), { recursive: true });
  cpSync(path.join(RAIZ_PROJETO, relativo), destino);
}

/**
 * Fixture mínima que passa no preflight do designer: o runner copiado de
 * `scripts/bench` resolve o próprio `RAIZ` e confere os instrumentos no disco.
 * `resultados/` fica fora da cópia para o teste não herdar `.ndjson` antigo.
 */
function criarFixture(scriptOpencode) {
  const raiz = mkdtempSync(path.join(os.tmpdir(), 'bench-papeis-e2e-'));
  temporarios.push(raiz);

  cpSync(path.join(RAIZ_PROJETO, 'scripts', 'bench'), path.join(raiz, 'scripts', 'bench'), {
    recursive: true,
    filter: (origem) => path.basename(origem) !== 'resultados',
  });

  for (const relativo of [
    'design-system/MASTER.md',
    'pages/styles/variables.css',
    'components/UI/Button.module.css',
    'components/UI/Input.module.css',
    'components/UI/BaseCard.module.css',
  ]) {
    copiarDoProjeto(raiz, relativo);
  }

  writeFileSync(path.join(raiz, '.ai-memory.toml'), 'workspace = "default"\nproject = "bench"\n');
  writeFileSync(
    path.join(raiz, '.gitignore'),
    'scripts/bench/orchestrator/resultados/*\nscripts/bench/papeis/resultados/*\n'
  );
  writeFileSync(path.join(raiz, 'tracked.txt'), 'base\n');

  const bin = path.join(raiz, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, 'opencode'), scriptOpencode);
  chmodSync(path.join(bin, 'opencode'), 0o755);

  git(raiz, 'init', '-q');
  git(raiz, 'config', 'user.email', 'bench@teste.local');
  git(raiz, 'config', 'user.name', 'Bench Teste');
  git(raiz, 'add', '-A');
  git(raiz, 'commit', '-qm', 'base');
  return raiz;
}

function rodarRunner(raiz, modelo, timeoutMin = '0.05') {
  return spawnSync(
    process.execPath,
    [
      'scripts/bench/papeis/rodar.js',
      '--agente', 'designer',
      '--modelo', modelo,
      '--repeticoes', '1',
      '--timeout-min', timeoutMin,
    ],
    {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 45000,
      env: {
        ...process.env,
        PATH: `${path.join(raiz, 'bin')}${path.delimiter}${process.env.PATH}`,
      },
    }
  );
}

function lerMeta(raiz, base) {
  return JSON.parse(readFileSync(path.join(raiz, 'scripts', 'bench', 'papeis', 'resultados', `${base}.meta.json`), 'utf8'));
}

describe('runner de papéis — E2E do timeout', () => {
  it('mata a sessão, registra o timeout e restaura a árvore', () => {
    const raiz = criarFixture(`#!/bin/sh
if [ "$1" = "models" ]; then
  printf 'opencode/fake-timeout\\n'
  exit 0
fi
if [ "$1" = "run" ]; then
  printf '{"type":"step_start","sessionID":"ses_fake_timeout"}\\n'
  printf 'sujeira do timeout\\n' > tracked.txt
  printf 'novo do timeout\\n' > nao-rastreado.txt
  exec sleep 120
fi
exit 0
`);

    const resultado = rodarRunner(raiz, 'opencode/fake-timeout');

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toMatch(/TIMEOUT depois de 0\.05 min/);
    expect(resultado.stdout).toMatch(/session=ses_fake_timeout/);

    const meta = lerMeta(raiz, 'designer-fake-timeout-1');
    expect(meta.sessionID).toBe('ses_fake_timeout');
    expect(meta.excedeuTimeout).toBe(true);
    expect(meta.codigoSaida).toBeNull();
    expect(meta.repoRestaurado).toBe(true);

    expect(readFileSync(path.join(raiz, 'tracked.txt'), 'utf8')).toBe('base\n');
    expect(existsSync(path.join(raiz, 'nao-rastreado.txt'))).toBe(false);
    expect(git(raiz, 'status', '--porcelain=v1').trim()).toBe('');
  });

  it('aborta a bateria quando o agente commita, sem mascarar o commit', () => {
    const raiz = criarFixture(`#!/bin/sh
if [ "$1" = "models" ]; then
  printf 'opencode/fake-commit\\n'
  exit 0
fi
if [ "$1" = "run" ]; then
  printf '{"type":"step_start","sessionID":"ses_fake_commit"}\\n'
  printf 'trabalho do agente\\n' > tracked.txt
  git add tracked.txt
  git commit -qm 'commit do agente'
  exit 0
fi
exit 0
`);

    const resultado = rodarRunner(raiz, 'opencode/fake-commit', '1');

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toMatch(/repo não restaurado/);
    expect(resultado.stderr).toMatch(/HEAD mudou/);
    expect(resultado.stderr).toMatch(/commitou/);

    const meta = lerMeta(raiz, 'designer-fake-commit-1');
    expect(meta.sessionID).toBe('ses_fake_commit');
    expect(meta.repoRestaurado).toBe(false);

    // O commit do agente continua no lugar para inspeção — a guarda não o desfaz.
    expect(git(raiz, 'log', '-1', '--format=%s').trim()).toBe('commit do agente');
    expect(readFileSync(path.join(raiz, 'tracked.txt'), 'utf8')).toBe('trabalho do agente\n');
  });
});
