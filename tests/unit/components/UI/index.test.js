// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/UI/index.test.js --updateSnapshot
import { describe, it, expect } from '@jest/globals';
import * as UIComponents from '../../../../components/UI/index.js';

describe('[Barrel] UI Components Index', () => {
  it('deve exportar a estrutura esperada do barrel UI', () => {
    expect(Object.keys(UIComponents).sort()).toMatchSnapshot();
  });

  it('deve exportar o componente Button como referência crítica', () => {
    expect(UIComponents.Button).toBeDefined();
  });
});