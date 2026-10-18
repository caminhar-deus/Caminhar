import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { randomSleep } from '../helpers/sleep.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

// Métrica para medir o tempo de recuperação (Time To Recovery - TTR)
const RecoveryTime = new Trend('recovery_time_ms');
// Métrica para contar recuperações bem-sucedidas
const RecoveryCount = new Counter('recovery_count');
// Taxa de iterações em que o sistema NÃO estava saudável. Este é o gate real
// do script: o `checks` agregado é 100% por construção (cada ramo do if
// declara um único check que sempre passa), então ele não distingue "saudável"
// de "caído". Baseline medida no run #14 (15–17/10/2026): 0,00% — o sistema
// ficou de pé nas 145 iterações.
const UnhealthyRate = new Rate('recovery_unhealthy_rate');
// Qualquer status HTTP conta como resposta válida para este script: o ponto é
// detectar a QUEDA (status != 200), não reprovar por 5xx. A chave correta é
// `responseCallback` — `expectedStatuses` não existe em Params e era ignorada.
const QUALQUER_STATUS = http.expectedStatuses({ min: 200, max: 599 });

// O `checks` agregado NÃO é sinal de saúde (100% por construção, porque cada
// ramo do `if` declara um único check que sempre passa). O gate real é a
// métrica `recovery_unhealthy_rate` abaixo — **nunca** adicionar threshold em
// `checks` neste script.
// `getProfile` SUBSTITUI thresholds em vez de mesclar, mas o perfil `recovery`
// tem `thresholds: {}`, então nada é perdido ao passar `thresholds` aqui: este
// é o único lugar da Fase 0 onde essa substituição é segura.
export const options = getProfile('recovery', {
  thresholds: {
    'recovery_unhealthy_rate': ['rate<0.10'],
  },
});

// Variáveis de estado para rastrear a queda (escopo do VU)
let isSystemDown = false;
let failureStartTime = 0;

export default function () {
  // Tenta acessar uma rota que depende estritamente do banco de dados (ex: listagem de posts)
  const res = http.get(`${BASE_URL}/api/posts`, {
    responseCallback: QUALQUER_STATUS,
  });

  // Consideramos "Saudável" se retornar 200 OK
  const isHealthy = res.status === 200;
  UnhealthyRate.add(res.status !== 200);

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

  randomSleep(0.3, 1.3); // Verifica em intervalos variáveis
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