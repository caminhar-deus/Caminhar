import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Testimonials from '../../../../../components/Features/Testimonials/index.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Componentes Features - Testimonials', () => {
  const originalConsoleError = console.error;
  let originalClientWidth, originalScrollWidth, originalScrollLeft;

  beforeAll(() => {
    console.error = jest.fn();
    
    // Salva as implementações originais do DOM caso existam
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');

    // Mock para simular o comportamento de scroll no JSDOM (que não tem layout engine nativo)
    HTMLElement.prototype.scrollBy = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 1200 });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, writable: true, value: 0 });
  });

  afterAll(() => {
    console.error = originalConsoleError;
    delete HTMLElement.prototype.scrollBy;
    
    // Restaura propriedades do DOM
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
    if (originalScrollLeft) Object.defineProperty(HTMLElement.prototype, 'scrollLeft', originalScrollLeft);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar dados do fallback inicialmente e depois da API com sucesso', async () => {
    const mockDicas = [
      { id: 10, name: 'Dica da API 1', content: 'Conteúdo API 1' },
      { id: 11, name: 'Dica da API 2', content: 'Conteúdo API 2' }
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockDicas });

    render(<Testimonials />);
    
    expect(screen.getByText('Dicas do Dia')).toBeInTheDocument();
    
    // Espera o fetch resolver e os dados da API substituírem o fallback
    await waitFor(() => {
      expect(screen.getByText(/"Conteúdo API 1"/)).toBeInTheDocument();
    });
  });

  it('deve manter o fallbackData se a API retornar erro ou exceção (Catch)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Offline'));
    render(<Testimonials />);
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Erro ao buscar as dicas do dia:', expect.any(Error));
      // A frase do fallback deve continuar visível
      expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument();
    });
  });

  it('deve manter o fallbackData se a API retornar array vazio ou erro HTTP', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false }); // Primeiro tenta falso
    const { rerender } = render(<Testimonials />);
    
    await waitFor(() => expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument());

    // Depois tenta array vazio
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    rerender(<Testimonials />);
    await waitFor(() => expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument());
  });

  it('deve renderizar botões de carrossel se houver > 3 itens e gerenciar scroll/resize', async () => {
    const mockDicas = [{ id: 1, name: 'A', content: 'A' }, { id: 2, name: 'B', content: 'B' }, { id: 3, name: 'C', content: 'C' }, { id: 4, name: 'D', content: 'D' }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockDicas });

    const { container, unmount } = render(<Testimonials />);
    await waitFor(() => expect(screen.getByText(/"D"/)).toBeInTheDocument());

    // Botão direita (❯) deve aparecer porque scrollLeft=0. Esquerda (❮) não.
    const rightButton = screen.getByLabelText('Próxima');
    expect(rightButton).toBeInTheDocument();
    expect(screen.queryByLabelText('Anterior')).not.toBeInTheDocument();

    fireEvent.click(rightButton);
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith({ left: 340, behavior: 'smooth' });

    const scrollContainer = container.querySelector('.dicas-container');
    
    // Simula scroll para o MEIO
    Object.defineProperty(scrollContainer, 'scrollLeft', { configurable: true, value: 400 });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => expect(screen.getByLabelText('Anterior')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Anterior'));
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith({ left: -340, behavior: 'smooth' });

    // Simula scroll para o FINAL (para apagar o botão da direita)
    Object.defineProperty(scrollContainer, 'scrollLeft', { configurable: true, value: 900 }); // 900 + 300(largura) = 1200
    fireEvent.scroll(scrollContainer);
    await waitFor(() => expect(screen.queryByLabelText('Próxima')).not.toBeInTheDocument());

    // Testa a limpeza do EventListener de resize no unmount
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});