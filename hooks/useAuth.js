/**
 * @typedef {Object} AuthContextValue
 * @property {Object|null} user - Dados do usuário autenticado ou null
 * @property {boolean} isAuthenticated - Se o usuário está autenticado
 * @property {boolean} loading - Estado de carregamento da verificação inicial de sessão
 * @property {boolean} loginLoading - Estado de carregamento específico do login (evita flicker)
 * @property {function} login - Função assíncrona para login (username, password) => { success, error }
 * @property {function} logout - Função assíncrona para logout
 */

/**
 * useAuth Hook
 * Contexto de autenticação para componentes React
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * Contexto de Autenticação
 * @type {React.Context<AuthContextValue>}
 */
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  loginLoading: false,
  login: async () => {},
  logout: async () => {},
});

/**
 * Provider de Autenticação
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const loginAbortRef = useRef(null);

  const login = useCallback(async (username, password) => {
    setLoginLoading(true);

    // Aborta requisição de login anterior se existir
    if (loginAbortRef.current) {
      loginAbortRef.current.abort();
    }

    const abortController = new AbortController();
    loginAbortRef.current = abortController;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        signal: abortController.signal,
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return { success: true };
      }

      const error = await res.json();
      return { success: false, error: error.message };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false };
      return { success: false, error: 'Erro de conexão' };
    } finally {
      setLoginLoading(false);
      loginAbortRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { credentials: 'include', signal: abortController.signal });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      abortController.abort();
    };
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    loginLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para acessar o contexto de autenticação
 * @returns {AuthContextValue} Contexto de autenticação
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

export default useAuth;