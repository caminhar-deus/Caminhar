import { describe, it, expect } from '@jest/globals';
import * as LayoutComponents from '../../../../components/Layout/index.js';

describe('Layout Components Index', () => {
  it('deve exportar todos os componentes de layout corretamente (nomeados e default)', () => {
    expect(LayoutComponents.Container).toBeDefined();
    expect(LayoutComponents.Grid).toBeDefined();
    expect(LayoutComponents.Stack).toBeDefined();
    expect(LayoutComponents.Sidebar).toBeDefined();
    
    expect(LayoutComponents.ContainerDefault).toBeDefined();
    expect(LayoutComponents.GridDefault).toBeDefined();
    expect(LayoutComponents.StackDefault).toBeDefined();
  });
});