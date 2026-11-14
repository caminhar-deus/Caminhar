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

  it('normaliza link /staging/payments/ para /sandbox/payments/ em pedido com boleto pendente', async () => {
    const stagingTicketUrl =
      'https://www.mercadopago.com.br/staging/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';
    const expectedSandboxTicketUrl =
      'https://www.mercadopago.com.br/sandbox/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';

    global.fetch.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: { id: 9, name: 'Gustavo', email: 'gustavo@exemplo.com' },
          }),
        };
      }
      if (urlStr.includes('/api/customer/orders')) {
        return {
          ok: true,
          json: async () => ({
            orders: [
              {
                id: 21,
                product_name: 'Livro Teste',
                quantity: 1,
                total_amount: 4,
                formatted_total_amount: 'R$ 4,00',
                payment_method: 'ticket',
                payment_status: 'pending',
                order_status: 'awaiting_payment',
                created_at: '2026-11-14T16:40:00.000Z',
                payment_payload: {
                  ticket_url: stagingTicketUrl,
                  digitable_line: '23793380296060108770738006333306316330000000400',
                },
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<MinhaContaPage />);

    await waitFor(() => {
      expect(screen.getByText(/Pedido #21/)).toBeInTheDocument();
      const boletoLink = screen.getByRole('link', { name: /Abrir boleto para pagamento/i });
      expect(boletoLink).toHaveAttribute('href', expectedSandboxTicketUrl);
    });
  });
});
