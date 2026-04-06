import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import ArticleSchema from '../../../../components/SEO/StructuredData/ArticleSchema.js';

describe('StructuredData - ArticleSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve renderizar script JSON-LD com os dados do artigo', () => {
    render(
      <ArticleSchema 
        title="Título" description="Desc" url="https://caminhar.com/post" 
        publishedAt="2023-10-10" modifiedAt="2023-10-11" tags={['Fé']}
        wordCount={500} articleBody="Corpo do texto" image="/img.jpg"
      />
    );
    
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toContain('Article');
    expect(json.headline).toBe('Título');
    expect(json.datePublished).toContain('2023-10-10');
    expect(json.dateModified).toContain('2023-10-11');
    expect(json.keywords).toBe('Fé');
    expect(json.wordCount).toBe(500);
  });

  it('deve usar publishedAt como dateModified se modifiedAt não for fornecido e omitir opcionais', () => {
    render(
      <ArticleSchema 
        title="Título" description="Desc" url="https://caminhar.com/post" 
        publishedAt="2023-10-10"
      />
    );
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    expect(json.dateModified).toContain('2023-10-10');
    expect(json.wordCount).toBeUndefined();
  });
});