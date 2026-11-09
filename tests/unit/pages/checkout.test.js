import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import CheckoutPage from '../../../pages/checkout/[id].js';

describe('Página de Checkout do Visitante (pages/checkout/[id].js)', () => {
  let fetchMock;
  let consoleErrorSpy;
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    consoleErrorSpy = suppressConsoleError();
    useRouter.mockReturnValue({
      query: { id: '5' },
      isReady: true,
      pathname: '/checkout/[id]',
      asPath: '/checkout/5',
      push: mockPush,
      replace: mockReplace,
    });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('redireciona para /entrar com next=/checkout/5 se visitante não logado', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false, customer: null }),
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/entrar?next=%2Fcheckout%2F5');
    });
  });

  it('renderiza o formulário de entrega e resumo do pedido quando autenticado', async () => {
    fetchMock.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: { id: 10, name: 'Ana Silva', email: 'ana@exemplo.com' },
          }),
        };
      }
      if (urlStr.includes('/api/checkout?productId=5')) {
        return {
          ok: true,
          json: async () => ({
            product: {
              id: 5,
              name: 'Terço de Madeira',
              price: 49.9,
              stock: 10,
              shipping_type: 'free',
              shipping_cost: 0,
              formatted_price: 'R$ 49,90',
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /1\. Endereço de Entrega/ })).toBeInTheDocument();
      expect(screen.getByText('Terço de Madeira')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar e Pagar' })).toBeInTheDocument();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React expects the `children` prop of <title> tags to be a string')
    );
  });
});
