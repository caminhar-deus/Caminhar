import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import MinhaContaPage from '../../../pages/minha-conta.js';

describe('Página Minha Conta do Visitante (pages/minha-conta.js)', () => {
  let fetchMock;
  let consoleErrorSpy;
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    consoleErrorSpy = suppressConsoleError();
    useRouter.mockReturnValue({
      query: {},
      pathname: '/minha-conta',
      asPath: '/minha-conta',
      push: mockPush,
      replace: mockReplace,
    });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('redireciona para /entrar se o visitante não estiver autenticado', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false, customer: null }),
    });

    render(<MinhaContaPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/entrar?next=/minha-conta');
    });
  });

  it('renderiza dados da conta e lista de pedidos quando autenticado', async () => {
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
      if (urlStr.includes('/api/customer/orders')) {
        return {
          ok: true,
          json: async () => ({
            orders: [
              {
                id: 101,
                product_name: 'Bíblia Sagrada',
                quantity: 1,
                formatted_total_amount: 'R$ 89,90',
                formatted_unit_price: 'R$ 89,90',
                formatted_shipping_cost: 'Grátis',
                payment_method: 'pix',
                payment_status: 'approved',
                order_status: 'paid',
                created_at: '2026-11-08T12:00:00Z',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<MinhaContaPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Minha Conta' })).toBeInTheDocument();
      expect(screen.getByText(/Ana Silva/)).toBeInTheDocument();
      expect(screen.getByText(/Pedido #101/)).toBeInTheDocument();
      expect(screen.getByText(/Bíblia Sagrada/)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React expects the `children` prop of <title> tags to be a string')
    );
  });
});
