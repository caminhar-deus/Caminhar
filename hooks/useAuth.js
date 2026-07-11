import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Hook para acessar o contexto de autenticação
 * @returns {AuthContextValue} Contexto de autenticação
 */
export const useAuth = () => {
  return useContext(AuthContext);
};