import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthContext } from './AuthContext';

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