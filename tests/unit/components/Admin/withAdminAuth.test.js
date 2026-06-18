import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import withAdminAuth from '../../../../components/Admin/withAdminAuth.js';
import { mockGlobalFetch } from '../../../helpers/index.js';
import '../../../mocks/next-setup.js';
import { AuthProvider } from '../../../../hooks/useAuth.js';

// Mock do next/head especifico para este HOC
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
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  const DummyComponent = () => <div data-testid="dummy-content">Conteúdo Protegido</div>;
  const ProtectedPage = withAdminAuth(DummyComponent, { title: 'Página Secreta' });

  /**
   * Renderiza o componente envolto no AuthProvider real.
   * Isso garante que o useEffect de checkAuth (dentro do provider) execute
   * e utilize os mocks de fetch configurados, reproduzindo fielmente o fluxo real.
   */
  const renderWithAuthProvider = (ui) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  it('deve exibir tela de verificação de autenticação no carregamento inicial', async () => {
    // Seguramos a Promise para garantir que o Loading seja visto na tela
    let resolveApi;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));

    renderWithAuthProvider(<ProtectedPage />);
    expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();

    resolveApi({ ok: true, json: async () => ({ user: { id: 1, username: 'admin', role: 'admin' } }) });
    await waitFor(() => expect(screen.queryByText('Verificando autenticação...')).not.toBeInTheDocument());
  });

  it('deve renderizar o formulário de login se o usuário não estiver autenticado', async () => {
    // O AuthProvider fará fetch('/api/auth/check'), que retorna { ok: false }
    fetchMock.mockResolvedValueOnce({ ok: false });

    renderWithAuthProvider(<ProtectedPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Usuário')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
      expect(screen.getByText('Entrar')).toBeInTheDocument();
    });
  });

  it('deve exibir erro no formulário se as credenciais de login falharem', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false }); // Auth check inicial
    renderWithAuthProvider(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Senha incorreta' }) }); // Login

    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Entrar'));

    expect(screen.getByText('Entrando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
    });
  });

  it('deve exibir erro genérico se as credenciais falharem sem mensagem da API', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false }); // Auth check inicial
    renderWithAuthProvider(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // Login sem message

    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByText('Falha no login')).toBeInTheDocument();
    });
  });

  it('deve autenticar e liberar o componente protegido ao realizar login com sucesso', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false }); // Auth check falha
    renderWithAuthProvider(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 1, username: 'admin', role: 'admin' } }) }); // Login sucesso

    fireEvent.change(screen.getByPlaceholderText('Usuário'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByTestId('dummy-content')).toBeInTheDocument();
      expect(screen.getByText('Sair')).toBeInTheDocument();
    });
  });

  it('deve efetuar logout e redirecionar o usuário ao clicar em Sair', async () => {
    // Autenticado de primeira — checkAuth retorna usuário válido
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 1, username: 'admin', role: 'admin' } }) });
    renderWithAuthProvider(<ProtectedPage />);
    await waitFor(() => expect(screen.getByText('Sair')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce({ ok: true }); // Rota de Logout

    fireEvent.click(screen.getByText('Sair'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
  });

  it('deve capturar e tratar exceção de rede silenciosamente no checkAuth', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network Disconnected'));

    renderWithAuthProvider(<ProtectedPage />);

    // O erro de rede no checkAuth é silencioso (não logado no AuthProvider),
    // mas o loading deve terminar e o formulário de login deve aparecer
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Usuário')).toBeInTheDocument();
    });
  });
});