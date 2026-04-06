import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import withAdminAuth from '../../../../components/Admin/withAdminAuth.js';

// Mock do next/head para evitar erros do DOM de cabeçalho
jest.mock('next/head', () => {
  return function MockHead({ children }) {
    return <div data-testid="next-head">{children}</div>;
  };
});

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('Higher-Order Component - withAdminAuth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const DummyComponent = () => <div data-testid="dummy-content">Conteúdo Protegido</div>;
  const ProtectedPage = withAdminAuth(DummyComponent, { title: 'Página Secreta' });

  it('deve exibir tela de verificação de autenticação no carregamento inicial', async () => {
    // Seguramos a Promise pendente para garantir que o Loading seja visto na tela
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));

    render(<ProtectedPage />);
    expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();

    resolveApi({ ok: true });
    await waitFor(() => expect(screen.queryByText('Verificando autenticação...')).not.toBeInTheDocument());
  });

  it('deve renderizar o formulário de login se o usuário não estiver autenticado', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false }); // Falha no auth check da página
    
    render(<ProtectedPage />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Usuário')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
      expect(screen.getByText('Entrar')).toBeInTheDocument();
    });
  });

  it('deve exibir erro no formulário se as credenciais de login falharem', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false }); // Auth check inicial
    render(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Senha incorreta' }) });
    
    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Entrar'));

    expect(screen.getByText('Entrando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
    });
  });

  it('deve exibir erro genérico se as credenciais falharem sem mensagem da API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false }); // Auth check inicial
    render(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // Sem message
    
    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByText('Falha no login')).toBeInTheDocument();
    });
  });

  it('deve autenticar e liberar o componente protegido ao realizar login com sucesso', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false }); // Auth check falha no começo
    render(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    
    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByTestId('dummy-content')).toBeInTheDocument();
      expect(screen.getByText('Sair')).toBeInTheDocument();
    });
  });

  it('deve efetuar logout e redirecionar o usuário ao clicar em Sair', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true }); // Usuário já validado de primeira
    render(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Sair')).toBeInTheDocument());

    global.fetch.mockResolvedValueOnce({ ok: true }); // Rota de Logout
    
    fireEvent.click(screen.getByText('Sair'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
  });

  it('deve capturar e logar exceção de rede silenciosamente no checkAuth', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error('Network Disconnected'));
    
    render(<ProtectedPage />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Auth check failed:', expect.any(Error)));
    consoleSpy.mockRestore();
  });
});