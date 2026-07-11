/**
 * @typedef {Object} AuthContextValue
 * @property {Object|null} user - Dados do usuário autenticado ou null
 * @property {boolean} isAuthenticated - Se o usuário está autenticado
 * @property {boolean} loading - Estado de carregamento da verificação inicial de sessão
 * @property {boolean} loginLoading - Estado de carregamento específico do login (evita flicker)
 * @property {function} login - Função assíncrona para login (username, password) => { success, error }
 * @property {function} logout - Função assíncrona para logout
 */

import { createContext } from 'react';

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