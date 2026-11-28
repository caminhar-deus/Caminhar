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
  const originalDebitFlag = process.env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD;

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
    if (originalMpPublicKey === undefined) delete process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = originalMpPublicKey;
    if (originalDebitFlag === undefined) delete process.env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD;
    else process.env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD = originalDebitFlag;
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
    const postCall = fetchMock.mock.calls.find(([url, opts]) => String(url).endsWith('/api/checkout') && opts?.method === 'POST');
    expect(postCall[1].headers['X-Idempotency-Key']).toMatch(/^chk_/);
  });

  it('bloqueia fallback direto /v1/card_tokens quando NODE_ENV=production e limpa dados do cartão ao trocar meio de pagamento', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = 'APP_USR-prod-key';

    const mockCreateCardToken = jest
      .fn()
      .mockRejectedValue('MercadoPago.js - SSL certificate is required');
    window.MercadoPago = jest.fn().mockImplementation(() => ({
      getPaymentMethods: jest.fn().mockResolvedValue({
        results: [{ id: 'visa', name: 'Visa', payment_type_id: 'credit_card', issuer: { id: 1 } }],
      }),
      getInstallments: jest.fn().mockResolvedValue([]),
      createCardToken: mockCreateCardToken,
    }));

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

    try {
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

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Pagar' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/SSL|HTTPS/i);
      });
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('/v1/card_tokens'))
      ).toBe(false);

      // Troca para PIX e volta para cartão -> número, validade e CVV foram limpos
      fireEvent.click(screen.getByRole('radio', { name: /PIX/i }));
      fireEvent.click(screen.getByRole('radio', { name: /Cartão de crédito/i }));
      expect(screen.getByLabelText(/Número do cartão/i)).toHaveValue('');
      expect(screen.getByLabelText(/Validade \(MM\/AA\)/i)).toHaveValue('');
      expect(screen.getByLabelText(/CVV/i)).toHaveValue('');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
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

  it('exibe botão "Verificar pagamento agora" no PIX pendente e atualiza para confirmado ao consultar /api/customer/orders?orderId=20', async () => {
    fetchMock.mockImplementation(async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: {
              id: 1,
              name: 'Gustavo',
              email: 'gustavo@exemplo.com',
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
      if (urlStr.endsWith('/api/checkout') && options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            order: {
              id: 20,
              product_name: 'Livro Teste',
              quantity: 1,
              total_amount: 0.01,
              formatted_total_amount: 'R$ 0,01',
              payment_method: 'pix',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
              payment_payload: {
                qr_code: '000201010212PIXTESTE20',
                status_detail: 'waiting_transfer',
              },
            },
          }),
        };
      }
      if (urlStr.includes('/api/customer/orders?orderId=20')) {
        return {
          ok: true,
          json: async () => ({
            order: {
              id: 20,
              product_name: 'Livro Teste',
              quantity: 1,
              total_amount: 0.01,
              formatted_total_amount: 'R$ 0,01',
              payment_method: 'pix',
              payment_status: 'approved',
              order_status: 'paid',
              payment_payload: {
                qr_code: '000201010212PIXTESTE20',
                status_detail: 'accredited',
                mp_order_status: 'processed',
              },
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

    fireEvent.click(screen.getByRole('radio', { name: /PIX/i }));
    fireEvent.change(screen.getByLabelText(/CPF ou CNPJ do titular/i), {
      target: { value: '19119119100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Pagar' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Verificar pagamento agora/i })).toBeInTheDocument();
    });

    expect(screen.getByText('000201010212PIXTESTE20')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Verificar pagamento agora/i }));

    await waitFor(() => {
      expect(screen.getByText('Pedido #20 confirmado e pago!')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/customer/orders?orderId=20&force=1');
    expect(
      screen.queryByRole('button', { name: /Verificar pagamento agora/i })
    ).not.toBeInTheDocument();
  });

  it('normaliza link /staging/payments/ para /sandbox/payments/ no boleto pendente exibido após finalizar compra', async () => {
    const stagingTicketUrl =
      'https://www.mercadopago.com.br/staging/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';
    const expectedSandboxTicketUrl =
      'https://www.mercadopago.com.br/sandbox/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';

    fetchMock.mockImplementation(async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/customer/auth')) {
        return {
          ok: true,
          json: async () => ({
            authenticated: true,
            customer: {
              id: 1,
              name: 'Gustavo',
              email: 'gustavo@exemplo.com',
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
              price: 4,
              stock: 50,
              shipping_type: 'free',
              shipping_cost: 0,
              formatted_price: 'R$ 4,00',
            },
          }),
        };
      }
      if (urlStr.endsWith('/api/checkout') && options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            order: {
              id: 21,
              product_name: 'Livro Teste',
              quantity: 1,
              total_amount: 4,
              formatted_total_amount: 'R$ 4,00',
              payment_method: 'ticket',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
              payment_payload: {
                ticket_url: stagingTicketUrl,
                digitable_line: '23793380296060108770738006333306316330000000400',
                barcode_content: '23793163300000004003380260601087703800633330',
              },
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

    fireEvent.click(screen.getByRole('radio', { name: /Boleto/i }));
    fireEvent.change(screen.getByLabelText(/CPF ou CNPJ/i), {
      target: { value: '19119119100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Pagar' }));

    await waitFor(() => {
      const boletoLink = screen.getByRole('link', { name: /Abrir boleto para pagamento/i });
      expect(boletoLink).toHaveAttribute('href', expectedSandboxTicketUrl);
    });
  });

  it('oculta Cartão de débito quando NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD=false e exibe dica informativa quando habilitado e selecionado', async () => {
    const setupBasicFetch = () => {
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
    };

    process.env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD = 'false';
    setupBasicFetch();
    const { unmount } = render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Terço de Madeira')).toBeInTheDocument();
    });
    expect(screen.queryByRole('radio', { name: /Cartão de débito/i })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cartão de crédito/i })).toBeInTheDocument();
    unmount();

    process.env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD = 'true';
    setupBasicFetch();
    render(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Cartão de débito/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Cartão de débito/i }));
    expect(screen.getByText(/depende de habilitação comercial do emissor/i)).toBeInTheDocument();
  });

  it('exibe alerta transitório em HTTP 429 ou 500 de GET /api/customer/auth sem redirecionar para /entrar', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Muitas consultas em sequência. Aguarde um instante.' }),
    });

    const { unmount } = render(<CheckoutPage />);

    const rateAlert = await screen.findByRole('alert');
    expect(rateAlert).toHaveTextContent('Muitas consultas em sequência. Aguarde um instante.');
    expect(mockReplace).not.toHaveBeenCalled();
    unmount();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('invalid json');
      },
    });

    render(<CheckoutPage />);

    const serverAlert = await screen.findByRole('alert');
    expect(serverAlert).toHaveTextContent(
      'Não foi possível verificar sua sessão no momento. Tente novamente em instantes.'
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
