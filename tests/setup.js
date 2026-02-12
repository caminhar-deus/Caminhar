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

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { cleanup } from '@testing-library/react';

// ============================================================================
// POLYFILLS
// ============================================================================

// Polyfills para APIs do Node.js não disponíveis no JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Request/Response/Headers para JSDOM (necessário para Next.js Middleware & API tests)
if (typeof global.Request === 'undefined') {
  try {
    const undici = require('undici');
    if (undici && undici.Request) {
      global.Request = undici.Request;
      global.Response = undici.Response;
      global.Headers = undici.Headers;
    }
  } catch (error) {
    console.warn('⚠️ undici not found, Request/Response/Headers polyfills skipped.');
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
        args[0].includes('Warning: React.createFactory()')
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
// MATCHERS CUSTOMIZADOS
// ============================================================================

/**
 * Verifica se a resposta HTTP tem o status esperado
 * Uso: expect(res).toHaveStatus(200)
 */
expect.extend({
  toHaveStatus(received, expected) {
    const status = received.status || received._getStatusCode?.() || received.statusCode;
    const pass = status === expected;
    
    if (pass) {
      return {
        message: () => `expected status not to be ${expected}`,
        pass: true,
      };
    }
    return {
      message: () => `expected status to be ${expected}, but received ${status}`,
      pass: false,
    };
  },
});

/**
 * Verifica se a resposta contém JSON válido e opcionalmente dados esperados
 * Uso: expect(res).toBeValidJSON() ou expect(res).toBeValidJSON({ id: 1 })
 */
expect.extend({
  toBeValidJSON(received, expected) {
    let data;
    try {
      const body = received.data || received._getData?.() || received.body;
      data = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      return {
        message: () => `expected valid JSON, but parsing failed: ${e.message}`,
        pass: false,
      };
    }

    if (expected !== undefined) {
      const pass = this.equals(data, expect.objectContaining(expected));
      if (!pass) {
        return {
          message: () => `expected JSON to match ${this.printExpected(expected)}, but got ${this.printReceived(data)}`,
          pass: false,
        };
      }
    }

    return {
      message: () => `expected invalid JSON`,
      pass: true,
    };
  },
});

/**
 * Verifica se a resposta tem o header esperado
 * Uso: expect(res).toHaveHeader('content-type', 'application/json')
 */
expect.extend({
  toHaveHeader(received, headerName, expectedValue) {
    const headers = received.headers || received.getHeaders?.() || {};
    const actualValue = headers[headerName.toLowerCase()];
    
    if (expectedValue === undefined) {
      const pass = actualValue !== undefined;
      return {
        message: () => pass 
          ? `expected header "${headerName}" not to exist`
          : `expected header "${headerName}" to exist`,
        pass,
      };
    }

    const pass = actualValue === expectedValue || 
      (Array.isArray(actualValue) && actualValue.includes(expectedValue));
    
    return {
      message: () => pass
        ? `expected header "${headerName}" not to be "${expectedValue}"`
        : `expected header "${headerName}" to be "${expectedValue}", but got "${actualValue}"`,
      pass,
    };
  },
});

/**
 * Verifica se uma data está no formato ISO 8601 válido
 * Uso: expect(dateString).toBeISODate()
 */
expect.extend({
  toBeISODate(received) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const pass = typeof received === 'string' && isoDateRegex.test(received);
    
    return {
      message: () => pass
        ? `expected "${received}" not to be a valid ISO date`
        : `expected "${received}" to be a valid ISO date`,
      pass,
    };
  },
});

/**
 * Verifica se um objeto tem todas as propriedades esperadas
 * Uso: expect(obj).toHaveProperties(['id', 'name', 'email'])
 */
expect.extend({
  toHaveProperties(received, properties) {
    const missing = properties.filter(prop => !(prop in received));
    const pass = missing.length === 0;
    
    return {
      message: () => pass
        ? `expected object not to have properties ${this.printExpected(properties)}`
        : `expected object to have properties, but missing: ${this.printExpected(missing)}`,
      pass,
    };
  },
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

// ============================================================================
// MATCHERS CUSTOMIZADOS
// ============================================================================

/**
 * Verifica se a resposta HTTP tem o status esperado
 * Uso: expect(res).toHaveStatus(200)
 */
expect.extend({
  toHaveStatus(received, expected) {
    // Suporta diferentes formatos de resposta do node-mocks-http
    let status;
    
    if (typeof received._getStatusCode === 'function') {
      // node-mocks-http
      status = received._getStatusCode();
    } else if (typeof received.status === 'number') {
      // fetch Response ou express res
      status = received.status;
    } else if (typeof received.statusCode === 'number') {
      // http.ServerResponse
      status = received.statusCode;
    } else if (received.statusCode !== undefined) {
      status = received.statusCode;
    } else {
      status = undefined;
    }
    
    const pass = status === expected;
    
    return {
      message: () => {
        const receivedStr = this.utils.printReceived(status);
        const expectedStr = this.utils.printExpected(expected);
        
        if (pass) {
          return `expected status not to be ${expectedStr}`;
        }
        return `expected status to be ${expectedStr}, but received ${receivedStr}`;
      },
      pass,
    };
  },
});

/**
 * Verifica se a resposta contém JSON válido e opcionalmente dados esperados
 * Uso: expect(res).toBeValidJSON() ou expect(res).toBeValidJSON({ id: 1 })
 */
expect.extend({
  toBeValidJSON(received, expected) {
    let data;
    
    try {
      // Extrai o corpo da resposta de diferentes formatos
      const body = received.data || 
                   received._getData?.() || 
                   received.body ||
                   received;
      
      // Parse se for string
      data = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      return {
        message: () => `expected valid JSON, but parsing failed: ${e.message}`,
        pass: false,
      };
    }

    // Se não há expectation específica, apenas verifica se é JSON válido
    if (expected === undefined) {
      return {
        message: () => `expected invalid JSON, but received valid JSON: ${this.utils.printReceived(data)}`,
        pass: true,
      };
    }

    // Verifica se o JSON contém os dados esperados
    const pass = this.equals(data, expect.objectContaining(expected));
    
    return {
      message: () => {
        if (pass) {
          return `expected JSON not to contain ${this.utils.printExpected(expected)}`;
        }
        return `expected JSON to contain ${this.utils.printExpected(expected)}, but got ${this.utils.printReceived(data)}`;
      },
      pass,
    };
  },
});

/**
 * Verifica se a resposta HTTP tem um header específico
 * Uso: expect(res).toHaveHeader('content-type');
 * Uso: expect(res).toHaveHeader('content-type', 'application/json');
 */
expect.extend({
  toHaveHeader(received, headerName, expectedValue) {
    // Extrai headers de diferentes formatos
    const headers = received.headers || 
                    received.getHeaders?.() || 
                    received._getHeaders?.() ||
                    {};
    
    const normalizedName = headerName.toLowerCase();
    const actualValue = headers[headerName] || 
                       headers[normalizedName] ||
                       headers[headerName.toUpperCase()];
    
    // Se não foi especificado valor, apenas verifica existência
    if (expectedValue === undefined) {
      const pass = actualValue !== undefined;
      
      return {
        message: () => {
          if (pass) {
            return `expected header "${headerName}" not to exist, but it was set to "${actualValue}"`;
          }
          return `expected header "${headerName}" to exist, but it was not found in ${this.utils.printReceived(Object.keys(headers))}`;
        },
        pass,
      };
    }

    // Verifica se o valor corresponde
    const pass = actualValue === expectedValue || 
      (Array.isArray(actualValue) && actualValue.includes(expectedValue));
    
    return {
      message: () => {
        const expectedStr = this.utils.printExpected(expectedValue);
        const receivedStr = this.utils.printReceived(actualValue);
        
        if (pass) {
          return `expected header "${headerName}" not to be ${expectedStr}, but it was`;
        }
        return `expected header "${headerName}" to be ${expectedStr}, but got ${receivedStr}`;
      },
      pass,
    };
  },
});

/**
 * Verifica se uma string está em formato ISO 8601
 * Uso: expect(dateString).toBeISODate();
 */
expect.extend({
  toBeISODate(received) {
    // Padrão ISO 8601 completo: 2024-01-15T10:30:00.000Z ou 2024-01-15T10:30:00Z
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    
    // Verifica se é uma string
    if (typeof received !== 'string') {
      return {
        message: () => `expected ISO date string, but received ${this.utils.printReceived(typeof received)}`,
        pass: false,
      };
    }
    
    // Verifica o formato
    const isValidFormat = isoDateRegex.test(received);
    
    // Verifica se é uma data válida
    const date = new Date(received);
    const isValidDate = !isNaN(date.getTime());
    
    const pass = isValidFormat && isValidDate;
    
    return {
      message: () => {
        if (pass) {
          return `expected "${received}" not to be a valid ISO date`;
        }
        if (!isValidFormat) {
          return `expected "${received}" to match ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)`;
        }
        return `expected "${received}" to be a valid date, but got Invalid Date`;
      },
      pass,
    };
  },
});

/**
 * Verifica se um array ou objeto tem uma propriedade específica
 * Uso: expect(obj).toHaveProperty('name');
 */
expect.extend({
  toHaveProperties(received, properties) {
    const receivedKeys = typeof received === 'object' && received !== null 
      ? Object.keys(received) 
      : [];
    const missing = properties.filter(prop => !receivedKeys.includes(prop));
    const pass = missing.length === 0;
    
    return {
      message: () => {
        if (pass) {
          return `expected object not to have properties ${this.utils.printExpected(properties)}`;
        }
        return `expected object to have all properties, but missing: ${this.utils.printExpected(missing)}`;
      },
      pass,
    };
  },
});
