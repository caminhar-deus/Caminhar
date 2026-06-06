// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/Features/ContentTabs/index.test.js --updateSnapshot
import { describe, it, expect } from '@jest/globals';
import * as ContentTabsModule from '../../../../../components/Features/ContentTabs/index.js';

describe('[Barrel] Features - ContentTabs', () => {
  it('deve exportar a estrutura esperada do barrel ContentTabs', () => {
    expect(Object.keys(ContentTabsModule).sort()).toMatchSnapshot();
  });

  it('deve exportar o componente ContentTabs como default', () => {
    expect(ContentTabsModule.default).toBeDefined();
  });
});