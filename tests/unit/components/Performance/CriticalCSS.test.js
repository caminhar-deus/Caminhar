import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import CriticalCSS, { extractCriticalCSS, removeCriticalCSS } from '../../../../components/Performance/CriticalCSS.js';

describe('Componente de Performance - CriticalCSS', () => {
  it('deve renderizar a tag <style> com o CSS crítico e ID correto', () => {
    const { container } = render(<CriticalCSS css="body { color: red; }" />);
    const styleTag = container.querySelector('style');
    
    expect(styleTag).toBeInTheDocument();
    expect(styleTag).toHaveAttribute('id', 'critical-css');
    expect(styleTag.innerHTML).toBe('body { color: red; }');
  });

  it('deve retornar null se a prop css não for fornecida', () => {
    const { container } = render(<CriticalCSS />);
    expect(container.firstChild).toBeNull();
  });

  it('extractCriticalCSS: deve retornar uma string contendo o CSS crítico padrão', () => {
    const css = extractCriticalCSS();
    expect(typeof css).toBe('string');
    expect(css).toContain('/* Critical CSS - Above the fold */');
    expect(css).toContain('body{');
  });

  it('removeCriticalCSS: deve remover a tag style do DOM se ela existir', () => {
    const style = document.createElement('style');
    style.id = 'critical-css';
    document.body.appendChild(style);

    expect(document.getElementById('critical-css')).toBeInTheDocument();
    removeCriticalCSS('critical-css');
    expect(document.getElementById('critical-css')).toBeNull();
  });

  it('removeCriticalCSS: não deve quebrar se o elemento não existir no DOM', () => {
    expect(() => removeCriticalCSS('id-inexistente')).not.toThrow();
  });

  it('removeCriticalCSS: deve retornar silenciosamente se document for undefined (SSR)', () => {
    const originalDocument = global.document;
    delete global.document;
    expect(() => removeCriticalCSS()).not.toThrow();
    global.document = originalDocument; // Restaura para não quebrar outros testes
  });
});