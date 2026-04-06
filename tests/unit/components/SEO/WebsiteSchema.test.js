import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import WebsiteSchema from '../../../../components/SEO/StructuredData/WebsiteSchema.js';

describe('StructuredData - WebsiteSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve gerar o esquema WebSite com SearchAction', () => {
    render(<WebsiteSchema name="Meu Site" description="Desc site" />);
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toBe('WebSite');
    expect(json.name).toBe('Meu Site');
    expect(json.potentialAction['query-input']).toBe('required name=search_term_string');
  });
});