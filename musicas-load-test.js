import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },   // Ramp-up: sobe para 5 usuários em 5s
    { duration: '10s', target: 5 },  // Platô: mantém 5 usuários por 10s
    { duration: '5s', target: 0 },   // Ramp-down: desce para 0 em 5s
  ],
  thresholds: {
    // Define que 95% das requisições devem ser mais rápidas que 300ms
    http_req_duration: ['p(95)<300'],
    // Taxa de erro deve ser inferior a 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password';

// A função setup roda uma vez antes do teste iniciar para preparar o ambiente (login)
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Falha no login: ${loginRes.status} ${loginRes.body}`);
  }

  return loginRes.json('token');
}

export default function (token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'ListMusicas' },
  };

  const res = http.get(`${BASE_URL}/api/admin/musicas`, params);

  check(res, {
    'status é 200': (r) => r.status === 200,
    'retornou lista (array)': (r) => Array.isArray(r.json()),
    'tempo de resposta < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(Math.random() * 1 + 1);
}