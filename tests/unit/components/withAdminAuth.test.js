import React from 'react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';

// --- Mocks ---

// Mock do Next.js Router para verificar redirecionamentos
const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock da função de verificação de token.
// Em um caso real, isso mockaria a chamada de API ou o hook de autenticação.
const mockVerifyToken = jest.fn();

// --- Componentes de Teste ---

// Componente "interno" que só deve ser renderizado se a autenticação for bem-sucedida.
const ProtectedAdminComponent = () => {
  return <div>Painel do Administrador</div>;
};

// HOC (Higher-Order Component) hipotético para demonstração.
// Este HOC envolve um componente e verifica a autenticação antes de renderizá-lo.
const withAdminAuth = (WrappedComponent) => {
  const WithAdminAuthComponent = (props) => {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const checkAuth = async () => {
        try {
          const user = await mockVerifyToken();
          if (user && user.role === 'admin') {
            setIsAuthorized(true);
          } else {
            // Se não for admin ou o token for inválido, redireciona
            router.push('/login?error=unauthorized');
          }
        } catch (error) {
          // Se a verificação falhar (ex: token não existe), redireciona
          router.push('/login?error=unauthorized');
        } finally {
          setLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    if (loading) {
      return <div>Verificando acesso...</div>;
    }

    return isAuthorized ? <WrappedComponent {...props} /> : null;
  };
  return WithAdminAuthComponent;
};

// Componente final que será testado
const SecuredAdminPage = withAdminAuth(ProtectedAdminComponent);

// --- Suíte de Testes ---

describe('HOC withAdminAuth', () => {
  beforeEach(() => {
    // Limpa os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve redirecionar para /login se não houver token (verificação falha)', async () => {
    mockVerifyToken.mockRejectedValue(new Error('No token'));
    render(<SecuredAdminPage />);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?error=unauthorized');
    });
    expect(screen.queryByText('Painel do Administrador')).not.toBeInTheDocument();
  });

  it('deve redirecionar para /login se o token for inválido ou o usuário não for admin', async () => {
    mockVerifyToken.mockResolvedValue({ id: 1, role: 'user' });
    render(<SecuredAdminPage />);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?error=unauthorized');
    });
    expect(screen.queryByText('Painel do Administrador')).not.toBeInTheDocument();
  });

  it('deve renderizar o componente protegido se o token for válido e o usuário for admin', async () => {
    mockVerifyToken.mockResolvedValue({ id: 1, role: 'admin' });
    render(<SecuredAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Painel do Administrador')).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});