import { describe, it, expect } from '@jest/globals';
import * as AdminComponents from '../../../../components/Admin/index.js';

describe('Admin Components Index', () => {
  it('deve exportar a estrutura esperada do barrel Admin', () => {
    expect(Object.keys(AdminComponents).sort()).toMatchSnapshot();
  });
});
