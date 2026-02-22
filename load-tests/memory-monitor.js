import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// --- Métricas Customizadas ---
// Usamos 'Trend' para poder visualizar a evolução (min, max, avg, p95) no relatório final
const MemoryRss = new Trend('nodejs_memory_rss_bytes');
const MemoryHeapTotal = new Trend('nodejs_memory_heap_total_bytes');
const MemoryHeapUsed = new Trend('nodejs_memory_heap_used_bytes');

export const options = {
  // Este script age como um "agente de monitoramento" leve.
  // VUs: 1 é suficiente para coletar métricas periodicamente.
  vus: 1,
  duration: '1m', // Ajuste para coincidir com a duração do seu teste de carga principal
  thresholds: {
    // Define um alerta se o uso do Heap passar de 500MB (exemplo)
    'nodejs_memory_heap_used_bytes': ['max<524288000'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Chama o endpoint que expõe process.memoryUsage() do Node.js
  // Espera-se que a API retorne algo como: { memory: { rss: ..., heapUsed: ... } }
  const res = http.get(`${BASE_URL}/api/v1/status`);

  const success = check(res, {
    'status é 200': (r) => r.status === 200,
    'retorna objeto de memória': (r) => r.json('memory') !== undefined,
  });

  if (success) {
    const memory = res.json('memory');
    
    if (memory) {
      // Alimenta as métricas do k6 com os dados vindos do servidor
      MemoryRss.add(memory.rss);
      MemoryHeapTotal.add(memory.heapTotal);
      MemoryHeapUsed.add(memory.heapUsed);
    }
  } else {
    // Opcional: Logar apenas se falhar consecutivamente para não poluir o console
    // console.warn(`Falha ao obter métricas de memória: ${res.status}`);
  }

  // Coleta a cada 1 segundo (ajuste conforme a resolução desejada)
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/memory_monitor.json': JSON.stringify(data, null, 4),
  };
}