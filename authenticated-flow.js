import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 }, // Ramp-up para 5 usuários virtuais
    { duration: '20s', target: 5 }, // Mantém a carga por 20 segundos
    { duration: '5s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem ser abaixo de 500ms
    'checks{flow:login}': ['rate>0.99'], // Taxa de sucesso do login deve ser > 99%
    'checks{flow:get_posts}': ['rate>0.99'], // Taxa de sucesso do acesso à rota protegida deve ser > 99%
  },
};

// --- Configuração do Teste ---
// Obtenha as credenciais das variáveis de ambiente para segurança.
// Exemplo de execução:
// k6 run -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=password load-tests/authenticated-flow.js
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password';
const BASE_URL = 'http://localhost:3000';

export default function () {
  // --- 1. Login e obtenção do token ---
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { flow: 'login' },
    }
  );

  const loginOk = check(loginRes, {
    'login bem-sucedido': (r) => r.status === 200,
    'token recebido': (r) => r.json('token') !== undefined,
  }, { flow: 'login' });

  // Aborta a iteração se o login falhar
  if (!loginOk) {
    return;
  }

  const authToken = loginRes.json('token');

  // --- 2. Acessar rota protegida (ex: listar posts) ---
  const postsRes = http.get(`${BASE_URL}/api/admin/posts`, {
    headers: { Authorization: `Bearer ${authToken}` },
    tags: { flow: 'get_posts' },
  });

  check(postsRes, { 'acesso à rota protegida bem-sucedido': (r) => r.status === 200 }, { flow: 'get_posts' });

  sleep(2); // Simula o tempo de "pensamento" do usuário
}