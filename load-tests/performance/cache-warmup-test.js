import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

/**
 * Teste de warm-up do cache.
 * 
 * Objetivo: Popular o cache (Redis e/ou memória) com dados antes dos
 * testes de performance principais. Deve ser executado ANTES do
 * cache-performance-test para garantir que as métricas reflitam
 * o comportamento com cache quente.
 * 
 * Cenário:
 * - 1 VU faz requisições sequenciais para os principais endpoints
 * - Cada requisição é repetida 3x para garantir cache populado
 * - Pequeno delay entre requisições para não sobrecarregar no warm-up
 * - Execução única, sem thresholds agressivos
 */

export const options = {
  scenarios: {
    warmup: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Apenas verifica se o servidor respondeu, sem thresholds de latência
    http_req_failed: ['rate<0.50'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

export default function () {
  // 1. Login (para token de settings)
  const loginRes = http.post(`${BASE_URL}/api/auth/login?response=body`, JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    console.warn(`[Warmup] Login falhou: ${loginRes.status}`);
    exec.test.abort(`Falha no login durante warm-up: ${loginRes.status}`);
  }

  const token = loginRes.json('data.token');

  // 2. Requisições de warm-up (repetidas para garantir cache populado)
  const endpoints = [
    { url: `${BASE_URL}/api/posts`, auth: false },
    { url: `${BASE_URL}/api/posts?page=1&limit=10`, auth: false },
    { url: `${BASE_URL}/api/posts?page=2&limit=5`, auth: false },
    { url: `${BASE_URL}/api/settings`, auth: true },
  ];

  // Cada endpoint é chamado 3x para garantir cache populado
  for (let round = 0; round < 3; round++) {
    for (const endpoint of endpoints) {
      const params = endpoint.auth
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const res = http.get(endpoint.url, params);

      check(res, {
        [`warmup ${endpoint.url} (round ${round + 1})`]: (r) => r.status >= 200 && r.status < 500,
      });

      // Pequeno delay para não sobrecarregar
      sleep(0.1);
    }
  }

  console.log(`[Warmup] ✅ Cache populado com sucesso após ${endpoints.length * 3} requisições`);
}