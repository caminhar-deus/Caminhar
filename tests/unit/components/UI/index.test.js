import { describe, it, expect } from '@jest/globals';
import * as UIComponents from '../../../../components/UI/index.js';

describe('UI Components Index', () => {
  it('deve exportar a estrutura esperada do barrel UI', () => {
    expect(Object.keys(UIComponents).sort()).toMatchSnapshot();
  });
});