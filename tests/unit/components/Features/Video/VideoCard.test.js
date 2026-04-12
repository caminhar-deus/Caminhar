import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import VideoCard from '../../../../../components/Features/Video/VideoCard.js';

// Mock do componente LazyIframe para isolar o teste e não carregar um iframe real
jest.mock('../../../../../components/Performance', () => ({
  LazyIframe: ({ src, title, thumbnail }) => (
    <div data-testid="mock-lazy-iframe" data-src={src} data-title={title} data-thumbnail={thumbnail || 'null'}>
      Mock Iframe
    </div>
  )
}));

describe('Componentes Features - Video - VideoCard', () => {
  it('deve renderizar o título e o componente LazyIframe com as props corretas (sem descrição)', () => {
    const video = {
      titulo: 'Vídeo Teste',
      url_youtube: 'https://youtube.com/watch?v=123',
      thumbnail: 'https://img.youtube.com/vi/123/hqdefault.jpg'
    };

    render(<VideoCard video={video} />);

    expect(screen.getByText('Vídeo Teste')).toBeInTheDocument();
    
    const lazyIframe = screen.getByTestId('mock-lazy-iframe');
    expect(lazyIframe).toBeInTheDocument();
    expect(lazyIframe).toHaveAttribute('data-src', 'https://youtube.com/watch?v=123');
    expect(lazyIframe).toHaveAttribute('data-title', 'Vídeo Teste');
    expect(lazyIframe).toHaveAttribute('data-thumbnail', 'https://img.youtube.com/vi/123/hqdefault.jpg');
  });

  it('deve renderizar a descrição quando fornecida', () => {
    const video = { titulo: 'Vídeo 2', url_youtube: 'https://youtu.be/456', descricao: 'Descrição detalhada do vídeo.' };
    render(<VideoCard video={video} />);
    expect(screen.getByText('Descrição detalhada do vídeo.')).toBeInTheDocument();
  });
});