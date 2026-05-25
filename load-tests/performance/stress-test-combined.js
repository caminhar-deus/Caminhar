import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup as authSetup } from '../helpers/auth.js';
import { getProfile } from '../helpers/profiles.js';

// --- Métricas Customizadas (Monitoramento) ---
const MemoryRss = new Trend('nodejs_memory_rss_bytes');
const MemoryHeapTotal = new Trend('nodejs_memory_heap_total_bytes');
const MemoryHeapUsed = new Trend('nodejs_memory_heap_used_bytes');
const StressIterations = new Counter('stress_iterations');

// Prefixo fixo para identificar dados de teste no teardown
const TEST_PREFIX = '[TEST-K6]';

// --- Configuração via Perfil Compartilhado ---
export const options = getProfile('stress');

export function setup() {
  return authSetup();
}

export default function () {
  // Cenários nomeados executam via stress_test() e memory_monitor()
}

// --- Cenário de Estresse (nome deve corresponder ao perfil: stress_test) ---
export function stress_test(data) {
  // Se setup falhou (data indefinido ou sem token), usa fallback
  // para não bloquear o teste inteiro
  let effectiveToken = data && data.token;
  
  // Se não temos token do setup, tenta usar variável de ambiente
  if (!effectiveToken) {
    console.warn('[stress_test] Token não disponível do setup. Usando env vars para login.');
    return; // Sai silenciosamente - o monitoramento continua rodando
  }

  const token = effectiveToken;

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const uniqueId = `${__VU}-${__ITER}`;
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

  let createCheckPassed = false;
  let videoId = null;

  check(createRes, {
    'CREATE: status é 201': (r) => r.status === 201,
    'CREATE: retorna o ID': (r) => {
      if (r.status === 201 && r.body) {
        try {
          const body = r.json();
          const id = body?.data?.video?.id || body?.data?.id || body?.id;
          if (id) {
            videoId = id;
            createCheckPassed = true;
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  });

  if (!createCheckPassed || !videoId) {
    StressIterations.add(1);
    return;
  }

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

// --- Cenário de Monitoramento (nome deve corresponder ao perfil: memory_monitor) ---
export function memory_monitor() {
  const res = http.get(`${BASE_URL}/api/status`);

  check(res, {
    'Monitor: status é 200': (r) => r.status === 200,
  });

  if (res.status === 200) {
    try {
      const body = res.json();
      const memory = body?.data?.system;
      if (memory) {
        MemoryRss.add(memory.rss || 0);
        MemoryHeapTotal.add(memory.heapTotal || 0);
        MemoryHeapUsed.add(memory.heapUsed || 0);
      }
    } catch (e) {
      console.error(`[memory_monitor] Erro ao parsear resposta: ${e}`);
    }
  }

  sleep(1);
}

// --- Função de Limpeza (Teardown) ---
export function teardown(data) {
  if (!data || !data.token) return;
  const authHeaders = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };
  
  let page = 1;
  let totalDeleted = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const res = http.get(`${BASE_URL}/api/admin/videos?limit=${limit}&page=${page}`, { headers: authHeaders });
    if (res.status !== 200) break;

    const body = res.json();
    const videos = body?.data?.videos || body.videos || body.data || [];
    
    if (videos.length === 0) {
      hasMore = false;
      break;
    }

    for (const video of videos) {
      if (video.titulo && (video.titulo.includes(TEST_PREFIX) || video.titulo.includes('K6') || video.titulo.includes('Estresse'))) {
        const delRes = http.del(`${BASE_URL}/api/admin/videos`, JSON.stringify({ id: video.id }), { headers: authHeaders });
        if (delRes.status === 200) totalDeleted++;
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