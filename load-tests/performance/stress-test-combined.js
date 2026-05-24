import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { getRandomIP } from '../helpers/network.js';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';
import { getProfile } from '../helpers/profiles.js';

// --- Métricas Customizadas (Monitoramento) ---
const MemoryRss = new Trend('nodejs_memory_rss_bytes');
const MemoryHeapTotal = new Trend('nodejs_memory_heap_total_bytes');
const MemoryHeapUsed = new Trend('nodejs_memory_heap_used_bytes');

// Prefixo fixo para identificar dados de teste no teardown
const TEST_PREFIX = '[TEST-K6]';

// --- Configuração via Perfil Compartilhado ---
export const options = getProfile('stress');

export { setup };

// --- Função do Cenário de Estresse ---
export function stressTestFlow(data) {
  const token = data && data.token;
  if (!token) return;

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Forwarded-For': getRandomIP(), // Evita Rate Limit baseado em IP
  };

  const uniqueId = `${__VU}-${__ITER}`;
  
  // O YouTube exige que o ID do vídeo tenha exatamente 11 caracteres para passar na validação Regex da API
  const paddedVideoId = `st${__VU}x${__ITER}`.padStart(11, '0').slice(-11);
  const videoUrl = `https://www.youtube.com/watch?v=${paddedVideoId}`;
  const videoTitle = `${TEST_PREFIX} Video de Estresse ${uniqueId}`;

  // 1. CRIAR (POST)
  const createPayload = JSON.stringify({
    url_youtube: videoUrl,
    titulo: videoTitle,
    descricao: `${TEST_PREFIX} Descrição do vídeo de estresse ${uniqueId}.`,
    publicado: false,
  });

  const createRes = http.post(`${BASE_URL}/api/admin/videos`, createPayload, {
    headers: authHeaders,
    tags: { flow: 'stress_create' },
  });

  let videoId;
  const createCheck = check(createRes, {
    'CREATE: status é 201': (r) => r.status === 201,
    'CREATE: retorna o ID': (r) => {
      if (r.status === 201 && r.body) {
        const body = r.json();
        if (body && body.id) {
          videoId = body.id;
          return true;
        }
      }
      return false;
    },
  });

  if (!createCheck) return;

  randomSleep(0.3, 1.5);

  // 2. UPDATE (PUT)
  const updatePayload = JSON.stringify({ 
    id: videoId,
    titulo: `${TEST_PREFIX} Video Atualizado ${uniqueId}`, 
    url_youtube: videoUrl, 
    publicado: false 
  });
  
  http.put(`${BASE_URL}/api/admin/videos`, updatePayload, { 
    headers: authHeaders, 
    tags: { flow: 'stress_update', name: 'UpdateVideo' } 
  });

  randomSleep(0.3, 1.5);

  // 3. DELETAR (DELETE)
  const deletePayload = JSON.stringify({ id: videoId });
  const deleteRes = http.del(`${BASE_URL}/api/admin/videos`, deletePayload, { 
    headers: authHeaders, 
    tags: { flow: 'stress_delete', name: 'DeleteVideo' } 
  });

  check(deleteRes, {
    'DELETE: status é 200': (r) => r.status === 200,
  });
}

// --- Função do Cenário de Monitoramento ---
export function memoryMonitorFlow() {
  const res = http.get(`${BASE_URL}/api/status`);

  if (res.status === 200 && res.json('memory')) {
    const memory = res.json('memory');
    MemoryRss.add(memory.rss);
    MemoryHeapTotal.add(memory.heapTotal);
    MemoryHeapUsed.add(memory.heapUsed);
  }
  randomSleep(0.5, 2);
}

// --- Função de Limpeza (Teardown) ---
export function teardown(data) {
  if (!data || !data.token) return;
  const authHeaders = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };
  
  // Usa paginação para garantir que todos os registros sejam limpos
  let page = 1;
  let totalDeleted = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const res = http.get(`${BASE_URL}/api/admin/videos?limit=${limit}&page=${page}`, { headers: authHeaders });
    if (res.status !== 200) break;

    const body = res.json();
    const videos = body.videos || body.data || [];
    
    if (videos.length === 0) {
      hasMore = false;
      break;
    }

    for (const video of videos) {
      if (video.titulo && (video.titulo.includes(TEST_PREFIX) || video.titulo.includes('K6') || video.titulo.includes('Estresse'))) {
        const delRes = http.del(`${BASE_URL}/api/admin/videos`, JSON.stringify({ id: video.id }), { headers: authHeaders });
        if (delRes.status === 200) {
          totalDeleted++;
        }
      }
    }

    page++;
  }

  if (totalDeleted > 0) {
    console.log(`🧹 Teardown: ${totalDeleted} vídeos de teste removidos.`);
  }
}

// --- Handle Summary ---
export function handleSummary(data) {
  const reports = generateReport(data, 'stress-test-combined');
  reports['./reports/k6-summaries/stress-test-combined.html'] = htmlReport(data);
  return reports;
}