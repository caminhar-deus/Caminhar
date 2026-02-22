import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Métrica para medir o tempo de recuperação (Time To Recovery - TTR)
const RecoveryTime = new Trend('recovery_time_ms');

export const options = {
  scenarios: {
    chaos_monitor: {
      executor: 'constant-vus',
      vus: 1, // Apenas 1 VU é necessário para monitorar a disponibilidade
      duration: '2m', // Duração suficiente para você derrubar e subir o banco manualmente
    },
  },
  thresholds: {
    // O teste passa se houver pelo menos uma recuperação registrada (prova que o sistema voltou)
    'recovery_time_ms': ['count>0'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Variáveis de estado para rastrear a queda (escopo do VU)
let isSystemDown = false;
let failureStartTime = 0;

export default function () {
  // Tenta acessar uma rota que depende estritamente do banco de dados (ex: listagem de posts)
  // Se o banco cair, o Next.js/PG deve retornar erro 500 ou timeout
  const res = http.get(`${BASE_URL}/api/v1/posts`);

  // Consideramos "Saudável" se retornar 200 OK
  const isHealthy = res.status === 200;

  if (isHealthy) {
    if (isSystemDown) {
      // O sistema voltou! Calculamos o tempo que ficou fora.
      const now = Date.now();
      const downtimeDuration = now - failureStartTime;
      
      console.log(`✅ RECUPERAÇÃO DETECTADA! O sistema voltou após ${downtimeDuration}ms.`);
      RecoveryTime.add(downtimeDuration);
      
      // Reseta o estado para detectar novas quedas
      isSystemDown = false;
      failureStartTime = 0;
    }
    // Se já estava saudável, continua monitorando silenciosamente
  } else {
    // O sistema falhou (500, 502, 503, 504 ou timeout)
    if (!isSystemDown) {
      // Primeira falha detectada
      console.log(`🔥 FALHA DETECTADA! Status: ${res.status}. Iniciando cronômetro de recuperação...`);
      isSystemDown = true;
      failureStartTime = Date.now();
    }
  }

  sleep(0.5); // Verifica a cada 500ms
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/recovery_test.json': JSON.stringify(data, null, 4),
  };
}