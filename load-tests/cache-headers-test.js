import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from './helpers/sleep.js';
import { BASE_URL } from './helpers/config.js';
import { getProfile } from './helpers/profiles.js';
import { generateReport } from './helpers/report.js';

export const options = getProfile('light', {
  iterations: 5,
  thresholds: {},
});

export default function () {
  // Alvo: API de Posts (Público e Cacheado)
  const res = http.get(`${BASE_URL}/api/posts`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    
    // Verifica se o header existe
    'Header Cache-Control existe': (r) => {
      const hasHeader = r.headers['Cache-Control'] !== undefined;
      if (!hasHeader && __ITER === 0) console.warn('⚠️  AVISO: Header Cache-Control ausente.');
      return hasHeader;
    },
    
    // Verifica se possui diretiva de cache compartilhado (CDN/Proxy)
    'Cache-Control tem s-maxage': (r) => {
      const header = r.headers['Cache-Control'];
      const hasSMaxAge = header && header.includes('s-maxage');
      if (header && !hasSMaxAge && __ITER === 0) console.warn('⚠️  AVISO: Cache-Control sem s-maxage.');
      return header ? hasSMaxAge : false;
    },
    
    // Verifica se possui diretiva de revalidação em segundo plano (stale-while-revalidate)
    'Cache-Control tem stale-while-revalidate': (r) => {
      const header = r.headers['Cache-Control'];
      const hasStale = header && header.includes('stale-while-revalidate');
      if (header && !hasStale && __ITER === 0) console.warn('⚠️  AVISO: Cache-Control sem stale-while-revalidate.');
      return header ? hasStale : false;
    },
  });

  // Log para debug visual no terminal
  console.log(`Iteração ${__ITER} - Cache-Control: ${res.headers['Cache-Control']}`);

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'cache_headers_test');
}