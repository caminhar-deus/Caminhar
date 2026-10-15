/**
 * Ambiente node: aqui `document` NÃO existe de verdade, então o ramo
 * `typeof document === 'undefined'` da guarda de produção é verdadeiro
 * sem precisar deletar um global (o jsdom@30 tornou `document`
 * não-configurável, o que quebrava `delete global.document`).
 *
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { removeCriticalCSS } from '../../../../components/Performance/CriticalCSS.js';

describe('Componente de Performance - CriticalCSS (SSR)', () => {
  it('removeCriticalCSS: deve retornar silenciosamente se document for undefined (SSR)', () => {
    // Pré-condição: prova que estamos num ambiente realmente sem document
    expect(typeof document).toBe('undefined');
    expect(() => removeCriticalCSS()).not.toThrow();
  });
});
