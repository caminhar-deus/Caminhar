#!/usr/bin/env node

/**
 * Wrapper de execução para scripts `*:log`: grava metadados `[log-meta]`
 * (timestamp ISO-8601, commit SHA, comando, duração e exit code) no início e
 * no fim do arquivo de log enquanto espelha stdout/stderr no terminal.
 *
 * Uso:
 *   node scripts/diagnostics/run-with-log.js logs/tests-output.log -- jest
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { formatLogMetaEnd, formatLogMetaStart } from './github-actions-helper.js';

function resolveGitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function parseArgs(argv) {
  const sepIdx = argv.indexOf('--');
  if (sepIdx <= 0 || sepIdx === argv.length - 1) {
    return null;
  }
  const logFile = argv[0];
  const commandArgs = argv.slice(sepIdx + 1);
  return {
    logFile,
    cmd: commandArgs[0],
    args: commandArgs.slice(1),
  };
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    console.error('Uso: node scripts/diagnostics/run-with-log.js <log-file> -- <command> [args...]');
    process.exit(1);
  }

  const logPath = path.resolve(process.cwd(), parsed.logFile);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const gitSha = resolveGitSha();
  const commandStr = [parsed.cmd, ...parsed.args].join(' ');

  const logStream = fs.createWriteStream(logPath, { flags: 'w', encoding: 'utf8' });
  logStream.write(`${formatLogMetaStart({ startedAt, gitSha, command: commandStr })}\n`);

  const binDir = path.resolve(process.cwd(), 'node_modules', '.bin');
  const currentPath = process.env.PATH || '';
  const envPath = currentPath.split(path.delimiter).includes(binDir)
    ? currentPath
    : `${binDir}${path.delimiter}${currentPath}`;

  const child = spawn(parsed.cmd, parsed.args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PATH: envPath },
    shell: false,
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  let finished = false;
  const finalize = (exitCode, extraErrorLine = null) => {
    if (finished) return;
    finished = true;

    if (extraErrorLine) {
      process.stderr.write(`${extraErrorLine}\n`);
      logStream.write(`${extraErrorLine}\n`);
    }

    const finishedAtMs = Date.now();
    const endLine = formatLogMetaEnd({
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: Math.max(0, finishedAtMs - startedAtMs),
      exitCode,
    });
    logStream.end(`${endLine}\n`, () => {
      process.exit(exitCode);
    });
  };

  child.on('error', (err) => {
    finalize(1, `[run-with-log] Falha ao iniciar "${parsed.cmd}": ${err.message}`);
  });

  child.on('close', (code) => {
    finalize(typeof code === 'number' ? code : 1);
  });
}

main();
