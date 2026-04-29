/**
 * Test Suite Architecture - Setup
 * Configuração centralizada para todos os testes
 * 
 * Este arquivo configura:
 * - Mocks globais (fetch, localStorage)
 * - Setup do React Testing Library
 * - Cleanup automático
 * - Matchers customizados
 * - Polyfills para ambiente Node.js/JSDOM
 */

// Import jest-dom matchers for extended assertions
import '@testing-library/jest-dom';
// Import custom matchers
import './matchers/index.js';
import { TextEncoder, TextDecoder } from 'util';
import { cleanup } from '@testing-library/react';

// ============================================================================
// POLYFILLS
// ============================================================================

// Polyfills para APIs do Node.js não disponíveis no JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill ReadableStream (necessário para undici funcionar corretamente)
if (typeof globalThis.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('node:stream/web');
    globalThis.ReadableStream = ReadableStream;
  } catch (e) {}
}

// Polyfill MessageChannel/MessagePort (necessário para undici em alguns ambientes)
if (typeof globalThis.MessageChannel === 'undefined') {
  try {
    const { MessageChannel, MessagePort } = require('node:worker_threads');
    globalThis.MessageChannel = MessageChannel;
    globalThis.MessagePort = MessagePort;
  } catch (e) {}
}

// Polyfill Request/Response/Headers para JSDOM (necessário para Next.js Middleware & API tests)
if (!globalThis.Request) {
  try {
    const { Request, Response, Headers } = require('undici');
    globalThis.Request = Request;
    globalThis.Response = Response;
    globalThis.Headers = Headers;
  } catch (error) {
    console.warn('⚠️ undici not found, Request/Response/Headers polyfills skipped. Error:', error.message);
  }
}

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

// ============================================================================
// CONFIGURAÇÃO DO REACT TESTING LIBRARY
// ============================================================================

// Configuração do screen para debugging mais fácil
import { configure } from '@testing-library/react';

configure({
  // Tempo máximo de espera para findBy queries
  asyncUtilTimeout: 5000,
  // Container padrão para queries
  getElementError: (message, container) => {
    const error = new Error(message);
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

// ============================================================================
// MOCK GLOBAIS
// ============================================================================

// Mock do console.error para reduzir ruído em testes
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Filtra erros conhecidos que não são relevantes para testes
    if (
      typeof args[0] === 'string' &&
      (
        args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: React.createFactory()') ||
        args[0].includes('API /api/posts retornou conteúdo inválido') ||
        args[0].includes('Isso geralmente significa que a rota API quebrou')
      )
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// ============================================================================
// CLEANUP AUTOMÁTICO
// ============================================================================

// Limpa o DOM após cada teste para evitar vazamento de estado
afterEach(() => {
  cleanup();
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

