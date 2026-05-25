import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { randomSleep } from '../helpers/sleep.js';

export const options = {
  stages: [
    { duration: '10s', target: 3 }, // Ramp-up para 3 usuários virtuais (evita rate limit)
    { duration: '20s', target: 3 }, // Mantém a carga por 20 segundos
    { duration: '5s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Aumentado para 2000ms (comporta rate limit e login)
    'checks{flow:login}': ['rate>0.90'], // Reduzido para 90% (admite rate limit em rápidas sequências)
    'checks{flow:get_settings}': ['rate>0.95'], // 95% de sucesso na rota protegida
    http_req_failed: ['rate<0.10'], // Menos de 10% de requisições com erro
  },
};

// --- Configuração do Teste ---
// Obtenha as credenciais das variáveis de ambiente para segurança.
// Exemplo de execução:
// k6 run -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=password load-tests/authenticated-flow-test.js
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';
const BASE_URL = 'http://localhost:3000';

export default function () {
  // --- Delay inicial proporcional ao VU ID para evitar rajada simultânea de logins ---
  sleep(Math.random() * 2);

  // --- 1. Login e obtenção do token ---
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login?response=body`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { flow: 'login' },
    }
  );

  if (loginRes.status === 0) {
    exec.test.abort('❌ Conexão perdida com o servidor.');
  }

  const loginOk = check(loginRes, {
    'login bem-sucedido': (r) => r.status === 200,
    'token recebido': (r) => r.status === 200 && r.json('data.token') !== undefined,
  }, { flow: 'login' });

  // Se foi rate limited (429), não é erro crítico - apenas loga e retorna
  if (loginRes.status === 429) {
    console.warn(`⚠️ Login rate limited (429) na iteração ${exec.vu.iterationInInstance}`);
    return;
  }

  // Aborta a iteração se o login falhar com erro não-rate-limit
  if (!loginOk) {
    console.error(`Login falhou: Status ${loginRes.status} - Body: ${loginRes.body}`);
    return;
  }

  const authToken = loginRes.json('data.token');

  // --- Pequena pausa entre login e requisição autenticada (comportamento realista) ---
  sleep(0.3 + Math.random() * 0.5);

  // --- 2. Acessar rota protegida com ?key= para testar autenticação real ---
  const settingsRes = http.get(`${BASE_URL}/api/settings?key=site_name`, {
    headers: { Authorization: `Bearer ${authToken}` },
    tags: { flow: 'get_settings' },
  });

  const checkRes = check(settingsRes, {
    'acesso à rota protegida bem-sucedido': (r) => r.status === 200,
  }, { flow: 'get_settings' });

  if (!checkRes) {
    console.error(`Falha ao acessar settings: Status ${settingsRes.status} - Body: ${settingsRes.body}`);
  }

  randomSleep(0.5, 3); // Simula o tempo de "pensamento" do usuário
}
