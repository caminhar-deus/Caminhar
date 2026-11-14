import { renderHook } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onFCP: jest.fn(),
  onTTFB: jest.fn(),
}));

import { usePerformanceMetrics } from '../../../hooks/usePerformanceMetrics.js';

describe('Hook - usePerformanceMetrics (resource observer thresholds)', () => {
  let originalPerformanceObserver;
  let observersByType;
  let disconnectSpies;
  let warnSpy;
  let perfNowSpy;

  beforeEach(() => {
    observersByType = {};
    disconnectSpies = [];
    originalPerformanceObserver = global.PerformanceObserver;

    global.PerformanceObserver = class MockPerformanceObserver {
      constructor(callback) {
        this.callback = callback;
        this.disconnect = jest.fn();
        disconnectSpies.push(this.disconnect);
      }

      observe({ entryTypes = [] } = {}) {
        entryTypes.forEach((type) => {
          observersByType[type] = this.callback;
        });
      }
    };

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    perfNowSpy = jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    global.PerformanceObserver = originalPerformanceObserver;
    warnSpy.mockRestore();
    perfNowSpy.mockRestore();
  });

  it('ignora cold start e calibra thresholds para /api/checkout e domínios do Mercado Pago', () => {
    const { unmount } = renderHook(() => usePerformanceMetrics({ debug: true }));

    expect(typeof observersByType.resource).toBe('function');

    const emitResources = (entries) => {
      observersByType.resource({
        getEntries: () => entries,
      });
    };

    // 1. Dentro da janela de cold start (< 15_000ms): não deve alertar
    emitResources([
      {
        name: 'http://localhost:3000/api/posts',
        duration: 1850,
        startTime: 2500,
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();

    // 2. Recursos de terceiros do ecossistema Mercado Pago / Mercado Livre: ignorados
    emitResources([
      {
        name: 'https://api.mercadopago.com/v1/card_tokens?public_key=APP_USR-test',
        duration: 6200,
        startTime: 25_000,
      },
      {
        name: 'https://sdk.mercadopago.com/js/v2',
        duration: 5800,
        startTime: 25_100,
      },
      {
        name: 'https://http2.mlstatic.com/storage/sdk.js',
        duration: 5400,
        startTime: 25_200,
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();

    // 3. Rotas transacionais síncronas com gateway externo/OAuth/upload dentro do orçamento (<= 5000ms)
    emitResources([
      {
        name: 'http://localhost:3000/api/checkout',
        duration: 2267,
        startTime: 30_000,
      },
      {
        name: 'http://localhost:3000/api/customer/auth',
        duration: 2400,
        startTime: 31_000,
      },
      {
        name: 'http://localhost:3000/api/upload-image',
        duration: 3100,
        startTime: 32_000,
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();

    // 4. Rota padrão (> 1000ms) após cold start: deve alertar normalmente
    emitResources([
      {
        name: 'http://localhost:3000/api/posts',
        duration: 1250,
        startTime: 35_000,
      },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[Performance] Slow resource: http://localhost:3000/api/posts (1250ms)'
    );

    // 5. /api/checkout acima do orçamento estendido (> 5000ms): deve alertar lentidão real
    emitResources([
      {
        name: 'http://localhost:3000/api/checkout',
        duration: 5420,
        startTime: 40_000,
      },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      '[Performance] Slow resource: http://localhost:3000/api/checkout (5420ms)'
    );

    unmount();
    expect(disconnectSpies.length).toBeGreaterThanOrEqual(2);
    disconnectSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });
});
