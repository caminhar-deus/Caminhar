import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

// A função setup roda uma vez antes do teste iniciar para preparar o ambiente (login)
export function setup() {
  const res = http.get(BASE_URL);
  if (res.status === 0) {
    exec.test.abort(`❌ Conexão recusada em ${BASE_URL}. O servidor está rodando?`);
  }

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    console.error(`Falha no login: ${loginRes.status}`);
    console.error(`Body: ${loginRes.body}`);
    exec.test.abort('Teste abortado devido a falha no login.');
  }

  if (loginRes.headers['Content-Type'] && !loginRes.headers['Content-Type'].includes('application/json')) {
    exec.test.abort(`Login retornou conteúdo não-JSON: ${loginRes.body.substring(0, 100)}...`);
  }

  return loginRes.json('data.token');
}

export default function (token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'ListMusicas' },
  };

  // Correção da URL: removido '/v1' para corresponder a pages/api/admin/musicas.js
  const res = http.get(`${BASE_URL}/api/admin/musicas`, params);

  check(res, {
    'status é 200': (r) => r.status === 200,
    'retornou lista (array)': (r) => {
      // Verifica se é JSON antes de fazer o parse para evitar GoError
      const isJson = r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json');
      return isJson && r.json('musicas') && Array.isArray(r.json('musicas'));
    },
    'tempo de resposta < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(Math.random() * 1 + 1);
}