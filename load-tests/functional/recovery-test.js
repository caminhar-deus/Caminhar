import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

// Métrica para medir o tempo de recuperação (Time To Recovery - TTR)
const RecoveryTime = new Trend('recovery_time_ms');
// Métrica para contar recuperações bem-sucedidas
const RecoveryCount = new Counter('recovery_count');

export const options = getProfile('recovery');

// Variáveis de estado para rastrear a queda (escopo do VU)
let isSystemDown = false;
let failureStartTime = 0;

export default function () {
  // Tenta acessar uma rota que depende estritamente do banco de dados (ex: listagem de posts)
  const res = http.get(`${BASE_URL}/api/posts`, {
    expectedStatuses: { min: 200, max: 599 },
  });

  // Consideramos "Saudável" se retornar 200 OK
  const isHealthy = res.status === 200;

  if (isHealthy) {
    check(res, {
      'Sistema está saudável (Status 200)': (r) => r.status === 200,
    });

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
  } else {
    check(res, {
      'Sistema em estado de falha (Status != 200)': (r) => r.status !== 200,
    });

    // O sistema falhou (500, 502, 503, 504 ou timeout)
    if (!isSystemDown) {
      console.log(`🔥 FALHA DETECTADA! Status: ${res.status}. Iniciando cronômetro de recuperação...`);
      isSystemDown = true;
      failureStartTime = Date.now();
    }
  }

  sleep(0.5); // Verifica a cada 500ms
}

export function handleSummary(data) {
  const recoveries = data.metrics.recovery_count ? data.metrics.recovery_count.values.count : 0;
  if (recoveries === 0 && data.metrics.checks) {
    const checks = data.metrics.checks.values;
    if (checks.passes > 0 && checks.fails === 0) {
      console.log('\n✅ O sistema permaneceu estável durante todo o teste. Nenhuma falha foi detectada.\n');
    }
  }

  return generateReport(data, 'recovery_test');
}