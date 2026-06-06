import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import CacheManager from '../../../../../components/Admin/Managers/CacheManager.js';
import toast from 'react-hot-toast';
import { suppressConsoleError, createConfirmSpy, mockGlobalFetch } from '../../../../helpers/index.js';

// Mockando o Toast para interceptarmos as mensagens
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Componentes Admin - CacheManager', () => {
  let consoleErrorSpy;
  let confirmSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    confirmSpy = createConfirmSpy(false);
    fetchMock = mockGlobalFetch();
    toast.loading.mockReturnValue('id_toast_123');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        redisConnected: true,
        redisErrors: 0,
        fallbackActivations: 0,
        lastFallbackTime: null,
        localMapSize: 0
      })
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    confirmSpy?.mockRestore();
    fetchMock?.mockRestore();
  });

  it('deve renderizar o painel e o botão corretamente', () => {
    render(<CacheManager />);
    expect(screen.getByText('Cache do Sistema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar Cache Redis' })).toBeInTheDocument();
  });

  it('deve abortar e não disparar API se o usuário cancelar o confirm', async () => {
    confirmSpy.mockReturnValueOnce(false);
    render(<CacheManager />);

    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deve chamar a API e exibir um Toast de sucesso', async () => {
    confirmSpy.mockReturnValueOnce(true);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Cache limpo com sucesso no Redis' })
    });

    render(<CacheManager />);
    const button = screen.getByRole('button', { name: /Limpar Cache/i });
    fireEvent.click(button);

    expect(toast.loading).toHaveBeenCalledWith('Limpando cache...');
    expect(button).toHaveTextContent('Limpando...');
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/cache', expect.objectContaining({ method: 'POST' }));
      expect(toast.success).toHaveBeenCalledWith('Cache limpo com sucesso no Redis', { id: 'id_toast_123' });
    });
  });

  it('deve exibir um Toast de erro vindo da API com fallback se não houver message', async () => {
    confirmSpy.mockReturnValue(true);
    const { rerender } = render(<CacheManager />);

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Não autorizado' }) });
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não autorizado', { id: 'id_toast_123' }));

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao limpar cache', { id: 'id_toast_123' }));
  });

  it('deve capturar falhas de rede catastróficas (catch block)', async () => {
    confirmSpy.mockReturnValueOnce(true);
    global.fetch.mockRejectedValueOnce(new Error('Servidor Offline'));

    render(<CacheManager />);
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro de conexão ao tentar limpar o cache.', { id: 'id_toast_123' }));
  });
});