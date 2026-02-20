/**
 * Mock da biblioteca cookie
 * Para uso em testes Jest
 */

export const serialize = jest.fn((name, value, options = {}) => {
  let cookie = `${name}=${value}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  return cookie;
});

export const parse = jest.fn((cookieHeader = '') => {
  if (!cookieHeader) return {};
  
  const cookies = {};
  const pairs = cookieHeader.split(';');
  
  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value !== undefined) {
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
