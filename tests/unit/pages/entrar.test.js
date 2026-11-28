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

    const backIcon = screen.getByRole('link', { name: /Voltar ao site/i }).querySelector('svg');
    expect(backIcon?.querySelector('polyline')).toHaveAttribute('points', '15 18 9 12 15 6');
    expect(backIcon?.querySelector('circle')).toBeNull();
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

  it('sem NEXT_PUBLIC_GOOGLE_CLIENT_ID não injeta script GSI e oculta opção do Google sem expor variável interna', async () => {
    const { container } = render(<EntrarPage />);

    await waitFor(() => {
      expect(document.querySelector('script[data-google-gsi="true"]')).toBeNull();
    });

    expect(screen.queryByRole('button', { name: /Sign in with Google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Google/i })).not.toBeInTheDocument();
    expect(screen.queryByText('ou')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('NEXT_PUBLIC_GOOGLE_CLIENT_ID');

    const host = container.querySelector('div[aria-busy]');
    expect(host).not.toBeNull();
    expect(host.hidden).toBe(true);
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

  it('em viewport < 380px com window.google já em cache, mantém o container visível e ajusta width <= 280', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';
    const initializeMock = jest.fn();
    const renderButtonMock = jest.fn();
    window.google = {
      accounts: {
        id: {
          initialize: initializeMock,
          renderButton: renderButtonMock,
        },
      },
    };

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 360,
    });

    try {
      const { container } = render(<EntrarPage />);
      const host = container.querySelector('[aria-busy]');
      expect(host).not.toBeNull();
      expect(host.hidden).toBe(false);

      await waitFor(() => {
        expect(renderButtonMock).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            width: 264,
          })
        );
      });
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('não exibe divisor "ou" já na renderização síncrona inicial sem NEXT_PUBLIC_GOOGLE_CLIENT_ID', () => {
    const { container } = render(<EntrarPage />);

    expect(screen.queryByText('ou')).not.toBeInTheDocument();
    const host = container.querySelector('div[aria-busy]');
    expect(host).not.toBeNull();
    expect(host.hidden).toBe(true);
  });

  it('dispara timeout de 10s ao carregar script GSI preso e permite tentar novamente', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';
    jest.useFakeTimers();

    try {
      render(<EntrarPage />);
      expect(document.querySelector('script[data-google-gsi="true"]')).not.toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });
    } finally {
      jest.useRealTimers();
    }

    const retryButton = await screen.findByRole('button', { name: 'Tentar novamente com Google' });
    expect(retryButton).toBeInTheDocument();
    expect(document.querySelector('script[data-google-gsi="true"]')).toBeNull();

    fireEvent.click(retryButton);
    await mockGsiAndLoad();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Tentar novamente com Google' })).not.toBeInTheDocument();
    });
  });

  it('marca o container Google como inert e ignora callbacks/submits concorrentes durante envio', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id-123.apps.googleusercontent.com';

    let resolvePost;
    const pendingPost = new Promise((resolve) => {
      resolvePost = resolve;
    });

    fetchMock.mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return pendingPost;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ authenticated: false, customer: null }),
      });
    });

    const initializeMock = jest.fn();
    const { container } = render(<EntrarPage />);
    await mockGsiAndLoad({ initializeMock, renderButtonMock: jest.fn() });
    await waitFor(() => expect(initializeMock).toHaveBeenCalled());

    const callback = initializeMock.mock.calls[0][0].callback;
    const host = container.querySelector('div[aria-busy]');

    act(() => {
      callback({ credential: 'jwt-1' });
    });

    expect(host).toHaveAttribute('aria-busy', 'true');
    expect(host.inert || host.hasAttribute('inert')).toBe(true);

    // Segunda chamada Google concorrente e submit de formulário devem ser ignorados
    act(() => {
      callback({ credential: 'jwt-2' });
    });
    const form = screen.getByRole('button', { name: 'Entrar' }).closest('form');
    fireEvent.submit(form);

    const postCallsDuringFlight = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === 'POST'
    );
    expect(postCallsDuringFlight).toHaveLength(1);

    await act(async () => {
      resolvePost({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token recusado.' }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Token recusado.');
    });
    expect(host).toHaveAttribute('aria-busy', 'false');
    expect(Boolean(host.inert) || host.hasAttribute('inert')).toBe(false);

    // Após erro, nova submissão volta a ser aceita
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customer: { id: 1 } }),
    });
    await act(async () => {
      await callback({ credential: 'jwt-retry' });
    });
    const postCallsAfterReset = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === 'POST'
    );
    expect(postCallsAfterReset).toHaveLength(2);
  });
});
