import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import OrganizationSchema from '../../../../components/SEO/StructuredData/OrganizationSchema.js';

describe('StructuredData - OrganizationSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve gerar o esquema Organization corretamente', () => {
    render(<OrganizationSchema name="Igreja" description="Uma igreja" logo="/logo.png" />);
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toBe('Organization');
    expect(json.name).toBe('Igreja');
  });
});