import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  const originalMpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

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
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = originalMpPublicKey;
    delete window.MercadoPago;
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

  it('finaliza compra com cartão em http://localhost mesmo quando SDK v2 rejeita createCardToken por SSL com chave APP_USR-', async () => {
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = 'APP_USR-sandbox-test-key-123';

    const mockGetPaymentMethods = jest.fn().mockResolvedValue({
      results: [{ id: 'master', name: 'Mastercard', payment_type_id: 'credit_card', issuer: { id: 24 } }],
    });
    const mockGetInstallments = jest.fn().mockResolvedValue([
      { payer_costs: [{ installments: 1, recommended_message: '1x de R$ 49,90 sem juros' }] },
    ]);
    const mockCreateCardToken = jest
      .fn()
      .mockRejectedValue(
        'MercadoPago.js - Your payment cannot be processed because the website contains credit card data and is not using a secure connection.SSL certificate is required to operate.'
      );

    window.MercadoPago = jest.fn().mockImplementation(() => ({
      getPaymentMethods: mockGetPaymentMethods,
      getInstallments: mockGetInstallments,
      createCardToken: mockCreateCardToken,
    }));

    let checkoutPostPayload = null;
    fetchMock.mockImplementation(async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: {
              id: 10,
              name: 'Ana Silva',
              email: 'ana@exemplo.com',
              default_address: {
                cep: '01001000',
                street: 'Praça da Sé',
                number: '100',
                neighborhood: 'Sé',
                city: 'São Paulo',
                state: 'SP',
              },
            },
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
      if (urlStr.includes('https://api.mercadopago.com/v1/card_tokens')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'mp_fallback_token_abc123' }),
        };
      }
      if (urlStr.endsWith('/api/checkout') && options.method === 'POST') {
        checkoutPostPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            order: {
              id: 99,
              product_name: 'Terço de Madeira',
              quantity: 1,
              total_amount: '49.90',
              payment_method: 'credit_card',
              payment_status: 'approved',
              mp_status_detail: 'accredited',
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Terço de Madeira')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('radio', { name: /Cartão de crédito/i }));
    fireEvent.change(screen.getByLabelText(/CPF ou CNPJ do titular/i), {
      target: { value: '19119119100' },
    });
    fireEvent.change(screen.getByLabelText(/Nome impresso no cartão/i), {
      target: { value: 'APRO' },
    });
    fireEvent.change(screen.getByLabelText(/Número do cartão/i), {
      target: { value: '5031433225206379' },
    });
    fireEvent.change(screen.getByLabelText(/Validade \(MM\/AA\)/i), {
      target: { value: '1130' },
    });
    fireEvent.change(screen.getByLabelText(/CVV/i), {
      target: { value: '123' },
    });

    await waitFor(() => {
      expect(mockGetPaymentMethods).toHaveBeenCalledWith({ bin: '503143' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Pagar' }));

    await waitFor(() => {
      expect(checkoutPostPayload).not.toBeNull();
    });

    expect(window.MercadoPago).toHaveBeenCalledTimes(1);
    expect(window.MercadoPago).toHaveBeenCalledWith('APP_USR-sandbox-test-key-123', {
      locale: 'pt-BR',
      trackingDisabled: true,
    });
    expect(checkoutPostPayload.paymentDetails.token).toBe('mp_fallback_token_abc123');
    expect(checkoutPostPayload.paymentDetails.paymentMethodId).toBe('master');
  });

  it('bloqueia pagamento com cartão quando valor total do pedido é inferior ao mínimo de R$ 0,50 (ex.: R$ 0,01)', async () => {
    fetchMock.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: {
              id: 10,
              name: 'Ana Silva',
              email: 'ana@exemplo.com',
              default_address: {
                cep: '01001000',
                street: 'Praça da Sé',
                number: '100',
                neighborhood: 'Sé',
                city: 'São Paulo',
                state: 'SP',
              },
            },
          }),
        };
      }
      if (urlStr.includes('/api/checkout?productId=5')) {
        return {
          ok: true,
          json: async () => ({
            product: {
              id: 5,
              name: 'Livro Teste',
              price: 0.01,
              stock: 50,
              shipping_type: 'free',
              shipping_cost: 0,
              formatted_price: 'R$ 0,01',
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Livro Teste')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('radio', { name: /Cartão de crédito/i }));
    fireEvent.change(screen.getByLabelText(/CPF ou CNPJ do titular/i), {
      target: { value: '19119119100' },
    });
    fireEvent.change(screen.getByLabelText(/Nome impresso no cartão/i), {
      target: { value: 'APRO' },
    });
    fireEvent.change(screen.getByLabelText(/Número do cartão/i), {
      target: { value: '5031433225206379' },
    });
    fireEvent.change(screen.getByLabelText(/Validade \(MM\/AA\)/i), {
      target: { value: '1130' },
    });
    fireEvent.change(screen.getByLabelText(/CVV/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Pagar' }));

    await waitFor(() => {
      expect(
        screen.getByText(/inferior ao mínimo exigido pelo Mercado Pago para Cartão de Crédito/i)
      ).toBeInTheDocument();
    });
  });
});
