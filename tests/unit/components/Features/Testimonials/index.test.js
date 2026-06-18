import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from '@jest/globals';
import Testimonials from '../../../../../components/Features/Testimonials/index.js';
import { mockGlobalFetch } from '../../../../helpers/index.js';

describe('Componentes Features - Testimonials', () => {
  const originalConsoleError = console.error;
  let fetchMock;
  let originalClientWidth, originalScrollWidth, originalScrollLeft;

  beforeAll(() => {
    console.error = jest.fn();
    fetchMock = mockGlobalFetch();

    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');

    HTMLElement.prototype.scrollBy = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 1200 });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, writable: true, value: 0 });
  });

  afterAll(() => {
    console.error = originalConsoleError;
    fetchMock?.mockRestore();
    delete HTMLElement.prototype.scrollBy;

    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
    if (originalScrollLeft) Object.defineProperty(HTMLElement.prototype, 'scrollLeft', originalScrollLeft);
  });

  beforeEach(() => {
    fetchMock.mockClear();
  });

  it('deve carregar dados do fallback inicialmente e depois da API com sucesso', async () => {
    const mockDicas = {
      success: true,
      data: [
        { id: 10, name: 'Dica da API 1', content: 'Conteúdo API 1' },
        { id: 11, name: 'Dica da API 2', content: 'Conteúdo API 2' }
      ]
    };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDicas });

    render(<Testimonials />);

    expect(screen.getByText('Dicas do Dia')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/"Conteúdo API 1"/)).toBeInTheDocument();
    });
  });

  it('deve manter o fallbackData se a API retornar erro ou exceção (Catch)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('API Offline'));
    render(<Testimonials />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Erro ao buscar as dicas do dia:', expect.any(Error));
      expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument();
    });
  });

  it('deve manter o fallbackData se a API retornar array vazio ou erro HTTP', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    const { unmount: unmountFirst } = render(<Testimonials />);
    await waitFor(() => expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument());
    unmountFirst();

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { unmount: unmountSecond } = render(<Testimonials />);
    await waitFor(() => expect(screen.getByText(/"Os artigos e reflexões mudaram/i)).toBeInTheDocument());
    unmountSecond();
  });

  it('deve renderizar botões de carrossel se houver > 3 itens e gerenciar scroll/resize', async () => {
    const mockDicas = {
      success: true,
      data: [
        { id: 1, name: 'Nome A', content: 'Conteúdo A' },
        { id: 2, name: 'Nome B', content: 'Conteúdo B' },
        { id: 3, name: 'Nome C', content: 'Conteúdo C' },
        { id: 4, name: 'Nome D', content: 'Conteúdo D' }
      ]
    };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDicas });

    const { container, unmount } = render(<Testimonials />);

    await waitFor(() => {
      expect(screen.getByText(/"Conteúdo D"/)).toBeInTheDocument();
    });

    const rightButton = screen.getByLabelText('Próxima');
    expect(rightButton).toBeInTheDocument();
    expect(screen.queryByLabelText('Anterior')).not.toBeInTheDocument();

    fireEvent.click(rightButton);
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith({ left: 340, behavior: 'smooth' });

    const scrollContainer = container.querySelector('div[id="testimonials-carousel"]');
    expect(scrollContainer).toBeInTheDocument();

    Object.defineProperty(scrollContainer, 'scrollLeft', { configurable: true, value: 400 });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => expect(screen.getByLabelText('Anterior')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Anterior'));
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith({ left: -340, behavior: 'smooth' });

    Object.defineProperty(scrollContainer, 'scrollLeft', { configurable: true, value: 900 });
    fireEvent.scroll(scrollContainer);
    await waitFor(() => expect(screen.queryByLabelText('Próxima')).not.toBeInTheDocument());

    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(removeEventListenerSpy.mock.calls.some(call => call[0] === 'resize')).toBe(true);
  });
});