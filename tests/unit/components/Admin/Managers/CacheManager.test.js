import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import CacheManager from '../../../../../components/Admin/Managers/CacheManager.js';
import toast from 'react-hot-toast';

// Mockando o Toast para interceptarmos as mensagens
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
window.confirm = jest.fn();

describe('Componentes Admin - CacheManager', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    toast.loading.mockReturnValue('id_toast_123');
  });

  it('deve renderizar o painel e o botão corretamente', () => {
    render(<CacheManager />);
    expect(screen.getByText('Cache do Sistema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar Cache Redis' })).toBeInTheDocument();
  });

  it('deve abortar e não disparar API se o usuário cancelar o confirm', async () => {
    window.confirm.mockReturnValueOnce(false);
    render(<CacheManager />);
    
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));
    
    expect(window.confirm).toHaveBeenCalled();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deve chamar a API e exibir um Toast de sucesso', async () => {
    window.confirm.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Cache limpo com sucesso no Redis' })
    });

    render(<CacheManager />);
    const button = screen.getByRole('button', { name: /Limpar Cache/i });
    fireEvent.click(button);

    // O componente deve entrar em loading
    expect(toast.loading).toHaveBeenCalledWith('Limpando cache...');
    expect(button).toHaveTextContent('Limpando...');
    expect(button).toBeDisabled();

    // Após a promessa resolver
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/cache', expect.objectContaining({ method: 'POST' }));
      expect(toast.success).toHaveBeenCalledWith('Cache limpo com sucesso no Redis', { id: 'id_toast_123' });
    });
  });

  it('deve exibir um Toast de erro vindo da API com fallback se não houver message', async () => {
    window.confirm.mockReturnValue(true);
    const { rerender } = render(<CacheManager />);
    
    // 1º Cenário: API retorna erro estruturado
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Não autorizado' }) });
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não autorizado', { id: 'id_toast_123' }));

    // 2º Cenário: API retorna erro vazio (fallback padrão)
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao limpar cache', { id: 'id_toast_123' }));
  });

  it('deve capturar falhas de rede catastróficas (catch block)', async () => {
    window.confirm.mockReturnValueOnce(true);
    mockFetch.mockRejectedValueOnce(new Error('Servidor Offline'));

    render(<CacheManager />);
    fireEvent.click(screen.getByRole('button', { name: /Limpar Cache/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro de conexão ao tentar limpar o cache.', { id: 'id_toast_123' }));
  });
});