import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import EntrarPage from '../../../pages/entrar.js';

describe('Página de Acesso do Visitante (pages/entrar.js)', () => {
  let fetchMock;
  let consoleErrorSpy;
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
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
});
