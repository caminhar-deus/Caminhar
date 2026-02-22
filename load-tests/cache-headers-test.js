import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export const options = {
  // Teste funcional leve: 1 usuário fazendo 5 requisições sequenciais
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Alvo: API de configurações (documentada como cacheada)
  const res = http.get(`${BASE_URL}/api/v1/settings`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    
    // Verifica se o header existe
    'Header Cache-Control existe': (r) => r.headers['Cache-Control'] !== undefined,
    
    // Verifica se possui diretiva de cache compartilhado (CDN/Proxy)
    // s-maxage controla o tempo de vida no cache compartilhado (Redis/Vercel Edge)
    'Cache-Control tem s-maxage': (r) => 
      r.headers['Cache-Control'] && r.headers['Cache-Control'].includes('s-maxage'),
    
    // Verifica se possui diretiva de revalidação em segundo plano (stale-while-revalidate)
    // Isso garante que o usuário nunca espere pela regeneração do cache
    'Cache-Control tem stale-while-revalidate': (r) => 
      r.headers['Cache-Control'] && r.headers['Cache-Control'].includes('stale-while-revalidate'),
  });

  // Log para debug visual no terminal
  console.log(`Iteração ${__ITER} - Cache-Control: ${res.headers['Cache-Control']}`);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/cache_headers_test.json': JSON.stringify(data, null, 4),
    './reports/k6-summaries/cache_headers_test.html': htmlReport(data),
  };
}