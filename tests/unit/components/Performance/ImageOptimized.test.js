import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import ImageOptimized from '../../../../components/Performance/ImageOptimized';

// Mockamos o componente next/image nativo para interceptarmos suas propriedades e eventos
jest.mock('next/image', () => {
  return function MockNextImage({ src, alt, onLoad, onError, priority, loading, placeholder, blurDataURL }) {
    return (
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        data-priority={priority}
        data-loading={loading}
        data-placeholder={placeholder}
        data-blur={blurDataURL}
        data-testid="next-image"
      />
    );
  };
});

describe('Componente de Performance - ImageOptimized', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('non-boolean attribute') && msg.includes('jsx')) return;
      originalConsoleError.apply(console, args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('deve renderizar o esqueleto de carregamento inicialmente e removê-lo no onLoad', () => {
    const onLoadMock = jest.fn();
    const { container } = render(
      <ImageOptimized src="/test.jpg" alt="Teste" onLoad={onLoadMock} width={100} height={100} />
    );

    // O esqueleto (div absolute com animação pulse) deve estar presente inicialmente
    const skeleton = container.firstChild.firstChild; 
    expect(skeleton).toHaveStyle('position: absolute');

    const img = screen.getByTestId('next-image');
    expect(img).toBeInTheDocument();

    // Dispara o evento nativo de load
    act(() => fireEvent.load(img));

    expect(onLoadMock).toHaveBeenCalled();
    // O componente do skeleton deve ter sido removido do DOM
    expect(skeleton).not.toBeInTheDocument();
  });

  it('deve chamar onError e alterar src para fallbackSrc quando a imagem falhar', () => {
    const onErrorMock = jest.fn();
    render(<ImageOptimized src="/invalid.jpg" alt="Invalida" fallbackSrc="/fallback.jpg" onError={onErrorMock} />);

    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('src', '/invalid.jpg');

    act(() => fireEvent.error(img));

    expect(onErrorMock).toHaveBeenCalled();
    expect(img).toHaveAttribute('src', '/fallback.jpg');

    // Um segundo erro não deve acionar onError de novo para evitar loops infinitos de renderização
    act(() => fireEvent.error(img));
    expect(onErrorMock).toHaveBeenCalledTimes(1);
  });

  it('deve configurar loading="eager" se priority ou critical for true', () => {
    const { rerender } = render(<ImageOptimized src="/t1.jpg" alt="T1" critical={true} />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('data-loading', 'eager');
    expect(screen.getByTestId('next-image')).toHaveAttribute('data-priority', 'true');

    rerender(<ImageOptimized src="/t2.jpg" alt="T2" priority={true} />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('data-loading', 'eager');
    expect(screen.getByTestId('next-image')).toHaveAttribute('data-priority', 'true');
  });

  it('deve aplicar estilo width/height 100% e ignorar aspect-ratio quando fill={true}', () => {
    const { container } = render(<ImageOptimized src="/t4.jpg" alt="T4" fill={true} blurDataUrl="data:..." />);
    expect(container.firstChild).toHaveStyle('width: 100%');
  });

  it('deve aplicar borderRadius no skeleton se fornecido via style e lidar com omitir width/height', () => {
    const { container } = render(<ImageOptimized src="/t5.jpg" alt="T5" style={{ borderRadius: '10px' }} />);
    const skeleton = container.firstChild.firstChild;
    expect(skeleton).toHaveStyle('border-radius: 10px');
  });
});