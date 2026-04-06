import { describe, it, expect } from '@jest/globals';
import * as UIComponents from '../../../../components/UI/index.js';

describe('UI Components Index', () => {
  it('deve exportar todos os componentes da UI corretamente', () => {
    expect(UIComponents.Button).toBeDefined();
    expect(UIComponents.Input).toBeDefined();
    expect(UIComponents.TextArea).toBeDefined();
    expect(UIComponents.Select).toBeDefined();
    expect(UIComponents.Card).toBeDefined();
    expect(UIComponents.Modal).toBeDefined();
    expect(UIComponents.Spinner).toBeDefined();
    expect(UIComponents.Toast).toBeDefined();
  });
});