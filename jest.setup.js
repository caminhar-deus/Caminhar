// Opcional: estende o jest-dom para matchers personalizados como .toBeInTheDocument()
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Request/Response/Headers for JSDOM environment (required for Next.js Middleware & API tests)
// Note: Removed async/await to fix Jest parsing issues
if (typeof global.Request === 'undefined') {
  try {
    // Use require for compatibility with Jest's CommonJS environment
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

// Debug: Log module system info
console.log('Jest setup running with ES modules');
console.log('Node.js version:', process.version);
