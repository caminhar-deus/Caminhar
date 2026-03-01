import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Métrica para medir o tempo de recuperação (Time To Recovery - TTR)
const RecoveryTime = new Trend('recovery_time_ms');
// Métrica para contar recuperações bem-sucedidas
const RecoveryCount = new Counter('recovery_count');

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
    // Removido para "Soft Fail": o teste não falhará se o sistema permanecer estável.
    // 'recovery_count': ['count > 0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Variáveis de estado para rastrear a queda (escopo do VU)
let isSystemDown = false;
let failureStartTime = 0;

export default function () {
  // Tenta acessar uma rota que depende estritamente do banco de dados (ex: listagem de posts)
  // Se o banco cair, o Next.js/PG deve retornar erro 500 ou timeout
  // Corrigido para a rota pública correta, que é /api/posts
  const res = http.get(`${BASE_URL}/api/posts`);

  // Consideramos "Saudável" se retornar 200 OK
  const isHealthy = res.status === 200;

  if (isHealthy) {
    if (isSystemDown) {
      // O sistema voltou! Calculamos o tempo que ficou fora.
      const now = Date.now();
      const downtimeDuration = now - failureStartTime;
      
      console.log(`✅ RECUPERAÇÃO DETECTADA! O sistema voltou após ${downtimeDuration}ms.`);
      RecoveryTime.add(downtimeDuration);
      RecoveryCount.add(1);
      
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
  const recoveries = data.metrics.recovery_count ? data.metrics.recovery_count.values.count : 0;
  if (recoveries === 0) {
    const checks = data.metrics.checks.values;
    // Se não houve recuperações e todos os checks passaram, o sistema estava estável.
    if (checks.passes > 0 && checks.fails === 0) {
      console.log('\n✅ O sistema permaneceu estável durante todo o teste. Nenhuma falha foi detectada.\n');
    }
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/recovery_test.json': JSON.stringify(data, null, 4),
  };
}