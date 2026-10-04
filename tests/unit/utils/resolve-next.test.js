import { describe, it, expect } from '@jest/globals';

import { resolveNext } from '../../../utils/resolve-next.js';

describe('resolveNext — destinos internos válidos (retorna o candidato como está)', () => {
  it('mantém /admin', () => {
    expect(resolveNext({ next: '/admin' })).toBe('/admin');
  });

  it('mantém /admin/usuarios', () => {
    expect(resolveNext({ next: '/admin/usuarios' })).toBe('/admin/usuarios');
  });

  it('mantém /login?x=1 preservando a query string', () => {
    expect(resolveNext({ next: '/login?x=1' })).toBe('/login?x=1');
  });

  it('mantém /a?b=c preservando a query string', () => {
    expect(resolveNext({ next: '/a?b=c' })).toBe('/a?b=c');
  });
});

describe('resolveNext — absolutos, protocol-relative e esquemas perigosos caem para /admin', () => {
  it('rejeita https://evil.com', () => {
    expect(resolveNext({ next: 'https://evil.com' })).toBe('/admin');
  });

  it('rejeita http://evil.com', () => {
    expect(resolveNext({ next: 'http://evil.com' })).toBe('/admin');
  });

  it('rejeita //evil.com (protocol-relative)', () => {
    expect(resolveNext({ next: '//evil.com' })).toBe('/admin');
  });

  it('rejeita /foo//bar (contém //)', () => {
    expect(resolveNext({ next: '/foo//bar' })).toBe('/admin');
  });

  it('rejeita /foo://bar (contém ://)', () => {
    expect(resolveNext({ next: '/foo://bar' })).toBe('/admin');
  });

  it('rejeita javascript:alert(1)', () => {
    expect(resolveNext({ next: 'javascript:alert(1)' })).toBe('/admin');
  });
});

describe('resolveNext — barra invertida e caracteres de controle caem para /admin', () => {
  it('rejeita /foo\\bar (barra invertida)', () => {
    expect(resolveNext({ next: '/foo\\bar' })).toBe('/admin');
  });

  it('rejeita \\evil (barra invertida)', () => {
    expect(resolveNext({ next: '\\evil' })).toBe('/admin');
  });

  it('rejeita \\n (newline)', () => {
    expect(resolveNext({ next: '\n' })).toBe('/admin');
  });

  it('rejeita \\r (carriage return)', () => {
    expect(resolveNext({ next: '\r' })).toBe('/admin');
  });

  it('rejeita \\t (tab)', () => {
    expect(resolveNext({ next: '\t' })).toBe('/admin');
  });

  it('rejeita \\x00 (NUL)', () => {
    expect(resolveNext({ next: '\x00' })).toBe('/admin');
  });

  it('rejeita \\x7f (DEL)', () => {
    expect(resolveNext({ next: '\x7f' })).toBe('/admin');
  });

  it('rejeita candidato com CRLF (header injection)', () => {
    expect(resolveNext({ next: '/foo\r\nSet-Cookie: a=b' })).toBe('/admin');
  });
});

describe('resolveNext — sem barra inicial caem para /admin', () => {
  it('rejeita "admin"', () => {
    expect(resolveNext({ next: 'admin' })).toBe('/admin');
  });

  it('rejeita "admin/usuarios"', () => {
    expect(resolveNext({ next: 'admin/usuarios' })).toBe('/admin');
  });

  it('rejeita "foo"', () => {
    expect(resolveNext({ next: 'foo' })).toBe('/admin');
  });
});

describe('resolveNext — traversal e percent-encoding voltam como estão (candidato cru)', () => {
  it('mantém /%2e%2e/ (percent-encoded "..")', () => {
    expect(resolveNext({ next: '/%2e%2e/' })).toBe('/%2e%2e/');
  });

  it('mantém /../admin (".." literal)', () => {
    expect(resolveNext({ next: '/../admin' })).toBe('/../admin');
  });

  it('mantém /foo/%2e%2e/bar (traversal no meio do caminho)', () => {
    expect(resolveNext({ next: '/foo/%2e%2e/bar' })).toBe('/foo/%2e%2e/bar');
  });
});

describe('resolveNext — arrays: o primeiro elemento manda', () => {
  it('usa o primeiro elemento quando o primeiro é válido', () => {
    expect(resolveNext({ next: ['/admin', 'https://evil.com'] })).toBe('/admin');
  });

  it('cai para /admin quando o primeiro elemento é inválido', () => {
    expect(resolveNext({ next: ['https://evil.com', '/admin'] })).toBe('/admin');
  });

  it('trata array vazio como ausente e cai para /admin', () => {
    expect(resolveNext({ next: [] })).toBe('/admin');
  });

  it('trata array vazio como ausente e usa returnUrl', () => {
    expect(resolveNext({ next: [], returnUrl: '/b' })).toBe('/b');
  });

  it('dá precedência a next sobre returnUrl quando ambos existem', () => {
    expect(resolveNext({ next: '/admin', returnUrl: 'https://evil.com' })).toBe('/admin');
  });

  it('usa returnUrl quando next está ausente', () => {
    expect(resolveNext({ returnUrl: '/b' })).toBe('/b');
  });
});

describe('resolveNext — tipos e borda caem para /admin', () => {
  it('cai para /admin sem query (chamada sem argumento)', () => {
    expect(resolveNext()).toBe('/admin');
  });

  it('cai para /admin com query vazia', () => {
    expect(resolveNext({})).toBe('/admin');
  });

  it('cai para /admin com next null', () => {
    expect(resolveNext({ next: null })).toBe('/admin');
  });

  it('cai para /admin com next undefined', () => {
    expect(resolveNext({ next: undefined })).toBe('/admin');
  });

  it('cai para /admin com next numérico', () => {
    expect(resolveNext({ next: 123 })).toBe('/admin');
  });

  it('cai para /admin com next em formato de objeto', () => {
    expect(resolveNext({ next: {} })).toBe('/admin');
  });

  it('cai para /admin com next em string vazia', () => {
    expect(resolveNext({ next: '' })).toBe('/admin');
  });
});

describe('resolveNext — travas de lock (regressão sobre comportamento já coberto)', () => {
  it('mantém /a#b (fragmento é válido e volta como está)', () => {
    expect(resolveNext({ next: '/a#b' })).toBe('/a#b');
  });

  it('mantém /foo/%2f%2fevil.com (sem "//" literal e mesma origem)', () => {
    expect(resolveNext({ next: '/foo/%2f%2fevil.com' })).toBe('/foo/%2f%2fevil.com');
  });

  it('cai para /admin com data:text/html,x (esquema sem barra inicial)', () => {
    expect(resolveNext({ next: 'data:text/html,x' })).toBe('/admin');
  });

  it('cai para /admin com vbscript:msgbox (esquema sem barra inicial)', () => {
    expect(resolveNext({ next: 'vbscript:msgbox' })).toBe('/admin');
  });

  it('cai para /admin com NUL após o caminho (casa com a regex de controles)', () => {
    expect(resolveNext({ next: '/admin\x00' })).toBe('/admin');
  });
});
