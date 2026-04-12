import { describe, it, expect } from '@jest/globals';
import {
  Container,
  Grid,
  Stack,
  Sidebar,
  ContainerDefault,
  GridDefault,
  StackDefault,
  SidebarDefault
} from '../../../../components/Layout/index.js';

describe('Componentes Layout - Index Exports', () => {
  it('deve re-exportar todos os componentes de layout corretamente', () => {
    // Verifica as exportações nomeadas
    expect(Container).toBeDefined();
    expect(Grid).toBeDefined();
    expect(Stack).toBeDefined();
    expect(Sidebar).toBeDefined();
    
    // Verifica as exportações padrão
    expect(ContainerDefault).toBeDefined();
    expect(GridDefault).toBeDefined();
    expect(StackDefault).toBeDefined();
    expect(SidebarDefault).toBeDefined();
  });
});