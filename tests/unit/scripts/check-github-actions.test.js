/** @jest-environment node */

import { describe, it, expect, jest } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRunsApiPath,
  fetchRecentWorkflowRuns,
  formatLogMetaEnd,
  formatLogMetaStart,
  parseLogMeta,
  summarizeEslintLog,
  summarizeJestLog,
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
