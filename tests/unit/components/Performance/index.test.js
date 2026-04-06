import { describe, it, expect } from '@jest/globals';
import * as PerformanceComponents from '../../../../components/Performance/index.js';

describe('Performance Components Index', () => {
  it('deve exportar todos os utilitários de performance corretamente', () => {
    expect(PerformanceComponents.ImageOptimized).toBeDefined();
    expect(PerformanceComponents.LazyIframe).toBeDefined();
    
    expect(PerformanceComponents.PreloadResources).toBeDefined();
    expect(PerformanceComponents.getCriticalResources).toBeDefined();
    
    expect(PerformanceComponents.CriticalCSS).toBeDefined();
    expect(PerformanceComponents.extractCriticalCSS).toBeDefined();
    expect(PerformanceComponents.removeCriticalCSS).toBeDefined();
  });
});