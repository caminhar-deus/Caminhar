import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  UNKNOWN_IP,
  fromMiddlewareRequest,
  fromNodeRequest,
  getClientIP,
  getTrustedProxyHops,
  resolveClientIP
} from '../../../../lib/api/helpers.js';

/**
 * Resolve o modelo de confiança de IP (TRUST_PROXY) de lib/api/helpers.js.
 *
 * Casos críticos:
 * - regressão de produção: IPv4-mapped vindo do Next.js sem TRUST_PROXY;
 * - ataque de rotação de X-Forwarded-For (bypass de rate limit);
 * - fail-closed de getTrustedProxyHops com valores inválidos.
 */
const TRUST_PROXY_ORIGINAL = process.env.TRUST_PROXY;

/** Monta um `req` mínimo do pages router. */
function nodeRequest({ socketIP, forwardedFor } = {}) {
  return {
    socket: socketIP === undefined ? {} : { remoteAddress: socketIP },
    headers: forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor }
  };
}

/** Monta um `NextRequest` mínimo do middleware (sem socket). */
function middlewareRequest(forwardedFor) {
  return {
    headers: { get: (name) => (name === 'x-forwarded-for' ? forwardedFor : null) }
  };
}

describe('Library - API - Helpers (resolveClientIP)', () => {
  beforeEach(() => {
    delete process.env.TRUST_PROXY;
  });

  afterEach(() => {
    if (TRUST_PROXY_ORIGINAL === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = TRUST_PROXY_ORIGINAL;
  });

  describe('regressão: IPv4-mapped do Next.js sem TRUST_PROXY', () => {
    it('aceita o IP do socket em vez de acusar spoofing', () => {
      // O Next.js injeta X-Forwarded-For com o mesmo valor do socket
      // (node_modules/next/dist/server/base-server.js). Sem TRUST_PROXY o
      // header é ignorado e vale o socket — nunca 403 nem bloqueio.
      const result = resolveClientIP({
        socketIP: '::ffff:203.0.113.9',
        forwardedFor: '::ffff:203.0.113.9'
      });

      expect(result.clientIP).toBe('203.0.113.9');
      expect(result.trustedProxy).toBe(false);
      expect(result.untrustedForwarded).toBe(false);
      expect(result.hops).toBe(0);
    });

    it('normaliza o par do CI (::ffff:127.0.0.1) para 127.0.0.1', () => {
      const result = resolveClientIP({
        socketIP: '::ffff:127.0.0.1',
        forwardedFor: '::ffff:127.0.0.1'
      });

      expect(result.clientIP).toBe('127.0.0.1');
      expect(result.untrustedForwarded).toBe(false);
    });
  });

  describe('proxy declarado (TRUST_PROXY)', () => {
    it('usa a entrada da direita com 1 hop', () => {
      process.env.TRUST_PROXY = '1';

      const result = resolveClientIP({
        socketIP: '10.0.0.5',
        forwardedFor: '203.0.113.9'
      });

      expect(result.clientIP).toBe('203.0.113.9');
      expect(result.trustedProxy).toBe(true);
      expect(result.forwardedIP).toBe('203.0.113.9');
    });

    it('ignora a entrada falsificada no ataque de rotação', () => {
      process.env.TRUST_PROXY = '1';

      // A entrada à esquerda (1.2.3.4) é escrita pelo cliente; a à direita é
      // acrescentada pelo proxy. Ler split(',')[0] devolveria 1.2.3.4 e
      // permitiria bypass de rate limit a cada requisição.
      const result = resolveClientIP({
        socketIP: '10.0.0.5',
        forwardedFor: '1.2.3.4, 9.9.9.9'
      });

      expect(result.clientIP).toBe('9.9.9.9');
      expect(result.trustedProxy).toBe(true);
    });

    it('lê a N-ésima entrada da direita com 2 hops', () => {
      process.env.TRUST_PROXY = '2';

      const result = resolveClientIP({
        socketIP: '10.0.0.5',
        forwardedFor: 'a, b, c'
      });

      expect(result.clientIP).toBe('b');
      expect(result.trustedProxy).toBe(true);
    });

    it('descarta o header quando a cadeia tem menos entradas que os hops', () => {
      process.env.TRUST_PROXY = '2';

      const result = resolveClientIP({
        socketIP: '10.0.0.5',
        forwardedFor: '203.0.113.9'
      });

      expect(result.clientIP).toBe('10.0.0.5');
      expect(result.forwardedIP).toBeNull();
      expect(result.trustedProxy).toBe(false);
    });
  });

  describe('header ignorado sem proxy declarado', () => {
    it('mantém o socket, marca o header como não confiável e não registra forwardedIP', () => {
      const result = resolveClientIP({
        socketIP: '203.0.113.9',
        forwardedFor: '1.2.3.4'
      });

      expect(result.clientIP).toBe('203.0.113.9');
      expect(result.forwardedIP).toBeNull();
      expect(result.trustedProxy).toBe(false);
      expect(result.untrustedForwarded).toBe(true);
    });

    it('não marca divergência quando header e socket coincidem', () => {
      const result = resolveClientIP({
        socketIP: '203.0.113.9',
        forwardedFor: '203.0.113.9'
      });

      expect(result.untrustedForwarded).toBe(false);
    });
  });

  describe('middleware sem socket', () => {
    it('expõe socketIP null e devolve UNKNOWN_IP sem header', () => {
      const source = fromMiddlewareRequest(middlewareRequest(null));

      expect(source.socketIP).toBeNull();
      expect(resolveClientIP(source).clientIP).toBe(UNKNOWN_IP);
    });

    it('usa o header apenas com TRUST_PROXY configurado', () => {
      const source = fromMiddlewareRequest(middlewareRequest('203.0.113.9'));

      expect(resolveClientIP(source).clientIP).toBe(UNKNOWN_IP);

      process.env.TRUST_PROXY = '1';
      expect(resolveClientIP(source).clientIP).toBe('203.0.113.9');
    });
  });

  describe('getTrustedProxyHops', () => {
    it.each([
      { label: 'ausente', raw: undefined, expected: 0 },
      { label: 'false', raw: 'false', expected: 0 },
      { label: '0', raw: '0', expected: 0 },
      { label: 'true', raw: 'true', expected: 1 },
      { label: '2', raw: '2', expected: 2 },
      { label: 'banana', raw: 'banana', expected: 0 }
    ])('$label -> $expected hops', ({ raw, expected }) => {
      if (raw === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = raw;

      expect(getTrustedProxyHops()).toBe(expected);
    });
  });

  describe('getClientIP', () => {
    it('colapsa ::ffff:127.0.0.1 para 127.0.0.1', () => {
      expect(getClientIP(nodeRequest({ socketIP: '::ffff:127.0.0.1' }))).toBe('127.0.0.1');
    });

    it('colapsa ::1 para 127.0.0.1', () => {
      expect(getClientIP(nodeRequest({ socketIP: '::1' }))).toBe('127.0.0.1');
    });

    it('devolve UNKNOWN_IP quando não há socket nem header', () => {
      expect(getClientIP(nodeRequest())).toBe(UNKNOWN_IP);
    });

    it('ignora X-Forwarded-For sem TRUST_PROXY', () => {
      const req = nodeRequest({ socketIP: '203.0.113.9', forwardedFor: '9.9.9.9' });

      expect(getClientIP(req)).toBe('203.0.113.9');

      process.env.TRUST_PROXY = 'true';
      expect(getClientIP(req)).toBe('9.9.9.9');
    });
  });

  describe('fromNodeRequest', () => {
    it('lê socket e header crus', () => {
      expect(fromNodeRequest(nodeRequest({ socketIP: '10.0.0.5', forwardedFor: 'a, b' }))).toEqual({
        socketIP: '10.0.0.5',
        forwardedFor: 'a, b'
      });
      expect(fromNodeRequest(nodeRequest())).toEqual({ socketIP: null, forwardedFor: null });
    });
  });
});
