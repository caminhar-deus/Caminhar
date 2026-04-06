import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import LazyIframe from '../../../../components/Performance/LazyIframe';

describe('Componente de Performance - LazyIframe', () => {
  let observerInstance;

  beforeEach(() => {
    // Mock do IntersectionObserver para podermos emular o usuário rolando a tela
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback;
        observerInstance = this;
      }
      observe() {}
      disconnect() {}
      trigger(isIntersecting) {
        this.callback([{ isIntersecting }]);
      }
    };
  });

  afterEach(() => {
    delete global.IntersectionObserver;
  });

  it('deve renderizar o placeholder inicialmente e não renderizar o iframe', () => {
    const { container } = render(<LazyIframe src="https://exemplo.com" title="Teste" />);
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('deve renderizar o iframe quando o elemento entrar na tela (IntersectionObserver)', () => {
    const { container } = render(<LazyIframe src="https://exemplo.com" title="Teste" />);
    
    act(() => observerInstance.trigger(true));

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://exemplo.com');
  });

  it('deve formatar corretamente URL e thumbnail dinâmica para o provider youtube', () => {
    const { container } = render(
      <LazyIframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="YT" provider="youtube" />
    );
    
    const placeholder = container.firstChild.firstChild;
    expect(placeholder).toHaveStyle('background-image: url(https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg)');

    act(() => observerInstance.trigger(true));
    expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('deve aceitar thumbnail customizada que sobrescreve a nativa', () => {
    const { container } = render(
      <LazyIframe src="https://youtube.com/watch?v=123" title="YT" provider="youtube" thumbnail="custom.jpg" />
    );
    expect(container.firstChild.firstChild).toHaveStyle('background-image: url(custom.jpg)');
  });

  it('deve chamar onLoad quando o iframe carregar e esconder a opacidade 0', () => {
    const onLoadMock = jest.fn();
    const { container } = render(<LazyIframe src="https://exemplo.com" title="Teste" onLoad={onLoadMock} />);
    
    act(() => observerInstance.trigger(true));
    const iframe = container.querySelector('iframe');
    act(() => fireEvent.load(iframe));

    expect(onLoadMock).toHaveBeenCalled();
    expect(iframe).toHaveStyle('opacity: 1');
  });

  it('deve lidar com clique manual (handleClick) no placeholder e troca dinâmica de prop', () => {
    const { container, rerender } = render(<LazyIframe src="https://exemplo.com" title="Teste" loadOnVisible={true} />);
    
    act(() => observerInstance.trigger(true)); // Força interseção
    rerender(<LazyIframe src="https://exemplo.com" title="Teste" loadOnVisible={false} />); // Troca prop
    
    const placeholder = container.firstChild.firstChild;
    act(() => fireEvent.click(placeholder)); // Força clique manual no overlay
    
    expect(container.querySelector('iframe')).toBeInTheDocument();
  });
  
  it('deve limpar o observer no unmount', () => {
    const { unmount } = render(<LazyIframe src="https://exemplo.com" title="Teste" />);
    const spy = jest.spyOn(observerInstance, 'disconnect');
    unmount();
    expect(spy).toHaveBeenCalled();
  });

  it('deve lidar graciosamente com ausência do IntersectionObserver e onLoad nulo', () => {
    delete global.IntersectionObserver;
    const { container } = render(<LazyIframe src="https://exemplo.com" title="Teste" loadOnVisible={false} />);
    
    fireEvent.click(container.firstChild.firstChild); // Força clique manual para carregar
    const iframe = container.querySelector('iframe');
    
    act(() => fireEvent.load(iframe)); // Dispara load sem a prop onLoad
    expect(iframe).toHaveStyle('opacity: 1');
  });

  it('deve retornar src original se provider for youtube mas URL for inválida', () => {
    const { container } = render(<LazyIframe src="https://invalid" title="Inválido" provider="youtube" loadOnVisible={false} />);
    fireEvent.click(container.firstChild.firstChild);
    expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://invalid');
  });
});