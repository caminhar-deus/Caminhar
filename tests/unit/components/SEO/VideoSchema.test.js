import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import VideoSchema from '../../../../components/SEO/StructuredData/VideoSchema.js';

describe('StructuredData - VideoSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve gerar o esquema VideoObject corretamente com embed e métricas', () => {
    render(
      <VideoSchema 
        title="Pregação" description="Desc" thumbnail="/thumb.jpg" 
        url="https://site/video" embedUrl="https://youtube/embed" 
        duration="PT10M" uploadDate="2023-01-01" views={100} youtubeId="vid123" transcript="Texto"
      />
    );
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toBe('VideoObject');
    expect(json.embedUrl).toBe('https://youtube/embed');
    expect(json.interactionStatistic.userInteractionCount).toBe(100);
    expect(json.transcript.text).toBe('Texto');
  });

  it('deve lidar com tags em formato de string, contentUrl e renderizar com propriedades mínimas', () => {
    render(
      <VideoSchema 
        title="Pregação" description="Desc" thumbnail="/thumb.jpg" 
        url="https://site/video" tags="fé, esperança" contentUrl="https://video.mp4"
      />
    );
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    expect(json.keywords).toBe('fé, esperança');
    expect(json.contentUrl).toBe('https://video.mp4');
  });
});