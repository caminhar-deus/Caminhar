import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de filtro por tag
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
    http_req_duration: ['p(95)<500'], // Resposta rápida
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Tags comuns que provavelmente existem no banco de dados
const SEARCH_TAGS = ['fé', 'oração', 'bíblia', 'vida', 'espiritualidade'];

export default function () {
  const tag = SEARCH_TAGS[Math.floor(Math.random() * SEARCH_TAGS.length)];
  
  // Assume que a API suporta ?tag= para filtrar por tag
  const res = http.get(`${BASE_URL}/api/v1/posts?tag=${tag}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de posts': (r) => {
      const body = r.json();
      return Array.isArray(body.data) || Array.isArray(body);
    },
    'Filtro funcionou (post contém a tag)': (r) => {
      const body = r.json();
      const posts = body.data || body;
      
      if (posts.length === 0) return true; // Lista vazia é válida se não houver match

      // Verifica se pelo menos um post retornado contém a tag (case insensitive)
      // Assume que o post tem um array de tags ou uma string de tags
      return posts.some(p => {
        const tags = Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',');
        return tags.some(t => t.trim().toLowerCase() === tag.toLowerCase());
      });
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/posts_tags_test.json': JSON.stringify(data, null, 4),
  };
}