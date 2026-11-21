import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { mockGlobalFetch } from '../../helpers/index.js';
import {
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_REFRESH_STORAGE_KEY,
} from '../../../utils/adminSession.js';
import LoginPage from '../../../pages/login.js';

describe('pages/login.js — Avisos de sessão encerrada e registro de atividade', () => {
  let fetchMock;
  const mockPush = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    mockPush.mockClear();
    localStorage.clear();
    useRouter.mockReturnValue({
      query: {},
      push: mockPush,
      replace: jest.fn(),
    });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    localStorage.clear();
  });

  it('não exibe aviso de sessão quando não há query param reason', () => {
    render(<LoginPage />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('exibe aviso informativo de inatividade quando reason=inactivity', () => {
    useRouter.mockReturnValue({
      query: { next: '/admin', reason: 'inactivity' },
      push: mockPush,
      replace: jest.fn(),
    });

    render(<LoginPage />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(
      'Sua sessão foi encerrada automaticamente após 1 hora de inatividade. Entre novamente para continuar.'
    );
  });

  it('exibe aviso informativo de expiração quando reason=expired', () => {
    useRouter.mockReturnValue({
      query: { next: '/admin', reason: 'expired' },
      push: mockPush,
      replace: jest.fn(),
    });

    render(<LoginPage />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(
      'Sua sessão expirou. Entre novamente para continuar.'
    );
  });

  it('grava admin_last_activity_at ao autenticar com sucesso e redireciona para ?next', async () => {
    useRouter.mockReturnValue({
      query: { next: '/admin', reason: 'inactivity' },
      push: mockPush,
      replace: jest.fn(),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: { id: 1, username: 'admin', role: 'admin' } }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte123' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
    expect(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)).toMatch(/^\d+$/);
    expect(localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY)).toMatch(/^\d+$/);
  });

  it('não grava marcadores de atividade nem refresh quando o login falha com HTTP 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized', message: 'Credenciais inválidas' }),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaErrada123' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Usuário ou senha incorretos. Tente de novo.');
    expect(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
