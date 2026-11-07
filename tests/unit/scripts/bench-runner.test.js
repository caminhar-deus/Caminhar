/** @jest-environment node */
/**
 * Runner comum dos benches (`scripts/bench/runner-comum.js`).
 *
 * O que este teste protege é o que já falhou em produção silenciosamente:
 * `sessionID` não capturado (o turno 2 não tem sessão para continuar) e
 * timeout registrado como `excedeu: false` (execução parcial passava por
 * normal). O resto (catálogo e execução simples) é a base compartilhada pelos
 * dois runners.
 */
import { describe, it, expect, afterAll } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  catalogo, executar, executarSessao, lerTimeoutMin, sessionIdDaLinha, timeoutEmMs,
} from '../../../scripts/bench/runner-comum.js';
import { esperarArquivo } from '../../helpers/esperar-arquivo.js';

const temporarios = [];

afterAll(() => {
  for (const dir of temporarios) rmSync(dir, { recursive: true, force: true });
});

/** Cria um `opencode` falso no PATH e devolve o diretório do binário. */
async function comOpencodeFalso(script, cenario) {
  const bin = mkdtempSync(path.join(os.tmpdir(), 'bench-runner-bin-'));
  const anterior = process.env.PATH;
  temporarios.push(bin);
  writeFileSync(path.join(bin, 'opencode'), script);
  chmodSync(path.join(bin, 'opencode'), 0o755);
  process.env.PATH = `${bin}${path.delimiter}${anterior}`;
  try {
    return await cenario(bin);
  } finally {
    process.env.PATH = anterior;
  }
}

function pastaLimpa() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bench-runner-'));
  temporarios.push(dir);
  return dir;
}

describe('lerTimeoutMin', () => {
  it('aceita inteiro e fração positiva', () => {
    expect(lerTimeoutMin('20')).toBe(20);
    expect(lerTimeoutMin('0.05')).toBe(0.05);
  });

  it('recusa vazio, zero, negativo e texto, com o nome da flag na mensagem', () => {
    for (const valor of [undefined, '', '0', '-1', 'abc', '.5', '1.2.3']) {
      expect(() => lerTimeoutMin(valor)).toThrow(/--timeout-min exige um número > 0/);
    }
    expect(() => lerTimeoutMin('x', '--janela')).toThrow(/--janela exige um número > 0/);
  });
});

describe('timeoutEmMs', () => {
  it('converte minutos em milissegundos inteiros', () => {
    expect(timeoutEmMs(20)).toBe(1200000);
    expect(timeoutEmMs(0.05)).toBe(3000);
    expect(Number.isInteger(timeoutEmMs(0.1 / 3))).toBe(true);
  });
});

describe('sessionIdDaLinha', () => {
  it('extrai o sessionID de um evento e ignora linha inválida ou sem o campo', () => {
    expect(sessionIdDaLinha('{"type":"step_start","sessionID":"ses_abc"}')).toBe('ses_abc');
    expect(sessionIdDaLinha('{"type":"step_start"}')).toBeNull();
    expect(sessionIdDaLinha('não é json')).toBeNull();
    expect(sessionIdDaLinha('{"sessionID":42}')).toBeNull();
  });
});

describe('catalogo', () => {
  it('devolve os ids do catálogo e descarta linhas que não são modelo', async () => {
    await comOpencodeFalso(
      '#!/bin/sh\nprintf "opencode/modelo-a\\nopencode/modelo-b\\nlog qualquer\\n"\n',
      async () => {
        const ids = await catalogo(pastaLimpa());
        expect(ids).toEqual(new Set(['opencode/modelo-a', 'opencode/modelo-b']));
      }
    );
  });
});

describe('executarSessao', () => {
  it('grava a saída em streaming e captura o sessionID', async () => {
    const saida = [
      '{"type":"step_start","sessionID":"ses_teste_123"}',
      '{"type":"text","part":{"text":"resposta"}}',
      '',
    ].join('\n');
    await comOpencodeFalso(
      `#!/bin/sh\ncat <<'EOF'\n${saida}EOF\n`,
      async () => {
        const raiz = pastaLimpa();
        const arq = path.join(raiz, 'sessao.ndjson');

        const resultado = await executarSessao(raiz, ['run', 'tarefa'], arq, 5000);

        expect(resultado).toMatchObject({ codigo: 0, sessionID: 'ses_teste_123', excedeu: false });
        expect(readFileSync(arq, 'utf8')).toBe(saida);
      }
    );
  });

  it('marca excedeu quando o processo passa do timeout e não deixa pendurado', async () => {
    await comOpencodeFalso('#!/bin/sh\nexec sleep 30\n', async () => {
      const raiz = pastaLimpa();
      const arq = path.join(raiz, 'timeout.ndjson');
      const inicio = Date.now();

      const resultado = await executarSessao(raiz, ['run', 'tarefa'], arq, 250);

      expect(resultado.excedeu).toBe(true);
      expect(resultado.codigo).not.toBe(0);
      expect(Date.now() - inicio).toBeLessThan(5000);
      expect(existsSync(arq)).toBe(true);
    });
  });

  it('aborta a sessão pelo signal, preserva o parcial e devolve interrompido', async () => {
    await comOpencodeFalso(`#!/bin/sh
cat <<'EOF'
{"type":"step_start","sessionID":"ses_abortado"}
EOF
touch marcador-abort
exec sleep 30
`, async () => {
      const raiz = pastaLimpa();
      const arq = path.join(raiz, 'abort.ndjson');
      const controlador = new AbortController();

      const promessa = executarSessao(
        raiz, ['run', 'tarefa'], arq, 60000, { signal: controlador.signal }
      );
      await esperarArquivo(path.join(raiz, 'marcador-abort'));
      controlador.abort();

      const resultado = await promessa;

      expect(resultado).toMatchObject({
        interrompido: true,
        sessionID: 'ses_abortado',
        excedeu: false,
      });
      expect(resultado.codigo).not.toBe(0);
      expect(readFileSync(arq, 'utf8')).toContain('ses_abortado');
    });
  });
});

// `executar` é a base do `git status`/`git checkout` do `arvore.js`; um caminho
// com espaço precisa continuar sendo um argumento só.
describe('executar', () => {
  it('passa argumentos com espaço sem quebrar', async () => {
    const raiz = pastaLimpa();
    execFileSync('git', ['init', '-q'], { cwd: raiz });
    writeFileSync(path.join(raiz, 'arquivo com espaço.txt'), 'x\n');

    const resultado = await executar(raiz, 'git', ['status', '--porcelain=v1', '-z']);

    expect(resultado.codigo).toBe(0);
    expect(resultado.stdout).toContain('arquivo com espaço.txt');
  });
});
