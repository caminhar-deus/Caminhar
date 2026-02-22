import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// --- Opções do Teste ---
export const options = {
  stages: [
    { duration: '10s', target: 3 }, // Ramp-up para 3 usuários (operações de escrita são mais pesadas)
    { duration: '20s', target: 3 }, // Mantém a carga
    { duration: '5s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    // Define limites de tempo de resposta para cada etapa do fluxo CRUD
    'http_req_duration{flow:create_video}': ['p(95)<800'], // Permite mais tempo para criação
    'http_req_duration{flow:update_video}': ['p(95)<600'],
    'http_req_duration{flow:delete_video}': ['p(95)<500'],
    // Define taxas de sucesso mínimas para cada verificação
    'checks{flow:create_video}': ['rate>0.98'], // Taxa de sucesso da criação > 98%
    'checks{flow:update_video}': ['rate>0.98'],
    'checks{flow:delete_video}': ['rate>0.98'],
  },
};

// --- Configuração do Teste ---
const BASE_URL = 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

// --- Setup: Login para obter o token de autenticação ---
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

// --- Lógica Principal do Teste: Fluxo CRUD ---
export default function (data) {
  const token = data.token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Gera dados únicos para esta iteração para evitar conflitos
  const uniqueId = `${__VU}-${__ITER}`; // ID do Usuário Virtual + Número da Iteração
  const videoUrl = `https://www.youtube.com/watch?v=test${uniqueId}`;
  const videoTitle = `Video de Teste K6 ${uniqueId}`;

  // --- 1. CRIAR (POST) ---
  const createPayload = JSON.stringify({
    url_youtube: videoUrl,
    titulo: videoTitle,
    descricao: `Descrição do vídeo de teste ${uniqueId}.`,
    publicado: false,
  });

  const createRes = http.post(`${BASE_URL}/api/v1/videos`, createPayload, {
    headers: authHeaders,
    tags: { flow: 'create_video' },
  });

  let videoId;
  check(createRes, {
    'CREATE: status é 201': (r) => r.status === 201,
    'CREATE: retorna o ID do vídeo': (r) => {
      const body = r.json();
      if (body && body.data && body.data.id) {
        videoId = body.data.id;
        return true;
      }
      return false;
    },
  }, { flow: 'create_video' });

  // Aborta a iteração se a criação falhar, pois os outros passos dependem dela
  if (!videoId) {
    console.error(`Falha ao criar vídeo. Abortando iteração. Resposta: ${createRes.body}`);
    return;
  }

  sleep(1);

  // --- 2. ATUALIZAR (PUT) ---
  const updatedTitle = `Video Atualizado K6 ${uniqueId}`;
  const updatePayload = JSON.stringify({ titulo: updatedTitle, url_youtube: videoUrl, publicado: false });

  const updateRes = http.put(`${BASE_URL}/api/v1/videos/${videoId}`, updatePayload, {
    headers: authHeaders,
    tags: { flow: 'update_video' },
  });

  check(updateRes, { 'UPDATE: status é 200': (r) => r.status === 200 }, { flow: 'update_video' });
  if (updateRes.status !== 200) {
    console.error(`Falha ao atualizar vídeo. Status: ${updateRes.status}, Corpo: ${updateRes.body}`);
    // Aborta a iteração se a atualização falhar, pois o delete pode não fazer sentido.
    return;
  }

  sleep(1);

  // --- 3. DELETAR (DELETE) ---
  const deleteRes = http.del(`${BASE_URL}/api/v1/videos/${videoId}`, null, {
    headers: authHeaders,
    tags: { flow: 'delete_video' },
  });

  check(deleteRes, { 'DELETE: status é 200': (r) => r.status === 200 }, { flow: 'delete_video' });
  if (deleteRes.status !== 200) {
    console.error(`Falha ao deletar vídeo. Status: ${deleteRes.status}, Corpo: ${deleteRes.body}`);
    // Apenas loga o erro, mas a iteração pode continuar, pois já está no final.
  }

  sleep(2); // Aguarda antes da próxima iteração
}

export function handleSummary(data) {
  if (data.setup_data && data.setup_data.token) {
    data.setup_data.token = "*** TOKEN OCULTO ***";
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/CRUD_de_Vídeos.json': JSON.stringify(data, null, 4),
  };
}