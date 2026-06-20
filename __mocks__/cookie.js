import { jest } from '@jest/globals';

/**
 * Mock da biblioteca cookie
 * Para uso em testes Jest
 */

export const serialize = jest.fn().mockImplementation((name, value, options = {}) => {
  let cookie = `${name}=${value}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  return cookie;
});

export const parse = jest.fn().mockImplementation((cookieHeader = '') => {
  if (!cookieHeader) return {};
  
  const cookies = {};
  const pairs = cookieHeader.split(';');
  
  for (const pair of pairs) {
    const trimmed = pair.trim();
    const sepIndex = trimmed.indexOf('=');
    if (sepIndex === -1) continue;
    
    const name = trimmed.slice(0, sepIndex);
    const value = trimmed.slice(sepIndex + 1);
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  }
  
  return cookies;
});

// Export default para compatibilidade
const cookieMock = {
  serialize,
  parse,
};

export default cookieMock;
