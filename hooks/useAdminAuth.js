import { useState, useCallback, useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * @typedef {Object} AdminAuthReturn
 * @property {boolean} isAuthenticated - Se o usuário está autenticado
 * @property {boolean} isChecking - Estado de verificação inicial
 * @property {function} handleLogin - Função de login (username, password) => Promise<{success, error}>
 * @property {function} handleLogout - Função de logout com redirect
 * @property {boolean} loginLoading - Estado de carregamento do login (proveniente do AuthContext)
 * @property {string|null} loginError - Mensagem de erro do login
 */

/**
 * @typedef {Object} UseAdminAuthOptions
 * @property {function} [onLogoutRedirect] - Callback executado após logout bem-sucedido
 */

/**
 * Hook de autenticação para área administrativa.
 * Consome o AuthContext do useAuth e estende com funcionalidades específicas de admin:
 * - Estados isolados de loading e erro para login
 * - Redirect pós-logout via callback opcional
 *
 * @param {UseAdminAuthOptions} [options={}] - Opções de configuração
 * @returns {AdminAuthReturn}
 *
 * @example
 * const { isAuthenticated, isChecking, handleLogin, handleLogout } = useAdminAuth({ onLogoutRedirect: () => router.push('/admin') });
 */
export function useAdminAuth({ onLogoutRedirect } = {}) {
  const { isAuthenticated, loading: isChecking, login, logout, loginLoading } = useContext(AuthContext);
  const [loginError, setLoginError] = useState(null);

  // Função de login com estados isolados de loading e erro
  const handleLogin = useCallback(async (username, password) => {
    setLoginError(null);

    const result = await login(username, password);

    if (!result.success) {
      setLoginError(result.error || 'Falha no login');
    }
    return result;
  }, [login]);

  // Função de logout com redirect opcional via callback
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    if (onLogoutRedirect) {
      onLogoutRedirect();
    }
  }, [logout, onLogoutRedirect]);

  return {
    isAuthenticated,
    isChecking,
    handleLogin,
    handleLogout,
    loginLoading,
    loginError,
  };
}
