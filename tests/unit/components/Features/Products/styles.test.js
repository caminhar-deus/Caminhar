import { describe, it, expect } from '@jest/globals';
import { inputStyle, buttonBaseStyle } from '../../../../../components/Features/Products/styles.js';

describe('Componentes Features - Products - styles', () => {
  it('deve aplicar o paddingLeft padrão e devolver o objeto de estilo completo', () => {
    const style = inputStyle();

    expect(style.width).toBe('100%');
    expect(style.padding).toBe('var(--spacing-3_5) var(--spacing-4) var(--spacing-3_5) var(--spacing-4)');
    expect(style.borderRadius).toBe('var(--border-radius-lg)');
    expect(style.border).toBe('var(--border-width-1) solid var(--color-border-light)');
    expect(style.fontSize).toBe('var(--font-size-base)');
    expect(style.outline).toBe('none');
    expect(style.boxShadow).toBe('var(--shadow-xs)');
    expect(style.transition).toBe('var(--transition-all)');
    expect(style.backgroundColor).toBe('var(--color-bg-primary)');
    expect(style.color).toBe('var(--color-text-primary)');
  });

  it('deve aceitar um paddingLeft da whitelist quando fornecido', () => {
    const style = inputStyle('46px');

    expect(style.padding).toBe('var(--spacing-3_5) var(--spacing-4) var(--spacing-3_5) 46px');
  });

  it('deve substituir um paddingLeft inválido pelo token seguro', () => {
    const style = inputStyle('50px; color: red');

    expect(style.padding).toBe('var(--spacing-3_5) var(--spacing-4) var(--spacing-3_5) var(--spacing-4)');
  });

  it('deve devolver o objeto base completo do botão', () => {
    const style = buttonBaseStyle();

    expect(style.padding).toBe('var(--spacing-2) var(--spacing-5)');
    expect(style.borderRadius).toBe('var(--border-radius-md)');
    expect(style.border).toBe('var(--border-width-1) solid var(--color-border-light)');
    expect(style.fontWeight).toBe('var(--font-weight-semibold)');
    expect(style.cursor).toBe('pointer');
    expect(style.transition).toBe('var(--transition-all)');
    expect(style.outline).toBe('none');
  });

  it('deve sobrescrever as propriedades base com o objeto custom', () => {
    const style = buttonBaseStyle({
      backgroundColor: 'var(--color-bg-secondary)',
      cursor: 'not-allowed',
    });

    expect(style.backgroundColor).toBe('var(--color-bg-secondary)');
    expect(style.cursor).toBe('not-allowed');
    expect(style.padding).toBe('var(--spacing-2) var(--spacing-5)');
    expect(style.borderRadius).toBe('var(--border-radius-md)');
    expect(style.outline).toBe('none');
  });
});