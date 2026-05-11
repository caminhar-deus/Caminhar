/**
 * @typedef {Object} AuthContextValue
 * @property {Object|null} user - Dados do usuário autenticado ou null
 * @property {boolean} isAuthenticated - Se o usuário está autenticado
 * @property {boolean} loading - Estado de carregamento inicial
 * @property {function} login - Função assíncrona para login (username, password) => { success, error }
 * @property {function} logout - Função assíncrona para logout
 */

/**
 * useAuth Hook
 * Contexto de autenticação para componentes React
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Contexto de Autenticação
 * @type {React.Context<AuthContextValue>}
 */
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
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

  const login = useCallback(async (username, password) => {
    setLoading(true);
    const abortController = new AbortController();

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
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const abortController = new AbortController();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', signal: abortController.signal });
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