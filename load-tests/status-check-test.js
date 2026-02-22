import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export const options = {
  // Teste funcional de verificação de saúde
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/status`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Info do Banco de Dados presente': (r) => r.json('data.database') !== undefined,
    // Verifica se existe chave 'redis' ou 'cache' na resposta
    'Info do Redis presente': (r) => r.json('data.redis') !== undefined || r.json('data.cache') !== undefined,
  });
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/status_check_test.json': JSON.stringify(data, null, 4),
    './reports/k6-summaries/status_check_test.html': htmlReport(data),
  };
}