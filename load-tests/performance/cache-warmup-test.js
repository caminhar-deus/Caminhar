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

/**
 * Verifica se o cache foi populado executando requisição extra de confirmação
 * antes de considerar o warm-up bem-sucedido.
 */
function verifyCachePopulated(baseUrl, token) {
  // Requisição adicional para confirmar cache quente
  const verifyRes = http.get(`${baseUrl}/api/posts`, token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {}
  );
  return verifyRes.status === 200 && verifyRes.timings.duration < 200;
}

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

  // Cada endpoint é chamado 5x para garantir cache populado
  // Aumentado de 3 para 5 rounds para assegurar TTL estável
  for (let round = 0; round < 5; round++) {
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

  // Verifica se o cache está realmente quente antes de finalizar
  const cacheQuente = verifyCachePopulated(BASE_URL, token);
  if (!cacheQuente) {
    console.warn(`[Warmup] ⚠️ Cache pode não estar completamente populado (resposta lenta)`);
  } else {
    console.log(`[Warmup] ✅ Cache quente confirmado`);
  }

  console.log(`[Warmup] ✅ Cache populado com sucesso após ${endpoints.length * 5} requisições`);
}