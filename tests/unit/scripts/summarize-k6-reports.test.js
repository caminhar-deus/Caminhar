/**
 * Testes do digest da bateria k6 (`scripts/summarize-k6-reports.js`).
 *
 * Seguem o padrão de `check-hardcoded-credentials.test.js`: fixtures em
 * `fs.mkdtempSync(os.tmpdir())`, importando as funções REAIS do script — nada
 * da lógica de leitura/inventário/markdown é reimplementado aqui.
 *
 * O contrato mais importante testado é o de "nunca derrubar o job": diretório
 * ausente não lança e devolve a mensagem de não-gerados, e `GITHUB_STEP_SUMMARY`
 * setado escreve no arquivo (append) em vez de poluir o stdout do step.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { readReports, buildMarkdown, main } from '../../../scripts/summarize-k6-reports.js';

describe('summarize-k6-reports.js — digest da bateria k6', () => {
  let tmpDir;

  /** Escreve um `.json` de fixture no diretório temporário. */
  function writeJson(name, data) {
    fs.writeFileSync(path.join(tmpDir, name), JSON.stringify(data, null, 2), 'utf-8');
  }

  /** consolidação do orquestrador com 2 pass + 1 fail documentado. */
  function orchestratorFixture() {
    return {
      startTime: '2026-10-20T04:17:00.000Z',
      endTime: '2026-10-20T04:35:00.000Z',
      totalScripts: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      categories: [
        {
          name: '🧪 Performance Tests',
          total: 3,
          passed: 2,
          failed: 1,
          skipped: 0,
          scripts: [
            { name: 'musicas-load-test', status: 'pass' },
            { name: 'videos-load-test', status: 'pass' },
            {
              name: 'stress-test-combined',
              status: 'fail',
              exitCode: 99,
              details: {
                failedThresholds: [{ text: "http_req_duration{scenario:stress_test}: p(95) 3412 > 3000", counts: '234/240' }],
                failedChecks: [{ text: 'Checks de carga', counts: '3/5' }],
                consoleErrors: [],
              },
            },
          ],
        },
      ],
    };
  }

  /** Relatório k6 (payload de handleSummary) com gate de http_req_failed OK. */
  function reportFixtureA() {
    return {
      metrics: {
        http_req_duration: {
          type: 'trend',
          values: { 'p(95)': 412.5, avg: 120.1 },
          thresholds: { 'p(95)<2000': { ok: true } },
        },
        http_req_failed: {
          type: 'rate',
          values: { rate: 0 },
          thresholds: { 'rate<0.01': { ok: true } },
        },
        checks: { type: 'rate', values: { rate: 1 }, thresholds: { 'rate>0.95': { ok: true } } },
      },
    };
  }

  /** Relatório k6 com um threshold reprovado e SEM http_req_failed. */
  function reportFixtureB() {
    return {
      metrics: {
        http_req_duration: {
          type: 'trend',
          values: { 'p(95)': 810.7, avg: 300 },
          thresholds: { 'p(95)<500': { ok: false } },
        },
        checks: { type: 'rate', values: { rate: 0.7 }, thresholds: { 'rate>0.95': { ok: true } } },
      },
    };
  }

  /**
   * Relatório no formato LEGADO do k6 — o que os relatórios de 09/2026 ainda
   * guardados em `reports/k6-summaries/` têm: valores no PRÓPRIO objeto da
   * métrica (`'p(95)'` ao lado de `med`/`avg`) e o resultado do threshold como
   * BOOLEAN (`'p(95)<500': false`), não `{ ok: false }`. Sem o fallback, esses
   * relatórios apareceriam com p(95) `—` e os thresholds reprovados não seriam
   * contados.
   */
  function reportFixtureLegado() {
    return {
      metrics: {
        http_req_duration: {
          med: 16.5,
          'p(95)': 22.738,
          avg: 17.1,
          thresholds: { 'p(95)<500': false },
        },
        checks: { rate: 1, thresholds: { 'rate>0.95': true } },
      },
    };
  }

  let baseDir;

  beforeAll(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summarize-k6-'));
  });

  afterAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Diretório NOVO por teste: fixtures de um teste não podem vazar para a
    // varredura do próximo (todos leem o diretório inteiro).
    tmpDir = fs.mkdtempSync(path.join(baseDir, 'case-'));
  });

  afterEach(() => {
    delete process.env.GITHUB_STEP_SUMMARY;
    jest.restoreAllMocks();
  });

  describe('readReports() + buildMarkdown() — totais e duração', () => {
    it('reporta passed/total, reprovados e duração em minutos', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      writeJson('musicas_load_test.json', reportFixtureA());
      writeJson('videos_load_test.json', reportFixtureB());

      const { results, reports } = readReports(tmpDir);
      const md = buildMarkdown({ results, reports });

      expect(md).toContain('## Load tests (k6)');
      expect(md).toContain('**2/3 scripts passaram**');
      expect(md).toContain('1 reprovado(s)');
      // 04:17 → 04:35 = 18,0 min (formato pt-BR com vírgula).
      expect(md).toContain('duração 18,0 min');
      expect(md).toContain('2026-10-20T04:17:00.000Z → 2026-10-20T04:35:00.000Z');
    });
  });

  describe('buildMarkdown() — scripts reprovados', () => {
    it('lista o script reprovado com exitCode e thresholds/checks reprovados', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      const { results, reports } = readReports(tmpDir);
      const md = buildMarkdown({ results, reports });

      expect(md).toContain('### Scripts reprovados (1)');
      expect(md).toContain('`stress-test-combined` — exit code 99');
      expect(md).toContain('threshold reprovado: http_req_duration{scenario:stress_test}: p(95) 3412 > 3000 (234/240)');
      expect(md).toContain('check reprovado: Checks de carga (3/5)');
    });

    it('limita a seção de reprovados a ~20 linhas de corpo', () => {
      const fixture = orchestratorFixture();
      // 10 falhas × 2 detalhes cada = 20 linhas de corpo + 1 de truncamento.
      fixture.categories[0].scripts = Array.from({ length: 10 }, (_, i) => ({
        name: `falha-${i}`,
        status: 'fail',
        exitCode: 1,
        details: {
          failedThresholds: [{ text: 'a', counts: null }, { text: 'b', counts: null }],
          failedChecks: [{ text: 'c', counts: null }],
          consoleErrors: [],
        },
      }));
      fixture.failed = 10;
      fixture.passed = 0;
      writeJson('orchestrator-results.json', fixture);

      const { results, reports } = readReports(tmpDir);
      const md = buildMarkdown({ results, reports });
      const linhas = md.split('\n');
      const inicio = linhas.findIndex((l) => l.startsWith('### Scripts reprovados'));
      const fim = linhas.findIndex((l, i) => i > inicio && l.startsWith('### '));
      const secao = linhas.slice(inicio, fim === -1 ? undefined : fim);

      expect(secao.join('\n')).toContain('lista truncada');
      // Cabeçalho + título da seção + vazio + corpo: no máx. 23 linhas.
      expect(secao.length).toBeLessThanOrEqual(24);
    });
  });

  describe('buildMarkdown() — inventário de thresholds', () => {
    it('soma regras, marca reprovadas e conta quem declara http_req_failed', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      writeJson('alpha.json', reportFixtureA()); // 3 regras, 0 violadas, http_req_failed
      writeJson('beta.json', reportFixtureB()); // 2 regras, 1 violada, sem http_req_failed

      const { results, reports } = readReports(tmpDir);
      const md = buildMarkdown({ results, reports });

      // 3 + 2 = 5 regras em 2 relatórios; 1 reprovada (p(95)<500 do beta).
      expect(md).toContain('5 regras de threshold em 2 relatório(s); 1 reprovada(s).');
      // 1 de 2 declara http_req_failed, com a regra citada.
      expect(md).toContain('1 de 2 relatório(s) declaram gate de `http_req_failed` (regras: `rate<0.01`).');
    });
  });

  describe('buildMarkdown() — formato legado do k6', () => {
    it('lê p(95) inline e conta threshold booleano reprovado', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      writeJson('legado.json', reportFixtureLegado());

      const { results, reports } = readReports(tmpDir);
      const md = buildMarkdown({ results, reports });

      // Sem o fallback de `valoresDaMetrica`, esta linha sairia `| `legado` | — | 0 |`.
      expect(md).toContain('| `legado` | 22,7 ms | 1 |');
      // 2 regras (dur + checks), 1 reprovada (a booleana `false`).
      expect(md).toContain('2 regras de threshold em 1 relatório(s); 1 reprovada(s).');
    });
  });

  describe('readReports() — varredura de metrics', () => {
    it('NÃO conta orchestrator-results.json como relatório k6', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      writeJson('alpha.json', reportFixtureA());
      // JSON sem `metrics` qualquer também é ignorado (caso do próprio orchestrator).
      writeJson('sem-metrics.json', { foo: 'bar' });

      const { results, reports } = readReports(tmpDir);

      expect(results).not.toBeNull();
      expect(results.totalScripts).toBe(3);
      expect(reports.map((r) => r.name)).toEqual(['alpha']);
    });

    it('JSON inválido não derruba a varredura', () => {
      writeJson('quebrado.json', '{ "metrics": {');
      writeJson('alpha.json', reportFixtureA());

      const { reports } = readReports(tmpDir);

      expect(reports.map((r) => r.name)).toEqual(['alpha']);
    });
  });

  describe('main() — contrato de "nunca falhar o job"', () => {
    it('diretório inexistente não lança e devolve a mensagem de não-gerados', () => {
      const inexistente = path.join(tmpDir, 'nao-existe');
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      expect(() => main([inexistente], {})).not.toThrow();
      const texto = stdout.mock.calls.map((c) => String(c[0])).join('');
      expect(texto).toContain('não foram gerados');

      // Também pela composição pura (readReports + buildMarkdown).
      const md = buildMarkdown(readReports(inexistente));
      expect(md).toContain('não foram gerados');
    });

    it('GITHUB_STEP_SUMMARY setado escreve no arquivo (append) e não imprime no stdout', () => {
      writeJson('orchestrator-results.json', orchestratorFixture());
      writeJson('alpha.json', reportFixtureA());

      const summaryFile = path.join(tmpDir, 'step-summary.md');
      fs.writeFileSync(summaryFile, '### Conteúdo de um step anterior\n', 'utf-8');

      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      main([tmpDir], { GITHUB_STEP_SUMMARY: summaryFile });

      // Append: o conteúdo anterior sobrevive e o digest entra depois.
      const written = fs.readFileSync(summaryFile, 'utf-8');
      expect(written.startsWith('### Conteúdo de um step anterior\n')).toBe(true);
      expect(written).toContain('## Load tests (k6)');
      expect(written).toContain('**2/3 scripts passaram**');
      // Sem GITHUB_STEP_SUMMARY no env do emit, nada vai para o stdout.
      expect(stdout).not.toHaveBeenCalled();
    });
  });
});
