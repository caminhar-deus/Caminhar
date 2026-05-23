// Módulo compartilhado para autenticação nos testes k6
// Centraliza a lógica de login evitando duplicação em ~18 arquivos

import http from 'k6/http';
import { BASE_URL, USERNAME, PASSWORD } from './config.js';

/**
 * Realiza login e retorna o token JWT.
 * Utiliza as credenciais configuradas em helpers/config.js.
 *
 * @param {Object} [options] - Opções adicionais
 * @param {string} [options.baseUrl] - URL base (fallback para config.BASE_URL)
 * @param {string} [options.username] - Nome de usuário (fallback para config.USERNAME)
 * @param {string} [options.password] - Senha (fallback para config.PASSWORD)
 * @returns {{ token: string }} Objeto com o token JWT
 * @throws {Error} Se o login falhar ou a estrutura da resposta for inesperada
 */
export function setup(options = {}) {
  const url = options.baseUrl || BASE_URL;
  const username = options.username || USERNAME;
  const password = options.password || PASSWORD;

  const loginRes = http.post(
    `${url}/api/auth/login?response=body`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} - ${loginRes.body}`);
  }

  const body = loginRes.json();
  if (!body || !body.data || !body.data.token) {
    throw new Error(
      `Estrutura de resposta inesperada no login: ${JSON.stringify(body)}`
    );
  }

  return { token: body.data.token };
}