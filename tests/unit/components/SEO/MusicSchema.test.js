import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from '@jest/globals';
import MusicSchema from '../../../../components/SEO/StructuredData/MusicSchema.js';

describe('StructuredData - MusicSchema', () => {
  afterEach(() => document.head.innerHTML = '');

  it('deve gerar esquema MusicRecording completo', () => {
    render(
      <MusicSchema 
        title="Hino" artist="Cantor" album="Álbum 1" duration="PT3M" 
        url="https://site.com/hino" audioUrl="https://audio.mp3" 
        releaseDate="2023" lyrics="Letra aqui" spotifyId="123" youtubeId="abc"
      />
    );
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    
    expect(json['@type']).toBe('MusicRecording');
    expect(json.byArtist.name).toBe('Cantor');
    expect(json.inAlbum.name).toBe('Álbum 1');
    expect(json.recordingOf.lyrics.text).toBe('Letra aqui');
    expect(json.sameAs).toContain('https://youtube.com/watch?v=abc');
    expect(json.sameAs).toContain('https://open.spotify.com/track/123');
  });

  it('deve adicionar o youtubeId no sameAs sem o spotifyId se apenas ele for passado', () => {
    render(
      <MusicSchema title="Hino" artist="Cantor" url="https://site.com/hino" youtubeId="abc" />
    );
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
    expect(json.sameAs).toHaveLength(1);
    expect(json.sameAs[0]).toBe('https://youtube.com/watch?v=abc');
    expect(json.inAlbum).toBeUndefined();
  });
});