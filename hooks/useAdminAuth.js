import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * @typedef {Object} AdminAuthReturn
 * @property {boolean} isAuthenticated - Se o usuário está autenticado
 * @property {boolean} isChecking - Estado de verificação inicial
 * @property {function} handleLogin - Função de login (username, password) => Promise<{success, error}>
 * @property {function} handleLogout - Função de logout com redirect
 * @property {boolean} loginLoading - Estado de carregamento do login
 * @property {string|null} loginError - Mensagem de erro do login
 */

/**
 * Hook de autenticação para área administrativa.
 * Unifica verificação de sessão, login e logout com redirect.
 * Substitui a lógica do HOC withAdminAuth, reutilizando o padrão de fetch.
 *
 * @returns {AdminAuthReturn}
 *
 * @example
 * const { isAuthenticated, isChecking, handleLogin, handleLogout } = useAdminAuth();
 */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const router = typeof window !== 'undefined' ? useRouter() : null;

  // Verifica autenticação na montagem
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Função de login
  const handleLogin = useCallback(async (username, password) => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (response.ok) {
        setIsAuthenticated(true);
        return { success: true };
      }

      const data = await response.json();
      const errorMessage = data.message || data.error || 'Falha no login';
      setLoginError(errorMessage);
      return { success: false, error: errorMessage };
    } catch (err) {
      const errorMessage = 'Erro de conexão';
      setLoginError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // Função de logout com redirect
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
    if (router) {
      router.push('/admin');
    }
  }, [router]);

  return {
    isAuthenticated,
    isChecking,
    handleLogin,
    handleLogout,
    loginLoading,
    loginError,
  };
}

export default useAdminAuth;