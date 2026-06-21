import { useState, useCallback, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from './useAuth';

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
 * Consome o AuthContext do useAuth e estende com funcionalidades específicas de admin:
 * - Estados isolados de loading e erro para login
 * - Redirect pós-logout via Next.js Router
 *
 * @returns {AdminAuthReturn}
 *
 * @example
 * const { isAuthenticated, isChecking, handleLogin, handleLogout } = useAdminAuth();
 */
export function useAdminAuth() {
  const router = useRouter();
  const { isAuthenticated, loading: isChecking, login, logout } = useContext(AuthContext);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Função de login com estados isolados de loading e erro
  const handleLogin = useCallback(async (username, password) => {
    setLoginLoading(true);
    setLoginError(null);

    const result = await login(username, password);

    if (!result.success) {
      setLoginError(result.error || 'Falha no login');
    }
    setLoginLoading(false);
    return result;
  }, [login]);

  // Função de logout com redirect
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/admin');
  }, [logout, router]);

  return {
    isAuthenticated,
    isChecking,
    handleLogin,
    handleLogout,
    loginLoading,
    loginError,
  };
}
