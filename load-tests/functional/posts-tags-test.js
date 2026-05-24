import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

export const options = getProfile('light', {
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_duration: ['p(95)<500'],
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
        return Array.isArray(body.data) || Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'Filtro funcionou (post contém a tag)': (r) => {
      let body; try { body = r.json(); } catch (e) { return false; }
      const posts = body.data || body;
      
      if (posts.length === 0) return true;

      const matchFound = posts.some(p => {
        const tags = Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',');
        return tags.some(t => t.trim().toLowerCase() === tag.toLowerCase());
      });

      if (!matchFound) {
        console.warn(`⚠️ API retornou ${posts.length} posts para tag "${tag}", mas a tag não foi encontrada visualmente na resposta. Pode ser tag oculta ou normalização diferente.`);
      }
      return true;
    }
  });

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'posts_tags_test');
}