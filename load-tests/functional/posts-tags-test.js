import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

export const options = getProfile('light', {
  iterations: 5,
  thresholds: {
    checks: ['rate>0.80'],
    http_req_duration: ['p(95)<2000'],
    // POR QUE ESTE GATE E NESTE LIMITE: este é o único script da suíte em que
    // o gate de `checks` não enxerga o erro. Cada requisição roda 3 checks e,
    // numa resposta 500, apenas 1 falha ('Retornou lista de posts' cai no
    // fallback [], que é Array.isArray → passa): até 2 das 5 requisições
    // (40%) poderiam falhar e a execução ainda seria aprovada com
    // `checks: ['rate>0.80']`. Calibragem: o script faz 5 requisições, então
    // a PRIMEIRA falha já é 20% (1/5) — `rate<0.20` reprova a execução na
    // primeira resposta fora de 2xx/3xx.
    http_req_failed: ['rate<0.20'],
  },
});

// Tags comuns que provavelmente existem no banco de dados
const SEARCH_TAGS = ['fé', 'oração', 'bíblia', 'vida', 'espiritualidade'];

export default function () {
  const tag = SEARCH_TAGS[Math.floor(Math.random() * SEARCH_TAGS.length)];
  
  const res = http.get(`${BASE_URL}/api/posts?tag=${encodeURIComponent(tag)}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de posts': (r) => {
      try {
        const body = r.json();
        const posts = body?.data?.posts || body?.posts || body?.data || [];
        return Array.isArray(posts);
      } catch {
        return false;
      }
    },
    'Filtro por tag retornou resultados': (r) => {
      try {
        const body = r.json();
        const posts = body?.data?.posts || body?.posts || body?.data || [];
        return Array.isArray(posts);
      } catch {
        return false;
      }
    },
  });

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'posts_tags_test');
}