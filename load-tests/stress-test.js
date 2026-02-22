import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// --- Opções do Teste de Estresse ---
export const options = {
  // Cenário de estresse para encontrar o ponto de quebra da aplicação.
  // Aumenta a carga gradualmente até um nível alto.
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up para 20 usuários
    { duration: '1m', target: 20 },    // Mantém a carga para estabilizar
    { duration: '30s', target: 50 },   // Aumenta para 50 usuários
    { duration: '1m', target: 50 },    // Mantém a carga
    { duration: '30s', target: 100 },  // Aumenta para 100 usuários (carga alta)
    { duration: '1m', target: 100 },   // Mantém a carga para observar o comportamento
    { duration: '20s', target: 0 },    // Ramp-down para finalizar
  ],
  thresholds: {
    // Limiares mais rígidos para detectar degradação de performance sob carga.
    'http_req_duration': ['p(95)<500'], // 95% das requisições devem ser < 500ms
    'http_req_failed': ['rate<0.01'],   // A taxa de falha geral deve ser menor que 1%
    'checks': ['rate>0.98'],            // Mais de 98% das validações devem passar
  },
};

// --- Configuração do Teste ---
const BASE_URL = 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

// --- Setup: Login para obter o token ---
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou, impossível executar o teste. Status: ${loginRes.status}, Corpo: ${loginRes.body}`);
  }

  return { token: loginRes.json('data.token') };
}

// --- Lógica Principal do Teste: Fluxo CRUD Agressivo ---
export default function (data) {
  const token = data.token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const uniqueId = `${__VU}-${__ITER}`;
  const videoUrl = `https://www.youtube.com/watch?v=stress${uniqueId}`;
  const videoTitle = `Video de Estresse K6 ${uniqueId}`;

  // --- 1. CRIAR (POST) ---
  const createPayload = JSON.stringify({
    url_youtube: videoUrl,
    titulo: videoTitle,
    descricao: `Descrição do vídeo de estresse ${uniqueId}.`,
    publicado: false,
  });

  const createRes = http.post(`${BASE_URL}/api/v1/videos`, createPayload, {
    headers: authHeaders,
    tags: { flow: 'stress_create' },
  });

  let videoId;
  const createCheck = check(createRes, {
    'CREATE: status é 201': (r) => r.status === 201,
    'CREATE: retorna o ID do vídeo': (r) => {
      if (r.status === 201 && r.body) {
        const body = r.json();
        if (body && body.data && body.data.id) {
          videoId = body.data.id;
          return true;
        }
      }
      return false;
    },
  });

  if (!createCheck) {
    console.error(`Falha ao criar vídeo. Abortando iteração. Status: ${createRes.status}, Resposta: ${createRes.body}`);
    return;
  }

  sleep(0.5);

  // --- 2. ATUALIZAR (PUT) ---
  const updatedTitle = `Video Estresse Atualizado ${uniqueId}`;
  const updatePayload = JSON.stringify({ titulo: updatedTitle, url_youtube: videoUrl, publicado: false });

  http.put(`${BASE_URL}/api/v1/videos/${videoId}`, updatePayload, { headers: authHeaders, tags: { flow: 'stress_update' } });

  sleep(0.5);

  // --- 3. DELETAR (DELETE) ---
  http.del(`${BASE_URL}/api/v1/videos/${videoId}`, null, { headers: authHeaders, tags: { flow: 'stress_delete' } });
}

// --- Manipulador de Resumo: Oculta o token JWT e salva o relatório ---
export function handleSummary(data) {
  if (data.setup_data && data.setup_data.token) {
    data.setup_data.token = "*** TOKEN OCULTO ***";
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/stress-test-summary.json': JSON.stringify(data, null, 4),
    './reports/k6-summaries/stress-test-summary.html': htmlReport(data),
  };
}