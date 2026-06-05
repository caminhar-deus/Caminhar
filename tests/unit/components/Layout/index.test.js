import { describe, it, expect } from '@jest/globals';
import * as LayoutComponents from '../../../../components/Layout/index.js';

describe('Layout Components Index', () => {
  it('deve exportar a estrutura esperada do barrel Layout', () => {
    expect(Object.keys(LayoutComponents).sort()).toMatchSnapshot();
  });
});
