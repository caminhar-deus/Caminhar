import { describe, it, expect } from '@jest/globals';
import * as PerformanceComponents from '../../../../components/Performance/index.js';

describe('Performance Components Index', () => {
  it('deve exportar a estrutura esperada do barrel Performance', () => {
    expect(Object.keys(PerformanceComponents).sort()).toMatchSnapshot();
  });
});
