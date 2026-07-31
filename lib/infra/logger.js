/**
 * Logger estruturado para todo o projeto.
 *
 * Recursos:
 * - Níveis hierárquicos configuráveis via `LOG_LEVEL` (error > warn > info > debug).
 *   Default inteligente por `NODE_ENV`: `error` em teste, `info` em produção,
 *   `debug` em desenvolvimento. `success` é tratado como alias de `info` para
 *   fins de nível.
 * - Saída JSON estruturada em produção (uma linha por log, parseável por
 *   ferramentas de observabilidade). Em desenvolvimento/teste, formato legível
 *   com emojis é preservado para não degradar a DX.
 * - Correlação via `requestId` usando `AsyncLocalStorage` do Node.js. O ID é
 *   injetado automaticamente quando definido via `setRequestId` ou
 *   `runWithRequestId`.
 * - Arquitetura de transports plugável: console (sempre ativo) + arquivo
 *   (opcional via `LOG_FILE_PATH`, com rotação simples por tamanho).
 * - Sanitização segura de `Error` e objetos circulares.
 *
 * Contrato público preservado:
 *   logger.<method>(module, message, ...args)
 * onde <method> ∈ { info, success, warn, error, debug }.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { appendFileSync, statSync, renameSync, existsSync } from 'node:fs';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const EMOJIS = { error: '❌', warn: '⚠️', info: 'ℹ️', success: '✅', debug: '🔍' };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const requestContext = new AsyncLocalStorage();

function resolveLogLevel() {
  const configured = process.env.LOG_LEVEL;
  if (configured && LEVELS[configured] !== undefined) return configured;
  const env = process.env.NODE_ENV;
  if (env === 'test') return 'error';
  if (env === 'production') return 'info';
  return 'debug';
}

function shouldLog(methodLevel, currentLevel) {
  const normalized = methodLevel === 'success' ? 'info' : methodLevel;
  return LEVELS[normalized] <= LEVELS[currentLevel];
}

export function setRequestId(id) {
  requestContext.enterWith(id);
}

export function runWithRequestId(id, fn) {
  return requestContext.run(id, fn);
}

function getRequestId() {
  return requestContext.getStore();
}

function safeSerialize(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value !== 'object') return value;

  if (value instanceof Error) {
    const errObj = { name: value.name, message: value.message };
    if (value.stack) errObj.stack = value.stack;
    for (const key of Object.keys(value)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        errObj[key] = safeSerialize(value[key], depth + 1, seen);
      }
    }
    return errObj;
  }

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((v) => safeSerialize(v, depth + 1, seen));
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();

    const result = {};
    for (const key of Object.keys(value)) {
      if (depth >= 10) { result[key] = '[MaxDepth]'; continue; }
      try {
        result[key] = safeSerialize(value[key], depth + 1, seen);
      } catch {
        result[key] = '[Unserializable]';
      }
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function consoleTransport(formatted, methodLevel) {
  if (methodLevel === 'error') console.error(formatted);
  else if (methodLevel === 'warn') console.warn(formatted);
  else console.log(formatted);
}

function fileTransport(formatted, filePath) {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        renameSync(filePath, `${filePath}.1`);
      }
    }
    appendFileSync(filePath, formatted + '\n', 'utf8');
  } catch {
    // falha silenciosa no file transport — não deve quebrar a aplicação
  }
}

function buildJsonLine(level, module, message, args, requestId) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(requestId ? { requestId } : {}),
    ...(args.length > 0 ? { args } : {}),
  };
  return JSON.stringify(record);
}

function formatReadable(methodLevel, module, message, args) {
  const emoji = EMOJIS[methodLevel] || '';
  const prefix = `[${module}] ${emoji} ${message}`;
  if (args.length === 0) return prefix;
  const formattedArgs = args.map((a) => {
    if (typeof a === 'string') return a;
    return JSON.stringify(a);
  });
  return `${prefix} ${formattedArgs.join(' ')}`;
}

function log(methodLevel, module, message, ...args) {
  const currentLevel = resolveLogLevel();
  if (!shouldLog(methodLevel, currentLevel)) return;

  const requestId = getRequestId();
  const sanitizedArgs = args.map((a) => safeSerialize(a));
  const isProduction = process.env.NODE_ENV === 'production';
  const filePath = process.env.LOG_FILE_PATH;
  const normalizedLevel = methodLevel === 'success' ? 'info' : methodLevel;

  const needsJson = isProduction || Boolean(filePath);
  let jsonLine = null;
  if (needsJson) {
    jsonLine = buildJsonLine(normalizedLevel, module, message, sanitizedArgs, requestId);
  }

  if (isProduction) {
    consoleTransport(jsonLine, methodLevel);
  } else {
    const line = formatReadable(methodLevel, module, message, sanitizedArgs);
    consoleTransport(line, methodLevel);
  }

  if (filePath) {
    fileTransport(jsonLine, filePath);
  }
}

export const logger = {
  info(module, message, ...args) { log('info', module, message, ...args); },
  success(module, message, ...args) { log('success', module, message, ...args); },
  warn(module, message, ...args) { log('warn', module, message, ...args); },
  error(module, message, ...args) { log('error', module, message, ...args); },
  debug(module, message, ...args) { log('debug', module, message, ...args); },
};