import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import EntrarPage from '../../../pages/entrar.js';

describe('Página de Acesso do Visitante (pages/entrar.js)', () => {
  let fetchMock;
  let consoleErrorSpy;
  const mockPush = jest.fn().mockResolvedValue(true);
  const mockReplace = jest.fn().mockResolvedValue(true);

  const cleanupGoogleGlobals = () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (typeof window !== 'undefined') {
      delete window.google;
    }
    document.querySelectorAll('script[data-google-gsi="true"]').forEach((el) => el.remove());
  };

  const mockGsiAndLoad = async ({ initializeMock = jest.fn(), renderButtonMock = jest.fn() } = {}) => {
    const gsiScript = document.querySelector('script[data-google-gsi="true"]');
    expect(gsiScript).not.toBeNull();

    window.google = {
      accounts: {
        id: {
          initialize: initializeMock,
          renderButton: renderButtonMock,
        },
      },
    };

    await act(async () => {
      fireEvent(gsiScript, new Event('load'));
    });

    return { gsiScript, initializeMock, renderButtonMock };
  };

  beforeEach(() => {
    cleanupGoogleGlobals();
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    consoleErrorSpy = suppressConsoleError();
    useRouter.mockReturnValue({
      query: {},
      pathname: '/entrar',
      asPath: '/entrar',
      push: mockPush,
      replace: mockReplace,
    });
    // Default: visitante não autenticado
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: false, customer: null }),
    });
  });

  afterEach(() => {
    cleanupGoogleGlobals();
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('renderiza no modo login com título contendo uma única string (compatibilidade React 19)', async () => {
    render(<EntrarPage />);

    // Verifica que não houve erro no console sobre children de <title>
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React expects the `children` prop of <title> tags to be a string')
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Acesse sua conta' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Já tenho conta', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('alterna para o modo criar conta ao clicar na aba correspondente', async () => {
    render(<EntrarPage />);

    const registerTab = screen.getByRole('tab', { name: 'Criar conta' });
    fireEvent.click(registerTab);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Crie sua conta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cadastrar e Continuar' })).toBeInTheDocument();
    });

    // Garante ausência de erros de formatação de <title>
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React expects the `children` prop of <title> tags to be a string')
    );
  });

  it('sem NEXT_PUBLIC_GOOGLE_CLIENT_ID não injeta script GSI e exibe alerta informativo ao clicar no botão fallback', async () => {
    render(<EntrarPage />);

    expect(document.querySelector('script[data-google-gsi="true"]')).toBeNull();

    const fallbackButton = await screen.findByRole('button', { name: 'Sign in with Google' });
    fireEvent.click(fallbackButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    expect(document.querySelector('script[data-google-gsi="true"]')).toBeNull();
  });

  it('com NEXT_PUBLIC_GOOGLE_CLIENT_ID injeta script GSI, inicializa popup, renderiza botão e autentica via POST /api/customer/auth', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';
    useRouter.mockReturnValue({
      query: { next: '/checkout/42' },
      pathname: '/entrar',
      asPath: '/entrar?next=/checkout/42',
      push: mockPush,
      replace: mockReplace,
    });

    const initializeMock = jest.fn();
    const renderButtonMock = jest.fn();

    render(<EntrarPage />);

    const { gsiScript } = await mockGsiAndLoad({ initializeMock, renderButtonMock });
    expect(gsiScript).toHaveAttribute('src', 'https://accounts.google.com/gsi/client');

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'google-client-id-123.apps.googleusercontent.com',
          ux_mode: 'popup',
          callback: expect.any(Function),
        })
      );
      expect(renderButtonMock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          type: 'standard',
          locale: 'pt-BR',
        })
      );
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customer: { id: 7, email: 'maria@gmail.com' } }),
    });

    const callback = initializeMock.mock.calls[0][0].callback;
    await act(async () => {
      await callback({ credential: 'fake-google-jwt' });
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'google', credential: 'fake-google-jwt' }),
    });
    expect(mockPush).toHaveBeenCalledWith('/checkout/42');
  });

  it('exibe mensagem de erro em role="alert" quando /api/customer/auth retorna 401 no login com Google', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';

    const initializeMock = jest.fn();
    const renderButtonMock = jest.fn();

    render(<EntrarPage />);

    await mockGsiAndLoad({ initializeMock, renderButtonMock });

    await waitFor(() => expect(initializeMock).toHaveBeenCalled());

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token Google recusado.' }),
    });

    const callback = initializeMock.mock.calls[0][0].callback;
    await act(async () => {
      await callback({ credential: 'invalid-google-jwt' });
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Token Google recusado.');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('exibe opção de tentar novamente quando o carregamento do script GSI falha e reinjeta ao clicar', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';

    render(<EntrarPage />);

    const firstScript = document.querySelector('script[data-google-gsi="true"]');
    expect(firstScript).not.toBeNull();

    await act(async () => {
      fireEvent(firstScript, new Event('error'));
    });

    const retryButton = await screen.findByRole('button', { name: 'Tentar novamente com Google' });
    expect(retryButton).toBeInTheDocument();
    expect(document.querySelector('script[data-google-gsi="true"]')).toBeNull();

    fireEvent.click(retryButton);

    const secondScript = document.querySelector('script[data-google-gsi="true"]');
    expect(secondScript).not.toBeNull();
    expect(secondScript).toHaveAttribute('src', 'https://accounts.google.com/gsi/client');

    const { initializeMock, renderButtonMock } = await mockGsiAndLoad();
    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalled();
      expect(renderButtonMock).toHaveBeenCalled();
    });
  });

  it('permite retry sem travar em loading quando renderButton falha e window.google já está carregado', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';

    const initializeMock = jest.fn();
    const renderButtonMock = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('Render failed');
      })
      .mockImplementationOnce(() => {});

    render(<EntrarPage />);

    await mockGsiAndLoad({ initializeMock, renderButtonMock });

    const retryButton = await screen.findByRole('button', { name: 'Tentar novamente com Google' });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledTimes(2);
      expect(renderButtonMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText('Carregando acesso com Google...')).not.toBeInTheDocument();
  });
});
