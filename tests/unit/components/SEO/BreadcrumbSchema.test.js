import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import BreadcrumbSchema from '../../../../components/SEO/StructuredData/BreadcrumbSchema.js';

describe('StructuredData - BreadcrumbSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve adicionar Início automaticamente e formatar as URLs', () => {
    render(<BreadcrumbSchema items={[{ name: 'Blog', url: '/blog' }]} />);
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toBe('BreadcrumbList');
    expect(json.itemListElement).toHaveLength(2); // Início + Blog
    expect(json.itemListElement[0].name).toBe('Início');
    expect(json.itemListElement[1].item).toContain('/blog');
  });

  it('não deve duplicar a home se já for enviada como primeiro item', () => {
    render(<BreadcrumbSchema items={[{ name: 'Início', url: '/' }, { name: 'Contato', url: '/contato' }]} />);
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    expect(json.itemListElement).toHaveLength(2);
  });

  it('deve formatar URLs absolutas e relativas sem barra inicial corretamente', () => {
    render(<BreadcrumbSchema items={[
      { name: 'Externo', url: 'https://externo.com' },
      { name: 'Interno', url: 'contato' }
    ]} />);
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    expect(json.itemListElement[1].item).toBe('https://externo.com');
    expect(json.itemListElement[2].item).toContain('/contato');
  });
});