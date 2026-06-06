/**
 * Test Suite Setup — Banco Real (node environment)
 * 
 * Configuração específica para testes de integração com PostgreSQL real.
 * Versão enxuta do tests/setup.js sem polyfills DOM (localStorage,
 * matchMedia, IntersectionObserver, ResizeObserver) que são desnecessários
 * no ambiente 'node'.
 * 
 * Inclui apenas:
 * - Polyfills de APIs Node.js (ReadableStream, MessageChannel)
 * - Custom matchers
 * - Filtro de console.error para warnings conhecidos
 */

// ============================================================================
// IMPORTS
// ============================================================================

// Custom matchers
import './matchers/index.js';

// ============================================================================
// POLYFILLS
// ============================================================================

// Polyfill ReadableStream (necessário para testcontainers/undici)
(async () => {
  if (typeof globalThis.ReadableStream === 'undefined') {
    try {
      const { ReadableStream } = await import('node:stream/web');
      globalThis.ReadableStream = ReadableStream;
    } catch (e) {
      console.warn(`⚠️ Polyfill ReadableStream failed: ${e.message}`);
    }
  }
})();

// Polyfill MessageChannel/MessagePort (necessário para testcontainers)
(async () => {
  if (typeof globalThis.MessageChannel === 'undefined') {
    try {
      const { MessageChannel, MessagePort } = await import('node:worker_threads');
      globalThis.MessageChannel = MessageChannel;
      globalThis.MessagePort = MessagePort;
    } catch (e) {
      console.warn(`⚠️ Polyfill MessageChannel failed: ${e.message}`);
    }
  }
})();

// ============================================================================
// FILTRO DE console.error
// ============================================================================

const originalConsoleError = console.error;

const KNOWN_API_WARNINGS = [
  'API /api/posts retornou conteúdo inválido',
  'Isso geralmente significa que a rota API quebrou',
];

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    KNOWN_API_WARNINGS.some(pattern => args[0].includes(pattern))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// ============================================================================
// CLEANUP AUTOMÁTICO
// ============================================================================

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// INFORMAÇÕES DE DEBUG
// ============================================================================

console.log('🧪 DB Test Suite loaded (node environment)');
console.log('📦 Node.js version:', process.version);