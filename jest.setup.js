// Opcional: estende o jest-dom para matchers personalizados como .toBeInTheDocument()
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Request/Response/Headers for JSDOM environment (required for Next.js Middleware & API tests)
if (typeof global.Request === 'undefined') {
  try {
    const { Request, Response, Headers } = await import('undici');
    global.Request = Request;
    global.Response = Response;
    global.Headers = Headers;
  } catch (error) {
    console.warn('⚠️ undici not found, Request/Response/Headers polyfills skipped.');
  }
}
