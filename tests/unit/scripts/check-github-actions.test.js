/** @jest-environment node */

import { describe, it, expect, jest } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_ACTIONS_SNAPSHOT_REL,
  DEFAULT_MAX_SNAPSHOT_AGE_HOURS,
  buildActionsSnapshot,
  buildRunsApiPath,
  evaluateActionsSnapshot,
  extractErrorLinesFromJobLog,
  fetchRecentWorkflowRuns,
  formatLogMetaEnd,
  formatLogMetaStart,
  parseDiagnosticsCliArgs,
  parseLogMeta,
  partitionFailedRuns,
  summarizeEslintLog,
  summarizeJestLog,
  summarizeRunsByWorkflow,
  summarizeWorkflowRuns,
} from '../../../scripts/diagnostics/github-actions-helper.js';

describe('github-actions-helper e run-with-log', () => {
  describe('buildRunsApiPath', () => {
    it('monta query com created>=YYYY-MM-DD, per_page e page', () => {
      const apiPath = buildRunsApiPath({
        repo: 'caminhar-deus/Caminhar',
        sinceDateIso: '2026-11-17T08:00:00.000Z',
        page: 2,
        perPage: 100,
      });

      expect(apiPath).toBe(
        '/repos/caminhar-deus/Caminhar/actions/runs?per_page=100&created=%3E%3D2026-11-17&page=2'
      );
    });
  });

  describe('fetchRecentWorkflowRuns', () => {
    const sevenDaysAgo = new Date('2026-11-17T09:00:00.000Z');

    it('pagina múltiplas páginas (>100 runs) e deduplica por id', async () => {
      const page1Runs = Array.from({ length: 100 }, (_, i) => ({
        id: 1000 + i,
        created_at: '2026-11-23T10:00:00.000Z',
        name: 'Lint & Test Coverage Gate',
        conclusion: 'success',
      }));
      const page2Runs = [
        // Duplicado da página 1 para validar deduplicação
        { id: 1099, created_at: '2026-11-23T10:00:00.000Z', name: 'Lint', conclusion: 'success' },
        { id: 2001, created_at: '2026-11-18T12:00:00.000Z', name: 'E2E', conclusion: 'failure' },
      ];

      const requestFn = jest.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          data: JSON.stringify({ total_count: 101, workflow_runs: page1Runs }),
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          data: JSON.stringify({ total_count: 101, workflow_runs: page2Runs }),
        });

      const result = await fetchRecentWorkflowRuns({
        repo: 'caminhar-deus/Caminhar',
        sevenDaysAgo,
        requestFn,
        perPage: 100,
        maxPages: 10,
      });

      expect(requestFn).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      expect(result.pagesFetched).toBe(2);
      expect(result.totalCount).toBe(101);
      expect(result.truncated).toBe(false);
      expect(result.recentRuns).toHaveLength(101);
      expect(result.latestRunOverall.id).toBe(1000);
    });

    it('interrompe paginação antecipadamente quando último run da página é anterior à janela', async () => {
      const page1Runs = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        created_at: i === 99 ? '2026-11-16T01:00:00.000Z' : '2026-11-22T10:00:00.000Z',
      }));

      const requestFn = jest.fn().mockResolvedValueOnce({
        statusCode: 200,
        data: JSON.stringify({ total_count: 250, workflow_runs: page1Runs }),
      });

      const result = await fetchRecentWorkflowRuns({
        repo: 'caminhar-deus/Caminhar',
        sevenDaysAgo,
        requestFn,
        perPage: 100,
        maxPages: 10,
      });

      expect(requestFn).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(result.pagesFetched).toBe(1);
      expect(result.truncated).toBe(false);
      expect(result.recentRuns).toHaveLength(99);
    });

    it('sinaliza truncated: true quando atinge maxPages ainda dentro da janela', async () => {
      const makePage = (offset) =>
        Array.from({ length: 5 }, (_, i) => ({
          id: offset + i,
          created_at: '2026-11-23T12:00:00.000Z',
        }));

      const requestFn = jest.fn()
        .mockResolvedValueOnce({ statusCode: 200, data: JSON.stringify({ total_count: 50, workflow_runs: makePage(1) }) })
        .mockResolvedValueOnce({ statusCode: 200, data: JSON.stringify({ total_count: 50, workflow_runs: makePage(10) }) });

      const result = await fetchRecentWorkflowRuns({
        repo: 'caminhar-deus/Caminhar',
        sevenDaysAgo,
        requestFn,
        perPage: 5,
        maxPages: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.pagesFetched).toBe(2);
      expect(result.truncated).toBe(true);
      expect(result.recentRuns).toHaveLength(10);
    });

    it('retorna { ok: false, statusCode } quando a API responde erro HTTP', async () => {
      const requestFn = jest.fn().mockResolvedValueOnce({ statusCode: 403, data: '{}' });

      const result = await fetchRecentWorkflowRuns({
        repo: 'caminhar-deus/Caminhar',
        sevenDaysAgo,
        requestFn,
      });

      expect(result).toEqual({ ok: false, statusCode: 403, page: 1 });
    });
  });

  describe('parseLogMeta, summarizeEslintLog e summarizeJestLog', () => {
    it('formata e extrai metadados [log-meta] de início e fim', () => {
      const startLine = formatLogMetaStart({
        startedAt: '2026-11-24T08:00:00.000Z',
        gitSha: '42541e0a',
        command: 'jest --coverage',
      });
      const endLine = formatLogMetaEnd({
        finishedAt: '2026-11-24T08:01:20.000Z',
        durationMs: 80000,
        exitCode: 0,
      });

      const parsed = parseLogMeta(`${startLine}\nsaida qualquer\n${endLine}\n`);
      expect(parsed).toEqual({
        startedAt: '2026-11-24T08:00:00.000Z',
        finishedAt: '2026-11-24T08:01:20.000Z',
        durationMs: 80000,
        exitCode: 0,
        gitSha: '42541e0a',
        command: 'jest --coverage',
      });
    });

    it('summarizeEslintLog trata arquivo 0B, arquivo limpo só com [log-meta] e arquivo com erro ESLint', () => {
      expect(summarizeEslintLog('', 0)).toMatchObject({ clean: true, problemLine: null, byteSize: 0 });

      const cleanContent = [
        formatLogMetaStart({ startedAt: '2026-11-24T08:00:00.000Z', gitSha: 'abc1234', command: 'eslint .' }),
        formatLogMetaEnd({ finishedAt: '2026-11-24T08:00:05.000Z', durationMs: 5000, exitCode: 0 }),
      ].join('\n');
      expect(summarizeEslintLog(cleanContent)).toMatchObject({ clean: true, problemLine: null });

      const dirtyContent = [
        formatLogMetaStart({ startedAt: '2026-11-24T08:00:00.000Z', gitSha: 'abc1234', command: 'eslint .' }),
        '/app/index.js:1:1 error Unused var',
        '✖ 1 problem (1 error, 0 warnings)',
        formatLogMetaEnd({ finishedAt: '2026-11-24T08:00:05.000Z', durationMs: 5000, exitCode: 1 }),
      ].join('\n');
      const dirtySummary = summarizeEslintLog(dirtyContent);
      expect(dirtySummary.clean).toBe(false);
      expect(dirtySummary.problemLine).toContain('1 problem');
    });

    it('summarizeJestLog resume execução aprovada e detecta falha por exit_code ou FAIL', () => {
      const okLog = [
        formatLogMetaStart({ startedAt: '2026-11-24T08:00:00.000Z', gitSha: 'abc1234', command: 'jest' }),
        'All files | 95.5 | 86.4 | 93.5 | 95.5 |',
        'Test Suites: 8 skipped, 245 passed, 245 of 253 total',
        'Tests:       96 skipped, 2110 passed, 2206 total',
        'Time:        20.1 s',
        formatLogMetaEnd({ finishedAt: '2026-11-24T08:00:20.100Z', durationMs: 20100, exitCode: 0 }),
      ].join('\n');

      const okSummary = summarizeJestLog(okLog);
      expect(okSummary.failed).toBe(false);
      expect(okSummary.allFilesCoverageLine).toContain('All files');
      expect(okSummary.suitesLine).toContain('245 passed');

      const failLog = [
        formatLogMetaStart({ startedAt: '2026-11-24T08:00:00.000Z', gitSha: 'abc1234', command: 'jest' }),
        'FAIL tests/unit/foo.test.js',
        formatLogMetaEnd({ finishedAt: '2026-11-24T08:00:02.000Z', durationMs: 2000, exitCode: 1 }),
      ].join('\n');
      expect(summarizeJestLog(failLog).failed).toBe(true);
    });

    it('detecta ruído real de console/act/jsdom em summarizeJestLog e ignora títulos de spec aprovados', () => {
      const cleanSpecTitlesLog = [
        'PASS tests/unit/tests-hygiene/console-no-global-assignment.test.js',
        '  ✓ nenhum arquivo sob tests/ faz atribuição direta a console.error (1 ms)',
        '  ✓ não emite erro jsdom 31 (Not implemented: navigation) ao clicar em <a> real (5 ms)',
        'Test Suites: 1 passed, 1 of 1 total',
      ].join('\n');

      const cleanSummary = summarizeJestLog(cleanSpecTitlesLog);
      expect(cleanSummary.hasConsoleNoise).toBe(false);
      expect(cleanSummary.consoleErrors).toBe(0);
      expect(cleanSummary.consoleWarns).toBe(0);
      expect(cleanSummary.actWarnings).toBe(0);
      expect(cleanSummary.jsdomNavigationErrors).toBe(0);

      const noisyLog = [
        '  console.error',
        '    Warning: An update to AdminPostsNew inside a test was not wrapped in act(...)',
        '  console.error',
        '    Error: Not implemented: navigation to another Document',
        '  console.warn',
        '    Aviso simulado',
        'Test Suites: 1 passed, 1 of 1 total',
      ].join('\n');

      const noisySummary = summarizeJestLog(noisyLog);
      expect(noisySummary.hasConsoleNoise).toBe(true);
      expect(noisySummary.consoleErrors).toBe(2);
      expect(noisySummary.consoleWarns).toBe(1);
      expect(noisySummary.actWarnings).toBe(1);
      expect(noisySummary.jsdomNavigationErrors).toBe(1);
    });
  });

  describe('parseDiagnosticsCliArgs, summarizeWorkflowRuns e snapshot offline', () => {
    it('interpreta flags CLI padrão e com valores explícitos', () => {
      expect(parseDiagnosticsCliArgs([])).toEqual({
        writeSnapshotPath: null,
        fromSnapshotPath: null,
        maxAgeHours: DEFAULT_MAX_SNAPSHOT_AGE_HOURS,
      });

      expect(
        parseDiagnosticsCliArgs([
          '--write-snapshot',
          'logs/custom.json',
          '--from-snapshot=logs/read.json',
          '--max-snapshot-age-hours',
          '12',
        ])
      ).toEqual({
        writeSnapshotPath: 'logs/custom.json',
        fromSnapshotPath: 'logs/read.json',
        maxAgeHours: 12,
      });

      expect(parseDiagnosticsCliArgs(['--write-snapshot', '--from-snapshot'])).toEqual({
        writeSnapshotPath: DEFAULT_ACTIONS_SNAPSHOT_REL,
        fromSnapshotPath: DEFAULT_ACTIONS_SNAPSHOT_REL,
        maxAgeHours: DEFAULT_MAX_SNAPSHOT_AGE_HOURS,
      });
    });

    it('resume runs por conclusão e constrói/valida snapshot sanitizado com controle de frescor', () => {
      const runsResult = {
        totalCount: 2,
        pagesFetched: 1,
        truncated: false,
        recentRuns: [
          {
            id: 1,
            run_number: 201,
            name: 'Lint & Test Coverage Gate',
            event: 'push',
            head_branch: 'main',
            conclusion: 'success',
            status: 'completed',
            created_at: '2026-11-24T06:00:00.000Z',
            html_url: 'https://github.com/caminhar-deus/Caminhar/actions/runs/1',
            head_commit: { id: 'abcdef123456', message: 'Fix ci\ndetails' },
            secret_token_field: 'should-not-leak',
          },
          {
            id: 2,
            run_number: 202,
            name: 'E2E',
            event: 'push',
            head_branch: 'main',
            conclusion: 'failure',
            status: 'completed',
            created_at: '2026-11-24T05:00:00.000Z',
            html_url: 'https://github.com/caminhar-deus/Caminhar/actions/runs/2',
          },
        ],
        latestRunOverall: { id: 1, name: 'Lint & Test Coverage Gate', conclusion: 'success', created_at: '2026-11-24T06:00:00.000Z' },
      };

      const summary = summarizeWorkflowRuns(runsResult.recentRuns);
      expect(summary.runsByConclusion).toEqual({ success: 1, failure: 1 });
      expect(summary.failedRuns).toHaveLength(1);

      const snapshot = buildActionsSnapshot({
        repo: 'caminhar-deus/Caminhar',
        capturedAt: '2026-11-24T08:00:00.000Z',
        sevenDaysAgo: '2026-11-17T08:00:00.000Z',
        runsResult,
        failedRunDetails: [{ runId: 2, jobs: [] }],
      });

      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.recentRuns[0]).not.toHaveProperty('secret_token_field');
      expect(snapshot.recentRuns[0].head_commit).toEqual({ id: 'abcdef123456', message: 'Fix ci' });

      const freshEval = evaluateActionsSnapshot(JSON.stringify(snapshot), {
        expectedRepo: 'caminhar-deus/Caminhar',
        now: new Date('2026-11-24T12:00:00.000Z'),
        maxAgeHours: 24,
      });
      expect(freshEval.valid).toBe(true);
      expect(freshEval.stale).toBe(false);
      expect(freshEval.ageHours).toBe(4);

      const staleEval = evaluateActionsSnapshot(snapshot, {
        expectedRepo: 'caminhar-deus/Caminhar',
        now: new Date('2026-11-26T10:00:00.000Z'),
        maxAgeHours: 24,
      });
      expect(staleEval.valid).toBe(true);
      expect(staleEval.stale).toBe(true);

      expect(
        evaluateActionsSnapshot(snapshot, { expectedRepo: 'outro/repo' }).valid
      ).toBe(false);
      expect(
        evaluateActionsSnapshot('{json-invalido', { expectedRepo: 'caminhar-deus/Caminhar' }).valid
      ).toBe(false);
    });

    it('extrai erros de alto sinal em logs do Jest e npm ci ignorando specs aprovados e npm help ci', () => {
      const jestRawLog = [
        '2026-11-18T20:20:34.3552493Z       ✓ em erro devolve fetchError com lista vazia (1 ms)',
        '2026-11-18T20:20:41.8935150Z     ✓ hook useToast deve suportar o status error (4 ms)',
        '2026-11-18T20:21:17.9672286Z       ✓ deve retornar [] para JSON inválido (fail-closed, sem lançar) (1 ms)',
        '2026-11-18T20:22:06.0582328Z Summary of all failing tests',
        '2026-11-18T20:22:06.0584439Z FAIL tests/unit/scripts/bench-ground-truth.test.js',
        '2026-11-18T20:22:06.0590000Z   ● Canário de ground truth › valida fatos',
        '2026-11-18T20:22:06.0600000Z     Expected: 10',
        '2026-11-18T20:22:06.0610000Z     Received: 9',
        '2026-11-18T20:22:06.0625738Z Test Suites: 1 failed, 8 skipped, 232 passed, 233 of 241 total',
        '2026-11-18T20:22:06.0626423Z Tests:       1 failed, 96 skipped, 1940 passed, 2037 total',
        '2026-11-18T20:22:06.5758435Z ##[error]Process completed with exit code 1.',
        '2026-11-18T20:22:06.5760000Z ##[end-action id=__self.__run;outcome=failure;conclusion=failure;duration_ms=100]',
      ].join('\n');

      const jestErrors = extractErrorLinesFromJobLog(jestRawLog, 15);
      expect(jestErrors.some((line) => line.includes('✓'))).toBe(false);
      expect(jestErrors.some((line) => line.includes('##[end-action'))).toBe(false);
      expect(jestErrors.some((line) => line.includes('FAIL tests/unit/scripts/bench-ground-truth.test.js'))).toBe(true);
      expect(jestErrors.some((line) => line.includes('Expected: 10'))).toBe(true);
      expect(jestErrors.some((line) => line.includes('##[error]Process completed with exit code 1.'))).toBe(true);

      const npmCiRawLog = [
        '2026-11-24T00:49:05.1000000Z npm error code EUSAGE',
        '2026-11-24T00:49:05.1010000Z npm error',
        '2026-11-24T00:49:05.1020000Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.',
        '2026-11-24T00:49:05.1030000Z npm error',
        '2026-11-24T00:49:05.1040000Z npm error Missing: foo@1.0.0 from lock file',
        '2026-11-24T00:49:05.1050000Z npm error',
        '2026-11-24T00:49:05.1060000Z npm error Usage: npm ci',
        '2026-11-24T00:49:05.2354867Z npm error   --workspaces',
        '2026-11-24T00:49:05.2355545Z npm error     Set to true to run the command in the context of **all** configured',
        '2026-11-24T00:49:05.2360869Z npm error aliases: clean-install, ic, install-clean, isntall-clean',
        '2026-11-24T00:49:05.2361987Z npm error Run "npm help ci" for more info',
        '2026-11-24T00:49:05.2905240Z ##[error]Process completed with exit code 1.',
      ].join('\n');

      const npmErrors = extractErrorLinesFromJobLog(npmCiRawLog, 15);
      expect(npmErrors.some((line) => line.includes('code EUSAGE'))).toBe(true);
      expect(npmErrors.some((line) => line.includes('in sync'))).toBe(true);
      expect(npmErrors.some((line) => line.includes('Missing: foo@1.0.0'))).toBe(true);
      expect(npmErrors.some((line) => line.includes('aliases:'))).toBe(false);
      expect(npmErrors.some((line) => line.includes('--workspaces'))).toBe(false);
      expect(npmErrors.some((line) => line.includes('Run "npm help ci"'))).toBe(false);

      const manyLines = Array.from({ length: 10 }, (_, idx) => `FAIL suite-${idx}.test.js`).join('\n');
      const capped = extractErrorLinesFromJobLog(manyLines, 4);
      expect(capped).toEqual([
        'FAIL suite-0.test.js',
        'FAIL suite-1.test.js',
        'FAIL suite-8.test.js',
        'FAIL suite-9.test.js',
      ]);
    });

    it('agrega execuções por workflow ordenadas pelo último run', () => {
      const grouped = summarizeRunsByWorkflow([
        {
          id: 10,
          run_number: 100,
          name: 'E2E Isolated (Cypress)',
          event: 'push',
          conclusion: 'failure',
          status: 'completed',
          created_at: '2026-11-23T23:51:43Z',
          head_commit: { id: 'ae84c1870000' },
        },
        {
          id: 11,
          run_number: 101,
          name: 'E2E Isolated (Cypress)',
          event: 'push',
          conclusion: 'success',
          status: 'completed',
          created_at: '2026-11-24T11:22:00Z',
          head_commit: { id: '0ab2716e0000' },
        },
        {
          id: 12,
          run_number: 52,
          name: 'Load Tests (k6)',
          event: 'schedule',
          conclusion: 'success',
          status: 'completed',
          created_at: '2026-11-24T14:55:04Z',
          head_commit: { id: '0ab2716e0000' },
        },
      ]);

      expect(grouped).toEqual([
        {
          name: 'Load Tests (k6)',
          total: 1,
          success: 1,
          failure: 0,
          other: 0,
          latest: {
            run_number: 52,
            id: 12,
            conclusion: 'success',
            status: 'completed',
            event: 'schedule',
            created_at: '2026-11-24T14:55:04Z',
            sha: '0ab2716e',
          },
        },
        {
          name: 'E2E Isolated (Cypress)',
          total: 2,
          success: 1,
          failure: 1,
          other: 0,
          latest: {
            run_number: 101,
            id: 11,
            conclusion: 'success',
            status: 'completed',
            event: 'push',
            created_at: '2026-11-24T11:22:00Z',
            sha: '0ab2716e',
          },
        },
      ]);
    });
  });

  describe('check-github-actions.js (CLI offline e contingência por snapshot)', () => {
    const diagScriptPath = path.resolve(process.cwd(), 'scripts/diagnostics/check-github-actions.js');

    it('exibe snapshot explícito com --from-snapshot sem rede/token e falha quando inválido', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminhar-diag-actions-'));
      try {
        const logsDir = path.join(tmpDir, 'logs');
        fs.mkdirSync(logsDir, { recursive: true });
        const snapPath = path.join(logsDir, 'custom-snap.json');
        const snapshot = buildActionsSnapshot({
          repo: 'caminhar-deus/Caminhar',
          capturedAt: new Date().toISOString(),
          sevenDaysAgo: new Date(Date.now() - 86400000).toISOString(),
          runsResult: {
            totalCount: 1,
            pagesFetched: 1,
            truncated: false,
            recentRuns: [
              {
                id: 501,
                run_number: 99,
                name: 'Lint & Test Coverage Gate',
                event: 'push',
                head_branch: 'main',
                conclusion: 'success',
                status: 'completed',
                created_at: new Date().toISOString(),
              },
            ],
          },
        });
        fs.writeFileSync(snapPath, JSON.stringify(snapshot), 'utf8');

        const output = execFileSync(
          process.execPath,
          [diagScriptPath, '--from-snapshot', 'logs/custom-snap.json'],
          {
            cwd: tmpDir,
            env: { ...process.env, GITHUB_TOKEN: '' },
            encoding: 'utf8',
          }
        );

        expect(output).toContain('FONTE: SNAPSHOT LOCAL (logs/custom-snap.json');
        expect(output).toContain('Resumo por workflow (últimos 7 dias):');
        expect(output).toContain('Lint & Test Coverage Gate: 1 execuções (1 OK, 0 falha(s))');
        expect(output).toContain('Run #99 (ID: 501)');
        expect(output).toContain('Nenhuma falha identificada');

        let invalidErr = null;
        try {
          execFileSync(
            process.execPath,
            [diagScriptPath, '--from-snapshot', 'logs/nao-existe.json'],
            {
              cwd: tmpDir,
              env: { ...process.env, GITHUB_TOKEN: '' },
              encoding: 'utf8',
              stdio: 'pipe',
            }
          );
        } catch (err) {
          invalidErr = err;
        }
        expect(invalidErr).not.toBeNull();
        expect(invalidErr.status).toBe(1);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('usa snapshot fresco automaticamente na contingência e recusa snapshot expirado mantendo NÃO VERIFICADO', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminhar-diag-fallback-'));
      try {
        const logsDir = path.join(tmpDir, 'logs');
        fs.mkdirSync(logsDir, { recursive: true });
        const defaultSnapPath = path.join(logsDir, 'github-actions-snapshot.json');

        const freshSnapshot = buildActionsSnapshot({
          repo: 'caminhar-deus/Caminhar',
          capturedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          sevenDaysAgo: new Date(Date.now() - 86400000).toISOString(),
          runsResult: {
            totalCount: 1,
            pagesFetched: 1,
            truncated: false,
            recentRuns: [
              {
                id: 700,
                run_number: 140,
                name: 'E2E',
                event: 'push',
                head_branch: 'main',
                conclusion: 'success',
                status: 'completed',
                created_at: new Date().toISOString(),
              },
            ],
          },
        });
        fs.writeFileSync(defaultSnapPath, JSON.stringify(freshSnapshot), 'utf8');

        const freshOut = execFileSync(process.execPath, [diagScriptPath], {
          cwd: tmpDir,
          env: { ...process.env, GITHUB_TOKEN: '' },
          encoding: 'utf8',
        });
        expect(freshOut).toContain('FONTE REMOTA: SNAPSHOT LOCAL PRÉ-COLETADO');
        expect(freshOut).toContain('Run #140 (ID: 700)');

        const staleSnapshot = {
          ...freshSnapshot,
          capturedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        };
        fs.writeFileSync(defaultSnapPath, JSON.stringify(staleSnapshot), 'utf8');

        const staleOut = execFileSync(process.execPath, [diagScriptPath], {
          cwd: tmpDir,
          env: { ...process.env, GITHUB_TOKEN: '' },
          encoding: 'utf8',
        });
        expect(staleOut).toContain('GitHub Actions remoto: status: NÃO VERIFICADO (contingência local)');
        expect(staleOut).toContain('Snapshot expirado');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('partitionFailedRuns separa falhas ativas (inclusive com run in_progress mais novo) de falhas históricas e CLI oculta falhas superadas', () => {
      const runs = [
        // Workflow A: falha antiga superada por success mais recente
        { id: 10, run_number: 10, name: 'Lint & Test Coverage Gate', conclusion: 'failure', status: 'completed', created_at: '2026-11-24T00:48:46Z' },
        { id: 11, run_number: 11, name: 'Lint & Test Coverage Gate', conclusion: 'success', status: 'completed', created_at: '2026-11-24T00:55:03Z' },
        // Workflow B: falha ativa no último concluído, mesmo havendo run em andamento depois
        { id: 20, run_number: 20, name: 'E2E Isolated (Cypress)', conclusion: 'failure', status: 'completed', created_at: '2026-11-27T01:00:00Z', html_url: 'https://github.com/caminhar-deus/Caminhar/actions/runs/20', head_commit: { id: 'abc1234', message: 'Quebrou E2E' } },
        { id: 21, run_number: 21, name: 'E2E Isolated (Cypress)', conclusion: null, status: 'in_progress', created_at: '2026-11-27T01:10:00Z' },
      ];

      const partitioned = partitionFailedRuns(runs);
      expect(partitioned.activeFailedRuns.map((r) => r.id)).toEqual([20]);
      expect(partitioned.resolvedFailedRuns.map((r) => r.id)).toEqual([10]);

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminhar-diag-active-fails-'));
      try {
        const logsDir = path.join(tmpDir, 'logs');
        fs.mkdirSync(logsDir, { recursive: true });

        // Caso 1: apenas falha histórica superada -> nenhuma falha ativa exibida
        const onlyResolvedSnap = buildActionsSnapshot({
          repo: 'caminhar-deus/Caminhar',
          capturedAt: new Date().toISOString(),
          sevenDaysAgo: new Date(Date.now() - 86400000).toISOString(),
          runsResult: {
            totalCount: 2,
            pagesFetched: 1,
            truncated: false,
            recentRuns: runs.slice(0, 2),
          },
          failedRunDetails: [{ runId: 10, jobs: [{ id: 1, name: 'lint', status: 'completed', conclusion: 'failure', failedSteps: [], tailErrors: ['npm error code EUSAGE'] }] }],
        });
        const snap1 = path.join(logsDir, 'resolved-only.json');
        fs.writeFileSync(snap1, JSON.stringify(onlyResolvedSnap), 'utf8');

        const outResolvedOnly = execFileSync(
          process.execPath,
          [diagScriptPath, '--from-snapshot', 'logs/resolved-only.json'],
          { cwd: tmpDir, env: { ...process.env, GITHUB_TOKEN: '' }, encoding: 'utf8' }
        );
        expect(outResolvedOnly).toContain('Nenhuma falha ativa!');
        expect(outResolvedOnly).not.toContain('INVESTIGAÇÃO DETALHADA DAS FALHAS');
        expect(outResolvedOnly).not.toContain('npm error code EUSAGE');

        // Caso 2: falha histórica + falha ativa -> exibe apenas a falha ativa #20 e omite #10
        const mixedSnap = buildActionsSnapshot({
          repo: 'caminhar-deus/Caminhar',
          capturedAt: new Date().toISOString(),
          sevenDaysAgo: new Date(Date.now() - 86400000).toISOString(),
          runsResult: {
            totalCount: 4,
            pagesFetched: 1,
            truncated: false,
            recentRuns: runs,
          },
          failedRunDetails: [
            { runId: 20, jobs: [{ id: 2, name: 'e2e', status: 'completed', conclusion: 'failure', failedSteps: [{ number: 5, name: 'Run Cypress' }], tailErrors: ['AssertionError: timed out'] }] },
          ],
        });
        const snap2 = path.join(logsDir, 'mixed.json');
        fs.writeFileSync(snap2, JSON.stringify(mixedSnap), 'utf8');

        const outMixed = execFileSync(
          process.execPath,
          [diagScriptPath, '--from-snapshot', 'logs/mixed.json'],
          { cwd: tmpDir, env: { ...process.env, GITHUB_TOKEN: '' }, encoding: 'utf8' }
        );
        expect(outMixed).toContain('INVESTIGAÇÃO DETALHADA DAS FALHAS ATIVAS (1 falha(s))');
        expect(outMixed).toContain('Falha no Run #20');
        expect(outMixed).not.toContain('Falha no Run #10');
        expect(outMixed).toContain('1 falha(s) histórica(s) já superada(s)');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('run-with-log.js (execução real)', () => {
    const wrapperPath = path.resolve(process.cwd(), 'scripts/diagnostics/run-with-log.js');

    it('grava [log-meta] de início e fim e preserva exit code 0', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminhar-run-with-log-'));
      try {
        const logRel = path.join(tmpDir, 'ok.log');
        execFileSync(
          process.execPath,
          [wrapperPath, logRel, '--', process.execPath, '-e', 'console.log("ok-run")'],
          { encoding: 'utf8' }
        );
        const content = fs.readFileSync(logRel, 'utf8');
        const meta = parseLogMeta(content);
        expect(content).toContain('ok-run');
        expect(meta.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(meta.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(meta.gitSha).toBeTruthy();
        expect(meta.exitCode).toBe(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('preserva exit code diferente de zero (exit code 2)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caminhar-run-with-log-'));
      try {
        const logRel = path.join(tmpDir, 'fail.log');
        let caught = null;
        try {
          execFileSync(
            process.execPath,
            [wrapperPath, logRel, '--', process.execPath, '-e', 'console.error("falha-simulada"); process.exit(2);'],
            { encoding: 'utf8', stdio: 'pipe' }
          );
        } catch (err) {
          caught = err;
        }
        expect(caught).not.toBeNull();
        expect(caught.status).toBe(2);
        const content = fs.readFileSync(logRel, 'utf8');
        const meta = parseLogMeta(content);
        expect(content).toContain('falha-simulada');
        expect(meta.exitCode).toBe(2);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
