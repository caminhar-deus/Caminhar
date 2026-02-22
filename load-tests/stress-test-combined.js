import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// --- Métricas Customizadas (Monitoramento) ---
const MemoryRss = new Trend('nodejs_memory_rss_bytes');
const MemoryHeapTotal = new Trend('nodejs_memory_heap_total_bytes');
const MemoryHeapUsed = new Trend('nodejs_memory_heap_used_bytes');

// --- Configuração dos Cenários ---
export const options = {
  scenarios: {
    // Cenário 1: Teste de Estresse (CRUD de Vídeos)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // Ramp-up
        { duration: '1m', target: 20 },    // Estabilização
        { duration: '30s', target: 50 },   // Aumento de carga
        { duration: '1m', target: 50 },    // Estabilização
        { duration: '30s', target: 100 },  // Carga alta
        { duration: '1m', target: 100 },   // Estabilização
        { duration: '20s', target: 0 },    // Ramp-down
      ],
      gracefulRampDown: '30s',
      exec: 'stressTestFlow', // Função específica para este cenário
    },
    // Cenário 2: Monitoramento de Memória
    memory_monitor: {
      executor: 'constant-vus',
      vus: 1,
      duration: '5m', // Cobre toda a duração do teste de estresse (~4m50s)
      exec: 'memoryMonitorFlow', // Função específica para este cenário
    },
  },
  thresholds: {
    // Thresholds do Estresse
    'http_req_duration{scenario:stress_test}': ['p(95)<500'],
    'http_req_failed{scenario:stress_test}': ['rate<0.01'],
    'checks{scenario:stress_test}': ['rate>0.98'],
    
    // Thresholds do Monitoramento
    'nodejs_memory_heap_used_bytes': ['max<1073741824'], // Alerta se passar de 1GB
  },
};

// --- Configuração de Ambiente (JSON ou Flags) ---
// Se a flag CONFIG_FILE for passada, carrega o JSON. Caso contrário, usa objeto vazio.
const config = __ENV.CONFIG_FILE ? JSON.parse(open(__ENV.CONFIG_FILE)) : {};

const BASE_URL = __ENV.BASE_URL || config.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || config.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || config.ADMIN_PASSWORD || '123456';

// --- Setup Global ---
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} ${loginRes.body}`);
  }

  return { token: loginRes.json('data.token') };
}

// --- Função do Cenário de Estresse ---
export function stressTestFlow(data) {
  const token = data.token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const uniqueId = `${__VU}-${__ITER}`;
  const videoUrl = `https://www.youtube.com/watch?v=stress${uniqueId}`;
  const videoTitle = `Video de Estresse K6 ${uniqueId}`;

  // 1. CRIAR (POST)
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
    'CREATE: retorna o ID': (r) => {
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

  if (!createCheck) return;

  sleep(0.5);

  // 2. UPDATE (PUT)
  const updatePayload = JSON.stringify({ 
    titulo: `Video Atualizado ${uniqueId}`, 
    url_youtube: videoUrl, 
    publicado: false 
  });
  
  http.put(`${BASE_URL}/api/v1/videos/${videoId}`, updatePayload, { 
    headers: authHeaders, 
    tags: { flow: 'stress_update' } 
  });

  sleep(0.5);

  // 3. DELETAR (DELETE)
  http.del(`${BASE_URL}/api/v1/videos/${videoId}`, null, { 
    headers: authHeaders, 
    tags: { flow: 'stress_delete' } 
  });
}

// --- Função do Cenário de Monitoramento ---
export function memoryMonitorFlow() {
  const res = http.get(`${BASE_URL}/api/v1/status`);

  if (res.status === 200 && res.json('memory')) {
    const memory = res.json('memory');
    MemoryRss.add(memory.rss);
    MemoryHeapTotal.add(memory.heapTotal);
    MemoryHeapUsed.add(memory.heapUsed);
  }
  sleep(1);
}

// --- Handle Summary ---
export function handleSummary(data) {
  if (data.setup_data && data.setup_data.token) {
    data.setup_data.token = "*** TOKEN OCULTO ***";
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/stress-test-combined.json': JSON.stringify(data, null, 4),
    './reports/k6-summaries/stress-test-combined.html': htmlReport(data),
  };
}