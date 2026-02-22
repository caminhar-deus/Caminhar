import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// --- Opções do Teste Negativo ---
export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp-up rápido para 10 usuários tentando invadir
    { duration: '30s', target: 10 }, // Mantém a carga de tentativas de login inválido
    { duration: '10s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    // Respostas de erro (401) geralmente são mais leves e devem ser rápidas
    http_req_duration: ['p(95)<300'], 
    // Aqui o sucesso é receber um erro 401. Se recebermos 200 ou 500, o teste falha.
    checks: ['rate>0.99'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // --- Cenário 1: Usuário existente, senha incorreta ---
  const payloadWrongPass = JSON.stringify({
    username: 'admin',
    password: 'senha_incorreta_proposital',
  });

  const resWrongPass = http.post(`${BASE_URL}/api/v1/auth/login`, payloadWrongPass, { 
    headers, 
    tags: { type: 'wrong_password' } 
  });

  check(resWrongPass, {
    'Wrong Pass: status é 401': (r) => r.status === 401,
    'Wrong Pass: mensagem de erro correta': (r) => r.json('message') === 'Credenciais inválidas',
  });

  sleep(1);

  // --- Cenário 2: Usuário inexistente ---
  const payloadNoUser = JSON.stringify({
    username: 'usuario_fantasma_k6',
    password: 'qualquer_senha',
  });

  const resNoUser = http.post(`${BASE_URL}/api/v1/auth/login`, payloadNoUser, { 
    headers, 
    tags: { type: 'non_existent_user' } 
  });

  check(resNoUser, {
    'No User: status é 401': (r) => r.status === 401,
    // Por segurança, a mensagem deve ser genérica ("Credenciais inválidas") e não "Usuário não encontrado"
    'No User: mensagem genérica de segurança': (r) => r.json('message') === 'Credenciais inválidas',
  });

  sleep(1);
}

export function handleSummary(data) {
  // Neste teste não há token gerado para ocultar, mas mantemos o padrão de saída
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/login_negative_test.json': JSON.stringify(data, null, 4),
  };
}