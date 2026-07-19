/**
 * Test Suite Architecture - Setup
 * Configuração centralizada para todos os testes
 * 
 * Este arquivo configura:
 * - Mocks globais (fetch, localStorage, crypto)
 * - Setup do React Testing Library
 * - Cleanup automático
 * - Matchers customizados
 * - Polyfills para ambiente Node.js/JSDOM
 */

// ============================================================================
// IMPORTS
// ============================================================================

// Polyfills
import { TextEncoder, TextDecoder } from 'util';

// Testing Library
import '@testing-library/jest-dom';
import { configure, cleanup } from '@testing-library/react';

// Custom matchers
import './matchers/index.js';

// ============================================================================
// POLYFILLS
// ============================================================================

// Polyfills para APIs do Node.js não disponíveis no JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill ReadableStream (necessário para undici funcionar corretamente)
// Nota: Usamos IIFE async + await import() em vez de require() para manter
// consistência com o padrão ES Module do projeto. O setup.js é transformado
// pelo Babel para CommonJS, então o require() funcionaria, mas o import()
// dinâmico é semanticamente mais consistente com o restante do código-fonte.
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

// Polyfill MessageChannel/MessagePort (necessário para undici em alguns ambientes)
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

// Polyfill localStorage para ambiente Node.js
if (typeof global.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// Polyfill matchMedia
if (typeof global.matchMedia === 'undefined') {
  global.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

// Polyfill IntersectionObserver
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      // Simula interseção imediata para que iframes com lazy loading
      // sejam renderizados nos testes sem necessidade de interação
      setTimeout(() => callback([{ isIntersecting: true }]), 0);
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  };
}

// Polyfill ResizeObserver
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  };
}

// Polyfill scrollTo
if (typeof global.scrollTo === 'undefined') {
  global.scrollTo = jest.fn();
}

// Mock global crypto.randomUUID para evitar duplicação em cada teste
if (typeof global.crypto === 'undefined' || !global.crypto.randomUUID) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill URL.revokeObjectURL para ambiente JSDOM (não implementado nativamente)
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = jest.fn();
}

// ============================================================================
// CONFIGURAÇÃO DO REACT TESTING LIBRARY
// ============================================================================

configure({
  // Tempo máximo de espera para findBy queries
  asyncUtilTimeout: 5000,
  // Container padrão para queries
  getElementError: (message, _container) => {
    const error = new Error(message);
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

// ============================================================================
// MOCK GLOBAIS
// ============================================================================

// Substituição direta do console.error para filtrar warnings conhecidos
// Não usa jest.spyOn para evitar conflitos com o ciclo de restauração do Jest entre suítes de teste
const originalConsoleError = console.error;

const REACT_DEPRECATION_WARNINGS = [
  'Warning: ReactDOM.render is no longer supported',
  'Warning: React.createFactory()',
];

const KNOWN_API_WARNINGS = [
  'API /api/posts retornou conteúdo inválido',
  'Isso geralmente significa que a rota API quebrou',
];

const ALL_FILTERS = [...REACT_DEPRECATION_WARNINGS, ...KNOWN_API_WARNINGS];

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    ALL_FILTERS.some(pattern => args[0].includes(pattern))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// ============================================================================
// CLEANUP AUTOMÁTICO
// ============================================================================

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// ============================================================================
// UTILIDADES GLOBAIS
// ============================================================================

/**
 * Cria um delay para testes assíncronos
 * @param {number} ms - Milissegundos para aguardar
 */
global.wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Suprime warnings específicos durante um teste
 * @param {Function} fn - Função a executar
 * @param {string|string[]} patterns - Padrões de warning para suprimir
 */
global.suppressWarnings = async (fn, patterns) => {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
  const originalWarn = console.warn;
  
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (!patternsArray.some(pattern => message.includes(pattern))) {
      originalWarn.apply(console, args);
    }
  };

  try {
    return await fn();
  } finally {
    console.warn = originalWarn;
  }
};

// ============================================================================
// INFORMAÇÕES DE DEBUG
// ============================================================================

console.log('🧪 Test Suite Architecture loaded');
console.log('📦 Node.js version:', process.version);
console.log('🎯 Environment:', process.env.NODE_ENV || 'test');