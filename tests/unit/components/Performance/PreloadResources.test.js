import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import PreloadResources, { getCriticalResources } from '../../../../components/Performance/PreloadResources.js';

// Mockamos o Head do Next.js para injetar os elementos direto no container do teste
jest.mock('next/head', () => {
  return function MockHead({ children }) {
    return <div data-testid="next-head">{children}</div>;
  };
});

describe('Componente de Performance - PreloadResources', () => {
  it('deve renderizar links de preconnect e dns-prefetch (padrões e extras)', () => {
    render(<PreloadResources domains={['https://meu-dominio.com']} />);
    
    const preconnects = Array.from(document.querySelectorAll('link[rel="preconnect"]'));
    expect(preconnects.some(l => l.href.includes('fonts.googleapis.com'))).toBe(true);
    expect(preconnects.some(l => l.href.includes('meu-dominio.com'))).toBe(true);

    const gstatic = preconnects.find(l => l.href.includes('gstatic.com'));
    expect(gstatic).toHaveAttribute('crossOrigin', 'anonymous');
  });

  it('deve renderizar links de preload para fontes com a tipagem correta', () => {
    render(<PreloadResources fonts={['/font.woff2', '/font.woff', '/font.ttf']} />);
    
    const preloads = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'));
    expect(preloads).toHaveLength(3);
    expect(preloads[0]).toHaveAttribute('type', 'font/woff2');
    expect(preloads[1]).toHaveAttribute('type', 'font/woff');
    expect(preloads[2]).toHaveAttribute('type', 'font/ttf');
  });

  it('deve renderizar links de preload para imagens críticas e preloads para script/style', () => {
    render(<PreloadResources images={['/img.webp', '/img.png', '/img.jpg']} scripts={['/app.js']} styles={['/main.css']} />);
    
    const preloads = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]'));
    expect(preloads[0]).toHaveAttribute('type', 'image/webp');
    expect(preloads[1]).toHaveAttribute('type', 'image/png');
    expect(preloads[2]).toHaveAttribute('type', 'image/jpeg');
    
    expect(document.querySelector('link[as="script"][href="/app.js"]')).toBeInTheDocument();
    expect(document.querySelector('link[as="style"][href="/main.css"]')).toBeInTheDocument();
  });

  it('getCriticalResources: deve retornar mapeamentos de recursos corretos baseados na rota', () => {
    expect(getCriticalResources('home').images).toContain('/hero-image.jpg');
    expect(getCriticalResources('blog').images).toContain('/blog-hero.jpg');
    
    const musicas = getCriticalResources('musicas');
    expect(musicas.images).toContain('/music-hero.jpg');
    expect(musicas.domains).toContain('https://open.spotify.com');

    const videos = getCriticalResources('videos');
    expect(videos.images).toContain('/video-hero.jpg');
    expect(videos.domains).toContain('https://www.youtube.com');

    // Rota desconhecida retorna vazio
    const unknown = getCriticalResources('unknown');
    expect(unknown.images).toHaveLength(0);
  });
});